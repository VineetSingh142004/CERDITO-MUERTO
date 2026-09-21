# Cerdito Muerto — website template

A premium, dark, single-page website template for **Cerdito Muerto**, the cocktail bar &
Mexican-American kitchen at 1700 S. Halsted St. in Pilsen, Chicago.

Static HTML/CSS/JS — no build step. Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

## Design direction

The layout system is modelled on **burritomadre.rs** — the reference the client picked. What
was carried over from it:

| Reference pattern | Where it is here |
| --- | --- |
| Full-bleed hero with `border-radius: 0 0 30px 30px` | `.hero` |
| 8-up category grid, 4 across desktop / 2 on mobile | `.cats__grid` |
| "Discover the whole menu" outline CTA under the grid | `.cats__foot` |
| Story block with overlapping, rounded image collage | `.story` |
| Accent panel with pattern overlay, rounded top, negative-margin overlap | `.programs` → `.visit` |
| Tall multi-column footer with an oversized outlined wordmark | `.footer` |
| Heavy uppercase display type over a geometric body face | `--display` / `--body` |
| Character illustrations layered over section edges | `.hero__chef`, `.doodle` |

The colour and type were re-cut for Cerdito Muerto rather than copied — the reference is a
cream-and-orange fast-casual brand, and this one is a dark late-night room. The palette is
sampled from the restaurant itself:

| Token | Value | Source |
| --- | --- | --- |
| `--ink` | `#0B0B0A` | the room at night |
| `--green` / `--green-2` | `#16342A` / `#235741` | the brand green and the painted walls |
| `--gold` | `#E8A93C` | the brass globe pendants over the bar |
| `--cream` | `#F4EEE3` | the existing logotype |

Type: **Poppins** (display, uppercase) + **Figtree** (body) + **Zilla Slab** (small caps
labels). Figtree matches the reference; Poppins and Zilla Slab are the faces the
restaurant's current site already uses.

## Content

Everything on the page is the restaurant's own copy, pulled from their live site and
published menu — nothing is placeholder:

- **Story, beverage & food programs** — verbatim from the "Cerdito Muerto" page
- **Menu and prices** — from the published PDF menu (version dated 6.24.26)
- **Hours, address, phone, email, reservation policy** — from the "Hours & Contact" and
  "Reserve" pages
- **Chef** — Becky Carson · **Instagram** — [@cerditomuertochicago](https://www.instagram.com/cerditomuertochicago)
- **Reservations** — [Resy](https://resy.com/cities/chicago-il/venues/cerdito-muerto)

Prices and dishes change; re-check the menu block before handing this to the client.

## Assets

```
assets/
  css/style.css          design tokens + all layout
  js/main.js             sticky header, drawer, scroll reveal, "open today" marker
  img/photos/            interior photography (see credit below)
  img/art/
    chef.svg             the cartoon chef mascot
    logo-pig.svg         the dead-pig mark, redrawn as vector line art
    cat/*.svg            eight gold line-art category illustrations
    pattern-talavera.svg tiling pattern for the green panel and footer
```

**Photo credit:** all interior photography is derived from the single high-resolution image
on the Cerdito Muerto Google Business listing, cropped into detail shots. The credit line is
in the footer. Only one image was retrievable from the Google listing — drop more into
`assets/img/photos/` and swap the `src`s to enrich the story collage and the reserve block.

**Illustrations** are original vector work drawn for this template: the mascot, the doodles
and the category icons. The mascot is an original yellow cartoon character — deliberately
*not* a copy of any existing cartoon family — so the template ships clean of third-party
rights.

## Notes for handoff

- The menu section is hand-authored HTML. If the client updates often, that block is the
  one to move behind a CMS.
- `.map` uses a Google Maps embed; no API key needed.
- Fonts load from Google Fonts. Self-host them if the client wants zero third-party calls.
- Respects `prefers-reduced-motion`: the tickers, the bobbing mascot, the spinning badge and
  the scroll reveals all stop.
