
/* ---------------------------------------------------------------
   State
--------------------------------------------------------------- */
let habitDays = {};      // { 'YYYY-MM-DD': {alcohol:bool, ejercicio:bool, codigo:bool, nota:string} }
let transactions = [];   // [{id, date, tipo, categoria, monto, descripcion}]

const ICON_ALCOHOL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2h8l1 6a5 5 0 0 1-10 0z"/><path d="M12 14v8"/><path d="M9 22h6"/><line x1="4" y1="4" x2="20" y2="20"/></svg>';
const ICON_EJERCICIO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12"/></svg>';
const ICON_CODIGO = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>';
const ICON_CUSTOM = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 2.9 6.5L22 9.3l-5 4.9 1.2 7-6.2-3.6L5.8 21.2 7 14.2l-5-4.9 7.1-.8z"/></svg>';
const ICON_BAN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="5.8" y1="5.8" x2="18.2" y2="18.2"/></svg>';
const ICON_BOOK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4C9.5 2.5 6.5 2 4 2v16c2.5 0 5.5.5 8 2 2.5-1.5 5.5-2 8-2V2c-2.5 0-5.5.5-8 2Z"/><path d="M12 4v16"/></svg>';
const ICON_MINDFUL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/></svg>';
const ICON_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>';

const PRESET_VICIOS = [
  {label:'Alcohol', color:'#5b9bd9', icon:ICON_BAN},
  {label:'Tabaco', color:'#e07a5f', icon:ICON_BAN},
  {label:'Drogas', color:'#e1636b', icon:ICON_BAN},
  {label:'Ludopatía', color:'#e8b93d', icon:ICON_BAN},
  {label:'Redes sociales / pantallas', color:'#77b6ea', icon:ICON_BAN},
  {label:'Comida azucarada', color:'#f4a259', icon:ICON_BAN},
  {label:'Pornografía', color:'#c77dff', icon:ICON_BAN},
  {label:'Compras compulsivas', color:'#4fae8e', icon:ICON_BAN}
];
const PRESET_HABITOS = [
  {label:'Ejercicio', color:'#e07a5f', icon:ICON_EJERCICIO},
  {label:'Programar', color:'#9b8ce0', icon:ICON_CODIGO},
  {label:'Leer', color:'#4fae8e', icon:ICON_BOOK},
  {label:'Meditar', color:'#e8b93d', icon:ICON_MINDFUL},
  {label:'Dormir temprano', color:'#77b6ea', icon:ICON_MOON}
];

const DEFAULT_HABITS = [
  {key:'alcohol',   label:'Sin alcohol', color:'var(--c-alcohol)', icon: ICON_ALCOHOL},
  {key:'ejercicio', label:'Ejercicio',   color:'var(--c-ejercicio)', icon: ICON_EJERCICIO},
  {key:'codigo',    label:'Código',      color:'var(--c-codigo)', icon: ICON_CODIGO}
];
const SWATCH_COLORS = ['#5b9bd9','#e07a5f','#9b8ce0','#5fbf77','#e8b93d','#e1636b','#4fae8e','#c77dff','#f4a259','#77b6ea'];

let habitsConfig = [];   // [{key, label, color, icon}] — persisted, user-customizable
let newHabitColor = SWATCH_COLORS[0];
let newHabitIcon = ICON_CUSTOM;
let featuredHabitKey = null;   // hábito destacado en el hero
let habitsCatIn = [];          // categorías de ingreso (editables)
let habitsCatOut = [];         // categorías de gasto (editables)
let editingHabitKey = null;    // hábito en edición dentro del modal
let editingIcon = ICON_CUSTOM;
let editingColor = SWATCH_COLORS[0];

function emptyDay(){
  const o = {nota:''};
  habitsConfig.forEach(h => o[h.key] = false);
  return o;
}

