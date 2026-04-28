/**
 * =====================================================
 *  CRUZ ROJA GAMES — app.js
 *
 *  Todo el estado relevante se guarda en localStorage:
 *    cr-theme          → 'light' | 'dark'
 *    cr-game-N-name    → nombre del juego N
 *    cr-game-N-enabled → 'true' | 'false'
 *    cr-admin-locked   → 'true' (bloqueo permanente)
 * =====================================================
 */

/* ═══════════════════════════════════════════════════
   CONFIGURACIÓN BASE DE JUEGOS
   Los valores reales se leen de localStorage al arrancar.
   ═══════════════════════════════════════════════════ */
var GAME_CONFIG = {
  1: { path: 'games/game1/index.html', enabled: false, label: 'Misión 1' },
  2: { path: 'games/game2/index.html', enabled: false, label: 'Misión 2' },
  3: { path: 'games/game3/index.html', enabled: false, label: 'Misión 3' },
};

/* ── Cargar estado persistente ── */
function loadPersistedConfig() {
  [1, 2, 3].forEach(function (n) {
    var savedName    = localStorage.getItem('cr-game-' + n + '-name');
    var savedEnabled = localStorage.getItem('cr-game-' + n + '-enabled');

    if (savedName)    GAME_CONFIG[n].label   = savedName;
    if (savedEnabled) GAME_CONFIG[n].enabled = savedEnabled === 'true';
  });
}

/* ── Guardar todo el estado al localStorage ── */
function persistConfig() {
  [1, 2, 3].forEach(function (n) {
    localStorage.setItem('cr-game-' + n + '-name',    GAME_CONFIG[n].label);
    localStorage.setItem('cr-game-' + n + '-enabled', GAME_CONFIG[n].enabled ? 'true' : 'false');
  });
}

/* ── Estado en memoria ── */
var state = {
  currentGame:    0,
  gamesCompleted: [],
  adminOpen:      false,
  adminLocked:    localStorage.getItem('cr-admin-locked') === 'true',
  previewMode:    false,
  logoClicks:     0,
  logoClickTimer: null,
};

/* Cargar configuración guardada antes de hacer cualquier cosa */
loadPersistedConfig();

/* ═══════════════════════════════════════════════════
   TEMA CLARO / OSCURO
   ═══════════════════════════════════════════════════ */
var htmlEl      = document.documentElement;
var themeToggle = document.getElementById('theme-toggle');
var savedTheme  = localStorage.getItem('cr-theme') || 'light';
htmlEl.setAttribute('data-theme', savedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', function () {
    var next = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', next);
    localStorage.setItem('cr-theme', next);
  });
}

/* ═══════════════════════════════════════════════════
   SPLASH
   ═══════════════════════════════════════════════════ */
(function initSplash() {
  var splash = document.getElementById('splash');
  var cross  = document.getElementById('splash-cross');
  var name   = document.getElementById('splash-name');

  document.body.style.overflow = 'hidden';

  requestAnimationFrame(function () {
    cross.classList.add('in');
    setTimeout(function () { name.classList.add('in'); }, 280);
  });

  setTimeout(function () {
    splash.classList.add('exit');
    setTimeout(function () {
      splash.remove();
      document.body.style.overflow = '';
      animateMenuIn();
    }, 500);
  }, 1650);
})();

function animateMenuIn() {
  ['title-wrap', 'progress-wrap', 'play-btn', 'play-hint'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('in');
  });
  updateProgressUI();
}

/* ═══════════════════════════════════════════════════
   CANVAS DE PARTÍCULAS
   ═══════════════════════════════════════════════════ */
