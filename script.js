// script.js — исправленная надёжная версия ленты и открытия карты

/* ---------- DOM ---------- */
const welcomeScreen = document.getElementById('welcome-screen');
const selectionScreen = document.getElementById('selection-screen');
const startBtn = document.getElementById('start-btn');
const backBtn = document.getElementById('back-btn');
const autoplayWelcomeBtn = document.getElementById('autoplay-welcome');

const tapeEl = document.getElementById('tape');
const detailPanel = document.getElementById('detail-panel');
const closeDetailBtn = document.getElementById('close-detail');
const detailTitle = document.getElementById('detail-title');
const detailGeneral = document.getElementById('detail-general');
const detailProject = document.getElementById('detail-project');
const detailCareer = document.getElementById('detail-career');
const detailKeywords = document.getElementById('detail-keywords');

const attractOverlay = document.getElementById('attract-overlay');
const attractCard = document.getElementById('attract-card');
const attractImage = document.getElementById('attract-image');

/* ---------- State & params ---------- */
// Поменяй gap здесь для плотности: уменьшай (8, 6, 4) — карты будут плотнее
let tapeItems = [];
let rafId = null;
let lastTime = null;
let paused = false;

let tapeSpeed = 160;     // px/sec — регулирует скорость
let gap = 8;             // расстояние между картами (меньше -> плотнее)
let thumbWidth = 160;
let thumbHeight = 220;

let welcomeAutoplay = false;
let welcomeInterval = null;

let animWrapper = null; // активная перевёрнутая обёртка

/* ---------- Helpers ---------- */
const px = v => `${Math.round(v)}px`;

/* ---------- Preload ---------- */
function preloadImages(){
  if (!Array.isArray(tarotCards)) return;
  tarotCards.forEach(c=> { const i=new Image(); i.src=c.image; });
  const back = new Image(); back.src = 'images/back.jpg';
}
window.addEventListener('load', preloadImages);

/* ---------- Navigation ---------- */
startBtn && startBtn.addEventListener('click', () => {
  welcomeScreen.classList.remove('active');
  selectionScreen.classList.add('active');
  buildTape();
  startLoop();
});
backBtn && backBtn.addEventListener('click', () => {
  stopLoop();
  selectionScreen.classList.remove('active');
  welcomeScreen.classList.add('active');
  stopWelcomeAutoplay();
});

/* ---------- Welcome autoplay (attract) ---------- */
autoplayWelcomeBtn && autoplayWelcomeBtn.addEventListener('click', () => {
  welcomeAutoplay = !welcomeAutoplay;
  autoplayWelcomeBtn.textContent = welcomeAutoplay ? 'Остановить автопоказ' : 'Автопоказ';
  if (welcomeAutoplay) startWelcomeAutoplay(); else stopWelcomeAutoplay();
});
function startWelcomeAutoplay(){
  stopWelcomeAutoplay();
  attractOverlay.classList.remove('hidden'); attractOverlay.classList.add('visible');
  showAttractCardOnce();
  welcomeInterval = setInterval(showAttractCardOnce, 4200);
}
function stopWelcomeAutoplay(){
  attractOverlay.classList.remove('visible'); attractOverlay.classList.add('hidden');
  if (welcomeInterval){ clearInterval(welcomeInterval); welcomeInterval = null; }
}
function showAttractCardOnce(){
  if (!Array.isArray(tarotCards) || !tarotCards.length) return;
  const idx = Math.floor(Math.random()*tarotCards.length);
  attractImage.src = tarotCards[idx].image;
  const node = attractCard;
  node.style.transition = 'none';
  node.style.transform = 'translateY(30vh) scale(.6)';
  node.classList.remove('flipped');
  requestAnimationFrame(()=>{
    node.style.transition = 'transform .8s cubic-bezier(.2,.9,.2,1)';
    node.style.transform = 'translateY(0) scale(1)';
    setTimeout(()=> { node.classList.add('flipped'); node.querySelector('.card-inner').style.transform = 'rotateY(180deg)'; }, 700);
    setTimeout(()=> { node.style.transform = 'translateY(-30vh) scale(.5)'; node.classList.remove('flipped'); node.querySelector('.card-inner').style.transform = ''; }, 3200);
  });
}

