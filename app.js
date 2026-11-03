const API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const $ = (id) => document.getElementById(id);
const METRICS = {PTS:"Pontos",REB:"Rebotes",AST:"Assistências","3PT":"Cestas de 3",STL:"Roubos",BLK:"Tocos",TO:"Turnovers"};
let games = [], gamePlayers = new Map(), goals = loadGoals(), pollTimer = null, toastTimer;

function loadGoals(){try{return JSON.parse(localStorage.getItem("nba-alert-goals")||"[]")}catch{return []}}
function saveGoals(){localStorage.setItem("nba-alert-goals",JSON.stringify(goals));renderGoals()}
function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),3000)}
function setConnection(state,label){$("connection").className="connection "+state;$("connection").lastChild.textContent=" "+label}
async function getJSON(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("Falha ao consultar os dados ("+r.status+")");return r.json()}
function gameLabel(g){const c=g.competitions?.[0]?.competitors||[];const a=c.find(x=>x.homeAway==="away"),h=c.find(x=>x.homeAway==="home");return `${a?.team?.abbreviation||"?"} x ${h?.team?.abbreviation||"?"}`}
function statusLabel(g){return g.status?.type?.shortDetail||g.status?.type?.detail||"Aguardando"}
function parseStat(code,raw){
  if(raw==null||raw==="--")return 0;
  if(code==="3PT"){const n=String(raw).match(/^(\d+)/);return n?Number(n[1]):Number(raw)||0}
  if(["FG","FT"].includes(code)){const n=String(raw).match(/^(\d+)/);return n?Number(n[1]):0}
  const n=Number(String(raw).replace("%",""));return Number.isFinite(n)?n:0;
}
function normalisePlayers(summary){
  const out=[];
  for(const team of summary.boxscore?.players||[]){
    for(const group of team.statistics||[]){
      const labels=group.labels||group.names||[];
      for(const row of group.athletes||[]){
        const vals={};
        labels.forEach((label,i)=>vals[label]=row.stats?.[i]);
        const athlete=row.athlete||{};
        out.push({id:String(athlete.id),name:athlete.displayName||athlete.fullName||"Jogador",team:team.team?.abbreviation||"",headshot:athlete.headshot||"",stats:{
          PTS:parseStat("PTS",vals.PTS),REB:parseStat("REB",vals.REB),AST:parseStat("AST",vals.AST),
          "3PT":parseStat("3PT",vals["3PT"]),STL:parseStat("STL",vals.STL),BLK:parseStat("BLK",vals.BLK),TO:parseStat("TO",vals.TO)
        }});
      }
    }
  }
  const seen=new Set();return out.filter(p=>p.id&&!seen.has(p.id)&&seen.add(p.id));
}
async function loadGames(){
  try{
    const data=await getJSON(`${API}/scoreboard`);
    games=data.events||[];$("gamesCount").textContent=games.length;
    setConnection("ok","Dados conectados");
    renderGames();populateGameSelect();
    if(!games.length)$("gamesList").innerHTML='<p class="empty">Nenhum jogo programado para hoje.</p>';
    return true;
  }catch(e){setConnection("err","Sem conexão");$("gamesList").innerHTML='<p class="empty">Não consegui carregar os jogos. Tente atualizar em instantes.</p>';showToast("Não foi possível conectar à fonte de dados.");return false}
}
function renderGames(){
  $("gamesList").innerHTML=games.map(g=>{
    const c=g.competitions?.[0]?.competitors||[],away=c.find(x=>x.homeAway==="away"),home=c.find(x=>x.homeAway==="home");
    const live=g.status?.type?.state==="in";
    return `<article class="game-card"><div class="game-status ${live?"live":""}">${live?"● AO VIVO · ":""}${escapeHTML(statusLabel(g))}</div><div class="game-teams"><span>${escapeHTML(away?.team?.abbreviation||"Visitante")}</span><span class="score">${away?.score??"—"}</span><span>${escapeHTML(home?.team?.abbreviation||"Mandante")}</span><span class="score">${home?.score??"—"}</span></div></article>`;
  }).join("");
}
function populateGameSelect(){
  const sel=$("gameSelect"),old=sel.value;
  const options=games.filter(g=>g.status?.type?.state!=="post" || goals.some(x=>x.gameId===g.id));
  sel.innerHTML='<option value="">Selecione o jogo</option>'+options.map(g=>`<option value="${g.id}">${escapeHTML(gameLabel(g))} · ${escapeHTML(statusLabel(g))}</option>`).join("");
  if(old&&options.some(g=>g.id===old))sel.value=old;
}
async function loadPlayers(gameId){
  const playerSel=$("playerSelect");playerSel.disabled=true;playerSel.innerHTML='<option value="">Carregando jogadores...</option>';$("addGoalBtn").disabled=true;
  if(!gameId){playerSel.innerHTML='<option value="">Escolha um jogo primeiro</option>';return}
  try{
    let players=gamePlayers.get(gameId);
    if(!players){const summary=await getJSON(`${API}/summary?event=${encodeURIComponent(gameId)}`);players=normalisePlayers(summary);gamePlayers.set(gameId,players)}
    if(!players.length)throw new Error("Não achei os jogadores no box score deste jogo.");
    playerSel.innerHTML='<option value="">Selecione o jogador</option>'+players.map(p=>`<option value="${p.id}">${escapeHTML(p.name)} (${p.team})</option>`).join("");
    playerSel.disabled=false;$("addGoalBtn").disabled=false;$("formHint").textContent="Escolha o jogador, a estatística e o número que deseja acompanhar.";
  }catch(e){playerSel.innerHTML='<option value="">Jogadores indisponíveis</option>';$("formHint").textContent="Esse jogo ainda pode não ter box score. Tente novamente quando começar."}
}
function renderGoals(){
  const active=goals.filter(g=>!g.hit).length,hit=goals.filter(g=>g.hit).length;
  $("activeCount").textContent=active;$("hitCount").textContent=hit;
  if(!goals.length){$("goalsList").innerHTML='<div class="empty">Você ainda não criou metas. Escolha um jogo acima e adicione sua primeira!</div>';return}
  $("goalsList").innerHTML=goals.map(g=>{
    const pct=Math.min(100,Math.round((g.current||0)/g.target*100));
    return `<article class="goal-card"><div><div class="goal-top"><span class="goal-player">${escapeHTML(g.player)}</span><span class="goal-game">${escapeHTML(g.gameLabel)}</span></div><div class="goal-value">${g.current||0}<span> / ${g.target} ${escapeHTML(METRICS[g.metric])}</span></div><div class="progress"><span style="width:${pct}%"></span></div></div><div class="goal-actions"><span class="status ${g.hit?"hit":""}">${g.hit?"META ATINGIDA": "ACOMPANHANDO"}</span><button class="remove-btn" data-remove="${g.id}" aria-label="Remover meta">✕</button></div></article>`;
  }).join("");
  document.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{goals=goals.filter(g=>g.id!==b.dataset.remove);saveGoals()}));
}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addGoal(){
  const gameId=$("gameSelect").value,playerId=$("playerSelect").value,target=Number($("targetInput").value),metric=$("metricSelect").value;
  const players=gamePlayers.get(gameId)||[],p=players.find(x=>x.id===playerId),game=games.find(x=>x.id===gameId);
  if(!gameId||!p||!Number.isInteger(target)||target<1){showToast("Escolha o jogo, jogador e uma meta válida.");return}
  if(goals.some(g=>g.gameId===gameId&&g.playerId===playerId&&g.metric===metric&&!g.hit)){showToast("Essa meta já está sendo acompanhada.");return}
  const current=p.stats[metric]||0;
  const g={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),gameId,gameLabel:gameLabel(game),playerId,player:p.name,team:p.team,metric,target,current,hit:current>=target,created:Date.now()};
  goals.unshift(g);saveGoals();$("targetInput").value="";
  if(g.hit)showToast(`${p.name} já atingiu essa meta!`);else showToast("Meta adicionada ao painel!");
  pollGoals();
}
async function pollGoals(){
  const ids=[...new Set(goals.filter(g=>!g.hit).map(g=>g.gameId))];
  for(const id of ids){
    try{
      const summary=await getJSON(`${API}/summary?event=${encodeURIComponent(id)}`);
      const players=normalisePlayers(summary);gamePlayers.set(id,players);
      for(const goal of goals.filter(g=>g.gameId===id&&!g.hit)){
        const p=players.find(x=>x.id===goal.playerId);if(!p)continue;
        const value=p.stats[goal.metric]||0,old=goal.current||0;goal.current=value;
        if(old<goal.target&&value>=goal.target){goal.hit=true;sendNotification(goal);showToast(`🎯 ${goal.player} atingiu ${goal.target} ${METRICS[goal.metric]}!`)}
      }
    }catch(e){console.warn("Falha ao atualizar jogo",id,e)}
    await new Promise(r=>setTimeout(r,1000));
  }
  saveGoals();
}
async function sendNotification(g){
  if("Notification"in window&&Notification.permission==="granted"){
    const options={body:`${g.player}: ${g.current} ${METRICS[g.metric]} (meta: ${g.target})`,icon:"icon-192.png",badge:"icon-192.png",tag:g.id};
    try{
      if("serviceWorker"in navigator){
        const registration=await navigator.serviceWorker.ready;
        await registration.showNotification("NBA ALERT · Meta atingida!",options);
      }else{
        new Notification("NBA ALERT · Meta atingida!",options);
      }
    }catch(e){console.warn("Não foi possível exibir a notificação",e)}
  }
}
async function enableNotifications(){
  if(!("Notification"in window)){showToast("Este navegador não oferece notificações.");return}
  const p=await Notification.requestPermission();
  showToast(p==="granted"?"Notificações ativadas!":"Permissão de notificação não concedida.");
}
$("gameSelect").addEventListener("change",e=>loadPlayers(e.target.value));
$("addGoalBtn").addEventListener("click",addGoal);
$("notifyBtn").addEventListener("click",enableNotifications);
$("refreshBtn").addEventListener("click",async()=>{await loadGames();await pollGoals();showToast("Dados atualizados.")});
renderGoals();
loadGames().then(()=>pollGoals());
pollTimer=setInterval(async()=>{await loadGames();await pollGoals()},30000);
if("serviceWorker"in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("./sw.js").catch(console.warn)}
