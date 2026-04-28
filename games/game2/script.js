/* ========================================
   CRUZ ROJA - JUEGO DE SEGURIDAD EN CASA V2.0
   Archivo de Lógica JavaScript
   Ricardo Encarnacion Guerrero AL02999638
   ======================================== */

// ===== 1. MAPA DE ASSETS (IMÁGENES DE SEGURIDAD) =====
const ASSETS = {
    // Básicos
    'item-extintor': 'extintor.png',
    'item-mochila': 'mochilaemergencia.png',
    'item-botiquin': 'botiquin.png',
    'item-valvula': 'valvula.png',
    'item-riesgo': 'peligro.png',
    'item-punto': 'PuntoReunion.png',
    'item-ruta': 'ruta de salida.png',
    'item-detector': 'Detector de humo.png',

    // NUEVOS (AGREGADOS V6.0)
    'item-peligro-electrico': 'simbolo_electricidad.png',
    'item-extintor-fijo': 'extintor_fijo.png'
};

// ===== 2. VARIABLES GLOBALES DEL JUEGO =====
let currentScenario = null;
let score = 0;
let correctCount = 0;
let incorrectCount = 0;
let startTime = Date.now();
const usedItems = new Set();
let selectedItem = null;

// NUEVO: Variables para prevenir errores comunes de niños
let isProcessingClick = false; // Evita doble-clic accidental
let lastClickTime = 0; // Para debouncing

