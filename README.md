# Cerdito Muerto — layout & motion foundation

A hand-written static site that reproduces the **structure, interaction design and
scroll-linked motion** of [burritomadre.rs](https://burritomadre.rs/en/), re-skinned to the
Cerdito Muerto dark palette. Plain HTML/CSS/vanilla JS, no build step.

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

| file | what it is |
| --- | --- |
| `index.html` | the page |
| `assets/css/theme.css` | **every colour, font and radius — the only file you edit to re-skin** |
| `assets/css/style.css` | layout, components, and the CSS half of the motion system |
| `assets/js/motion.js` | the scroll engine |
| `assets/img/gen/` | photography (generated originals + venue shots) |
| `assets/img/art/` | original vector art: characters, badge, pattern, phone, icons |
| `concept-dark.html` | the earlier standalone concept, kept for reference |

---

## What was reproduced from the reference

The reference is a WordPress/Elementor build. Its per-element CSS and its widget
configuration were read out of the served HTML, so the numbers below are measured, not
eyeballed.

### Layout system

| pattern | measured value | where it lives here |
| --- | --- | --- |
| Full-bleed hero, rounded only at the bottom | `min-height:700px`, `border-radius: 0 0 30px 30px` | `.hero` |
| Category grid | 8 items, 4 cols desktop / 2 tablet / 2 mobile, `gap:100px`, `padding:50px` | `.cats__grid` |
| Centred pill CTA under the grid | — | `.cats__cta` |
| Story block: oversized headline overlapped by an absolutely-positioned photo | photo `width:900px`, `border-radius:15px`, `right:-51px`, `top:-123px`; section `min-height:1229px`, `padding-top:150px` | `.story` |
| Second story row | `350px` image + text column capped at `720px` | `.story__row` |
| Two promo cards with a rule that slides top → bottom on hover | `border-width: 5px 0 0` → `0 0 5px`, `gap:50px` | `.promo` |
| Accent panel that tucks under the next section | `border-radius: 30px 30px 0 0`, `margin-bottom:-100px`; inner row `margin-top:-10vw` | `.loyalty` |
| Footer panel + oversized wordmark | `border-radius: 30px 30px 0 0` | `.footer` |

Those negative margins plus one-sided radii are what give the reference its stacked-panel
look; they are reproduced rather than approximated.

### Scroll-linked motion

This is the part you asked me to pay closest attention to. The reference drives it through
Elementor motion-fx and six scroll/hover-triggered vector animations. Rebuilt in
`motion.js` as a single rAF loop reading `data-` attributes:

| reference effect | its measured config | rebuilt as |
| --- | --- | --- |
| Sticky header | `sticky:top`, all devices, offset 0, `z-index:999` | `[data-header]` → `.is-stuck` |
| Parallax A | translateY, speed 1, range 0–100%, all devices | `data-parallax="speed:1; range:0,100"` |
| Parallax B | translateY, speed 3, range 0–53%, desktop + tablet | `data-parallax="speed:3; range:0,53; on:desktop,tablet"` |
| Parallax C | translateY, speed 4, **negative**, range 0–50%, desktop only | `data-parallax="speed:4; range:0,50; dir:-1; on:desktop"` |
| Parallax damping | `transition: transform 1s cubic-bezier(0,.33,.07,1.03)` | `[data-parallax]` in `style.css` |
| 4 × big lettering animations | `trigger: arriving_to_viewport` — **plays once on entry** | `data-play="stagger:N"` → one-shot staggered `wordIn` |
| 2 × hover-played animations | `trigger: on_hover` | `.arrow-link` CSS hover |
| Entrance animations | slideInDown 100ms, slideInRight 300ms, fadeInUp 100/200ms, duration **1.25s** | `data-reveal` + `data-delay` |
| Card border flip | menu cards `0 0 5px` → `5px 0 0`; CTA tiles the exact inverse, 0.3s | `.cat` / `.promo` |
| Rotating location text | hold 1000ms, slide in 600ms, slide out 600ms | `.rotator` + `data-rotate` |

### One correction worth flagging

I first built the big lettering as a **scroll-scrubbed** reveal. Reading the widget config
properly showed that is wrong: `arriving_to_viewport` is a *play-once-on-entry* trigger.
Elementor's scrub trigger is `bind_to_scroll`, and the reference uses it nowhere. The
`viewport: 0–100` value is the band of the viewport in which the element must appear for
the trigger to fire — not a scrub window; `start_point`/`end_point` are a *frame* range.
So the headlines now play through once when they arrive. A scrub capability
(`data-scrub` → `--p`) is still in the engine, just unused, as on the reference.

The parallax formula is reproduced exactly:

```
p = clamp01((scrollY + vh - docTop) / (vh + height))
q = clamp01((p - from) / (to - from))
y = dir * (q - 0.5) * speed * 0.10 * vh
```

`speed` keeps the reference's 1–10 scale and `range` clips the effect to a percentage
window of the element's journey through the viewport. Amplitude is viewport-relative, not a
fixed pixel count. Verified by probing live values at a 1440×813 viewport. Amplitudes scale exactly with
`speed` (±163px at speed 4 vs ±41px at speed 1 — a clean 4:1):

```
scroll    photo(s3)   pig(s4,neg)   chef(s1)   phone(s2)
 800        -122          163          -41        -81
2400         122          134          -34        -81
3800         122         -163           41         30

headline blocks: played=true, delays [0,110,220] and [0,95,190,285,380] ms
entrance animations: 23/23 fired
```

The loop is deliberately **not** gated behind a `ticking` boolean. A dropped frame would
leave such a flag stuck true and silently kill every effect for the rest of the session —
this version self-sustains while anything is on screen and parks when nothing is.

### Measured values carried over

Container `1920/1024/767px`; gutters and section padding `50/30/20px`; hero `700px`
desktop+tablet / `55vh` mobile with `0 0 30px 30px` → `0 0 20px 20px`; h2 `45px/1.1em/-1px`
→ `30px/1.2em`; lead `22px` → `18px`; body `16px/1.4em/-0.1px`; buttons `12px 24px`,
`16px/600`, `radius 30px`, `2px` border; footer `min-height 550/400/0`, `gap 80/50/30`;
logo `90px` overhanging `-20px`; loyalty panel `margin-bottom -100/-80/-50px`.

The scroll loop caches each element's document offset and height at init, on resize and
through a `ResizeObserver`, then reads only `scrollY`. It never calls
`getBoundingClientRect()` mid-loop — a rect read after a style write forces synchronous
layout, which is the usual cause of janky parallax.

### Colour and type

The reference is cream `#FAE8DF` with orange `#F83E1C` on maroon `#5F0E00`. The same
*roles* are mapped onto the Cerdito dark scheme in `theme.css`, so a re-skin is one file:

| role | reference | here |
| --- | --- | --- |
| page background | `#FAE8DF` | `#0B0B0A` |
| body / display text | `#5F0E00` | `#F4EEE3` |
| primary accent | `#F83E1C` | `#E8A93C` |
| secondary accent | `#F17F21` | `#C4622D` |
| deep panel | `#053626` | `#16342A` |

The reference pairs a licensed display face (*Deacon*, heavy and wide) with *Figtree*.
Figtree is free and used as-is; **Archivo Black** stands in for Deacon (which is
`Deacon-Black`, weight 900) as the closest free match for its weight and width; Archivo
variable at `wdth 88 / wght 900` is the more exact substitute if you want to go further.

Worth knowing: on the reference every homepage `<h2>` overrides the display face back to
Figtree, so Deacon only actually appears in the footer's Locations pill. The giant lettering
is artwork, not live text. Here it is **live text**, which keeps it selectable, searchable
and translatable.

---

## Artwork

Every visual asset is original work made for this build:

- **Characters** — an original cartoon pig and an original cartoon chef, drawn as SVG
- **Badge, swirl pattern, phone mock, app pill, arrow icon** — original SVG
- **Food photography** — generated from original prompts, cut out with a custom
  flood-fill alpha pass (`white studio bg → transparent`, with a soft luminance ramp so
  contact shadows fade instead of leaving hard grey blobs)
- **Venue photography** — from the restaurant's own Google Business listing

Nothing from the reference's own artwork, mascots, logo or photography is reused.

---

## Known gaps

- The reference's hero is a background **video**; this uses a still. The slot is a
  one-element swap.
- Only the homepage is built. The reference also has menu, about, locations, catering,
  careers, FAQ and contact templates.
- `#bar` currently anchors to the promo-card row rather than a dedicated bar section.
- The reference ships its entrance animations as `visibility:hidden` in the server HTML, so
  with JS off all 18 are permanently invisible. This build defaults to the finished state
  and lets JS take over, so it stays readable either way.
