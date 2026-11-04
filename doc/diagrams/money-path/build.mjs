// Builds doc/diagrams/money-path/index.html: an interactive isometric figure of
// how a GradPaid gift becomes a loan payment. Run: node doc/diagrams/money-path/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../../.claude/skills/anatomy/scripts/inline-kit.mjs";
import * as Y from "./layout.mjs";
import * as M from "./model.mjs";
import { plate, housing, hopperClip, coinFallSlot, ledger, servicer, slotClip, flySlot } from "./parts-back.mjs";
import { rearLegs, frontLegs, conveyor, rack, gauge } from "./parts-front.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TITLE = "How a gift becomes a loan payment";
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@500&family=JetBrains+Mono:wght@400;600&display=swap";
const SIZE_LIMIT_BYTES = 400 * 1024;

const stripExports = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");

const data = {
  P: Y.P,
  layout: {
    binCentresX: Y.BIN_CENTRES_X,
    dial: Y.DIAL,
    dialSpread: Y.DIAL_SPREAD,
    dialKnobR: Y.DIAL_KNOB_R,
    dialTop: Y.HOUSING_TOP + Y.DIAL_FACE_H + Y.DIAL_KNOB_H + 0.2,
    gauge: Y.GAUGE,
    gaugeFrom: Y.GAUGE_FROM,
    gaugeSpan: Y.GAUGE_SPAN,
    gaugeTop: Y.GAUGE_TOP,
    needleLen: Y.NEEDLE_LEN,
    belt: Y.BELT,
    beltTop: Y.BELT_TOP,
    beltEnd: Y.BELT_END,
    beltSpeed: Y.BELT_SPEED,
    cleatPitch: Y.CLEAT_PITCH,
    cleatFade: Y.CLEAT_FADE,
    tokenSpoutStartY: Y.TOKEN_SPOUT_START_Y,
    outletZ0: Y.OUTLET_Z0,
    dropY: Y.DROP_Y,
    rackTop: Y.RACK_TOP,
    rackFloorZ: Y.RACK_FLOOR_Z,
    tokenH: Y.TOKEN_H,
    tokenR: Y.TOKEN_R,
    coinR: Y.COIN_R,
    coinH: Y.COIN_H,
    hopperSlotCentre: Y.HOPPER_SLOT_CENTRE,
    coinDropFrom: Y.COIN_DROP_FROM,
    hopperTop: Y.HOPPER_TOP,
    coinSink: Y.COIN_SINK,
    gravity: Y.GRAVITY,
    servicerH: Y.SERVICER_H,
    slotSink: Y.SLOT_SINK,
    headStroke: Y.HEAD_STROKE,
    stampX: Y.STAMP_X,
    tape: Y.TAPE,
    tapeTop: Y.PLATEN_H + Y.TAPE_H,
    tapePitch: Y.TAPE_PITCH,
    tapeLineIndent: Y.TAPE_LINE_INDENT,
    tapeLineLengths: Y.TAPE_LINE_LENGTHS,
    shutterLift: Y.SHUTTER.lift,
  },
};

const svg = k.figureSvg({
  width: Y.WIDTH,
  height: Y.HEIGHT,
  label:
    "A bench machine that turns a gift into a loan payment. A lime coin drops into a hopper marked DONOR on a splitter housing whose SPLIT dial opens one, two or three shutters; tokens slide down the open spouts into three campaign bins on a rack over a conveyor marked DISBURSEMENT AGENT, which carries each token to a slot marked SERVICER. A stamp marked LEDGER prints one line on a paper tape for every movement, and a gauge marked MATCH shows the sponsor match climbing to its cap.",
  body: [plate(), housing(), hopperClip(), coinFallSlot(), ledger(), servicer(), rearLegs(), conveyor(), rack(), frontLegs(), slotClip(), flySlot(), gauge()],
});