// ===== 3. DEFINICIÓN DE ESCENARIOS =====
// V8.1: DISTRIBUCIÓN COMPLETA - TODOS LOS ÍTEMS SE USAN
const SCENARIOS = {
    // --- ESCENARIO 1: CASA (MIXTO) ---
    casa: {
        id: 'casa',
        name: '🏠 Casa Familiar',
        situation: 'Sismo',
        image: 'casa.jpg',
        // V8.1: Extintor, Válvula, Mochila, Punto Reunión, Peligro Eléctrico, Riesgo
        allowedItems: [
            'item-extintor',
            'item-valvula',
            'item-mochila',
            'item-punto',
            'item-peligro-electrico',
            'item-riesgo'
        ],
        zones: {
            // COCINA -> Válvula de Gas
            'zona-cocina': {
                label: 'Cocina',
                gridColumn: '52 / 64',
                gridRow: '5 / 24',
                correctItems: ['item-valvula'],
                feedback: {
                    correct: {
                        'item-valvula': '¡Muy bien! Cierra la válvula de gas en emergencias.'
                    },
                    incorrect: {
                        default: 'Hay fuga de gas. ¿Qué necesitas cerrar?'
                    }
                }
            },
            // BAÑO -> Zona de Riesgo (Piso Mojado)
            'zona-bano': {
                label: 'Baño',
                gridColumn: '65 / 82',
                gridRow: '5 / 24',
                correctItems: ['item-riesgo'],
                feedback: {
                    correct: {
                        'item-riesgo': '¡Perfecto! Los pisos mojados son peligrosos.'
                    },
                    incorrect: {
                        default: 'El piso está mojado. ¿Cómo advertirías?'
                    }
                }
            },
            // RECÁMARA -> Peligro Eléctrico
            'zona-cuarto-electricidad': {
                label: 'Recámara',
                gridColumn: '62 / 82',
                gridRow: '31 / 57',
                correctItems: ['item-peligro-electrico'],
                feedback: {
                    correct: {
                        'item-peligro-electrico': '¡Excelente! Marca el peligro eléctrico.'
                    },
                    incorrect: {
                        default: 'Hay cables sueltos. ¿Cómo advertirías?'
                    }
                }
            },
            // PATIO ATRÁS -> Extintor Portátil
            'zona-patio-atras': {
                label: 'Patio Atrás',
                gridColumn: '84 / 100',
                gridRow: '3 / 23',
                correctItems: ['item-extintor'],
                feedback: {
                    correct: {
                        'item-extintor': '¡Correcto! El extintor apaga el fuego.'
                    },
                    incorrect: {
                        default: 'Hay fuego. ¿Qué necesitas?'
                    }
                }
            },
            // PATIO FRENTE -> Punto de Reunión
            'zona-patio-frente': {
                label: 'Punto Reunión',
                gridColumn: '2 / 15',
                gridRow: '4 / 58',
                correctItems: ['item-punto'],
                feedback: {
                    correct: {
                        'item-punto': '¡Perfecto! Aquí se reúne la familia.'
                    },
                    incorrect: {
                        default: 'Zona segura afuera. ¿Dónde se reunirán?'
                    }
                }
            },
            // SALA -> Mochila de Emergencia
            'zona-sala': {
                label: 'Sala',
                gridColumn: '20 / 50',
                gridRow: '26 / 57',
                correctItems: ['item-mochila'],
                feedback: {
                    correct: {
                        'item-mochila': '¡Correcto! Tómala al evacuar.'
                    },
                    incorrect: {
                        default: 'Salida principal. ¿Qué tomarías rápido?'
                    }
                }
            }
        }
    },

    // --- ESCENARIO 2: EDIFICIO (INCENDIO MAYOR) ---
    edificio: {
        id: 'edificio',
        name: '🏢 Edificio de Oficinas',
        situation: 'Incendio Eléctrico',
        image: 'edificio.jpg',
        // V8.1: Extintor Fijo, Botiquín, Ruta, Detector Humo, Peligro Eléctrico
        allowedItems: [
            'item-extintor-fijo',
            'item-botiquin',
            'item-ruta',
            'item-detector',
            'item-peligro-electrico'
        ],
        zones: {
            // SERVIDORES -> Peligro Eléctrico
            'zona-servidores': {
                label: 'Servidores',
                gridColumn: '3 / 34',
                gridRow: '2 / 29',
                correctItems: ['item-peligro-electrico'],
                feedback: {
                    correct: {
                        'item-peligro-electrico': '¡Muy bien! Marca el peligro eléctrico.'
                    },
                    incorrect: {
                        default: 'Chispas eléctricas. ¿Cómo advertirías?'
                    }
                }
            },
            // OFICINAS -> Detector de Humo
            'zona-oficinas': {
                label: 'Oficinas',
                gridColumn: '52 / 98',
                gridRow: '3 / 36',
                correctItems: ['item-detector'],
                feedback: {
                    correct: {
                        'item-detector': '¡Perfecto! El detector alerta temprano.'
                    },
                    incorrect: {
                        default: 'Hay humo. ¿Qué lo detectaría?'
                    }
                }
            },
            // PASILLO -> EXTINTOR FIJO (Gabinete)
            // CORRECCIÓN V8.2: Coordenadas ajustadas al pasillo horizontal inferior (donde está el gabinete rojo)
            'zona-pasillo-gabinete': {
                label: 'Pasillo',
                gridColumn: '36 / 70',
                gridRow: '40 / 59',
                correctItems: ['item-extintor-fijo'],
                feedback: {
                    correct: {
                        'item-extintor-fijo': '¡Excelente! El gabinete va en pasillos.'
                    },
                    incorrect: {
                        default: 'Aquí va el sistema fijo. ¿Qué colocarías?'
                    }
                }
            },

            'zona-sala-segura': {
                label: 'Enfermería',
                gridColumn: '3 / 33',
                gridRow: '32 / 59',
                correctItems: ['item-botiquin'],
                feedback: {
                    correct: {
                        'item-botiquin': '¡Correcto! Aquí se atienden heridos.'
                    },
                    incorrect: {
                        default: 'Zona de atención médica. ¿Qué necesitas?'
                    }
                }
            },

            'zona-escaleras': {
                label: 'Escaleras',
                gridColumn: '71 / 99',
                gridRow: '38 / 59',
                correctItems: ['item-ruta'],
                feedback: {
                    correct: {
                        'item-ruta': '¡Perfecto! Esta es la salida segura.'
                    },
                    incorrect: {
                        default: 'Única salida. ¿Qué señalizarías?'
                    }
                }
            }
        }
    },


    escuela: {
        id: 'escuela',
        name: '🏫 Escuela',
        situation: 'Fuga de Gas / Inundación',
        image: 'escuela.jpg',

        allowedItems: [
            'item-valvula',
            'item-riesgo',
            'item-ruta',
            'item-mochila',
            'item-extintor-fijo',
            'item-detector'
        ],
        zones: {

            'zona-cafeteria': {
                label: 'Cafetería',
                gridColumn: '52 / 99',
                gridRow: '3 / 36',
                correctItems: ['item-extintor-fijo', 'item-detector'],
                feedback: {
                    correct: {
                        'item-extintor-fijo': '¡Correcto! Cocinas llevan sistema fijo.',
                        'item-detector': '¡Perfecto! El detector de humo protege la cocina.'
                    },
                    incorrect: {
                        default: 'Cocina industrial. ¿Qué sistema va aquí?'
                    }
                }
            },

            'zona-salon-seguro': {
                label: 'Salón Seguro',
                gridColumn: '2 / 33',
                gridRow: '32 / 59',
                correctItems: ['item-mochila'],
                feedback: {
                    correct: {
                        'item-mochila': '¡Muy bien! La mochila va en zona segura.'
                    },
                    incorrect: {
                        default: 'Refugio. ¿Qué guardarías aquí?'
                    }
                }
            },
            // SALÓN INUNDADO -> Zona Riesgo
            'zona-salon-inundado': {
                label: 'Salón Inundado',
                gridColumn: '3 / 33',
                gridRow: '3 / 30',
                correctItems: ['item-riesgo'],
                feedback: {
                    correct: {
                        'item-riesgo': '¡Perfecto! Marca el peligro de agua.'
                    },
                    incorrect: {
                        default: 'Inundación. ¿Cómo advertirías?'
                    }
                }
            },
            // PASILLO TUBERÍA ROTA -> Válvula
            'zona-pasillo-inundado': {
                label: 'Tubería Rota',
                gridColumn: '34 / 51',
                gridRow: '2 / 60',
                correctItems: ['item-valvula'],
                feedback: {
                    correct: {
                        'item-valvula': '¡Correcto! Cierra el agua.'
                    },
                    incorrect: {
                        default: 'Agua corriendo. ¿Qué cerrarías?'
                    }
                }
            },
            // PATIO SECO -> Ruta de Evacuación
            'zona-pasillo-seco': {
                label: 'Ruta Salida',
                gridColumn: '71 / 99',
                gridRow: '38 / 60',
                correctItems: ['item-ruta'],
                feedback: {
                    correct: {
                        'item-ruta': '¡Excelente! Por aquí se evacúa.'
                    },
                    incorrect: {
                        default: 'Pasillo seco. ¿Qué señalizarías?'
                    }
                }
            }
        }
    }
};

