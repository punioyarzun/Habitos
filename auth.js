/* ============================================================================
   BITÁCORA — Autenticación (Supabase Auth) y almacenamiento por usuario
   ----------------------------------------------------------------------------
   Este archivo se carga ANTES que app.js y define window.storage con el
   contrato exacto que app.js ya usa (get/set/remove). Si hay sesión iniciada,
   window.storage habla con el backend (Netlify Function -> Supabase). Si no,
   actúa como "inactivo" para que app.js siga usando localStorage como antes.

   Mejoras:
   - Auto-refresh del token: si el JWT caduca (~1h), se renueva con el
     refresh_token y se reintenta la petición (no se cae a modo local).
   - Caché de lectura corta: evita N llamadas al backend al cargar la app.
   ============================================================================ */

(function () {
  'use strict';

  var CFG = window.SUPABASE_CONFIG || {};
  var URL = CFG.url;
  var ANON = CFG.anonKey || '';

  var SESSION_KEY = 'bitacora_session';
  var LAST_USER_KEY = 'bitacora_last_user';
  var APP_KEYS = ['habits:config', 'habits:days', 'finance:transactions', 'app:featured', 'finance:cats_ingreso', 'finance:cats_gasto', 'app:recovery_seeded_v1'];

  var session = loadSession();
  // Síncrono: si hay sesión, el backend es la fuente de datos desde el primer
  // momento en que app.js haga rawGet/rawSet (app.js se carga DESPUÉS de auth.js).
  var backendReady = !!session;

  // Caché de lectura (blob completo del usuario) con TTL corto.
  var readCache = null;
  var readCacheTime = 0;
  var CACHE_TTL = 2000;

  // ---------- sesión local ----------
  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveSession(s) {
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  // ---------- Supabase REST ----------
  function supabaseFetch(path, opts) {
    return fetch(URL + path, Object.assign({
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
    }, opts || {}));
  }

  function setOAuthTokensFromHash() {
    var h = window.location.hash || '';
    if (!h || h.indexOf('#access_token=') === -1) return;
    var params = {};
    h.replace(/^#/, '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    if (params.access_token) {
      session = {
        access_token: params.access_token,
        refresh_token: params.refresh_token,
        user: { id: params.uid || '', email: params.email || '' },
      };
      saveSession(session);
      try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
      return true;
    }
    return false;
  }

  // ---------- renovación de token ----------
  function refreshAccessToken() {
    if (!session || !session.refresh_token) return Promise.resolve(false);
    return supabaseFetch('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error || !j.access_token) return false;
        session = {
          access_token: j.access_token,
          refresh_token: j.refresh_token,
          user: j.user ? { id: j.user.id || '', email: j.user.email || '' } : session.user,
        };
        saveSession(session);
        return true;
      })
      .catch(function () { return false; });
  }

  // ---------- backend (Netlify Function) con auto-refresh ----------
  function apiRaw(action, payload, token) {
    return fetch('/api/bitacora', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
    });
  }

  function doApi(action, payload, allowRetry) {
    if (!session || !session.access_token) return Promise.reject(new Error('no_session'));
    var token = session.access_token;
    function attempt(n) {
      return apiRaw(action, payload, token).then(function (r) {
        if (r.status === 401 && allowRetry !== false && n === 0) {
          return refreshAccessToken().then(function (ok) {
            if (ok) { token = session.access_token; return attempt(1); }
            throw new Error('unauthorized');
          });
        }
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || j.error) {
            throw new Error((j.error || ('http_' + r.status)) + (j.detail ? ': ' + j.detail : ''));
          }
          return j;
        });
      });
    }
    return attempt(0);
  }

  // ---------- caché de lectura ----------
  function invalidateCache() { readCache = null; readCacheTime = 0; }
  function getBlob() {
    var now = Date.now();
    if (readCache && now - readCacheTime < CACHE_TTL) return Promise.resolve(readCache);
    return doApi('load').then(function (j) {
      readCache = (j && j.data) || {};
      readCacheTime = Date.now();
      return readCache;
    });
  }

  // ---------- window.storage (contrato de app.js) ----------
  var storage = {
    get: function (key) {
      if (!session || !backendReady) return Promise.resolve(null);
      return getBlob().then(function (blob) {
        return (key in blob) ? { value: blob[key] } : null;
      });
    },
    set: function (key, value) {
      if (!session || !backendReady) return Promise.resolve(false);
      return doApi('save', { key: key, value: value })
        .then(function () { invalidateCache(); return true; })
        .catch(function () { return false; });
    },
    remove: function (key) {
      if (!session || !backendReady) return Promise.resolve(false);
      return doApi('clear', { key: key })
        .then(function () { invalidateCache(); return true; })
        .catch(function () { return false; });
    },
  };
  window.storage = storage;

  // ---------- autenticación: acciones ----------
  function signUp(email, password) {
    return supabaseFetch('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: email, password: password }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) throw new Error(j.error_description || j.msg || 'Error al crear la cuenta');
        if (j.access_token) { session = { access_token: j.access_token, refresh_token: j.refresh_token, user: { id: (j.user && j.user.id) || '', email: email } }; saveSession(session); }
        return j;
      });
  }

  function signIn(email, password) {
    return supabaseFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: email, password: password }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) throw new Error(j.error_description || j.msg || 'Credenciales incorrectas');
        session = { access_token: j.access_token, refresh_token: j.refresh_token, user: { id: (j.user && j.user.id) || '', email: (j.user && j.user.email) || email } };
        saveSession(session);
        return j;
      });
  }

  function signInWithProvider(provider) {
    var redir = encodeURIComponent(CFG.redirectTo || window.location.origin);
    window.location.href = URL + '/auth/v1/authorize?provider=' + provider + '&redirect_to=' + redir;
  }

  function signOut() {
    if (session) {
      try {
        supabaseFetch('/auth/v1/logout', { method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token } }).catch(function () {});
      } catch (e) {}
    }
    session = null;
    saveSession(null);
    window.location.reload();
  }

  // ---------- UI: botón de sesión y modal de login ----------
  function buildUI() {
    var header = document.querySelector('.app-header');
    if (!header) return;
    var holder = document.createElement('div');
    holder.className = 'auth-holder';
    header.appendChild(holder);

    if (session && session.access_token) {
      var email = (session.user && session.user.email) || '';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'auth-btn logged';
      btn.textContent = 'Sesión: ' + (email || 'usuario');
      btn.title = 'Cerrar sesión';
      btn.addEventListener('click', signOut);
      holder.appendChild(btn);
    } else {
      var btn2 = document.createElement('button');
      btn2.type = 'button';
      btn2.className = 'auth-btn';
      btn2.textContent = 'Iniciar sesión';
      btn2.addEventListener('click', openLoginModal);
      holder.appendChild(btn2);
    }

    var tag = document.createElement('div');
    tag.className = 'auth-mode';
    tag.textContent = session && session.access_token ? 'Datos en la nube' : 'Datos locales (offline)';
    holder.appendChild(tag);
  }

  function openLoginModal() {
    var ov = document.getElementById('authOverlay');
    if (!ov) return;
    ov.classList.add('open');
    var emailEl = document.getElementById('authEmail');
    var passEl = document.getElementById('authPass');
    var msg = document.getElementById('authMsg');
    msg.textContent = '';
    if (emailEl) emailEl.value = '';
    if (passEl) passEl.value = '';
    if (emailEl) emailEl.focus();
  }

  function closeModal() {
    var ov = document.getElementById('authOverlay');
    if (ov) ov.classList.remove('open');
  }

  function showMsg(text, ok) {
    var msg = document.getElementById('authMsg');
    if (msg) { msg.textContent = text; msg.className = ok ? 'ok' : 'err'; }
  }

  function buildModal() {
    if (document.getElementById('authOverlay')) return;
    var d = document.createElement('div');
    d.className = 'modal-overlay';
    d.id = 'authOverlay';
    d.innerHTML =
      '<div class="modal auth-modal" role="dialog" aria-modal="true">' +
        '<h2 id="authTitle">Iniciar sesión</h2>' +
        '<p id="authMsg" class="auth-msg"></p>' +
        '<label class="auth-label">Email<input type="email" id="authEmail" placeholder="tu@email.com" autocomplete="email"></label>' +
        '<label class="auth-label">Contraseña<input type="password" id="authPass" placeholder="••••••••" autocomplete="current-password"></label>' +
        '<div class="auth-row">' +
          '<button type="button" id="authLogin" class="auth-primary">Entrar</button>' +
          '<button type="button" id="authRegister" class="auth-secondary">Crear cuenta</button>' +
        '</div>' +
        '<div class="auth-social">' +
          '<span>o continúa con</span>' +
          '<button type="button" id="authGoogle">Google</button>' +
          '<button type="button" id="authGithub">GitHub</button>' +
        '</div>' +
        '<button type="button" id="authCancel" class="auth-cancel">Cerrar</button>' +
      '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) closeModal(); });

    function field() {
      return { email: document.getElementById('authEmail').value.trim(), password: document.getElementById('authPass').value };
    }
    document.getElementById('authCancel').addEventListener('click', closeModal);
    document.getElementById('authLogin').addEventListener('click', function () {
      var f = field();
      if (!f.email || !f.password) return showMsg('Ingresa email y contraseña.', false);
      document.getElementById('authLogin').disabled = true;
      showMsg('Entrando…', true);
      signIn(f.email, f.password).then(function (j) {
        if (j.access_token) { afterAuth(); }
        else showMsg((j.msg) || 'Revisa tu email para confirmar la cuenta.', false);
      }).catch(function (e) {
        showMsg(e.message, false);
        document.getElementById('authLogin').disabled = false;
      });
    });
    document.getElementById('authRegister').addEventListener('click', function () {
      var f = field();
      if (!f.email || !f.password) return showMsg('Ingresa email y contraseña.', false);
      if (f.password.length < 6) return showMsg('La contraseña debe tener al menos 6 caracteres.', false);
      document.getElementById('authRegister').disabled = true;
      signUp(f.email, f.password).then(function () {
        if (session && session.access_token) afterAuth();
        else showMsg('Cuenta creada. Revisa tu email para confirmar.', true);
      }).catch(function (e) {
        showMsg(e.message, false);
        document.getElementById('authRegister').disabled = false;
      });
    });
    document.getElementById('authGoogle').addEventListener('click', function () { signInWithProvider('google'); });
    document.getElementById('authGithub').addEventListener('click', function () { signInWithProvider('github'); });
  }

  // ---------- post-login: marcar backend y sembrar datos locales ----------
  function seedLocalOnFirstLogin() {
    return getBlob().then(function (map) {
      var hadAny = map && Object.keys(map).length > 0;
      if (hadAny) return;
      var todo = [];
      APP_KEYS.forEach(function (k) {
        var v = null;
        try { v = localStorage.getItem(k); } catch (e) {}
        if (v != null) todo.push(doApi('save', { key: k, value: v }, false));
      });
      return Promise.all(todo).then(function () { return true; });
    });
  }

  function afterAuth() {
    backendReady = true;
    invalidateCache();
    try { localStorage.setItem(LAST_USER_KEY, (session.user && session.user.email) || ''); } catch (e) {}
    seedLocalOnFirstLogin().then(function () { window.location.reload(); })
      .catch(function () { window.location.reload(); });
  }

  // ---------- init ----------
  function init() {
    if (!URL || !ANON || ANON.indexOf('TU_ANON') !== -1) {
      console.warn('Bitácora: configura supabase.config.js (URL + anon key) para activar cuentas.');
    }
    buildModal();
    buildUI();
    verifyAndSeed();
  }

  // Verifica el token y, si el backend está vacío, siembra los datos locales.
  function verifyAndSeed() {
    if (!session || !session.access_token) return;
    getBlob()
      .then(function (blob) {
        backendReady = true;
        if (!blob || Object.keys(blob).length === 0) {
          return seedLocalOnFirstLogin();
        }
        return null;
      })
      .catch(function () {
        // token caducado o sin conexión al backend -> modo local
        backendReady = false;
      });
  }

  // Procesar el hash de OAuth antes de que app.js lea datos
  var handledOAuth = setOAuthTokensFromHash();
  if (handledOAuth) backendReady = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exponer API para depuración/uso futuro
  window.BitacoraAuth = {
    isLoggedIn: function () { return !!(session && session.access_token); },
    getUser: function () { return session ? session.user : null; },
    backendReady: function () { return backendReady; },
  };
})();