/* ---------------------------------------------------------------
   Seguridad: escapado y saneado de entrada
   Todas las datos del usuario se escapan antes de inyectarlas en HTML
   y se limpian/normalizan al entrar. Defensa en profundidad.
--------------------------------------------------------------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const MAX_LABEL = 60;
const MAX_NOTE = 2000;
const MAX_CAT = 40;

// Normaliza un texto libre: recorta, limita longitud, elimina caracteres de
// control y normaliza saltos. NO se usan aquí regex de "whitelist" sobre
// caracteres de texto normal para no mutilar nombres con tildes/emoji.
function cleanFreeText(s, max){
  let v = String(s == null ? '' : s);
  v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  v = v.trim();
  if(max && v.length > max) v = v.slice(0, max).trim();
  return v;
}

const COLOR_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|var\(--[\w-]+\))$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidColor(c){ return typeof c === 'string' && COLOR_RE.test(c); }

// Solo se permiten los iconos SVG definidos por la aplicación (whitelist).
const ALLOWED_ICONS = [ICON_ALCOHOL, ICON_EJERCICIO, ICON_CODIGO, ICON_CUSTOM, ICON_BAN, ICON_BOOK, ICON_MINDFUL, ICON_MOON];
function sanitizeIcon(ic){
  return ALLOWED_ICONS.indexOf(ic) !== -1 ? ic : ICON_CUSTOM;
}

// Valida y normaliza un backup importado. Nunca confía en el contenido.
// Devuelve las porciones saneadas (o arrays vacíos) listas para asignarse.
function sanitizeImport(data){
  const out = { habits:[], days:{}, transactions:[], catsIn: DEFAULT_CATS_INGRESO.slice(), catsOut: DEFAULT_CATS_GASTO.slice() };

  if(data && Array.isArray(data.habits)){
    const seen = new Set();
    for(const raw of data.habits){
      if(!raw || typeof raw !== 'object') continue;
      const label = cleanFreeText(raw.label, MAX_LABEL);
      const key = cleanFreeText(raw.key, 40) || ('h_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6));
      if(!label || seen.has(key)) continue;
      seen.add(key);
      out.habits.push({
        key,
        label,
        color: isValidColor(raw.color) ? raw.color : SWATCH_COLORS[out.habits.length % SWATCH_COLORS.length],
        icon: sanitizeIcon(raw.icon)
      });
    }
  }

  if(out.habits.length === 0){
    out.habits = DEFAULT_HABITS.slice();
  }

  if(data && data.days && typeof data.days === 'object' && !Array.isArray(data.days)){
    for(const iso of Object.keys(data.days)){
      if(!ISO_DATE_RE.test(iso)) continue;
      const raw = data.days[iso];
      if(!raw || typeof raw !== 'object') continue;
      const dayObj = { nota: cleanFreeText(raw.nota, MAX_NOTE), perfect: false };
      for(const h of out.habits){ dayObj[h.key] = !!raw[h.key]; }
      out.days[iso] = dayObj;
    }
  }

  if(data && Array.isArray(data.transactions)){
    for(const t of data.transactions){
      if(!t || typeof t !== 'object') continue;
      const date = typeof t.date === 'string' ? t.date : String(t.date || '');
      if(!ISO_DATE_RE.test(date)) continue;
      const monto = Number(t.monto);
      if(!Number.isFinite(monto) || monto <= 0) continue;
      const tipo = (t.tipo === 'ingreso' || t.tipo === 'gasto') ? t.tipo : 'gasto';
      out.transactions.push({
        id: cleanFreeText(t.id, 40) || (Date.now().toString(36) + Math.random().toString(36).slice(2,7) + Math.random().toString(36).slice(2,4)),
        date,
        tipo,
        categoria: cleanFreeText(t.categoria, MAX_CAT) || (tipo==='ingreso' ? 'Otro ingreso' : 'Otro gasto'),
        monto,
        descripcion: cleanFreeText(t.descripcion, 300)
      });
    }
  }

  if(Array.isArray(data && data.catsIn)){
    const arr = [];
    for(const c of data.catsIn){ const s = cleanFreeText(c, MAX_CAT); if(s && !arr.some(x=>x.toLowerCase()===s.toLowerCase())) arr.push(s); }
    if(arr.length) out.catsIn = arr;
  }
  if(Array.isArray(data && data.catsOut)){
    const arr = [];
    for(const c of data.catsOut){ const s = cleanFreeText(c, MAX_CAT); if(s && !arr.some(x=>x.toLowerCase()===s.toLowerCase())) arr.push(s); }
    if(arr.length) out.catsOut = arr;
  }

  return out;
}


const DEFAULT_CATS_INGRESO = ['Honorarios / Sueldo','PC Solutions','TemuCode.dev','Otro ingreso'];
const DEFAULT_CATS_GASTO   = ['Alimentación','Transporte','Servicios','Salud','Ocio','Negocio','Otro gasto'];

const TIPS = [
  "Un antojo intenso rara vez dura más de 15-20 minutos si no lo alimentas. No necesitas vencerlo para siempre, solo dejarlo pasar esta vez.",
  "La regla de los 10 minutos: cuando aparezca el impulso, ponte un cronómetro y espera. Muchas veces la urgencia baja de intensidad antes de que termine.",
  "Revisa si lo que sientes es realmente antojo o es HALT: hambre, enojo, soledad o cansancio. Resolver la causa real suele desactivar el impulso.",
  "El ejercicio moderado libera dopamina y endorfinas de forma natural, el mismo sistema que las sustancias alteran artificialmente. 20-30 minutos ya generan efecto medible en el ánimo.",
  "Dormir mal aumenta la reactividad al estrés y a los antojos al día siguiente. Cuidar el sueño es, literalmente, prevención de recaídas.",
  "El cerebro reconstruye circuitos con la repetición: cada día que eliges la alternativa saludable, refuerzas físicamente ese camino neuronal.",
  "La deshidratación y el hambre bajan la fuerza de voluntad disponible. Comer y tomar agua antes de una situación de riesgo no es trivial, es estrategia.",
  "Cambiar el ritual, no solo la sustancia: si el hábito tenía un gesto asociado (servir algo, sentarte en cierto lugar), reemplaza el gesto completo, no solo lo que bebías.",
  "La vergüenza después de un desliz aumenta el riesgo de seguir consumiendo. La autocompasión, en cambio, se asocia a mejor recuperación a largo plazo.",
  "Un desliz no borra el progreso acumulado ni reinicia el aprendizaje que ya hiciste tu cerebro. Es información, no sentencia.",
  "Diseña tu entorno antes que tu fuerza de voluntad: sacar el gatillo físico (la botella, el lugar, el contacto) reduce decisiones difíciles repetidas.",
  "Nombrar el impulso en voz alta o por escrito ('esto es un antojo, va a pasar') activa la corteza prefrontal y baja la intensidad emocional del momento.",
  "La conexión social predice mejor la recuperación sostenida que la fuerza de voluntad individual. Un mensaje a alguien de confianza cuenta como estrategia real.",
  "Cada racha que ves en tu cadena de días es evidencia acumulada de que puedes sostenerlo. Mírala cuando dudes, no solo cuando festejes.",
  "La respiración lenta (4 segundos inhalar, 6 exhalar) baja la activación del sistema nervioso simpático en minutos, el mismo que dispara el impulso de consumir.",
  "El aburrimiento es un gatillo subestimado. Tener 2-3 actividades cortas ya decididas de antemano (caminar, llamar a alguien, programar algo) reduce el riesgo en momentos vacíos.",
  "Recompénsate por sostener el hábito, no solo por evitar la sustancia. El cerebro necesita ganancias nuevas para no extrañar las viejas.",
  "La ventana de mayor riesgo suele repetirse a la misma hora o contexto. Identificar ese patrón te permite anticiparte en vez de reaccionar.",
  "Escribir brevemente qué sentiste antes del impulso ayuda a mapear tus propios disparadores con el tiempo, más que confiar solo en la memoria.",
  "El craving funciona como una ola: sube, llega a un pico y baja sola. No tienes que pelearla, solo mantenerte a flote mientras pasa.",
  "La actividad física regular no solo ayuda al ánimo: mejora la calidad del sueño, y ambos factores reducen juntos la probabilidad de recaída.",
  "Sustituir no es reprimir. Buscar qué necesidad real cubría el hábito (calmar ansiedad, socializar, desconectar) y cubrirla de otra forma es más sostenible que solo decir 'no'.",
  "Los primeros 90 días suelen ser los de mayor reorganización cerebral. Que cueste más al inicio no significa que no esté funcionando.",
  "Contar los días no es superficial: llevar un registro visible se asocia a mayor probabilidad de mantener el cambio, porque hace tangible el progreso.",
  "Si programar o hacer ejercicio hoy también se sintió difícil, ese esfuerzo cuenta igual. Sostener varios hábitos a la vez consume la misma energía mental que estás reconstruyendo.",
  "Un ambiente con reglas claras y predecibles (horarios, rutinas) baja la carga de decisiones del día y deja más energía disponible para resistir impulsos.",
  "El apoyo profesional no es un último recurso, es una herramienta más. Combinarlo con lo que ya estás haciendo suele acelerar resultados, no reemplazarlos.",
  "La gratitud breve por escrito (2-3 cosas del día) redirige la atención lejos del malestar que suele preceder al impulso.",
  "Evita decidir 'para siempre' en el momento del antojo. Solo decide por las próximas 2 horas. El resto del compromiso ya está tomado.",
  "El aislamiento social alimenta la ansiedad y la ansiedad alimenta el impulso. Mantener algún contacto humano regular, aunque sea breve, rompe ese círculo."
];

function pickDailyTip(){
  const d = new Date();
  const daysSinceEpoch = Math.floor(d.getTime() / 86400000);
  const idx = daysSinceEpoch % TIPS.length;
  return TIPS[idx];
}

const DOW = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

let calDate = new Date(); calDate.setDate(1);
let selectedDayIso = null;

/* ---------------------------------------------------------------
   Storage — capa unificada con respaldo en localStorage y en la
   API externa (window.storage) si está disponible. Los datos se
   guardan en ambos para que sobrevivan a cambios de plataforma.
   Si la API externa no existe, localStorage funciona igual.
--------------------------------------------------------------- */
function lsGet(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
function lsSet(key, val){ try{ localStorage.setItem(key, val); return true; }catch(e){ return false; } }
function lsRemove(key){ try{ localStorage.removeItem(key); }catch(e){} }

function externalStoreAvailable(){
  return !!(window.storage && typeof window.storage.get === 'function' && typeof window.storage.set === 'function');
}

async function withRetry(fn, retries = 4, baseDelay = 700){
  let lastErr;
  for(let i = 0; i <= retries; i++){
    try{ return await fn(); }
    catch(e){
      lastErr = e;
      if(i < retries) await new Promise(res => setTimeout(res, baseDelay * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

// Lectura: primero storage externo (fuente canónica), luego localStorage
async function rawGet(key){
  if(externalStoreAvailable()){
    try{
      const ext = await withRetry(() => window.storage.get(key), 3, 500);
      if(ext && ext.value != null) return ext.value;
    }catch(e){ /* se sigue a localStorage */ }
  }
  return lsGet(key);
}

// Escritura: escribe en ambos (externo + localStorage). Solo falla si ambos fallan.
async function rawSet(key, value){
  let extOk = true, lsOk = false;
  if(externalStoreAvailable()){
    extOk = await withRetry(() => window.storage.set(key, value), 3, 400).then(()=>true).catch(()=>false);
  }
  lsOk = lsSet(key, value);
  return extOk || lsOk;
}

async function tryGetJSON(key, fallback){
  try{
    const r = await rawGet(key);
    return r ? JSON.parse(r) : fallback;
  }catch(e){
    return fallback;
  }
}

// Guarda en ambos stores; si falla, verifica si al menos uno quedó con los datos
async function persist(key, valueObj){
  const serialized = JSON.stringify(valueObj);
  const ok = await rawSet(key, serialized);
  if(ok) return true;
  const check = await rawGet(key).catch(()=>null);
  return check === serialized;
}

async function saveHabitsConfig(silent){
  const ok = await persist('habits:config', habitsConfig);
  if(ok){ if(!silent) showToast('Guardado ✓', null, 'success'); }
  else showToast('No se pudo guardar la lista de hábitos. Tus cambios siguen aquí en pantalla.', () => saveHabitsConfig());
}
async function saveHabits(){
  const ok = await persist('habits:days', habitDays);
  if(ok) showToast('Guardado ✓', null, 'success');
  else showToast('No se pudo guardar el registro. Tus datos siguen aquí, reintenta cuando quieras.', () => saveHabits());
}
async function saveTransactions(){
  const ok = await persist('finance:transactions', transactions);
  if(ok) showToast('Guardado ✓', null, 'success');
  else showToast('No se pudo guardar el movimiento. Tus datos siguen aquí, reintenta cuando quieras.', () => saveTransactions());
}
async function saveFeatured(){
  await persist('app:featured', featuredHabitKey);
}

async function loadData(){
  habitsConfig = await tryGetJSON('habits:config', null);
  if(!habitsConfig || habitsConfig.length === 0){
    habitsConfig = DEFAULT_HABITS.slice();
    await saveHabitsConfig(true);
  }
  habitDays = await tryGetJSON('habits:days', {});
  transactions = await tryGetJSON('finance:transactions', []);
  await recoverLostProgress(habitsConfig);
  featuredHabitKey = (await tryGetJSON('app:featured', null)) ||
    (habitsConfig.find(h=>h.key==='alcohol') ? 'alcohol' : (habitsConfig[0] ? habitsConfig[0].key : null));
  habitsCatIn = await tryGetJSON('finance:cats_ingreso', null);
  habitsCatOut = await tryGetJSON('finance:cats_gasto', null);
  if(!habitsCatIn || !habitsCatIn.length){ habitsCatIn = DEFAULT_CATS_INGRESO.slice(); }
  if(!habitsCatOut || !habitsCatOut.length){ habitsCatOut = DEFAULT_CATS_GASTO.slice(); }
}
async function saveCats(){
  await persist('finance:cats_ingreso', habitsCatIn);
  await persist('finance:cats_gasto', habitsCatOut);
}

/* Migración única: si no hay ningún día guardado, restaura el día que se
   perdió (28-ago-2026, hábito "Sin alcohol") para que no se vea vacío.
   Solo corre una vez y no toca datos reales ya existentes. */
async function recoverLostProgress(config){
  try{
    const seeded = await tryGetJSON('app:recovery_seeded_v1', null);
    if(seeded) return;
    if(Object.keys(habitDays).length > 0){ await persist('app:recovery_seeded_v1', true); return; }
    const lossKey = '2026-08-28';
    const alcoholHabit = config.find(h => h.label.trim().toLowerCase() === 'sin alcohol') || config.find(h => h.key === 'alcohol') || config[0];
    if(alcoholHabit && !habitDays[lossKey]){
      const d = emptyDay();
      d[alcoholHabit.key] = true;
      habitDays[lossKey] = d;
      await saveHabits();
    }
    await persist('app:recovery_seeded_v1', true);
  }catch(e){ /* la migración nunca debe romper la app */ }
}


/* ---------------------------------------------------------------
   Toast — small, calm, non-blocking status message
--------------------------------------------------------------- */
let toastTimer = null;
function showToast(message, onRetry, type = 'error'){
  clearTimeout(toastTimer);
  const el = document.getElementById('syncToast');
  el.classList.remove('error', 'success');
  el.classList.add(type);
  el.innerHTML = `<span>${message}</span>` + (onRetry ? `<button id="toastRetryBtn">Reintentar</button>` : '');
  el.classList.add('show');
  if(onRetry){
    document.getElementById('toastRetryBtn').addEventListener('click', () => {
      showToast('Reintentando…', null, 'error');
      onRetry();
    });
  }
  if(type === 'success'){
    toastTimer = setTimeout(hideToast, 1600);
  }
}
function hideToast(){
  document.getElementById('syncToast').classList.remove('show');
}

// scrollIntoView defensivo: no debe romper la app en entornos sin soporte
function scrollIntoViewSafe(el){
  try{ if(el && typeof el.scrollIntoView === 'function') el.scrollIntoView({behavior:'smooth', block:'nearest'}); }
  catch(e){}
}


/* ---------------------------------------------------------------
   Date helpers
--------------------------------------------------------------- */
function toIso(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function todayIso(){ return toIso(new Date()); }

/* ---------------------------------------------------------------
   Streak logic
--------------------------------------------------------------- */
function isDone(iso, key){
  const d = habitDays[iso];
  if(!d) return false;
  if(key === 'perfect'){
    if(habitsConfig.length === 0) return false;
    return habitsConfig.every(h => !!d[h.key]);
  }
  return !!d[key];
}
function currentStreak(key){
  let cursor = new Date();
  if(!isDone(toIso(cursor), key)) cursor.setDate(cursor.getDate()-1);
  let streak = 0;
  while(isDone(toIso(cursor), key)){
    streak++;
    cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}
function bestStreak(key){
  const doneIsos = Object.keys(habitDays).filter(iso => isDone(iso,key)).sort();
  let best=0, cur=0, prev=null;
  for(const iso of doneIsos){
    const d = new Date(iso+'T00:00:00');
    if(prev !== null && (d - prev)/86400000 === 1) cur++; else cur = 1;
    if(cur > best) best = cur;
    prev = d;
  }
  return best;
}

/* ---------- metrics ---------- */
// Total de días completados para un hábito
function totalDays(key){
  return Object.keys(habitDays).filter(iso => isDone(iso,key)).length;
}

// % de adherencia: días hechos / días desde que el hábito existe (su primer registro, o el más antiguo del año)
function adherencePct(key){
  const doneIsos = Object.keys(habitDays).filter(iso => isDone(iso,key));
  if(doneIsos.length === 0) return 0;
  const firstKeyDate = Math.min(...doneIsos.map(iso => new Date(iso+'T00:00:00').getTime()));
  const today = new Date(); today.setHours(0,0,0,0);
  const elapsed = Math.max(1, Math.floor((today - firstKeyDate)/86400000) + 1);
  return Math.round((doneIsos.length / elapsed) * 100);
}

// Serie de tendencia por semana: últimas 8 semanas, días hechos por semana
function trendSeries(key, weeks = 8){
  const today = new Date();
  const series = [];
  for(let w = weeks-1; w >= 0; w--){
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - (today.getDay()-1) - w*7);
    weekStart.setHours(0,0,0,0);
    const entry = {days:0, label: weekStart.toLocaleDateString('es-CL', {day:'numeric', month:'2-digit'})};
    for(let d=0; d<7; d++){
      const dd = new Date(weekStart); dd.setDate(dd.getDate()+d);
      const iso = toIso(dd);
      if(isDone(iso,key)) entry.days++;
    }
    series.push(entry);
  }
  return series;
}

/* ---------------------------------------------------------------
   Render: chain widget
--------------------------------------------------------------- */
function renderChain(key, n){
  const today = new Date();
  const days = [];
  for(let i = n-1; i >= 0; i--){
    const d = new Date(today); d.setDate(d.getDate()-i);
    days.push({iso: toIso(d), done: isDone(toIso(d), key)});
  }
  let html = '';
  days.forEach((day, idx) => {
    html += `<div class="link ${day.done?'filled':''}"></div>`;
    if(idx < days.length-1){
      const nextDone = days[idx+1].done && day.done;
      html += `<div class="chain-line ${nextDone?'filled':''}"></div>`;
    }
  });
  return html;
}

/* ---------------------------------------------------------------
   Render: dashboard
--------------------------------------------------------------- */
function renderDashboard(){
  document.getElementById('tipText').textContent = pickDailyTip();

  // hero: usa el hábito destacado configurable
  const heroHabit = habitsConfig.find(h => h.key === featuredHabitKey) || habitsConfig[0] || null;
  const heroCard = document.querySelector('.hero');
  const heroSelect = document.getElementById('heroHabitSelect');
  if(heroHabit){
    heroCard.style.display = 'flex';
    document.getElementById('heroDays').textContent = currentStreak(heroHabit.key);
    document.getElementById('heroDays').style.color = heroHabit.color;
    document.getElementById('heroTitle').textContent = `días consecutivos — ${heroHabit.label}`;
    heroSelect.innerHTML = habitsConfig.map(h => `
      <option value="${esc(h.key)}" ${h.key===heroHabit.key?'selected':''}>${esc(h.label)}</option>
    `).join('');
    heroSelect.style.display = '';
  } else {
    heroCard.style.display = 'none';
    heroSelect.style.display = 'none';
  }

  const grid = document.getElementById('habitGrid');
  grid.innerHTML = habitsConfig.map(h => {
    const pct = adherencePct(h.key);
    const trend = trendSeries(h.key);
    const maxTrend = Math.max(1, ...trend.map(t=>t.days));
    const color = isValidColor(h.color) ? h.color : 'var(--text-muted)';
    const key = esc(h.key);
    const label = esc(h.label);
    const icon = sanitizeIcon(h.icon);
    return `
    <div class="habit-card" style="--icon-color:${color}">
      <div class="card-actions">
        <button class="icon-btn" data-edit="${key}" title="Editar hábito" aria-label="Editar ${label}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
        <button class="icon-btn danger" data-key="${key}" title="Quitar hábito" aria-label="Quitar ${label}">✕</button>
      </div>
      <div class="habit-head">
        <div class="habit-icon" role="presentation">${icon}</div>
        <strong>${label}</strong>
      </div>
      <div class="streak-row">
        <div class="streak-stat"><div class="num">${currentStreak(h.key)}</div><div class="lbl">Racha actual</div></div>
        <div class="streak-stat"><div class="num">${bestStreak(h.key)}</div><div class="lbl">Mejor racha</div></div>
      </div>
      <div class="habit-stats">
        <div class="st"><div class="num">${totalDays(h.key)}</div><div class="lbl">Días totales</div></div>
        <div class="st"><div class="num">${pct}%</div><div class="lbl">Adherencia</div></div>
        <div class="st"><div class="num">${habitsConfig.indexOf(h)+1}</div><div class="lbl">Posición</div></div>
      </div>
      <div class="habit-slider" title="Adherencia histórica: ${pct}% de los días desde tu primer registro">
        <div class="bar">
          <span class="done" style="width:${pct}%"></span><span class="blank"></span>
        </div>
        <div class="adherence">${pct}% de adherencia</div>
      </div>
      <div class="chain">${renderChain(h.key, 14)}</div>
      <div class="trend-wrap">
        <div class="cat-group-label">Progreso por semana (últimas ${trend.length})</div>
        <div class="trend-chart">
          ${trend.map(t=>`
            <div class="trend-col" title="${t.days} días">
              <div class="trend-bar ${t.days>=5?'high':t.days>=3?'med':''}" style="height:${Math.round((t.days/maxTrend)*100)}%"></div>
              <div class="trend-lbl">${t.label}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('') + `<div class="add-habit-card" id="openAddHabit">+ Agregar hábito</div>`;

  document.querySelectorAll('.icon-btn[data-edit]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditHabitModal(btn.dataset.edit));
  });
  document.querySelectorAll('.icon-btn[data-key]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const h = habitsConfig.find(x=>x.key===btn.dataset.key);
      if(!h) return;
      openConfirmModal(
        `¿Quitar "${h.label}"?`,
        'El historial registrado de este hábito se mantiene guardado, pero dejará de mostrarse.',
        'Quitar hábito',
        async ()=>{
          habitsConfig = habitsConfig.filter(x=>x.key!==btn.dataset.key);
          if(featuredHabitKey === h.key) featuredHabitKey = habitsConfig[0] ? habitsConfig[0].key : null;
          await saveHabitsConfig();
          await saveFeatured();
          renderDashboard();
          renderCalendar();
        }
      );
    });
  });
  const addCard = document.getElementById('openAddHabit');
  if(addCard) addCard.addEventListener('click', openAddHabitForm);

  heroSelect.onchange = async ()=>{
    featuredHabitKey = heroSelect.value;
    await saveFeatured();
    renderDashboard();
  };

  document.getElementById('todayLbl').textContent =
    new Date().toLocaleDateString('es-CL', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  const today = todayIso();
  const todayData = habitDays[today] || {};
  document.getElementById('todayToggles').innerHTML = habitsConfig.map(h => `
    <button class="toggle-btn ${todayData[h.key] ? 'on':''}" data-key="${esc(h.key)}" style="--btn-color:${isValidColor(h.color)?h.color:'var(--text-muted)'}" aria-pressed="${todayData[h.key] ? 'true':'false'}">
      ${sanitizeIcon(h.icon)} ${esc(h.label)}
    </button>
  `).join('');
  document.getElementById('todayNota').value = todayData.nota || '';

  document.querySelectorAll('#todayToggles .toggle-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.key;
      if(!habitDays[today]) habitDays[today] = emptyDay();
      habitDays[today][key] = !habitDays[today][key];
      btn.classList.toggle('on');
      btn.setAttribute('aria-pressed', habitDays[today][key] ? 'true':'false');
    });
  });
}

/* ---------------------------------------------------------------
   Modal system — sustituye a confirm()/alert()
--------------------------------------------------------------- */
function openModal(title, bodyHtml, buttonsHtml){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalBtns').innerHTML = buttonsHtml || '';
  document.getElementById('modalOverlay').classList.add('show');
  const firstBtn = document.querySelector('#modalBtns button');
  if(firstBtn) firstBtn.focus();
}

function closeModal(){
  document.getElementById('modalOverlay').classList.remove('show');
  document.getElementById('modalBtns').innerHTML = '';
}

function openConfirmModal(title, message, confirmLabel, onYes, onNo){
  openModal(title, `<p>${message}</p>`, `
    <button class="ghost-btn" data-modal-no>Cancelar</button>
    <button class="danger-btn" data-modal-yes>${esc(confirmLabel)}</button>
  `);
  const yes = document.querySelector('[data-modal-yes]');
  const no = document.querySelector('[data-modal-no]');
  if(yes) yes.addEventListener('click', async()=>{ closeModal(); await onYes(); });
  if(no) no.addEventListener('click', ()=>{ closeModal(); if(onNo) onNo(); });
}

document.getElementById('modalOverlay').addEventListener('click', (e)=>{
  if(e.target.id === 'modalOverlay') closeModal();
});

/* ---------------------------------------------------------------
   Edit habit modal — renombrar, cambiar color e icono
--------------------------------------------------------------- */
const EDIT_ICONS = [ICON_ALCOHOL, ICON_EJERCICIO, ICON_CODIGO, ICON_CUSTOM, ICON_BOOK, ICON_MINDFUL, ICON_MOON, ICON_BAN];

function openEditHabitModal(key){
  const h = habitsConfig.find(x=>x.key===key);
  if(!h) return;
  editingHabitKey = key;
  editingColor = isValidColor(h.color) ? h.color : SWATCH_COLORS[0];
  editingIcon = sanitizeIcon(h.icon);

  const iconBtns = EDIT_ICONS.map((ic,i)=>`
    <button class="edit-icon ${ic===editingIcon?'selected':''}" data-ic="${i}" title="Elegir icono" aria-label="Icono ${i+1}">${ic}</button>
  `).join('');

  openModal('Editar hábito',
    `<div class="field" style="margin-bottom:10px;">
       <label>Nombre</label>
       <input type="text" id="editLabel" maxlength="${MAX_LABEL}" value="${esc(h.label)}">
     </div>
     <div class="cat-group-label">Color</div>
     <div class="swatches" id="editSwatches">
       ${SWATCH_COLORS.map(c=>`<div class="swatch ${c===editingColor?'selected':''}" data-color="${c}" style="background:${c}"></div>`).join('')}
     </div>
     <div class="cat-group-label">Icono</div>
     <div class="edit-icon-row" id="editIcons">${iconBtns}</div>
     <p id="editError" style="color:var(--c-danger); font-size:12.5px; margin:8px 0 0 0; min-height:16px;"></p>`,
    `<button class="ghost-btn" data-modal-no>Cerrar</button>
     <button class="save-btn" data-modal-save>Guardar</button>`
  );

  document.querySelectorAll('#editSwatches .swatch').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      editingColor = sw.dataset.color;
      document.querySelectorAll('#editSwatches .swatch').forEach(s=>s.classList.remove('selected'));
      sw.classList.add('selected');
    });
  });
  document.querySelectorAll('#editIcons .edit-icon').forEach(b=>{
    b.addEventListener('click', ()=>{
      editingIcon = EDIT_ICONS[+b.dataset.ic];
      document.querySelectorAll('#editIcons .edit-icon').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');
    });
  });
  document.querySelector('[data-modal-no]').addEventListener('click', closeModal);
  document.querySelector('[data-modal-save]').addEventListener('click', async ()=>{
    const label = cleanFreeText(document.getElementById('editLabel').value, MAX_LABEL);
    const err = document.getElementById('editError');
    if(!label){ err.textContent = 'El nombre no puede estar vacío.'; return; }
    const duplicated = habitsConfig.some(x => x.key!==editingHabitKey && x.label.trim().toLowerCase() === label.toLowerCase());
    if(duplicated){ err.textContent = 'Ya tienes un hábito con ese nombre.'; return; }
    const h = habitsConfig.find(x=>x.key===editingHabitKey);
    h.label = label;
    h.color = isValidColor(editingColor) ? editingColor : SWATCH_COLORS[0];
    h.icon = sanitizeIcon(editingIcon);
    await saveHabitsConfig();
    closeModal();
    showToast('Hábito actualizado ✓', null, 'success');
    renderDashboard();
    renderCalendar();
  });
}

