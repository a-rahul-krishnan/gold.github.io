
const $ = (id) => document.getElementById(id);
const num = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const state = {
  gold: null,
  goldPrev: null,
  fx: null,
  fxPrevCheck: null,
  lastFxFetch: null
};

function pct(now, prev) {
  if (now == null || prev == null || prev === 0) return null;
  return ((now - prev) / prev) * 100;
}
function fmt(n, digits=2) {
  return n == null ? "—" : n.toLocaleString("en-IN", {maximumFractionDigits: digits, minimumFractionDigits: digits});
}
function pctText(v) {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function setLive(ok, text) {
  $("liveDot").classList.toggle("live", ok);
  $("liveStatus").textContent = text;
}

async function fetchGold() {
  // XAUS is browser-friendly and provides live XAU/USD spot data.
  const url = "https://xaus.com/api/v1/spot?compact=1";
  const res = await fetch(url, {cache:"no-store"});
  if (!res.ok) throw new Error(`Gold API ${res.status}`);
  const data = await res.json();
  const price = Number(data.spot_usd_oz ?? data.xau?.price);
  if (!Number.isFinite(price)) throw new Error("Gold price missing");
  state.gold = price;

  // Some feeds expose previous close; keep optional.
  const prev = Number(data.previous_close_usd_oz ?? data.previous_close ?? NaN);
  state.goldPrev = Number.isFinite(prev) ? prev : null;

  $("goldPrice").textContent = `$${fmt(price)}`;
  $("goldPrev").textContent = state.goldPrev == null ? "Not supplied" : `$${fmt(state.goldPrev)}`;
  $("goldChange").textContent = pctText(pct(state.gold, state.goldPrev));
  const ts = data.updated_at || data.data_state?.as_of || data.as_of;
  $("goldUpdated").textContent = ts ? `Updated ${new Date(ts).toLocaleString("en-IN")}` : "Live feed received";
}

async function fetchFx() {
  // Frankfurter is free and keyless. It is a daily reference rate, not tick-by-tick FX.
  const url = "https://api.frankfurter.dev/v2/rate/usd/inr";
  const res = await fetch(url, {cache:"no-store"});
  if (!res.ok) throw new Error(`FX API ${res.status}`);
  const data = await res.json();
  const rate = Number(data.rate);
  if (!Number.isFinite(rate)) throw new Error("USD/INR missing");
  state.fx = rate;
  $("fxPrice").textContent = `₹${fmt(rate, 4)}`;
  $("fxUpdated").textContent = data.date ? `Reference date ${data.date}` : "Reference rate received";

  if (state.fxPrevCheck != null) {
    const d = state.fx - state.fxPrevCheck;
    $("fxDirection").textContent = d > 0 ? "Rupee weaker vs prior check" : d < 0 ? "Rupee stronger vs prior check" : "Flat";
  } else {
    $("fxDirection").textContent = "First live check";
  }
  state.fxPrevCheck = state.fx;
  localStorage.setItem("tnGoldFx", String(state.fx));
}

function calculate() {
  const comexNow = num($("comexNow").value);
  const comexPrev = num($("comexPrev").value);
  const comexPct = pct(comexNow, comexPrev);
  $("comexChange").textContent = pctText(comexPct);

  let comexScore = 0;
  if (comexPct != null) {
    if (comexPct > 2) comexScore = 2;
    else if (comexPct > 0.5) comexScore = 1;
    else if (comexPct >= -0.5) comexScore = 0;
    else if (comexPct >= -2) comexScore = -1;
    else comexScore = -2;
  }
  $("comexScore").textContent = comexScore > 0 ? `+${comexScore}` : String(comexScore);
  $("scoreGold").textContent = comexScore > 0 ? `+${comexScore}` : String(comexScore);

  // FX heuristic: if USD/INR rises, the rupee weakened, which can add upward pressure to Indian gold.
  const fxSaved = num(localStorage.getItem("tnGoldFx"));
  let fxScore = 0;
  // Only use manual directional override when the user checks the FX hint.
  const fxBias = $("fxBias")?.value;
  if (fxBias === "up") fxScore = 1;
  if (fxBias === "down") fxScore = -1;
  $("scoreFx").textContent = fxScore > 0 ? `+${fxScore}` : String(fxScore);

  const mcxNow = num($("mcxPrice").value);
  const mcxPrev = num($("mcxPrev").value);
  const mcxPct = pct(mcxNow, mcxPrev);
  $("mcxChange").textContent = pctText(mcxPct);
  let mcxScore = 0;
  if (mcxPct != null) mcxScore = mcxPct > 0 ? 1 : mcxPct < 0 ? -1 : 0;
  $("scoreMcx").textContent = mcxScore > 0 ? `+${mcxScore}` : String(mcxScore);

  const total = comexScore + fxScore + mcxScore;
  $("totalScore").textContent = total > 0 ? `+${total}` : String(total);

  let signal = "WAIT", cls = "neutral", confidence = 0, summary = "Not enough aligned inputs yet.";
  if (total >= 3) {signal="UP"; cls="up"; confidence=80; summary="Strong upward bias: multiple inputs agree."; }
  else if (total >= 1) {signal="UP"; cls="up"; confidence=60; summary="Mild upward bias. Wait for MCX/FX confirmation if possible."; }
  else if (total <= -3) {signal="DOWN"; cls="down"; confidence=80; summary="Strong downward bias: multiple inputs agree."; }
  else if (total <= -1) {signal="DOWN"; cls="down"; confidence=60; summary="Mild downward bias. Confirmation is recommended."; }
  $("signal").textContent = signal;
  $("signal").className = `signal ${cls}`;
  $("confidence").textContent = `Heuristic confidence ${confidence}%`;
  $("summary").textContent = summary;

  const base = num($("tnBase").value);
  let low=null, high=null;
  if (base != null && total !== 0) {
    // Conservative range around the directional score; intentionally not a price-forecasting model.
    const centerPct = total >= 3 ? 1.0 : total >= 1 ? 0.45 : total <= -3 ? -1.0 : -0.45;
    const band = total >= 3 || total <= -3 ? 0.55 : 0.35;
    low = base * (1 + (centerPct-band)/100);
    high = base * (1 + (centerPct+band)/100);
  }
  $("tnRange").textContent = low != null ? `₹${fmt(low)} – ₹${fmt(high)} / gram` : "Enter current 22K ₹/g";
}

function addFxBiasControl() {
  const card = $("scoreFx").closest(".card");
  // Insert a small hidden-ish control after the explanation section if missing.
  const wrap = document.createElement("div");
  wrap.className = "mini-fx";
  wrap.innerHTML = `
    <label for="fxBias">FX bias for prediction</label>
    <select id="fxBias" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--text)">
      <option value="">Neutral / not confirmed</option>
      <option value="up">USD/INR up (₹ weaker) → gold supportive</option>
      <option value="down">USD/INR down (₹ stronger) → gold less supportive</option>
    </select>`;
  card.appendChild(wrap);
  $("fxBias").addEventListener("change", calculate);
}

async function refresh() {
  setLive(false, "Refreshing…");
  const results = await Promise.allSettled([fetchGold(), fetchFx()]);
  const ok = results.some(r => r.status === "fulfilled");
  if (results.every(r => r.status === "fulfilled")) setLive(true, "Live feeds connected");
  else if (ok) setLive(true, "Partial live data");
  else setLive(false, "Live feeds unavailable");
  calculate();
}

["comexNow","comexPrev","mcxPrice","mcxPrev","tnBase"].forEach(id => {
  $(id).addEventListener("input", calculate);
});
$("refreshBtn").addEventListener("click", refresh);

addFxBiasControl();
refresh();

// Keep live gold fresh every 60 seconds. XAUS asks clients to cache at least 30 seconds.
setInterval(refresh, 60000);


// v2: Thangamayil 22K 916 tracking for the user's ₹10,000 plan.
const tmCurrent = document.getElementById("thangamayilCurrent");
const tmPrevious = document.getElementById("thangamayilPrevious");
const tmUpdated = document.getElementById("thangamayilUpdated");
const tmRateOut = document.getElementById("tmRate");
const tmMoveOut = document.getElementById("tmMove");
const tmGramsOut = document.getElementById("grams10k");

function updateThangamayil() {
  const cur = Number(tmCurrent?.value);
  const prev = Number(tmPrevious?.value);
  if (!Number.isFinite(cur) || cur <= 0) return;
  if (tmRateOut) tmRateOut.textContent = `₹${cur.toLocaleString("en-IN")}/g`;
  if (tmGramsOut) tmGramsOut.textContent = `${(10000/cur).toFixed(5)} g`;
  if (tmMoveOut && Number.isFinite(prev) && prev > 0) {
    const d = cur - prev;
    tmMoveOut.textContent = `${d >= 0 ? "+" : ""}₹${d.toLocaleString("en-IN")}/g`;
  }
}
document.getElementById("saveBtn")?.addEventListener("click", updateThangamayil);