// ===== 3. REFERENCIAS A ELEMENTOS DEL DOM =====
const startScreen = document.getElementById('startScreen');
const scenarioScreen = document.getElementById('scenarioScreen');
const gameHeader = document.getElementById('gameHeader');
const gameMain = document.getElementById('gameMain');
const scenarioTitle = document.getElementById('scenarioTitle');
const scenarioMapImage = document.getElementById('scenarioMapImage');
const interactiveZonesContainer = document.getElementById('interactiveZonesContainer');
const mascotImg = document.getElementById('mascotImage');
const mascotDialog = document.getElementById('mascotDialog');
const mascotArea = document.getElementById('mascotFeedbackArea');
const starsContainer = document.getElementById('starsContainer');
const finalScreen = document.getElementById('finalScreen');

// ===== 4. PANTALLA DE INICIO =====
function startGame() {
    // Selección aleatoria de escenario (Casa, Edificio, Escuela)
    const scenarioIds = ['casa', 'edificio', 'escuela'];
    const randomIndex = Math.floor(Math.random() * scenarioIds.length);
    const selectedScenarioId = scenarioIds[randomIndex];

    // Ocultar pantalla de inicio
    startScreen.style.display = 'none';

    // Cargar escenario seleccionado directamente (sin mostrar pantalla de selección)
    selectScenario(selectedScenarioId);
}