/* ---------------------------------------------------------------
   Reorder habits (drag & drop) + datos / export / import
--------------------------------------------------------------- */
function renderReorderList(){
  const list = document.getElementById('reorderList');
  if(habitsConfig.length === 0){
    list.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Aún no tienes hábitos.</p>';
    return;
  }
  list.innerHTML = habitsConfig.map((h,i)=>`
    <div class="reorder-item" data-idx="${i}" draggable="true">
      <span class="drag-handle" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </span>
      <span class="habit-icon" role="presentation" style="width:24px;height:24px;font-size:12px;">${sanitizeIcon(h.icon)}</span>
      <span class="edit-order">${esc(h.label)}</span>
      <span class="edit-hint">arrastra para mover</span>
    </div>
  `).join('');

  let dragIdx = null;
  list.querySelectorAll('.reorder-item').forEach(item=>{
    item.addEventListener('dragstart', (e)=>{
      dragIdx = +item.dataset.idx;
      item.classList.add('dragging');
      e.dataTransfer && e.dataTransfer.setData('text/plain', String(dragIdx));
      e.dataTransfer && (e.dataTransfer.effectAllowed = 'move');
    });
    item.addEventListener('dragend', ()=> item.classList.remove('dragging'));
    item.addEventListener('dragover', (e)=>{ e.preventDefault(); });
    item.addEventListener('drop', (e)=>{
      e.preventDefault();
      let from = dragIdx != null ? dragIdx : parseInt((e.dataTransfer && e.dataTransfer.getData('text/plain')) || '0', 10);
      const to = +item.dataset.idx;
      if(!Number.isInteger(from) || from < 0 || from >= habitsConfig.length) from = 0;
      if(!Number.isInteger(to) || to < 0 || to >= habitsConfig.length) return;
      if(from===to) return;
      const moved = habitsConfig.splice(from,1)[0];
      habitsConfig.splice(to,0,moved);
      saveHabitsConfig().then(()=>{ showToast('Orden guardado ✓', null, 'success'); renderReorderList(); renderDashboard(); });
    });
  });
}

