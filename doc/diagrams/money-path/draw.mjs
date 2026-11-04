// Small drawing helpers over the kit: short aliases, polygons on vertical faces,
// engraved labels and the sweep clip that lets a part sink into an opening.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { P } from "./layout.mjs";

const FAR_AWAY = 4000;
const SCREW_SIZE = 0.5;
const SCREW_RING_R = 2;

export const at = (point) => k.iso(point, P);
export const S = (paths, style) => k.solidSvg(paths, style);
export const L = (d, style) => k.lineSvg(d, style);
export const D = (points, style) => k.dotsSvg(points, style);
export const slab = (plan, z, h, steps = 4, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
export const cyl = (cx, cy, r, z, h, steps = 28, bevel = 0) => k.cylinder(cx, cy, r, z, h, P, steps, bevel);
export const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// A closed polygon drawn through world points (a slot on a vertical face, a window).
export const facePoly = (points) => k.pathOf(points.map(at), true);

// A dark opening: a hole the paper colour does not reach.
export const holeSvg = (points, outlineTone = "lo") => `<path class="mp-hole" d="${facePoly(points)}"/>${L(facePoly(points), { tone: outlineTone })}`;

export const screws = (points, z, tone = "lo") =>
  L(points.map(([x, y]) => k.ring(x, y, SCREW_RING_R, z, P, 14)).join(""), { tone }) + D(points.map(([x, y]) => at([x, y, z])), { size: SCREW_SIZE });

// Engraved text on the +y face ("front") or the +x face ("right") of a part, baseline at z.
export const frontLabel = (x, y, z, text, options = {}) => k.faceTextSvg(k.sideMatrix([x, y], z, P, "left"), text, { anchor: "middle", tone: "mid", ...options });
export const rightLabel = (x, y, z, text, options = {}) => k.faceTextSvg(k.sideMatrix([x, y], z, P, "right"), text, { anchor: "middle", tone: "mid", ...options });
export const topLabel = (x, y, z, text, options = {}) => k.faceTextSvg(k.topMatrix([x, y], z, P, "x"), text, { anchor: "middle", tone: "mid", ...options });

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function convexHull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (list) => {
    const out = [];
    for (const point of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], point) <= 0) out.pop();
      out.push(point);
    }
    return out;
  };
  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// The chain of the hull from its leftmost to its rightmost point that lies lowest on screen.
function lowerChain(points) {
  const hull = convexHull(points);
  const leftIndex = hull.reduce((best, point, index) => (point[0] < hull[best][0] ? index : best), 0);
  const rightIndex = hull.reduce((best, point, index) => (point[0] > hull[best][0] ? index : best), 0);
  const walk = (step) => {
    const chain = [hull[leftIndex]];
    for (let index = leftIndex; index !== rightIndex; ) {
      index = (index + step + hull.length) % hull.length;
      chain.push(hull[index]);
    }
    return chain;
  };
  const forward = walk(1);
  const backward = walk(-1);
  const meanY = (chain) => chain.reduce((sum, point) => sum + point[1], 0) / chain.length;
  return meanY(forward) > meanY(backward) ? forward : backward;
}

// A clip that keeps everything above the near rim of an opening: a part dropped
// through it is cut exactly where it passes the rim, and stays whole above it.
export function sweepClip(id, ringPoints3) {
  const chain = lowerChain(ringPoints3.map(at));
  const first = chain[0];
  const last = chain[chain.length - 1];
  const d = `M${first[0] - FAR_AWAY} ${first[1]}${k.pathOf(chain).replace(/^M/, "L")}L${last[0] + FAR_AWAY} ${last[1]}L${last[0] + FAR_AWAY} ${-FAR_AWAY}L${first[0] - FAR_AWAY} ${-FAR_AWAY}Z`;
  return `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
}

// A clip made of a closed world polygon (an opening in a face plus the tray it feeds).
export const polyClip = (id, points3) => `<clipPath id="${id}"><path d="${facePoly(points3)}"/></clipPath>`;

export const clipped = (id, inner) => `<g clip-path="url(#${id})">${inner}</g>`;
