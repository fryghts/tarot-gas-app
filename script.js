// Определяем ResultScreen в глобальной области видимости (window),
// чтобы HTML-атрибут onclick мог найти его функции.
window.ResultScreen = {};

document.addEventListener('DOMContentLoaded', () => {
    const CONSTANTS = { CARD_SPACING: 20, ANIMATION_DURATION: 700, TOAST_DURATION: 2500, MIN_CARD_DISTANCE: 100, CONFETTI_COUNT: 50 };
    const UI = {
        screens: { start: document.getElementById('start-screen'), focus: document.getElementById('focus-screen'), choice: document.getElementById('choice-screen') },
        buttons: { start: document.getElementById('start-btn') },
        containers: { cardSlots: document.querySelectorAll('.card-slot'), cardArea: document.getElementById('card-selection-area'), app: document.querySelector('.app-container') },
        devPanel: {
            toggle: document.getElementById('dev-panel-toggle'), content: document.getElementById('dev-panel-content'),
            elements: { themeSelect: document.getElementById('theme-select'), soundToggle: document.getElementById('sound-effects-toggle'), breathingToggle: document.getElementById('breathing-cards-toggle'), rippleToggle: document.getElementById('ripple-effects-toggle'), magneticToggle: document.getElementById('magnetic-snap-toggle'), confettiToggle: document.getElementById('confetti-toggle'), vibrationToggle: document.getElementById('vibration-toggle'), deckBreathingToggle: document.getElementById('deck-breathing-toggle'), restartBtn: document.getElementById('restart-app-btn') }
        }
    };
    let appState = { chosenCards: new Array(3).fill(null), draggedCard: null, dragOffset: { x: 0, y: 0 }, audioContext: null, sounds: {}, confettiCanvas: null, confettiContext: null, confettiParticles: [] };
    let effects = { sounds: { enabled: true }, breathing: { enabled: true }, ripple: { enabled: true }, magnetic: { enabled: true }, confetti: { enabled: true }, vibration: { enabled: false }, deckBreathing: { enabled: false } };

    const Settings = {
        load() { const saved = localStorage.getItem('tarot-effects'); if (saved) { try { effects = { ...effects, ...JSON.parse(saved) }; } catch (e) { console.error('Ошибка загрузки настроек:', e); } } },
        save() { localStorage.setItem('tarot-effects', JSON.stringify(effects)); },
        applyToUI() { Object.entries(UI.devPanel.elements).forEach(([key, element]) => { if (element && element.type === 'checkbox') { const effectName = key.replace('Toggle', ''); if (effects[effectName]) { element.checked = effects[effectName].enabled; } } }); }
    };

    const Audio = {
        init() { if (!appState.audioContext && effects.sounds.enabled) { try { const AudioContext = window.AudioContext || window.webkitAudioContext; appState.audioContext = new AudioContext(); this.createSounds(); } catch (e) { console.warn('Audio not supported:', e); effects.sounds.enabled = false; } } },
        createSounds() { const createTone = (frequency, duration, volume, type = 'sine') => () => { if (!appState.audioContext || !effects.sounds.enabled) return; try { const oscillator = appState.audioContext.createOscillator(); const gainNode = appState.audioContext.createGain(); oscillator.connect(gainNode); gainNode.connect(appState.audioContext.destination); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, appState.audioContext.currentTime); gainNode.gain.setValueAtTime(0, appState.audioContext.currentTime); gainNode.gain.linearRampToValueAtTime(volume, appState.audioContext.currentTime + 0.01); gainNode.gain.exponentialRampToValueAtTime(0.001, appState.audioContext.currentTime + duration); oscillator.start(appState.audioContext.currentTime); oscillator.stop(appState.audioContext.currentTime + duration); } catch (e) { console.warn('Ошибка воспроизведения звука:', e); } }; appState.sounds = { cardClick: createTone(659, 0.5, 0.15), cardDrop: createTone(523, 0.8, 0.2), cardFlip: createTone(784, 0.6, 0.12), complete: () => { createTone(523, 0.5, 0.1)(); setTimeout(() => createTone(659, 0.5, 0.1)(), 100); setTimeout(() => createTone(784, 0.5, 0.1)(), 200); } }; },
        play(soundName) { if (appState.sounds[soundName]) { appState.sounds[soundName](); } }
    };

    const Vibration = { trigger(pattern) { if (effects.vibration.enabled && 'vibrate' in navigator) { try { navigator.vibrate(pattern); } catch (e) { console.warn('Vibration failed:', e); } } } };
    const Effects = {
        createRipple(x, y, element) { if (!effects.ripple.enabled) return; const ripple = document.createElement('div'); ripple.className = 'ripple-v1'; const size = 100; Object.assign(ripple.style, { width: `${size}px`, height: `${size}px`, left: `${x - size / 2}px`, top: `${y - size / 2}px` }); element.appendChild(ripple); setTimeout(() => ripple.remove(), 600); },
        updateBreathingCards() { document.querySelectorAll('.tarot-card:not(.is-dropped)').forEach(card => card.classList.toggle('breathing-glow', effects.breathing.enabled)); },
        updateMagneticSlots() { UI.containers.cardSlots.forEach(slot => slot.classList.toggle('magnetic-pulse', effects.magnetic.enabled)); },
        updateDeckBreathing() { const deck = document.getElementById('initial-deck'); if (deck) { deck.classList.toggle('deck-breathing-mystic', effects.deckBreathing.enabled); } }
    };

    const Navigation = { switchScreen(screenName) { Object.values(UI.screens).forEach(screen => screen.classList.remove('active')); if (UI.screens[screenName]) { UI.screens[screenName].classList.add('active'); } } };
    const Particles = { init() { if (!window.particlesJS) return; const theme = document.body.className || 'theme-gazprom-classic'; const colors = { 'theme-gazprom-classic': { p: "#00aaff", l: "#0078d7" }, 'theme-gazprom-dark': { p: "#3399ff", l: "#005f9e" }, 'theme-gazprom-light': { p: "#0078d7", l: "#005a9e" } }; const color = colors[theme] || colors['theme-gazprom-classic']; particlesJS('particles-js', { particles: { number: { value: 60 }, color: { value: color.p }, size: { value: 3, random: true }, move: { enable: true, speed: 2 }, line_linked: { color: color.l, distance: 150 } }, interactivity: { events: { onhover: { enable: true, mode: "repulse" } } } }); } };
    const Confetti = { init() { appState.confettiCanvas = document.getElementById('confetti-canvas'); appState.confettiContext = appState.confettiCanvas.getContext('2d'); const resize = () => { appState.confettiCanvas.width = window.innerWidth; appState.confettiCanvas.height = window.innerHeight; }; window.addEventListener('resize', resize); resize(); }, create() { if (!effects.confetti.enabled || !appState.confettiContext) return; const colors = ['#00aaff', '#0078d7', '#ffffff']; for (let i = 0; i < CONSTANTS.CONFETTI_COUNT; i++) { appState.confettiParticles.push({ x: Math.random() * appState.confettiCanvas.width, y: -20, vx: Math.random() * 10 - 5, vy: Math.random() * 5 + 5, color: colors[Math.floor(Math.random() * colors.length)], size: Math.random() * 8 + 4 }); } if (appState.confettiParticles.length > 0) { this.animate(); } }, animate() { if (!appState.confettiContext) return; appState.confettiContext.clearRect(0, 0, appState.confettiCanvas.width, appState.confettiCanvas.height); for (let i = appState.confettiParticles.length - 1; i >= 0; i--) { const particle = appState.confettiParticles[i]; particle.x += particle.vx; particle.y += particle.vy; particle.vy += 0.2; appState.confettiContext.fillStyle = particle.color; appState.confettiContext.fillRect(particle.x, particle.y, particle.size, particle.size); if (particle.y > appState.confettiCanvas.height + 20) { appState.confettiParticles.splice(i, 1); } } if (appState.confettiParticles.length > 0) { requestAnimationFrame(() => this.animate()); } } };
    
    const CardDealing = {
        calculateSafeArea() {
            const areaRect = UI.containers.cardArea.getBoundingClientRect();
            const slots = Array.from(UI.containers.cardSlots);
            const slotBounds = slots.reduce((bounds, slot) => { const rect = slot.getBoundingClientRect(); return { minX: Math.min(bounds.minX, rect.left - areaRect.left), maxX: Math.max(bounds.maxX, rect.right - areaRect.left), minY: Math.min(bounds.minY, rect.top - areaRect.top), maxY: Math.max(bounds.maxY, rect.bottom - areaRect.top) }; }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
            const isPortrait = window.innerHeight > window.innerWidth;
            const isMobile = window.innerWidth <= 768;
            if (isMobile && !isPortrait) return { x: CONSTANTS.CARD_SPACING, y: CONSTANTS.CARD_SPACING, width: Math.max(200, slotBounds.minX - CONSTANTS.CARD_SPACING * 3), height: areaRect.height - CONSTANTS.CARD_SPACING * 2 };
            if (isMobile && isPortrait) return { x: CONSTANTS.CARD_SPACING, y: CONSTANTS.CARD_SPACING, width: areaRect.width - CONSTANTS.CARD_SPACING * 2, height: Math.max(200, slotBounds.minY - CONSTANTS.CARD_SPACING * 3) };
            return { x: CONSTANTS.CARD_SPACING, y: CONSTANTS.CARD_SPACING, width: Math.max(300, slotBounds.minX - CONSTANTS.CARD_SPACING * 3), height: areaRect.height - CONSTANTS.CARD_SPACING * 2 };
        },
        generateCardPositions(cardCount, cardWidth, cardHeight) {
            const safeArea = this.calculateSafeArea();
            const positions = [];
            for (let i = 0; i < cardCount; i++) {
                let position, attempts = 0;
                do { position = { x: safeArea.x + Math.random() * (safeArea.width - cardWidth), y: safeArea.y + Math.random() * (safeArea.height - cardHeight), rotation: Math.random() * 40 - 20 }; attempts++; } while (this.checkCollision(position, positions) && attempts < 50);
                positions.push(position);
            }
            return positions;
        },
        checkCollision(newPos, existingPositions) { return existingPositions.some(pos => Math.hypot(newPos.x - pos.x, newPos.y - pos.y) < CONSTANTS.MIN_CARD_DISTANCE); }
    };

    const GameLogic = {
        setupChoiceScreen() {
            Navigation.switchScreen('choice');
            const explanation = document.getElementById('slot-explanation');
            if (explanation) explanation.style.opacity = '1';
            appState.chosenCards.fill(null);
            UI.containers.cardSlots.forEach((slot, index) => { slot.innerHTML = `<span class="slot-label">${["Вызов", "Путь", "Исход"][index]}</span>`; slot.classList.remove('filled'); });
            UI.containers.cardArea.innerHTML = '';
            const initialDeck = document.createElement('div');
            initialDeck.id = 'initial-deck';
            for (let i = 0; i < 5; i++) { const card = document.createElement('div'); card.className = 'shuffle-card'; card.style.transform = `translateZ(${i * -2}px)`; initialDeck.appendChild(card); }
            UI.containers.cardArea.appendChild(initialDeck);
            Effects.updateDeckBreathing();
            initialDeck.addEventListener('click', this.dealCards.bind(this), { once: true });
        },
        dealCards() {
            const deck = document.getElementById('initial-deck');
            if (!deck) return;
            gsap.to('#slot-explanation', { opacity: 0, duration: 0.3, pointerEvents: 'none' });
            const shuffledCards = [...tarotCardsData].sort(() => 0.5 - Math.random());
            const deckRect = deck.getBoundingClientRect();
            const areaRect = UI.containers.cardArea.getBoundingClientRect();
            const cardWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-width'));
            const cardHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-height'));
            const positions = CardDealing.generateCardPositions(shuffledCards.length, cardWidth, cardHeight);
            shuffledCards.forEach((cardData, index) => {
                const cardElement = document.createElement('div');
                cardElement.className = 'tarot-card';
                cardElement.dataset.id = cardData.id;
                cardElement.innerHTML = '<div class="card-face card-back"></div>';
                Object.assign(cardElement.style, { left: `${deckRect.left - areaRect.left}px`, top: `${deckRect.top - areaRect.top}px` });
                UI.containers.cardArea.appendChild(cardElement);
                const position = positions[index];
                gsap.to(cardElement, { left: position.x, top: position.y, rotation: position.rotation, duration: CONSTANTS.ANIMATION_DURATION / 1000, delay: index * 0.02, ease: 'power2.out' });
            });
            gsap.to(deck, { opacity: 0, duration: 0.5, onComplete: () => deck.remove() });
            setTimeout(() => { document.querySelectorAll('.tarot-card').forEach(card => { card.addEventListener('mousedown', DragDrop.startDrag); card.addEventListener('touchstart', DragDrop.startDrag, { passive: false }); }); Effects.updateBreathingCards(); Effects.updateMagneticSlots(); }, shuffledCards.length * 20 + CONSTANTS.ANIMATION_DURATION);
        },
        showPlacementToast(slotName, cardName) { const toast = document.createElement('div'); toast.className = 'placement-toast'; toast.innerHTML = `<h4>${slotName}</h4><p>${cardName}</p>`; document.body.appendChild(toast); setTimeout(() => toast.remove(), CONSTANTS.TOAST_DURATION); }
    };

    const DragDrop = {
        startDrag(e) { e.preventDefault(); const card = e.target.closest('.tarot-card'); if (card.classList.contains('is-dropped')) return; appState.draggedCard = card; Audio.init(); Audio.play('cardClick'); Vibration.trigger(50); const rect = card.getBoundingClientRect(); const clientX = e.clientX || e.touches[0].clientX; const clientY = e.clientY || e.touches[0].clientY; appState.dragOffset = { x: clientX - rect.left, y: clientY - rect.top }; card.classList.add('is-dragging'); gsap.to(card, { scale: 1.1, duration: 0.2 }); Effects.createRipple(clientX - rect.left, clientY - rect.top, card); document.addEventListener('mousemove', DragDrop.handleDrag); document.addEventListener('mouseup', DragDrop.endDrag); document.addEventListener('touchmove', DragDrop.handleDrag, { passive: false }); document.addEventListener('touchend', DragDrop.endDrag); },
        handleDrag(e) { if (!appState.draggedCard) return; e.preventDefault(); const clientX = e.clientX || e.touches[0].clientX; const clientY = e.clientY || e.touches[0].clientY; const parentRect = UI.containers.cardArea.getBoundingClientRect(); const newX = clientX - parentRect.left - appState.dragOffset.x; const newY = clientY - parentRect.top - appState.dragOffset.y; Object.assign(appState.draggedCard.style, { left: `${newX}px`, top: `${newY}px` }); DragDrop.checkSlotProximity(); },
        checkSlotProximity() { const cardRect = appState.draggedCard.getBoundingClientRect(); const cardCenterX = cardRect.left + cardRect.width / 2; const cardCenterY = cardRect.top + cardRect.height / 2; let closestSlot = null, minDistance = Infinity; UI.containers.cardSlots.forEach(slot => { if (slot.classList.contains('filled')) return; const slotRect = slot.getBoundingClientRect(); const slotCenterX = slotRect.left + slotRect.width / 2; const slotCenterY = slotRect.top + slotRect.height / 2; const distance = Math.hypot(cardCenterX - slotCenterX, cardCenterY - slotCenterY); if (distance < minDistance) { minDistance = distance; closestSlot = slot; } }); UI.containers.cardSlots.forEach(slot => { const shouldActivate = (slot === closestSlot && minDistance < slot.clientWidth); slot.classList.toggle('drag-over', shouldActivate); slot.classList.toggle('attracting', shouldActivate && effects.magnetic.enabled); }); },
        endDrag() { if (!appState.draggedCard) return; document.removeEventListener('mousemove', DragDrop.handleDrag); document.removeEventListener('mouseup', DragDrop.endDrag); document.removeEventListener('touchmove', DragDrop.handleDrag); document.removeEventListener('touchend', DragDrop.endDrag); appState.draggedCard.classList.remove('is-dragging'); const droppedSlot = document.querySelector('.card-slot.drag-over'); if (droppedSlot) { DragDrop.handleDrop(appState.draggedCard, droppedSlot); } else { gsap.to(appState.draggedCard, { scale: 1, duration: 0.3, ease: 'back.out' }); } UI.containers.cardSlots.forEach(slot => slot.classList.remove('drag-over', 'attracting')); appState.draggedCard = null; },
        handleDrop(cardElement, slot) { const cardData = tarotCardsData.find(c => c.id == cardElement.dataset.id); const slotId = parseInt(slot.dataset.slotId); const labels = ["Ваш Вызов", "Ваш Путь", "Ваш Исход"]; appState.chosenCards[slotId] = cardData; Audio.play('cardDrop'); Vibration.trigger(100); cardElement.style.pointerEvents = 'none'; cardElement.classList.add('is-dropped'); slot.classList.add('filled'); const slotRect = slot.getBoundingClientRect(); const areaRect = UI.containers.cardArea.getBoundingClientRect(); gsap.to(cardElement, { left: slotRect.left - areaRect.left, top: slotRect.top - areaRect.top, scale: 1, rotation: 0, duration: 0.4, ease: 'power2.inOut', onComplete: () => { cardElement.removeAttribute('style'); slot.innerHTML = ''; slot.appendChild(cardElement); cardElement.innerHTML = `<div class="card-face card-back"></div><div class="card-face card-front" style="background-image: url('${cardData.image}')"></div>`; gsap.to(cardElement, { rotationY: 180, duration: 0.7, ease: 'power2.inOut' }); GameLogic.showPlacementToast(labels[slotId], cardData.name); Audio.play('cardFlip'); if (appState.chosenCards.filter(c => c).length === 3) { Audio.play('complete'); Vibration.trigger([100, 50, 100]); if (effects.confetti.enabled) Confetti.create(); setTimeout(() => ResultScreen.initialize(appState.chosenCards), CONSTANTS.TOAST_DURATION); } } }); }
    };

    const DevPanel = {
        setup() {
            UI.devPanel.toggle.addEventListener('click', () => UI.devPanel.content.classList.toggle('active'));
            UI.devPanel.elements.themeSelect.addEventListener('change', (e) => { document.body.className = e.target.value; Particles.init(); });
            Object.entries(UI.devPanel.elements).forEach(([key, element]) => { if (element && element.type === 'checkbox') { element.addEventListener('change', (e) => { const effectName = key.replace('Toggle', ''); if (effects[effectName]) { effects[effectName].enabled = e.target.checked; this.updateEffect(effectName); Settings.save(); } }); } });
            UI.devPanel.elements.restartBtn.addEventListener('click', () => { Settings.save(); location.reload(); });
        },
        updateEffect(effectName) {
            switch (effectName) {
                case 'breathing': Effects.updateBreathingCards(); break;
                case 'magnetic': Effects.updateMagneticSlots(); break;
                case 'deckBreathing': Effects.updateDeckBreathing(); break;
            }
        }
    };
    
    function init() {
        try { Settings.load(); Settings.applyToUI(); Particles.init(); Confetti.init(); DevPanel.setup(); UI.buttons.start.addEventListener('click', () => { Navigation.switchScreen('focus'); UI.containers.app.classList.add('focus-active'); }); UI.screens.focus.addEventListener('click', () => { UI.containers.app.classList.remove('focus-active'); GameLogic.setupChoiceScreen(); }); Navigation.switchScreen('start'); } catch (error) { console.error('Ошибка инициализации приложения:', error); }
    }
    init();

    // ===================================
    // === ЛОГИКА ОКНА РЕЗУЛЬТАТОВ (ИНТЕГРАЦИЯ) ===
    // ===================================
    window.ResultScreen = {
        currentCard: 0,
        cardData: [],
        touchStartX: 0,

        initialize(chosenCards) {
            this.currentCard = 0;
            const aspects = ["Вызов", "Путь", "Исход"];
            const themes = ["challenge", "path", "outcome"];
            this.cardData = chosenCards.map((card, index) => ({ ...card, aspect: aspects[index], theme: themes[index] }));
            this.render();
            this.update();
            this.setupEventListeners();
            document.getElementById('result-modal').classList.add('active');
        },

        render() {
            const container = document.getElementById('screens-container');
            container.innerHTML = ''; 

            this.cardData.forEach((card, index) => {
                const keywordsHTML = card.keywords.split(',').map(k => `<span class="keyword">${k.trim()}</span>`).join('');
                const screen = document.createElement('div');
                screen.className = 'result-screen';
                screen.dataset.index = index;
                screen.innerHTML = `
                    <div class="result-image-section">
                        <div class="result-image-wrapper" onclick="ResultScreen.openFullscreen('${card.image}')">
                            <img src="${card.image}" alt="${card.name}" class="result-image">
                        </div>
                    </div>
                    <div class="result-content-section">
                        <div class="result-title-section">
                            <div class="result-aspect-label">${card.aspect}</div>
                            <div class="result-card-name">${card.name}</div>
                        </div>
                        <div class="guidance-text">${this.getGuidanceText(card.aspect)}</div>
                        <div class="content-block"><div class="content-text">${card.general}</div></div>
                        <div class="content-block" onclick="this.classList.toggle('open')">
                            <div class="content-block-header"><span>💻</span> Для проекта</div>
                            <div class="content-block-details"><div class="content-text">${card.project}</div></div>
                        </div>
                        <div class="content-block" onclick="this.classList.toggle('open')">
                            <div class="content-block-header"><span>🚀</span> Для карьеры</div>
                            <div class="content-block-details"><div class="content-text">${card.career}</div></div>
                        </div>
                        <div class="content-block"><div class="keywords">${keywordsHTML}</div></div>
                    </div>`;
                container.appendChild(screen);
            });

            const aiScreen = document.createElement('div');
            aiScreen.className = 'result-screen';
            aiScreen.dataset.index = 3;
            aiScreen.innerHTML = `
                <div class="result-image-section">
                    <div class="result-image-wrapper">
                        <img src="images/oracul.png" alt="AI Oracle" class="result-image">
                    </div>
                </div>
                <div class="result-content-section" style="justify-content: center;">
                     <div id="ai-screen-content">
                         <div class="result-aspect-label">Оракул</div>
                         <h2 class="ai-title">Глубинный Анализ</h2>
                         <p class="ai-subtitle">Нейросеть может заглянуть глубже. Получите персональную трактовку вашего IT-расклада.</p>
                         <button class="ai-action-btn" onclick="ResultScreen.showAI()">Раскрыть предсказание</button>
                    </div>
                </div>`;
            container.appendChild(aiScreen);
        },

        update() {
            const screens = document.querySelectorAll('.result-screen');
            const modalContent = document.getElementById('modal-content');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            if (!screens.length) return;
            
            const currentTheme = (this.currentCard < 3) ? this.cardData[this.currentCard].theme : 'ai';
            modalContent.className = `modal-content ${currentTheme}-theme`;

            screens.forEach((screen, index) => {
                screen.classList.remove('active', 'prev');
                if (index == this.currentCard) screen.classList.add('active');
                else if (index < this.currentCard) screen.classList.add('prev');
            });
            
            prevBtn.disabled = this.currentCard === 0;
            nextBtn.disabled = this.currentCard === screens.length - 1;
        },
        
        setupEventListeners() {
            document.getElementById('close-modal-btn').onclick = () => {
                document.getElementById('result-modal').classList.remove('active');
                GameLogic.setupChoiceScreen(); 
            };
            document.getElementById('prev-btn').onclick = () => this.prevCard();
            document.getElementById('next-btn').onclick = () => this.nextCard();
            
            const container = document.getElementById('result-modal');
            container.addEventListener('touchstart', (e) => { this.touchStartX = e.touches[0].clientX; }, {passive: true});
            container.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const diff = this.touchStartX - touchEndX;
                if (Math.abs(diff) > 50) { if (diff > 0) this.nextCard(); else this.prevCard(); }
            });
            
            document.addEventListener('keydown', (e) => {
                if (document.getElementById('ai-overlay').classList.contains('active')) {
                    if (e.key === 'Escape') this.hideAI();
                    return;
                }
                if (!document.getElementById('result-modal').classList.contains('active')) return;
                
                if (e.key === 'ArrowLeft') this.prevCard();
                if (e.key === 'ArrowRight') this.nextCard();
                if (e.key === 'Escape') {
                    if (document.getElementById('fullscreen-overlay').classList.contains('active')) this.closeFullscreen();
                    else document.getElementById('close-modal-btn').click();
                }
            });
        },
        
        nextCard() { if (this.currentCard < 3) { this.currentCard++; this.update(); } },
        prevCard() { if (this.currentCard > 0) { this.currentCard--; this.update(); } },

        getGuidanceText(aspect) {
            const texts = { 'Вызов': 'Ваше главное испытание. Не враг, а учитель, указывающий путь к росту.', 'Путь': 'Ваша стратегия. Методы и ресурсы для преодоления вызовов.', 'Исход': 'Вероятный результат. Сценарий, который вы можете формировать.' };
            return texts[aspect] || '';
        },

        openFullscreen(src) { document.getElementById('fullscreen-image').src = src; document.getElementById('fullscreen-overlay').classList.add('active'); },
        closeFullscreen() { document.getElementById('fullscreen-overlay').classList.remove('active'); },
        showAI() { document.getElementById('ai-overlay').classList.add('active'); },
        hideAI() { document.getElementById('ai-overlay').classList.remove('active'); },
        
        async requestAI() {
            const apiKey = "AIzaSyCmqT_oPvpqYKgRxU8LItCuFZY0NY3ulu8";
            // ИСПРАВЛЕНО: Используем актуальную модель gemini-1.5-flash-latest
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

            const question = document.getElementById('ai-question').value;
            const responseEl = document.getElementById('ai-response');
            const btnText = document.getElementById('ai-btn-text');
            
            if (!question.trim()){ alert("Введите ваш вопрос."); return; }
            
            btnText.textContent = 'Анализ...';
            btnText.disabled = true;
            responseEl.classList.add('visible');
            responseEl.innerHTML = `<em style="color: var(--ai-light);">🔮 Соединяюсь с цифровым потоком...</em>`;

            const prompt = `
                Ты - цифровой оракул, IT-таролог. Тебе предоставили расклад из трех карт Таро, адаптированных для IT-специалистов.
                Твоя задача - дать глубокую, но лаконичную и полезную интерпретацию этого расклада в контексте заданного вопроса.

                Вот данные расклада:
                1.  **Вызов (Challenge):** Карта "${this.cardData[0].name}". Её основное значение: "${this.cardData[0].general}".
                2.  **Путь (Path):** Карта "${this.cardData[1].name}". Её основное значение: "${this.cardData[1].general}".
                3.  **Исход (Outcome):** Карта "${this.cardData[2].name}". Её основное значение: "${this.cardData[2].general}".

                А вот вопрос от пользователя: "${question}"

                Проанализируй синергию этих трех карт и дай ответ на вопрос пользователя, связывая его с каждой картой.
                Структурируй свой ответ: начни с общего вывода, а затем кратко поясни роль каждой карты в контексте вопроса.
                Говори как мудрый, но современный IT-пророк.
            `;

            console.log("ОТПРАВЛЯЕМЫЙ ПРОМПТ В GEMINI:", prompt);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Ошибка от API Gemini:", errorData);
                    throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates.length > 0) {
                    const text = data.candidates[0].content.parts[0].text;
                    responseEl.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                } else {
                    throw new Error("API не вернуло кандидатов в ответе.");
                }

            } catch (error) {
                console.error("Ошибка запроса к Gemini API:", error);
                responseEl.innerHTML = `<span style="color: #ff8a80;">Упс! Кажется, цифровые духи не в настроении. Ошибка: ${error.message}</span>`;
            } finally {
                btnText.textContent = 'Спросить';
                btnText.disabled = false;
            }
        }
    };
});