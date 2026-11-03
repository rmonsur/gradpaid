---
version: 'neuform-top-creators-featured'
name: 'SaaS Finance Platform'
source: 'https://www.aura.build/design-systems/saas-finance-platform'
author: 'Sourasith Phomhome (@madebysourasith)'
description: 'Saas Finance Content Section is designed for structuring a full-width content block for landing pages. Key features include reusable layout structure, responsive behavior, and production-ready styling. Built with custom CSS, it is suitable for component libraries and responsive product interfaces.'
mode: dark
colors:
  primary: '#84CC16'
  secondary: '#18181B'
  accent: '#84CC16'
  background: '#0F1115'
  surface: '#18181B'
  text-primary: '#FFFFFF'
  text-secondary: '#A1A1AA'
  border: '#27272A'
typography:
  display-lg: { family: Inter, size: 64px, weight: 500 }
  body-md: { family: JetBrains Mono, size: 16px, weight: 400 }
  label-md:
    { family: JetBrains Mono, size: 12px, weight: 600, transform: uppercase, tracking: 0.12em }
spacing:
  base: 8px
  gap: 16px
  card-padding: 24px
  section-padding: 80px
rounded:
  card: 15px
  control: 15px
  pill: 9999px
motion:
  level: moderate
  durations: [150ms, 200ms]
  easing: ease
  hover: text / color
components:
  card: { background: surface, border: 1px solid border, radius: card, padding: card-padding }
  button:
    primary: { background: primary, text: background, radius: control, weight: 600 }
    secondary:
      { background: transparent, border: 1px solid border, text: text-primary, radius: control }
---

# SaaS Finance Platform

Design system for GradPaid, adopted from the Aura "SaaS Finance Platform" DESIGN.md (Neuform featured
template by Sourasith Phomhome). The frontmatter above is the token source of truth; `src/app/globals.css`
maps every token to a CSS variable and a Tailwind theme key, and no component may use a raw hex value.

## Overview

A dark treasury-platform interface: near-black background, charcoal surfaces separated by hairline borders,
white display type, muted grey body copy, and a single lime accent reserved for live data, primary actions
and status. The source composition reads "System Status: Optimal. TREASURY PLATFORM. Institutional-grade
liquidity infrastructure designed for global scale and programmatic routing." with stat tiles ("Starting Base
Yield 1.25%", "Typical Term Length 30 DAYS - 60 MOS", "Network Live") and feature cards (Global Payouts, Live
Analytics, Yield Optimization, Risk Mitigation). GradPaid maps directly onto that vocabulary: a gift is routed
programmatically to a loan servicer, every movement is a ledger line, and the agents are the "live analytics".

## Composition

Use the attached HTML reference as the source of truth. Preserve the visible hierarchy, first-screen
composition, section rhythm, density, and interaction tone before adapting copy or content. Key visible
headings in the source: TREASURY PLATFORM.; Global Payouts; Live Analytics; Yield Optimization; Risk
Mitigation.

First viewport pattern: a short uppercase display headline ending in a period, a two-line mono subhead in
muted grey, then a row of stat tiles whose values are the only large white numbers on screen. The source's
"SYSTEM STATUS: OPTIMAL" line is rendered as the first stat tile, read live from the server, rather than as a
decorative eyebrow above the headline. Numbered feature cards ("03/", "04/") follow in a dense grid.

GradPaid first viewport: headline "THE LOAN GETS PAID.", mono subhead "Give once. An agent splits the gift,
pays the loan servicer by PayPal, and writes every cent to a public ledger.", stat tiles for System status,
Raised, Paid to servicers, Still owed on goals.

Label type (label-md) is used for card indices, stat eyebrows, table headers and badges. It is never placed as
its own block directly above a heading; headings carry their own weight. Pulse animation is reserved for
indicators tied to genuinely live data (an agent working), never for decoration in the nav.

## Colors

Anchor the palette in primary #84CC16, secondary #18181B, accent #84CC16, background #0F1115, surface
#18181B, text-primary #FFFFFF. Keep background, surface, text, and border roles distinct so generated layouts
retain the same contrast pattern as the source.

| Token          | Value   | Use                                                               |
| -------------- | ------- | ----------------------------------------------------------------- |
| background     | #0F1115 | Page background, inputs on surfaces                               |
| surface        | #18181B | Cards, nav, table rows, chat bubbles                              |
| border         | #27272A | Every hairline: card edges, dividers, table rules, input borders  |
| text-primary   | #FFFFFF | Headlines, stat values, body on surface                           |
| text-secondary | #A1A1AA | Subheads, labels, captions, placeholder text                      |
| primary/accent | #84CC16 | Primary button, live status dot, sparkline, selected state, links |