function downloadFile(filename, content, mime){
  const blob = new Blob([content], {type:mime || 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function exportData(){
  const payload = {
    app:'bitacora', version:1, exportedAt:new Date().toISOString(),
    habits: habitsConfig, days: habitDays, transactions: transactions,
    featured: featuredHabitKey, catsIn: habitsCatIn, catsOut: habitsCatOut
  };
  const dateStr = todayIso();
  downloadFile(`bitacora-backup-${dateStr}.json`, JSON.stringify(payload, null, 2));
  showToast('Copia de seguridad exportada ✓', null, 'success');
}

document.getElementById('exportBtn').addEventListener('click', exportData);

document.getElementById('importBtn').addEventListener('click', ()=>{
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(!data || (data.app !== 'bitacora')) throw new Error('formato no reconocido');
      openConfirmModal(
        '¿Importar esta copia?',
        'Esto reemplazará <b>todo</b> tu progreso y configuración actuales por los del archivo. Considera primero exportar una copia de seguridad del estado actual.',
        'Importar y reemplazar',
        async ()=>{
          const s = sanitizeImport(data);
          habitsConfig = s.habits;
          habitDays = s.days;
          transactions = s.transactions;
          featuredHabitKey = cleanFreeText(data.featured, 40) && s.habits.some(h=>h.key===data.featured) ? data.featured
            : (s.habits.find(h=>h.key==='alcohol') ? 'alcohol' : (s.habits[0] ? s.habits[0].key : null));
          habitsCatIn = s.catsIn;
          habitsCatOut = s.catsOut;
          await Promise.all([saveHabitsConfig(true), saveHabits(), saveTransactions(), saveCats(), saveFeatured()]);
          renderDashboard(); renderCalendar(); renderFinance(); renderReorderList(); renderCatManagerModal();
          document.getElementById('monthPicker').value = currentYearMonth();
          showToast('Datos importados ✓', null, 'success');
        }
      );
    }catch(err){
      openModal('No se pudo importar', '<p>El archivo no es una copia de seguridad válida de Bitácora.</p>', '<button class="ghost-btn" data-modal-no>Entendido</button>');
      document.querySelector('[data-modal-no]').addEventListener('click', closeModal);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', ()=>{
  openConfirmModal(
    '¿Restablecer todo?',
    'Se borrarán <strong>todos</strong> tus hábitos, días registrados y movimientos de gastos de este dispositivo. Esta acción no se puede deshacer.',
    'Borrar todo',
    async ()=>{
      habitsConfig = DEFAULT_HABITS.slice();
      habitDays = {};
      transactions = [];
      habitsCatIn = DEFAULT_CATS_INGRESO.slice();
      habitsCatOut = DEFAULT_CATS_GASTO.slice();
      featuredHabitKey = 'alcohol';
      ['habits:config','habits:days','finance:transactions','app:featured','finance:cats_ingreso','finance:cats_gasto'].forEach(k=>{
        if(externalStoreAvailable()){ withRetry(()=>window.storage.remove && window.storage.remove(k),1).catch(()=>{}); }
        lsRemove(k);
      });
      renderDashboard(); renderCalendar(); renderFinance(); renderReorderList(); renderCatManagerModal();
      document.getElementById('monthPicker').value = currentYearMonth();
      showToast('Datos restablecidos ✓', null, 'success');
    }
  );
});

document.getElementById('manageCatsBtn').addEventListener('click', renderCatManagerModal);
function renderCatManagerModal(){
  const line = (cat, idx, kind) => `
    <div class="cat-line">
      <span class="em-dot" style="background:${kind==='in'?'var(--c-money-in)':'var(--c-money-out)'}"></span>
      <input type="text" maxlength="${MAX_CAT}" value="${esc(cat)}" data-cats-idx="${idx}" data-cats-kind="${kind}">
      <button class="del-btn" data-cats-del="${idx}" data-cats-kind="${kind}" aria-label="Eliminar ${esc(cat)}">✕</button>
    </div>`;
  openModal('Categorías de gasto',
    `<div class="cat-group-label">Ingresos</div>
     <div class="cat-manage"><div class="cat-list" id="catListIn">${habitsCatIn.map((c,i)=>line(c,i,'in')).join('')}</div>
       <div class="add-cat"><div class="em-dot" style="background:var(--c-money-in)"></div><input type="text" maxlength="${MAX_CAT}" id="newCatIn" placeholder="Nueva categoría de ingreso…"><button class="save-btn" data-addcat="in">Agregar</button></div>
     </div>
     <div class="cat-group-label" style="margin-top:12px;">Gastos</div>
     <div class="cat-manage"><div class="cat-list" id="catListOut">${habitsCatOut.map((c,i)=>line(c,i,'out')).join('')}</div>
       <div class="add-cat"><div class="em-dot" style="background:var(--c-money-out)"></div><input type="text" maxlength="${MAX_CAT}" id="newCatOut" placeholder="Nueva categoría de gasto…"><button class="save-btn" data-addcat="out">Agregar</button></div>
     </div>`,
    '<button class="ghost-btn" data-modal-no>Cerrar</button>'
  );
  document.querySelector('[data-modal-no]').addEventListener('click', closeModal);

  document.querySelectorAll('[data-addcat]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const kind = btn.dataset.addcat;
      const input = document.getElementById(kind==='in'?'newCatIn':'newCatOut');
      const val = cleanFreeText(input.value, MAX_CAT);
      if(!val) return;
      const arr = kind==='in' ? habitsCatIn : habitsCatOut;
      if(arr.some(c=>c.toLowerCase()===val.toLowerCase())) return;
      arr.push(val);
      saveCats().then(()=>{ renderCatManagerModal(); renderFinance(); populateCategorySelect(); });
    });
  });
  document.querySelectorAll('input[data-cats-idx]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      const idx = +inp.dataset.catsIdx;
      const kind = inp.dataset.catsKind;
      const arr = kind==='in' ? habitsCatIn : habitsCatOut;
      if(!Number.isInteger(idx) || idx < 0 || idx >= arr.length) return;
      const val = cleanFreeText(inp.value, MAX_CAT);
      if(!val){ arr.splice(idx,1); }
      else{
        if(arr.some((c,i)=>i!==idx && c.toLowerCase()===val.toLowerCase())){ inp.value = arr[idx]; return; }
        arr[idx] = val;
      }
      saveCats().then(()=>{ renderCatManagerModal(); renderFinance(); populateCategorySelect(); });
    });
  });
  document.querySelectorAll('[data-cats-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.dataset.catsDel;
      const kind = btn.dataset.catsKind;
      const arr = kind==='in' ? habitsCatIn : habitsCatOut;
      if(!Number.isInteger(idx) || idx < 0 || idx >= arr.length) return;
      arr.splice(idx,1);
      saveCats().then(()=>{ renderCatManagerModal(); renderFinance(); populateCategorySelect(); });
    });
  });
}

