// World layout of the machine, in units of about 1 px of the real thing.
// x runs along the bench (left to right on screen), y toward the viewer, z up.
import * as k from "../../../.claude/skills/anatomy/kit/iso-kit.mjs";

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 40;
export const ELEVATION = 34;

export const PLATE = { x: -148, y: -64, w: 288, d: 116, r: 10 };
export const PLATE_H = 12;
export const FOOT_H = 5;

// Splitter housing with the hopper on top (DONOR) and the SPLIT dial.
export const HOUSING = { x: -135, y: -58, w: 115, d: 28, r: 3 };
export const HOUSING_H = 66;
export const HOUSING_FRONT = HOUSING.y + HOUSING.d;
export const TOP_PLATE_H = 1.5;
export const HOUSING_TOP = HOUSING_H + TOP_PLATE_H;
export const HOPPER = { x: -101, y: -56, w: 24, d: 22, r: 2 };
export const HOPPER_TOP = 86;
export const HOPPER_SLOT = { x: -98, y: -53, w: 18, d: 16, r: 4 };
export const HOPPER_SLOT_CENTRE = [HOPPER_SLOT.x + HOPPER_SLOT.w / 2, HOPPER_SLOT.y + HOPPER_SLOT.d / 2];
export const DIAL = [-122, -44];
export const DIAL_FACE_R = 10.5;
export const DIAL_FACE_H = 0.6;
export const DIAL_KNOB_R = 6.5;
export const DIAL_KNOB_H = 4;
export const DIAL_SPREAD = 0.62; // radians between the 1, 2 and 3 marks

// Coins and tokens.
export const COIN_R = 7;
export const COIN_H = 1.6;
export const TOKEN_R = 5;
export const TOKEN_H = 1.2;
export const COIN_DROP_FROM = HOPPER_TOP + 34;
export const COIN_SINK = 12;

// Bins: a rack on four legs over the conveyor, fed by three spouts.
export const RACK = { x: -130, y: -28, w: 120, d: 42, r: 2 };
export const RACK_FLOOR_Z = 44;
export const RACK_FLOOR_H = 3;
export const RACK_TOP = RACK_FLOOR_Z + RACK_FLOOR_H;
export const WALL_T = 3;
export const WALL_H = 12;
export const LEG_R = 2.6;
export const LEG_INSET = 6;
export const BIN_CENTRES_X = [-109, -70, -31];
export const BIN_INNER_W = 36;
export const DROP_Y = -7;
export const BIN_CAPACITY = 10;

export const SPOUT_Z = 60;
export const SPOUT_FLOOR_H = 2;
export const SPOUT_RAIL_H = 2.5;
export const SPOUT_HALF_W = 6;
export const SPOUT_RAIL_T = 1.5;
export const SPOUT_MOUTH_Y = -6;
export const OUTLET_Z0 = SPOUT_Z + SPOUT_FLOOR_H;
export const OUTLET_Z1 = OUTLET_Z0 + 4;
export const OUTLET_HALF_W = 5.5;
export const SHUTTER = { halfW: 6.5, t: 1.5, z0: OUTLET_Z0 - 1, h: 6, lift: 5.5 };
export const GUIDE = { x0: 7.5, x1: 8.5, z0: SPOUT_Z, z1: SPOUT_Z + 13 };
export const TOKEN_SPOUT_START_Y = HOUSING_FRONT - 1.5;
export const TOKEN_SPOUT_END_Y = DROP_Y;

// Conveyor (DISBURSEMENT AGENT).
export const BELT = { x: -125, y: -14, w: 220, d: 14, r: 0 };
export const BELT_Z = 12;
export const BELT_H = 2;
export const BELT_TOP = BELT_Z + BELT_H;
export const BELT_END = BELT.x + BELT.w;
export const RAIL_T = 2;
export const RAIL_Z = 9;
export const RAIL_H = 7;
export const BELT_LEG_XS = [-118, -58, 2, 62];
export const BELT_SPEED = 70; // world units per second
export const CLEAT_PITCH = 14;
export const CLEAT_FADE = 10;
export const DRIVE_COVER = { x: -131, y: -17, w: 6, d: 20, r: 1 };
export const DRIVE_COVER_Z = 8;
export const DRIVE_COVER_H = 10;