(function initCanvas() {
  var canvas = document.getElementById('canvas-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H;

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  var particles = [];
  for (var i = 0; i < 50; i++) particles.push(makeP());

  function makeP() {
    return {
      x: Math.random() * (W || window.innerWidth),
      y: Math.random() * (H || window.innerHeight),
      r: Math.random() * 1.4 + 0.3,
      vy: -(Math.random() * 0.28 + 0.06),
      vx: (Math.random() - 0.5) * 0.12,
      a: Math.random() * 0.5 + 0.08,
      cross: Math.random() < 0.06,
      cs: Math.random() * 4 + 3,
    };
  }

  function drawCross(x, y, s, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#EE3224';
    var u = s / 3;
    ctx.fillRect(x - u, y - u * 1.5, u * 2, u);
    ctx.fillRect(x - u * 1.5, y - u / 2, u * 3, u);
    ctx.fillRect(x - u, y + u / 2, u * 2, u);
    ctx.restore();
  }

  (function loop() {
    ctx.clearRect(0, 0, W, H);
    var isDark = htmlEl.getAttribute('data-theme') === 'dark';
    particles.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -20) { Object.assign(p, makeP()); p.y = H + 10; }
      if (p.cross) { drawCross(p.x, p.y, p.cs, p.a * (isDark ? 1 : 0.35)); }
      else {
        ctx.save();
        ctx.globalAlpha = p.a * (isDark ? 1 : 0.22);
        ctx.fillStyle = Math.random() < 0.3
          ? '#EE3224'
          : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.35)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
    requestAnimationFrame(loop);
  })();
})();

/* ═══════════════════════════════════════════════════
   PROGRESO UI
   Usa GAME_CONFIG[n].label para los nombres
   ═══════════════════════════════════════════════════ */
function updateProgressUI() {
  [1, 2, 3].forEach(function (n) {
    var step      = document.getElementById('step-' + n);
    var labelEl   = step && step.querySelector('.step-label');
    if (!step) return;

    /* Actualizar nombre desde config */
    if (labelEl) labelEl.textContent = GAME_CONFIG[n].label;

    step.classList.remove('done', 'active');
    if (state.gamesCompleted.indexOf(n) !== -1) { step.classList.add('done'); }
    else if (n === getNextGame()) { step.classList.add('active'); }
  });

  [1, 2].forEach(function (n) {
    var line = document.getElementById('line-' + n);
    if (line) line.classList.toggle('done', state.gamesCompleted.indexOf(n) !== -1);
  });

  var playText = document.getElementById('play-text');
  var playHint = document.getElementById('play-hint');
  var next     = getNextGame();
  if (!playText) return;

  if (next === null) {
    playText.textContent = '¡JUGAR!';
    if (playHint) playHint.textContent = 'Misión completa · Juega de nuevo';
  } else if (state.gamesCompleted.length === 0) {
    playText.textContent = '¡JUGAR!';
    if (playHint) playHint.textContent = 'Presiona para comenzar tu misión';
  } else {
    playText.textContent = 'CONTINUAR';
    if (playHint) playHint.textContent = 'Continúa con: ' + GAME_CONFIG[next].label;
  }
}

function getNextGame() {
  for (var n = 1; n <= 3; n++) {
    if (state.gamesCompleted.indexOf(n) === -1) return n;
  }
  return null;
}

/* ═══════════════════════════════════════════════════
   BOTÓN PLAY
   ═══════════════════════════════════════════════════ */
var btnPlay = document.getElementById('btn-play');
if (btnPlay) {
  btnPlay.addEventListener('click', function () {
    var next = getNextGame();
    if (next === null) { state.gamesCompleted = []; updateProgressUI(); return; }
    launchGame(next);
  });
}

function launchGame(gameId) {
  var cfg = GAME_CONFIG[gameId];
  if (!cfg) return;
  if (!cfg.enabled) {
    showToast('¡Esta misión estará lista muy pronto! 🚀');
    return;
  }

  state.currentGame = gameId;

  var labelEl = document.getElementById('current-game-label');
  if (labelEl) labelEl.textContent = cfg.label;

  var overlay = document.getElementById('game-overlay');
  var loader  = document.getElementById('game-loader');
  var iframe  = document.getElementById('game-iframe');

  overlay.classList.add('active');
  loader.style.display = 'flex';
  iframe.style.display = 'none';
  iframe.src = cfg.path;

  iframe.onload = function () {
    setTimeout(function () {
      loader.style.display = 'none';
      iframe.style.display = 'block';
    }, 350);
  };
  iframe.onerror = function () {
    showToast('⚠️ Error al cargar la misión. Revisa la carpeta.');
    closeGame();
  };
}

/* Salir del juego */
var btnExit = document.getElementById('btn-exit-game');
if (btnExit) btnExit.addEventListener('click', closeGame);

function closeGame() {
  var overlay = document.getElementById('game-overlay');
  var iframe  = document.getElementById('game-iframe');
  overlay.classList.remove('active');
  setTimeout(function () { iframe.src = ''; }, 400);
  state.currentGame = 0;
}

