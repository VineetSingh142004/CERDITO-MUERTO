/* Cerdito Muerto — small progressive-enhancement layer. */
(() => {
  'use strict';

  /* ---- sticky header state ---- */
  const header = document.getElementById('site-header');
  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- mobile drawer ---- */
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const setDrawer = (open) => {
    burger.classList.toggle('is-open', open);
    drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });

  /* ---- scroll reveal ---- */
  const items = document.querySelectorAll('.reveal');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = `${Math.min(i * 70, 280)}ms`;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-in'));
  }

  /* ---- highlight today's hours ---- */
  const today = new Date().getDay();
  const row = document.querySelector(`#hours [data-day="${today}"]`);
  if (row) row.classList.add('is-now');

  /* ---- year ---- */
  document.getElementById('yr').textContent = new Date().getFullYear();
})();
