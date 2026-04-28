/* ================= script.js VERSIÓN FINAL - CON PANTALLA DE JUEGO TERMINADO FUNCIONAL ================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  push,
  set,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHVuYAt6FN0UfhfaitRsZ0JST_DFNm7W8",
  authDomain: "mexicanos-volcan.firebaseapp.com",
  databaseURL: "https://mexicanos-volcan-default-rtdb.firebaseio.com",
  projectId: "mexicanos-volcan",
  storageBucket: "mexicanos-volcan.appspot.com",
  messagingSenderId: "53156079573",
  appId: "1:53156079573:web:adc8e510fb4062ab593f5c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
console.log("🔥 Firebase inicializado correctamente");

let jugadoresGlobal = {};
let turno = { equipo: 1, jugadorId: null };
let pausado = false;
let ultimoJugadorTurno = null;
let scores = { 1: 0, 2: 0 };
let scoresGlobal = { 1: 0, 2: 0 };
let erroresPorEquipo = { 1: 0, 2: 0 };
let respuestasMostradas = [];
let ultimoReset = null;
let estadoJugador = "activo";
let cooldown = false;
let miId = sessionStorage.getItem("jugadorId");
let faseActual = "esperando";
let tabInstanceId = null;
const TAB_CLAIM_EXPIRY_MS = 10000;

let estadoJuegoCache = null;
let juegoTerminadoPermanente = false;

let startScreen, playerScreen, gameOverScreen, blockedModal, expulsadoModal, rondaTransicionScreen, gameWrapper, rondaAnuncioModal, rondaAnuncioTexto, btnCerrarAnuncioRonda;
let btnStart, btnJoin, btnEnviar, btnNext, btnRegresarInicio, currentTurnBadge, currentTurnPlayerName;
let inputRespuesta, turnoTxt, questionText, globalScoreEl, inputLabel;
let answers, errorsWrap, errorXs, score1, score2, gameOverText;
let celebracionOverlay, celebracionTitulo, celebracionEquipo, celebracionPuntos, btnCelebrarContinuar, btnCelebrarSalir;
let gameOverFinalModal, gameOverFinalTitulo, gameOverFinalTexto, btnGameOverFinalSalir;

function normalizarCompleto(texto) {
  return texto.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()]/g, "")
    .trim();
}

function calcularSimilitud(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1;
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = [j];
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function actualizarTarjetaTurnoFijo() {
  const miEquipo = sessionStorage.getItem("equipo") || "?";
  const miNombre = jugadoresGlobal[miId]?.nombre || "Jugador";
  const turnoActualData = turno;
  
  if (!currentTurnBadge) return;
  
  if (!turnoActualData || !turnoActualData.equipo) {
    currentTurnBadge.innerHTML = `
      <div style="margin-bottom: 8px;">🎮 EQUIPO ${miEquipo}</div>
      <div style="margin-bottom: 8px;">👤 ${miNombre}</div>
      <div style="color: #ffcc00;">⏳ Esperando turno...</div>
    `;
    currentTurnBadge.classList.remove("hidden");
    return;
  }

  const esMiTurno = (turnoActualData.jugadorId === miId);
  const textoJugadorTurno = esMiTurno ? "🎯 ¡ES TU TURNO!" : `🎮 Turno: Equipo ${turnoActualData.equipo}`;
  const colorTurno = esMiTurno ? "#00ff80" : "#ffcc00";
  
  if (turnoActualData.jugadorId && jugadoresGlobal[turnoActualData.jugadorId]) {
    const jugadorTurno = jugadoresGlobal[turnoActualData.jugadorId];
    currentTurnBadge.innerHTML = `
      <div style="margin-bottom: 8px;">🎮 EQUIPO ${miEquipo}</div>
      <div style="margin-bottom: 8px;">👤 ${miNombre}</div>
      <div style="color: ${colorTurno}; font-size: 11px;">🎯 Turno: ${jugadorTurno.nombre} (Eq. ${turnoActualData.equipo})</div>
      <div style="color: ${colorTurno}; margin-top: 5px;">${textoJugadorTurno}</div>
    `;
  } else {
    currentTurnBadge.innerHTML = `
      <div style="margin-bottom: 8px;">🎮 EQUIPO ${miEquipo}</div>
      <div style="margin-bottom: 8px;">👤 ${miNombre}</div>
      <div style="color: ${colorTurno};">${textoJugadorTurno}</div>
    `;
  }
  currentTurnBadge.classList.remove("hidden");
}

function actualizarJuegoDesdeEstado(data) {
  if (!data) return;
  if (data.preguntaActual && questionText) questionText.textContent = data.preguntaActual;
  else if (questionText && !data.preguntaActual) questionText.textContent = "Esperando pregunta del presentador...";
  
  if (data.respuestasActuales && answers && answers.length) {
    data.respuestasActuales.forEach((resp, index) => {
      if (answers[index]) {
        answers[index].setAttribute("data-text", `${resp.texto} (${resp.puntos} pts)`);
        answers[index].dataset.puntos = resp.puntos;
        answers[index].dataset.claves = JSON.stringify(resp.claves || []);
        answers[index].dataset.textoOriginal = resp.texto;
      }
    });
  }
  
  if (data.respuestasReveladas && answers) {
    const reveladas = data.respuestasReveladas;
    answers.forEach((answer, index) => {
      if (reveladas[index]) answer.classList.add("revealed");
      else answer.classList.remove("revealed");
    });
  }
}

function verificarRespuestaContraActual(respuestaTexto) {
  if (!respuestaTexto || respuestaTexto.trim() === "") return { acierto: false, puntos: 0, index: -1 };
  
  const textoUsuario = normalizarCompleto(respuestaTexto);
  const palabrasUsuario = textoUsuario.split(/\s+/);
  
  if (textoUsuario.length < 3) {
    console.log(`❌ Respuesta demasiado corta: "${textoUsuario}" (mínimo 3 caracteres)`);
    return { acierto: false, puntos: 0, index: -1 };
  }
  
  console.log(`🔍 Validando: "${textoUsuario}"`);
  
  const respuestasActuales = [];
  if (answers) {
    answers.forEach((answer, idx) => {
      const clavesRaw = answer.dataset.claves;
      let claves = [];
      if (clavesRaw) {
        try { claves = JSON.parse(clavesRaw); } 
        catch(e) { console.warn(`Error parseando claves para respuesta ${idx}:`, e); }
      }
      const yaReveladaUI = answer.classList.contains("revealed");
      const yaReveladaFirebase = estadoJuegoCache?.respuestasReveladas?.[idx] === true;
      
      respuestasActuales[idx] = {
        texto: answer.dataset.textoOriginal || answer.getAttribute("data-text")?.split(" (")[0] || "",
        puntos: parseInt(answer.dataset.puntos) || 0,
        claves: claves.map(c => normalizarCompleto(c)),
        estaRevelada: yaReveladaUI || yaReveladaFirebase
      };
    });
  }
  
  function matchExactoPalabra(clavesRespuesta) {
    if (!clavesRespuesta || clavesRespuesta.length === 0) return false;
    for (const clave of clavesRespuesta) {
      if (clave.length < 3) continue;
      if (palabrasUsuario.includes(clave)) {
        console.log(`✅ Match exacto de palabra: "${clave}"`);
        return true;
      }
    }
    return false;
  }
  
  function matchFraseCompleta(clavesRespuesta) {
    for (const clave of clavesRespuesta) {
      if (clave.length < 3) continue;
      const palabrasClave = clave.split(/\s+/);
      if (palabrasClave.length > 1) {
        const todasPresentes = palabrasClave.every(palabraClave => {
          if (palabraClave.length < 3) return false;
          return palabrasUsuario.some(palabraUser => 
            palabraUser === palabraClave || palabraUser.includes(palabraClave)
          );
        });
        if (todasPresentes) {
          console.log(`✅ Match frase completa: "${clave}"`);
          return true;
        }
      }
    }
    return false;
  }
  
  function matchParcial(clavesRespuesta) {
    for (const clave of clavesRespuesta) {
      if (clave.length < 4) continue;
      for (const palabraUser of palabrasUsuario) {
        if (palabraUser.length < 3) continue;
        if (palabraUser.includes(clave) || clave.includes(palabraUser)) {
          const proporcion = Math.min(palabraUser.length, clave.length) / Math.max(palabraUser.length, clave.length);
          if (proporcion > 0.7) {
            console.log(`✅ Match parcial: "${palabraUser}" ~ "${clave}" (${Math.round(proporcion * 100)}%)`);
            return true;
          }
        }
      }
    }
    return false;
  }
  
  for (let i = 0; i < respuestasActuales.length; i++) {
    if (respuestasActuales[i].estaRevelada) continue;
    const resp = respuestasActuales[i];
    if (!resp || !resp.claves || resp.claves.length === 0) continue;
    
    if (matchExactoPalabra(resp.claves) || matchFraseCompleta(resp.claves) || matchParcial(resp.claves)) {
      return { acierto: true, puntos: resp.puntos, index: i, texto: resp.texto };
    }
  }
  
  console.log(`❌ No hay coincidencia para: "${respuestaTexto}"`);
  return { acierto: false, puntos: 0, index: -1 };
}

function actualizarScoresUI() {
  if (score1) score1.textContent = scores[1] ?? 0;
  if (score2) score2.textContent = scores[2] ?? 0;
  if (globalScoreEl) globalScoreEl.textContent = `🌍 GLOBAL: ${scoresGlobal[1] ?? 0} - ${scoresGlobal[2] ?? 0}`;
}

function pintarErroresUI(equipoConError) {
  if (!errorXs || errorXs.length === 0) return;
  const equipo = Number(equipoConError ?? jugadoresGlobal[miId]?.equipo);
  const e = equipo ? (erroresPorEquipo[equipo] ?? 0) : 0;
  errorXs.forEach((x, i) => { if (i < e) x.classList.add("active"); else x.classList.remove("active"); });
}

function actualizarTurnoConNombre() {
  if (!turnoTxt) return;
  if (turno.jugadorId && jugadoresGlobal && jugadoresGlobal[turno.jugadorId]) {
    const jugador = jugadoresGlobal[turno.jugadorId];
    turnoTxt.innerHTML = `🎯 TURNO DE: ${jugador.nombre}<br><span style="font-size: 10px; color: #ffcc00;">(EQUIPO ${turno.equipo})</span>`;
  } else {
    turnoTxt.innerHTML = `🎮 TURNO DEL EQUIPO ${turno.equipo}`;
  }
  actualizarTarjetaTurnoFijo();
}

function actualizarLabelDinamico() {
  if (!inputLabel) return;
  inputLabel.classList.remove("bloqueado", "expulsado");
  
  if (juegoTerminadoPermanente || estadoJuegoCache?.juegoTerminado === true) {
    inputLabel.textContent = "🏆 JUEGO TERMINADO - Gracias por participar";
    return;
  }
  
  if (estadoJuegoCache?.mensajePresentador) {
    inputLabel.textContent = `📢 ${estadoJuegoCache.mensajePresentador}`;
    return;
  }
  
  if (estadoJuegoCache?.mensajeFinalRonda) {
    inputLabel.textContent = estadoJuegoCache.mensajeFinalRonda;
    return;
  }

  if (estadoJugador === "expulsado") {
    inputLabel.textContent = "❌ HAS SIDO EXPULSADO";
    inputLabel.classList.add("expulsado");
    return;
  }
  
  const miEquipoNum = Number(jugadoresGlobal[miId]?.equipo);
  const erroresMiEquipo = erroresPorEquipo[miEquipoNum] || 0;
  
  if (erroresMiEquipo >= 3 && faseActual === "jugando") {
    inputLabel.textContent = "🚫 EQUIPO BLOQUEADO POR 3 ERRORES 🚫";
    inputLabel.classList.add("bloqueado");
    return;
  }
  
  if (faseActual === "jugando") {
    const turnoEquipoNum = Number(turno.equipo);
    const esMiTurnoDeEquipo = !turnoEquipoNum || turnoEquipoNum === miEquipoNum;
    if (esMiTurnoDeEquipo && !pausado) {
      const jugador = jugadoresGlobal[miId];
      if (turno.jugadorId === miId) {
        inputLabel.textContent = jugador ? `🎙️ ¡ES TU TURNO! Responde, ${jugador.nombre}` : "🎙️ ¡ES TU TURNO! Responde ahora";
      } else if (esMiTurnoDeEquipo) {
        inputLabel.textContent = `⏳ Turno de tu equipo, pero el presentador debe asignarte el turno a ti`;
      } else {
        inputLabel.textContent = `⏳ ESPERANDO - Turno del Equipo ${turnoEquipoNum}`;
      }
    } else {
      inputLabel.textContent = `⏳ ESPERANDO - Turno del Equipo ${turnoEquipoNum}`;
    }
  } else if (faseActual === "ronda") {
    inputLabel.textContent = "🔄 CAMBIANDO DE RONDA - Espera un momento...";
  } else if (faseActual === "final") {
    inputLabel.textContent = "🏁 RONDA TERMINADA - El presentador iniciará la siguiente";
  } else if (faseActual === "esperando") {
    inputLabel.textContent = "⏳ Esperando que el presentador inicie el juego...";
  } else if (pausado) {
    inputLabel.textContent = "⏸️ JUEGO PAUSADO - Espera instrucciones";
  } else {
    inputLabel.textContent = "👉 INTRODUCE TU RESPUESTA";
  }
}

function actualizarEstadoInputYBoton() {
  if (!inputRespuesta) return;
  inputRespuesta.classList.remove("turno-activo", "no-turno", "bloqueado");
  
  if (juegoTerminadoPermanente || estadoJuegoCache?.juegoTerminado === true) {
    inputRespuesta.disabled = true;
    inputRespuesta.placeholder = "🏆 JUEGO TERMINADO";
    if (btnEnviar) btnEnviar.disabled = true;
    return;
  }
  
  if (estadoJugador === "expulsado") {
    inputRespuesta.disabled = true;
    inputRespuesta.classList.add("bloqueado");
    inputRespuesta.placeholder = "❌ Expulsado";
    if (btnEnviar) btnEnviar.disabled = true;
    return;
  }
  
  const miEquipoNum = Number(jugadoresGlobal[miId]?.equipo);
  const erroresMiEquipo = erroresPorEquipo[miEquipoNum] || 0;
  
  if (erroresMiEquipo >= 3 && faseActual === "jugando") {
    inputRespuesta.disabled = true;
    inputRespuesta.classList.add("bloqueado");
    inputRespuesta.placeholder = "🚫 EQUIPO BLOQUEADO - ESPERANDO NUEVA RONDA";
    if (btnEnviar) btnEnviar.disabled = true;
    return;
  }
  
  if (faseActual === "esperando") {
    inputRespuesta.disabled = true;
    inputRespuesta.classList.add("no-turno");
    inputRespuesta.placeholder = "⏳ Esperando que inicie el juego...";
    if (btnEnviar) btnEnviar.disabled = true;
    return;
  }
  
  if (faseActual === "ronda") {
    inputRespuesta.disabled = true;
    inputRespuesta.classList.add("no-turno");
    inputRespuesta.placeholder = "🔄 Cambiando de ronda, espera...";
    if (btnEnviar) btnEnviar.disabled = true;
    return;
  }
  
  if (faseActual === "jugando" && !pausado) {
    const jugador = jugadoresGlobal[miId];
    if (!jugador) { inputRespuesta.disabled = true; if (btnEnviar) btnEnviar.disabled = true; return; }
    const miEquipoNum2 = Number(jugador.equipo);
    const turnoEquipoNum = Number(turno.equipo);
    const esMiTurno = (turnoEquipoNum === miEquipoNum2 && turno.jugadorId === miId);
    
    if (esMiTurno) {
      inputRespuesta.disabled = false;
      inputRespuesta.classList.add("turno-activo");
      inputRespuesta.placeholder = `⚡ ¡TU TURNO! Escribe tu respuesta - ${jugador.nombre}`;
      if (btnEnviar) btnEnviar.disabled = false;
    } else if (turnoEquipoNum === miEquipoNum2) {
      inputRespuesta.disabled = true;
      inputRespuesta.classList.add("no-turno");
      inputRespuesta.placeholder = `⏳ Turno de tu equipo, espera a que el presentador te asigne el turno`;
      if (btnEnviar) btnEnviar.disabled = true;
    } else {
      inputRespuesta.disabled = true;
      inputRespuesta.classList.add("no-turno");
      inputRespuesta.placeholder = `⏳ Esperando turno del Equipo ${turnoEquipoNum}`;
      if (btnEnviar) btnEnviar.disabled = true;
    }
    return;
  }
  
  inputRespuesta.disabled = true;
  inputRespuesta.classList.add("no-turno");
  inputRespuesta.placeholder = pausado ? "⏸️ Juego pausado" : "⏳ Esperando...";
  if (btnEnviar) btnEnviar.disabled = true;
}

function iniciarRondaUI() {
  respuestasMostradas = [];
  if (inputRespuesta) inputRespuesta.value = "";
  if (answers) answers.forEach(a => a.classList.remove("revealed"));
  actualizarTurnoConNombre();
  actualizarScoresUI();
  pintarErroresUI();
  actualizarEstadoInputYBoton();
  actualizarLabelDinamico();
}

function mostrarCelebracion(ganador, puntos, color) {
  console.log("🎉 MOSTRANDO CELEBRACIÓN - Ganador:", ganador, "Puntos:", puntos);
  
  if (!celebracionOverlay) {
    console.error("❌ celebracionOverlay no encontrado");
    return;
  }
  
  let textoGanador = "";
  let emoji = "";
  
  if (ganador === 1) {
    textoGanador = "EQUIPO VERDE";
    emoji = "🟢";
  } else if (ganador === 2) {
    textoGanador = "EQUIPO AZUL";
    emoji = "🔵";
  } else {
    textoGanador = "EMPATE";
    emoji = "🤝";
  }
  
  if (celebracionTitulo) celebracionTitulo.textContent = "🏆 ¡RONDA TERMINADA! 🏆";
  if (celebracionEquipo) {
    if (ganador === 0) {
      celebracionEquipo.textContent = `${emoji} ¡${textoGanador}! ${emoji}`;
      celebracionEquipo.style.color = "#ffcc00";
    } else {
      celebracionEquipo.textContent = `${emoji} ${textoGanador} GANA LA RONDA ${emoji}`;
      celebracionEquipo.style.color = color;
      celebracionEquipo.style.textShadow = `0 0 20px ${color}`;
    }
  }
  if (celebracionPuntos) celebracionPuntos.textContent = `📊 Puntuación de la ronda: ${puntos} puntos`;
  
  celebracionOverlay.classList.remove("hidden");
  if (gameWrapper) gameWrapper.classList.add("hidden");
  
  for (let i = 0; i < 100; i++) {
    crearConfeti();
  }
}

function ocultarCelebracion() {
  if (celebracionOverlay) celebracionOverlay.classList.add("hidden");
  if (gameWrapper && faseActual !== "final" && faseActual !== "ronda") gameWrapper.classList.remove("hidden");
}

function crearConfeti() {
  const confeti = document.createElement("div");
  confeti.className = "confeti";
  const colores = ["#ff0040", "#00ff80", "#00ffff", "#ffcc00", "#ff6600", "#ff00ff"];
  confeti.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
  confeti.style.left = Math.random() * 100 + "%";
  confeti.style.width = Math.random() * 10 + 5 + "px";
  confeti.style.height = Math.random() * 20 + 10 + "px";
  confeti.style.animationDuration = Math.random() * 2 + 2 + "s";
  confeti.style.animationDelay = Math.random() * 2 + "s";
  document.body.appendChild(confeti);
  
  setTimeout(() => {
    confeti.remove();
  }, 4000);
}

function mostrarFinalJuego(scoresGlobal) {
  const equipo1 = scoresGlobal?.[1] || 0;
  const equipo2 = scoresGlobal?.[2] || 0;

  let ganador = "";
  let titulo = "";
  
  if (equipo1 > equipo2) {
    ganador = "🏆 EQUIPO 1 (VERDE) GANA 🏆";
    titulo = "🏆 EQUIPO VERDE GANA!";
  } else if (equipo2 > equipo1) {
    ganador = "🏆 EQUIPO 2 (AZUL) GANA 🏆";
    titulo = "🏆 EQUIPO AZUL GANA!";
  } else {
    ganador = "🤝 ¡EMPATE! 🤝";
    titulo = "🤝 EMPATE 🤝";
  }

  if (gameOverFinalTitulo) gameOverFinalTitulo.textContent = titulo;
  if (gameOverFinalTexto) gameOverFinalTexto.innerHTML = `📊 Puntuación final:<br><br>🟢 Equipo 1: ${equipo1} puntos<br>🔵 Equipo 2: ${equipo2} puntos`;
  
  if (gameOverFinalModal) gameOverFinalModal.classList.remove("hidden");
  
  juegoTerminadoPermanente = true;
  
  if (inputRespuesta) inputRespuesta.disabled = true;
  if (btnEnviar) btnEnviar.disabled = true;
}

async function limpiarJuegoCompleto() {
  try {
    console.log("🔄 Limpiando juego completo y volviendo al inicio...");
    
    if (gameOverFinalModal) gameOverFinalModal.classList.add("hidden");
    
    if (miId) {
      await set(ref(db, "jugadores/" + miId), null);
      miId = null;
    }
    
    sessionStorage.removeItem("jugadorId");
    sessionStorage.removeItem("equipo");
    
    if (gameWrapper) gameWrapper.classList.add("hidden");
    if (startScreen) startScreen.classList.remove("hidden");
    if (playerScreen) playerScreen.classList.add("hidden");
    if (celebracionOverlay) celebracionOverlay.classList.add("hidden");
    if (rondaAnuncioModal) rondaAnuncioModal.classList.add("hidden");
    if (rondaTransicionScreen) rondaTransicionScreen.classList.add("hidden");
    
    juegoTerminadoPermanente = false;
    faseActual = "esperando";
    
    if (inputRespuesta) {
      inputRespuesta.value = "";
      inputRespuesta.disabled = false;
    }
    
    console.log("✅ Juego limpiado, usuario regresado al inicio");
    
  } catch (error) { 
    console.error("❌ Error al limpiar juego:", error); 
  }
}

window.registrarJugadorFirebase = function (jugador) {
  const jugadorRef = push(ref(db, "jugadores"));
  const jugadorId = jugadorRef.key;
  set(jugadorRef, { ...jugador, estado: "activo", id: jugadorId });
  sessionStorage.setItem("jugadorId", jugadorId);
  return jugadorId;
};

function configurarListenerEstadoJugador() {
  if (!miId) return;
  if (window.estadoJugadorListener) window.estadoJugadorListener();
  window.estadoJugadorListener = onValue(ref(db, "jugadores/" + miId), (snap) => {
    if (juegoTerminadoPermanente || estadoJuegoCache?.juegoTerminado === true) {
      console.log("📢 Juego terminado, ignorando cambios de estado");
      return;
    }
    
    if (!snap.exists()) {
      estadoJugador = "expulsado";
      if (expulsadoModal) expulsadoModal.classList.remove("hidden");
      if (blockedModal) blockedModal.classList.add("hidden");
      actualizarEstadoInputYBoton();
      actualizarLabelDinamico();
      return;
    }
    const data = snap.val();
    estadoJugador = data.estado === "expulsado" ? "expulsado" : "activo";
    if (data.equipo) sessionStorage.setItem("equipo", data.equipo);
    if (estadoJugador === "expulsado") {
      if (expulsadoModal) expulsadoModal.classList.remove("hidden");
      if (blockedModal) blockedModal.classList.add("hidden");
    } else {
      if (blockedModal) blockedModal.classList.add("hidden");
      if (expulsadoModal) expulsadoModal.classList.add("hidden");
    }
    actualizarEstadoInputYBoton();
    actualizarLabelDinamico();
    actualizarTarjetaTurnoFijo();
  });
}

function generarTabInstanceId() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }
function getPlayerTabClaimKey(jugadorId) { return `playerTab_${jugadorId}`; }
function reclamarTabActivo() { if (!miId || !tabInstanceId) return; localStorage.setItem(getPlayerTabClaimKey(miId), JSON.stringify({ tabId: tabInstanceId, updatedAt: Date.now() })); }
function limpiarReclamoTab() { if (!miId || !tabInstanceId) return; try { const stored = localStorage.getItem(getPlayerTabClaimKey(miId)); if (stored) { const parsed = JSON.parse(stored); if (parsed.tabId === tabInstanceId) localStorage.removeItem(getPlayerTabClaimKey(miId)); } } catch { localStorage.removeItem(getPlayerTabClaimKey(miId)); } }
function estaSesionDuplicada() { if (!miId || !tabInstanceId) return false; const stored = localStorage.getItem(getPlayerTabClaimKey(miId)); if (!stored) return false; try { const parsed = JSON.parse(stored); if (!parsed.tabId || parsed.tabId === tabInstanceId) return false; if (Date.now() - (parsed.updatedAt || 0) > TAB_CLAIM_EXPIRY_MS) return false; return true; } catch { return false; } }
function intentarRestaurarSesionJugador() { if (!miId) return false; if (estaSesionDuplicada()) { sessionStorage.removeItem("jugadorId"); sessionStorage.removeItem("equipo"); miId = null; return false; } reclamarTabActivo(); return true; }

function cambiarTurnoSiguienteJugador(equipo) {
  const equipoNum = Number(equipo);
  const jugadoresEquipo = Object.values(jugadoresGlobal).filter(j => Number(j.equipo) === equipoNum && j.estado === "activo");
  if (jugadoresEquipo.length === 0) return;
  if (!turno.jugadorId || !jugadoresEquipo.find(j => j.id === turno.jugadorId)) {
    update(ref(db, "estadoJuego"), { turno: { equipo: equipoNum, jugadorId: jugadoresEquipo[0].id } });
    return;
  }
  const indiceActual = jugadoresEquipo.findIndex(j => j.id === turno.jugadorId);
  const siguienteIndice = (indiceActual + 1) % jugadoresEquipo.length;
  update(ref(db, "estadoJuego"), { turno: { equipo: equipoNum, jugadorId: jugadoresEquipo[siguienteIndice].id } });
}

async function marcarErrorFirebase() {
  if (juegoTerminadoPermanente || estadoJuegoCache?.juegoTerminado === true) return;
  
  const miEquipo = Number(jugadoresGlobal[miId]?.equipo);
  if (!miEquipo) return;
  const otroEquipo = miEquipo === 1 ? 2 : 1;
  const optimista = (erroresPorEquipo[miEquipo] ?? 0) + 1;
  erroresPorEquipo[miEquipo] = optimista;
  pintarErroresUI(miEquipo);
  
  actualizarEstadoInputYBoton();
  actualizarLabelDinamico();
  
  const estadoRef = ref(db, "estadoJuego");
  let result;
  try {
    result = await runTransaction(estadoRef, (currentData) => {
      if (!currentData) return currentData;
      const currentErrores = Number(currentData.errores?.[miEquipo] ?? 0);
      if (currentErrores >= 3) return currentData;
      const newErrores = currentErrores + 1;
      let nuevoTurno = currentData.turno;
      if (newErrores >= 3) {
        const primerJugadorOtroEquipo = Object.values(jugadoresGlobal).find(j => Number(j.equipo) === otroEquipo && j.estado === "activo");
        nuevoTurno = { equipo: otroEquipo, jugadorId: primerJugadorOtroEquipo?.id ?? null };
      }
      return { ...currentData, errores: { ...(currentData.errores ?? {}), [miEquipo]: newErrores }, turno: nuevoTurno };
    });
  } catch (error) { erroresPorEquipo[miEquipo] = Math.max(0, optimista - 1); pintarErroresUI(miEquipo); return; }
  if (!result.committed) { erroresPorEquipo[miEquipo] = Math.max(0, optimista - 1); pintarErroresUI(miEquipo); return; }
  const estadoConfirmado = result.snapshot.val();
  const actual = Number(estadoConfirmado.errores?.[miEquipo] ?? 0);
  erroresPorEquipo[miEquipo] = actual;
  pintarErroresUI(miEquipo);
  
  actualizarEstadoInputYBoton();
  actualizarLabelDinamico();
  
  if (actual >= 3) cambiarTurnoSiguienteJugador(otroEquipo);
}

async function verificarRespuesta() {
  if (juegoTerminadoPermanente || estadoJuegoCache?.juegoTerminado === true) {
    alert("🏆 El juego ya terminó. Gracias por participar.");
    return;
  }
  if (estadoJugador === "expulsado") { alert("❌ Estás expulsado"); return; }
  if (cooldown) return;
  if (pausado) { alert("⏸️ Juego pausado"); return; }
  if (faseActual !== "jugando") { alert("⏳ El juego no ha iniciado."); return; }
  
  const miEquipo = jugadoresGlobal[miId]?.equipo;
  if (!miEquipo) { alert("⚠️ Tu jugador no está registrado correctamente."); return; }
  
  const erroresEquipo = erroresPorEquipo[miEquipo] || 0;
  if (erroresEquipo >= 3) {
    alert("🚫 Tu equipo ha cometido 3 errores. Espera la siguiente ronda.");
    return;
  }
  
  if (turno.equipo && Number(turno.equipo) !== Number(miEquipo)) { alert("⏳ No es el turno de tu equipo"); return; }
  if (turno.jugadorId && turno.jugadorId !== miId) { alert("⏳ No es tu turno, espera a que el presentador te seleccione"); return; }
  
  const textoOriginal = inputRespuesta.value.trim();
  if (!textoOriginal) { alert("✍️ Escribe una respuesta"); return; }
  
  inputRespuesta.value = "";
  cooldown = true;
  setTimeout(() => { cooldown = false; }, 1500);
  
  const resultado = verificarRespuestaContraActual(textoOriginal);
  
  if (!resultado.acierto) {
    inputRespuesta.style.background = "#ffe0e0";
    setTimeout(() => { if (inputRespuesta) inputRespuesta.style.background = ""; }, 600);
    marcarErrorFirebase();
    return;
  }
  
  inputRespuesta.disabled = true;
  if (btnEnviar) btnEnviar.disabled = true;
  
  const estadoRef = ref(db, "estadoJuego");
  let transactionResult;
  try {
    transactionResult = await runTransaction(estadoRef, (currentData) => {
      if (!currentData) return currentData;
      if (currentData.respuestasReveladas?.[resultado.index]) return;
      const reveladas = currentData.respuestasReveladas ?? {};
      const miEquipoNum = Number(miEquipo);
      const nuevoScore = (currentData.scores?.[miEquipoNum] ?? 0) + resultado.puntos;
      const nuevoGlobal = (currentData.scoresGlobal?.[miEquipoNum] ?? 0) + resultado.puntos;
      const jugadoresEquipo = Object.values(jugadoresGlobal).filter(j => Number(j.equipo) === miEquipoNum && j.estado === "activo");
      let siguienteJugadorId = miId;
      if (jugadoresEquipo.length > 1) {
        const idxActual = jugadoresEquipo.findIndex(j => j.id === miId);
        siguienteJugadorId = jugadoresEquipo[(idxActual + 1) % jugadoresEquipo.length].id;
      }
      return {
        ...currentData,
        respuestasReveladas: { ...reveladas, [resultado.index]: true },
        scores: { ...(currentData.scores ?? {}), [miEquipoNum]: nuevoScore },
        scoresGlobal: { ...(currentData.scoresGlobal ?? {}), [miEquipoNum]: nuevoGlobal },
        turno: { equipo: miEquipoNum, jugadorId: siguienteJugadorId }
      };
    });
  } catch (error) { actualizarEstadoInputYBoton(); return; }
  if (!transactionResult.committed) { actualizarEstadoInputYBoton(); return; }
  update(ref(db, `jugadores/${miId}`), { ultimaRespuesta: Date.now() }).catch(() => {});
  inputRespuesta.style.background = "#eaffea";
  setTimeout(() => { if (inputRespuesta) inputRespuesta.style.background = ""; }, 500);
  actualizarEstadoInputYBoton();
}

window.addEventListener("DOMContentLoaded", () => {
  startScreen = document.getElementById("startScreen");
  playerScreen = document.getElementById("playerScreen");
  gameOverScreen = document.getElementById("gameOverScreen");
  blockedModal = document.getElementById("blockedModal");
  expulsadoModal = document.getElementById("expulsadoModal");
  rondaTransicionScreen = document.getElementById("rondaTransicionScreen");
  gameWrapper = document.querySelector(".game-wrapper");
  rondaAnuncioModal = document.getElementById("rondaAnuncioModal");
  rondaAnuncioTexto = document.getElementById("rondaAnuncioTexto");
  btnCerrarAnuncioRonda = document.getElementById("btnCerrarAnuncioRonda");
  celebracionOverlay = document.getElementById("celebracionOverlay");
  celebracionTitulo = document.getElementById("celebracionTitulo");
  celebracionEquipo = document.getElementById("celebracionEquipo");
  celebracionPuntos = document.getElementById("celebracionPuntos");
  btnCelebrarContinuar = document.getElementById("btnCelebrarContinuar");
  btnCelebrarSalir = document.getElementById("btnCelebrarSalir");
  gameOverFinalModal = document.getElementById("gameOverFinalModal");
  gameOverFinalTitulo = document.getElementById("gameOverFinalTitulo");
  gameOverFinalTexto = document.getElementById("gameOverFinalTexto");
  btnGameOverFinalSalir = document.getElementById("btnGameOverFinalSalir");
  
  btnStart = document.getElementById("btnStart");
  btnJoin = document.getElementById("btnJoin");
  btnEnviar = document.getElementById("btnEnviar");
  btnNext = document.getElementById("btnNext");
  btnRegresarInicio = document.getElementById("btnRegresarInicio");
  currentTurnBadge = document.getElementById("currentTurnBadge");
  currentTurnPlayerName = document.getElementById("currentTurnPlayerName");
  inputRespuesta = document.getElementById("respuesta");
  turnoTxt = document.getElementById("turno");
  questionText = document.getElementById("questionText");
  globalScoreEl = document.getElementById("globalScore");
  inputLabel = document.getElementById("inputLabel");
  answers = document.querySelectorAll(".answer");
  errorsWrap = document.querySelector(".errors");
  score1 = document.getElementById("score1");
  score2 = document.getElementById("score2");
  gameOverText = document.getElementById("gameOverText");
  
  // Botón salir del modal final
  if (btnGameOverFinalSalir) {
    btnGameOverFinalSalir.addEventListener("click", async () => {
      console.log("🚪 Jugador saliendo del juego...");
      await limpiarJuegoCompleto();
    });
  }
  
  if (btnCelebrarContinuar) {
    btnCelebrarContinuar.addEventListener("click", () => {
      ocultarCelebracion();
    });
  }
  
  if (btnCelebrarSalir) {
    btnCelebrarSalir.addEventListener("click", async () => {
      ocultarCelebracion();
      await limpiarJuegoCompleto();
    });
  }
  
  if (btnCerrarAnuncioRonda) {
    btnCerrarAnuncioRonda.addEventListener("click", () => {
      if (rondaAnuncioModal) rondaAnuncioModal.classList.add("hidden");
      if (gameWrapper && faseActual !== "final") gameWrapper.classList.remove("hidden");
    });
  }
  
  if (errorsWrap) {
    if (!errorXs || errorXs.length === 0) errorsWrap.innerHTML = "<span>X</span><span>X</span><span>X</span>";
    errorsWrap.querySelectorAll("span").forEach(s => { if (!s.textContent.trim()) s.textContent = "X"; });
    errorXs = errorsWrap.querySelectorAll("span");
  }
  
  onValue(ref(db, "jugadores"), (snapshot) => {
    jugadoresGlobal = snapshot.exists() ? snapshot.val() : {};
    actualizarTurnoConNombre();
    actualizarEstadoInputYBoton();
    actualizarLabelDinamico();
    actualizarTarjetaTurnoFijo();
  });
  
  onValue(ref(db, "estadoJuego"), (snapshot) => {
    if (!snapshot.exists()) {
      const estadoInicial = {
        turno: { equipo: null, jugadorId: null }, pausado: false, respuestasReveladas: {},
        scores: { 1: 0, 2: 0 }, scoresGlobal: { 1: 0, 2: 0 }, errores: { 1: 0, 2: 0 },
        fase: "esperando", preguntaActual: "Esperando pregunta del presentador...", respuestasActuales: [], reset: Date.now()
      };
      set(ref(db, "estadoJuego"), estadoInicial);
      estadoJuegoCache = estadoInicial;
      return;
    }
    const e = snapshot.val();
    const cambioPrevio = estadoJuegoCache;
    estadoJuegoCache = e;
    
    // DETECTAR JUEGO TERMINADO
    if (e.juegoTerminado === true && !juegoTerminadoPermanente) {
      console.log("🏆 JUEGO TERMINADO DETECTADO");
      mostrarFinalJuego(e.scoresGlobal);
      return;
    }
    
    actualizarJuegoDesdeEstado(e);
    if (e.turno !== undefined) turno = typeof e.turno === 'object' ? { ...e.turno, equipo: Number(e.turno.equipo) } : { equipo: Number(e.turno) || 1, jugadorId: null };
    if (e.reset && e.reset !== ultimoReset) {
      ultimoReset = e.reset;
      pausado = !!e.pausado;
      scores = e.scores ?? { 1: 0, 2: 0 };
      scoresGlobal = e.scoresGlobal ?? { 1: 0, 2: 0 };
      erroresPorEquipo = e.errores ?? { 1: 0, 2: 0 };
      respuestasMostradas = [];
      if (answers) answers.forEach(a => a.classList.remove("revealed"));
      iniciarRondaUI();
      return;
    }
    
    if (e.celebracionRonda && e.celebracionRonda.activo && (!cambioPrevio || !cambioPrevio.celebracionRonda || cambioPrevio.celebracionRonda.activo !== e.celebracionRonda.activo)) {
      console.log("🎉 Mostrando celebración de ronda:", e.celebracionRonda);
      mostrarCelebracion(
        e.celebracionRonda.ganador,
        e.celebracionRonda.puntos,
        e.celebracionRonda.color
      );
    }
    
    if (e.mensajeFinalRonda && e.mensajeFinalRonda !== cambioPrevio?.mensajeFinalRonda) {
      console.log("📢 Mensaje de fin de ronda:", e.mensajeFinalRonda);
      if (rondaAnuncioTexto) rondaAnuncioTexto.textContent = e.mensajeFinalRonda;
      if (rondaAnuncioModal) {
        rondaAnuncioModal.classList.remove("hidden");
        if (gameWrapper) gameWrapper.classList.add("hidden");
        setTimeout(() => {
          if (rondaAnuncioModal) rondaAnuncioModal.classList.add("hidden");
          if (gameWrapper && faseActual !== "final" && faseActual !== "ronda") gameWrapper.classList.remove("hidden");
        }, 4000);
      }
    }
    
    if (e.fase !== undefined) {
      const faseAnterior = faseActual;
      faseActual = e.fase;
      actualizarEstadoInputYBoton();
      
      if (faseActual === "ronda" && faseAnterior !== "ronda") {
        if (gameWrapper) gameWrapper.classList.add("hidden");
        if (rondaTransicionScreen) rondaTransicionScreen.classList.remove("hidden");
        setTimeout(() => {
          if (rondaTransicionScreen) rondaTransicionScreen.classList.add("hidden");
          if (gameWrapper && faseActual !== "final") gameWrapper.classList.remove("hidden");
        }, 3000);
      } else if (faseActual === "final" && !e.juegoTerminado) {
        // mostrarGameOver();
      }
    }
    
    if (e.pausado !== undefined) pausado = !!e.pausado;
    if (e.scores) scores = e.scores;
    if (e.scoresGlobal) { 
      scoresGlobal = e.scoresGlobal; 
      if (globalScoreEl) globalScoreEl.textContent = `🌍 GLOBAL: ${scoresGlobal[1] ?? 0} - ${scoresGlobal[2] ?? 0}`; 
    }
    if (e.errores) { 
      erroresPorEquipo = e.errores; 
      const miEquipoLocal = Number(jugadoresGlobal[miId]?.equipo); 
      if (miEquipoLocal) pintarErroresUI(miEquipoLocal);
      actualizarEstadoInputYBoton();
      actualizarLabelDinamico();
    }
    if (e.respuestasReveladas) {
      respuestasMostradas = [];
      if (answers) answers.forEach((a, idx) => { if (e.respuestasReveladas[idx]) { a.classList.add("revealed"); respuestasMostradas.push(idx); } else a.classList.remove("revealed"); });
    }
    actualizarTurnoConNombre(); actualizarScoresUI(); actualizarEstadoInputYBoton(); actualizarLabelDinamico(); actualizarTarjetaTurnoFijo();
  });
  
  tabInstanceId = generarTabInstanceId();
  setInterval(reclamarTabActivo, 5000);
  window.addEventListener("beforeunload", limpiarReclamoTab);
  
  if (miId && intentarRestaurarSesionJugador()) {
    get(ref(db, "jugadores/" + miId)).then((snapshot) => {
      if (snapshot.exists() && snapshot.val().estado !== "expulsado") {
        if (startScreen) startScreen.classList.add("hidden");
        if (playerScreen) playerScreen.classList.add("hidden");
        if (gameWrapper) gameWrapper.classList.remove("hidden");
        configurarListenerEstadoJugador();
        iniciarRondaUI();
      } else { sessionStorage.removeItem("jugadorId"); sessionStorage.removeItem("equipo"); limpiarReclamoTab(); miId = null; }
    }).catch(() => { sessionStorage.removeItem("jugadorId"); sessionStorage.removeItem("equipo"); limpiarReclamoTab(); miId = null; });
  }
  
  btnStart?.addEventListener("click", () => { if (startScreen) startScreen.classList.add("hidden"); if (playerScreen) playerScreen.classList.remove("hidden"); });
  
  btnJoin?.addEventListener("click", async () => {
    const nombre = document.getElementById("playerName").value.trim();
    const equipo = Number(document.getElementById("playerTeam").value);
    
    if (!nombre) {
      alert("⚠️ Por favor, escribe tu nombre para poder jugar.");
      return;
    }
    
    if (nombre.length < 3) {
      alert("⚠️ Tu nombre debe tener al menos 3 caracteres.");
      return;
    }
    
    const snapshot = await get(ref(db, "jugadores"));
    const jugadores = snapshot.val() || {};
    const jugadoresActivos = Object.values(jugadores).filter(j => j.estado !== "expulsado");
    if (equipo === 1 && jugadoresActivos.filter(j => Number(j.equipo) === 1).length >= 3) return alert("🚫 Equipo 1 está lleno (máximo 3 jugadores)");
    if (equipo === 2 && jugadoresActivos.filter(j => Number(j.equipo) === 2).length >= 3) return alert("🚫 Equipo 2 está lleno (máximo 3 jugadores)");
    
    const jugadorId = window.registrarJugadorFirebase({ nombre, equipo, fecha: Date.now() });
    miId = jugadorId;
    sessionStorage.setItem("jugadorId", jugadorId);
    sessionStorage.setItem("equipo", equipo);
    reclamarTabActivo();
    configurarListenerEstadoJugador();
    if (playerScreen) playerScreen.classList.add("hidden");
    if (gameWrapper) gameWrapper.classList.remove("hidden");
    iniciarRondaUI();
    actualizarTarjetaTurnoFijo();
  });
  
  btnNext?.addEventListener("click", () => { 
    if (gameOverScreen) gameOverScreen.classList.add("hidden"); 
    if (gameWrapper) gameWrapper.classList.remove("hidden"); 
    iniciarRondaUI(); 
  });
  
  btnRegresarInicio?.addEventListener("click", async () => {
    try {
      if (window.estadoJugadorListener) { window.estadoJugadorListener(); window.estadoJugadorListener = null; }
      if (miId) await set(ref(db, "jugadores/" + miId), null);
      if (expulsadoModal) expulsadoModal.classList.add("hidden");
      if (gameWrapper) gameWrapper.classList.add("hidden");
      if (startScreen) startScreen.classList.remove("hidden");
      sessionStorage.removeItem("jugadorId"); sessionStorage.removeItem("equipo");
      limpiarReclamoTab();
      miId = null; estadoJugador = "activo"; turno = { equipo: 1, jugadorId: null }; faseActual = "esperando";
      if (inputRespuesta) { inputRespuesta.value = ""; inputRespuesta.disabled = false; }
      if (celebracionOverlay) celebracionOverlay.classList.add("hidden");
      if (rondaAnuncioModal) rondaAnuncioModal.classList.add("hidden");
      juegoTerminadoPermanente = false;
    } catch (error) { console.error("❌ Error al regresar al inicio:", error); }
  });
  
  btnEnviar?.addEventListener("click", verificarRespuesta);
  inputRespuesta?.addEventListener("keydown", e => { if (e.key === "Enter") verificarRespuesta(); });
  
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) return;
    set(ref(db, "estadoJuego"), {
      turno: { equipo: null, jugadorId: null }, pausado: false, respuestasReveladas: {},
      scores: { 1: 0, 2: 0 }, scoresGlobal: { 1: 0, 2: 0 }, errores: { 1: 0, 2: 0 },
      fase: "esperando", preguntaActual: "", respuestasActuales: [], reset: Date.now()
    });
  });
});