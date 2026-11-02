(() => {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const isDesk = () => window.innerWidth >= 900;

  /* ---------- Intro curtain (once per visit) ---------- */
  const loader = $('.loader');
  const afterIntro = [];
  let introRunning = false;
  if (loader) {
    let seen = false;
    try { seen = sessionStorage.getItem('saraya-intro') === '1'; } catch (e) { /* storage blocked */ }
    if (RM || seen) {
      loader.remove();
    } else {
      introRunning = true;
      try { sessionStorage.setItem('saraya-intro', '1'); } catch (e) { /* storage blocked */ }
      setTimeout(() => {
        loader.classList.add('is-done');
        introRunning = false;
        afterIntro.splice(0).forEach((fn) => fn());
        setTimeout(() => loader.remove(), 1100);
      }, 1350);
    }
  }
  const whenIntroDone = (fn) => (introRunning ? afterIntro.push(fn) : fn());

  /* ---------- Smooth scrolling ---------- */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.13, wheelMultiplier: 1.15 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToY = (y) => (lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' }));

  /* ---------- Nav ---------- */
  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    if (open) nav.classList.add('is-solid');
    else window.dispatchEvent(new Event('scroll'));
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));

  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const t = id.length > 1 && document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    setMenu(false);
    scrollToY(t.getBoundingClientRect().top + window.scrollY - (t.id === 'top' ? 0 : 20));
  }));

  const links = $$('.nav__links a');
  const navIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) navIO.observe(s); });

  /* ---------- Hero: headline words rise, background rotates ---------- */
  const title = $('.hero__title');
  if (title) {
    let n = 0;
    const split = (node) => [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const o = document.createElement('span'); o.className = 'hw';
          const i = document.createElement('span'); i.style.setProperty('--i', n++); i.textContent = part;
          o.appendChild(i); frag.appendChild(o);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) split(c);
    });
    split(title);
    void title.offsetWidth;
    whenIntroDone(() => setTimeout(() => title.classList.add('is-in'), 80));
  }

  const bgs = $$('.hbg');
  const sectors = $$('.sector');
  let cur = 0;
  const showBg = (i) => {
    cur = (i + bgs.length) % bgs.length;
    bgs.forEach((b, j) => b.classList.toggle('is-active', j === cur));
    sectors.forEach((s, j) => { s.classList.toggle('is-active', j === cur); s.setAttribute('aria-selected', String(j === cur)); });
  };
  let heroTimer = null;
  const startHero = () => { if (!RM && !heroTimer) heroTimer = setInterval(() => { if (!document.hidden) showBg(cur + 1); }, 6500); };
  const stopHero = () => { clearInterval(heroTimer); heroTimer = null; };
  sectors.forEach((s, j) => s.addEventListener('click', () => { stopHero(); showBg(j); startHero(); }));
  new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? startHero() : stopHero()))).observe($('.hero'));

  /* ---------- Trusted: floating, draggable cards with mouse parallax ---------- */
  const field = $('.field');
  const cards = $$('.lc');
  const trusted = $('.trusted');
  let mx = 0, my = 0, scrollK = 0;
  const placeCards = () => {
    cards.forEach((c) => {
      const z = parseFloat(c.style.getPropertyValue('--z')) || 0.5;
      c.style.setProperty('--px', `${(mx * 36 * z).toFixed(1)}px`);
      c.style.setProperty('--py', `${(my * 28 * z + scrollK * 120 * z).toFixed(1)}px`);
    });
  };
  if (!RM && trusted) {
    if (FINE) trusted.addEventListener('pointermove', (e) => {
      const r = trusted.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      placeCards();
    });
    trusted.addEventListener('pointerleave', () => { mx = 0; my = 0; placeCards(); });
  }
  // Drag a card anywhere; it stays where you drop it
  cards.forEach((c) => {
    let start = null;
    c.addEventListener('pointerdown', (e) => {
      start = { x: e.clientX, y: e.clientY, dx: parseFloat(c.dataset.dx || 0), dy: parseFloat(c.dataset.dy || 0) };
      c.classList.add('is-drag');
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = start.dx + e.clientX - start.x;
      const dy = start.dy + e.clientY - start.y;
      c.dataset.dx = dx; c.dataset.dy = dy;
      c.style.setProperty('--dx', `${dx}px`);
      c.style.setProperty('--dy', `${dy}px`);
    });
    const end = () => { start = null; c.classList.remove('is-drag'); };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  });

  /* ---------- Solutions: scroll-driven tabs ---------- */
  const steps = $('.steps');
  const panels = $$('.panel');
  const words = $$('.word');
  const descs = $$('.desc');
  const bar = $('.progress span');
  let active = 0;
  const setStep = (i) => {
    if (i === active && panels[i].classList.contains('is-active')) return;
    active = i;
    panels.forEach((p, j) => { p.classList.toggle('is-active', j === i); if (j <= i) p.classList.add('is-seen'); });
    words.forEach((w, j) => { w.classList.toggle('is-active', j === i); w.setAttribute('aria-selected', String(j === i)); });
    descs.forEach((d, j) => d.classList.toggle('is-active', j === i));
    if (steps) steps.style.setProperty('--acc', panels[i].style.getPropertyValue('--acc'));
  };
  // Deck: each card holds, then lifts off the top of the stack.
  // Scroll units: card j lifts between j+HOLD and j+1; the last card stays.
  const HOLD = 0.15;
  const UNITS = () => panels.length - 1 + 0.4;
  const ease = (t) => t * t * (3 - 2 * t);
  const placeDeck = (seg) => {
    let lifted = 0;
    panels.forEach((_, j) => { if (j < panels.length - 1) lifted += ease(clamp((seg - j - HOLD) / (1 - HOLD))); });
    panels.forEach((el, j) => {
      const d = j - lifted;
      el.style.zIndex = String(panels.length - j);
      if (d >= 0) {
        // waiting in the stack: smaller, its colored top edge peeking out above
        const k = Math.min(d, 3);
        el.style.transform = `translate3d(0, ${k * -22}px, 0) scale(${1 - k * 0.06})`;
        el.style.opacity = String(d > 2 ? clamp(3 - d) : 1);
        el.style.visibility = d > 3 ? 'hidden' : '';
      } else {
        // being taken off the top: slides out diagonally to the upper left, staying solid
        const t = clamp(-d);
        el.style.transform = `translate3d(${t * -110}%, ${t * -45}%, 0) rotate(${t * -14}deg)`;
        el.style.opacity = String(clamp(1 - (t - 0.55) / 0.45));
        el.style.visibility = t >= 1 ? 'hidden' : '';
      }
    });
    return Math.min(panels.length - 1, Math.round(lifted));
  };
  // Phones: as the next card slides over, the one underneath shrinks and dims a little
  const stackMobile = () => panels.forEach((el, j) => {
    const next = panels[j + 1];
    const cover = next ? clamp((el.getBoundingClientRect().top + el.offsetHeight - next.getBoundingClientRect().top) / el.offsetHeight) : 0;
    el.style.transform = cover > 0 ? `scale(${(1 - cover * 0.07).toFixed(4)})` : '';
    el.style.setProperty('--dim', (cover * 0.28).toFixed(3));
  });
  const clearDeck = () => panels.forEach((el) => { el.style.transform = el.style.opacity = el.style.zIndex = el.style.visibility = ''; });
  const updSteps = () => {
    if (!steps) return;
    if (!isDesk()) { clearDeck(); stackMobile(); panels.forEach((p) => p.classList.add('is-seen')); return; }
    const dist = steps.offsetHeight - window.innerHeight;
    const p = clamp(-steps.getBoundingClientRect().top / (dist || 1));
    if (bar) bar.style.transform = `scaleX(${p})`;
    deckTarget = p * UNITS();
    if (deckCur === null) deckCur = deckTarget;
    if (!deckRaf) deckRaf = requestAnimationFrame(tickDeck);
  };
  // The deck eases toward the scroll position, so the cards glide instead of stepping
  let deckTarget = 0, deckCur = null, deckRaf = 0;
  const tickDeck = () => {
    deckCur += (deckTarget - deckCur) * (RM ? 1 : 0.09);
    if (Math.abs(deckTarget - deckCur) < 0.0008) deckCur = deckTarget;
    setStep(placeDeck(deckCur));
    deckRaf = deckCur === deckTarget ? 0 : requestAnimationFrame(tickDeck);
  };
  words.forEach((w, j) => w.addEventListener('click', () => {
    const dist = steps.offsetHeight - window.innerHeight;
    const top = steps.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + dist * Math.min(1, (j + 0.15) / UNITS()));
  }));

  /* ---------- Parallax photos ---------- */
  const para = $$('[data-parallax]');
  const updPara = () => {
    if (RM) return;
    const vh = window.innerHeight;
    para.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      img.style.transform = `translate3d(0, ${((r.top + r.height / 2 - vh / 2) * -0.12).toFixed(1)}px, 0)${img.closest('.final') ? ' scale(1.1)' : ''}`;
    });
  };

  /* ---------- Single scroll loop ---------- */
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const heroEl = $('.hero');
      nav.classList.toggle('is-solid', y > (heroEl ? 120 : 40) || !menu.hidden);
      // Header hides as soon as you scroll down, and only returns when you scroll back up
      if (menu.hidden && y > lastY + 2 && y > 80) nav.classList.add('is-hidden');
      if (y < lastY - 2 || y <= 80) nav.classList.remove('is-hidden');
      lastY = y;
      if (trusted && !RM) {
        const r = trusted.getBoundingClientRect();
        scrollK = clamp((window.innerHeight / 2 - (r.top + r.height / 2)) / window.innerHeight, -1, 1);
        placeCards();
      }
      updSteps();
      updPara();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* =========================================================
     Interaction layer
     ========================================================= */
  const splitWords = (node, cls, counter) => [...node.childNodes].forEach((c) => {
    if (c.nodeType === 3) {
      const frag = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        if (cls === 'hw') {
          const o = document.createElement('span'); o.className = 'hw';
          const i = document.createElement('span'); i.style.setProperty('--i', counter.n++); i.textContent = part;
          o.appendChild(i); frag.appendChild(o);
        } else {
          const w = document.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w);
        }
      });
      c.replaceWith(frag);
    } else if (c.nodeType === 1) splitWords(c, cls, counter);
  });

  /* Section labels: a small braille spinner before the text */
  const SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
  const spins = $$('.eyebrow').map((e) => {
    const sp = document.createElement('span');
    sp.className = 'eyebrow__spin'; sp.setAttribute('aria-hidden', 'true'); sp.textContent = SPIN[0];
    e.prepend(sp);
    return sp;
  });
  if (!RM && spins.length) {
    const live = new Set();
    const spinIO = new IntersectionObserver((es) => es.forEach((en) => (en.isIntersecting ? live.add(en.target) : live.delete(en.target))));
    spins.forEach((sp) => spinIO.observe(sp));
    let f = 0;
    setInterval(() => { f = (f + 1) % SPIN.length; live.forEach((sp) => { sp.textContent = SPIN[f]; }); }, 90);
  }

  /* Section headings rise word by word */
  const heads = $$('main section h2, .endcard section h2').filter((h) => !h.closest('.hero'));
  const headIO = new IntersectionObserver((es, obs) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
  }), { threshold: 0.4 });
  if (!RM) heads.forEach((h) => { splitWords(h, 'hw', { n: 0 }); h.classList.add('split'); headIO.observe(h); });

  /* Scroll-scrubbed quote */
  const scrubs = $$('[data-scrub]').map((el) => { splitWords(el, 'w'); return { el, words: $$('.w', el) }; });
  const updScrub = () => scrubs.forEach(({ el, words }) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = RM ? 1 : clamp((vh * 0.85 - r.top) / (vh * 0.45));
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < lit));
  });

  /* Reading progress bar */
  const sprog = document.createElement('div');
  sprog.className = 'sprog';
  sprog.innerHTML = '<span></span>';
  document.body.appendChild(sprog);
  const sprogBar = sprog.firstChild;

  /* Hero: shrink into a card on scroll, follow the mouse */
  const heroSec = $('.hero');
  if (heroSec && !RM && FINE) {
    heroSec.addEventListener('pointermove', (e) => {
      const r = heroSec.getBoundingClientRect();
      heroSec.style.setProperty('--mx', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
      heroSec.style.setProperty('--my', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
    });
    heroSec.addEventListener('pointerleave', () => { heroSec.style.setProperty('--mx', 0); heroSec.style.setProperty('--my', 0); });
  }

  /* Market ECG line */
  const ecgPath = $('.ecg path');
  const market = $('.market');
  let ecgLen = 0;
  if (ecgPath) {
    ecgLen = ecgPath.getTotalLength();
    ecgPath.style.strokeDasharray = ecgLen;
    ecgPath.style.strokeDashoffset = RM ? 0 : ecgLen;
  }

  const updLayer = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    sprogBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (heroSec && !RM) heroSec.style.setProperty('--hs', clamp(y / (heroSec.offsetHeight * 0.9)).toFixed(3));
    if (ecgPath && !RM) {
      const r = market.getBoundingClientRect();
      ecgPath.style.strokeDashoffset = (ecgLen * (1 - clamp((vh - r.top) / (vh * 0.9)))).toFixed(1);
    }
    updScrub();
  };
  window.addEventListener('scroll', () => requestAnimationFrame(updLayer), { passive: true });
  window.addEventListener('resize', updLayer);
  updLayer();

  /* Tilt + glare on cards */
  if (!RM && FINE) {
    $$('.sh, .vm__card, .person__img, .scard--stat, .about__media').forEach((el) => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
        el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* Custom cursor + photo preview for "What sets us apart" */
  if (!RM && FINE) {
    const cur = document.createElement('div');
    cur.className = 'cursor is-hidden';
    cur.innerHTML = '<span class="cursor__ring"><em></em></span><span class="cursor__dot"></span>';
    document.body.appendChild(cur);
    const ring = $('.cursor__ring', cur);
    const dot = $('.cursor__dot', cur);
    const label = $('em', cur);
    $$('.lc').forEach((el) => { el.dataset.cursor = 'Drag'; }); if (!isDesk()) $$('.track').forEach((el) => { el.dataset.cursor = 'Drag'; });

    const peek = document.createElement('div');
    peek.className = 'peek';
    peek.innerHTML = '<img alt="" />';
    document.body.appendChild(peek);
    const peekImg = peek.firstChild;
    $$('.edge[data-img], .kw[data-img]').forEach((e) => { const im = new Image(); im.src = e.dataset.img; }); // preload
    $$('[data-gallery]').forEach((g) => g.dataset.gallery.split('|').forEach((u) => { const im = new Image(); im.src = u; }));
    let activeGal = null;
    let galTimer = 0;

    let tx = -100, ty = -100, rx = -100, ry = -100, px = -100, py = -100;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      cur.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      const lab = t.closest('[data-cursor]');
      const link = t.closest('a, button, .val, .word, .sector, .qa__q, label');
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-link', !lab && !!link);
      label.textContent = lab ? lab.dataset.cursor : '';
      cur.classList.toggle('is-dark', !!t.closest('.hero, .final, .vm__card--dark, .vm__card--grad, .panel, .scard--quote, .sh:hover'));
      // Hovering a building photo cycles through a small gallery next to the cursor
      const gal = t.closest('[data-gallery]');
      if (gal) {
        if (activeGal !== gal) {
          activeGal = gal;
          const list = gal.dataset.gallery.split('|');
          let gi = 0;
          peekImg.src = list[0];
          clearInterval(galTimer);
          galTimer = setInterval(() => { gi = (gi + 1) % list.length; peekImg.src = list[gi]; }, 650);
        }
        peek.classList.add('on');
        return;
      }
      if (activeGal) { activeGal = null; clearInterval(galTimer); }
      const edge = t.closest('.edge[data-img], .kw[data-img]');
      if (edge) { peekImg.src = edge.dataset.img; peek.classList.add('on'); } else peek.classList.remove('on');
    });
    const loop = () => {
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
      px += (tx - px) * 0.12; py += (ty - py) * 0.12;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      peek.style.setProperty('--px', `${px + 124}px`);
      peek.style.setProperty('--py', `${py}px`);
      peek.style.setProperty('--pr', `${((tx - px) * 0.05).toFixed(2)}deg`);
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* Kinetic type: direction and speed follow the scroll */
  const kt = $('.kinetic__track');
  if (kt && !RM) {
    kt.innerHTML += kt.innerHTML;
    let x = 0, vel = 0, dir = 1, lastS = window.scrollY, running = false;
    const run = () => {
      if (!running) return;
      const s = window.scrollY;
      const d = s - lastS; lastS = s;
      if (Math.abs(d) > 0.5) dir = d > 0 ? 1 : -1;
      vel += (Math.min(Math.abs(d), 80) * 0.12 - vel) * 0.08;
      x -= dir * (0.7 + vel);
      const w = kt.scrollWidth / 2;
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      kt.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(-dir * vel * 0.8).toFixed(2)}deg)`;
      requestAnimationFrame(run);
    };
    new IntersectionObserver((es) => es.forEach((e) => {
      running = e.isIntersecting;
      if (running) { lastS = window.scrollY; requestAnimationFrame(run); }
    })).observe(kt.parentElement);
  }

  /* ---------- Adaptive logo: white over dark areas, black over light ---------- */
  const brandEl = $('.nav > .brand');
  if (brandEl) {
    // Photo and video areas have no CSS background color, so mark them as dark
    $$('.hero, .final, .feature, .scard--photo, .person__img, .about__media, .lc').forEach((el) => {
      if (!el.dataset.tone) el.dataset.tone = el.classList.contains('lc') ? 'light' : 'dark';
    });
    const skip = (el) => el.closest('.nav, .cursor, .peek, .sprog, .loader, .mobile-menu');
    const toneOf = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        if (n.dataset && n.dataset.tone) return n.dataset.tone;
        const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const [r, g, b, a = 1] = m[1].split(',').map(Number);
          if (a > 0.5) return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55 ? 'dark' : 'light';
        }
      }
      return 'light';
    };
    let toneTick = false;
    const updTone = () => {
      toneTick = false;
      // Sample where the logo rests, even while the nav is sliding in or out
      const r = brandEl.getBoundingClientRect();
      const restY = parseFloat(getComputedStyle(nav).top) + brandEl.offsetTop + brandEl.offsetHeight / 2;
      const points = [[r.left + 14, restY], [r.left + r.width * 0.6, restY]];
      // Dark wins if either sample point sits on a dark surface
      const dark = points.some(([x, y]) => {
        const under = document.elementsFromPoint(x, y).find((e) => !skip(e));
        return under ? toneOf(under) === 'dark' : false;
      });
      nav.classList.toggle('on-dark', dark);
    };
    const queueTone = () => { if (!toneTick) { toneTick = true; requestAnimationFrame(updTone); } };
    window.addEventListener('scroll', queueTone, { passive: true });
    window.addEventListener('resize', queueTone);
    window.addEventListener('load', queueTone);
    updTone();
  }

  /* ---------- Hero video: pause off-screen, toggle button, reduced motion ---------- */
  const vid = $('.hero__video');
  if (vid) {
    // No pause button: just stop the video when the hero is off-screen
    if (RM) vid.pause();
    new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) vid.pause();
      else if (!RM) vid.play().catch(() => {});
    })).observe(vid.closest('.hero'));
  }

  /* ---------- Hero ticker: types out recent results ---------- */
  const ticker = $('.ticker');
  if (ticker) {
    const txt = $('.ticker__txt', ticker);
    const ic = $('.ticker__ic', ticker);
    const svg = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
    // Each line gets an icon that matches what it says
    const items = [
      ['Outpatient waiting time down 32% in Surabaya', svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')],
      ['Patient satisfaction up 18 points', svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9.2 9.6h.01M14.8 9.6h.01"/>')],
      ['Clinic network grown from 3 to 9', svg('<path d="M4 20V9.5L12 4l8 5.5V20M9 20v-5h6v5M12 8v3.6M10.2 9.8h3.6"/>')],
      ['New medical director placed in Makassar', svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.8 3.8-5.5 7-5.5s6 1.7 7 5.5"/>')],
      ['240 nurses trained in a new care model', svg('<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>')],
    ];
    const lines = items.map((x) => x[0]);
    const setIcon = (i) => { ic.innerHTML = items[i][1]; };
    setIcon(0);
    if (!RM) {
      let li = 0;
      // type -> hold -> delete letter by letter -> next line
      const type = (str, i = 0) => {
        txt.textContent = str.slice(0, i);
        if (i < str.length) setTimeout(() => type(str, i + 1), 32 + Math.random() * 28);
        else setTimeout(() => erase(str, str.length), 2400);
      };
      const erase = (str, i) => {
        txt.textContent = str.slice(0, i);
        if (i > 0) setTimeout(() => erase(str, i - 1), 14);
        else setTimeout(next, 260);
      };
      const next = () => {
        li = (li + 1) % lines.length;
        setIcon(li);
        type(lines[li]);
      };
      whenIntroDone(() => setTimeout(() => type(lines[0]), 900));
      txt.textContent = '';
    }
  }

  /* ---------- Who we are: keywords open a photo card ---------- */
  const story = $('.about__story');
  const wcard = $('.wordcard');
  if (story && wcard) {
    const wImg = $('img', wcard);
    const wTxt = $('p', wcard);
    const kws = $$('.kw', story);
    kws.forEach((k) => { const im = new Image(); im.src = k.dataset.img; }); // preload
    const show = (k) => {
      kws.forEach((x) => x.classList.toggle('is-on', x === k));
      wImg.src = k.dataset.img;
      wTxt.textContent = k.dataset.text;
      const sr = story.getBoundingClientRect();
      const kr = k.getBoundingClientRect();
      const w = wcard.offsetWidth;
      let x = kr.left - sr.left;
      x = Math.max(0, Math.min(x, sr.width - w));
      wcard.style.setProperty('--wx', `${x}px`);
      wcard.style.setProperty('--wy', `${kr.bottom - sr.top + 10}px`);
      wcard.classList.add('on');
    };
    const hide = () => { kws.forEach((x) => x.classList.remove('is-on')); wcard.classList.remove('on'); };
    kws.forEach((k) => {
      k.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(k); });
      k.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
      k.addEventListener('focus', () => show(k));
      k.addEventListener('blur', hide);
      k.addEventListener('click', () => (k.classList.contains('is-on') ? hide() : show(k)));
    });
    window.addEventListener('scroll', () => { if (!wcard.matches(':hover')) hide(); }, { passive: true });
  }

  /* ---------- Stories carousel: arrows + drag ---------- */
  const track = $('.track');
  if (track) {
    const [prev, next] = $$('.stories__ctl .round');
    const hasArrows = Boolean(prev && next);
    const stepW = () => Math.min(420, track.clientWidth * 0.8);
    // Desktop: the section pins and vertical scroll moves the cards sideways (1px down = 1px across)
    const sec = $('.stories');
    let sDist = 0, sX = 0;
    const pinned = () => isDesk() && !RM;
    const sizeStories = () => {
      if (!pinned()) { sec.style.removeProperty('--stories-h'); track.style.transform = ''; return; }
      track.style.transform = '';
      sDist = Math.max(0, track.scrollWidth - track.clientWidth + 80);
      const pinEl = $('.stories__pin', sec); const pinH = pinEl ? pinEl.offsetHeight : window.innerHeight;
      sec.style.setProperty('--pin-h', `${pinH}px`);
      const padTop = parseFloat(getComputedStyle(sec).paddingTop) || 0;
      sec.style.setProperty('--stories-h', `${padTop + pinH + sDist}px`);
      moveStories();
    };
    const moveStories = () => {
      if (!pinned()) return;
      const pinEl = $('.stories__pin', sec); const stickTop = pinEl ? parseFloat(getComputedStyle(pinEl).top) || 0 : 0;
      const padTop = parseFloat(getComputedStyle(sec).paddingTop) || 0;
      sX = clamp(stickTop - (sec.getBoundingClientRect().top + padTop), 0, sDist);
      track.style.transform = `translate3d(${-sX}px,0,0)`;
      updArrows();
    };
    const updArrows = () => {
      if (!hasArrows) return;
      if (pinned()) { prev.disabled = sX < 8; next.disabled = sX > sDist - 8; return; }
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
    };
    if (hasArrows) [prev, next].forEach((b) => b.addEventListener('click', () => {
      const dir = Number(b.dataset.dir);
      if (pinned()) { const top = sec.getBoundingClientRect().top + window.scrollY; scrollToY(top + clamp(sX + dir * stepW(), 0, sDist)); return; }
      track.scrollBy({ left: stepW() * dir, behavior: RM ? 'auto' : 'smooth' });
    }));
    window.addEventListener('scroll', moveStories, { passive: true });
    window.addEventListener('resize', sizeStories);
    window.addEventListener('load', sizeStories);
    sizeStories();
    track.addEventListener('scroll', updArrows, { passive: true });
    updArrows();
    let drag = null;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && !pinned()) drag = { x: e.clientX, left: track.scrollLeft, moved: false }; });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; track.classList.add('is-drag'); }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => { if (drag && drag.moved) track.classList.remove('is-drag'); drag = null; });
    track.addEventListener('keydown', (e) => { if (!hasArrows) return; if (e.key === 'ArrowRight') next.click(); if (e.key === 'ArrowLeft') prev.click(); });
  }

  /* Footer line labels: each one types a short tagline, holds, erases, then the next */
  const tagEls = $$('.foot__lines i[data-lines]');
  if (tagEls.length && !RM) {
    const run = (el, delay) => {
      const lines = el.dataset.lines.split('|');
      let li = 0, ci = lines[0].length, del = true;
      const tick = () => {
        const t = lines[li];
        if (!del) {
          ci++; el.textContent = t.slice(0, ci);
          if (ci >= t.length) { del = true; return setTimeout(tick, 2600); }
          return setTimeout(tick, 55 + Math.random() * 45);
        }
        ci--; el.textContent = t.slice(0, Math.max(ci, 0));
        if (ci <= 0) { del = false; li = (li + 1) % lines.length; return setTimeout(tick, 300); }
        setTimeout(tick, 24);
      };
      setTimeout(tick, delay);
    };
    let started = false;
    new IntersectionObserver((es, obs) => {
      if (!es[0].isIntersecting || started) return;
      started = true; obs.disconnect();
      tagEls.forEach((el, i) => run(el, 1400 + i * 900));
    }).observe(tagEls[0].closest('.foot__lines'));
  }

  /* Why Saraya cards: spotlight follows the cursor, gentle tilt; on touch screens the art plays when a card is in view */
  const whyCards = $$('.why__card');
  if (whyCards.length) {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    whyCards.forEach((c) => {
      if (fine && !RM) {
        c.addEventListener('pointermove', (e) => {
          const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          c.classList.add('is-tilting');
          c.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); c.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
          c.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`); c.style.setProperty('--rx', `${((0.5 - y) * 8).toFixed(2)}deg`);
          c.style.setProperty('--glow', '1');
        });
        c.addEventListener('pointerleave', () => { c.classList.remove('is-tilting'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); c.style.setProperty('--glow', '0'); });
      }
    });
    if (!fine) {
      const liveIO = new IntersectionObserver((es) => es.forEach((en) => en.target.classList.toggle('is-live', en.isIntersecting)), { threshold: 0.6 });
      whyCards.forEach((c) => liveIO.observe(c));
    }
  }

  /* Why Saraya demos: tiles light up one at a time; the chat plays out while the column is on screen */
  const tilesEl = $('.wy__tiles');
  const chatEl = $('.wy__chat');
  if (tilesEl && !RM) {
    const tl = $$('li', tilesEl); let ti = 0, tTimer = 0;
    const step = () => { tl.forEach((t, j) => t.classList.toggle('is-on', j === ti)); ti = (ti + 1) % tl.length; };
    new IntersectionObserver((es) => es.forEach((e) => { clearInterval(tTimer); if (e.isIntersecting) { step(); tTimer = setInterval(step, 1400); } })).observe(tilesEl);
  }
  if (chatEl) {
    const [bIn, bTyp, bOut] = $$('.bub', chatEl);
    if (RM) { [bIn, bOut].forEach((b) => b.classList.add('is-on')); }
    else {
      let timers = [];
      const clear = () => { timers.forEach(clearTimeout); timers = []; };
      const play = () => {
        clear();
        timers.push(setTimeout(() => bIn.classList.add('is-on'), 300));
        timers.push(setTimeout(() => bTyp.classList.add('is-on'), 1500));
        timers.push(setTimeout(() => { bTyp.classList.remove('is-on'); bOut.classList.add('is-on'); }, 3300));
        // fade everything out together, then start over
        timers.push(setTimeout(() => [bIn, bTyp, bOut].forEach((b) => b.classList.remove('is-on')), 8600));
        timers.push(setTimeout(play, 9600));
      };
      new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) play(); else clear(); }), { threshold: 0.4 }).observe(chatEl);
    }
  }

  /* End card: sides pull in and corners round as its bottom edge rises into view */
  const endcard = $('.endcard');
  const updEnd = () => {
    if (!endcard) return;
    const b = endcard.getBoundingClientRect().bottom, vh = window.innerHeight;
    const p = RM ? 1 : clamp((vh * 1.15 - b) / (vh * 0.8));
    endcard.style.setProperty('--inset', `${(p * (isDesk() ? 32 : 12)).toFixed(1)}px`);
  };
  window.addEventListener('scroll', updEnd, { passive: true });
  window.addEventListener('resize', updEnd);
  updEnd();

  /* Why Saraya cards: tap flips them on touch screens */
  // One-time peek: the cards tilt open slightly, one after another, the first time they appear
  const edgeCards = $$('.apart .edge');
  if (edgeCards.length && !RM) {
    const peekIO = new IntersectionObserver((es, obs) => {
      if (!es.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      const c = edgeCards[0];
      c.style.setProperty('--pd', '0.6s');
      c.classList.add('is-peek');
      c.addEventListener('animationend', () => c.classList.remove('is-peek'), { once: true });
    }, { threshold: 0.6 });
    peekIO.observe(edgeCards[0]);
  }
  $$('.apart .edge').forEach((c) => c.addEventListener('click', () => { if (!window.matchMedia('(hover: hover)').matches) c.classList.toggle('is-flipped'); }));

  /* ---------- Value we deliver: expanding panels ---------- */
  const vals = $$('.val');
  const setVal = (v) => vals.forEach((x) => x.classList.toggle('is-active', x === v));
  vals.forEach((v) => {
    v.addEventListener('pointerenter', () => setVal(v));
    v.addEventListener('focus', () => setVal(v));
    v.addEventListener('click', () => setVal(v));
  });

  /* ---------- How we work: line fills and steps light up on scroll ---------- */
  const flow = $('.flow');
  const flowSteps = $$('.flow__step');
  const updFlow = () => {
    if (!flow) return;
    const r = flow.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = RM ? 1 : clamp((vh * 0.8 - r.top) / (r.height + vh * 0.25));
    flow.style.setProperty('--p', p.toFixed(3));
    flowSteps.forEach((s, i) => s.classList.toggle('is-on', p >= i / flowSteps.length + 0.05 || p >= 0.98));
  };
  window.addEventListener('scroll', updFlow, { passive: true });
  updFlow();

  /* ---------- How we work: each big word fills with ink as its row rises through the screen ---------- */
  const pwRows = $$('.pw__row');
  const updPw = () => {
    if (!pwRows.length || RM) return;
    const vh = window.innerHeight;
    pwRows.forEach((row) => {
      const r = row.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      row.style.setProperty('--f', clamp((vh * 0.88 - r.top) / (vh * 0.42)).toFixed(3));
    });
  };
  window.addEventListener('scroll', updPw, { passive: true });
  window.addEventListener('resize', updPw);
  updPw();

  /* ---------- How we work cycle: ring fills, dot travels, active stage follows the scroll ---------- */
  const cyc = $('.cyc');
  const cycSteps = $$('.cyc__step');
  const cycNodes = $$('.cyc__node');
  const cycImgs = $$('.cyc__img');
  let cycActive = -1;
  const updCyc = () => {
    if (!cyc || !isDesk()) return;
    const list = $('.cyc__steps').getBoundingClientRect();
    const mid = window.innerHeight / 2;
    const first = cycSteps[0].getBoundingClientRect(), last = cycSteps[cycSteps.length - 1].getBoundingClientRect();
    const start = first.top + first.height / 2, end = last.top + last.height / 2;
    const p = clamp((mid - start) / ((end - start) || 1));
    const turn = clamp(p * 0.75 + (mid > end ? clamp((mid - end) / (window.innerHeight * 0.3)) * 0.25 : 0));
    cyc.style.setProperty('--p', turn.toFixed(4));
    cyc.style.setProperty('--deg', `${(turn * 360).toFixed(2)}deg`);
    const i = Math.min(cycSteps.length - 1, Math.round(p * (cycSteps.length - 1)));
    if (i === cycActive || list.bottom < 0) return;
    cycActive = i;
    cycSteps.forEach((el, j) => el.classList.toggle('is-on', j === i));
    cycNodes.forEach((el, j) => { el.classList.toggle('is-on', j === i); el.classList.toggle('is-done', j < i); });
    cycImgs.forEach((el, j) => el.classList.toggle('is-on', j === i));
  };
  window.addEventListener('scroll', updCyc, { passive: true });
  window.addEventListener('resize', updCyc);
  updCyc();

  /* ---------- Market numbers count up ---------- */
  const countIO = new IntersectionObserver((es, obs) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = Number(el.dataset.count);
    obs.unobserve(el);
    if (RM) { el.textContent = target; return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min((now - t0) / 1600, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- FAQ ---------- */
  $$('.qa').forEach((qa) => {
    const btn = $('.qa__q', qa);
    btn.addEventListener('click', () => {
      const open = !qa.classList.contains('is-open');
      qa.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Magnetic buttons ---------- */
  if (!RM && FINE) {
    $$('.pbtn, .round').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((es, obs) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.transitionDelay = `${Math.min(Math.max(0, sibs.indexOf(el)), 5) * 80}ms`;
    el.classList.add('is-in');
    obs.unobserve(el);
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------- Consultation sheet + form ---------- */
  const sheet = $('#consult');
  const openSheet = () => {
    setMenu(false);
    if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
    if (lenis) lenis.stop();
    setTimeout(() => $('input[name="name"]', sheet).focus(), 120);
  };
  const closeSheet = () => { sheet.close ? sheet.close() : sheet.removeAttribute('open'); };
  sheet.addEventListener('close', () => { if (lenis) lenis.start(); });
  $$('[data-open-form]').forEach((b) => b.addEventListener('click', openSheet));
  $$('[data-close-form]').forEach((b) => b.addEventListener('click', closeSheet));
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  const form = $('#contact-form');
  const note = $('.form__note', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach((f) => {
      const valid = f.value.trim() !== '' && f.checkValidity();
      f.classList.toggle('is-invalid', !valid);
      if (!valid) ok = false;
    });
    if (!ok) { note.textContent = 'Please add your name, a valid email and a short message.'; return; }
    const d = Object.fromEntries(new FormData(form));
    const subject = `${d.topic} enquiry — ${d.org || d.name}`;
    const body = `Name: ${d.name}\nOrganization: ${d.org || '-'}\nEmail: ${d.email}\nInterest: ${d.topic}\n\n${d.message}`;
    window.location.href = `mailto:hello@sarayapartners.example?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = 'Thank you — your email app should open now.';
  });
  form.addEventListener('input', (e) => e.target.classList.remove('is-invalid'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
})();
