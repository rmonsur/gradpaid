// A coin or token: a lime disc with a milled rim ring. Built from whichever kit
// the caller has (the module in Node, the inlined globals in the page), so the
// same drawing serves the build and the live script.
const RIM_INSET = 1.4;
const COIN_STEPS = 28;

export function coinMaker({ cylinder, solidSvg, ring, lineSvg }) {
  return function coinSvg(cx, cy, z, radius, height, projection) {
    const body = solidSvg(cylinder(cx, cy, radius, z, height, projection, COIN_STEPS), {
      className: "mp-coin",
      crease: "none",
      inner: lineSvg(ring(cx, cy, radius - RIM_INSET, z + height, projection, COIN_STEPS), { className: "mp-coin-rim" }),
    });
    return body;
  };
}