document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') closeModal();
});

/* ---------------------------------------------------------------
   Habit management (add / remove custom habits)
--------------------------------------------------------------- */
function habitLabelExists(label){
  const normalized = label.trim().toLowerCase();
  return habitsConfig.some(h => h.label.trim().toLowerCase() === normalized);
}

function renderCatChips(containerId, presets){
  const el = document.getElementById(containerId);
  el.innerHTML = presets.map(p => {
    const already = habitLabelExists(p.label);
    return `
    <div class="cat-chip ${already?'disabled':''}" data-label="${p.label}" data-color="${p.color}" style="--chip-color:${p.color}">
      ${p.icon} ${p.label}${already ? ' <span class="chip-added">· ya agregado</span>' : ''}
    </div>`;
  }).join('');
  el.querySelectorAll('.cat-chip').forEach((chip, i) => {
    if(chip.classList.contains('disabled')) return;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      document.getElementById('newHabitLabel').value = presets[i].label;
      newHabitColor = presets[i].color;
      newHabitIcon = presets[i].icon;
      document.querySelectorAll('#newHabitSwatches .swatch').forEach(s => s.classList.remove('selected'));
    });
  });
}

function openAddHabitForm(){
  const form = document.getElementById('addHabitForm');
  form.classList.add('open');
  document.getElementById('newHabitLabel').value = '';
  document.getElementById('newHabitError').textContent = '';
  newHabitColor = SWATCH_COLORS[Math.floor(Math.random()*SWATCH_COLORS.length)];
  newHabitIcon = ICON_CUSTOM;
  renderCatChips('catChipsVicio', PRESET_VICIOS);
  renderCatChips('catChipsHabito', PRESET_HABITOS);
  document.getElementById('newHabitSwatches').innerHTML = SWATCH_COLORS.map(c => `
    <div class="swatch ${c===newHabitColor?'selected':''}" data-color="${c}" style="background:${c}"></div>
  `).join('');
  document.querySelectorAll('#newHabitSwatches .swatch').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      newHabitColor = sw.dataset.color;
      document.querySelectorAll('#newHabitSwatches .swatch').forEach(s=>s.classList.remove('selected'));
      sw.classList.add('selected');
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
    });
  });
  scrollIntoViewSafe(form);
}
document.getElementById('newHabitCancel').addEventListener('click', ()=>{
  document.getElementById('addHabitForm').classList.remove('open');
});
document.getElementById('newHabitAdd').addEventListener('click', async ()=>{
  const label = cleanFreeText(document.getElementById('newHabitLabel').value, MAX_LABEL);
  const errEl = document.getElementById('newHabitError');
  if(!label){ errEl.textContent = 'Ponle un nombre al hábito, o elige una categoría arriba.'; return; }
  if(habitLabelExists(label)){ errEl.textContent = `Ya tienes un hábito llamado "${label}".`; return; }
  errEl.textContent = '';
  const key = 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
  habitsConfig.push({key, label, color: isValidColor(newHabitColor) ? newHabitColor : SWATCH_COLORS[0], icon: sanitizeIcon(newHabitIcon)});
  await saveHabitsConfig();
  document.getElementById('addHabitForm').classList.remove('open');
  renderDashboard();
  renderCalendar();
});

