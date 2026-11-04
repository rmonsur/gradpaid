// Static parts in the middle and front of the bench: the conveyor, the bin rack
// on its legs with the three spouts, and the match gauge.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as Y from "./layout.mjs";
import { P } from "./layout.mjs";
import { S, L, D, at, slab, cyl, screws, frontLabel, topLabel, clipped } from "./draw.mjs";
import { spoutClip } from "./parts-back.mjs";

const LEG_FOOT_R = 3.6;
const LEG_FOOT_H = 1.2;
const RIVET_PITCH = 12;
const BELT_LEG_W = 4;
const LABEL_SIZE = 3;

const legAt = ([x, y]) => S(cyl(x, y, LEG_FOOT_R, 0, LEG_FOOT_H, 20), { tone: "lo" }) + S(cyl(x, y, Y.LEG_R, LEG_FOOT_H, Y.RACK_FLOOR_Z - LEG_FOOT_H, 20), { tone: "mid", crease: "none" }) + L(k.sideArc(x, y, Y.LEG_R, Y.RACK_FLOOR_Z - 6, P, 12), { tone: "faint" });

const legPoints = () => k.corners(Y.RACK, Y.LEG_INSET);
export const rearLegs = () => legPoints().slice(0, 2).map(legAt).join("");
export const frontLegs = () => legPoints().slice(2).map(legAt).join("");

function beltLegs(y) {
  return Y.BELT_LEG_XS.map((x) => S(slab({ x: x - BELT_LEG_W / 2, y, w: BELT_LEG_W, d: Y.RAIL_T, r: 0.4 }, 0, Y.RAIL_Z, 2), { tone: "mid", crease: "none" })).join("");
}

const rail = (y) => S(slab({ x: Y.BELT.x, y, w: Y.BELT.w, d: Y.RAIL_T, r: 0.5 }, Y.RAIL_Z, Y.RAIL_H, 2, 0.4), { tone: "mid" });

export function conveyor() {
  const out = [];
  const farY = Y.BELT.y - Y.RAIL_T;
  const nearY = Y.BELT.y + Y.BELT.d;
  out.push(beltLegs(farY));
  out.push(rail(farY));
  out.push(S(slab(Y.BELT, Y.BELT_Z, Y.BELT_H, 1), { tone: "lo", crease: "none" }));
  out.push(L(k.lineOnTop([Y.BELT.x, Y.BELT.y], [Y.BELT_END, Y.BELT.y], Y.BELT_TOP, P), { tone: "lo" }));
  out.push(`<g data-part="cleats"></g>`);
  out.push(`<g data-part="belt-tokens"></g>`);
  out.push(beltLegs(nearY));
  out.push(rail(nearY));
  out.push(D([Y.BELT.x + 8, Y.BELT.x + 60, Y.BELT.x + 120, Y.BELT_END - 8].map((x) => at([x, nearY + Y.RAIL_T / 2, Y.RAIL_Z + Y.RAIL_H])), { size: 0.4 }));
  out.push(frontLabel(Y.BELT.x + 150, nearY + Y.RAIL_T, Y.RAIL_Z + 2, "DISBURSEMENT AGENT", { size: LABEL_SIZE, tone: "hi" }));
  out.push(S(slab(Y.DRIVE_COVER, Y.DRIVE_COVER_Z, Y.DRIVE_COVER_H, 3, 0.5), { tone: "mid" }));
  out.push(D([at([Y.DRIVE_COVER.x + 3, Y.DRIVE_COVER.y + 3, Y.DRIVE_COVER_Z + Y.DRIVE_COVER_H]), at([Y.DRIVE_COVER.x + 3, Y.DRIVE_COVER.y + Y.DRIVE_COVER.d - 3, Y.DRIVE_COVER_Z + Y.DRIVE_COVER_H])], { size: 0.4 }));
  return out.join("");
}

export const cleatAt = (x, projection = P) => k.lineOnTop([x, Y.BELT.y], [x, Y.BELT.y + Y.BELT.d], Y.BELT_TOP, projection);

function spout(index) {
  const cx = Y.BIN_CENTRES_X[index];
  const length = Y.SPOUT_MOUTH_Y - Y.HOUSING_FRONT;
  const out = [];
  out.push(S(slab({ x: cx - Y.SPOUT_HALF_W, y: Y.HOUSING_FRONT, w: Y.SPOUT_HALF_W * 2, d: length, r: 0.4 }, Y.SPOUT_Z, Y.SPOUT_FLOOR_H, 2), { tone: "mid", crease: "none" }));
  for (const side of [-1, 1]) {
    const x = side < 0 ? cx - Y.SPOUT_HALF_W - Y.SPOUT_RAIL_T : cx + Y.SPOUT_HALF_W;
    out.push(S(slab({ x, y: Y.HOUSING_FRONT, w: Y.SPOUT_RAIL_T, d: length, r: 0.4 }, Y.OUTLET_Z0, Y.SPOUT_RAIL_H, 2, 0.3), { tone: "mid" }));
  }
  return out.join("");
}

function wallX(x) {
  return S(slab({ x, y: Y.RACK.y, w: Y.WALL_T, d: Y.RACK.d, r: 0.6 }, Y.RACK_TOP, Y.WALL_H, 2, 0.4), { tone: "mid" });
}

