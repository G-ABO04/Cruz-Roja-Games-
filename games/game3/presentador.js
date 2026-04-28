import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
  set,
  onValue,
  get,
  push,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("✅ presentador.js cargado - Versión PRO con validación estricta");

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

const puntosPorPosicion = [50, 35, 25, 15, 5];
let jugadoresGlobal = {};
let faseGlobal = "esperando";
let turnoActual = { equipo: 1, jugadorId: null };
let preguntasGuardadas = [];
let modoEdicion = false;
let preguntaEditandoId = null;
let scoresGlobal = { 1: 0, 2: 0 };
let preguntaAnterior = "";

let presentadorStartScreen, presentadorMainContent;
let btnEnviarPregunta, preguntaInput;
let btnTurnoEquipo1, btnTurnoEquipo2, turnoDisplay;
let btnPuntosEquipo1, btnPuntosEquipo2;
let btnRevelar;
let listaJugadoresDetallada, contadorJugadoresDetallado;
let selectRonda, btnCargarRonda, btnNuevaRonda, btnTerminarRonda, btnJuegoTerminado, btnCambiarTurno;
let btnResetRespuestas, btnResetScores, btnResetGlobalScores, btnResetErrores;
let btnPausarJuego, btnReanudarJuego, btnReiniciarTodo;
let btnIniciarJuegos;
let preguntaEl, respuestasEl, turnoActualBox, scoresBox, scoresGlobalBox, erroresBox, contenedorJugadores;
let questionsList, btnNuevaPregunta, btnEditarPregunta, btnEliminarPregunta, btnGuardarPregunta, btnCancelarEdicion;
let mensajePresentadorInput, btnEnviarMensaje, btnLimpiarMensaje;
let advertenciaModal, btnCerrarAdvertencia, advertenciaCallback;

function normalizarCompleto(texto) {
  return texto.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()]/g, "")
    .trim();
}

function generarClaves(texto) {
  const palabras = texto.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter(palabra => palabra.length >= 4);
  
  const fraseCompleta = texto.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const claves = [...palabras];
  if (fraseCompleta.length >= 8) {
    claves.push(fraseCompleta);
  }
  
  return [...new Set(claves)];
}

function verificarRespuestasDuplicadas(respuestas) {
  const textos = respuestas.map(r => normalizarCompleto(r.texto));
  const duplicados = textos.filter((item, index) => textos.indexOf(item) !== index);
  if (duplicados.length > 0) {
    alert(`⚠️ Hay respuestas duplicadas: "${duplicados[0]}" aparece más de una vez`);
    return false;
  }
  return true;
}

function obtenerClavesDesdeInput(textoRespuesta, clavesManual, index) {
  let palabrasClave = [];
  if (clavesManual && clavesManual.trim()) {
    palabrasClave = clavesManual.split(",").map(c => c.trim().toLowerCase());
    console.log(`📝 Respuesta ${index + 1} - Claves manuales:`, palabrasClave);
  } else {
    palabrasClave = generarClaves(textoRespuesta);
    console.log(`🤖 Respuesta ${index + 1} - Claves automáticas:`, palabrasClave);
  }
  palabrasClave = palabrasClave.filter(c => c.length >= 3);
  return palabrasClave;
}

function mostrarAdvertenciaPregunta(callback) {
  if (advertenciaModal) {
    advertenciaModal.classList.remove("hidden");
    advertenciaCallback = callback;
  }
}

async function guardarPreguntaEnLista(pregunta, respuestas) {
  if (!verificarRespuestasDuplicadas(respuestas)) return;
  
  const preguntaData = {
    texto: pregunta,
    respuestas: respuestas.map(r => ({
      texto: r.texto,
      puntos: r.puntos,
      claves: r.claves
    })),
    fecha: Date.now()
  };
  
  if (modoEdicion && preguntaEditandoId) {
    await set(ref(db, `preguntasGuardadas/${preguntaEditandoId}`), preguntaData);
    modoEdicion = false;
    preguntaEditandoId = null;
    if (btnGuardarPregunta) btnGuardarPregunta.textContent = "💾 GUARDAR PREGUNTA";
    if (btnCancelarEdicion) btnCancelarEdicion.classList.add("hidden");
  } else {
    await push(ref(db, "preguntasGuardadas"), preguntaData);
  }
  
  await cargarListaPreguntas();
  alert("✅ Pregunta guardada correctamente");
}

async function cargarListaPreguntas() {
  const snapshot = await get(ref(db, "preguntasGuardadas"));
  if (snapshot.exists()) {
    preguntasGuardadas = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
    if (questionsList) {
      questionsList.innerHTML = '<option value="">Selecciona una pregunta...</option>';
      preguntasGuardadas.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.texto.length > 50 ? p.texto.substring(0, 50) + "..." : p.texto;
        questionsList.appendChild(option);
      });
    }
  } else if (questionsList) {
    questionsList.innerHTML = '<option value="">No hay preguntas guardadas</option>';
  }
}

function cargarPreguntaSeleccionada() {
  const selectedId = questionsList?.value;
  if (!selectedId) return;
  const pregunta = preguntasGuardadas.find(p => p.id === selectedId);
  if (!pregunta) return;
  
  if (preguntaInput) preguntaInput.value = pregunta.texto;
  const respuestasInputsArray = document.querySelectorAll(".respuestaInput");
  const clavesInputsArray = document.querySelectorAll(".clavesInput");
  
  pregunta.respuestas.forEach((resp, index) => {
    if (respuestasInputsArray[index]) respuestasInputsArray[index].value = resp.texto;
    if (clavesInputsArray[index] && resp.claves) clavesInputsArray[index].value = resp.claves.join(", ");
  });
}