// Servicer intake (SERVICER, PayPal Payouts).
export const GRAVITY = 220; // world units per second squared
export const SERVICER = { x: 93, y: -22, w: 32, d: 30, r: 3 };
export const SERVICER_H = 8;
export const SLOT_FLIGHT_T = Math.sqrt((2 * (BELT_TOP - SERVICER_H)) / GRAVITY);
export const SLOT_CENTRE = [BELT_END + BELT_SPEED * SLOT_FLIGHT_T, DROP_Y];
export const SLOT = { x: SLOT_CENTRE[0] - 8, y: DROP_Y - 6, w: 16, d: 12, r: 5 };
export const SLOT_SINK = 10;

// Ledger stamp (LEDGER) behind the conveyor.
export const TAKEUP = { x: -12, y: -53, w: 10, d: 20, r: 1.5 };
export const TAKEUP_H = 14;
export const PLATEN = { x: -2, y: -51, w: 94, d: 16, r: 1.5 };
export const PLATEN_H = 6;
export const FEED = { x: 80, y: -53, w: 12, d: 20, r: 1.5 };
export const FEED_H = 8;
export const COLUMN = { x: 84, y: -47, w: 8, d: 8, r: 1.5 };
export const COLUMN_TOP = 36;
export const ARM = { x: 60, y: -46, w: 24, d: 6, r: 1.5 };
export const ARM_Z = 30;
export const STAMP_X = 65;
export const STAMP_Y = -43;
export const COLLAR_R = 3.4;
export const COLLAR_H = 2;
export const HEAD = { x: 58, y: -49, w: 14, d: 12, r: 1.5 };
export const HEAD_Z = 14;
export const HEAD_H = 8;
export const HEAD_STROKE = HEAD_Z - PLATEN_H - 0.6;
export const PLUNGER_R = 2.2;
export const PLUNGER_TOP = 48;
export const KNOB_R = 3.6;
export const KNOB_H = 3;
export const TAPE = { x: -2, y: -47, w: 82, d: 8, r: 0 };
export const TAPE_H = 0.6;
export const TAPE_PITCH = 3.2;
export const TAPE_LINE_LENGTHS = { ORDER: 6.4, SPLIT: 3.6, PAYOUT: 5.2, INVOICE: 4.4 };
export const TAPE_LINE_INDENT = { ORDER: 0, SPLIT: 1.2, PAYOUT: 0.4, INVOICE: 0.8 };

// Match gauge (MATCH) in front of the rack.
export const GAUGE_BASE = { x: -122, y: 18, w: 36, d: 28, r: 3 };
export const GAUGE_BASE_H = 6;
export const GAUGE = [-104, 32];
export const GAUGE_POST_R = 4;
export const GAUGE_POST_TOP = 22;
export const GAUGE_Z = 24;
export const GAUGE_R = 15;
export const GAUGE_H = 8;
export const GAUGE_TOP = GAUGE_Z + GAUGE_H;
export const GAUGE_FROM = (-3 * Math.PI) / 4;
export const GAUGE_SPAN = (3 * Math.PI) / 2;
export const GAUGE_TICKS = 20;
export const NEEDLE_LEN = 11;

// Bench furniture.
export const RULER = { x: -124, y: 43, w: 248, d: 7, r: 1 };
export const LABEL_PLATE = { x: 44, y: 16, w: 54, d: 22, r: 2 };
export const GUSSET = { halfW: 3, depth: 1.5, h: 6 };

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [HOPPER.x, HOPPER.y, HOPPER_TOP + 2],
    [HOPPER.x + HOPPER.w, HOPPER.y + HOPPER.d, HOPPER_TOP + 2],
    [STAMP_X, STAMP_Y, PLUNGER_TOP + KNOB_H + 1],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH, elevation: ELEVATION },
);