/* postMessage desde el juego */
window.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.type === 'game-complete') handleGameComplete(d.gameId || state.currentGame);
  if (d.type === 'back-to-menu')  closeGame();
});

function handleGameComplete(gameId) {
  gameId = parseInt(gameId, 10);
  if (state.gamesCompleted.indexOf(gameId) === -1) state.gamesCompleted.push(gameId);
  closeGame();
  var next = getNextGame();
  if (next === null) { setTimeout(showCongrats, 500); }
  else { updateProgressUI(); setTimeout(function () { launchGame(next); }, 1200); }
}

/* ═══════════════════════════════════════════════════
   FELICITACIÓN
   ═══════════════════════════════════════════════════ */
function showCongrats() {
  var s = document.getElementById('congrats-screen');
  if (s) s.classList.add('active');
  updateProgressUI();
  launchConfetti();
}

var btnRestart = document.getElementById('btn-restart');
if (btnRestart) {
  btnRestart.addEventListener('click', function () {
    document.getElementById('congrats-screen').classList.remove('active');
    state.gamesCompleted = [];
    updateProgressUI();
  });
}

/* Click en pasos de progreso para cambiar de juego */
[1, 2, 3].forEach(function (n) {
  var step = document.getElementById('step-' + n);
  if (step) {
    step.addEventListener('click', function () {
      launchGame(n);
    });
  }
});

function launchConfetti() {
  var colors = ['#EE3224', '#FF5444', '#FFFFFF', '#FFD700', '#FF8A80'];
  for (var i = 0; i < 65; i++) {
    (function (delay) {
      setTimeout(function () {
        var el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left             = Math.random() * 100 + 'vw';
        el.style.background       = colors[Math.floor(Math.random() * colors.length)];
        el.style.width            = (Math.random() * 8 + 5) + 'px';
        el.style.height           = (Math.random() * 8 + 5) + 'px';
        el.style.borderRadius     = Math.random() > 0.5 ? '50%' : '2px';
        el.style.animationDuration = (Math.random() * 2.5 + 1.5) + 's';
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 4500);
      }, delay);
    })(i * 48);
  }
}

/* ═══════════════════════════════════════════════════
   PANEL DE ADMINISTRADOR
   - Botón VISIBLE "⚙️ Admin" en la barra superior
   - Acceso SECRETO de respaldo: 5 clics en el logo
   - Una vez finalizado: ambos accesos desaparecen
   ═══════════════════════════════════════════════════ */

/* Si ya estaba bloqueado desde sesión anterior: quitar el botón */
if (state.adminLocked) {
  var _ab = document.getElementById('admin-btn');
  if (_ab) _ab.remove();
}

/* Botón visible de admin */
var adminBtn = document.getElementById('admin-btn');
if (adminBtn) {
  adminBtn.addEventListener('click', openAdmin);
}

/* Acceso oculto de respaldo: 5 clics en el logo */
var logoBtn = document.getElementById('logo-btn');
if (logoBtn) {
  logoBtn.addEventListener('click', function () {
    if (state.adminLocked) return;
    state.logoClicks++;
    clearTimeout(state.logoClickTimer);
    if (state.logoClicks >= 5) {
      state.logoClicks = 0;
      openAdmin();
    } else {
      state.logoClickTimer = setTimeout(function () { state.logoClicks = 0; }, 2200);
    }
  });
}


function openAdmin() {
  if (state.adminLocked) return;
  var panel = document.getElementById('admin-panel');
  if (!panel) return;
  panel.classList.add('active');
  state.adminOpen = true;
  syncAdminToggles();   /* sincroniza toggles Y campos de nombre */
  checkGameFiles();
}

function closeAdmin() {
  var panel = document.getElementById('admin-panel');
  if (panel) panel.classList.remove('active');
  state.adminOpen = false;
}

/* Botón ✕ */
var btnCloseAdmin = document.getElementById('btn-close-admin');
if (btnCloseAdmin) btnCloseAdmin.addEventListener('click', closeAdmin);

/* Click en fondo */
var adminPanel = document.getElementById('admin-panel');
if (adminPanel) {
  adminPanel.addEventListener('click', function (e) {
    if (e.target === adminPanel) closeAdmin();
  });
}