function editarPreguntaSeleccionada() {
  const selectedId = questionsList?.value;
  if (!selectedId) {
    alert("⚠️ Selecciona una pregunta para editar");
    return;
  }
  const pregunta = preguntasGuardadas.find(p => p.id === selectedId);
  if (!pregunta) return;
  
  modoEdicion = true;
  preguntaEditandoId = selectedId;
  
  if (preguntaInput) preguntaInput.value = pregunta.texto;
  const respuestasInputsArray = document.querySelectorAll(".respuestaInput");
  const clavesInputsArray = document.querySelectorAll(".clavesInput");
  
  pregunta.respuestas.forEach((resp, index) => {
    if (respuestasInputsArray[index]) respuestasInputsArray[index].value = resp.texto;
    if (clavesInputsArray[index] && resp.claves) clavesInputsArray[index].value = resp.claves.join(", ");
  });
  
  if (btnGuardarPregunta) btnGuardarPregunta.textContent = "✏️ ACTUALIZAR";
  if (btnCancelarEdicion) btnCancelarEdicion.classList.remove("hidden");
  alert("✏️ Editando pregunta. Haz clic en ACTUALIZAR para guardar cambios.");
}

async function eliminarPreguntaSeleccionada() {
  const selectedId = questionsList?.value;
  if (!selectedId) {
    alert("⚠️ Selecciona una pregunta para eliminar");
    return;
  }
  if (confirm("⚠️ ¿Eliminar esta pregunta permanentemente?")) {
    await remove(ref(db, `preguntasGuardadas/${selectedId}`));
    await cargarListaPreguntas();
    alert("✅ Pregunta eliminada");
    
    if (modoEdicion && preguntaEditandoId === selectedId) {
      modoEdicion = false;
      preguntaEditandoId = null;
      if (btnGuardarPregunta) btnGuardarPregunta.textContent = "💾 GUARDAR PREGUNTA";
      if (btnCancelarEdicion) btnCancelarEdicion.classList.add("hidden");
      if (preguntaInput) preguntaInput.value = "";
      document.querySelectorAll(".respuestaInput").forEach(input => input.value = "");
      document.querySelectorAll(".clavesInput").forEach(input => input.value = "");
    }
  }
}

function cancelarEdicion() {
  modoEdicion = false;
  preguntaEditandoId = null;
  if (btnGuardarPregunta) btnGuardarPregunta.textContent = "💾 GUARDAR PREGUNTA";
  if (btnCancelarEdicion) btnCancelarEdicion.classList.add("hidden");
  if (preguntaInput) preguntaInput.value = "";
  document.querySelectorAll(".respuestaInput").forEach(input => input.value = "");
  document.querySelectorAll(".clavesInput").forEach(input => input.value = "");
}

function enviarPreguntaPersonalizada() {
  const pregunta = preguntaInput?.value.trim();
  if (!pregunta) {
    alert("⚠️ Escribe una pregunta");
    return;
  }
  
  const respuestas = [];
  const respuestasInputsArray = document.querySelectorAll(".respuestaInput");
  const clavesInputsArray = document.querySelectorAll(".clavesInput");
  
  for (let index = 0; index < respuestasInputsArray.length; index++) {
    const texto = respuestasInputsArray[index].value.trim();
    if (!texto) {
      alert(`⚠️ La respuesta ${index + 1} está vacía`);
      return;
    }
  }
  
  for (let index = 0; index < respuestasInputsArray.length; index++) {
    const texto = respuestasInputsArray[index].value.trim();
    const clavesManual = clavesInputsArray[index]?.value.trim() || "";
    const palabrasClave = obtenerClavesDesdeInput(texto, clavesManual, index);
    
    const clavesCortas = palabrasClave.filter(c => c.length < 3);
    if (clavesCortas.length > 0) {
      alert(`⚠️ La respuesta ${index + 1} tiene claves demasiado cortas: "${clavesCortas.join(', ')}". Las claves deben tener al menos 3 caracteres.`);
      return;
    }
    
    respuestas.push({
      texto: texto,
      puntos: puntosPorPosicion[index],
      claves: palabrasClave
    });
  }
  
  if (!verificarRespuestasDuplicadas(respuestas)) return;
  
  const estadoRef = ref(db, "estadoJuego");
  
  get(estadoRef).then((snap) => {
    const estadoActual = snap.val() || {};
    
    update(estadoRef, {
      preguntaActual: pregunta,
      respuestasActuales: respuestas,
      respuestasReveladas: {},
      reset: Date.now(),
      fase: estadoActual.fase || "esperando",
      turno: estadoActual.turno || { equipo: 1, jugadorId: null },
      scores: estadoActual.scores || { 1: 0, 2: 0 },
      scoresGlobal: estadoActual.scoresGlobal || { 1: 0, 2: 0 },
      errores: estadoActual.errores || { 1: 0, 2: 0 }
    });
  });
  
  console.log("✅ Pregunta personalizada enviada:", pregunta);
  alert("✅ Pregunta enviada correctamente");
}

function cambiarTurno(equipo) {
  turnoActual = { equipo: equipo, jugadorId: null };
  update(ref(db, "estadoJuego/turno"), turnoActual);
  if (turnoDisplay) turnoDisplay.textContent = `EQUIPO ${equipo}`;
  console.log(`🔄 Turno cambiado a EQUIPO ${equipo}`);
}

function sumarPuntosManual(equipo) {
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) {
      const data = snap.val();
      const puntosActuales = data.scores?.[equipo] || 0;
      const globalActuales = data.scoresGlobal?.[equipo] || 0;
      update(ref(db, "estadoJuego"), {
        [`scores/${equipo}`]: puntosActuales + 50,
        [`scoresGlobal/${equipo}`]: globalActuales + 50
      });
      console.log(`➕ +50 puntos al EQUIPO ${equipo}`);
    }
  });
}