/* ---------- Build tape (robust & dense) ---------- */
function buildTape(){
  stopLoop();
  tapeEl.innerHTML = '';
  tapeItems = [];

  // measure thumb reliably
  const tmp = document.createElement('div');
  tmp.className = 'thumb';
  tmp.style.visibility = 'hidden';
  tmp.style.position = 'absolute';
  tmp.innerHTML = `<div class="card"><img src="images/back.jpg" alt=""></div>`;
  document.body.appendChild(tmp);
  const rect = tmp.getBoundingClientRect();
  if (rect.width > 8){
    thumbWidth = rect.width;
    thumbHeight = rect.height;
  } else {
    // fallback to computed style if rect fails
    const cs = getComputedStyle(tmp);
    const w = parseFloat(cs.width) || 160;
    thumbWidth = w;
  }
  tmp.remove();

  // spacing between card centers
  const spacing = Math.max(4, thumbWidth + gap);

  // how many cards to create so that viewport is fully covered + buffer
  const visibleCount = Math.ceil(window.innerWidth / spacing);
  const buffer = Math.max(8, visibleCount); // extra to avoid visible gaps during wrap
  const totalCount = visibleCount + buffer;

  // create items distributed left->right starting slightly off-left so movement looks continuous
  const startX = - (spacing * buffer / 2);

  for (let i = 0; i < totalCount; i++){
    const idx = i % tarotCards.length;
    const x = startX + i * spacing;
    const item = createTapeItem(idx, x);
    tapeItems.push(item);
    tapeEl.appendChild(item.el);
  }
}