// ===== 5. SELECCIÓN DE ESCENARIO =====
function selectScenario(scenarioId) {
    currentScenario = SCENARIOS[scenarioId];
    if (!currentScenario) {
        console.error('Escenario no encontrado:', scenarioId);
        return;
    }

    // Ocultar pantalla de selección y mostrar juego
    scenarioScreen.style.display = 'none';
    gameHeader.style.display = 'flex';
    gameMain.style.display = 'flex';

    // Actualizar título del escenario
    scenarioTitle.textContent = `${currentScenario.name} - ${currentScenario.situation}`;

    // Cargar imagen del escenario
    scenarioMapImage.src = currentScenario.image;

    // Crear zonas interactivas
    createInteractiveZones();

    // Reiniciar variables del juego
    score = 0;
    correctCount = 0;
    incorrectCount = 0;
    usedItems.clear();
    selectedItem = null;
    startTime = Date.now();
    updateStars(0);

    // Inicializar interacciones
    initGameInteractions();

    // V2.7: Filtrar sidebar para mostrar solo items relevantes
    filterSidebarByScenario();
}

// ===== 6. CREAR ZONAS INTERACTIVAS =====
function createInteractiveZones() {
    interactiveZonesContainer.innerHTML = '';

    Object.keys(currentScenario.zones).forEach(zoneId => {
        const zoneData = currentScenario.zones[zoneId];
        const zoneElement = document.createElement('div');
        zoneElement.className = 'interactive-zone';
        zoneElement.id = zoneId;
        zoneElement.dataset.correctItems = zoneData.correctItems.join(',');

        // Agregar data-label para mostrar nombre al arrastrar
        zoneElement.dataset.label = zoneData.label;

        // NUEVO: Aplicar coordenadas de GRID en lugar de porcentajes absolutos
        if (zoneData.gridColumn && zoneData.gridRow) {
            zoneElement.style.gridColumn = zoneData.gridColumn;
            zoneElement.style.gridRow = zoneData.gridRow;
        } else if (zoneData.coords) {
            // Retrocompatibilidad para zonas antiguas (no debería usarse)
            Object.assign(zoneElement.style, {
                position: 'absolute',
                ...zoneData.coords
            });
        }

        // Agregar event listeners
        zoneElement.addEventListener('click', handleZoneClick);
        zoneElement.addEventListener('dragover', dragOver);
        zoneElement.addEventListener('drop', dropOnZone);

        // V8.0: Crear tooltip flotante para mostrar el nombre de la zona
        const labelElement = document.createElement('div');
        labelElement.className = 'zone-label';
        labelElement.textContent = zoneData.label;
        zoneElement.appendChild(labelElement);

        interactiveZonesContainer.appendChild(zoneElement);
    });
}

// ===== 6B. FILTRAR SIDEBAR POR ESCENARIO =====
// V2.7: Mostrar solo los items permitidos en el escenario actual
function filterSidebarByScenario() {
    const draggableItems = document.querySelectorAll('.draggable-item');
    const allowedItems = currentScenario.allowedItems || [];

    draggableItems.forEach(item => {
        if (allowedItems.includes(item.id)) {
            item.style.display = 'flex'; // Mostrar item
            // Resetear estado usado
            item.classList.remove('used');
            item.style.display = 'flex';
        } else {
            item.style.display = 'none'; // Ocultar item no relevante
        }
    });
}

// ===== 7. INICIALIZAR INTERACCIONES DEL JUEGO =====
function initGameInteractions() {
    const draggableItems = document.querySelectorAll('.draggable-item');

    draggableItems.forEach(item => {
        // Drag and drop
        item.addEventListener('dragstart', dragStart);
        item.addEventListener('dragend', dragEnd);

        // Click/touch para móviles
        item.addEventListener('click', handleItemClick);
    });
}

// ===== 8. FUNCIONES DE DRAG AND DROP =====
function dragStart(e) {
    if (this.classList.contains('used')) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.id);
    this.classList.add('dragging');

    // NUEVO: Activar visualización de nombres de habitaciones
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.add('show-hints');
        mapContainer.classList.add('dragging-active'); // Activar glow global
    }

    highlightCompatibleZones(this.id);
}