function revelarRespuesta(index) {
  update(ref(db, "estadoJuego/respuestasReveladas"), { [index]: true });
  console.log(`🔓 Respuesta ${index + 1} revelada`);
}

function resetErrores() {
  update(ref(db, "estadoJuego"), { errores: { 1: 0, 2: 0 } });
  console.log("🔄 Errores reiniciados");
}

function renderJugadores(jugadores, estadoJuego) {
  if (!jugadores || Object.keys(jugadores).length === 0) {
    const mensaje = '<div class="sin-jugadores">👾 NO HAY JUGADORES CONECTADOS 👾</div>';
    if (contenedorJugadores) contenedorJugadores.innerHTML = mensaje;
    if (listaJugadoresDetallada) listaJugadoresDetallada.innerHTML = mensaje;
    if (contadorJugadoresDetallado) contadorJugadoresDetallado.textContent = "Total: 0/6 jugadores activos";
    return;
  }
  
  const jugadoresArray = Object.entries(jugadores);
  const jugadoresActivos = jugadoresArray.filter(([_, j]) => j !== null && j.estado !== "expulsado");
  
  if (contadorJugadoresDetallado) {
    contadorJugadoresDetallado.textContent = `Total: ${jugadoresActivos.length}/6 jugadores activos`;
  }
  if (document.getElementById("contadorJugadores")) {
    document.getElementById("contadorJugadores").textContent = `Total: ${jugadoresActivos.length}/6 jugadores`;
  }
  
  if (contenedorJugadores) {
    contenedorJugadores.innerHTML = "";
    jugadoresArray.forEach(([id, jugador]) => {
      if (jugador === null || jugador.estado === "expulsado") return;
      
      const div = document.createElement("div");
      div.classList.add("jugador-item");
      if (jugador.equipo === 1) div.classList.add("equipo1");
      else div.classList.add("equipo2");
      if (turnoActual.jugadorId === id) div.classList.add("turno-activo");
      
      const estaBloqueado = jugador.estado === "bloqueado";
      
      div.innerHTML = `
        <div class="jugador-header">
          <strong>${jugador.nombre}</strong>
          <span class="jugador-equipo">EQ${jugador.equipo}</span>
        </div>
        <div class="jugador-estado">
          <span class="estado-indicador estado-${jugador.estado === 'bloqueado' ? 'bloqueado' : 'activo'}"></span>
          <span class="estado-texto">${jugador.estado === 'bloqueado' ? '🚫 BLOQUEADO' : '✅ ACTIVO'}</span>
        </div>
        <div class="jugador-acciones">
          <button class="btn-seleccionar" ${estaBloqueado ? "disabled" : ""} onclick="window.seleccionarJugador('${id}', ${jugador.equipo})">
            🎯 SELECCIONAR
          </button>
          ${estaBloqueado ? 
            `<button class="btn-desbloquear" onclick="window.desbloquearJugador('${id}')">
              🔓 DESBLOQUEAR
            </button>` :
            `<button class="btn-bloquear" onclick="window.bloquearJugador('${id}')">
              🚫 BLOQUEAR
            </button>`
          }
          <button class="btn-expulsar" onclick="window.expulsarJugador('${id}')">
            ❌ EXPULSAR
          </button>
        </div>
      `;
      contenedorJugadores.appendChild(div);
    });
  }
  
  if (listaJugadoresDetallada) {
    listaJugadoresDetallada.innerHTML = "";
    jugadoresArray.forEach(([id, jugador]) => {
      if (jugador === null || jugador.estado === "expulsado") return;
      
      const div = document.createElement("div");
      div.classList.add("jugador-card");
      if (jugador.equipo === 1) div.classList.add("equipo1");
      else div.classList.add("equipo2");
      
      const estaBloqueado = jugador.estado === "bloqueado";
      
      div.innerHTML = `
        <div class="jugador-info">
          <span class="jugador-nombre">${jugador.nombre}</span>
          <span class="jugador-equipo">🎯 EQUIPO ${jugador.equipo || 1}</span>
          <span class="jugador-estado ${estaBloqueado ? 'bloqueado' : 'activo'}">${estaBloqueado ? '🚫 BLOQUEADO' : '✅ ACTIVO'}</span>
        </div>
        <div class="jugador-acciones">
          <button class="btn-seleccionar" ${estaBloqueado ? "disabled" : ""} onclick="window.seleccionarJugador('${id}', ${jugador.equipo || 1})">
            🎯 SELECCIONAR
          </button>
          ${estaBloqueado ? 
            `<button class="btn-desbloquear" onclick="window.desbloquearJugador('${id}')">
              🔓 DESBLOQUEAR
            </button>` :
            `<button class="btn-bloquear" onclick="window.bloquearJugador('${id}')">
              🚫 BLOQUEAR
            </button>`
          }
          <button class="btn-expulsar" onclick="window.expulsarJugador('${id}')">
            ❌ EXPULSAR
          </button>
        </div>
      `;
      listaJugadoresDetallada.appendChild(div);
    });
  }
  
  if (turnoDisplay && turnoActual.jugadorId && jugadores[turnoActual.jugadorId]) {
    turnoDisplay.textContent = `EQUIPO ${turnoActual.equipo} - ${jugadores[turnoActual.jugadorId].nombre}`;
  } else if (turnoDisplay) {
    turnoDisplay.textContent = `EQUIPO ${turnoActual.equipo}`;
  }
}

