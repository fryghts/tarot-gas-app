document.addEventListener('DOMContentLoaded', () => {
    const CONSTANTS = { ANIMATION_DURATION: 700, MIN_CARD_DISTANCE: 100 };
    const UI = {
        screens: { start: document.getElementById('start-screen'), focus: document.getElementById('focus-screen'), choice: document.getElementById('choice-screen') },
        buttons: { start: document.getElementById('start-btn') },
        containers: { cardSlots: document.querySelectorAll('.card-slot'), cardArea: document.getElementById('card-selection-area'), app: document.querySelector('.app-container') },
        instructionText: document.getElementById('instruction-text'),
        revealOverlay: document.getElementById('reveal-overlay'),
        finalPrompt: document.getElementById('final-prompt'),
        focusScreenElements: { title: document.getElementById('focus-title'), subtitle: document.getElementById('focus-subtitle') }
    };
    let appState = { 
        chosenCards: new Array(3).fill(null), 
        currentStep: 0, 
        draggedCard: null, 
        dragOffset: { x: 0, y: 0 },
        focusTimeout: null,
        instructionTimeout: null
    };

    const Vibration = { trigger(pattern) { if ('vibrate' in navigator) { try { navigator.vibrate(pattern); } catch (e) { console.warn('Vibration failed:', e); } } } };
    
    const Navigation = { switchScreen(screenName) { Object.values(UI.screens).forEach(screen => screen.classList.remove('active')); if (UI.screens[screenName]) { UI.screens[screenName].classList.add('active'); } } };
    const Particles = { init() { if (!window.particlesJS) return; const theme = document.body.className || 'theme-gazprom-classic'; const colors = { 'theme-gazprom-classic': { p: "#00aaff", l: "#0078d7" }, 'theme-gazprom-dark': { p: "#3399ff", l: "#005f9e" }, 'theme-gazprom-light': { p: "#0078d7", l: "#005a9e" } }; const color = colors[theme] || colors['theme-gazprom-classic']; particlesJS('particles-js', { particles: { number: { value: 60 }, color: { value: color.p }, size: { value: 3, random: true }, move: { enable: true, speed: 2 }, line_linked: { color: color.l, distance: 150 } }, interactivity: { events: { onhover: { enable: true, mode: "repulse" } } } }); } };
    
    const GameLogic = {
        setupChoiceScreen() {
            Navigation.switchScreen('choice');
            appState.chosenCards.fill(null);
            appState.currentStep = 0;
            UI.containers.cardSlots.forEach((slot, index) => { 
                const labels = ["Вызов", "Путь", "Исход"];
                slot.innerHTML = `<span class="slot-label">${labels[index]}</span>`; 
                slot.classList.remove('filled', 'slot-active', 'challenge-theme', 'path-theme', 'outcome-theme'); 
            });
            UI.containers.cardArea.innerHTML = '';
            UI.instructionText.innerHTML = "Коснитесь колоды, чтобы явить судьбу.";
            UI.instructionText.classList.add('shining-text');
            gsap.fromTo(UI.instructionText, {opacity: 0}, {opacity: 1, duration: 1});

            const initialDeck = document.createElement('div');
            initialDeck.id = 'initial-deck';
            for (let i = 0; i < 5; i++) { const card = document.createElement('div'); card.className = 'shuffle-card'; card.style.transform = `translateZ(${i * -2}px)`; initialDeck.appendChild(card); }
            UI.containers.cardArea.appendChild(initialDeck);
            initialDeck.classList.add('deck-breathing-mystic');
            initialDeck.addEventListener('click', this.dealCards.bind(this), { once: true });
        },

        dealCards() {
            UI.containers.app.classList.remove('focus-active');
            const deck = document.getElementById('initial-deck');
            if (!deck) return;
            gsap.to(UI.instructionText, { opacity: 0, duration: 0.3, onComplete: () => {
                UI.instructionText.innerHTML = '';
                UI.instructionText.classList.remove('shining-text');
            }});
            const shuffledCards = [...tarotCardsData].sort(() => 0.5 - Math.random());
            const deckRect = deck.getBoundingClientRect();
            const areaRect = UI.containers.cardArea.getBoundingClientRect();
            const cardWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-width'));
            const cardHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-height'));
            const positions = this.generateCardPositions(shuffledCards.length, cardWidth, cardHeight);
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
            setTimeout(() => { 
                DragDrop.enableDragging();
                this.startNextStep();
            }, shuffledCards.length * 20 + CONSTANTS.ANIMATION_DURATION);
        },
        
        startNextStep() {
            UI.containers.cardSlots.forEach(slot => slot.classList.remove('slot-active', 'challenge-theme', 'path-theme', 'outcome-theme'));
            
            const instructions = [
                "Переместите карту на подсвеченный слот.<br>Ваш <strong>Вызов</strong> — это скрытый баг в системе.",
                "Ваша вторая карта укажет <strong>Путь</strong> — верный алгоритм для решения.",
                "Последняя карта предскажет <strong>Исход</strong> — результат вашего деплоя."
            ];
            
            if (appState.currentStep < 3) {
                const activeSlot = UI.containers.cardSlots[appState.currentStep];
                const themes = ['challenge-theme', 'path-theme', 'outcome-theme'];
                if (activeSlot) {
                    activeSlot.classList.add('slot-active', themes[appState.currentStep]);
                }
                UI.instructionText.innerHTML = instructions[appState.currentStep];
                UI.instructionText.style.top = '50%';
                gsap.to(UI.instructionText, { opacity: 1, duration: 0.5 });

                clearTimeout(appState.instructionTimeout);
                appState.instructionTimeout = setTimeout(() => {
                    gsap.to(UI.instructionText, { opacity: 0, duration: 0.5 });
                }, 4000);

            } else {
                Vibration.trigger([100, 50, 100]);
                gsap.to(UI.instructionText, { opacity: 0, duration: 0.3 });
                ResultScreen.initialize(appState.chosenCards.filter(c => c));
            }
        },
        
        generateCardPositions(cardCount, cardWidth, cardHeight) {
            const areaRect = UI.containers.cardArea.getBoundingClientRect();
            const slotsContainer = document.getElementById('spread-slots-sidebar');
            const slotsRect = slotsContainer.getBoundingClientRect();
            const instructionRect = UI.instructionText.getBoundingClientRect();
            const safeArea = {
                x: 10,
                y: instructionRect.height > 0 ? instructionRect.height + 20 : 50,
                width: areaRect.width - 20,
                height: (slotsRect.top > 0 ? slotsRect.top : areaRect.height) - (instructionRect.height > 0 ? instructionRect.height + 40 : 100)
            };
            const isLandscape = areaRect.width > areaRect.height;
            if (isLandscape && slotsRect.left > 0) {
                safeArea.width = slotsRect.left - 20;
                safeArea.height = areaRect.height - 20;
                safeArea.y = 10;
            }
            const positions = [];
            for (let i = 0; i < cardCount; i++) {
                let position, attempts = 0;
                do { 
                    position = { 
                        x: safeArea.x + Math.random() * (safeArea.width - cardWidth), 
                        y: safeArea.y + Math.random() * (safeArea.height - cardHeight), 
                        rotation: Math.random() * 40 - 20 
                    }; 
                    attempts++; 
                } while (this.checkCollision(position, positions) && attempts < 50);
                positions.push(position);
            }
            return positions;
        },
        checkCollision(newPos, existingPositions) { return existingPositions.some(pos => Math.hypot(newPos.x - pos.x, newPos.y - pos.y) < CONSTANTS.MIN_CARD_DISTANCE); }
    };

    const DragDrop = {
        enableDragging() {
            document.querySelectorAll('.tarot-card:not(.is-dropped)').forEach(card => { 
                card.addEventListener('mousedown', DragDrop.startDrag); 
                card.addEventListener('touchstart', DragDrop.startDrag, { passive: false }); 
            }); 
        },

        startDrag(e) { 
            e.preventDefault(); 
            const card = e.target.closest('.tarot-card'); 
            if (card.classList.contains('is-dropped')) return; 

            clearTimeout(appState.instructionTimeout);
            gsap.to(UI.instructionText, { opacity: 0, duration: 0.3 });

            appState.draggedCard = card; 
            Vibration.trigger(50); 
            const rect = card.getBoundingClientRect(); 
            const clientX = e.clientX || e.touches[0].clientX; 
            const clientY = e.clientY || e.touches[0].clientY; 
            appState.dragOffset = { x: clientX - rect.left, y: clientY - rect.top }; 
            card.classList.add('is-dragging'); 
            gsap.to(card, { scale: 1.1, duration: 0.2 }); 
            document.addEventListener('mousemove', DragDrop.handleDrag); 
            document.addEventListener('mouseup', DragDrop.endDrag); 
            document.addEventListener('touchmove', DragDrop.handleDrag, { passive: false }); 
            document.addEventListener('touchend', DragDrop.endDrag); 
        },
        handleDrag(e) { if (!appState.draggedCard) return; e.preventDefault(); const clientX = e.clientX || e.touches[0].clientX; const clientY = e.clientY || e.touches[0].clientY; const parentRect = UI.containers.cardArea.getBoundingClientRect(); const newX = clientX - parentRect.left - appState.dragOffset.x; const newY = clientY - parentRect.top - appState.dragOffset.y; Object.assign(appState.draggedCard.style, { left: `${newX}px`, top: `${newY}px` }); DragDrop.checkSlotProximity(); },
        checkSlotProximity() {
            if (!appState.draggedCard) return;
            const activeSlot = UI.containers.cardSlots[appState.currentStep];
            if (!activeSlot) return;
            UI.containers.cardSlots.forEach(s => s.classList.remove('drag-over'));
            const cardRect = appState.draggedCard.getBoundingClientRect();
            const slotRect = activeSlot.getBoundingClientRect();
            const cardCenterX = cardRect.left + cardRect.width / 2;
            const cardCenterY = cardRect.top + cardRect.height / 2;
            const slotCenterX = slotRect.left + slotRect.width / 2;
            const slotCenterY = slotRect.top + slotRect.height / 2;
            const distance = Math.hypot(cardCenterX - slotCenterX, cardCenterY - slotCenterY);
            if (distance < slotRect.width * 1.5) activeSlot.classList.add('drag-over');
        },
        endDrag() { if (!appState.draggedCard) return; document.removeEventListener('mousemove', DragDrop.handleDrag); document.removeEventListener('mouseup', DragDrop.endDrag); document.removeEventListener('touchmove', DragDrop.handleDrag); document.removeEventListener('touchend', DragDrop.endDrag); appState.draggedCard.classList.remove('is-dragging'); const droppedSlot = document.querySelector('.card-slot.drag-over'); if (droppedSlot && parseInt(droppedSlot.dataset.slotId) === appState.currentStep) { DragDrop.handleDrop(appState.draggedCard, droppedSlot); } else { gsap.to(appState.draggedCard, { scale: 1, duration: 0.3, ease: 'back.out' }); } UI.containers.cardSlots.forEach(slot => slot.classList.remove('drag-over')); appState.draggedCard = null; },
        handleDrop(cardElement, slot) {
            const cardId = parseInt(cardElement.dataset.id);
            const cardData = tarotCardsData.find(c => c.id === cardId);
            if (!cardData) { console.error("Card data not found for ID:", cardId); return; }
            const slotId = parseInt(slot.dataset.slotId);
            appState.chosenCards[slotId] = cardData;
            Vibration.trigger(100);
            cardElement.style.pointerEvents = 'none';
            cardElement.classList.add('is-dropped');
            slot.classList.add('filled');
            const slotRect = slot.getBoundingClientRect();
            const areaRect = UI.containers.cardArea.getBoundingClientRect();
            gsap.to(cardElement, { 
                left: slotRect.left - areaRect.left, top: slotRect.top - areaRect.top, scale: 1, rotation: 0, duration: 0.4, ease: 'power2.inOut', 
                onComplete: () => { 
                    cardElement.removeAttribute('style'); 
                    slot.innerHTML = ''; slot.appendChild(cardElement); 
                    cardElement.innerHTML = `<div class="card-face card-back"></div><div class="card-face card-front" style="background-image: url('${cardData.image}')"></div>`;
                    gsap.to(cardElement, { rotationY: 180, duration: 0.8, ease: 'power2.inOut' });
                    document.querySelectorAll('.tarot-card:not(.is-dropped)').forEach(c => c.style.display = 'none');
                    gsap.to(UI.instructionText, { opacity: 0, duration: 0.3 });
                    ResultScreen.show(appState.chosenCards, appState.currentStep, () => {
                        document.getElementById('reveal-overlay').classList.remove('active');
                        document.querySelectorAll('.tarot-card:not(.is-dropped)').forEach(c => c.style.display = 'block');
                        DragDrop.enableDragging(); // Re-enable dragging for remaining cards
                        appState.currentStep++;
                        GameLogic.startNextStep();
                    });
                } 
            }); 
        }
    };

    function init() {
        try { 
            const assetsToPreload = tarotCardsData.map(card => card.image);
            assetsToPreload.push('images/oracul.png');
            preloadAssets(assetsToPreload);
            Particles.init(); 

            UI.buttons.start.addEventListener('click', () => { 
                Navigation.switchScreen('focus'); 
                UI.containers.app.classList.add('focus-active');
                gsap.to([UI.focusScreenElements.title, UI.focusScreenElements.subtitle], { opacity: 1, duration: 1, delay: 0.5 });
                
                appState.focusTimeout = setTimeout(proceedFromFocus, 5000);
            }); 

            const proceedFromFocus = () => {
                if(!UI.screens.focus.classList.contains('active')) return;
                clearTimeout(appState.focusTimeout);
                UI.screens.focus.removeEventListener('click', proceedFromFocus);
                gsap.to([UI.focusScreenElements.title, UI.focusScreenElements.subtitle], { opacity: 0, duration: 0.3 });
                GameLogic.setupChoiceScreen(); 
            };
            
            UI.screens.focus.addEventListener('click', proceedFromFocus); 
            
            Navigation.switchScreen('start'); 
        } catch (error) { console.error('Ошибка инициализации приложения:', error); }
    }

    function preloadAssets(urls) {
        urls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }

    init();
});