document.getElementById('saveToday').addEventListener('click', async ()=>{
  const today = todayIso();
  if(!habitDays[today]) habitDays[today] = emptyDay();
  habitDays[today].nota = cleanFreeText(document.getElementById('todayNota').value, MAX_NOTE);
  await saveHabits();
  renderDashboard();
  renderCalendar();
});

/* ---------------------------------------------------------------
   Render: calendar
--------------------------------------------------------------- */
function renderCalendar(){
  document.getElementById('calDow').innerHTML = DOW.map(d=>`<div class="cal-dow">${d}</div>`).join('');
  document.getElementById('calTitle').textContent =
    `${MONTHS[calDate.getMonth()]} ${calDate.getFullYear()}`;

  const year = calDate.getFullYear(), month = calDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = todayIso();

  let cells = '';
  for(let i=0;i<startOffset;i++) cells += '<div class="cal-day blank"></div>';
  for(let day=1; day<=daysInMonth; day++){
    const d = new Date(year, month, day);
    const iso = toIso(d);
    const data = habitDays[iso] || {};
    const perfect = isDone(iso, 'perfect');
    const isToday = iso === todayStr;
    const isSelected = iso === selectedDayIso;
    cells += `
      <div class="cal-day ${perfect?'perfect':''} ${isToday?'today':''} ${isSelected?'selected':''}" data-iso="${iso}">
        <div class="dnum mono">${day}</div>
        <div class="dots">
          ${habitsConfig.map(h => `<span style="background-color:${data[h.key] ? (isValidColor(h.color)?h.color:'var(--text-muted)') : 'var(--border)'}"></span>`).join('')}
        </div>
      </div>`;
  }
  document.getElementById('calGrid').innerHTML = cells;

  document.querySelectorAll('.cal-day[data-iso]').forEach(cell=>{
    cell.addEventListener('click', ()=> openDayEditor(cell.dataset.iso));
  });
}