function renderPreguntaYRespuestas(respuestasReveladas = {}) {
  get(ref(db, "estadoJuego")).then((snap) => {
    if (snap.exists()) {
      const data = snap.val();
      
      if (data.preguntaActual && preguntaEl) {
        preguntaEl.textContent = data.preguntaActual;
      } else if (preguntaEl) {
        preguntaEl.textContent = "⚠️ No hay pregunta activa";
      }
      
      if (data.respuestasActuales && respuestasEl) {
        respuestasEl.innerHTML = "";
        data.respuestasActuales.forEach((resp, index) => {
          const div = document.createElement("div");
          div.className = "respuesta";
          if (respuestasReveladas[index]) div.classList.add("revelada");
          div.textContent = `${resp.texto} (${resp.puntos} pts)`;
          div.addEventListener("click", () => {
            update(ref(db, "estadoJuego/respuestasReveladas"), { [index]: true });
          });
          respuestasEl.appendChild(div);
        });
      }
    }
  });
}

function pintarTurnoUI(turno) {
  const valor = turnoActualBox?.querySelector(".estado-valor");
  if (valor) {
    if (turno?.equipo) {
      valor.textContent = `EQUIPO ${turno.equipo}`;
      if (turnoDisplay) turnoDisplay.textContent = `EQUIPO ${turno.equipo}`;
    } else {
      valor.textContent = "NINGÚN EQUIPO";
      if (turnoDisplay) turnoDisplay.textContent = "NINGÚN EQUIPO";
    }
  }
}

function pintarFaseUI(fase) {
  const faseEl = document.getElementById("faseActual");
  if (faseEl) {
    const fasesTexto = {
      "esperando": "ESPERANDO JUGADORES",
      "jugando": "JUEGO ACTIVO",
      "ronda": "🔄 CAMBIANDO DE RONDA 🔄",
      "final": "JUEGO TERMINADO"
    };
    faseEl.textContent = fasesTexto[fase] || fase.toUpperCase();
  }
  
  if (btnIniciarJuegos && btnIniciarJuegos.length > 0) {
    const equipo1 = Object.values(jugadoresGlobal).filter(j => j.equipo === 1 && j.estado !== "expulsado").length;
    const equipo2 = Object.values(jugadoresGlobal).filter(j => j.equipo === 2 && j.estado !== "expulsado").length;
    
    btnIniciarJuegos.forEach((btn) => {
      if (fase === "esperando") {
        btn.style.display = "inline-block";
        btn.disabled = !(equipo1 === 3 && equipo2 === 3);
        btn.textContent = equipo1 === 3 && equipo2 === 3
          ? "▶️ INICIAR JUEGO"
          : `ESPERANDO JUGADORES (EQ1: ${equipo1}/3, EQ2: ${equipo2}/3)`;
      } else {
        btn.style.display = "none";
      }
    });
  }
}

function pintarScoresUI(sc) {
  if (scoresBox) {
    const s1 = sc?.[1] ?? 0;
    const s2 = sc?.[2] ?? 0;
    scoresBox.innerHTML = `Equipo 1: ${s1}<br>Equipo 2: ${s2}`;
  }
}

function pintarScoresGlobalUI(scGlobal) {
  if (scoresGlobalBox) {
    const s1 = scGlobal?.[1] ?? 0;
    const s2 = scGlobal?.[2] ?? 0;
    scoresGlobalBox.innerHTML = `🌍 GLOBAL: ${s1} - ${s2}`;
  }
  if (scGlobal) {
    scoresGlobal = scGlobal;
  }
}

function pintarErroresUI(err) {
  if (erroresBox) {
    const e1 = err?.[1] ?? 0;
    const e2 = err?.[2] ?? 0;
    erroresBox.innerHTML = `Equipo 1: ${e1}/3<br>Equipo 2: ${e2}/3`;
  }
}

function actualizarBotonesRevelar(respuestasReveladas) {
  if (btnRevelar) {
    btnRevelar.forEach((btn, idx) => {
      const revelada = respuestasReveladas?.[idx] || false;
      if (revelada) {
        btn.classList.add("revelado");
        btn.disabled = true;
      } else {
        btn.classList.remove("revelado");
        btn.disabled = false;
      }
    });
  }
}

