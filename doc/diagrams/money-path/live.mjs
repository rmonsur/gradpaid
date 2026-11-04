// Live behaviour of the money-path figure. This file is inlined into the page
// after the kit (iso, cylinder, solidSvg, lineOnTop, translateAlong, ...), the
// money model (capture, allocateTo, payout, allocate, readoutOf, ...) and a
// DATA object with the projection and the world layout. It has no imports.
/* global DATA, iso, cylinder, solidSvg, lineOnTop, ring, lineSvg, translateAlong, capture, allocateTo, payout, allocate, readoutOf, emptyLedger, clampSplit, GIFT_CENTS, MATCH_CAP_CENTS, coinMaker */

const P = DATA.P;
const Y = DATA.layout;
const TAU = Math.PI * 2;
const FOLLOW_TAU = 0.22;
const SHUTTER_TAU = 0.16;
const BELT_TAU = 0.35;
const NEEDLE_TAU = 0.45;
const HEAD_TAU = 0.07;
const TAPE_TAU = 0.18;
const TOKEN_DELAY = 0.45;
const TOKEN_GAP = 0.32;
const SPOUT_SLIDE_SECONDS = 0.42;
const AGENT_PAUSE = 0.7;
const AGENT_HEADWAY = 48;
const STAMP_REST = 0.14;
const TOUR_RESUME_MS = 3600;
const TOUR_PERIOD = 22;
// The idle tour: set the dial, then give, three times round the dial.
const TOUR_EVENTS = [
  { at: 0.4, split: 2 },
  { at: 1.5, give: true },
  { at: 7.6, split: 3 },
  { at: 8.8, give: true },
  { at: 15.2, split: 1 },
  { at: 16.4, give: true },
];
const MAX_DT = 1 / 30;
const SETTLE_EPS = 1e-4;
const MAX_TAPE_LINES = 26;