/* create tape item element and state */
function createTapeItem(index, x){
  const el = document.createElement('div');
  el.className = 'thumb';
  el.dataset.index = index;
  el.style.left = '0';
  el.style.top = '50%';
  el.style.transform = `translate(${px(x)}, -50%)`;

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<div class="card-front"><img src="images/back.jpg" alt="рубашка"></div>
                    <div class="card-back"><img src="${tarotCards[index].image}" alt="${tarotCards[index].name}"></div>`;
  el.appendChild(card);

  const state = { el, index, x };

  // click -> open detail
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!paused) openDetailFromItem(state);
  });

  // small parallax tilt for pointer
  el.addEventListener('pointermove', (ev)=>{
    const inner = el.querySelector('.card');
    const rc = el.getBoundingClientRect();
    const dx = (ev.clientX - (rc.left + rc.width/2)) / (rc.width/2);
    const dy = (ev.clientY - (rc.top + rc.height/2)) / (rc.height/2);
    inner.style.transform = `rotateX(${(-dy*5).toFixed(2)}deg) rotateY(${(dx*6).toFixed(2)}deg)`;
  });
  el.addEventListener('pointerleave', ()=> { el.querySelector('.card').style.transform = ''; });

  return state;
}

/* ---------- RAF loop: move leftwards, wrap reliably ---------- */
function startLoop(){
  if (!rafId){
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }
}
function stopLoop(){
  if (rafId){
    cancelAnimationFrame(rafId);
    rafId = null;
    lastTime = null;
  }
}

function loop(now){
  if (!lastTime) lastTime = now;
  const dt = Math.min(60, now - lastTime);
  lastTime = now;

  if (!paused && tapeItems.length){
    const move = tapeSpeed * (dt / 1000);
    const spacing = Math.max(4, thumbWidth + gap);

    for (let it of tapeItems) it.x -= move;

    // wrap: when item completely left of -spacing, move it right by spacing*count
    const count = tapeItems.length;
    for (let it of tapeItems){
      if (it.x < - (spacing)){
        it.x += spacing * count;
      }
      it.el.style.transform = `translate(${px(it.x)}, -50%)`;
    }
  }

  rafId = requestAnimationFrame(loop);
}

/* ---------- Open detail: clone -> move -> flip -> show text panel aligned ---------- */
function openDetailFromItem(item){
  // prevent multiple detail windows
  if (animWrapper) {
    // if already open, close existing first
    closeDetailImmediate();
  }

  paused = true;

  const origImgEl = item.el.querySelector('.card-back img');
  const src = origImgEl ? origImgEl.src : tarotCards[item.index].image;
  const rect = item.el.getBoundingClientRect();

  // dim original in tape (keep it in DOM so movement unaffected)
  item.el.style.opacity = '0.08';
  item.el.style.pointerEvents = 'none';

  // create clone image that will travel to center-right
  const clone = document.createElement('img');
  clone.src = src;
  clone.style.position = 'fixed';
  clone.style.left = px(rect.left);
  clone.style.top = px(rect.top);
  clone.style.width = px(rect.width);
  clone.style.height = px(rect.height);
  clone.style.borderRadius = getComputedStyle(item.el.querySelector('.card')).borderRadius || '12px';
  clone.style.zIndex = 2200;
  clone.style.boxShadow = '0 48px 140px rgba(0,0,0,0.7)';
  clone.style.transition = 'all .52s cubic-bezier(.2,.9,.2,1)';
  document.body.appendChild(clone);

  // compute destination (slightly right of center, vertically centered)
  const targetWidth = Math.min(window.innerWidth * 0.34, 420);
  const targetHeight = Math.round(targetWidth * (rect.height / rect.width));
  const centerX = Math.round(window.innerWidth / 2 - targetWidth / 2);
  const offsetRight = Math.round(Math.min(160, window.innerWidth * 0.08));
  const targetX = centerX + offsetRight;
  const targetY = Math.round(window.innerHeight / 2 - targetHeight / 2);

  // move clone
  requestAnimationFrame(()=> {
    clone.style.left = px(targetX);
    clone.style.top = px(targetY);
    clone.style.width = px(targetWidth);
    clone.style.height = px(targetHeight);
  });

  // after movement finishes -> replace clone with wrapper and flip
  const onMoveEnd = () => {
    clone.removeEventListener('transitionend', onMoveEnd);

    const wrapper = document.createElement('div');
    wrapper.className = 'anim-wrapper';
    wrapper.style.position = 'fixed';
    wrapper.style.left = clone.style.left;
    wrapper.style.top = clone.style.top;
    wrapper.style.width = clone.style.width;
    wrapper.style.height = clone.style.height;
    wrapper.style.zIndex = 2300;
    wrapper.style.transformStyle = 'preserve-3d';
    wrapper.style.webkitTransformStyle = 'preserve-3d';
    wrapper.style.transition = 'transform .6s cubic-bezier(.2,.9,.2,1)';
    wrapper.style.perspective = '1200px';

    const front = document.createElement('div');
    front.style.backfaceVisibility = 'hidden';
    front.style.webkitBackfaceVisibility = 'hidden';
    front.style.borderRadius = clone.style.borderRadius;
    front.style.overflow = 'hidden';
    front.style.width = '100%';
    front.style.height = '100%';
    front.innerHTML = `<img src="images/back.jpg" style="width:100%;height:100%;object-fit:cover">`;

    const back = document.createElement('div');
    back.style.backfaceVisibility = 'hidden';
    back.style.webkitBackfaceVisibility = 'hidden';
    back.style.transform = 'rotateY(180deg)';
    back.style.borderRadius = clone.style.borderRadius;
    back.style.overflow = 'hidden';
    back.style.width = '100%';
    back.style.height = '100%';
    back.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover">`;

    wrapper.appendChild(front);
    wrapper.appendChild(back);

    clone.remove();
    animWrapper = wrapper;
    document.body.appendChild(wrapper);

    // small delay then flip (ensures wrapper inserted)
    requestAnimationFrame(()=> {
      wrapper.style.transform = 'rotateY(180deg)';
      wrapper.style.webkitTransform = 'rotateY(180deg)';
    });

    // align detail panel on the same vertical level, adjacent to wrapper
    setTimeout(()=> { showPanelAligned(wrapper, item.index); }, 180);
  };

  clone.addEventListener('transitionend', onMoveEnd);
}

/* ---------- Panel placement & population ---------- */
function showPanelAligned(wrapper, index){
  if (!wrapper) return;
  const wrapRect = wrapper.getBoundingClientRect();
  const panel = detailPanel;

  // fill text
  const card = tarotCards[index];
  detailTitle.textContent = card.name;
  detailGeneral.textContent = card.general;
  detailProject.textContent = card.project;
  detailCareer.textContent = card.career;
  detailKeywords.textContent = card.keywords;

  const gapPanel = 18;
  const panelWidth = Math.min(window.innerWidth * 0.34, 480);

  // prefer right placement; if doesn't fit, put left
  let left = wrapRect.right + gapPanel;
  if (left + panelWidth > window.innerWidth - 12){
    left = wrapRect.left - gapPanel - panelWidth;
  }
  left = Math.max(12, left);

  // vertical center alignment to wrapper
  const wrapCenterY = wrapRect.top + wrapRect.height / 2;
  const panelTop = wrapCenterY - ( (wrapRect.height) / 2 ); // we align panel center with wrapper center via CSS translateY(-50%)

  panel.style.width = px(panelWidth);
  panel.style.left = px(left);
  panel.style.top = '50%';
  panel.style.transform = 'translateY(-50%)';

  panel.classList.remove('hidden');
  panel.classList.add('visible');
  panel.setAttribute('aria-hidden', 'false');
}