function dragEnd(e) {
    this.classList.remove('dragging');

    // NUEVO: Desactivar visualización de nombres
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.remove('show-hints');
        mapContainer.classList.remove('dragging-active'); // Desactivar glow global
    }

    clearZoneHighlights();
}

function dragOver(e) {
    e.preventDefault();
}

function dropOnZone(e) {
    e.preventDefault();
    e.stopPropagation();

    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;

    const zoneId = this.id;
    validateAndPlaceItem(itemId, zoneId);
}

// ===== 9. FUNCIONES DE CLICK/TOUCH =====
function handleItemClick(e) {
    const item = e.currentTarget;

    // NUEVO: Prevenir doble-clic rápido (debouncing para niños)
    const now = Date.now();
    if (now - lastClickTime < 300) { // 300ms de protección
        return;
    }
    lastClickTime = now;

    // NUEVO: Feedback amigable si el item ya fue usado
    if (item.classList.contains('used')) {
        showMascotReaction(false, '¡Ya usaste este objeto! 😊 Elige otro que aún no hayas colocado.');
        // Animación de "sacudida" para indicar que no se puede usar
        item.style.animation = 'none';
        setTimeout(() => {
            item.style.animation = 'shake 0.5s';
        }, 10);
        return;
    }

    // Deseleccionar si ya estaba seleccionado
    if (selectedItem === item) {
        selectedItem.classList.remove('mobile-selected');
        selectedItem = null;
        clearZoneHighlights();

        // NUEVO: Desactivar show-hints al deseleccionar
        const mapContainer = document.getElementById('scenarioMapContainer');
        if (mapContainer) {
            mapContainer.classList.remove('show-hints');
        }
        return;
    }

    // Deseleccionar item anterior
    if (selectedItem) {
        selectedItem.classList.remove('mobile-selected');
    }

    // Seleccionar nuevo item
    selectedItem = item;
    item.classList.add('mobile-selected');

    // NUEVO: Activar show-hints al seleccionar
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.add('show-hints');
    }

    highlightCompatibleZones(item.id);
}

function handleZoneClick(e) {
    if (!selectedItem) return;

    const itemId = selectedItem.id;
    const zoneId = this.id;

    validateAndPlaceItem(itemId, zoneId);

    // Limpiar selección
    if (selectedItem) {
        selectedItem.classList.remove('mobile-selected');
        selectedItem = null;
    }

    // NUEVO: Desactivar show-hints después de colocar
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.remove('show-hints');
    }

    clearZoneHighlights();
}

// ===== 10. RESALTAR ZONAS COMPATIBLES =====
function highlightCompatibleZones(itemId) {
    const zones = document.querySelectorAll('.interactive-zone');

    zones.forEach(zone => {
        const correctItems = zone.dataset.correctItems.split(',');
        zone.classList.add('zone-highlighted');

        if (correctItems.includes(itemId)) {
            zone.classList.add('zone-compatible', 'zone-preview'); // V2.6: Agregar preview visual
        } else {
            zone.classList.add('zone-incompatible');
        }
    });
}

function clearZoneHighlights() {
    const zones = document.querySelectorAll('.interactive-zone');
    zones.forEach(zone => {
        zone.classList.remove('zone-highlighted', 'zone-compatible', 'zone-incompatible', 'zone-preview'); // V2.6: Limpiar preview
    });
}

// V2.6: FUNCIONES DE PREVISUALIZACIÓN DE ZONAS
function showZonePreview(zoneId) {
    clearZonePreview(); // Limpiar previews anteriores
    const zone = document.getElementById(zoneId);
    if (zone) {
        zone.classList.add('zone-preview');
    }
}

function clearZonePreview() {
    const zones = document.querySelectorAll('.interactive-zone');
    zones.forEach(zone => {
        zone.classList.remove('zone-preview');
    });
}