export function rack() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(Y.RACK, 4), Y.RACK_FLOOR_Z, 0.1, P)}" style="filter:blur(5px)"/>`);
  out.push(S(slab(Y.RACK, Y.RACK_FLOOR_Z, Y.RACK_FLOOR_H, 3, 0.6), { tone: "mid" }));
  out.push(S(slab({ x: Y.RACK.x, y: Y.RACK.y, w: Y.RACK.w, d: Y.WALL_T, r: 0.6 }, Y.RACK_TOP, Y.WALL_H, 2, 0.4), { tone: "mid" }));
  out.push(wallX(Y.RACK.x));
  Y.BIN_CENTRES_X.forEach((cx, index) => {
    const inner = { x: cx - Y.BIN_INNER_W / 2, y: Y.RACK.y + Y.WALL_T, w: Y.BIN_INNER_W, d: Y.RACK.d - Y.WALL_T * 2, r: 0.5 };
    out.push(L(k.planOutline(k.insetPlan(inner, 1.6), Y.RACK_TOP, P, 2), { tone: "faint" }));
    out.push(spout(index));
    out.push(spoutClip(index));
    out.push(clipped(`mp-clip-spout-${index}`, `<g data-spout="${index}"></g>`));
    out.push(`<g data-stack="${index}"></g><g data-drop="${index}"></g>`);
    if (index < Y.BIN_CENTRES_X.length - 1) out.push(wallX(cx + Y.BIN_INNER_W / 2));
  });
  out.push(wallX(Y.RACK.x + Y.RACK.w - Y.WALL_T));
  const nearY = Y.RACK.y + Y.RACK.d - Y.WALL_T;
  out.push(S(slab({ x: Y.RACK.x, y: nearY, w: Y.RACK.w, d: Y.WALL_T, r: 0.6 }, Y.RACK_TOP, Y.WALL_H, 2, 0.4), { tone: "mid" }));
  const rivets = [];
  for (let x = Y.RACK.x + 8; x < Y.RACK.x + Y.RACK.w - 4; x += RIVET_PITCH) rivets.push(at([x, nearY + Y.WALL_T / 2, Y.RACK_TOP + Y.WALL_H]));
  out.push(D(rivets, { size: 0.4, tone: "lo" }));
  return out.join("");
}

export const needleAt = (share, projection = P) => {
  const [x, y] = Y.GAUGE;
  const angle = Y.GAUGE_FROM + Math.min(1, Math.max(0, share)) * Y.GAUGE_SPAN;
  const top = Y.GAUGE_TOP + 0.2;
  return k.lineOnTop([x - Math.sin(angle) * 2.6, y + Math.cos(angle) * 2.6], [x + Math.sin(angle) * Y.NEEDLE_LEN, y - Math.cos(angle) * Y.NEEDLE_LEN], top, projection);
};

export function gauge() {
  const [x, y] = Y.GAUGE;
  const out = [`<path class="iso-halo" d="${k.haloOf(Y.GAUGE_BASE, 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(slab(Y.GAUGE_BASE, 0, Y.GAUGE_BASE_H, 4, 0.8), { tone: "mid" }));
  out.push(screws(k.corners(Y.GAUGE_BASE, 4), Y.GAUGE_BASE_H));
  out.push(S(cyl(x, y, Y.GAUGE_POST_R + 1.5, Y.GAUGE_BASE_H, 2, 24), { tone: "mid" }));
  out.push(S(cyl(x, y, Y.GAUGE_POST_R, Y.GAUGE_BASE_H + 2, Y.GAUGE_POST_TOP - Y.GAUGE_BASE_H - 2, 24), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(x, y, Y.GAUGE_POST_R, Y.GAUGE_BASE_H + 9, P, 12), { tone: "faint" }));
  out.push(S(cyl(x, y, Y.GAUGE_POST_R + 1.2, Y.GAUGE_POST_TOP, Y.GAUGE_Z - Y.GAUGE_POST_TOP, 24), { tone: "mid" }));
  out.push(S(cyl(x, y, Y.GAUGE_R, Y.GAUGE_Z, Y.GAUGE_H, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, Y.GAUGE_R, Y.GAUGE_TOP - 3, Y.GAUGE_TOP, 72, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, Y.GAUGE_R, Y.GAUGE_TOP - 3, P, 36), { tone: "faint" }));
  out.push(L(k.ring(x, y, Y.GAUGE_R - 2, Y.GAUGE_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, Y.GAUGE_R - 2.6, Y.GAUGE_TICKS, 5, Y.GAUGE_TOP, [1.2, 2.6], P, Y.GAUGE_FROM, Y.GAUGE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const pinAngle = Y.GAUGE_FROM + Y.GAUGE_SPAN;
  out.push(D([at([x + Math.sin(pinAngle) * (Y.NEEDLE_LEN + 0.9), y - Math.cos(pinAngle) * (Y.NEEDLE_LEN + 0.9), Y.GAUGE_TOP])], { size: 0.55, tone: "hi" }));
  out.push(S(slab({ x: x + Y.GAUGE_R - 1, y: y - 2.4, w: 5, d: 4.8, r: 1.2 }, Y.GAUGE_Z + 1.5, 5, 3), { tone: "mid" }));
  out.push(S(slab({ x: x + Y.GAUGE_R + 3.6, y: y - 3.2, w: 2.6, d: 6.4, r: 1.2 }, Y.GAUGE_Z + 0.8, 6.4, 3), { tone: "mid" }));
  out.push(topLabel(x, y + 6.4, Y.GAUGE_TOP, "MATCH", { size: 2.5, tone: "hi" }));
  out.push(L(k.ring(x, y, 1.6, Y.GAUGE_TOP, P, 16), { tone: "mid" }));
  out.push(`<path data-part="needle" class="iso-line mp-needle" data-free="" d="${needleAt(0)}" style="stroke-width:1.1"/>`);
  return out.join("");
}