/* ═══════════════════════════════════════════════════
   CAMPOS DE NOMBRE EDITABLE
   ═══════════════════════════════════════════════════ */
document.querySelectorAll('.agr-name-input').forEach(function (input) {
  var gameId = parseInt(input.dataset.game, 10);

  /* Al escribir: actualizar config en memoria + labels del menú */
  input.addEventListener('input', function () {
    var val = input.value.trim();
    GAME_CONFIG[gameId].label = val || ('Misión ' + gameId);
    updateProgressUI();               /* refleja cambio en tiempo real */
  });

  /* Al salir del campo: guardar en localStorage */
  input.addEventListener('blur', function () {
    var val = input.value.trim();
    GAME_CONFIG[gameId].label = val || ('Misión ' + gameId);
    persistConfig();                  /* guarda permanentemente */
  });

  /* Enter también guarda */
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { input.blur(); }
  });
});

/* ═══════════════════════════════════════════════════
   TOGGLES DE ACTIVACIÓN
   ═══════════════════════════════════════════════════ */
document.querySelectorAll('.agr-toggle input[type="checkbox"]').forEach(function (chk) {
  chk.addEventListener('change', function () {
    var gid = parseInt(chk.dataset.game, 10);
    GAME_CONFIG[gid].enabled = chk.checked;

    var row = document.getElementById('admin-row-' + gid);
    if (row) row.classList.toggle('row-active', chk.checked);

    persistConfig();   /* guardar cambio */
    updateDoneButton();
  });
});

/* Sincronizar UI del admin (toggles + inputs de nombre) con config actual */
function syncAdminToggles() {
  [1, 2, 3].forEach(function (n) {
    /* Toggle */
    var chk = document.getElementById('toggle-' + n);
    if (chk) {
      chk.checked = GAME_CONFIG[n].enabled;
      var row = document.getElementById('admin-row-' + n);
      if (row) row.classList.toggle('row-active', chk.checked);
    }

    /* Campo de nombre */
    var inp = document.getElementById('name-input-' + n);
    if (inp && GAME_CONFIG[n].label !== 'Misión ' + n) {
      inp.value = GAME_CONFIG[n].label;
    }
  });
  updateDoneButton();
}

/* Habilitar botón "Terminado" cuando los 3 estén activos */
function updateDoneButton() {
  var allEnabled = GAME_CONFIG[1].enabled && GAME_CONFIG[2].enabled && GAME_CONFIG[3].enabled;
  var btn  = document.getElementById('btn-admin-done');
  var hint = document.getElementById('admin-done-hint');
  if (!btn) return;

  btn.disabled = !allEnabled;
  if (hint) {
    hint.textContent = allEnabled
      ? '¡Todo listo! Previsualiza antes de finalizar.'
      : 'Activa los 3 juegos para habilitar este botón.';
  }
}

/* ═══════════════════════════════════════════════════
   VERIFICAR ARCHIVOS (fetch HEAD)
   ═══════════════════════════════════════════════════ */
function checkGameFiles() {
  [1, 2, 3].forEach(function (n) {
    var dot  = document.getElementById('dot-' + n);
    var text = document.getElementById('status-text-' + n);
    if (!dot || !text) return;

    fetch(GAME_CONFIG[n].path, { method: 'HEAD' })
      .then(function (r) {
        if (r.ok) {
          dot.className    = 'status-dot ok';
          text.textContent = 'Instalado ✓';
          text.style.color = '#4CAF50';
        } else {
          dot.className    = 'status-dot warn';
          text.textContent = 'No encontrado';
          text.style.color = '#FFC107';
        }
      })
      .catch(function () {
        dot.style.background = '#888';
        text.textContent     = 'Verifica la carpeta';
        text.style.color     = 'var(--text3)';
      });
  });
}

/* ── Botón "Terminado — Previsualizar" ── */
var btnAdminDone = document.getElementById('btn-admin-done');
if (btnAdminDone) {
  btnAdminDone.addEventListener('click', function () {
    /* Guardar cualquier campo de nombre que no haya perdido el foco */
    [1, 2, 3].forEach(function (n) {
      var inp = document.getElementById('name-input-' + n);
      if (inp) {
        var val = inp.value.trim();
        GAME_CONFIG[n].label = val || ('Misión ' + n);
      }
    });
    persistConfig();
    updateProgressUI();
    closeAdmin();
    enterPreviewMode();
  });
}