// ===== 11. VALIDAR Y COLOCAR ITEM =====
function validateAndPlaceItem(itemId, zoneId) {
    // NUEVO: Prevenir procesamiento múltiple simultáneo
    if (isProcessingClick) {
        return;
    }
    isProcessingClick = true;

    const item = document.getElementById(itemId);
    const zone = document.getElementById(zoneId);

    if (!item || !zone || usedItems.has(itemId)) {
        isProcessingClick = false;
        return;
    }

    const zoneData = currentScenario.zones[zoneId];
    const isCorrect = zoneData.correctItems.includes(itemId);

    // Marcar item como usado
    item.classList.add('used');
    item.style.display = 'none';
    usedItems.add(itemId);

    if (isCorrect) {
        handleCorrectPlacement(itemId, zoneId, zone, zoneData);
    } else {
        handleIncorrectPlacement(itemId, zoneId, zone, zoneData);
    }

    // Verificar si el juego terminó
    checkGameEnd();

    // NUEVO: Liberar el lock de procesamiento después de un pequeño delay
    setTimeout(() => {
        isProcessingClick = false;
    }, 500);
}

// ===== 12. MANEJO DE COLOCACIÓN CORRECTA =====
function handleCorrectPlacement(itemId, zoneId, zoneElement, zoneData) {
    correctCount++;

    // V7.0: Usar objeto ASSETS para obtener la ruta de la imagen
    const placedIcon = document.createElement('div');
    placedIcon.className = 'placed-item-icon';

    // Crear elemento imagen desde ASSETS
    if (ASSETS[itemId]) {
        const img = document.createElement('img');
        img.src = ASSETS[itemId];
        img.alt = itemId.replace('item-', '');
        placedIcon.appendChild(img);
    } else {
        // Fallback si no existe en ASSETS
        placedIcon.textContent = '❓';
    }

    // V7.0: Sin posicionamiento manual - el flexbox del padre lo centra automáticamente
    zoneElement.appendChild(placedIcon);

    // NUEVO: Feedback visual - Verde para correcto (1 segundo)
    zoneElement.classList.add('zone-correct');
    setTimeout(() => {
        zoneElement.classList.remove('zone-correct');
    }, 1000);

    // Feedback ambiental - Fondo verde del mapa
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.add('feedback-success');
        setTimeout(() => {
            mapContainer.classList.remove('feedback-success');
        }, 1000);
    }

    // Obtener mensaje de feedback
    const feedbackMessage = zoneData.feedback.correct[itemId] || '¡Muy bien!';
    showMascotReaction(true, feedbackMessage);

    // Actualizar puntuación
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeBonus = Math.max(0, 300 - elapsed);
    score += 100 + timeBonus;

    // Actualizar estrellas basado en porcentaje
    updateStarsBasedOnScore();
}

// ===== 12B. POSICIONAMIENTO ESTÉTICO AUTOMÁTICO =====
function getAestheticPosition(itemId, zoneElement) {
    // V2.5: ZONA DE RESTRICCIÓN MÁS CONSERVADORA: 40%-60% para GARANTIZAR que NUNCA se salgan
    // Reducido de 30%-70% para compensar el transform: translate(-50%, -50%)
    const positionRules = {
        // Extintores y equipos de seguridad
        'item-extintor': { top: '45%', left: '60%', transform: 'translate(-50%, -50%)' },
        'item-extintor-fijo': { top: '45%', left: '60%', transform: 'translate(-50%, -50%)' },

        // Botiquín
        'item-botiquin': { top: '40%', left: '40%', transform: 'translate(-50%, -50%)' },

        // Rutas y señalizaciones: centradas
        'item-ruta': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'item-punto': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },

        // Mochila de emergencia
        'item-mochila': { top: '45%', left: '40%', transform: 'translate(-50%, -50%)' },

        // Advertencias de peligro: centradas
        'item-peligro-electrico': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'item-riesgo': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },

        // Válvulas
        'item-valvula': { top: '55%', left: '40%', transform: 'translate(-50%, -50%)' },

        // Detector de humo
        'item-detector': { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }
    };

    // Retornar posición específica o posición SUPER SEGURA centrada
    if (positionRules[itemId]) {
        return positionRules[itemId];
    } else {
        // V2.5: ZONA MÁS SEGURA: Solo entre 45% y 55% (centro absoluto estricto)
        const randomOffset = Math.random() * 6 - 3; // -3% a +3% (reducido de -5% a +5%)
        const safeTop = Math.max(45, Math.min(55, 50 + randomOffset)); // Limitar entre 45% y 55%
        const safeLeft = Math.max(45, Math.min(55, 50 + randomOffset)); // Limitar entre 45% y 55%
        return {
            top: `${safeTop}%`,
            left: `${safeLeft}%`,
            transform: 'translate(-50%, -50%)'
        };
    }
}


