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

  /* ---------- Solutions: stacking cards ---------- */
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
    if (steps) steps.closest('section').style.setProperty('--acc', panels[i].style.getPropertyValue('--acc'));
  };
  // Stacking cards (What we do, Results). Desktop: the cards stick in the middle of the screen,
  // level with the left column; each next card rises from below tilted back (like the works
  // cards on restufiqih.com) and flattens as it lands. Phones: cards pile up, the one underneath dims.
  const TILT = 26, RISE = 430;
  const makeStack = (stage, cards) => {
    const stick = () => parseFloat(getComputedStyle(cards[0]).top) || 0;
    // Where card j sits before it sticks (sticky boxes report their stuck position, so add it up)
    const restTop = (j) => {
      const g = isDesk() ? parseFloat(getComputedStyle(stage).rowGap) || 0 : parseFloat(getComputedStyle(cards[0]).marginBottom) || 0;
      return cards.slice(0, j).reduce((a, el) => a + el.offsetHeight + g, 0);
    };
    const place = () => {
      if (!isDesk()) {
        cards.forEach((el, j) => {
          const next = cards[j + 1];
          const cover = next ? clamp((el.getBoundingClientRect().top + el.offsetHeight - next.getBoundingClientRect().top) / el.offsetHeight) : 0;
          el.style.transform = cover > 0 ? `scale(${(1 - cover * 0.07).toFixed(4)})` : '';
          el.style.setProperty('--dim', (cover * 0.28).toFixed(3));
        });
        return -1;
      }
      let cur = 0;
      const st = stick();
      // Work from layout positions, not the tilted boxes, so the last card lands flat
      const sr = stage.getBoundingClientRect();
      cards.forEach((el, j) => {
        el.style.setProperty('--dim', '0');
        const top = Math.min(Math.max(sr.top + restTop(j), st), sr.bottom - el.offsetHeight);
        const t = j === 0 ? 0 : clamp((top - st) / RISE);
        el.style.transform = t > 0 ? `perspective(1000px) rotateX(${(TILT * t).toFixed(2)}deg)` : '';
        if (top <= st + 60) cur = j;
      });
      return cur;
    };
    const goTo = (j) => scrollToY(stage.getBoundingClientRect().top + window.scrollY + restTop(j) - stick() + 2);
    return { place, goTo };
  };

  // What we do: the cards pin just under the pinned title, so tell the CSS how tall the title is
  const sol3 = $('.sol3'), sol3Head = $('.sol3__head');
  const sizeSol3 = () => { if (sol3 && sol3Head) sol3.style.setProperty('--hh', `${sol3Head.offsetHeight}px`); };
  sizeSol3();
  window.addEventListener('resize', sizeSol3);
  window.addEventListener('load', sizeSol3);
  const solStack = steps ? makeStack($('.stage', steps), panels) : null;
  const updSteps = () => {
    if (!solStack) return;
    const cur = solStack.place();
    if (cur < 0) { panels.forEach((p) => p.classList.add('is-seen')); return; }
    setStep(cur);
  };
  // Clicking a word scrolls to the moment its card lands on the stack
  words.forEach((w, j) => w.addEventListener('click', () => solStack && solStack.goTo(j)));

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

  /* Photo preview that follows the pointer in "What sets us apart" (the custom cursor is off) */
  if (!RM && FINE) {
    // The animated cursor ring is switched off; a detached stand-in keeps the photo preview code below working
    const cur = document.createElement('div');
    cur.innerHTML = '<span class="cursor__ring"><em></em></span><span class="cursor__dot"></span>';
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
    const pinned = () => !RM;
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
    // Only re-measure when the width changes; mobile address bars change the height while scrolling
    let sW = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth === sW) return; sW = window.innerWidth; sizeStories(); });
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

  /* Our team on mobile: the section pins and vertical scroll slides the cards sideways */
  const tSec = $('.team'), tPin = $('.team__pin'), tRow = $('.people');
  if (tSec && tPin && tRow) {
    let tDist = 0;
    const tOn = () => false; // phones now swipe the team cards sideways instead of pinning the section
    const moveTeam = () => {
      if (!tOn()) return;
      const stickTop = parseFloat(getComputedStyle(tPin).top) || 0;
      const padTop = parseFloat(getComputedStyle(tSec).paddingTop) || 0;
      const x = clamp(stickTop - (tSec.getBoundingClientRect().top + padTop), 0, tDist);
      tRow.style.transform = `translate3d(${-x}px,0,0)`;
    };
    const sizeTeam = () => {
      tSec.classList.toggle('is-pinned', tOn());
      tRow.style.transform = '';
      if (!tOn()) { tSec.style.removeProperty('--team-h'); return; }
      tDist = Math.max(0, tRow.scrollWidth - tRow.clientWidth + 20);
      const pinH = tPin.offsetHeight;
      tSec.style.setProperty('--pin-h', `${pinH}px`);
      const padTop = parseFloat(getComputedStyle(tSec).paddingTop) || 0;
      tSec.style.setProperty('--team-h', `${padTop + pinH + tDist}px`);
      moveTeam();
    };
    window.addEventListener('scroll', moveTeam, { passive: true });
    let tW = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth === tW) return; tW = window.innerWidth; sizeTeam(); });
    window.addEventListener('load', sizeTeam);
    sizeTeam();
  }

  /* Our team on phones: dots under the swipeable cards follow the card in view */
  const pRow = $('.people');
  if (pRow) {
    const cards = [...pRow.querySelectorAll('.person')];
    const dots = document.createElement('div');
    dots.className = 'people__dots';
    dots.setAttribute('aria-hidden', 'true');
    cards.forEach((_, n) => { const d = document.createElement('span'); if (!n) d.className = 'is-on'; dots.appendChild(d); });
    pRow.after(dots);
    const ds = [...dots.children];
    let raf = 0;
    pRow.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = pRow.scrollLeft;
        let best = 0;
        cards.forEach((c, n) => { if (Math.abs(c.offsetLeft - pRow.offsetLeft - x) < Math.abs(cards[best].offsetLeft - pRow.offsetLeft - x)) best = n; });
        if (x + pRow.clientWidth >= pRow.scrollWidth - 4) best = cards.length - 1;
        ds.forEach((d, n) => d.classList.toggle('is-on', n === best));
      });
    }, { passive: true });
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
  if (tilesEl) {
    const tl = $$('li', tilesEl); let ti = 0, tTimer = 0, seen = false;
    const wrap = tilesEl.parentElement, pop = $('.wy__pop', wrap);
    const step = () => { tl.forEach((t, j) => t.classList.toggle('is-on', j === ti)); ti = (ti + 1) % tl.length; };
    const runTiles = () => { clearInterval(tTimer); if (!RM && seen && pop.hidden) { step(); tTimer = setInterval(step, 2600); } };
    new IntersectionObserver((es) => es.forEach((e) => { seen = e.isIntersecting; if (!seen) closePop(); runTiles(); })).observe(tilesEl);
    // Clicking a tile opens a small card in the middle of the grid
    let opener = null;
    const closePop = () => {
      if (pop.hidden) return;
      pop.hidden = true; wrap.classList.remove('has-pop');
      if (opener) { opener.focus({ preventScroll: true }); opener = null; }
      runTiles();
    };
    tl.forEach((li, j) => $('button', li).addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      if (!pop.hidden && opener === btn) { closePop(); return; }
      clearInterval(tTimer);
      opener = btn;
      tl.forEach((t, k) => t.classList.toggle('is-on', k === j)); ti = (j + 1) % tl.length;
      $('h4', pop).textContent = btn.textContent;
      $('p', pop).textContent = btn.dataset.desc;
      pop.hidden = true; void pop.offsetWidth; pop.hidden = false; // replay the pop-in
      wrap.classList.add('has-pop');
    }));
    const popX = $('.wy__popx', pop);
    if (popX) popX.addEventListener('click', closePop);
    pop.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', closePop);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
  }

  /* Why Saraya 01: the list drifts upward on its own and loops; it can also be scrolled by hand */
  const wyList = $('.wy__list');
  if (wyList) {
    const track = $('.wy__track', wyList);
    let pos = 0, lastSet = -1, hold = false, holdUntil = 0, listIn = false, lt = 0;
    const half = () => track.scrollHeight / 2;
    // keep a little room above, so scrolling up at the start also loops
    const wrapPos = () => { const h = half(); if (h > 0) { while (pos >= h + 2) pos -= h; while (pos < 2) pos += h; } };
    const SPEED = () => half() / 22000; // one full cycle every 22s, like before
    const drift = (t) => {
      const dt = lt ? Math.min(64, t - lt) : 16; lt = t;
      if (listIn && !hold && performance.now() > holdUntil && !RM) pos += SPEED() * dt;
      wrapPos();
      if (Math.round(pos) !== lastSet) { lastSet = Math.round(pos); wyList.scrollTop = pos; }
      requestAnimationFrame(drift);
    };
    // Manual scrolling: follow the user, keep looping, and wait a moment before drifting again
    wyList.addEventListener('scroll', () => {
      if (Math.abs(wyList.scrollTop - lastSet) <= 1) return;
      pos = wyList.scrollTop; wrapPos();
      if (Math.round(pos) !== wyList.scrollTop) { lastSet = Math.round(pos); wyList.scrollTop = pos; } else lastSet = wyList.scrollTop;
      holdUntil = performance.now() + 1500;
    }, { passive: true });
    wyList.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold = true; });
    wyList.addEventListener('pointerleave', () => { hold = false; });
    wyList.addEventListener('touchstart', () => { holdUntil = performance.now() + 2500; }, { passive: true });
    new IntersectionObserver(([en]) => { listIn = en.isIntersecting; }).observe(wyList);
    requestAnimationFrame(drift);
  }
  if (chatEl) {
    // A short conversation plays out: questions come in, a typing indicator shows before each answer,
    // new bubbles enter at the bottom and push the older ones up. It loops while the column is on screen.
    const msgs = $$('.bub:not(.bub--typing)', chatEl);
    const typing = $('.bub--typing', chatEl);
    if (RM) { msgs.forEach((m) => m.classList.add('is-on')); typing.hidden = true; }
    else {
      let timers = [];
      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      const clear = () => { timers.forEach(clearTimeout); timers = []; };
      // Clear instantly: no collapsing or sliding, the bubbles are simply gone before the next round
      const reset = () => {
        chatEl.classList.add('no-anim');
        msgs.forEach((m) => m.classList.toggle('is-on', false));
        typing.classList.toggle('is-on', false);
        void chatEl.offsetHeight;
        chatEl.classList.remove('no-anim', 'is-fading');
      };
      // The reply starts exactly where the typing bubble is, at its height, then grows and fades in
      const swapIn = (m) => {
        const h = typing.offsetHeight;
        typing.style.transition = 'none';
        typing.classList.toggle('is-on', false);
        m.style.transition = 'none';
        m.style.maxHeight = `${h}px`;
        m.style.marginTop = '10px';
        m.style.opacity = '0';
        m.style.transform = 'none';
        void m.offsetHeight;
        m.style.transition = m.style.maxHeight = m.style.marginTop = m.style.opacity = m.style.transform = '';
        m.classList.add('is-on');
        requestAnimationFrame(() => { typing.style.transition = ''; });
      };
      const play = () => {
        clear();
        let t = 300;
        msgs.forEach((m) => {
          if (m.classList.contains('bub--out')) {
            // move the typing bubble into place first, then show it on the next frame so it grows in smoothly
            at(t, () => { chatEl.insertBefore(typing, m); void typing.offsetHeight; requestAnimationFrame(() => typing.classList.add('is-on')); });
            t += 2200;
            at(t, () => swapIn(m));
          } else {
            at(t, () => m.classList.add('is-on'));
          }
          t += 1800;
        });
        // hold the full conversation, fade it out in place (opacity only), clear it, then start over
        at(t + 3200, () => chatEl.classList.add('is-fading'));
        at(t + 3900, reset);
        at(t + 4300, play);
      };
      new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) play(); else { clear(); reset(); } }), { threshold: 0.4 }).observe(chatEl);
    }
  }

  /* End card: sides pull in and corners round as its bottom edge rises into view */
  const endcard = $('.endcard');
  let lastInset = '';
  const updEnd = () => {
    if (!endcard) return;
    const b = endcard.getBoundingClientRect().bottom, vh = window.innerHeight;
    const p = RM ? 1 : clamp((vh * 1.15 - b) / (vh * 0.8));
    const v = `${(p * (isDesk() ? 32 : 12)).toFixed(1)}px`;
    if (v !== lastInset) { lastInset = v; endcard.style.setProperty('--inset', v); }
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

  /* ---------- How we work (changelog style): the timeline item nearest the middle lights up together with its node in the illustration ---------- */
  const clSec = $('.clog');
  if (clSec) {
    const clItems = $$('.cl__item');
    let clCur = -1;
    const updCl = () => {
      const mid = window.innerHeight * 0.55;
      let cur = 0;
      clItems.forEach((it, i) => { if (it.getBoundingClientRect().top < mid) cur = i; });
      if (cur === clCur) return;
      clCur = cur;
      clItems.forEach((it, i) => { it.classList.toggle('is-on', i === cur); it.classList.toggle('is-done', i < cur); });
    };
    window.addEventListener('scroll', updCl, { passive: true });
    updCl();
    // The timeline line runs from the centre of the first dot to the centre of the last one
    const clTrack = $('.cl__track', clSec), clDots = $$('.cl__dot', clSec);
    const sizeTrack = () => {
      if (!clTrack || clDots.length < 2) return;
      // layout offsets, so the opening animation (which shifts items while they fade in) cannot skew it
      const centre = (d) => d.parentElement.offsetTop + d.offsetTop + d.offsetHeight / 2;
      const first = centre(clDots[0]), last = centre(clDots[clDots.length - 1]);
      clTrack.style.setProperty('--t0', `${first}px`);
      clTrack.style.setProperty('--th', `${last - first}px`);
      // desktop lays the stages side by side: the same line then runs across, from the first dot to the last
      const centreX = (d) => d.parentElement.offsetLeft + d.offsetLeft + d.offsetWidth / 2;
      const x0 = centreX(clDots[0]), x1 = centreX(clDots[clDots.length - 1]);
      clTrack.style.setProperty('--l0', `${x0}px`);
      clTrack.style.setProperty('--lw', `${x1 - x0}px`);
    };
    sizeTrack();
    window.addEventListener('resize', sizeTrack);
    window.addEventListener('load', sizeTrack);
  }

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

  /* Testimonials on phones: a sliding track, one quote wide. Every 4.5s the whole row moves left by one quote.
     A copy of the first quote sits at the end, so the loop keeps sliding left and then jumps back unseen. */
  const tstGrid = document.querySelector('.tst__grid');
  if (tstGrid) {
    const items = [...tstGrid.querySelectorAll('.tst__item')];
    const clone = items[0].cloneNode(true);
    clone.classList.add('tst__clone');
    clone.setAttribute('aria-hidden', 'true');
    tstGrid.appendChild(clone);
    let tstIdx = 0, tstSeen = false;
    const all = [...items, clone];
    const place = (n, animate) => {
      tstGrid.classList.toggle('no-anim', !animate);
      tstGrid.style.setProperty('--ti', n);
      all.forEach((it, k) => it.classList.toggle('is-cur', k === n));   // only the quote in view is visible
    };
    place(0, false);
    requestAnimationFrame(() => tstGrid.classList.remove('no-anim'));
    tstGrid.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'transform' || tstIdx !== items.length) return;
      tstIdx = 0;
      place(0, false);           // jump from the copy back to the real first quote
      void tstGrid.offsetWidth;
      tstGrid.classList.remove('no-anim');
    });
    new IntersectionObserver((es) => { tstSeen = es[0].isIntersecting; }, { threshold: 0.4 }).observe(tstGrid);
    if (!RM && items.length > 1) setInterval(() => {
      if (isDesk() || !tstSeen || document.hidden) return;
      tstIdx += 1;
      place(tstIdx, true);
    }, 4500);
  }

  /* Buttons stay still on hover: no magnetic pull toward the cursor */

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

  // Opening animation for the pieces inside every section: each component rises in as it reaches the
  // screen, one after another within its group. It animates `translate` and opacity only, so it never
  // fights the transforms other effects use (tilting cards, sliding tracks, sticky stacks).
  if (!RM) {
    const IO_SEL = [
      '.clients .cl', '.sol3 .tab2', '.sol3 .panel', '.wy__demo', '.wy h3', '.wy > p', '.wy__ic',
      '.cl__item', '.res3__stat', '.vmc__list li', '.pc--nums > div',
      '.feature__logos li', '.person__img', '.person h3', '.qa', '.foot__cols > div', '.foot__brand',
    ].join(',');
    const parts = $$(IO_SEL).filter((el) => !el.classList.contains('reveal') && !el.closest('.hero'));
    const io2 = new IntersectionObserver((es, obs) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const group = [...el.parentElement.children].filter((c) => c.classList.contains('io'));
      el.style.setProperty('--io-d', `${Math.min(Math.max(0, group.indexOf(el)), 6) * 90}ms`);
      el.classList.add('io-in');
      obs.unobserve(el);
    }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    parts.forEach((el) => { el.classList.add('io'); io2.observe(el); });
  }

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