function renderTurnoDetallado(jugadores, estadoJuego) {
  const contenedor = document.getElementById("turnoDetallado");
  if (!contenedor) return;
  
  if (!jugadores || Object.keys(jugadores).length === 0) {
    contenedor.innerHTML = '<div class="sin-jugadores">👾 NO HAY JUGADORES CONECTADOS 👾</div>';
    return;
  }
  
  const errores = estadoJuego?.errores || { 1: 0, 2: 0 };
  const turno = estadoJuego?.turno || { equipo: null, jugadorId: null };
  const equipo1 = Object.entries(jugadores).filter(([_, j]) => j.equipo === 1 && j.estado !== "expulsado");
  const equipo2 = Object.entries(jugadores).filter(([_, j]) => j.equipo === 2 && j.estado !== "expulsado");
  
  contenedor.innerHTML = `
    <div class="equipo-turno ${turno.equipo === 1 ? 'activo' : ''}">
      <h3>🟢 EQUIPO VERDE</h3>
      ${equipo1.map(([id, jugador]) => `
        <div class="jugador-turno ${turno.jugadorId === id ? 'activo' : ''}">
          <span class="nombre">${jugador.nombre}</span>
          <div class="errores">
            ${Array.from({length: errores[1] || 0}, () => '<span class="error-x">✗</span>').join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="equipo-turno ${turno.equipo === 2 ? 'activo' : ''}">
      <h3>🔵 EQUIPO AZUL</h3>
      ${equipo2.map(([id, jugador]) => `
        <div class="jugador-turno ${turno.jugadorId === id ? 'activo' : ''}">
          <span class="nombre">${jugador.nombre}</span>
          <div class="errores">
            ${Array.from({length: errores[2] || 0}, () => '<span class="error-x">✗</span>').join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

window.bloquearJugador = function(id) {
  if (confirm("🚫 ¿Bloquear a este jugador?")) {
    update(ref(db, "jugadores/" + id), { estado: "bloqueado" });
    console.log(`🚫 Jugador ${id} bloqueado`);
    alert("🚫 Jugador bloqueado");
  }
};

window.desbloquearJugador = function(id) {
  if (confirm("🔓 ¿Desbloquear a este jugador?")) {
    update(ref(db, "jugadores/" + id), { estado: "activo" });
    console.log(`🔓 Jugador ${id} desbloqueado`);
    alert("🔓 Jugador desbloqueado");
  }
};

window.expulsarJugador = function(id) {
  if (confirm("⚠️ ¿EXPULSAR a este jugador? El jugador será eliminado permanentemente del juego")) {
    set(ref(db, "jugadores/" + id), null).then(() => {
      console.log(`❌ Jugador ${id} eliminado completamente de Firebase`);
      alert("❌ Jugador eliminado del juego");
    }).catch((error) => {
      console.error("Error al expulsar jugador:", error);
      alert("❌ Error al expulsar jugador");
    });
  }
};

window.seleccionarJugador = function(id, equipo) {
  const jugador = jugadoresGlobal[id];
  if (!jugador) {
    alert("❌ Jugador no encontrado");
    return;
  }
  if (jugador.estado === "bloqueado") {
    alert("🚫 No puedes seleccionar un jugador bloqueado. Desbloquéalo primero.");
    return;
  }
  if (jugador.estado === "expulsado") {
    alert("❌ Este jugador ya no existe en el sistema");
    return;
  }
  
  turnoActual = { equipo: jugador.equipo, jugadorId: id };
  update(ref(db, "estadoJuego/turno"), turnoActual);
  
  if (turnoDisplay) {
    turnoDisplay.textContent = `EQUIPO ${jugador.equipo} - ${jugador.nombre}`;
  }
  
  console.log(`✅ Jugador ${jugador.nombre} del Equipo ${jugador.equipo} seleccionado para el turno`);
  alert(`🎯 Turno asignado a ${jugador.nombre} (Equipo ${jugador.equipo})`);
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔍 Inicializando presentador...");
  
  presentadorStartScreen = document.getElementById("presentadorStartScreen");
  presentadorMainContent = document.getElementById("presentadorMainContent");
  btnEnviarPregunta = document.getElementById("btnEnviarPregunta");
  preguntaInput = document.getElementById("preguntaInput");
  btnTurnoEquipo1 = document.getElementById("btnTurnoEquipo1");
  btnTurnoEquipo2 = document.getElementById("btnTurnoEquipo2");
  turnoDisplay = document.getElementById("turnoDisplay");
  btnPuntosEquipo1 = document.getElementById("btnPuntosEquipo1");
  btnPuntosEquipo2 = document.getElementById("btnPuntosEquipo2");
  btnRevelar = document.querySelectorAll(".btn-revelar");
  listaJugadoresDetallada = document.getElementById("listaJugadoresDetallada");
  contadorJugadoresDetallado = document.getElementById("contadorJugadoresDetallado");
  selectRonda = document.getElementById("selectRonda");
  btnCargarRonda = document.getElementById("btnCargarRonda");
  btnNuevaRonda = document.getElementById("btnNuevaRonda");
  btnTerminarRonda = document.getElementById("btnTerminarRonda");
  btnJuegoTerminado = document.getElementById("btnJuegoTerminado");
  btnCambiarTurno = document.getElementById("btnCambiarTurno");
  btnResetRespuestas = document.getElementById("btnResetRespuestas");
  btnResetScores = document.getElementById("btnResetScores");
  btnResetGlobalScores = document.getElementById("btnResetGlobalScores");
  btnResetErrores = document.getElementById("btnResetErrores");
  btnPausarJuego = document.getElementById("btnPausarJuego");
  btnReanudarJuego = document.getElementById("btnReanudarJuego");
  btnReiniciarTodo = document.getElementById("btnReiniciarTodo");
  btnIniciarJuegos = Array.from(document.querySelectorAll("#btnIniciarJuego"));
  preguntaEl = document.getElementById("pregunta");
  respuestasEl = document.getElementById("respuestas");
  turnoActualBox = document.getElementById("turnoActual");
  scoresBox = document.getElementById("scores");
  scoresGlobalBox = document.getElementById("scoresGlobal");
  erroresBox = document.getElementById("errores");
  contenedorJugadores = document.getElementById("jugadoresConectados");
  questionsList = document.getElementById("questionsList");
  btnNuevaPregunta = document.getElementById("btnNuevaPregunta");
  btnEditarPregunta = document.getElementById("btnEditarPregunta");
  btnEliminarPregunta = document.getElementById("btnEliminarPregunta");
  btnGuardarPregunta = document.getElementById("btnGuardarPregunta");
  btnCancelarEdicion = document.getElementById("btnCancelarEdicion");
  mensajePresentadorInput = document.getElementById("mensajePresentadorInput");
  btnEnviarMensaje = document.getElementById("btnEnviarMensaje");
  btnLimpiarMensaje = document.getElementById("btnLimpiarMensaje");
  advertenciaModal = document.getElementById("advertenciaPreguntaModal");
  btnCerrarAdvertencia = document.getElementById("btnCerrarAdvertencia");
  
  const preguntaGuardada = localStorage.getItem("preguntaAnterior");
  if (preguntaGuardada) {
    preguntaAnterior = preguntaGuardada;
    console.log("📝 Pregunta anterior cargada:", preguntaAnterior);
  }
  
  if (btnCerrarAdvertencia) {
    btnCerrarAdvertencia.addEventListener("click", () => {
      if (advertenciaModal) advertenciaModal.classList.add("hidden");
      if (advertenciaCallback) {
        advertenciaCallback();
        advertenciaCallback = null;
      }
    });
  }
  
  if (btnEnviarMensaje) {
    btnEnviarMensaje.addEventListener("click", () => {
      const mensaje = mensajePresentadorInput?.value.trim();
      if (mensaje) {
        update(ref(db, "estadoJuego"), { mensajePresentador: mensaje });
        alert("✅ Mensaje enviado a todos los jugadores");
      } else {
        alert("⚠️ Escribe un mensaje primero");
      }
    });
  }
  
  if (btnLimpiarMensaje) {
    btnLimpiarMensaje.addEventListener("click", () => {
      update(ref(db, "estadoJuego"), { mensajePresentador: null });
      if (mensajePresentadorInput) mensajePresentadorInput.value = "";
      alert("🧹 Mensaje eliminado de la pantalla de jugadores");
    });
  }
  
  if (btnCancelarEdicion) btnCancelarEdicion.classList.add("hidden");
  
  cargarListaPreguntas();
  
  if (questionsList) questionsList.addEventListener("change", cargarPreguntaSeleccionada);
  if (btnNuevaPregunta) btnNuevaPregunta.addEventListener("click", () => {
    modoEdicion = false;
    preguntaEditandoId = null;
    if (preguntaInput) preguntaInput.value = "";
    document.querySelectorAll(".respuestaInput").forEach(input => input.value = "");
    document.querySelectorAll(".clavesInput").forEach(input => input.value = "");
    if (btnGuardarPregunta) btnGuardarPregunta.textContent = "💾 GUARDAR PREGUNTA";
    if (btnCancelarEdicion) btnCancelarEdicion.classList.add("hidden");
  });
  if (btnEditarPregunta) btnEditarPregunta.addEventListener("click", editarPreguntaSeleccionada);
  if (btnEliminarPregunta) btnEliminarPregunta.addEventListener("click", eliminarPreguntaSeleccionada);
  if (btnGuardarPregunta) btnGuardarPregunta.addEventListener("click", () => {
    const pregunta = preguntaInput?.value.trim();
    if (!pregunta) {
      alert("⚠️ Escribe una pregunta primero");
      return;
    }
    const respuestas = [];
    const respuestasInputsArray = document.querySelectorAll(".respuestaInput");
    const clavesInputsArray = document.querySelectorAll(".clavesInput");
    let valid = true;
    respuestasInputsArray.forEach((input, idx) => {
      const texto = input.value.trim();
      if (!texto) valid = false;
      const clavesManual = clavesInputsArray[idx]?.value.trim() || "";
      const palabrasClave = obtenerClavesDesdeInput(texto, clavesManual, idx);
      respuestas.push({ texto, puntos: puntosPorPosicion[idx], claves: palabrasClave });
    });
    if (!valid) {
      alert("⚠️ Completa todas las respuestas");
      return;
    }
    guardarPreguntaEnLista(pregunta, respuestas);
  });
  if (btnCancelarEdicion) btnCancelarEdicion.addEventListener("click", cancelarEdicion);
  
  const btnIniciarPresentador = document.getElementById("btnIniciarPresentador");
  if (btnIniciarPresentador) {
    const nuevoBtn = btnIniciarPresentador.cloneNode(true);
    btnIniciarPresentador.parentNode.replaceChild(nuevoBtn, btnIniciarPresentador);
    const btnFinal = document.getElementById("btnIniciarPresentador");
    btnFinal.addEventListener("click", (e) => {
      e.preventDefault();
      if (presentadorStartScreen) {
        presentadorStartScreen.style.opacity = "0";
        presentadorStartScreen.style.transition = "opacity 0.5s ease";
        setTimeout(() => { presentadorStartScreen.style.display = "none"; }, 500);
      }
      if (presentadorMainContent) {
        presentadorMainContent.classList.remove("hidden");
        presentadorMainContent.style.opacity = "0";
        presentadorMainContent.style.transition = "opacity 0.5s ease";
        setTimeout(() => { presentadorMainContent.style.opacity = "1"; }, 50);
      }
    });
  }
  
  if (presentadorMainContent) presentadorMainContent.classList.add("hidden");
  
  onValue(ref(db, "estadoJuego"), (snap) => {
    if (!snap.exists()) {
      set(ref(db, "estadoJuego"), {
        turno: { equipo: null, jugadorId: null }, pausado: false, respuestasReveladas: {},
        scores: { 1: 0, 2: 0 }, scoresGlobal: { 1: 0, 2: 0 }, errores: { 1: 0, 2: 0 },
        fase: "esperando", preguntaActual: "", respuestasActuales: [], reset: Date.now()
      });
      return;
    }
    const e = snap.val();
    faseGlobal = e.fase;
    turnoActual = typeof e.turno === 'object' ? e.turno : { equipo: e.turno ?? 1, jugadorId: null };
    pintarTurnoUI(turnoActual);
    pintarScoresUI(e.scores);
    pintarScoresGlobalUI(e.scoresGlobal);
    pintarErroresUI(e.errores);
    pintarFaseUI(e.fase);
    actualizarBotonesRevelar(e.respuestasReveladas);
    renderPreguntaYRespuestas(e.respuestasReveladas);
    renderJugadores(jugadoresGlobal, e);
    renderTurnoDetallado(jugadoresGlobal, e);
  });
  
  onValue(ref(db, "jugadores"), (snapshot) => {
    if (!snapshot.exists()) {
      jugadoresGlobal = {};
      renderJugadores(jugadoresGlobal);
      return;
    }
    const jugadores = snapshot.val();
    const jugadoresFiltrados = {};
    Object.entries(jugadores).forEach(([id, jugador]) => {
      if (jugador !== null && jugador.estado !== "expulsado") jugadoresFiltrados[id] = jugador;
    });
    jugadoresGlobal = jugadoresFiltrados;
    renderJugadores(jugadoresGlobal);
    pintarTurnoUI(turnoActual);
    if (turnoDisplay && turnoActual.jugadorId && jugadoresFiltrados[turnoActual.jugadorId]) {
      turnoDisplay.textContent = `EQUIPO ${turnoActual.equipo} - ${jugadoresFiltrados[turnoActual.jugadorId].nombre}`;
    } else if (turnoDisplay) {
      turnoDisplay.textContent = `EQUIPO ${turnoActual.equipo}`;
    }
    pintarFaseUI(faseGlobal);
  });
  
  if (btnEnviarPregunta) btnEnviarPregunta.addEventListener("click", enviarPreguntaPersonalizada);
  if (btnTurnoEquipo1) btnTurnoEquipo1.addEventListener("click", () => cambiarTurno(1));
  if (btnTurnoEquipo2) btnTurnoEquipo2.addEventListener("click", () => cambiarTurno(2));
  if (btnPuntosEquipo1) btnPuntosEquipo1.addEventListener("click", () => sumarPuntosManual(1));
  if (btnPuntosEquipo2) btnPuntosEquipo2.addEventListener("click", () => sumarPuntosManual(2));
  if (btnResetErrores) btnResetErrores.addEventListener("click", resetErrores);
  if (btnRevelar) btnRevelar.forEach(btn => btn.addEventListener("click", () => { const index = parseInt(btn.dataset.index); if (!isNaN(index)) revelarRespuesta(index); }));
  if (btnCargarRonda) btnCargarRonda.addEventListener("click", () => { renderPreguntaYRespuestas(); update(ref(db, "estadoJuego"), { respuestasReveladas: {}, errores: { 1: 0, 2: 0 }, reset: Date.now() }); });
  
  if (btnNuevaRonda) {
    btnNuevaRonda.addEventListener("click", () => {
      const preguntaActiva = preguntaInput?.value.trim();
      const respuestasCompletas = Array.from(document.querySelectorAll(".respuestaInput")).every(input => input.value.trim() !== "");
      
      if (!preguntaActiva || !respuestasCompletas) {
        mostrarAdvertenciaPregunta(() => {
          console.log("Presentador ha visto la advertencia");
        });
        return;
      }
      
      if (preguntaAnterior && preguntaActiva === preguntaAnterior) {
        alert("⚠️ ¡DEBES CAMBIAR LA PREGUNTA!\n\nNo puedes usar la misma pregunta de la ronda anterior. Escribe una pregunta nueva antes de iniciar la siguiente ronda.");
        mostrarAdvertenciaPregunta(() => {
          console.log("Presentador ha visto la advertencia - pregunta duplicada");
        });
        return;
      }
      
      if (confirm("🔄 ¿Iniciar una NUEVA RONDA? Esto reiniciará los puntos de la ronda actual.")) {
        console.log("🔄 Iniciando nueva ronda...");
        
        preguntaAnterior = preguntaActiva;
        localStorage.setItem("preguntaAnterior", preguntaAnterior);
        
        update(ref(db, "estadoJuego"), {
          respuestasReveladas: {},
          errores: { 1: 0, 2: 0 },
          scores: { 1: 0, 2: 0 },
          turno: { equipo: 1, jugadorId: null },
          fase: "ronda",
          mensajePresentador: null,
          reset: Date.now()
        });
        
        setTimeout(() => {
          update(ref(db, "estadoJuego"), {
            fase: "jugando"
          });
          console.log("✅ Nueva ronda iniciada - Volviendo a modo jugando");
        }, 3000);
        
        alert("🔄 Nueva ronda iniciada! Los puntos se han reiniciado.\n📝 Recuerda: La próxima ronda necesitarás una pregunta NUEVA.");
      }
    });
  }
  
  if (btnTerminarRonda) {
    btnTerminarRonda.addEventListener("click", () => {
      const preguntaActiva = preguntaInput?.value.trim();
      const respuestasCompletas = Array.from(document.querySelectorAll(".respuestaInput")).every(input => input.value.trim() !== "");
      
      if (!preguntaActiva || !respuestasCompletas) {
        mostrarAdvertenciaPregunta(() => {
          console.log("Presentador ha visto la advertencia");
        });
        return;
      }
      
      if (preguntaAnterior && preguntaActiva === preguntaAnterior) {
        alert("⚠️ ¡DEBES CAMBIAR LA PREGUNTA!\n\nNo puedes terminar la ronda y usar la misma pregunta. Escribe una pregunta NUEVA antes de continuar.");
        mostrarAdvertenciaPregunta(() => {
          console.log("Presentador ha visto la advertencia - pregunta duplicada en terminar ronda");
        });
        return;
      }

      if (confirm("🏁 ¿Terminar la ronda actual y pasar a la siguiente?")) {
        console.log("🏁 Terminando ronda manualmente...");
        
        preguntaAnterior = preguntaActiva;
        localStorage.setItem("preguntaAnterior", preguntaAnterior);
        
        get(ref(db, "estadoJuego")).then((snap) => {
          const data = snap.val();
          let ganadorTexto = "EMPATE";
          let ganadorNumero = 0;
          let colorGanador = "#ffcc00";
          
          if (data.scores[1] > data.scores[2]) {
            ganadorTexto = "EQUIPO 1 (VERDE)";
            ganadorNumero = 1;
            colorGanador = "#00ff80";
          } else if (data.scores[2] > data.scores[1]) {
            ganadorTexto = "EQUIPO 2 (AZUL)";
            ganadorNumero = 2;
            colorGanador = "#00ffff";
          }
          
          alert(`🏆 RONDA TERMINADA - GANÓ ${ganadorTexto} 🏆\nPuntuación final: ${data.scores[1]} - ${data.scores[2]}`);
          
          update(ref(db, "estadoJuego"), {
            respuestasReveladas: {},
            errores: { 1: 0, 2: 0 },
            scores: { 1: 0, 2: 0 },
            turno: { equipo: 1, jugadorId: null },
            fase: "ronda",
            mensajeFinalRonda: `🏆 Ronda terminada. Ganó ${ganadorTexto} con ${data.scores[ganadorNumero]} puntos. Preparando siguiente ronda...`,
            celebracionRonda: {
              activo: true,
              ganador: ganadorNumero,
              texto: ganadorTexto,
              puntos: data.scores[ganadorNumero],
              color: colorGanador
            },
            reset: Date.now()
          });
          
          setTimeout(() => {
            update(ref(db, "estadoJuego"), {
              fase: "jugando",
              mensajeFinalRonda: null,
              celebracionRonda: null
            });
            console.log("✅ Nueva ronda iniciada después de terminación manual");
          }, 6000);
          
          alert("📝 Recuerda: Para la próxima ronda, escribe una pregunta NUEVA y haz clic en 'ENVIAR PREGUNTA' antes de continuar.");
        });
      }
    });
  }
  
  // ========== JUEGO TERMINADO - CORREGIDO ==========
  if (btnJuegoTerminado) {
    btnJuegoTerminado.addEventListener("click", () => {
      if (confirm("🏆 ¿Finalizar el juego completamente? Se mostrará el ganador y los jugadores podrán salir.")) {
        console.log("🏆 Finalizando juego...");
        
        get(ref(db, "estadoJuego")).then((snap) => {
          const data = snap.val();
          const scoresGlobalActuales = data.scoresGlobal || { 1: 0, 2: 0 };
          
          update(ref(db, "estadoJuego"), {
            fase: "final",
            juegoTerminado: true,
            scoresGlobal: scoresGlobalActuales,
            reset: Date.now()
          }).then(() => {
            console.log("✅ Señal de juego terminado enviada a jugadores");
            alert("🏆 JUEGO TERMINADO - Los jugadores verán la pantalla final");
          });
        });
      }
    });
  }
  
  if (btnResetScores) {
    btnResetScores.addEventListener("click", () => {
      if (confirm("⚠️ ¿Reiniciar SOLO los puntos de esta ronda? Los puntos globales se mantendrán.")) {
        update(ref(db, "estadoJuego"), { scores: { 1: 0, 2: 0 } });
        console.log("🔄 Puntos de ronda reiniciados");
        alert("✅ Puntos de ronda reiniciados (globales intactos)");
      }
    });
  }
  
  if (btnResetGlobalScores) {
    btnResetGlobalScores.addEventListener("click", () => {
      if (confirm("⚠️ ¿Reiniciar SOLO los puntos GLOBALES? Los puntos de esta ronda se mantendrán.")) {
        update(ref(db, "estadoJuego"), { scoresGlobal: { 1: 0, 2: 0 } });
        console.log("🔄 Puntos globales reiniciados");
        alert("✅ Puntos globales reiniciados");
      }
    });
  }
  
  if (btnReiniciarTodo) {
    btnReiniciarTodo.addEventListener("click", () => {
      if (confirm("⚠️ ¿REINICIAR TODO? Se perderán todos los datos")) {
        const updates = {};
        Object.keys(jugadoresGlobal).forEach(id => { updates[`jugadores/${id}`] = null; });
        updates["estadoJuego"] = {
          turno: { equipo: null, jugadorId: null }, pausado: false, respuestasReveladas: {},
          scores: { 1: 0, 2: 0 }, scoresGlobal: { 1: 0, 2: 0 }, errores: { 1: 0, 2: 0 },
          fase: "esperando", preguntaActual: "", respuestasActuales: [], reset: Date.now()
        };
        preguntaAnterior = "";
        localStorage.removeItem("preguntaAnterior");
        update(ref(db), updates).then(() => alert("✅ Juego reseteado completamente"));
      }
    });
  }
  
  if (btnCambiarTurno) btnCambiarTurno.addEventListener("click", () => { const nuevoEquipo = turnoActual.equipo === 1 ? 2 : 1; cambiarTurno(nuevoEquipo); });
  if (btnResetRespuestas) btnResetRespuestas.addEventListener("click", () => update(ref(db, "estadoJuego"), { respuestasReveladas: {} }));
  if (btnPausarJuego) btnPausarJuego.addEventListener("click", () => update(ref(db, "estadoJuego"), { pausado: true }));
  if (btnReanudarJuego) btnReanudarJuego.addEventListener("click", () => update(ref(db, "estadoJuego"), { pausado: false }));
  
  if (btnIniciarJuegos && btnIniciarJuegos.length > 0) {
    btnIniciarJuegos.forEach((btn) => btn.addEventListener("click", async () => {
      try {
        const snapJugadores = await get(ref(db, "jugadores"));
        const jugadores = snapJugadores.val() || {};
        const primerJugadorEq1 = Object.values(jugadores).find(j => Number(j.equipo) === 1 && j.estado !== "expulsado");
        const turnoInicial = { equipo: 1, jugadorId: primerJugadorEq1?.id ?? null };
        await update(ref(db, "estadoJuego"), { fase: "jugando", turno: { equipo: 2, jugadorId: null } });
        setTimeout(async () => { await update(ref(db, "estadoJuego"), { turno: turnoInicial }); }, 80);
        alert("✅ ¡Juego iniciado! Equipo 1 comienza.");
      } catch (error) { alert("❌ Error al iniciar juego"); }
    }));
  }
});