// ===== 13. MANEJO DE COLOCACIÓN INCORRECTA =====
function handleIncorrectPlacement(itemId, zoneId, zoneElement, zoneData) {
    incorrectCount++;

    // V7.0: Usar objeto ASSETS para obtener la ruta de la imagen
    const placedIcon = document.createElement('div');
    placedIcon.className = 'placed-item-icon';

    // Crear elemento imagen desde ASSETS
    if (ASSETS[itemId]) {
        const img = document.createElement('img');
        img.src = ASSETS[itemId];
        img.alt = itemId.replace('item-', '');
        placedIcon.appendChild(img);
    } else {
        // Fallback si no existe en ASSETS
        placedIcon.textContent = '❓';
    }

    // V7.0: Aplicar estilo de error (sin posicionamiento manual)
    placedIcon.style.opacity = '0.5';
    placedIcon.style.filter = 'grayscale(0.8)';
    zoneElement.appendChild(placedIcon);

    // NUEVO: Feedback visual - Rojo para incorrecto (1 segundo)
    zoneElement.classList.add('zone-incorrect');
    setTimeout(() => {
        zoneElement.classList.remove('zone-incorrect');
    }, 1000);

    // Feedback ambiental - Fondo rojo del mapa
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.add('feedback-error');
        setTimeout(() => {
            mapContainer.classList.remove('feedback-error');
        }, 1000);
    }

    // Obtener mensaje de feedback específico o genérico
    let feedbackMessage = zoneData.feedback.incorrect[itemId] || zoneData.feedback.incorrect.default || 'Ese no es el lugar correcto. ¡Piensa bien!';
    showMascotReaction(false, feedbackMessage);

    // Penalización
    score = Math.max(0, score - 10);
}

// ===== 14. SISTEMA DE FEEDBACK DE LA MASCOTA =====
let mascotTimeout;

function showMascotReaction(isCorrect, message) {
    clearTimeout(mascotTimeout);
    mascotArea.classList.remove('active', 'mobile-overlay');
    void mascotArea.offsetWidth; // Forzar reflow

    const isMobile = window.innerWidth <= 768;

    if (isCorrect) {
        mascotImg.src = "pulgararriba.png";
        mascotDialog.className = 'mascot-dialog success';
    } else {
        mascotImg.src = "pulgarabajo.png";
        mascotDialog.className = 'mascot-dialog error';
    }

    mascotDialog.textContent = message;

    if (isMobile) {
        mascotArea.classList.add('mobile-overlay');
    }

    mascotArea.classList.add('active');

    const hideDelay = isMobile ? 3500 : 3000;
    mascotTimeout = setTimeout(() => {
        mascotArea.classList.remove('active', 'mobile-overlay');
    }, hideDelay);
}

// ===== 15. SISTEMA DE ESTRELLAS =====
function updateStars(count) {
    const stars = starsContainer.children;
    for (let i = 0; i < stars.length; i++) {
        if (i < count) {
            stars[i].classList.remove('empty');
            stars[i].classList.add('filled');
        } else {
            stars[i].classList.remove('filled');
            stars[i].classList.add('empty');
        }
    }
}

// ===== 16. VERIFICAR FIN DEL JUEGO =====
function checkGameEnd() {
    // V2.7: El juego SOLO termina cuando se han usado TODOS los items PERMITIDOS en este escenario
    const allowedItems = currentScenario.allowedItems || [];
    const totalItemsNeeded = allowedItems.length;

    // Verificar si TODOS los items permitidos fueron usados
    if (usedItems.size === totalItemsNeeded) {
        setTimeout(() => {
            showFinalScreen();
        }, 1500);
    }
}