const THEME_CSS = `
.iso{--anatomy-page:#0F1115;--anatomy-card:#18181B;--anatomy-text:#A1A1AA;--anatomy-strong:#FFFFFF;--anatomy-muted:#A1A1AA;
  --anatomy-paper:#18181B;--anatomy-face:#1C1C20;--anatomy-top:#232328;
  --anatomy-shade-0:#111114;--anatomy-shade-1:#151518;--anatomy-shade-2:#1A1A1E;--anatomy-shade-3:#1F1F24;
  --anatomy-lit-top:#2B2B31;--anatomy-lit-shade:#222227;
  --anatomy-hi:#A1A1AA;--anatomy-mid:#5C5C66;--anatomy-lo:#3C3C44;--anatomy-faint:#27272A;--anatomy-lit:#FFFFFF;
  --anatomy-halo:#000000;--anatomy-halo-opacity:.75;--anatomy-dot:#A1A1AA;
  --anatomy-mono:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace;
  --mp-accent:#84CC16;--mp-accent-rim:#4D7C0F;}
body{font-family:"JetBrains Mono",ui-monospace,monospace}
.iso-plate{border-radius:15px;box-shadow:0 0 0 1px #27272A}
.iso-plate-corner[data-corner="title"]{font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-weight:500;font-size:13px;text-transform:none;letter-spacing:-.01em;color:#FFFFFF}
.iso-plate-corner[data-corner="fig"]{color:#A1A1AA;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
.iso-plate-corner[data-corner="readout"]{color:#FFFFFF}
.iso-legend{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px}
.iso-stage{outline:none;touch-action:pan-y}
.iso-stage:focus-visible{outline:1px solid #A1A1AA;outline-offset:6px}
.mp-hole{fill:#0F1115;stroke:none}
.mp-coin .iso-fill{fill:#3F6212}
.mp-coin .iso-shade[data-shade="0"]{fill:#365314}
.mp-coin .iso-shade[data-shade="1"]{fill:#3F6212}
.mp-coin .iso-shade[data-shade="2"]{fill:#4D7C0F}
.mp-coin .iso-shade[data-shade="3"]{fill:#5B9412}
.mp-coin .iso-top{fill:var(--mp-accent)}
.mp-coin .iso-edge{stroke:var(--mp-accent)}
.mp-coin-rim{stroke:var(--mp-accent-rim)}
.mp-needle{stroke:var(--mp-accent)}
.iso-swatch[data-mark="lime"] path{stroke:var(--mp-accent)}
.mp-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: TITLE,
  hint: "Hover sets the split · click gives $25",
  readout: M.readoutOf(M.emptyLedger()),
  keys: [
    { mark: "lime", label: "The money: one gift coin, its allocation tokens, and the match needle" },
    { mark: "raised", label: "The machine: hopper, splitter, bins, conveyor, intake slot" },
    { mark: "dim", label: "Ledger tape: one printed line per movement" },
  ],
  caption: `Every gift is ${M.formatCents(M.GIFT_CENTS)}, captured as a PayPal Order when the coin enters the hopper. The SPLIT dial opens one, two or three shutters and the splitter cuts the gift into whole cents (${M.allocate(M.GIFT_CENTS, 3).map(M.formatCents).join(", ")} three ways), one token per verified campaign bin. The disbursement agent takes each token from its bin to the servicer slot, a PayPal Payout, and the ledger stamp prints a line for the order, each allocation, each payout and each sponsor invoice. The sponsor matches payouts ${M.MATCH_RATIO}:1 up to ${M.formatCents(M.MATCH_CAP_CENTS)}, where the MATCH needle meets its pin. The borrower never touches the money.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Money path: left and right arrows set how many campaigns share a gift, Space or Enter gives a gift" aria-valuemin="1" aria-valuemax="3" aria-valuenow="2" aria-valuetext="split 2 ways">${svg}<span class="mp-sr" role="status" aria-live="polite" data-status></span></div>`,
});

const script = [kitScript(), stripExports("model.mjs"), stripExports("coin.mjs"), `const DATA = ${JSON.stringify(data)};`, stripExports("live.mjs")].join("\n");
const page = k
  .pageHtml({ title: TITLE, theme: "dark", body, script, width: 720 })
  .replace("<style>", `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONTS_HREF}"><style>`)
  .replace("</style>", `${THEME_CSS}</style>`);

const target = join(HERE, "index.html");
writeFileSync(target, page);
const bytes = Buffer.byteLength(page);
const solids = (page.match(/class="iso-solid/g) || []).length;
const paths = (page.match(/<path/g) || []).length;
process.stdout.write(`wrote ${target} (${(bytes / 1024).toFixed(1)} KB, ${solids} solids, ${paths} paths)\n`);
if (bytes > SIZE_LIMIT_BYTES) {
  process.stdout.write(`page is over the ${SIZE_LIMIT_BYTES / 1024} KB limit\n`);
  process.exitCode = 1;
}
