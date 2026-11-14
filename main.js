// MAXD site: hero renewal timeline, lifecycle track, tabs, demos, running words, heading rises, scroll reveal. No dependencies.
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
    if (motion) run(t);
  };

  /* ---------- service demos: each mock plays like a short screen recording ---------- */
  const timers = new Map();
  const play = (mock) => {
    (timers.get(mock) || []).forEach(clearTimeout);
    const t = []; const at = (ms, fn) => t.push(setTimeout(fn, ms));
    timers.set(mock, t);
    mock.classList.remove('run'); void mock.offsetWidth; mock.classList.add('run');
    mock.querySelectorAll('[data-at]').forEach((el) => {
      el.classList.remove('shown', 'typing');
      if (el.dataset.typing) at(+el.dataset.typing, () => el.classList.add('typing'));
      at(+el.dataset.at, () => { el.classList.remove('typing'); el.classList.add('shown'); });
    });
    mock.querySelectorAll('[data-tap]').forEach((el) => { el.classList.remove('tap'); at(+el.dataset.tap, () => el.classList.add('tap')); });
    mock.querySelectorAll('[data-type]').forEach((el) => {
      el.dataset.ph ??= el.textContent; el.textContent = el.dataset.ph; el.classList.remove('typed');
      [...el.dataset.type].forEach((c, k) => at(+el.dataset.typeAt + k * 70, () => { el.textContent = el.dataset.type.slice(0, k + 1); el.classList.add('typed'); }));
    });
    mock.querySelectorAll('[data-count]').forEach((el) => {
      const n = +el.dataset.count;
      for (let k = 0; k <= n; k++) at(200 + (k / n) * 900, () => (el.textContent = k));
    });
  };
  // Tabs step through the demos on their own until the visitor picks one.
  // The 3D bar beside the heading carries one plate per service up to the open tab (bar3d.js reads loadProgress).
  const kitBar = document.querySelector('.kit-bar canvas');
  if (kitBar) kitBar.loadProgress = motion ? 0 : 1;
  let auto = true, inView = false, next;
  const run = (tab) => {
    const mock = document.getElementById(tab.getAttribute('aria-controls')).querySelector('.mock');
    play(mock);
    if (kitBar) kitBar.loadProgress = (tabs.indexOf(tab) + 1) / tabs.length;
    clearTimeout(next);
    tabs.forEach((b) => b.classList.remove('prog'));
    if (!auto) return;
    const dur = +mock.dataset.dur + 2500;
    tab.style.setProperty('--dur', dur + 'ms'); void tab.offsetWidth; tab.classList.add('prog');
    next = setTimeout(() => { if (inView) select(tabs[(tabs.indexOf(tab) + 1) % tabs.length]); }, dur);
  };
  if (motion && tabs.length) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting === inView) return;
      inView = e.isIntersecting;
      if (inView) run(tabs.find((b) => b.getAttribute('aria-selected') === 'true'));
      else { clearTimeout(next); tabs.forEach((b) => b.classList.remove('prog')); }
    }, { threshold: .3 }).observe(tabs[0].closest('section'));
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { auto = false; select(t); });
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      const next = tabs[(i + k + tabs.length) % tabs.length];
      auto = false; select(next); next.focus(); e.preventDefault();
    });
  });

  // Load the 3D bar only when the services section is near; no WebGL or offline: the glow and tabs still work.
  if (kitBar && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      import('./bar3d.js').then((m) => m.default(kitBar, !motion)).catch(() => kitBar.remove());
    }, { rootMargin: '600px 0px' });
    io.observe(kitBar);
  }

  /* ---------- how we work: each term lights up as it reaches the middle of the screen ---------- */
  const terms = document.querySelectorAll('.rule-list li');
  if (!motion) terms.forEach((li) => li.classList.add('on'));
  else {
    const termIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('on'); termIO.unobserve(e.target); }
    }), { rootMargin: '0px 0px -42% 0px' });
    terms.forEach((li) => termIO.observe(li));
  }

  /* ---------- footer: glow drifts in with scroll ---------- */
  const fcard = document.querySelector('.fcard');
  if (fcard) {
    const glow = fcard.querySelector('.fc-glow');
    if (motion && glow) {
      let cur = 0, target = 0, running = false;
      const read = () => {
        const r = fcard.getBoundingClientRect();
        target = Math.min(1, Math.max(0, (innerHeight - r.top) / Math.min(r.height, innerHeight)));
      };
      const step = () => {
        cur += (target - cur) * 0.08;
        glow.style.transform = `translate(${(-22 * (1 - cur)).toFixed(2)}%, ${(16 * (1 - cur)).toFixed(2)}%) scale(${(0.85 + 0.15 * cur).toFixed(3)})`;
        glow.style.opacity = (0.55 + 0.45 * cur).toFixed(3);
        if (Math.abs(target - cur) > 0.001) requestAnimationFrame(step); else running = false;
      };
      const kick = () => { read(); if (!running) { running = true; requestAnimationFrame(step); } };
      addEventListener('scroll', kick, { passive: true }); kick();
    }
  }

  /* ---------- motion that only runs when the visitor allows it ---------- */
  if (motion) {
    // Wrap each word in a mask span; keeps inner elements (like .hl) intact.
    const splitWords = (el) => {
      const words = [];
      const walk = (node) => [...node.childNodes].forEach((c) => {
        if (c.nodeType === 1) return walk(c);
        if (c.nodeType !== 3) return;
        const frag = document.createDocumentFragment();
        c.nodeValue.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(part);
          const w = document.createElement('span'), inner = document.createElement('span');
          w.className = 'w'; inner.textContent = part; w.append(inner); frag.append(w); words.push(w);
        });
        c.replaceWith(frag);
      });
      walk(el);
      return words;
    };

    // Headings rise word by word as they come into view (the hero on load).
    const riseIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); riseIO.unobserve(e.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.display:not([data-fill]), .display-md:not([data-fill])').forEach((h) => {
      splitWords(h).forEach((w, i) => (w.firstChild.style.transitionDelay = i * 45 + 'ms'));
      h.classList.add('rise');
      if (h.closest('.hero')) requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('in')));
      else riseIO.observe(h);
    });

    // One statement lights up word by word with scroll position.
    document.querySelectorAll('[data-fill]').forEach((h) => {
      const words = splitWords(h); h.classList.add('fill');
      let queued = false;
      const update = () => {
        queued = false;
        const r = h.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * .9 - r.top) / (innerHeight * .5)));
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('lit', i < lit));
      };
      addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
      update();
    });

    // Running words: speed up with scroll speed, follow scroll direction.
    const marquees = [...document.querySelectorAll('[data-marquee]')].map((m) => {
      const track = m.querySelector('.mq-track'), set = track.firstElementChild;
      m.classList.add('mq-on');
      const q = { m, track, set, x: 0, w: 0, on: true, speed: +m.dataset.marquee, base: m.dataset.dir === '1' ? 1 : -1 };
      const fill = () => {
        q.w = set.offsetWidth;
        while (track.children.length < 2 || track.scrollWidth < innerWidth + q.w) {
          const c = set.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.append(c);
        }
      };
      fill(); addEventListener('resize', fill); addEventListener('load', fill);  // images change the width once loaded
      new IntersectionObserver(([e]) => (q.on = e.isIntersecting)).observe(m);
      return q;
    });
    if (marquees.length) {
      let boost = 0, dir = 1, lastY = scrollY, t0 = performance.now();
      addEventListener('scroll', () => {
        const dy = scrollY - lastY; lastY = scrollY;
        if (dy) dir = Math.sign(dy);
        boost = Math.min(boost + Math.abs(dy) * .03, 5);
      }, { passive: true });
      const tick = (t) => {
        const dt = Math.min((t - t0) / 1000, .05); t0 = t;
        boost *= Math.pow(.92, dt * 60);
        for (const q of marquees) {
          if (!q.on || !q.w) continue;
          q.x += q.base * dir * q.speed * (1 + boost) * dt;
          q.x = ((q.x % q.w) - q.w) % q.w;   // keep x in (-w, 0] so the loop is seamless
          q.track.style.transform = `translate3d(${q.x}px,0,0)`;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // Nav links: letters roll up on hover.
    document.querySelectorAll('.nav nav a').forEach((a) => {
      const text = a.textContent.trim(), roll = document.createElement('span');
      roll.className = 'roll'; roll.setAttribute('aria-hidden', 'true');
      [...text].forEach((ch, i) => {
        const s = document.createElement('span');
        s.textContent = ch === ' ' ? ' ' : ch; s.style.transitionDelay = i * 16 + 'ms'; roll.append(s);
      });
      a.setAttribute('aria-label', text); a.textContent = ''; a.append(roll);
    });
  }

  /* ---------- lifecycle track + reveal on scroll ---------- */
  const track = document.getElementById('track');
  if (!motion) { track && track.classList.add('in'); return; }
  document.documentElement.classList.add('js-motion');
  const els = document.querySelectorAll('.sec-head > :not(.display-md), .stage-col, .log-row, .rule-list li, .qa details, .final > :not(.display)');
  els.forEach((el) => el.classList.add('rv'));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  els.forEach((el, i) => { el.style.transitionDelay = (i % 5) * 70 + 'ms'; io.observe(el); });
  if (track) io.observe(track);
})();
