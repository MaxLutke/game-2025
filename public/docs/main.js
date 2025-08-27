/* High–Low Rush — Aces high, first card face‑up. Includes bets, cash out, dramatic audio and effects. */
const SUITS = [
  { sym: "♣", color: "black" },
  { sym: "♦", color: "red"   },
  { sym: "♥", color: "red"   },
  { sym: "♠", color: "black" }
];
const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const rankVal = r => r === "A" ? 14 : r === "K" ? 13 : r === "Q" ? 12 : r === "J" ? 11 : parseInt(r, 10);
const buildDeck = () => { const d=[]; for(const s of SUITS){ for(const r of RANKS){ d.push({rank:r,suit:s.sym,color:s.color}); } } return d; };
const shuffle = a => { for(let i=a.length-1; i>0; i--){ const j = Math.floor(Math.random() * (i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };

// Audio (WebAudio) with pitch slides and arpeggios for drama
let actx = null;
const ensureAC = () => { if(!actx){ actx = new (window.AudioContext || window.webkitAudioContext)(); } };
function tone({f=440,d=0.1,t="sine",g=0.07,slide=0} = {}) {
  ensureAC();
  const now = actx.currentTime;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = t;
  osc.frequency.setValueAtTime(f, now);
  if(slide) osc.frequency.linearRampToValueAtTime(f + slide, now + d);
  gain.gain.setValueAtTime(g, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + d);
  osc.connect(gain).connect(actx.destination);
  osc.start(now);
  osc.stop(now + d);
}
const sfx = {
  draw(){ tone({f:360, d:0.06, t:"square", g:0.05}); },
  whoosh(){ tone({f:240,d:0.10,t:"sine",g:0.05,slide:-80}); },
  correct(mult){ const base=720*(1+0.05*(mult-1)); tone({f:base,d:0.07,t:"triangle",g:0.09,slide:80}); setTimeout(()=>tone({f:base*1.4,d:0.07,t:"triangle",g:0.08,slide:60}),70); setTimeout(()=>tone({f:base*1.7,d:0.06,t:"square",g:0.08}),140); },
  multUp(){ [660,880,990,1320].forEach((f,i)=>setTimeout(()=>tone({f,d:0.06,t:"triangle",g:0.08}), i*60)); },
  cash(){ tone({f:220,d:0.12,t:"sawtooth",g:0.10}); setTimeout(()=>tone({f:440,d:0.10,t:"triangle",g:0.12}),90); setTimeout(()=>tone({f:880,d:0.10,t:"triangle",g:0.12}),170); setTimeout(()=>tone({f:1320,d:0.08,t:"square",g:0.10}),230); },
  wrong(){ tone({f:180,d:0.12,t:"sawtooth",g:0.12}); setTimeout(()=>tone({f:120,d:0.16,t:"sawtooth",g:0.11}),110); },
  over(){ [330,196,130].forEach((f,i)=>setTimeout(()=>tone({f,d:0.12,t:"sawtooth",g:0.10}), i*120)); }
};

// DOM elements
const $ = id => document.getElementById(id);
const els = {
  left: $("left"), best: $("best"), streak: $("streak"), mult: $("mult"),
  cash: $("cash"), moneyHud: $("moneyHud"), potEl: $("pot"),
  face: $("face"), msg: $("msg"), shock: $("shock"),
  higher: $("higherBtn"), lower: $("lowerBtn"), cashBtn: $("cashBtn"),
  fx: $("fx"), toast: $("toast")
};
const chips = [...document.querySelectorAll(".chip")];

// Game state
let deck = [], current = null, started = false, ended = false;
let streak = 0, multiplier = 1;
let bank = 0, pot = 0, bestCash = parseInt(localStorage.getItem("hl_best_cash") || "0", 10);
let baseBet = 5;

// Init
resizeCanvas();
window.addEventListener("resize", resizeCanvas, {passive:true});
chips.forEach(c => c.addEventListener("click", () => setBet(parseInt(c.dataset.bet, 10))));
setBet(5);
resetGame(true);

function resetGame(first=false) {
  deck = shuffle(buildDeck());
  current = null;
  started = false;
  ended = false;
  streak = 0;
  multiplier = 1;
  pot = 0;
  if(!first) bank = 0;
  renderHUD(true);
  renderMeta();
  renderFace(null,false);
  // Draw initial card face up
  current = deck.pop();
  renderFace(current, true);
  sfx.draw();
  started = true;
  renderMeta();
  setMsg("Aces are highest. Choose Higher or Lower.");
}

function guess(dir) {
  if(ended) { resetGame(); return; }
  press(dir > 0 ? els.higher : els.lower);
  if(deck.length === 0) { endOfDeck(); return; }
  const next = deck.pop();
  flyAwayClone(current, dir);
  sfx.whoosh();
  setTimeout(() => { renderFace(next, true); sfx.draw(); }, 150);
  const a = rankVal(current.rank), b = rankVal(next.rank);
  const cmp = b === a ? 0 : (b > a ? +1 : -1);
  if(cmp === 0) {
    onMiss(next, "Tie! Same rank.");
  } else if(cmp === dir) {
    onHit(next);
  } else {
    onMiss(next, `${next.rank}${next.suit} is ${cmp>0?"higher":"lower"} than ${current.rank}${current.suit}.`);
  }
}

function onHit(next) {
  const prevMult = multiplier;
  streak += 1;
  multiplier = 1 + Math.floor(streak / 3);
  const gain = baseBet * multiplier;
  pot += gain;
  if(multiplier > prevMult) {
    sfx.multUp();
    radialShock("#ffd166");
  } else {
    sfx.correct(multiplier);
  }
  setMsg(streak >= 3 ? `🔥 Streak ${streak}! Multiplier x${multiplier}.` : "Nice! Keep going.", "good");
  current = next;
  renderHUD();
  renderMeta();
  faceGlow();
  pointsToast(`+$${gain}`);
  coinBurstAroundFace();
}

function onMiss(next, why) {
  if(pot > 0) {
    radialShock("#ff4d4d");
    screenShake();
  }
  pot = 0;
  streak = 0;
  multiplier = 1;
  sfx.wrong();
  setMsg(`Miss! ${why}`, "bad");
  current = next;
  renderHUD();
  renderMeta();
  faceShake();
}

function endOfDeck() {
  const bonus = 50;
  bank += pot + bonus;
  animateBankTo(bank);
  pot = 0;
  renderHUD();
  renderMeta();
  setMsg(`🎉 Deck cleared! +$${bonus} bonus banked. New deck ready — keep playing.`, "good");
  deck = shuffle(buildDeck());
}

function cashOut() {
  press(els.cashBtn);
  if(pot <= 0) { setMsg("Nothing to cash out yet.",""); return; }
  bank += pot;
  sfx.cash();
  radialShock("#ffe97a");
  animateBankTo(bank);
  pot = 0;
  renderHUD();
  renderMeta();
  coinBurstAroundMoney();
}

// Rendering
function renderFace(card, animate=false) {
  const el = els.face;
  if(!card) {
    el.className = "face";
    el.innerHTML = `<div class="big">?</div>`;
    return;
  }
  el.className = "face " + (card.color === "red" ? "red" : "black");
  el.innerHTML = `
    <div class="small">${card.rank}${card.suit}</div>
    <div class="big">${card.rank}${card.suit}</div>
    <div class="small bottom">${card.rank}${card.suit}</div>
  `;
  if(animate) {
    el.classList.add("flip");
    setTimeout(() => el.classList.remove("flip"), 280);
  }
}

function renderMeta() {
  els.left.textContent = String(deck.length);
  els.streak.textContent = String(streak);
  els.mult.textContent = "x" + multiplier;
  if(bank > bestCash) {
    bestCash = bank;
    localStorage.setItem("hl_best_cash", String(bestCash));
  }
  els.best.textContent = String(bestCash);
}

function renderHUD(instant=false) {
  els.cash.textContent = moneyFmt(bank);
  els.moneyHud.classList.add("pop");
  setTimeout(() => els.moneyHud.classList.remove("pop"), 450);
  els.potEl.textContent = "Pot: +" + moneyFmt(pot).replace("$","");
}

function moneyFmt(n) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function animateBankTo(target) {
  const start = parseInt(els.cash.textContent.replace(/[^0-9]/g,"") || "0", 10);
  const end = target;
  const dur = 520;
  const t0 = performance.now();
  (function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    const val = Math.round(start + (end - start) * e);
    els.cash.textContent = moneyFmt(val);
    if(p < 1) requestAnimationFrame(step);
  })(performance.now());
}

function setMsg(t, kind="") {
  els.msg.className = "msg " + (kind || "");
  els.msg.textContent = t;
}

function setBet(v) {
  baseBet = v;
  chips.forEach(ch => ch.classList.toggle("active", parseInt(ch.dataset.bet, 10) === v));
  setMsg(`Base bet set to $${v}.`, "");
}

// Effects
function press(btn) { btn.classList.remove("press"); void btn.offsetWidth; btn.classList.add("press"); }
function faceGlow() { els.face.classList.add("glow"); setTimeout(() => els.face.classList.remove("glow"), 500); }
function faceShake() { els.face.classList.add("shake"); setTimeout(() => els.face.classList.remove("shake"), 280); }
function screenShake() {
  const tbl = document.querySelector(".table");
  const orig = tbl.style.transform;
  let i = 0;
  const id = setInterval(() => {
    tbl.style.transform = `translate(${(Math.random()*6-3)}px, ${(Math.random()*6-3)}px)`;
    if(++i > 12) { clearInterval(id); tbl.style.transform = orig; }
  }, 18);
}
function radialShock(color="#fff") {
  const s = els.shock;
  s.style.background = `radial-gradient(circle at 50% 50%, ${color} 0%, rgba(255,255,255,0) 60%)`;
  s.style.transition = "none";
  s.style.opacity = "0.75";
  requestAnimationFrame(() => {
    s.style.transition = "opacity .35s ease";
    s.style.opacity = "0";
  });
}
function flyAwayClone(card, dir) {
  const host = document.querySelector(".table");
  const rect = els.face.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const clone = document.createElement("div");
  clone.className = "fly " + (card.color === "red" ? "red" : "black");
  clone.style.left = (rect.left - hostRect.left) + "px";
  clone.style.top  = (rect.top  - hostRect.top) + "px";
  clone.innerHTML = `
    <div class="small">${card.rank}${card.suit}</div>
    <div class="big" style="font-size:88px">${card.rank}${card.suit}</div>
    <div class="small bottom">${card.rank}${card.suit}</div>
  `;
  host.appendChild(clone);
  clone.style.animation = (dir > 0 ? "upRight" : "downRight") + " .6s cubic-bezier(.2,.8,.2,1) forwards";
  setTimeout(() => clone.remove(), 640);
}

// Confetti coins
let P = [];
function resizeCanvas() {
  const c = els.fx;
  const dpr = window.devicePixelRatio || 1;
  const box = c.getBoundingClientRect();
  c.width  = Math.max(1, Math.floor(box.width * dpr));
  c.height = Math.max(1, Math.floor(box.height * dpr));
  c.style.width  = box.width  + "px";
  c.style.height = box.height + "px";
  els.fx.getContext("2d");
}
function coinBurstAroundFace() {
  const host = document.querySelector(".table").getBoundingClientRect();
  const r = els.face.getBoundingClientRect();
  burst((r.left + r.right) / 2 - host.left, (r.top + r.bottom) / 2 - host.top, 32);
}
function coinBurstAroundMoney() {
  const host = document.querySelector(".table").getBoundingClientRect();
  const r = document.getElementById("moneyHud").getBoundingClientRect();
  burst((r.left + r.right) / 2 - host.left, (r.top + r.bottom) / 2 - host.top, 42);
}
function burst(x, y, count) {
  for(let i = 0; i < count; i++){
    const a = Math.random() * Math.PI * 2;
    const v = 160 + Math.random() * 220;
    P.push({
      x,y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90,
      life: 800 + Math.random() * 500, t: 0, r: 3 + Math.random() * 3,
      flip: Math.random() * Math.PI,
      col: Math.random() < .5 ? "#ffd166" : "#ffb703"
    });
  }
}
(function loop() {
  requestAnimationFrame(loop);
  const ctx = els.fx.getContext("2d");
  if(!ctx) return;
  ctx.clearRect(0,0,els.fx.width, els.fx.height);
  P = P.filter(p => p.t < p.life);
  for(const p of P) {
    p.t += 16;
    const t = p.t / 1000;
    const g = 750;
    const x = p.x + p.vx * t;
    const y = p.y + p.vy * t + 0.5 * g * t * t;
    const alpha = Math.max(0, 1 - p.t / p.life);
    const w = (p.r * (1 + Math.sin(p.flip + p.t * .02)));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.ellipse(x, y, (w+2), p.r, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = alpha * .7;
    ctx.fillStyle = "#fff6";
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 2, w, (p.r - 1), 0, 0, Math.PI*2);
    ctx.fill();
  }
})();

// Events
els.higher.addEventListener("click", () => guess(+1));
els.lower.addEventListener("click", () => guess(-1));
els.cashBtn.addEventListener("click", cashOut);
document.addEventListener("keydown", e => {
  if(["ArrowUp","w","W","h","H"].includes(e.key)) { e.preventDefault(); guess(+1); }
  if(["ArrowDown","s","S","l","L"].includes(e.key)) { e.preventDefault(); guess(-1); }
  if(["c","C"].includes(e.key)) { e.preventDefault(); cashOut(); }
});

