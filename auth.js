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

  // ---------- UI: gate de autenticación a pantalla completa ----------
  // Si no hay sesión, el usuario solo ve el gate (login/registro). El panel
  // (appShell) queda oculto hasta autenticarse.

  var GATE = { login: 'login', register: 'register' };
  var currentMode = GATE.login;

  function escHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showGate() {
    var gate = document.getElementById('authGate');
    var shell = document.getElementById('appShell');
    if (gate) gate.classList.remove('hidden');
    if (shell) shell.classList.add('hidden');
    setGateMode(currentMode);
    wireGate();
  }

  function showApp() {
    var gate = document.getElementById('authGate');
    var shell = document.getElementById('appShell');
    if (gate) gate.classList.add('hidden');
    if (shell) shell.classList.remove('hidden');
    renderAccountPanel();
  }

  function setGateMode(mode) {
    currentMode = mode;
    var loginTab = document.getElementById('authTabLogin');
    var regTab = document.getElementById('authTabRegister');
    var confirmLabel = document.querySelector('.auth-label-confirm');
    var submit = document.getElementById('authSubmit');
    var msg = document.getElementById('authMsg');

    if (loginTab) loginTab.classList.toggle('active', mode === GATE.login);
    if (regTab) regTab.classList.toggle('active', mode === GATE.register);
    if (loginTab) loginTab.setAttribute('aria-selected', mode === GATE.login ? 'true' : 'false');
    if (regTab) regTab.setAttribute('aria-selected', mode === GATE.register ? 'true' : 'false');
    if (confirmLabel) confirmLabel.style.display = mode === GATE.register ? '' : 'none';
    if (submit) submit.textContent = mode === GATE.register ? 'Crear cuenta' : 'Entrar';
    if (msg) { msg.textContent = ''; msg.className = 'auth-msg'; }

    var pass2 = document.getElementById('authPass2');
    if (pass2) pass2.value = '';
  }

  function gateField() {
    var e = document.getElementById('authEmail');
    var p = document.getElementById('authPass');
    var p2 = document.getElementById('authPass2');
    return {
      email: e ? e.value.trim() : '',
      password: p ? p.value : '',
      password2: p2 ? p2.value : '',
    };
  }

  function gateMessage(text, ok) {
    var msg = document.getElementById('authMsg');
    if (msg) { msg.textContent = text; msg.className = ok ? 'ok' : 'err'; }
  }

  function wireGate() {
    var loginTab = document.getElementById('authTabLogin');
    var regTab = document.getElementById('authTabRegister');
    var submit = document.getElementById('authSubmit');
    var googleBtn = document.getElementById('authGoogle');
    var githubBtn = document.getElementById('authGithub');

    if (loginTab) loginTab.addEventListener('click', function () { setGateMode(GATE.login); });
    if (regTab) regTab.addEventListener('click', function () { setGateMode(GATE.register); });

    if (submit) submit.addEventListener('click', handleSubmit);

    var pass = document.getElementById('authPass');
    var pass2 = document.getElementById('authPass2');
    if (pass) pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
    if (pass2) pass2.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });

    if (googleBtn) googleBtn.addEventListener('click', function () { signInWithProvider('google'); });
    if (githubBtn) githubBtn.addEventListener('click', function () { signInWithProvider('github'); });
  }

  function handleSubmit() {
    var submit = document.getElementById('authSubmit');
    var f = gateField();
    if (!f.email || !f.password) return gateMessage('Ingresa tu correo y contraseña.', false);

    function disable(on) { if (submit) submit.disabled = on; }

    if (currentMode === GATE.login) {
      disable(true);
      gateMessage('Entrando…', true);
      signIn(f.email, f.password).then(function (j) {
        if (j.access_token) afterAuth();
        else gateMessage((j.msg) || 'Revisa tu email para confirmar la cuenta.', false);
        disable(false);
      }).catch(function (e) { gateMessage(e.message, false); disable(false); });
    } else {
      if (f.password.length < 6) return gateMessage('La contraseña debe tener al menos 6 caracteres.', false);
      if (f.password !== f.password2) return gateMessage('Las contraseñas no coinciden.', false);
      disable(true);
      gateMessage('Creando tu cuenta…', true);
      signUp(f.email, f.password).then(function (j) {
        if (session && session.access_token) afterAuth();
        else gateMessage('Cuenta creada. Revisa tu email para confirmar.', true);
        disable(false);
      }).catch(function (e) { gateMessage(e.message, false); disable(false); });
    }
  }

  // ---------- UI: pestaña "Cuenta" del panel (solo con sesión) ----------
  function renderAccountPanel() {
    var state = document.getElementById('authState');
    var sUser = document.getElementById('sidebarUser');
    if (!state) return;
    if (!session || !session.access_token) {
      state.innerHTML = '';
      if (sUser) sUser.innerHTML = '';
      return;
    }
    var email = (session.user && session.user.email) || 'usuario';
    state.innerHTML =
      '<div class="auth-account">' +
        '<div class="auth-account-email">' + escHTML(email) + '</div>' +
        '<div class="auth-account-mode">Datos en la nube</div>' +
        '<button type="button" id="authLogout" class="auth-logout">Cerrar sesión</button>' +
      '</div>';
    var logout = document.getElementById('authLogout');
    if (logout) logout.addEventListener('click', signOut);
    if (sUser) {
      var initial = (email && email.charAt(0)) ? email.charAt(0).toUpperCase() : '?';
      sUser.innerHTML =
        '<div class="side-user">' +
          '<span class="side-user-avatar">' + escHTML(initial) + '</span>' +
          '<span class="side-user-email">' + escHTML(email) + '</span>' +
        '</div>';
    }
  }

  // ---------- post-login: marcar backend y sembrar datos locales ----------
  function storageKeyForUser(key) {
    if (!session || !session.user || !session.user.id) return key;
    return 'bitacora:user:' + session.user.id + ':' + key;
  }

  function readLocalValue(key) {
    var candidates = [key, storageKeyForUser(key)];
    for (var i = 0; i < candidates.length; i++) {
      try {
        var value = localStorage.getItem(candidates[i]);
        if (value != null) return value;
      } catch (e) {}
    }
    return null;
  }

  function seedLocalOnFirstLogin() {
    return getBlob().then(function (map) {
      var hadAny = map && Object.keys(map).length > 0;
      if (hadAny) return;
      var todo = [];
      APP_KEYS.forEach(function (k) {
        var v = readLocalValue(k);
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
    if (session && session.access_token) {
      showApp();
      renderAccountPanel();
      verifyAndSeed();
    } else {
      showGate();
    }
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
    renderPanel: function () { renderAccountPanel(); },
  };
})();
