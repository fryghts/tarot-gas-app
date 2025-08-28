window.ResultScreen = {
    currentCard: 0,
    cardData: [],
    
    show(cards, currentStep, onCompleteCallback) {
        this.cardData = cards.filter(c => c);
        this.currentCard = this.cardData.length - 1;
        this.render(false, currentStep);
        this.updateControls(false);
        
        const slide = document.querySelectorAll('.reveal-slide')[this.currentCard];
        const cardEl = slide.querySelector('.tarot-card');
        const texts = slide.querySelectorAll('.reveal-text');
        
        gsap.fromTo(document.getElementById('reveal-overlay'), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', onStart: () => document.getElementById('reveal-overlay').classList.add('active') });
        
        gsap.to(cardEl, {
            rotationY: 180,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => {
                texts.forEach((text, index) => {
                    gsap.delayedCall(0.2 + index * 0.6, () => text.classList.add('visible'));
                });
                
                if (currentStep < 2) {
                    document.getElementById('reveal-overlay').onclick = () => {
                        document.getElementById('reveal-overlay').onclick = null;
                        gsap.to(document.getElementById('reveal-overlay'), { scale: 0.9, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: onCompleteCallback });
                    };
                } else {
                    // Это последняя карта, плавно переходим в финальный режим
                    onCompleteCallback();
                }
            }
        });
    },

    initialize(chosenCards) {
        this.cardData = chosenCards;
        this.currentCard = chosenCards.length - 1; // Начинаем с последней выбранной карты
        this.render(true);
        this.updateControls(true);

        if (!document.getElementById('reveal-overlay').classList.contains('active')) {
             gsap.fromTo(document.getElementById('reveal-overlay'), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out', onStart: () => document.getElementById('reveal-overlay').classList.add('active') });
        }
        
        const finalPrompt = document.getElementById('final-prompt');
        finalPrompt.innerHTML = "Смахните вправо, чтобы услышать Оракула";
        const promptTimeline = gsap.timeline({delay: 2});
        promptTimeline.to(finalPrompt, { opacity: 1, duration: 1 })
                      .to(finalPrompt, { opacity: 0, duration: 1, delay: 3 });
    },

    render(isFinal = false, currentStep = 0) {
        const container = document.getElementById('reveal-container');
        if (!container) return;
        container.innerHTML = ''; 
        const themes = ['challenge-theme', 'path-theme', 'outcome-theme'];
        
        this.cardData.forEach((card, index) => {
            if (!card) return; // Добавлена проверка на случай ошибки
            const prophecyType = themes[index].split('-')[0];
            const theme = themes[index];
            const slide = document.createElement('div');
            slide.className = 'reveal-slide';
            slide.innerHTML = `
                <div class="reveal-slide-content ${theme}">
                    <div class="reveal-image-wrapper">
                        <div class="tarot-card" style="transform: rotateY(${isFinal || index < currentStep ? '180deg' : '0deg'});">
                           <div class="card-face card-back"></div>
                           <div class="card-face card-front" style="background-image: url('${card.image}');"></div>
                        </div>
                    </div>
                    <div class="reveal-text-content">
                        <h2 class="reveal-name reveal-text ${isFinal || index < currentStep || this.cardData.length-1 === index ? 'visible' : ''}">${card.name}</h2>
                        <p class="reveal-keyword reveal-text ${isFinal || index < currentStep || this.cardData.length-1 === index ? 'visible' : ''}">${card.keyword}</p>
                        <p class="reveal-prophecy reveal-text ${isFinal || index < currentStep || this.cardData.length-1 === index ? 'visible' : ''}">${card.prophecy[prophecyType]}</p>
                    </div>
                </div>
            `;
            container.appendChild(slide);
        });

        if (isFinal) {
            const oracleSlide = document.createElement('div');
            oracleSlide.className = 'reveal-slide';
            oracleSlide.innerHTML = `
                <div class="reveal-slide-content ai-theme">
                    <div class="reveal-image-wrapper">
                        <img src="images/oracul.png" alt="AI Oracle" style="width:100%; height:100%; border-radius: 15px; object-fit: cover;">
                    </div>
                    <div class="oracle-slide-content">
                         <h2 class="ai-title">Глубинный Анализ</h2>
                         <p class="ai-subtitle">Нейросеть может заглянуть глубже. Получите персональную трактовку вашего IT-расклада.</p>
                         <button class="ai-action-btn" onclick="ResultScreen.showAI()">Раскрыть предсказание</button>
                    </div>
                </div>
            `;
            container.appendChild(oracleSlide);
        }
    },

    updateControls(isFinal) {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const closeBtn = document.getElementById('close-reveal-btn');
        const container = document.getElementById('reveal-container');

        if (document.getElementById('final-prompt')) document.getElementById('final-prompt').style.opacity = 0;

        prevBtn.style.display = isFinal ? 'block' : 'none';
        nextBtn.style.display = isFinal ? 'block' : 'none';
        closeBtn.style.display = isFinal ? 'block' : 'none';

        if (isFinal) {
            prevBtn.disabled = this.currentCard === 0;
            nextBtn.disabled = this.currentCard === this.cardData.length;
        }
        container.style.transform = `translateX(-${this.currentCard * 100}%)`;
    },
    
    setupEventListeners() {
        document.getElementById('close-reveal-btn').onclick = () => {
            gsap.to(document.getElementById('reveal-overlay'), { scale: 0.9, opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => {
                document.getElementById('reveal-overlay').classList.remove('active');
                if (typeof Navigation !== 'undefined') {
                    Navigation.switchScreen('start'); 
                } else {
                    document.body.innerHTML = '<h1 style="color: white; text-align: center; margin-top: 50px;">Тест завершен. Перезагрузите страницу.</h1>';
                }
            }});
        };
        document.getElementById('prev-btn').onclick = () => this.prevCard();
        document.getElementById('next-btn').onclick = () => this.nextCard();
    },
    
    nextCard() { if (this.currentCard < this.cardData.length) { this.currentCard++; this.updateControls(true); } },
    prevCard() { if (this.currentCard > 0) { this.currentCard--; this.updateControls(true); } },

    showAI() { document.getElementById('ai-overlay').classList.add('active'); },
    hideAI() { document.getElementById('ai-overlay').classList.remove('active'); },
    
    async requestAI() {
        const apiKey = "AIzaSyCmqT_oPvpqYKgRxU8LItCuFZY0NY3ulu8";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const question = document.getElementById('ai-question').value;
        const responseEl = document.getElementById('ai-response');
        const btn = document.querySelector('#ai-overlay .ai-btn');
        const btnText = document.getElementById('ai-btn-text');
        if (!question.trim()){ alert("Введите ваш вопрос."); return; }
        btn.disabled = true;
        btnText.textContent = 'Анализ...';
        responseEl.classList.add('visible');
        responseEl.innerHTML = `<em style="color: var(--ai-color);">🔮 Соединяюсь с цифровым потоком...</em>`;
        const cardDataSource = this.cardData;
        if (!cardDataSource || cardDataSource.length < 3 || cardDataSource.some(c => !c)) {
             responseEl.innerHTML = `<span style="color: #ff8a80;">Ошибка: данные карт для анализа неполные.</span>`;
             btn.disabled = false; btnText.textContent = 'Спросить'; return;
        }
        const prompt = `
            Ты - цифровой оракул, IT-таролог. Тебе предоставили расклад из трех карт Таро.
            Твоя задача - дать глубокую, но лаконичную и полезную интерпретацию этого расклада в контексте заданного вопроса.
            Вот данные расклада:
            1.  **Вызов (Challenge):** Карта "${cardDataSource[0].name}".
            2.  **Путь (Path):** Карта "${cardDataSource[1].name}".
            3.  **Исход (Outcome):** Карта "${cardDataSource[2].name}".
            А вот вопрос от пользователя: "${question}"
            Проанализируй синергию этих трех карт и дай ответ на вопрос пользователя, связывая его с каждой картой.
            Структурируй свой ответ: начни с общего вывода, а затем кратко поясни роль каждой карты в контексте вопроса.
            Говори как мудрый, но современный IT-пророк. Не используй описания карт, которые я тебе дал, а только их названия.`;
        try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(`Ошибка API: ${response.status} ${response.statusText}`); }
            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts[0].text) {
                const text = data.candidates[0].content.parts[0].text;
                responseEl.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            } else { throw new Error("API не вернуло валидного ответа."); }
        } catch (error) {
            console.error("Ошибка запроса к Gemini API:", error);
            responseEl.innerHTML = `<span style="color: #ff8a80;">Упс! Кажется, цифровые духи не в настроении. Ошибка: ${error.message}</span>`;
        } finally {
            btn.disabled = false; btnText.textContent = 'Спросить';
        }
    }
};

ResultScreen.setupEventListeners();