Lime is a signal, not a fill. At most one lime primary action per viewport; everything else is secondary
(bordered, transparent). Success states reuse lime; warnings use a desaturated amber (#D9A441) and failures a
muted red (#E5484D), both only for status chips and inline messages. No gradients between hues; the only
gradient permitted is the lime-to-transparent fade under a sparkline.

Contrast: text-secondary on surface is 7.1:1, text-primary on surface 17:1, background on primary (button
label) 12.6:1. Do not place text-secondary on primary.

## Typography

Use Inter for display moments and JetBrains Mono for body copy unless the HTML clearly demands a compatible
fallback. Labels and technical metadata should use JetBrains Mono or an equivalent mono face.

| Role       | Family         | Size | Weight | Notes                                              |
| ---------- | -------------- | ---- | ------ | -------------------------------------------------- |
| display-lg | Inter          | 64px | 500    | Uppercase, tracking -0.02em, line-height 1.0       |
| display-md | Inter          | 40px | 500    | Section titles, same treatment                     |
| display-sm | Inter          | 24px | 500    | Card titles, stat values                           |
| body-md    | JetBrains Mono | 16px | 400    | Paragraphs, chat, form help; line-height 1.6       |
| body-sm    | JetBrains Mono | 14px | 400    | Table cells, tool-call rows                        |
| label-md   | JetBrains Mono | 12px | 600    | Uppercase, tracking 0.12em; eyebrows, card indices |

Numbers that represent money or counts are always mono with tabular figures. Headlines end in a period when
they are statements. Never use Inter for body copy.

## Layout

Keep spacing deliberate and stable. Favor the same grid direction, max-width behavior, card density, and
responsive stacking seen in the HTML. Do not replace distinctive source structures with generic SaaS sections.

- 8px base unit. Internal gaps 16px, card padding 24px, section padding 80px vertical (48px on mobile).
- Content max-width 1200px, centred, 24px side padding.
- Grids are dense: four stat tiles across on desktop, two on tablet, one on mobile. Feature cards sit in a
  3-column grid with 16px gutters and no outer margin inside their container.
- Cards may butt against each other inside a bordered container (one shared border), which is the source's
  signature; prefer that to floating islands with large gaps.
- Sticky top nav, 64px tall, surface background, hairline bottom border. The hero sits directly on the page
  background with the dot grid behind it; stat tiles are the only bordered container in the first viewport
  (no card inside a card).

## Components

Cards, buttons, badges, navigation, and repeated blocks should preserve the source geometry, border treatment,
and hover feel.

- Card: surface fill, 1px border, 15px radius, 24px padding. Optional mono index in the top-left ("03/") and a
  12px icon in the top-right. Hover: border lightens to #3F3F46, no shadow, no lift larger than 1px.
- Primary button: lime fill, background-coloured label, 15px radius, 12px by 20px padding, 600 weight,
  mono 14px. Hover: lime darkens to #6FB10F. Focus: 2px lime outline offset 2px.
- Secondary button: transparent, 1px border, white label; hover border lightens.
- Badge/pill: 9999px radius, 1px border, mono label-md, 4px by 10px padding; lime text for live states, grey
  otherwise. Status dot 6px, lime, pulsing at 2s for "live".
- Input: background fill, 1px border, 15px radius, mono body-md, 12px by 14px padding; focus border lime.
- Table / grid: surface rows, hairline rules, mono body-sm, right-aligned numeric columns, header in label-md.
- Stat tile: label-md eyebrow, display-sm value, optional sparkline in lime below.
- Chat bubbles: assistant on surface with border, user on background with border; both 15px radius, mono.
- Tool-call rows: mono body-sm, tool name in white, duration in text-secondary, lime chip when the tool belongs
  to the PayPal Agent Toolkit.

## Motion

Preserve existing motion cues such as masked reveals, staggered entrance, hover lift, scroll-triggered
transitions, and ambient movement. Keep easing smooth and restrained.

Level: moderate. Hover and colour transitions 150ms ease; entrance and reveal 200ms ease. Stagger card
entrances by 40ms. The live status dot pulses opacity 1 to 0.4 over 2s. Respect prefers-reduced-motion by
disabling pulses and staggers.

## WebGL and Effects

If the source includes canvas, WebGL, Three.js, gradients, particles, or atmospheric effects, rebuild them as
supporting layers behind the content. Keep effects performant, responsive, and secondary to the interface.

The source uses a faint dot-grid texture behind the hero and a lime sparkline. Reproduce the dot grid as a CSS
radial-gradient mask at 8% opacity; no canvas is needed.

## Guardrails

- Do not flatten the source into a generic card grid.
- Do not swap the color mode unless the source clearly supports it. GradPaid ships dark only.
- Preserve the first viewport signal, focal object, and visual density.
- Keep buttons, cards, and badges aligned to the same radius and border language.
- PayPal's own checkout button renders inside the PayPal JS SDK and keeps PayPal's branding; frame it in a
  card rather than restyling it.
- No emojis, no icon tiles above headings, no purple-to-blue gradients, no shadows deeper than a hairline.