const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const q = (selector) => svg.querySelector(selector);
const readout = document.querySelector("[data-readout]");
const status = stage.querySelector("[data-status]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const coinSvg = coinMaker({ cylinder, solidSvg, ring, lineSvg });

const refs = {
  coinFall: q('[data-part="coin-fall"]'),
  beltTokens: q('[data-part="belt-tokens"]'),
  fly: q('[data-part="fly"]'),
  cleats: q('[data-part="cleats"]'),
  dial: q('[data-part="dial-pointer"]'),
  needle: q('[data-part="needle"]'),
  head: q('[data-part="stamp-head"]'),
  plunger: q('[data-part="plunger"]'),
  tape: q('[data-part="tape-lines"]'),
  bins: Y.binCentresX.map((_, index) => ({
    spout: q(`[data-spout="${index}"]`),
    stack: q(`[data-stack="${index}"]`),
    drop: q(`[data-drop="${index}"]`),
    shutter: q(`[data-shutter="${index}"]`),
  })),
};

// Rebuilt per frame from the same formulas the build used.
const dialPointerAt = (ways) => {
  const [x, y] = Y.dial;
  const angle = Math.PI + (ways - 2) * Y.dialSpread;
  return lineOnTop([x - Math.sin(angle) * 1.6, y + Math.cos(angle) * 1.6], [x + Math.sin(angle) * (Y.dialKnobR - 0.6), y - Math.cos(angle) * (Y.dialKnobR - 0.6)], Y.dialTop, P);
};
const needleAt = (share) => {
  const [x, y] = Y.gauge;
  const angle = Y.gaugeFrom + Math.min(1, Math.max(0, share)) * Y.gaugeSpan;
  return lineOnTop([x - Math.sin(angle) * 2.6, y + Math.cos(angle) * 2.6], [x + Math.sin(angle) * Y.needleLen, y - Math.cos(angle) * Y.needleLen], Y.gaugeTop + 0.2, P);
};
const cleatAt = (x) => lineOnTop([x, Y.belt.y], [x, Y.belt.y + Y.belt.d], Y.beltTop, P);
const smooth = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Critically damped settle on { x, v } toward a target.
function settle(state, target, dt, seconds, calm) {
  if (calm) {
    state.x = target;
    state.v = 0;
    return false;
  }
  const w = 1 / seconds;
  for (let i = 0; i < 4; i++) {
    const step = dt / 4;
    state.v += (w * w * (target - state.x) - 2 * w * state.v) * step;
    state.x += state.v * step;
  }
  if (Math.abs(target - state.x) < SETTLE_EPS && Math.abs(state.v) < SETTLE_EPS) {
    state.x = target;
    state.v = 0;
    return false;
  }
  return true;
}

const sim = {
  clock: 0,
  ledger: emptyLedger(),
  split: 2,
  dialShown: 2,
  coins: [],
  tokens: [],
  stackCounts: Y.binCentresX.map(() => 0),
  held: Y.binCentresX.map(() => []),
  shutters: Y.binCentresX.map(() => ({ x: 0, v: 0 })),
  belt: { offset: 0, speed: { x: 0, v: 0 }, idleUntil: 0 },
  needle: { x: 0, v: 0 },
  head: { x: 0, v: 0, target: 0, busy: false, readyAt: 0 },
  stampQueue: [],
  tape: { x: 0, v: 0, target: 0 },
  printed: [],
  agentNextAt: 0,
  agentCursor: 0,
};

const makeElement = (markup) => {
  const template = document.createElementNS("http://www.w3.org/2000/svg", "g");
  template.innerHTML = markup;
  return template;
};

function say(text) {
  if (status.textContent !== text) status.textContent = text;
}

// Events on the money model: each one is a ledger movement and a stamp.
function onCaptured(coin) {
  sim.ledger = capture(sim.ledger, coin.cents);
  sim.stampQueue.push("ORDER");
  allocate(coin.cents, coin.ways).forEach((cents, index) => {
    sim.tokens.push({ bin: index, cents, phase: "wait", at: sim.clock + TOKEN_DELAY + index * TOKEN_GAP, s: 0, x: Y.binCentresX[index], y: Y.tokenSpoutStartY, z: Y.outletZ0, vz: 0, el: null });
  });
  say("gift captured by PayPal Orders");
}

function onAllocated(token) {
  sim.ledger = allocateTo(sim.ledger, token.bin, token.cents);
  sim.held[token.bin].push(token.cents);
  sim.stackCounts[token.bin] += 1;
  drawStack(token.bin);
  sim.stampQueue.push("SPLIT");
}

function onPaid(token) {
  const before = sim.ledger.match;
  sim.ledger = payout(sim.ledger, token.bin, token.cents);
  sim.stampQueue.push("PAYOUT");
  if (sim.ledger.match !== before) sim.stampQueue.push("INVOICE");
  say(sim.ledger.match >= MATCH_CAP_CENTS ? "paid to servicer; sponsor match at cap" : "paid to servicer; sponsor invoiced");
}

function drawStack(bin) {
  const cx = Y.binCentresX[bin];
  const count = sim.stackCounts[bin];
  const parts = [];
  for (let index = 0; index < count; index++) parts.push(coinSvg(cx, Y.dropY, Y.rackTop + index * Y.tokenH, Y.tokenR, Y.tokenH, P));
  refs.bins[bin].stack.innerHTML = parts.join("");
}

function give() {
  if (sim.coins.length) return;
  const el = makeElement(coinSvg(Y.hopperSlotCentre[0], Y.hopperSlotCentre[1], 0, Y.coinR, Y.coinH, P));
  refs.coinFall.appendChild(el);
  sim.coins.push({ cents: GIFT_CENTS, ways: sim.split, z: Y.coinDropFrom, vz: 0, el });
}

function stepCoins(dt, calm) {
  for (const coin of [...sim.coins]) {
    coin.vz += Y.gravity * dt;
    coin.z -= coin.vz * dt;
    if (calm) coin.z = Y.hopperTop - Y.coinSink;
    coin.el.setAttribute("transform", translateAlong(P, [0, 0, coin.z]));
    if (coin.z <= Y.hopperTop - Y.coinSink) {
      coin.el.remove();
      sim.coins.splice(sim.coins.indexOf(coin), 1);
      onCaptured(coin);
    }
  }
}

function placeToken(token) {
  token.el.setAttribute("transform", translateAlong(P, [token.x - token.ox, token.y - token.oy, token.z - token.oz]));
}

function spawnToken(token, parent, x, y, z) {
  token.ox = x;
  token.oy = y;
  token.oz = z;
  token.x = x;
  token.y = y;
  token.z = z;
  token.el = makeElement(coinSvg(x, y, z, Y.tokenR, Y.tokenH, P));
  parent.appendChild(token.el);
}

function stepTokens(dt, calm) {
  for (const token of [...sim.tokens]) {
    const bin = refs.bins[token.bin];
    if (token.phase === "wait") {
      if (sim.clock < token.at) continue;
      token.phase = "spout";
      token.s = 0;
      spawnToken(token, bin.spout, Y.binCentresX[token.bin], Y.tokenSpoutStartY, Y.outletZ0);
    }
    if (token.phase === "spout") {
      token.s = calm ? 1 : Math.min(1, token.s + dt / SPOUT_SLIDE_SECONDS);
      token.y = Y.tokenSpoutStartY + (Y.dropY - Y.tokenSpoutStartY) * easeInOut(token.s);
      placeToken(token);
      if (token.s >= 1) {
        token.phase = "drop";
        token.vz = 0;
        bin.drop.appendChild(token.el);
      }
    }
    if (token.phase === "drop") {
      const landing = Y.rackTop + sim.stackCounts[token.bin] * Y.tokenH;
      token.vz += Y.gravity * dt;
      token.z = calm ? landing : Math.max(landing, token.z - token.vz * dt);
      placeToken(token);
      if (token.z <= landing) {
        token.el.remove();
        sim.tokens.splice(sim.tokens.indexOf(token), 1);
        onAllocated(token);
      }
    }
  }
}

function heldTokens() {
  return sim.stackCounts.reduce((sum, count) => sum + count, 0);
}

function beltBusyNear(bin) {
  const origin = Y.binCentresX[bin];
  return sim.tokens.some((token) => token.phase === "trap" || (token.phase === "belt" && token.x < origin + AGENT_HEADWAY));
}

// The disbursement agent: take the next held allocation, round robin over the bins.
function stepAgent() {
  if (sim.clock < sim.agentNextAt || !heldTokens()) return;
  for (let tries = 0; tries < sim.stackCounts.length; tries++) {
    const bin = (sim.agentCursor + tries) % sim.stackCounts.length;
    if (!sim.stackCounts[bin] || beltBusyNear(bin)) continue;
    sim.agentCursor = bin + 1;
    sim.stackCounts[bin] -= 1;
    drawStack(bin);
    const cents = sim.held[bin].shift();
    const token = { bin, cents, phase: "trap", vz: 0, s: 0 };
    spawnToken(token, refs.beltTokens, Y.binCentresX[bin], Y.dropY, Y.rackFloorZ - Y.tokenH);
    sim.tokens.push(token);
    sim.agentNextAt = sim.clock + AGENT_PAUSE;
    return;
  }
}

function stepBeltTokens(dt, calm) {
  const beltRate = sim.belt.speed.x * Y.beltSpeed;
  for (const token of [...sim.tokens]) {
    if (token.phase === "trap") {
      token.vz += Y.gravity * dt;
      token.z = calm ? Y.beltTop : Math.max(Y.beltTop, token.z - token.vz * dt);
      placeToken(token);
      if (token.z <= Y.beltTop) {
        token.phase = "belt";
        sim.belt.idleUntil = Infinity;
      }
    } else if (token.phase === "belt") {
      token.x = calm ? Y.beltEnd : token.x + beltRate * dt;
      placeToken(token);
      if (token.x >= Y.beltEnd) {
        token.phase = "fly";
        token.vz = 0;
        refs.fly.appendChild(token.el);
      }
    } else if (token.phase === "fly") {
      token.vz += Y.gravity * dt;
      token.x += Y.beltSpeed * dt;
      token.z -= token.vz * dt;
      if (calm) token.z = Y.servicerH - Y.slotSink;
      placeToken(token);
      if (token.z <= Y.servicerH - Y.slotSink) {
        token.el.remove();
        sim.tokens.splice(sim.tokens.indexOf(token), 1);
        onPaid(token);
      }
    }
  }
  const riding = sim.tokens.some((token) => token.phase === "belt" || token.phase === "fly");
  if (riding) sim.belt.idleUntil = sim.clock + 0.8;
  const want = sim.clock < sim.belt.idleUntil ? 1 : 0;
  const moving = settle(sim.belt.speed, want, dt, BELT_TAU, calm);
  sim.belt.offset = (sim.belt.offset + sim.belt.speed.x * Y.beltSpeed * dt) % Y.cleatPitch;
  return moving || want === 1;
}

function drawCleats() {
  const parts = [];
  const length = Y.belt.w;
  for (let x = sim.belt.offset; x < length; x += Y.cleatPitch) {
    const alpha = smooth(0, Y.cleatFade, x) * smooth(0, Y.cleatFade, length - x);
    if (alpha < 0.03) continue;
    parts.push(`<path class="iso-line" data-tone="lo" d="${cleatAt(Y.belt.x + x)}" opacity="${alpha.toFixed(2)}"/>`);
  }
  refs.cleats.innerHTML = parts.join("");
}

// The ledger stamp: one drop of the head per queued movement, then the tape advances.
function stepStamp(dt, calm) {
  const head = sim.head;
  if (!head.busy && sim.stampQueue.length && sim.clock >= head.readyAt) {
    head.busy = true;
    head.target = 1;
  }
  const moving = settle(head, head.target, dt, HEAD_TAU, calm);
  if (head.busy && head.target === 1 && head.x > 0.97) {
    print(sim.stampQueue.shift());
    head.target = 0;
  }
  if (head.busy && head.target === 0 && head.x < 0.02) {
    head.busy = false;
    head.readyAt = sim.clock + STAMP_REST;
  }
  const tapeMoving = settle(sim.tape, sim.tape.target, dt, TAPE_TAU, calm);
  return moving || tapeMoving || head.busy || sim.stampQueue.length > 0;
}

function print(kind) {
  sim.printed.push({ kind, slot: sim.printed.length });
  sim.tape.target = sim.printed.length * Y.tapePitch;
  if (sim.printed.length > MAX_TAPE_LINES) sim.printed.shift();
  const parts = sim.printed.map((line, index) => {
    const x = Y.stampX + (line.slot + 1) * Y.tapePitch;
    const y0 = Y.tape.y + 1.2 + Y.tapeLineIndent[line.kind];
    const tone = index === sim.printed.length - 1 ? "lit" : "hi";
    return lineSvg(lineOnTop([x, y0], [x, y0 + Y.tapeLineLengths[line.kind]], Y.tapeTop + 0.05, P), { tone, free: true });
  });
  refs.tape.innerHTML = parts.join("");
}

function draw() {
  refs.dial.setAttribute("d", dialPointerAt(sim.dialShown));
  refs.needle.setAttribute("d", needleAt(sim.needle.x));
  const headDrop = -Y.headStroke * sim.head.x;
  refs.head.setAttribute("transform", translateAlong(P, [0, 0, headDrop]));
  refs.plunger.setAttribute("transform", translateAlong(P, [0, 0, headDrop]));
  refs.tape.setAttribute("transform", translateAlong(P, [-sim.tape.x, 0, 0]));
  sim.shutters.forEach((shutter, index) => refs.bins[index].shutter.setAttribute("transform", translateAlong(P, [0, 0, Y.shutterLift * shutter.x])));
  drawCleats();
  const text = readoutOf(sim.ledger);
  if (readout.textContent !== text) readout.textContent = text;
}

let frame = 0;
let last = 0;
let visible = false;
let touring = !still.matches;
let tourClock = 0;
let tourNext = 0;
let idleTimer = 0;

function stepTour(dt) {
  if (!touring) return;
  tourClock += dt;
  while (tourNext < TOUR_EVENTS.length && tourClock >= TOUR_EVENTS[tourNext].at) {
    const event = TOUR_EVENTS[tourNext];
    if (event.split) sim.split = event.split;
    if (event.give) give();
    tourNext += 1;
  }
  if (tourClock >= TOUR_PERIOD) {
    tourClock -= TOUR_PERIOD;
    tourNext = 0;
  }
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 1 / 60;
  last = now;
  const calm = still.matches;
  sim.clock += dt;
  stepTour(dt);
  sim.dialShown = calm ? sim.split : sim.dialShown + (sim.split - sim.dialShown) * (1 - Math.exp(-dt / FOLLOW_TAU));
  if (Math.abs(sim.split - sim.dialShown) < 0.002) sim.dialShown = sim.split;
  let moving = sim.dialShown !== sim.split;
  sim.shutters.forEach((shutter, index) => {
    moving = settle(shutter, index < sim.split ? 1 : 0, dt, SHUTTER_TAU, calm) || moving;
  });
  stepCoins(dt, calm);
  stepTokens(dt, calm);
  stepAgent();
  moving = stepBeltTokens(dt, calm) || moving;
  moving = stepStamp(dt, calm) || moving;
  moving = settle(sim.needle, sim.ledger.match / MATCH_CAP_CENTS, dt, NEEDLE_TAU, calm) || moving;
  draw();
  const busy = moving || sim.coins.length > 0 || sim.tokens.length > 0 || heldTokens() > 0 || touring;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}

const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};

function takeOver() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    tourClock = 0;
    tourNext = 0;
    run();
  }, TOUR_RESUME_MS);
  run();
}

function setSplit(ways) {
  const next = clampSplit(ways);
  if (next !== sim.split) {
    sim.split = next;
    stage.setAttribute("aria-valuenow", String(next));
    stage.setAttribute("aria-valuetext", `split ${next} way${next === 1 ? "" : "s"}; ${readoutOf(sim.ledger)}`);
  }
  takeOver();
}

new IntersectionObserver(
  (entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) run();
  },
  { rootMargin: "120px 0px" },
).observe(stage);

stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = (event.clientX - box.left) / box.width;
  setSplit(1 + Math.floor(Math.min(0.999, Math.max(0, share)) * 3));
});
stage.addEventListener("pointerdown", () => {
  takeOver();
  give();
});
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowUp") setSplit(sim.split + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setSplit(sim.split - 1);
  else if (event.key === "Home") setSplit(1);
  else if (event.key === "End") setSplit(3);
  else if (event.key === " " || event.key === "Enter") {
    takeOver();
    give();
  } else return;
  event.preventDefault();
});
stage.addEventListener("focus", () => say(`split ${sim.split} ways; ${readoutOf(sim.ledger)}`));

draw();