function openDayEditor(iso){
  selectedDayIso = iso;
  renderCalendar();
  const editor = document.getElementById('dayEditor');
  editor.style.display = 'block';
  editor.classList.toggle('today-editor', iso === todayIso());
  const data = habitDays[iso] || {};
  const dateObj = new Date(iso+'T00:00:00');
  const isToday = iso === todayIso();
  document.getElementById('dayEditorTitle').textContent =
    (isToday ? 'Hoy — ' : '') + dateObj.toLocaleDateString('es-CL', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  document.getElementById('dayEditorToggles').innerHTML = habitsConfig.map(h => `
    <button class="toggle-btn ${data[h.key] ? 'on':''}" data-key="${esc(h.key)}" style="--btn-color:${isValidColor(h.color)?h.color:'var(--text-muted)'}" aria-pressed="${data[h.key] ? 'true':'false'}">
      ${sanitizeIcon(h.icon)} ${esc(h.label)}
    </button>
  `).join('');
  document.getElementById('dayEditorNota').value = data.nota || '';

  document.querySelectorAll('#dayEditorToggles .toggle-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.key;
      if(!habitDays[iso]) habitDays[iso] = emptyDay();
      habitDays[iso][key] = !habitDays[iso][key];
      btn.classList.toggle('on');
      btn.setAttribute('aria-pressed', habitDays[iso][key] ? 'true':'false');
    });
  });
  scrollIntoViewSafe(editor);
}

