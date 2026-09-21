/* ==========================================================================
   Motion engine

   Rebuilt from the reference's measured configuration. Families:

     data-parallax="speed:3; range:0,53; dir:-1; on:desktop,tablet"
         Scroll-linked translateY, reproducing Elementor motion-fx:
             p = clamp01((scrollY + vh - docTop) / (vh + height))
             q = clamp01((p - from) / (to - from))
             y = dir * (q - 0.5) * speed * 0.10 * vh
         Paired with a 1s cubic-bezier(0,.33,.07,1.03) transition on the
         element (see style.css). That damped, slightly overshooting follow
         is the signature feel — a rigid 1:1 lock looks wrong.

     data-play="stagger:90"
         Plays ONCE when the element first arrives in the viewport, walking a
         delay across its children. The reference's big lettering is Lottie
         with trigger "arriving_to_viewport", which is play-on-entry — NOT a
         scroll scrub. One observer, unobserved per element after it fires.

     data-scrub="range:0,100"
         True scroll-scrubbed progress published as --p (0 -> 1). A capability
         of this engine; the reference itself never scrubs.

     data-reveal="up|down|right|left"  data-delay="300"
         One-shot entrance transition.

   Performance contract: geometry is cached at init, on resize and through a
   ResizeObserver. The scroll loop reads ONLY scrollY and does arithmetic; it
   never calls getBoundingClientRect(), because a rect read after a style
   write forces synchronous layout and is the usual cause of janky parallax.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mqDesktop = matchMedia('(min-width: 1025px)');
  const mqTablet = matchMedia('(min-width: 768px) and (max-width: 1024px)');

  const MFX_TRAVEL_K = 0.10;   // parallax amplitude calibration

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

  const parse = (str) => {
    const out = {};
    (str || '').split(';').forEach((pair) => {
      const i = pair.indexOf(':');
      if (i > -1) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    });
    return out;
  };

  const deviceOk = (list) => {
    if (!list) return true;
    const want = list.split(',').map((s) => s.trim());
    if (mqDesktop.matches) return want.includes('desktop');
    if (mqTablet.matches) return want.includes('tablet');
    return want.includes('mobile');
  };

  /* ---------------------------------------------------------------- registry */
  const items = [];
  const active = new Set();
  let vh = innerHeight;
  let rafId = 0;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const item = e.target.__motion;
        if (!item) return;
        if (e.isIntersecting) {
          active.add(item);
          item.el.style.willChange = 'transform';
        } else {
          active.delete(item);
          item.el.style.willChange = '';
          item.settle();
        }
      });
      request();
    },
    { rootMargin: '25% 0px 25% 0px', threshold: 0 }
  );

  function measure(item) {
    const r = item.el.getBoundingClientRect();
    item.docTop = r.top + scrollY;
    item.height = r.height;
  }

  const ro = 'ResizeObserver' in window
    ? new ResizeObserver((entries) => {
        entries.forEach((e) => { if (e.target.__motion) measure(e.target.__motion); });
        request();
      })
    : null;

  function register(el, kind) {
    const item = { el, kind, out: null, docTop: 0, height: 0, settle() {} };
    el.__motion = item;
    items.push(item);
    measure(item);
    io.observe(el);
    if (ro) ro.observe(el);
    return item;
  }

  function progress(item) {
    return clamp((scrollY + vh - item.docTop) / (vh + item.height));
  }

  /* ------------------------------------------------------------- parallax fx */
  function initParallax() {
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const c = parse(el.dataset.parallax);
      const speed = parseFloat(c.speed || '4');
      const dir = parseFloat(c.dir || '1');
      const [rs, re] = (c.range || '0,100').split(',').map(Number);
      const from = rs / 100, to = re / 100;
      const on = c.on;

      const item = register(el, 'parallax');
      item.settle = () => {
        if (item.out !== null) { el.style.transform = ''; item.out = null; }
      };
      item.run = () => {
        if (!deviceOk(on)) return item.settle();
        const q = clamp((progress(item) - from) / Math.max(1e-4, to - from));
        const y = dir * (q - 0.5) * speed * MFX_TRAVEL_K * vh;
        if (item.out === null || Math.abs(item.out - y) > 0.12) {
          item.out = y;
          el.style.transform = 'translate3d(0, ' + y.toFixed(2) + 'px, 0)';
        }
      };
    });
  }

  /* ---------------------------------------------------------------- scrub fx */
  function initScrub() {
    document.querySelectorAll('[data-scrub]').forEach((el) => {
      const c = parse(el.dataset.scrub);
      const [rs, re] = (c.range || '0,100').split(',').map(Number);
      const from = rs / 100, to = re / 100;
      const on = c.on;

      const item = register(el, 'scrub');
      el.style.setProperty('--p', '0');   // take over from the fail-visible default
      item.settle = () => { item.out = null; };
      item.run = () => {
        if (!deviceOk(on)) { el.style.setProperty('--p', '1'); return; }
        const q = clamp((progress(item) - from) / Math.max(1e-4, to - from));
        if (item.out === null || Math.abs(item.out - q) > 0.004) {
          item.out = q;
          el.style.setProperty('--p', q.toFixed(4));
        }
      };
    });
  }

  /* ------------------------------------------------------------- the rAF loop
     Self-sustaining while anything is on screen, parked when nothing is.
     Deliberately NOT gated behind a "ticking" boolean: one dropped frame
     would leave such a flag true forever and silently kill every effect. */
  function frame() {
    rafId = 0;
    if (!active.size) return;
    active.forEach((item) => {
      try { item.run(); } catch (_) { /* one bad item must not stop the rest */ }
    });
    rafId = requestAnimationFrame(frame);
  }
  function request() { if (!rafId) rafId = requestAnimationFrame(frame); }

  /* ------------------------------------------------ play-once-on-entry blocks */
  function initPlay() {
    const blocks = document.querySelectorAll('[data-play]');
    if (!blocks.length) return;
    if (reduced.matches) {
      blocks.forEach((b) => b.classList.add('has-played'));
      return;
    }
    const po = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const step = Number(parse(el.dataset.play).stagger || 90);
          el.querySelectorAll('.word').forEach((child, i) => {
            child.style.animationDelay = (i * step) + 'ms';
          });
          el.classList.add('has-played');
          po.unobserve(el);
        });
      },
      { threshold: 0.12 }
    );
    blocks.forEach((b) => po.observe(b));
  }

  /* ------------------------------------------------------------ entrance fx */
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (reduced.matches) { els.forEach((el) => el.classList.add('is-in')); return; }
    const o = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = (e.target.dataset.delay || 0) + 'ms';
          e.target.classList.add('is-in');
          o.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );
    els.forEach((el) => o.observe(el));
  }

  /* --------------------------------------------------------- sticky header */
  function initHeader() {
    const header = document.querySelector('[data-header]');
    if (!header) return;
    let stuck = false;
    const test = () => {
      const now = scrollY > 20;
      if (now !== stuck) { stuck = now; header.classList.toggle('is-stuck', stuck); }
    };
    addEventListener('scroll', test, { passive: true });
    test();
  }

  /* -------------------------------------------------------- rotating words
     Reference timing: 1000ms hold, 600ms slide in, 600ms slide out. */
  function initRotator() {
    document.querySelectorAll('[data-rotate]').forEach((el) => {
      const words = el.querySelectorAll('[data-word]');
      if (words.length < 2) return;
      words[0].classList.add('is-on');
      if (reduced.matches) return;
      let i = 0;
      setInterval(() => {
        const prev = words[i];
        prev.classList.remove('is-on');
        prev.classList.add('is-out');
        setTimeout(() => prev.classList.remove('is-out'), 600);
        i = (i + 1) % words.length;
        words[i].classList.add('is-on');
      }, Number(el.dataset.rotate) || 1000);
    });
  }

  /* --------------------------------------------------------- nav + drawer */
  function initNav() {
    const burger = document.querySelector('[data-burger]');
    const drawer = document.querySelector('[data-drawer]');
    if (!burger || !drawer) return;
    const set = (open) => {
      burger.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => set(!drawer.classList.contains('is-open')));
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
  }

  function remeasure() {
    vh = innerHeight;
    items.forEach(measure);
    request();
  }

  window.__motion = { items, active, request, frame, remeasure };

  /* ------------------------------------------------------------------ boot */
  function boot() {
    initHeader();
    initNav();
    initReveal();
    initRotator();
    initPlay();

    if (reduced.matches) {
      document.querySelectorAll('[data-scrub]').forEach((el) => el.style.setProperty('--p', '1'));
      root.classList.add('is-static');
      return;
    }

    initParallax();
    initScrub();

    // compute once so anything already on screen (or deep-linked to via an
    // #anchor) is correct before the visitor touches the wheel
    items.forEach((item) => { try { item.run(); } catch (_) {} });
    request();

    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', remeasure, { passive: true });
    addEventListener('load', remeasure);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
