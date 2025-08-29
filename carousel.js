class TarotCarousel {
    constructor() {
        this.chosenCards = [];
        this.allCarouselCards = [];
        this.currentCardIndex = 0;
        this.aiResponseText = null;
        this.isInitialized = false;
        this.seenCardIndexes = new Set();
        this.isDragging = false;
        this.startX = 0;

        this.cardThemes = {
            0: { name: 'challenge', color: 'var(--challenge-color)' },
            1: { name: 'path', color: 'var(--path-color)' },
            2: { name: 'outcome', color: 'var(--outcome-color)' },
            3: { name: 'ai', color: 'var(--ai-color)' }
        };

        this.aiCardData = {
            id: 'ai',
            name: 'AI Оракул',
            keyword: 'АНАЛИЗ',
            image: 'images/oracul.png'
        };

        this.handleKeyboard = this.handleKeyboard.bind(this);
        this.close = this.close.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragMove = this.handleDragMove.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
    }

    showOrUpdate(cards, currentStep, onCloseCallback) {
        this.chosenCards = cards.filter(c => c);
        this.currentCardIndex = currentStep;
        this.onCloseCallback = onCloseCallback;
        
        this.allCarouselCards = [...this.chosenCards];
        if (this.chosenCards.length === 3) {
            this.allCarouselCards.push(this.aiCardData);
        }

        if (!this.isInitialized) {
            this.initialize();
        } else {
            this.updateCards();
        }
    }

    initialize() {
        this.createCarouselHTML();
        this.attachEventListeners();
        this.isInitialized = true;
        
        gsap.to(this.overlay, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
            onStart: () => this.overlay.classList.add('active'),
            onComplete: () => this.updateCards(true)
        });
    }

    createCarouselHTML() {
        const overlay = document.createElement('div');
        overlay.id = 'tarot-carousel-simplified';
        overlay.className = 'tarot-carousel-overlay';
        overlay.innerHTML = `
            <button class="carousel-close-button">&times;</button>
            <main class="carousel-main">
                <div class="card-stage-container">
                    <div class="card-glow-container"></div>
                    <div class="card-stage"></div>
                </div>
            </main>
            <section class="carousel-panel"></section>`;
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    attachEventListeners() {
        this.overlay.querySelector('.carousel-close-button').addEventListener('click', this.close);
        document.addEventListener('keydown', this.handleKeyboard);
        const stage = this.overlay.querySelector('.card-stage');
        stage.addEventListener('mousedown', this.handleDragStart);
        stage.addEventListener('touchstart', this.handleDragStart, { passive: true });
    }

    updateCards(isInitialLoad = false) {
        const stage = this.overlay.querySelector('.card-stage');
        stage.innerHTML = '';

        this.allCarouselCards.forEach((card, index) => {
            const cardEl = this.createCardElement(card, index);
            stage.appendChild(cardEl);
        });

        this.positionCards();
        this.updateDetailsPanel();

        if (!this.seenCardIndexes.has(this.currentCardIndex)) {
            setTimeout(() => this.flipCard(this.currentCardIndex), 300);
        }
    }
    
    createCardElement(card, index) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-3d';
        cardDiv.dataset.index = index;
        cardDiv.innerHTML = `
            <div class="card-inner">
                <div class="card-face card-back"></div>
                <div class="card-face card-front" style="background-image: url('${card.image}')"></div>
            </div>`;
        
        if (this.seenCardIndexes.has(index)) {
            cardDiv.querySelector('.card-inner').classList.add('flipped');
        }

        return cardDiv;
    }

    positionCards() {
        this.overlay.querySelectorAll('.card-3d').forEach((cardEl, index) => {
            cardEl.classList.remove('active', 'prev', 'next', 'hidden');
            if (index === this.currentCardIndex) cardEl.classList.add('active');
            else if (index === this.currentCardIndex - 1) cardEl.classList.add('prev');
            else if (index === this.currentCardIndex + 1) cardEl.classList.add('next');
            else cardEl.classList.add('hidden');
        });
    }

    updateDetailsPanel() {
        const panel = this.overlay.querySelector('.carousel-panel');
        const cardData = this.allCarouselCards[this.currentCardIndex];
        const theme = this.cardThemes[this.currentCardIndex];

        const glowContainer = this.overlay.querySelector('.card-glow-container');
        glowContainer.className = 'card-glow-container';
        panel.className = 'carousel-panel';
        if (theme) {
            glowContainer.classList.add(`${theme.name}-glow`);
            panel.classList.add(`${theme.name}-border`);
        }

        let panelHTML = '';

        if (cardData.id === 'ai') {
            const buttonText = this.aiResponseText ? uiTexts.carousel.viewPrediction : uiTexts.carousel.askOracle;
            panelHTML = `
                <div class="card-details-content">
                    <div class="card-name" style="color:${theme.color};">${cardData.name}</div>
                    <div class="card-keyword" style="background-color:${theme.color}; color: #fff;">${cardData.keyword}</div>
                    <button class="ask-oracle-button">${buttonText}</button>
                </div>`;
        } else {
            const prophecyKey = this.cardThemes[this.currentCardIndex]?.name || 'challenge';
            panelHTML = `
                <div class="card-details-content">
                    <div class="card-name" style="color:${theme.color};">${cardData.name}</div>
                    <div class="card-keyword" style="background-color:${theme.color};">${cardData.keyword}</div>
                    <div class="card-prophecy">${cardData.prophecy[prophecyKey]}</div>
                </div>`;
        }
        
        gsap.to(panel, {
            opacity: 0,
            duration: 0.2,
            onComplete: () => {
                panel.innerHTML = panelHTML;
                const content = panel.querySelector('.card-details-content');
                if (content && !this.seenCardIndexes.has(this.currentCardIndex)) {
                    gsap.from(content.children, {
                        opacity: 0, y: 10, duration: 0.4, stagger: 0.1, delay: 0.6
                    });
                }
                if (cardData.id === 'ai') {
                    panel.querySelector('.ask-oracle-button').addEventListener('click', () => this.showAIModal());
                }
                gsap.to(panel, { opacity: 1, duration: 0.2 });
            }
        });
    }

    flipCard(index) {
        const card = this.overlay.querySelector(`.card-3d[data-index="${index}"] .card-inner`);
        if (card && !card.classList.contains('flipped')) {
            gsap.to(card, {
                rotationY: 180,
                duration: 0.8,
                ease: 'power2.inOut',
                onComplete: () => {
                    card.classList.add('flipped');
                    this.seenCardIndexes.add(index);
                }
            });
        }
    }
    
    goToCard(index) {
        if (this.isAnimating || index < 0 || index >= this.allCarouselCards.length || index === this.currentCardIndex) return;
        
        this.isAnimating = true;
        this.currentCardIndex = index;
        this.positionCards();
        this.updateDetailsPanel();
        
        if (!this.seenCardIndexes.has(index)) {
            setTimeout(() => this.flipCard(this.currentCardIndex), 300);
        }
        
        setTimeout(() => this.isAnimating = false, 600);
    }
    
    handleKeyboard(e) {
        if (!this.isInitialized) return;
        if (e.key === 'ArrowLeft') this.goToCard(this.currentCardIndex - 1);
        if (e.key === 'ArrowRight') this.goToCard(this.currentCardIndex + 1);
        if (e.key === 'Escape') this.close();
    }

    handleDragStart(e) {
        if (this.isAnimating) return;
        this.isDragging = true;
        this.startX = e.touches ? e.touches[0].clientX : e.clientX;
        
        document.addEventListener('mousemove', this.handleDragMove);
        document.addEventListener('mouseup', this.handleDragEnd, { once: true });
        document.addEventListener('touchmove', this.handleDragMove, { passive: false });
        document.addEventListener('touchend', this.handleDragEnd, { once: true });
    }

    handleDragMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const currentX = e.touches ? e.touches[0].clientX : e.clientX;
        const diff = currentX - this.startX;
        const activeCard = this.overlay.querySelector('.card-3d.active');
        if (activeCard) {
            gsap.to(activeCard, {
                x: diff,
                rotation: diff / 40,
                duration: 0.3
            });
        }
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        
        document.removeEventListener('mousemove', this.handleDragMove);
        document.removeEventListener('touchmove', this.handleDragMove);

        const currentX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const diff = currentX - this.startX;

        const activeCard = this.overlay.querySelector('.card-3d.active');
        gsap.to(activeCard, { x: 0, rotation: 0, duration: 0.4, ease: 'power2.out' });

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                this.goToCard(this.currentCardIndex - 1);
            } else {
                this.goToCard(this.currentCardIndex + 1);
            }
        }
    }

    showAIModal() {
        if (document.querySelector('.ai-modal-overlay')) return;

        const modal = document.createElement('div');
        modal.className = 'ai-modal-overlay';
        
        let contentHTML = '';
        if (this.aiResponseText) {
            contentHTML = `<div class="ai-response">${this.aiResponseText}</div>`;
        } else {
            contentHTML = `
                <textarea class="ai-input" placeholder="${uiTexts.aiModal.placeholder}"></textarea>
                <button class="ai-button">${uiTexts.aiModal.button}</button>
                <div class="ai-response" style="display:none;"></div>`;
        }

        modal.innerHTML = `
            <div class="ai-modal-panel">
                <div class="ai-title">${uiTexts.aiModal.title}</div>
                ${contentHTML}
            </div>`;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) this.closeAIModal(); });
        
        if (!this.aiResponseText) {
            modal.querySelector('.ai-button').addEventListener('click', () => this.requestAIAnalysis(modal));
        }

        gsap.to(modal, { opacity: 1, onStart: () => modal.classList.add('active') });
    }

    closeAIModal() {
        const modal = document.querySelector('.ai-modal-overlay');
        if (modal) {
            gsap.to(modal, { 
                opacity: 0, 
                onComplete: () => {
                    modal.remove();
                    if (this.aiResponseText) {
                        this.updateDetailsPanel();
                    }
                }
            });
        }
    }

    async requestAIAnalysis(modal) {
        const input = modal.querySelector('.ai-input');
        const responseEl = modal.querySelector('.ai-response');
        const button = modal.querySelector('.ai-button');
        
        if (!input.value.trim()) return;

        button.disabled = true;
        button.textContent = uiTexts.aiModal.loading;
        responseEl.style.display = 'block';
        responseEl.innerHTML = uiTexts.aiModal.connecting;

        // ИСПРАВЛЕНО: Формируем детальное описание для каждой карты
        const card1_details = `Карта "${this.chosenCards[0].name}". Ключевое слово: ${this.chosenCards[0].keyword}. Основное значение в этой позиции: "${this.chosenCards[0].prophecy.challenge}"`;
        const card2_details = `Карта "${this.chosenCards[1].name}". Ключевое слово: ${this.chosenCards[1].keyword}. Основное значение в этой позиции: "${this.chosenCards[1].prophecy.path}"`;
        const card3_details = `Карта "${this.chosenCards[2].name}". Ключевое слово: ${this.chosenCards[2].keyword}. Основное значение в этой позиции: "${this.chosenCards[2].prophecy.outcome}"`;

        const prompt = uiTexts.geminiPrompt
            .replace('{card1_details}', card1_details)
            .replace('{card2_details}', card2_details)
            .replace('{card3_details}', card3_details)
            .replace('{question}', input.value);

        try {
            const response = await fetch('index.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || `HTTP Error: ${response.status}`);
            
            const text = data.candidates[0].content.parts[0].text;
            this.aiResponseText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            responseEl.innerHTML = this.aiResponseText;

            input.style.display = 'none';
            button.style.display = 'none';

        } catch (error) {
            console.error("Ошибка запроса к прокси-серверу:", error);
            responseEl.innerHTML = `<span style="color: #ff8a80;">${uiTexts.aiModal.error}</span>`;
            button.disabled = false;
            button.textContent = uiTexts.aiModal.button;
        }
    }
    close() {
        const lastStep = this.currentCardIndex;
        gsap.to(this.overlay, {
            opacity: 0,
            duration: 0.4,
            onComplete: () => {
                this.overlay.remove();
                this.isInitialized = false;
                document.removeEventListener('keydown', this.handleKeyboard);
                
                if (this.chosenCards.length < 3) {
                    if (this.onCloseCallback) this.onCloseCallback(lastStep);
                } else {
                    this.seenCardIndexes.clear();
                    if (window.Navigation && typeof window.Navigation.switchScreen === 'function') {
                        window.Navigation.switchScreen('start');
                    }
                }
            }
        });
    }
}

window.TarotCarousel = new TarotCarousel();