document.getElementById('dayEditorSave').addEventListener('click', async ()=>{
  if(!selectedDayIso) return;
  if(!habitDays[selectedDayIso]) habitDays[selectedDayIso] = emptyDay();
  habitDays[selectedDayIso].nota = cleanFreeText(document.getElementById('dayEditorNota').value, MAX_NOTE);
  await saveHabits();
  renderCalendar();
  renderDashboard();
});

document.getElementById('calPrev').addEventListener('click', ()=>{
  calDate.setMonth(calDate.getMonth()-1); renderCalendar();
});
document.getElementById('calNext').addEventListener('click', ()=>{
  calDate.setMonth(calDate.getMonth()+1); renderCalendar();
});
document.getElementById('calToday').addEventListener('click', ()=>{
  calDate = new Date(); calDate.setDate(1); renderCalendar();
});

/* ---------------------------------------------------------------
   Render: finance
--------------------------------------------------------------- */
function fmtCLP(n){
  return '$' + Math.round(n).toLocaleString('es-CL');
}
function currentYearMonth(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}
function populateCategorySelect(){
  const tipo = document.getElementById('txTipo').value;
  const cats = tipo === 'ingreso' ? habitsCatIn : habitsCatOut;
  document.getElementById('txCategoria').innerHTML = cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
document.getElementById('txTipo').addEventListener('change', populateCategorySelect);

function renderFinance(){
  const ym = document.getElementById('monthPicker').value;
  const monthTx = transactions.filter(t => t && typeof t.date === 'string' && t.date.startsWith(ym));

  const totalIn = monthTx.filter(t=>t.tipo==='ingreso').reduce((s,t)=>s + (Number.isFinite(Number(t.monto)) ? Number(t.monto) : 0),0);
  const totalOut = monthTx.filter(t=>t.tipo==='gasto').reduce((s,t)=>s + (Number.isFinite(Number(t.monto)) ? Number(t.monto) : 0),0);
  document.getElementById('sumIn').textContent = fmtCLP(totalIn);
  document.getElementById('sumOut').textContent = fmtCLP(totalOut);
  const balanceEl = document.getElementById('sumBalance');
  balanceEl.textContent = fmtCLP(totalIn - totalOut);
  balanceEl.style.color = (totalIn-totalOut) >= 0 ? 'var(--c-success)' : 'var(--c-danger)';

  const sorted = [...monthTx].sort((a,b)=> b.date.localeCompare(a.date));
  const tbody = document.getElementById('txTbody');
  if(sorted.length === 0){
    tbody.innerHTML = '';
    document.getElementById('txEmpty').style.display = 'block';
  } else {
    document.getElementById('txEmpty').style.display = 'none';
    tbody.innerHTML = sorted.map(t => `
      <tr>
        <td class="mono">${esc(t.date)}</td>
        <td>${esc(t.categoria)}</td>
        <td>${esc(t.descripcion || '—')}</td>
        <td style="text-align:right;" class="tx-amount ${t.tipo==='ingreso'?'in':'out'}">
          ${t.tipo==='ingreso'?'+':'-'}${fmtCLP(Number(t.monto)||0)}
        </td>
        <td style="text-align:right;"><button class="del-btn" data-id="${esc(t.id)}">✕</button></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.del-btn').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        transactions = transactions.filter(t => t.id !== btn.dataset.id);
        await saveTransactions();
        renderFinance();
      });
    });
  }
}

document.getElementById('txAdd').addEventListener('click', async ()=>{
  const date = document.getElementById('txDate').value;
  const tipo = document.getElementById('txTipo').value === 'ingreso' ? 'ingreso' : 'gasto';
  const categoria = cleanFreeText(document.getElementById('txCategoria').value, MAX_CAT);
  const monto = Number.parseFloat(document.getElementById('txMonto').value);
  const descripcion = cleanFreeText(document.getElementById('txDesc').value, 300);

  if(!ISO_DATE_RE.test(date) || !Number.isFinite(monto) || monto <= 0 || monto > 1e12){
    openModal('Falta información', '<p>Ingresa una fecha y un monto válido para registrar el movimiento.</p>', '<button class="ghost-btn" data-modal-no>Entendido</button>');
    const no = document.querySelector('[data-modal-no]');
    if(no) no.addEventListener('click', closeModal);
    return;
  }
  transactions.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
    date, tipo, categoria, monto, descripcion
  });
  await saveTransactions();
  document.getElementById('txMonto').value = '';
  document.getElementById('txDesc').value = '';
  document.getElementById('monthPicker').value = date.slice(0,7);
  renderFinance();
});

document.getElementById('monthPicker').addEventListener('change', renderFinance);

/* ---------------------------------------------------------------
   Tabs
--------------------------------------------------------------- */
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-'+btn.dataset.view).classList.add('active');
    if(btn.dataset.view === 'datos') renderReorderList();
    if(btn.dataset.view === 'cuenta' && window.BitacoraAuth && window.BitacoraAuth.renderPanel) window.BitacoraAuth.renderPanel();
  });
});

/* ---------------------------------------------------------------
   Init
--------------------------------------------------------------- */
async function init(){
  await loadData();
  document.getElementById('txDate').value = todayIso();
  document.getElementById('monthPicker').value = currentYearMonth();
  populateCategorySelect();
  renderDashboard();
  renderCalendar();
  renderFinance();
  renderReorderList();
  document.getElementById('loading').style.display = 'none';
}
init();

/* ---------------------------------------------------------------
   PWA: registra el Service Worker (shell offline + instalable).
   No debe romper la app si el navegador no lo soporta o falla.
--------------------------------------------------------------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
