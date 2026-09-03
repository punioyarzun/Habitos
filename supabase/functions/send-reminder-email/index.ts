// ============================================================================
// Supabase Edge Function — send-reminder-email
// Envía un correo al usuario autenticado con un recordatorio.
//
// Seguridad: valida el JWT del usuario (header Authorization que agrega
// supabase-js al llamar functions.invoke) y envía SOLO al email de ese usuario
// (nunca a una dirección arbitraria del body) — evita usarla para spam.
//
// Requiere estos secretos (Supabase Dashboard > Edge Functions > Secrets, o
// `supabase secrets set`):
//   RESEND_API_KEY   -> API key de https://resend.com
//   REMINDER_FROM    -> remitente verificado, p.ej. "Bitácora <no-reply@tudominio.com>"
//                       (si no lo defines, usa el sandbox onboarding@resend.dev)
//
// Deploy:  supabase functions deploy send-reminder-email
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  title: string;
  description?: string | null;
  when?: string | null; // texto legible: "hoy a las 10:00", "5 sept · 09:00"
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function emailHtml(p: Payload): string {
  const title = esc(p.title);
  const desc = p.description ? `<p style="margin:0 0 16px;color:#5b6472;font-size:14px;line-height:1.6">${esc(p.description)}</p>` : '';
  const when = p.when ? `<p style="margin:0;color:#4f46e5;font-size:13px;font-weight:600">${esc(p.when)}</p>` : '';
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e8ee;border-radius:12px;overflow:hidden">
      <tr><td style="background:#6366f1;padding:16px 24px;color:#fff;font-weight:700;font-size:16px">Bitácora · Recordatorio</td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#171a21">${title}</h1>
        ${desc}
        ${when}
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e5e8ee;color:#94a0b0;font-size:12px">Recibiste este correo porque activaste los recordatorios por email en Bitácora.</td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.email) return json({ error: 'No autorizado' }, 401);

    const body = (await req.json()) as Payload;
    if (!body?.title || typeof body.title !== 'string') return json({ error: 'Falta el título' }, 400);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'Falta RESEND_API_KEY en el servidor' }, 500);
    const from = Deno.env.get('REMINDER_FROM') ?? 'Bitácora <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: user.email,
        subject: `Recordatorio: ${body.title.slice(0, 120)}`,
        html: emailHtml({ title: body.title.slice(0, 120), description: body.description?.slice(0, 500) ?? null, when: body.when?.slice(0, 60) ?? null }),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: 'No se pudo enviar el correo', detail }, 502);
    }
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