/* ---------- Close detail ---------- */
function closeDetailImmediate(){
  // hide panel
  detailPanel.classList.remove('visible'); detailPanel.classList.add('hidden'); detailPanel.setAttribute('aria-hidden','true');
  // remove wrapper if present
  if (animWrapper && animWrapper.parentNode) animWrapper.parentNode.removeChild(animWrapper);
  animWrapper = null;
  // restore tape visuals
  tapeItems.forEach(it => { it.el.style.opacity = '1'; it.el.style.pointerEvents = ''; });
  paused = false;
}

function closeDetail(){
  closeDetailImmediate();
}
closeDetailBtn && closeDetailBtn.addEventListener('click', closeDetail);

// click outside -> close (safeguard)
document.addEventListener('click', (e)=>{
  if (!detailPanel.classList.contains('visible')) return;
  const path = e.composedPath ? e.composedPath() : (e.path || []);
  // if click not inside panel and not inside animWrapper -> close
  if (!path.includes(detailPanel) && !path.some(node => node && node.classList && node.classList.contains && node.classList.contains('anim-wrapper'))) {
    closeDetail();
  }
}, true);

/* ---------- Resize handling ---------- */
window.addEventListener('resize', ()=>{
  // rebuild the tape so distribution adapts to viewport changes
  // keep play/pause state
  const wasPaused = paused;
  stopLoop();
  buildTape();
  if (!wasPaused) startLoop();
});

/* ---------- Canvas background (kept) ---------- */
(function setupFlowBg(){
  const canvas = document.getElementById('flow-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = innerWidth, h = innerHeight;
  canvas.width = w; canvas.height = h;
  window.addEventListener('resize', ()=> { w = innerWidth; h = innerHeight; canvas.width = w; canvas.height = h; });

  const particles = [];
  const N = 120;
  for (let i=0;i<N;i++){
    particles.push({
      x: Math.random()*w,
      y: Math.random()*h,
      vx: (Math.random()*2-1) * 0.9,
      vy: -0.2 - Math.random()*0.6,
      size: 1 + Math.random()*4,
      alpha: 0.06 + Math.random()*0.34,
      offset: Math.random()*Math.PI*2,
      phase: 0.002 + Math.random()*0.01
    });
  }

  let t0 = performance.now();
  function draw(now){
    const t = (now - t0) * 0.0014;
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0, 'rgba(0,55,105,0.22)');
    g.addColorStop(0.6, 'rgba(0,40,70,0.12)');
    g.addColorStop(1, 'rgba(0,20,35,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    for (let p of particles){
      p.x += p.vx + Math.sin(t * p.phase + p.offset) * 2.2;
      p.y += p.vy;
      if (p.y < -60 || p.x < -100 || p.x > w+100){
        p.x = Math.random()*w;
        p.y = h + Math.random()*80;
        p.vx = (Math.random()*2-1)*0.9;
        p.vy = -0.2 - Math.random()*0.6;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(0,162,225,${p.alpha})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 10, p.y - p.vy * 10);
      ctx.strokeStyle = `rgba(0,162,225,${p.alpha*0.45})`;
      ctx.lineWidth = Math.max(1, p.size/1.5);
      ctx.stroke();
    }

    const cx = w*0.2 + Math.sin(now*0.0005) * w*0.5;
    const cy = h*0.4 + Math.cos(now*0.00035) * h*0.2;
    const rg = ctx.createRadialGradient(cx,cy,40,cx,cy, Math.max(w,h));
    rg.addColorStop(0, 'rgba(0,160,225,0.08)');
    rg.addColorStop(0.6, 'rgba(0,40,80,0.02)');
    rg.addColorStop(1, 'rgba(0,20,40,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0,0,w,h);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