// ===== 16B. ACTUALIZAR ESTRELLAS BASADO EN PORCENTAJE =====
// V7.0: Calcula estrellas basándose en el total de ZONAS del nivel, no en total de ítems
function updateStarsBasedOnScore() {
    // Obtener el total de zonas del escenario actual
    const totalZonasNivel = Object.keys(currentScenario.zones).length;

    if (totalZonasNivel === 0) {
        updateStars(0);
        return;
    }

    // Calcular porcentaje de aciertos basado en zonas correctas
    const porcentaje = (correctCount / totalZonasNivel) * 100;

    // V7.0: Sistema de estrellas proporcional y justo
    let stars = 0;

    if (porcentaje > 0 && porcentaje < 40) {
        stars = 0; // 0 estrellas: menos del 40% correcto
    } else if (porcentaje >= 40 && porcentaje < 70) {
        stars = 1; // 1 estrella: 40-69% correcto
    } else if (porcentaje >= 70 && porcentaje < 95) {
        stars = 2; // 2 estrellas: 70-94% correcto
    } else if (porcentaje >= 95) {
        stars = 3; // 3 estrellas: 95-100% correcto (casi perfecto)
    }

    updateStars(stars);
}

// ===== 17. PANTALLA FINAL =====
function showFinalScreen() {
    const total = correctCount + incorrectCount;
    const average = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Mensajes personalizados SIN emojis (solo texto)
    let celebrationMessage = '';

    if (average >= 90) {
        celebrationMessage = '¡INCREÍBLE! ¡Eres un experto en seguridad!';
    } else if (average >= 70) {
        celebrationMessage = '¡MUY BIEN! ¡Aprendiste mucho!';
    } else if (average >= 50) {
        celebrationMessage = '¡BUEN TRABAJO! ¡Sigue practicando!';
    } else {
        celebrationMessage = '¡SIGUE INTENTANDO! ¡Tú puedes mejorar!';
    }

    // Actualizar contenido de la pantalla final (SOLO TEXTO)
    const finalContent = document.querySelector('.final-content h2');
    if (finalContent) {
        finalContent.textContent = celebrationMessage; // Sin emojis
    }

    document.getElementById('finalAverage').textContent = average + '%';
    document.getElementById('statCorrect').textContent = `Correctas: ${correctCount}`;
    document.getElementById('statIncorrect').textContent = `Incorrectas: ${incorrectCount}`;
    document.getElementById('finalScore').textContent = `Puntuación: ${score}`;

    finalScreen.style.display = 'flex';

    // Animación de celebración
    finalScreen.classList.add('celebration-active');
}

// ===== 18. REINICIAR JUEGO =====
function restartGame() {
    location.reload();
}

// ===== 18B. SISTEMA DE PISTAS ELIMINADO =====
// La función showHint() fue eliminada porque revelaba las respuestas
// El botón de pistas también fue removido del HTML
/*
function showHint() {
    // FUNCIÓN ELIMINADA - No se deben revelar respuestas
}
*/

// ===== 19. INICIALIZACIÓN =====
window.addEventListener('load', () => {
    gameHeader.style.display = 'none';
    gameMain.style.display = 'none';
    scenarioScreen.style.display = 'none';
});

// ===== DEBUG TEMPORAL - ACTIVAR PARA VER ZONAS =====
// Descomenta la siguiente línea para ver las zonas siempre con bordes rojos
// document.body.classList.add('debug-mode');

// Función de ayuda para debugging
window.debugZones = function () {
    const zones = document.querySelectorAll('.interactive-zone');
    console.log('=== DEBUG: ZONAS INTERACTIVAS ===');
    console.log('Total de zonas:', zones.length);
    zones.forEach((zone, i) => {
        console.log(`Zona ${i + 1}:`, {
            id: zone.id,
            label: zone.dataset.label,
            coords: {
                top: zone.style.top,
                left: zone.style.left,
                width: zone.style.width,
                height: zone.style.height
            }
        });
    });
    console.log('=================================');
};
