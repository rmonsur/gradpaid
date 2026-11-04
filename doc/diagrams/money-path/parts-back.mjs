// Static parts at the back of the bench: the base plate, the splitter housing
// with its hopper and dial, the ledger stamp and the servicer intake.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as Y from "./layout.mjs";
import { P } from "./layout.mjs";
import { S, L, D, at, slab, cyl, byDepth, holeSvg, screws, frontLabel, sweepClip, polyClip, clipped } from "./draw.mjs";

const FEET_INSET = 22;
const SCREW_INSET = 11;
const GROOVE_INSET = 6;
const LABEL_SIZE = 3.6;
const SUB_LABEL_SIZE = 2.3;
const SPLIT_LABEL_X = -128;
const SPLIT_LABEL_Z = 59.5;
const FREE_RULE = { tone: "lo", free: true };

export function plate() {
  const z0 = -Y.PLATE_H - Y.FOOT_H;
  const out = [`<path class="iso-halo" d="${k.haloOf(Y.PLATE, z0, Y.PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(Y.PLATE, FEET_INSET))) {
    out.push(S(cyl(x, y, 7, z0, 1.6), { tone: "lo" }));
    out.push(S(cyl(x, y, 5.4, z0 + 1.6, Y.FOOT_H - 1.6), { tone: "mid" }));
  }
  out.push(S(slab(Y.PLATE, -Y.PLATE_H, Y.PLATE_H, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(Y.PLATE, GROOVE_INSET), 0, P), { tone: "faint" }));
  out.push(screws(k.corners(Y.PLATE, SCREW_INSET), 0));
  out.push(S(slab(Y.RULER, 0, 0.6, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(Y.RULER.x + 5, Y.RULER.x + Y.RULER.w - 5, 5, 5, Y.RULER.y + 0.8, 0.6, [2, 3.8], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([Y.RULER.x + 2.5, Y.RULER.y + 3.5, 0.6]), at([Y.RULER.x + Y.RULER.w - 2.5, Y.RULER.y + 3.5, 0.6])], { size: 0.45 }));
  const plate = Y.LABEL_PLATE;
  out.push(S(slab(plate, 0, 0.8, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.8), 0.8, P, 3), { tone: "faint" }));
  [[6, 30], [6, 22], [6, 16]].forEach(([inset, length], index) => {
    const y = plate.y + 6 + index * 4.2;
    out.push(L(k.lineOnTop([plate.x + inset, y], [plate.x + inset + length, y], 0.8, P), FREE_RULE));
  });
  out.push(D([at([plate.x + 3, plate.y + plate.d - 3, 0.8]), at([plate.x + plate.w - 3, plate.y + plate.d - 3, 0.8])], { size: 0.45 }));
  return out.join("");
}

function hopper() {
  const out = [];
  out.push(S(slab(Y.HOPPER, Y.HOUSING_TOP, Y.HOPPER_TOP - Y.HOUSING_TOP, 3, 0.8), { tone: "mid" }));
  out.push(S(slab(k.insetPlan(Y.HOPPER, -1.2), Y.HOPPER_TOP - 2.4, 2.4, 3, 0.5), { tone: "mid" }));
  const slot = k.ringOf(Y.HOPPER_SLOT, 6);
  out.push(holeSvg(slot.map(([x, y]) => [x, y, Y.HOPPER_TOP]), "lo"));
  out.push(L(k.planOutline(k.insetPlan(Y.HOPPER_SLOT, -1.6), Y.HOPPER_TOP, P, 6), { tone: "faint" }));
  const face = Y.HOPPER.y + Y.HOPPER.d;
  const cx = Y.HOPPER.x + Y.HOPPER.w / 2;
  out.push(frontLabel(cx, face, Y.HOPPER_TOP - 7.6, "DONOR", { size: LABEL_SIZE, tone: "hi" }));
  out.push(frontLabel(cx, face, Y.HOPPER_TOP - 11.4, "PAYPAL ORDERS", { size: SUB_LABEL_SIZE }));
  out.push(D([at([Y.HOPPER.x + 2.5, face, Y.HOUSING_TOP + 2.5]), at([Y.HOPPER.x + Y.HOPPER.w - 2.5, face, Y.HOUSING_TOP + 2.5])], { size: 0.4 }));
  return out.join("");
}

function dial() {
  const [x, y] = Y.DIAL;
  const faceZ = Y.HOUSING_TOP;
  const faceTop = faceZ + Y.DIAL_FACE_H;
  const out = [];
  out.push(S(cyl(x, y, Y.DIAL_FACE_R, faceZ, Y.DIAL_FACE_H, 40), { tone: "mid", crease: "none" }));
  out.push(L(k.ring(x, y, Y.DIAL_FACE_R - 1, faceTop, P, 40), { tone: "lo" }));
  const marks = [-1, 0, 1].map((step) => Math.PI + step * Y.DIAL_SPREAD);
  out.push(L(marks.map((angle) => k.lineOnTop([x + Math.sin(angle) * (Y.DIAL_FACE_R - 3.4), y - Math.cos(angle) * (Y.DIAL_FACE_R - 3.4)], [x + Math.sin(angle) * (Y.DIAL_FACE_R - 1), y - Math.cos(angle) * (Y.DIAL_FACE_R - 1)], faceTop, P)).join(""), { tone: "hi" }));
  out.push(S(cyl(x, y, Y.DIAL_KNOB_R, faceTop, Y.DIAL_KNOB_H, 32), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, Y.DIAL_KNOB_R, faceTop, faceTop + Y.DIAL_KNOB_H, 30, P), { tone: "lo" }));
  out.push(D([at([x, y, faceTop + Y.DIAL_KNOB_H])], { size: 0.45, tone: "hi" }));
  out.push(frontLabel(SPLIT_LABEL_X, Y.HOUSING_FRONT, SPLIT_LABEL_Z, "SPLIT", { size: LABEL_SIZE, tone: "hi" }));
  return out.join("");
}

export const dialPointerAt = (ways, projection = P) => {
  const [x, y] = Y.DIAL;
  const angle = Math.PI + (ways - 2) * Y.DIAL_SPREAD;
  const top = Y.HOUSING_TOP + Y.DIAL_FACE_H + Y.DIAL_KNOB_H + 0.2;
  return k.lineOnTop([x - Math.sin(angle) * 1.6, y + Math.cos(angle) * 1.6], [x + Math.sin(angle) * (Y.DIAL_KNOB_R - 0.6), y - Math.cos(angle) * (Y.DIAL_KNOB_R - 0.6)], top, projection);
};

function outlet(index) {
  const cx = Y.BIN_CENTRES_X[index];
  const face = Y.HOUSING_FRONT;
  const out = [];
  out.push(holeSvg([[cx - Y.OUTLET_HALF_W, face, Y.OUTLET_Z0], [cx + Y.OUTLET_HALF_W, face, Y.OUTLET_Z0], [cx + Y.OUTLET_HALF_W, face, Y.OUTLET_Z1], [cx - Y.OUTLET_HALF_W, face, Y.OUTLET_Z1]], "lo"));
  for (const side of [-1, 1]) {
    const x0 = cx + (side < 0 ? -Y.GUIDE.x1 : Y.GUIDE.x0);
    out.push(S(slab({ x: x0, y: face, w: Y.GUIDE.x1 - Y.GUIDE.x0, d: Y.SHUTTER.t + 0.6, r: 0.3 }, Y.GUIDE.z0, Y.GUIDE.z1 - Y.GUIDE.z0, 2), { tone: "mid", crease: "none" }));
  }
  out.push(S(slab({ x: cx - Y.GUSSET.halfW, y: face, w: Y.GUSSET.halfW * 2, d: Y.GUSSET.depth, r: 0.3 }, Y.SPOUT_Z - Y.GUSSET.h, Y.GUSSET.h, 2), { tone: "mid", crease: "none" }));
  const shutter = S(slab({ x: cx - Y.SHUTTER.halfW, y: face, w: Y.SHUTTER.halfW * 2, d: Y.SHUTTER.t, r: 0.3 }, Y.SHUTTER.z0, Y.SHUTTER.h, 2, 0.3), { tone: "hi", crease: "lo" });
  out.push(`<g data-shutter="${index}">${shutter}${D([at([cx, face + Y.SHUTTER.t, Y.SHUTTER.z0 + Y.SHUTTER.h / 2])], { size: 0.4, tone: "hi" })}</g>`);
  return out.join("");
}

export function housing() {
  const out = [];
  const seams = [22, 44].map((z) => L(k.sideSeam(Y.HOUSING, z, P, 3), { tone: "faint" })).join("");
  out.push(S(slab(Y.HOUSING, 0, Y.HOUSING_H, 3, 1.2), { tone: "mid", inner: seams }));
  out.push(S(slab(k.insetPlan(Y.HOUSING, 2), Y.HOUSING_H, Y.TOP_PLATE_H, 3, 0.4), { tone: "mid" }));
  out.push(screws(k.corners(k.insetPlan(Y.HOUSING, 2), 4), Y.HOUSING_TOP));
  const ventX = Y.HOUSING.x + Y.HOUSING.w;
  for (let row = 0; row < 5; row++) {
    const z = 20 + row * 6;
    out.push(L(k.pathOf([[ventX, -52, z], [ventX, -36, z], [ventX, -36, z + 1.6], [ventX, -52, z + 1.6]].map(at), true), { tone: "lo" }));
  }
  out.push(hopper());
  out.push(dial());
  out.push(`<path data-part="dial-pointer" class="iso-line" data-tone="hi" data-free="" d="${dialPointerAt(2)}" style="stroke-width:1"/>`);
  Y.BIN_CENTRES_X.forEach((_, index) => out.push(outlet(index)));
  return out.join("");
}

export function hopperClip() {
  return sweepClip("mp-clip-hopper", k.ringOf(Y.HOPPER_SLOT, 6).map(([x, y]) => [x, y, Y.HOPPER_TOP]));
}

export function spoutClip(index) {
  const cx = Y.BIN_CENTRES_X[index];
  const w = Y.SHUTTER.halfW;
  const face = Y.HOUSING_FRONT;
  const far = Y.TOKEN_SPOUT_END_Y + Y.TOKEN_R + 1;
  const lift = Y.TOKEN_H + 0.4;
  return polyClip(`mp-clip-spout-${index}`, [
    [cx - w, face, Y.OUTLET_Z1],
    [cx + w, face, Y.OUTLET_Z1],
    [cx + w, face, Y.OUTLET_Z0],
    [cx + w, far, Y.OUTLET_Z0 + lift],
    [cx - w, far, Y.OUTLET_Z0 + lift],
    [cx - w, face, Y.OUTLET_Z0],
  ]);
}

export function coinFallSlot() {
  return clipped("mp-clip-hopper", `<g data-part="coin-fall"></g>`);
}

export function ledger() {
  const out = [];
  out.push(S(slab(Y.TAKEUP, 0, Y.TAKEUP_H, 3, 0.6), { tone: "mid" }));
  const slotX = Y.TAKEUP.x + Y.TAKEUP.w;
  out.push(holeSvg([[slotX, Y.TAPE.y - 1, Y.PLATEN_H], [slotX, Y.TAPE.y + Y.TAPE.d + 1, Y.PLATEN_H], [slotX, Y.TAPE.y + Y.TAPE.d + 1, Y.PLATEN_H + Y.TAPE_H + 1.2], [slotX, Y.TAPE.y - 1, Y.PLATEN_H + Y.TAPE_H + 1.2]], "lo"));
  out.push(S(slab(Y.PLATEN, 0, Y.PLATEN_H, 3, 0.8), { tone: "mid" }));
  out.push(screws([[Y.PLATEN.x + 5, Y.PLATEN.y + 3], [Y.PLATEN.x + Y.PLATEN.w - 16, Y.PLATEN.y + 3], [Y.PLATEN.x + 5, Y.PLATEN.y + Y.PLATEN.d - 3], [Y.PLATEN.x + Y.PLATEN.w - 16, Y.PLATEN.y + Y.PLATEN.d - 3]], Y.PLATEN_H));
  out.push(frontLabel(Y.PLATEN.x + 30, Y.PLATEN.y + Y.PLATEN.d, 1.4, "LEDGER", { size: 3.4, tone: "hi" }));
  out.push(S(slab(Y.TAPE, Y.PLATEN_H, Y.TAPE_H, 2), { tone: "hi", crease: "none" }));
  const tapeTop = Y.PLATEN_H + Y.TAPE_H;
  out.push(polyClip("mp-clip-tape", k.ringOf(Y.TAPE, 2).map(([x, y]) => [x, y, tapeTop + 0.05])));
  out.push(clipped("mp-clip-tape", `<g data-part="tape-lines"></g>`));
  out.push(`<g data-part="stamp-head">${S(slab(Y.HEAD, Y.HEAD_Z, Y.HEAD_H, 3, 0.6), { tone: "hi", crease: "lo" })}${S(cyl(Y.STAMP_X, Y.STAMP_Y, Y.PLUNGER_R, Y.HEAD_Z + Y.HEAD_H, Y.COLUMN_TOP + Y.COLLAR_H - Y.HEAD_Z - Y.HEAD_H, 16), { tone: "mid", crease: "none" })}</g>`);
  out.push(S(slab(Y.FEED, Y.PLATEN_H, Y.FEED_H, 3, 0.6), { tone: "mid" }));
  out.push(S(slab(Y.COLUMN, Y.PLATEN_H + Y.FEED_H, Y.COLUMN_TOP - Y.PLATEN_H - Y.FEED_H, 3, 0.6), { tone: "mid" }));
  out.push(S(slab(Y.ARM, Y.ARM_Z, Y.COLUMN_TOP - Y.ARM_Z, 3, 0.6), { tone: "mid" }));
  out.push(D([at([Y.ARM.x + 3, Y.STAMP_Y, Y.COLUMN_TOP]), at([Y.ARM.x + Y.ARM.w - 3, Y.STAMP_Y, Y.COLUMN_TOP])], { size: 0.45 }));
  out.push(S(cyl(Y.STAMP_X, Y.STAMP_Y, Y.COLLAR_R, Y.COLUMN_TOP, Y.COLLAR_H, 24), { tone: "mid" }));
  const rim = k.circleRing(Y.STAMP_X, Y.STAMP_Y, Y.COLLAR_R, 24).map(([x, y]) => [x, y, Y.COLUMN_TOP + Y.COLLAR_H]);
  out.push(sweepClip("mp-clip-collar", rim));
  const plunger = S(cyl(Y.STAMP_X, Y.STAMP_Y, Y.PLUNGER_R, Y.COLUMN_TOP + Y.COLLAR_H, Y.PLUNGER_TOP - Y.COLUMN_TOP - Y.COLLAR_H, 16), { tone: "mid", crease: "none" });
  const knob = S(cyl(Y.STAMP_X, Y.STAMP_Y, Y.KNOB_R, Y.PLUNGER_TOP, Y.KNOB_H, 24), { tone: "hi", crease: "lo" });
  const knurl = L(k.knurl(Y.STAMP_X, Y.STAMP_Y, Y.KNOB_R, Y.PLUNGER_TOP, Y.PLUNGER_TOP + Y.KNOB_H, 20, P), { tone: "lo" });
  out.push(clipped("mp-clip-collar", `<g data-part="plunger">${plunger}${knob}${knurl}</g>`));
  return out.join("");
}

export function servicer() {
  const out = [];
  out.push(S(slab(Y.SERVICER, 0, Y.SERVICER_H, 4, 0.8), { tone: "mid" }));
  out.push(screws(k.corners(Y.SERVICER, 4), Y.SERVICER_H));
  out.push(holeSvg(k.ringOf(Y.SLOT, 6).map(([x, y]) => [x, y, Y.SERVICER_H]), "lo"));
  out.push(L(k.planOutline(k.insetPlan(Y.SLOT, -1.6), Y.SERVICER_H, P, 6), { tone: "faint" }));
  const face = Y.SERVICER.y + Y.SERVICER.d;
  const cx = Y.SERVICER.x + Y.SERVICER.w / 2;
  out.push(frontLabel(cx, face, 4.3, "SERVICER", { size: 2.9, tone: "hi" }));
  out.push(frontLabel(cx, face, 1.3, "PAYPAL PAYOUTS", { size: 1.9 }));
  return out.join("");
}

export function slotClip() {
  return sweepClip("mp-clip-slot", k.ringOf(Y.SLOT, 6).map(([x, y]) => [x, y, Y.SERVICER_H]));
}

export const flySlot = () => clipped("mp-clip-slot", `<g data-part="fly"></g>`);
