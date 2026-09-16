const $ = id => document.getElementById(id);
const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
const pct = (a,b) => num(a)!=null && num(b)!=null && num(b)!==0 ? ((num(a)-num(b))/num(b))*100 : null;
const fmt = (v,d=2) => num(v)==null ? '—' : num(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});

const BACKTEST = [
  {date:'2026-09-09', comex:-0.878576, mcx:-0.05, model:'DOWN', actual:'DOWN', result:'CORRECT'},
  {date:'2026-09-10', comex:-0.302643, mcx:-0.03, model:'WAIT', actual:'UP', result:'WAIT'},
  {date:'2026-09-11', comex:-1.107254, mcx:-0.76, model:'DOWN', actual:'DOWN', result:'CORRECT'},
  {date:'2026-09-15', comex:-0.273444, mcx:0.03, model:'WAIT', actual:'UP', result:'WAIT'}
];
const SEEDED_PREVIOUS = {
  date:'2026-09-15', comex:4340, comexPrev:4351.9, comexTime:'02:29 IST',
  mcx:151279, mcxPrev:null, mcxTime:'09:44 IST',
  tm:14040, tmPrev:null, tmTime:'15:07 IST', model:'WAIT', result:'No directional call'
};

let state = {comex:{c:null,p:null,t:''}, mcx:{c:null,p:null,t:''}, tm:{c:null,p:null,t:''}};

