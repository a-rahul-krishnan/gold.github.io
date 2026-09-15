
const $ = id => document.getElementById(id);
const n = v => Number.isFinite(Number(v)) ? Number(v) : null;
const money = (v, d=2) => n(v) == null ? "—" : Number(v).toLocaleString("en-IN",{minimumFractionDigits:d,maximumFractionDigits:d});
const movePct = (a,b) => n(a)!=null && n(b)!=null && n(b)!==0 ? (n(a)-n(b))/n(b)*100 : null;

const state = { xau:null, fx:null, comex:{c:null,p:null}, mcx:{c:null,p:null}, tm:{c:null,p:null,updated:""} };

function status(id,text,kind="muted"){ const e=$(id); if(e){e.textContent=text;e.className=`status ${kind}`;} }
function render(){
  const cp=movePct(state.comex.c,state.comex.p), mp=movePct(state.mcx.c,state.mcx.p);
  let score=0, why=[];
  if(cp!=null){
    if(cp>2){score+=2;why.push("COMEX > +2%");}
    else if(cp>=.5){score+=1;why.push("COMEX mildly up");}
    else if(cp<=-2){score-=2;why.push("COMEX < -2%");}
    else if(cp<-.5){score-=1;why.push("COMEX mildly down");}
    else why.push("COMEX near flat");
  } else why.push("COMEX input needed");
  if(mp!=null){ if(mp>.15){score++;why.push("MCX up")} else if(mp<-.15){score--;why.push("MCX down")} }
  const dir=score>=3?"UP":score>=1?"UP":score<=-3?"DOWN":score<=-1?"DOWN":"WAIT";
  const sub=score>=3?"Strong bullish":score>=1?"Mild bullish":score<=-3?"Strong bearish":score<=-1?"Mild bearish":"Mixed / neutral";
  $("prediction").textContent=dir; $("predictionSub").textContent=sub;
  $("score").textContent=score>0?`+${score}`:score;
  $("reasons").textContent=why.join(" • ");
  $("comexMove").textContent=cp==null?"—":`${cp>=0?"+":""}${money(cp)}%`;
  $("mcxMove").textContent=mp==null?"—":`${mp>=0?"+":""}${money(mp)}%`;

  if(state.xau!=null){$("xau").textContent=`$${money(state.xau)}`;status("xauStatus","Live reference","live")}
  else { $("xau").textContent="Unavailable"; status("xauStatus","Feed unavailable","warn"); }
  if(state.fx!=null){$("usdInr").textContent=`₹${money(state.fx)}`;status("fxStatus","Daily reference","daily")}
  else { $("usdInr").textContent="Unavailable"; status("fxStatus","Feed unavailable","warn"); }

  if(state.tm.c!=null){
    $("tmRate").textContent=`₹${money(state.tm.c,0)}/g`;
    $("grams10k").textContent=`${(10000/state.tm.c).toFixed(5)} g`;
    $("tmMove").textContent=state.tm.p!=null?`${state.tm.c-state.tm.p>=0?"+":""}₹${money(state.tm.c-state.tm.p,0)}/g`:"—";
    $("tmUpdated").textContent=state.tm.updated||"Entered manually";
  } else {$("tmRate").textContent="—";$("grams10k").textContent="—";$("tmMove").textContent="—";$("tmUpdated").textContent="Not entered";}
}

async function fetchXau(){
  const urls=[
    "https://xaus.com/api/v1/spot?compact=1",
    "https://xaus.com/api/v1/spot"
  ];
  for(const u of urls){
    try{
      const r=await fetch(u,{cache:"no-store"});
      if(!r.ok) continue;
      const j=await r.json();
      const p=n(j?.price ?? j?.data?.price);
      if(p!=null){state.xau=p;render();return;}
    }catch(e){}
  }
  render();
}

async function fetchFx(){
  // Frankfurter is intentionally a daily reference, not an intraday trading feed.
  try{
    const r=await fetch("https://api.frankfurter.dev/v2/rate/usd/inr",{cache:"no-store"});
    if(!r.ok) throw new Error();
    const j=await r.json();
    const v=n(j?.rate);
    if(v!=null){state.fx=v;localStorage.setItem("gold_fx_latest",String(v));render();return;}
  }catch(e){}
  const cached=n(localStorage.getItem("gold_fx_latest"));
  if(cached!=null) state.fx=cached;
  render();
}

function load(){
  try{
    const x=JSON.parse(localStorage.getItem("gold_predictor_v3")||"{}");
    for(const k of ["comexC","comexP","mcxC","mcxP","tmC","tmP","tmU"]) if(x[k]!=null && $(k)) $(k).value=x[k];
    state.comex.c=n(x.comexC); state.comex.p=n(x.comexP);
    state.mcx.c=n(x.mcxC); state.mcx.p=n(x.mcxP);
    state.tm.c=n(x.tmC); state.tm.p=n(x.tmP); state.tm.updated=x.tmU||"";
  }catch(e){}
  render();
}
function save(){
  const x={comexC:$("comexC").value,comexP:$("comexP").value,mcxC:$("mcxC").value,mcxP:$("mcxP").value,tmC:$("tmC").value,tmP:$("tmP").value,tmU:$("tmU").value};
  localStorage.setItem("gold_predictor_v3",JSON.stringify(x));
  state.comex.c=n(x.comexC);state.comex.p=n(x.comexP);state.mcx.c=n(x.mcxC);state.mcx.p=n(x.mcxP);state.tm.c=n(x.tmC);state.tm.p=n(x.tmP);state.tm.updated=x.tmU;
  render();
}
function clearAll(){localStorage.removeItem("gold_predictor_v3");["comexC","comexP","mcxC","mcxP","tmC","tmP","tmU"].forEach(id=>$(id).value="");load();}
document.addEventListener("DOMContentLoaded",()=>{
  load();
  $("saveBtn").onclick=save; $("clearBtn").onclick=clearAll;
  $("refreshBtn").onclick=()=>Promise.all([fetchXau(),fetchFx()]);
  Promise.all([fetchXau(),fetchFx()]);
});
