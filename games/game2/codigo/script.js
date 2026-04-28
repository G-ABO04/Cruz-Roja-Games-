/* ========================================
   CRUZ ROJA - JUEGO DE SEGURIDAD EN CASA V FINAL
   Archivo de Lógica JavaScript
   Ricardo Encarnacion Guerrero AL02999638
   ======================================== */
const ASSETS = {

    'item-extintor': 'iconos/extintor.png',
    'item-mochila': 'iconos/mochilaemergencia.png',
    'item-botiquin': 'iconos/botiquin.png',
    'item-valvula': 'iconos/valvula.png',
    'item-riesgo': 'iconos/peligro.png',
    'item-punto': 'iconos/PuntoReunion.png',
    'item-ruta': 'iconos/ruta de salida.png',
    'item-detector': 'iconos/Detector de humo.png',


    'item-peligro-electrico': 'iconos/simbolo_electricidad.png',
    'item-extintor-fijo': 'iconos/extintor_fijo.png'
};
let currentScenario = null;
let score = 0;
let correctCount = 0;
let incorrectCount = 0;
let startTime = Date.now();
const usedItems = new Set();
let selectedItem = null;

let isProcessingClick = false;
let lastClickTime = 0;
const SCENARIOS = {
    casa: {
        id: 'casa',
        name: '🏠 Casa Familiar',
        situation: 'Sismo',
        image: 'fotos/casa.jpg',

        allowedItems: [
            'item-extintor',
            'item-valvula',
            'item-mochila',
            'item-punto',
            'item-peligro-electrico',
            'item-riesgo'
        ],
        zones: {

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


    edificio: {
        id: 'edificio',
        name: '🏢 Edificio de Oficinas',
        situation: 'Incendio Eléctrico',
        image: 'fotos/edificio.jpg',
        allowedItems: [
            'item-extintor-fijo',
            'item-botiquin',
            'item-ruta',
            'item-detector',
            'item-peligro-electrico'
        ],
        zones: {

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
        image: 'fotos/escuela.jpg',
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

function startGame() {
    const scenarioIds = ['casa', 'edificio', 'escuela'];
    const randomIndex = Math.floor(Math.random() * scenarioIds.length);
    const selectedScenarioId = scenarioIds[randomIndex];
    startScreen.style.display = 'none';

    selectScenario(selectedScenarioId);
}

function selectScenario(scenarioId) {
    currentScenario = SCENARIOS[scenarioId];
    if (!currentScenario) {
        console.error('Escenario no encontrado:', scenarioId);
        return;
    }

    scenarioScreen.style.display = 'none';
    gameHeader.style.display = 'flex';
    gameMain.style.display = 'flex';
    scenarioTitle.textContent = `${currentScenario.name} - ${currentScenario.situation}`;

    scenarioMapImage.src = currentScenario.image;

    createInteractiveZones();

    score = 0;
    correctCount = 0;
    incorrectCount = 0;
    usedItems.clear();
    selectedItem = null;
    startTime = Date.now();
    updateStars(0);

    initGameInteractions();

    filterSidebarByScenario();

    // Iniciar el sistema ¿Sabías que? para este mapa
    iniciarSabiasQue();
}
function createInteractiveZones() {
    interactiveZonesContainer.innerHTML = '';

    Object.keys(currentScenario.zones).forEach(zoneId => {
        const zoneData = currentScenario.zones[zoneId];
        const zoneElement = document.createElement('div');
        zoneElement.className = 'interactive-zone';
        zoneElement.id = zoneId;
        zoneElement.dataset.correctItems = zoneData.correctItems.join(',');

        zoneElement.dataset.label = zoneData.label;

        if (zoneData.gridColumn && zoneData.gridRow) {
            zoneElement.style.gridColumn = zoneData.gridColumn;
            zoneElement.style.gridRow = zoneData.gridRow;
        } else if (zoneData.coords) {
            Object.assign(zoneElement.style, {
                position: 'absolute',
                ...zoneData.coords
            });
        }

        zoneElement.addEventListener('click', handleZoneClick);
        zoneElement.addEventListener('dragover', dragOver);
        zoneElement.addEventListener('drop', dropOnZone);
        const labelElement = document.createElement('div');
        labelElement.className = 'zone-label';
        labelElement.textContent = zoneData.label;
        zoneElement.appendChild(labelElement);

        interactiveZonesContainer.appendChild(zoneElement);
    });
}

function filterSidebarByScenario() {
    const draggableItems = document.querySelectorAll('.draggable-item');
    const allowedItems = currentScenario.allowedItems || [];

    draggableItems.forEach(item => {
        if (allowedItems.includes(item.id)) {
            item.style.display = 'flex';
            item.classList.remove('used');
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function initGameInteractions() {
    const draggableItems = document.querySelectorAll('.draggable-item');

    draggableItems.forEach(item => {
        item.addEventListener('dragstart', dragStart);
        item.addEventListener('dragend', dragEnd);

        item.addEventListener('click', handleItemClick);
    });
}

function dragStart(e) {
    if (this.classList.contains('used')) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.id);
    this.classList.add('dragging');

    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.add('show-hints');
        mapContainer.classList.add('dragging-active');
    }

    highlightCompatibleZones(this.id);
}

function dragEnd(e) {
    this.classList.remove('dragging');

    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.remove('show-hints');
        mapContainer.classList.remove('dragging-active');
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

function handleItemClick(e) {
    const item = e.currentTarget;

    const now = Date.now();
    if (now - lastClickTime < 300) {
        return;
    }
    lastClickTime = now;

    if (item.classList.contains('used')) {
        showMascotReaction(false, '¡Ya usaste este objeto! 😊 Elige otro que aún no hayas colocado.');
        item.style.animation = 'none';
        setTimeout(() => {
            item.style.animation = 'shake 0.5s';
        }, 10);
        return;
    }

    if (selectedItem === item) {
        selectedItem.classList.remove('mobile-selected');
        selectedItem = null;
        clearZoneHighlights();

        const mapContainer = document.getElementById('scenarioMapContainer');
        if (mapContainer) {
            mapContainer.classList.remove('show-hints');
        }
        return;
    }

    if (selectedItem) {
        selectedItem.classList.remove('mobile-selected');
    }
    selectedItem = item;
    item.classList.add('mobile-selected');

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

    if (selectedItem) {
        selectedItem.classList.remove('mobile-selected');
        selectedItem = null;
    }
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.remove('show-hints');
    }

    clearZoneHighlights();
}

function highlightCompatibleZones(itemId) {
    const zones = document.querySelectorAll('.interactive-zone');

    zones.forEach(zone => {
        const correctItems = zone.dataset.correctItems.split(',');
        zone.classList.add('zone-highlighted');

        if (correctItems.includes(itemId)) {
            zone.classList.add('zone-compatible', 'zone-preview');
        } else {
            zone.classList.add('zone-incompatible');
        }
    });
}

function clearZoneHighlights() {
    const zones = document.querySelectorAll('.interactive-zone');
    zones.forEach(zone => {
        zone.classList.remove('zone-highlighted', 'zone-compatible', 'zone-incompatible', 'zone-preview');
    });
}

function showZonePreview(zoneId) {
    clearZonePreview();
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

function validateAndPlaceItem(itemId, zoneId) {
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

    item.classList.add('used');
    item.style.display = 'none';
    usedItems.add(itemId);

    if (isCorrect) {
        handleCorrectPlacement(itemId, zoneId, zone, zoneData);
    } else {
        handleIncorrectPlacement(itemId, zoneId, zone, zoneData);
    }

    checkGameEnd();

    setTimeout(() => {
        isProcessingClick = false;
    }, 500);
}

function handleCorrectPlacement(itemId, zoneId, zoneElement, zoneData) {
    correctCount++;

    const placedIcon = document.createElement('div');
    placedIcon.className = 'placed-item-icon';

    if (ASSETS[itemId]) {
        const img = document.createElement('img');
        img.src = ASSETS[itemId];
        img.alt = itemId.replace('item-', '');
        placedIcon.appendChild(img);
    } else {
        placedIcon.textContent = '❓';
    }

    zoneElement.appendChild(placedIcon);


    zoneElement.classList.add('zone-correct');
    setTimeout(() => {
        zoneElement.classList.remove('zone-correct');
    }, 1000);

    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.add('feedback-success');
        setTimeout(() => {
            mapContainer.classList.remove('feedback-success');
        }, 1000);
    }

    const feedbackMessage = zoneData.feedback.correct[itemId] || '¡Muy bien!';
    showMascotReaction(true, feedbackMessage);

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const timeBonus = Math.max(0, 300 - elapsed);
    score += 100 + timeBonus;

    updateStarsBasedOnScore();
}

function getAestheticPosition(itemId, zoneElement) {
    const positionRules = {
        'item-extintor': { top: '45%', left: '60%', transform: 'translate(-50%, -50%)' },
        'item-extintor-fijo': { top: '45%', left: '60%', transform: 'translate(-50%, -50%)' },

        'item-botiquin': { top: '40%', left: '40%', transform: 'translate(-50%, -50%)' },

        'item-ruta': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'item-punto': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },

        'item-mochila': { top: '45%', left: '40%', transform: 'translate(-50%, -50%)' },
        'item-mochila': { top: '45%', left: '40%', transform: 'translate(-50%, -50%)' },

        'item-peligro-electrico': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'item-riesgo': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },

        'item-valvula': { top: '55%', left: '40%', transform: 'translate(-50%, -50%)' },

        'item-detector': { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }
    };

    if (positionRules[itemId]) {
        return positionRules[itemId];
    } else {
        const randomOffset = Math.random() * 6 - 3;
        const safeTop = Math.max(45, Math.min(55, 50 + randomOffset));
        const safeLeft = Math.max(45, Math.min(55, 50 + randomOffset));
        return {
            top: `${safeTop}%`,
            left: `${safeLeft}%`,
            transform: 'translate(-50%, -50%)'
        };
    }
}

function handleIncorrectPlacement(itemId, zoneId, zoneElement, zoneData) {
    incorrectCount++;

    const placedIcon = document.createElement('div');
    placedIcon.className = 'placed-item-icon';

    if (ASSETS[itemId]) {
        const img = document.createElement('img');
        img.src = ASSETS[itemId];
        img.alt = itemId.replace('item-', '');
        placedIcon.appendChild(img);
    } else {
        placedIcon.textContent = '❓';
    }

    placedIcon.style.opacity = '0.5';
    placedIcon.style.filter = 'grayscale(0.8)';
    zoneElement.appendChild(placedIcon);

    zoneElement.classList.add('zone-incorrect');
    setTimeout(() => {
        zoneElement.classList.remove('zone-incorrect');
    }, 1000);
    const mapContainer = document.getElementById('scenarioMapContainer');
    if (mapContainer) {
        mapContainer.classList.add('feedback-error');
        setTimeout(() => {
            mapContainer.classList.remove('feedback-error');
        }, 1000);
    }

    let feedbackMessage = zoneData.feedback.incorrect[itemId] || zoneData.feedback.incorrect.default || 'Ese no es el lugar correcto. ¡Piensa bien!';
    showMascotReaction(false, feedbackMessage);

    score = Math.max(0, score - 10);
}


let mascotTimeout;

function showMascotReaction(isCorrect, message) {
    clearTimeout(mascotTimeout);
    mascotArea.classList.remove('active', 'mobile-overlay');
    void mascotArea.offsetWidth;

    const isMobile = window.innerWidth <= 768;

    if (isCorrect) {
        mascotImg.src = "iconos/pulgararriba.png";
        mascotDialog.className = 'mascot-dialog success';
    } else {
        mascotImg.src = "iconos/pulgarabajo.png";
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

function checkGameEnd() {
    const allowedItems = currentScenario.allowedItems || [];
    const totalItemsNeeded = allowedItems.length;

    if (usedItems.size === totalItemsNeeded) {
        setTimeout(() => {
            showFinalScreen();
        }, 1500);
    }
}

function updateStarsBasedOnScore() {
    const totalZonasNivel = Object.keys(currentScenario.zones).length;

    if (totalZonasNivel === 0) {
        updateStars(0);
        return;
    }

    const porcentaje = (correctCount / totalZonasNivel) * 100;

    let stars = 0;

    if (porcentaje > 0 && porcentaje < 40) {
        stars = 0;
    } else if (porcentaje >= 40 && porcentaje < 70) {
        stars = 1;
    } else if (porcentaje >= 70 && porcentaje < 95) {
        stars = 2;
    } else if (porcentaje >= 95) {
        stars = 3;
    }

    updateStars(stars);
}

function showFinalScreen() {
    // Detener el personaje ¿Sabías que? al terminar el juego
    detenerSabiasQue();

    const total = correctCount + incorrectCount;
    const average = total > 0 ? Math.round((correctCount / total) * 100) : 0;

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

    const finalContent = document.querySelector('.final-content h2');
    if (finalContent) {
        finalContent.textContent = celebrationMessage;
    }

    document.getElementById('finalAverage').textContent = average + '%';
    document.getElementById('statCorrect').textContent = `Correctas: ${correctCount}`;
    document.getElementById('statIncorrect').textContent = `Incorrectas: ${incorrectCount}`;
    document.getElementById('finalScore').textContent = `Puntuación: ${score}`;

    finalScreen.style.display = 'flex';

    finalScreen.classList.add('celebration-active');
}

function restartGame() {
    detenerSabiasQue();
    location.reload();
}


function showHint() {

}


window.addEventListener('load', () => {
    gameHeader.style.display = 'none';
    gameMain.style.display = 'none';
    scenarioScreen.style.display = 'none';
});


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

/* =====================================================
   SISTEMA "¿SABÍAS QUE?" - PERSONAJE MUJER
   Muestra un dato educativo aleatorio cada 30 segundos
   ===================================================== */

const SABIAS_QUE_DATOS = [
    '¿Sabías que... la Cruz Roja nació hace más de 160 años? Su misión es ayudar a cualquier persona que lo necesite, sin importar de dónde sea.',
    '¿Sabías que... el número de emergencias es el 911? Es un número muy importante y solo debe usarse cuando alguien necesita ayuda real y urgente.',
    '¿Sabías que... los voluntarios de la Cruz Roja no solo viajan en ambulancias? También ayudan a rescatar mascotas y a llevar comida cuando hay desastres naturales.',
    '¿Sabías que... la Cruz Roja y la Media Luna Roja significan exactamente lo mismo? Son símbolos internacionales que dicen "¡Aquí te ayudamos y te protegemos!".',
    '¿Sabías que... el humo de un incendio siempre sube hacia el techo? Por eso, para salir a salvo de un lugar con humo, debes caminar agachadito o gateando.',
    '¿Sabías que... el agua y la electricidad no son amigos? Nunca debes tocar un enchufe, un cable o un aparato eléctrico si tienes las manos mojadas.',
    '¿Sabías que... un extintor rojo sirve para apagar fuegos comunes, pero hay otros tipos de extintores para fuegos eléctricos? ¡Por eso es importante que los usen los adultos!',
    '¿Sabías que... tu casa debe tener un "Punto de Reunión"? Es un lugar seguro afuera donde tu familia debe encontrarse si hay una emergencia.',
    '¿Sabías que... si te raspas la rodilla, lo mejor es lavarla solo con agua limpia y jabón? No necesitas ponerle cosas que ardan.',
    '¿Sabías que... un botiquín de primeros auxilios no debe parecer una caja de juguetes? Debe estar en un lugar seguro donde los más pequeños o las mascotas no lo alcancen.',
    '¿Sabías que... tu cuerpo es súper inteligente? Cuando te haces un pequeño corte, tu propia sangre crea una "costra" que funciona como una curita natural para protegerte.'
];

// Estado del sistema ¿Sabías que?
let sabiasQueIndices = [];       // Cola aleatoria de índices
let sabiasQueIntervalId = null;  // ID del intervalo de 30 segundos
let sabiasQueTimeoutId = null;   // ID del timeout para ocultar el personaje

/**
 * Genera una cola aleatoria de todos los índices (shuffle de Fisher-Yates)
 * Cuando se acaba la cola, se regenera para evitar repetición inmediata.
 */
function generarColaSabiasQue() {
    const indices = SABIAS_QUE_DATOS.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

/**
 * Muestra el personaje asomándose con un dato educativo aleatorio.
 * Permanece visible 15 segundos y luego se oculta.
 * Tras 5 segundos de pausa, aparece de nuevo con otro dato.
 */
function mostrarSabiasQue() {
    // Si no hay indices en la cola, regenerar
    if (sabiasQueIndices.length === 0) {
        sabiasQueIndices = generarColaSabiasQue();
    }

    const indice = sabiasQueIndices.pop();
    const texto = SABIAS_QUE_DATOS[indice];

    const container = document.getElementById('sabiasQueContainer');
    const textEl = document.getElementById('sabiasQueText');

    if (!container || !textEl) return;

    // Separar "¿Sabías que..." del resto para colorearlo solo a él
    const marcador = '¿Sabías que...';
    let html;
    if (texto.startsWith(marcador)) {
        const resto = texto.slice(marcador.length);
        html = `<span class="sabias-que-label">${marcador}</span>${resto}`;
    } else {
        html = texto;
    }
    textEl.innerHTML = html;
    container.style.display = 'flex';

    // Pequeño delay para que el browser procese el display antes de la transición
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            container.classList.add('peek-in');
        });
    });

    // Limpiar cualquier timeout previo
    clearTimeout(sabiasQueTimeoutId);

    // Después de 15 segundos, ocultar el personaje
    sabiasQueTimeoutId = setTimeout(() => {
        ocultarSabiasQue();
    }, 15000);
}

/**
 * Desliza al personaje fuera del panel y luego lo oculta.
 * Tras 5 segundos de pausa, programa el siguiente dato.
 */
function ocultarSabiasQue() {
    const container = document.getElementById('sabiasQueContainer');
    if (!container) return;

    container.classList.remove('peek-in');

    // Esperar transición de salida (0.7s) + pausa de 5s antes del próximo dato
    sabiasQueTimeoutId = setTimeout(() => {
        container.style.display = 'none';
        // 5 segundos de pausa antes de mostrar el siguiente dato
        sabiasQueTimeoutId = setTimeout(() => {
            mostrarSabiasQue();
        }, 5000);
    }, 700);
}

/**
 * Arranca el ciclo de ¿Sabías que?:
 * - Primera aparición a los 4 segundos de iniciar el mapa
 * - Luego: 15 segundos visible → 5 segundos pausa → siguiente dato
 */
function iniciarSabiasQue() {
    detenerSabiasQue(); // limpiar si ya había uno corriendo

    const container = document.getElementById('sabiasQueContainer');
    if (container) container.style.display = 'none';

    // Inicializar cola aleatoria
    sabiasQueIndices = generarColaSabiasQue();

    // Primera aparición a los 4 segundos de iniciar el mapa
    sabiasQueTimeoutId = setTimeout(() => {
        mostrarSabiasQue();
        // El ciclo continúa automáticamente: mostrar -> 15s -> ocultar -> 5s -> mostrar...
    }, 4000);
}

/**
 * Detiene el ciclo de ¿Sabías que? y oculta el personaje (para reiniciar).
 */
function detenerSabiasQue() {
    clearInterval(sabiasQueIntervalId);
    clearTimeout(sabiasQueTimeoutId);
    sabiasQueIntervalId = null;
    sabiasQueTimeoutId = null;

    const container = document.getElementById('sabiasQueContainer');
    if (container) {
        container.classList.remove('peek-in');
        container.style.display = 'none';
    }
}