function getIST(){
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(now);
  const o={}; parts.forEach(p=>o[p.type]=p.value); return {year:+o.year,month:+o.month,day:+o.day,hour:+o.hour,minute:+o.minute,second:+o.second,date:`${o.year}-${o.month}-${o.day}`,time:`${o.hour}:${o.minute}:${o.second}`};
}
function minutesIST(){ const x=getIST(); return x.hour*60+x.minute; }
function modelScore(){
  const cp=pct(state.comex.c,state.comex.p); const mp=pct(state.mcx.c,state.mcx.p);
  let score=0; const reasons=[];
  if(cp==null) return {score:null,cp,mp,reasons:['COMEX input needed']};
  if(cp>2){score+=2;reasons.push('COMEX > +2%');}
  else if(cp>=.5){score+=1;reasons.push('COMEX up');}
  else if(cp<=-2){score-=2;reasons.push('COMEX < -2%');}
  else if(cp<-.5){score-=1;reasons.push('COMEX down');}
  else reasons.push('COMEX near flat');
  if(mp==null){reasons.push('MCX input needed');}
  else if(mp>.15){score+=1;reasons.push('MCX up');}
  else if(mp<-.15){score-=1;reasons.push('MCX down');}
  else reasons.push('MCX roughly flat');
  let direction='WAIT'; if(score>0) direction='UP'; if(score<0) direction='DOWN';
  return {score,cp,mp,direction,reasons};
}
function renderClock(){
  const x=getIST(); $('istDate').textContent=x.date; $('istTime').textContent=x.time; setTimeout(renderClock,1000);
}
function renderMode(){
  const m=minutesIST();
  const before9=m<540, after10=m>=600;
  document.querySelectorAll('.step').forEach(e=>e.classList.remove('active'));
  if(before9){
    $('modeTitle').textContent='Previous-session mode'; $('modeText').textContent='Before 9:00 AM IST, this page shows the last completed session so you can see what happened overnight and the latest Thangamayil rate we already know.'; $('stepNight').classList.add('active');
  } else if(!after10){
    $('modeTitle').textContent='Morning prediction mode'; $('modeText').textContent='Today is active. Enter COMEX overnight + MCX morning data. The full COMEX + MCX prediction is the primary signal from 9:00 AM onward.'; $('stepMorning').classList.add('active');
  } else {
    $('modeTitle').textContent='Morning + retail validation mode'; $('modeText').textContent='Today’s prediction remains visible. Enter the latest Thangamayil 22K916 rate to compare the model with the actual retail movement.'; $('stepRetail').classList.add('active');
  }
}
function renderPrediction(){
  const r=modelScore();
  $('comexMove').textContent=r.cp==null?'—':`${r.cp>=0?'+':''}${fmt(r.cp)}%`;
  $('mcxMove').textContent=r.mp==null?'—':`${r.mp>=0?'+':''}${fmt(r.mp)}%`;
  $('comexStatus').textContent=state.comex.t?`Snapshot: ${state.comex.t}`:'Enter current + previous';
  $('mcxStatus').textContent=state.mcx.t?`Snapshot: ${state.mcx.t}`:'Enter current + previous';
  if(r.score==null){$('prediction').textContent='WAIT';$('predictionSub').textContent='Waiting for COMEX';$('score').textContent='0';$('predictionReason').textContent=r.reasons.join(' • ');$('predictionBadge').className='badge neutral';$('predictionBadge').textContent='Not ready';return;}
  $('prediction').textContent=r.direction; $('score').textContent=r.score>0?`+${r.score}`:r.score; $('predictionReason').textContent=r.reasons.join(' • ');
  const ready=r.mp!=null;
  $('predictionSub').textContent=ready?(r.direction==='UP'?'Mild/strong bullish depending on score':r.direction==='DOWN'?'Mild/strong bearish depending on score':'Mixed / neutral'):'COMEX only — add MCX to activate full model';
  if(!ready){$('predictionBadge').className='badge neutral';$('predictionBadge').textContent='Partial input';}
  else if(r.direction==='UP'){$('predictionBadge').className='badge up';$('predictionBadge').textContent='Full Model B: UP';}
  else if(r.direction==='DOWN'){$('predictionBadge').className='badge down';$('predictionBadge').textContent='Full Model B: DOWN';}
  else{$('predictionBadge').className='badge neutral';$('predictionBadge').textContent='Full Model B: WAIT';}
}
function renderTM(){
  const c=num(state.tm.c), p=num(state.tm.p);
  $('tmRate').textContent=c==null?'—':`₹${fmt(c,0)}/g`; $('grams10k').textContent=c==null?'—':`${(10000/c).toFixed(5)} g`;
  $('tmMove').textContent=(c!=null&&p!=null)?`${c>=p?'+':''}₹${fmt(c-p,0)}/g`:'—'; $('tmUpdated').textContent=state.tm.t||'—';
}
function renderPrevious(){
  const x=SEEDED_PREVIOUS;
  $('sessionDateBadge').textContent=x.date; $('prevComex').textContent=`$${fmt(x.comex,1)} (${pct(x.comex,x.comexPrev).toFixed(3)}%)`; $('prevComexTime').textContent=x.comexTime;
  $('prevMcx').textContent=`₹${fmt(x.mcx,0)}/10g`; $('prevMcxTime').textContent=x.mcxTime; $('prevTm').textContent=`₹${fmt(x.tm,0)}/g`; $('prevTmTime').textContent=x.tmTime; $('prevModel').textContent=x.model; $('prevResult').textContent=x.result;
}
function renderBacktest(){
  $('backtestBody').innerHTML=BACKTEST.map(r=>`<tr><td>${r.date}</td><td>${r.comex>=0?'+':''}${r.comex.toFixed(3)}%</td><td>${r.mcx>=0?'+':''}${r.mcx.toFixed(2)}%</td><td><strong>${r.model}</strong></td><td>${r.actual}</td><td>${r.result}</td></tr>`).join('');
}
function loadSaved(){
  try{const x=JSON.parse(localStorage.getItem('gold_predictor_modelB_today')||'{}'); state={comex:{c:num(x.comexC),p:num(x.comexP),t:x.comexT||''},mcx:{c:num(x.mcxC),p:num(x.mcxP),t:x.mcxT||''},tm:{c:num(x.tmC),p:num(x.tmP),t:x.tmT||''}};
    ['comexC','comexP','comexT','mcxC','mcxP','mcxT','tmC','tmP','tmT'].forEach(id=>{if(x[id]!=null) $(id).value=x[id]});
  }catch(e){}
}
function save(){
  const x={comexC:$('comexC').value,comexP:$('comexP').value,comexT:$('comexT').value,mcxC:$('mcxC').value,mcxP:$('mcxP').value,mcxT:$('mcxT').value,tmC:$('tmC').value,tmP:$('tmP').value,tmT:$('tmT').value};
  localStorage.setItem('gold_predictor_modelB_today',JSON.stringify(x)); state={comex:{c:num(x.comexC),p:num(x.comexP),t:x.comexT},mcx:{c:num(x.mcxC),p:num(x.mcxP),t:x.mcxT},tm:{c:num(x.tmC),p:num(x.tmP),t:x.tmT}}; renderPrediction(); renderTM();
}
function clearToday(){ localStorage.removeItem('gold_predictor_modelB_today'); ['comexC','comexP','comexT','mcxC','mcxP','mcxT','tmC','tmP','tmT'].forEach(id=>$(id).value=''); state={comex:{c:null,p:null,t:''},mcx:{c:null,p:null,t:''},tm:{c:null,p:null,t:''}};renderPrediction();renderTM(); }
function loadLast(){ $('comexC').value=SEEDED_PREVIOUS.comex; $('comexP').value=SEEDED_PREVIOUS.comexPrev; $('comexT').value=SEEDED_PREVIOUS.comexTime; $('mcxC').value=SEEDED_PREVIOUS.mcx; $('mcxP').value=''; $('mcxT').value=SEEDED_PREVIOUS.mcxTime; $('tmC').value=SEEDED_PREVIOUS.tm; $('tmP').value=''; $('tmT').value=SEEDED_PREVIOUS.tmTime; save(); }

document.addEventListener('DOMContentLoaded',()=>{loadSaved();renderClock();renderMode();renderPrediction();renderTM();renderPrevious();renderBacktest();$('saveBtn').onclick=save;$('clearBtn').onclick=clearToday;$('loadLastBtn').onclick=loadLast;setInterval(renderMode,15000);});
