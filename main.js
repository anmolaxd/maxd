// MAXD site: hero renewal timeline, lifecycle track, tabs, scroll reveal. No dependencies.
(() => {
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;

  /* ---------- hero: a plan counts down, reminders fire, it renews ---------- */
  const card = document.querySelector('.timeline-card');
  if (card) {
    const items = [...card.querySelectorAll('.tc-events li')];
    const days = document.getElementById('tcDays');
    const fill = document.getElementById('tcFill');
    const show = (n) => {
      items.forEach((li, k) => li.classList.toggle('on', k <= n));
      const d = +items[n].dataset.d;
      days.textContent = d;
      fill.style.width = ((30 - d) / 30) * 100 + '%';
      card.classList.toggle('done', n === items.length - 1);
    };
    if (!motion) { show(items.length - 1); }
    else {
      let n = 0; show(0);
      setInterval(() => { n = (n + 1) % (items.length + 2); show(Math.min(n, items.length - 1)); }, 1400);
    }
  }

  /* ---------- tabs (WAI-ARIA pattern: arrows move between tabs) ---------- */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (t) => {
    tabs.forEach((b) => {
      const on = b === t;
      b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
      const p = document.getElementById(b.getAttribute('aria-controls'));
      p.hidden = !on; p.classList.toggle('enter', on && motion);
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      const next = tabs[(i + k + tabs.length) % tabs.length];
      select(next); next.focus(); e.preventDefault();
    });
  });

  /* ---------- lifecycle track + reveal on scroll ---------- */
  const track = document.getElementById('track');
  if (!motion) { track && track.classList.add('in'); return; }
  document.documentElement.classList.add('js-motion');
  const els = document.querySelectorAll('.sec-head > *, .stage-col, .log-row, .rule-list li, .qa details, .final > *');
  els.forEach((el) => el.classList.add('rv'));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  els.forEach((el, i) => { el.style.transitionDelay = (i % 5) * 70 + 'ms'; io.observe(el); });
  if (track) io.observe(track);
})();