/* ═══════════════════════════════════════════════════
   MODO PREVISUALIZACIÓN
   ═══════════════════════════════════════════════════ */
function enterPreviewMode() {
  state.previewMode = true;
  var bar = document.getElementById('preview-bar');
  if (bar) bar.classList.add('active');
  showToast('👁 Previsualización — así verán el menú los niños');
}

function exitPreviewMode() {
  state.previewMode = false;
  var bar = document.getElementById('preview-bar');
  if (bar) bar.classList.remove('active');
}

var btnPreviewBack = document.getElementById('btn-preview-back');
if (btnPreviewBack) {
  btnPreviewBack.addEventListener('click', function () {
    exitPreviewMode();
    setTimeout(openAdmin, 200);
  });
}

var btnPreviewFinish = document.getElementById('btn-preview-finish');
if (btnPreviewFinish) {
  btnPreviewFinish.addEventListener('click', function () {
    var modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.add('active');
  });
}

/* ═══════════════════════════════════════════════════
   MODAL DE CONFIRMACIÓN FINAL — BLOQUEO PERMANENTE
   ═══════════════════════════════════════════════════ */
var btnConfirmCancel = document.getElementById('btn-confirm-cancel');
if (btnConfirmCancel) {
  btnConfirmCancel.addEventListener('click', function () {
    document.getElementById('confirm-modal').classList.remove('active');
  });
}

var btnConfirmOk = document.getElementById('btn-confirm-ok');
if (btnConfirmOk) {
  btnConfirmOk.addEventListener('click', lockAdminForever);
}

function lockAdminForever() {
  /* 1. Guardar estado final en localStorage */
  persistConfig();
  localStorage.setItem('cr-admin-locked', 'true');
  state.adminLocked = true;

  /* 2. Cerrar modales */
  var modal = document.getElementById('confirm-modal');
  if (modal) modal.classList.remove('active');
  exitPreviewMode();

  /* 3. Eliminar el botón de admin visible PARA SIEMPRE */
  var adminBtnEl = document.getElementById('admin-btn');
  if (adminBtnEl) adminBtnEl.remove();

  /* 4. Desactivar el logo como trigger oculto */
  var logo = document.getElementById('logo-btn');
  if (logo) logo.style.pointerEvents = 'none';

  /* 5. Eliminar el panel del DOM para siempre */
  var panel = document.getElementById('admin-panel');
  if (panel) panel.remove();

  showToast('🔒 Panel eliminado. ¡El menú está listo para los niños! 🎉');
  updateProgressUI();
}

/* Click en fondo del modal de confirmación */
var confirmModal = document.getElementById('confirm-modal');
if (confirmModal) {
  confirmModal.addEventListener('click', function (e) {
    if (e.target === confirmModal) confirmModal.classList.remove('active');
  });
}

/* ═══════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════ */
function showToast(msg) {
  document.querySelectorAll('.cr-toast').forEach(function (t) { t.remove(); });

  var isDark    = htmlEl.getAttribute('data-theme') === 'dark';
  var bg        = isDark ? 'rgba(20,0,0,0.97)' : 'rgba(255,255,255,0.97)';
  var textColor = isDark ? '#fff' : '#111';

  var toast = document.createElement('div');
  toast.className   = 'cr-toast';
  toast.textContent = msg;
  toast.style.cssText = [
    'position:fixed',
    'bottom:80px',
    'left:50%',
    'transform:translateX(-50%) translateY(70px)',
    'background:' + bg,
    'border:1px solid rgba(238,50,36,0.4)',
    'color:' + textColor,
    'font-family:Nunito,sans-serif',
    'font-size:0.87rem',
    'font-weight:700',
    'padding:13px 28px',
    'border-radius:100px',
    'z-index:10000',
    'box-shadow:0 8px 32px rgba(0,0,0,0.2),0 0 20px rgba(238,50,36,0.1)',
    'transition:transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
    'white-space:nowrap',
    'pointer-events:none',
  ].join(';');

  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(function () {
    toast.style.transform = 'translateX(-50%) translateY(70px)';
    setTimeout(function () { toast.remove(); }, 450);
  }, 3200);
}
