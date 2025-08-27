const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits = [
  { sym:"♣", name:"Clubs",  color:"#111" },
  { sym:"♦", name:"Diamonds", color:"#c1121f" },
  { sym:"♥", name:"Hearts",   color:"#c1121f" },
  { sym:"♠", name:"Spades",   color:"#111" }
];

let deck = [];
let score = 0;
let jacks = 0;

const els = {
  card: document.getElementById("card"),
  score: document.getElementById("score"),
  left: document.getElementById("left"),
  jacks: document.getElementById("jacks"),
  drawBtn: document.getElementById("drawBtn"),
  resetBtn: document.getElementById("resetBtn")
};

function buildDeck(){
  const d = [];
  for (const s of suits){
    for (const r of ranks){
      d.push({ rank:r, suit:s.sym, color:s.color });
    }
  }
  return d;
}

function shuffle(array){
  for(let i=array.length-1; i>0; i--){
    const j = Math.floor(Math.random()* (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function drawCard(){
  if (deck.length === 0) {
    flashEmpty();
    return;
  }
  const card = deck.pop();
  renderCard(card);
  if (card.rank === "J"){
    score += 1;
    jacks += 1;
    pulse(els.score);
  }
  renderStats();
}

function renderCard(card){
  els.card.innerHTML = "";
  els.card.style.color = card.color;
  const big = document.createElement("div");
  big.textContent = `${card.rank}${card.suit}`;
  const top = document.createElement("div");
  top.className = "small";
  top.textContent = `${card.rank}${card.suit}`;
  const bottom = document.createElement("div");
  bottom.className = "small bottom";
  bottom.textContent = `${card.rank}${card.suit}`;
  els.card.appendChild(top);
  els.card.appendChild(big);
  els.card.appendChild(bottom);
}

function renderStats(){
  els.score.textContent = String(score);
  els.left.textContent = String(deck.length);
  els.jacks.textContent = String(jacks);
}

function flashEmpty(){
  els.card.innerHTML = '<div class="empty">Deck empty — press Reset</div>';
}

function pulse(el){
  el.animate([{transform:"scale(1)"},{transform:"scale(1.15)"},{transform:"scale(1)"}],
             {duration:300, easing:"ease-out"});
}

function resetGame(){
  deck = shuffle(buildDeck());
  score = 0;
  jacks = 0;
  els.card.innerHTML = '<div class="empty">New deck ready — draw!</div>';
  els.card.style.color = "#111";
  renderStats();
}

// Events
els.drawBtn.addEventListener("click", drawCard);
els.resetBtn.addEventListener("click", resetGame);
window.addEventListener("keydown", (e)=>{
  if (e.code === "Space"){ e.preventDefault(); drawCard(); }
});

// init
resetGame();
