class TarotCarousel {
    constructor() {
        this.chosenCards = [];
        this.allCarouselCards = [];
        this.currentCardIndex = 0;
        this.aiResponseText = null;
        this.isInitialized = false;
        this.seenCardIndexes = new Set();

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

        // ИСПРАВЛЕНО: Привязываем контекст 'this' к методам в конструкторе
        this.handleKeyboard = this.handleKeyboard.bind(this);
        this.close = this.close.bind(this); // <-- Вот это исправление
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
            <main class="carousel-main"><div class="card-stage"></div></main>
            <section class="carousel-panel"></section>`;
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    attachEventListeners() {
        // Теперь мы можем передавать this.close напрямую, так как он привязан в конструкторе
        this.overlay.querySelector('.carousel-close-button').addEventListener('click', this.close);
        document.addEventListener('keydown', this.handleKeyboard);
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
            setTimeout(() => this.flipCard(this.currentCardIndex), 200);
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
        cardDiv.addEventListener('click', () => this.goToCard(index));
        
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

        const stage = this.overlay.querySelector('.card-stage');
        stage.className = 'card-stage';
        panel.className = 'carousel-panel';
        if (theme) {
            stage.classList.add(`${theme.name}-glow`);
            panel.classList.add(`${theme.name}-border`);
        }

        let panelHTML = '';

        if (cardData.id === 'ai') {
            const buttonText = this.aiResponseText ? "Посмотреть предсказание" : "Спросить Оракула";
            panelHTML = `
                <div class="card-details-content">
                    <div class="card-name" style="color:${theme.color};">${cardData.name}</div>
                    <div class="card-keyword" style="background-color:${theme.color};">${cardData.keyword}</div>
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
            card.classList.add('flipped');
            this.seenCardIndexes.add(index);
        }
    }
    
    goToCard(index) {
        if (index < 0 || index >= this.allCarouselCards.length || index === this.currentCardIndex) return;
        
        this.currentCardIndex = index;
        this.positionCards();
        this.updateDetailsPanel();
        
        if (!this.seenCardIndexes.has(index)) {
            setTimeout(() => this.flipCard(this.currentCardIndex), 300);
        }
    }
    
    handleKeyboard(e) {
        if (!this.isInitialized) return;
        if (e.key === 'ArrowLeft') this.goToCard(this.currentCardIndex - 1);
        if (e.key === 'ArrowRight') this.goToCard(this.currentCardIndex + 1);
        if (e.key === 'Escape') this.close();
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
                <textarea class="ai-input" placeholder="Например: какие риски в проекте?"></textarea>
                <button class="ai-button">Получить предсказание</button>
                <div class="ai-response" style="display:none;"></div>`;
        }

        modal.innerHTML = `
            <div class="ai-modal-panel">
                <div class="ai-title">🤖 Персональный анализ</div>
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
        button.textContent = 'Анализ...';
        responseEl.style.display = 'block';
        responseEl.innerHTML = `🔮 Соединяюсь с цифровым потоком...`;

        const prompt = `Ты - цифровой оракул... (ваш промпт)`;
        try {
            // ... (ваш код запроса к PHP-серверу)
            
            // Mock response for demonstration
            await new Promise(resolve => setTimeout(resolve, 1500));
            const text = `Ваш вопрос "${input.value}" раскрывает глубокий смысл. **Вызов** (${this.chosenCards[0].name}) говорит о скрытых технических долгах. **Путь** (${this.chosenCards[1].name}) лежит через рефакторинг и командную работу. **Исход** (${this.chosenCards[2].name}) обещает стабильный релиз и признание.`;

            this.aiResponseText = text;
            responseEl.innerHTML = this.aiResponseText;

            input.style.display = 'none';
            button.style.display = 'none';

        } catch (error) {
            responseEl.innerHTML = `<span style="color: #ff8a80;">Упс! Ошибка соединения.</span>`;
            button.disabled = false;
            button.textContent = 'Получить предсказание';
        }
    }

    close() {
        gsap.to(this.overlay, {
            opacity: 0,
            duration: 0.4,
            onComplete: () => {
                this.overlay.remove();
                this.isInitialized = false;
                document.removeEventListener('keydown', this.handleKeyboard);
                
                if (this.chosenCards.length < 3) {
                    if (this.onCloseCallback) this.onCloseCallback();
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