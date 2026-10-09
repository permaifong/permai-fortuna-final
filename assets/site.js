(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.querySelector('nav');
  var navH = function(){ return nav ? nav.offsetHeight : 0; };
  var ms = document.documentElement.lang === 'ms';
  document.querySelectorAll('.fade-img').forEach(function(i){ if (i.complete && i.naturalWidth) i.classList.add('ok'); });

  // Smooth scrolling (Lenis). Falls back to native scrolling if the library did not load
  // or the visitor prefers reduced motion. Touch devices keep native scrolling.
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function(t){ return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0);
    document.addEventListener('click', function(e){
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      var el = id.length > 1 && document.querySelector(id);
      if (!el && id !== '#top') return;
      e.preventDefault();
      if (nav) nav.classList.remove('open');
      lenis.scrollTo(id === '#top' ? 0 : el, { offset: -navH() + 1 });
      history.replaceState(null, '', id);
    });
  }

  // Phone menu
  var b = document.querySelector('.burger');
  if (b && nav) b.addEventListener('click', function(){
    var open = nav.classList.toggle('open');
    b.setAttribute('aria-expanded', open);
  });
  if (nav) nav.querySelectorAll('ul a').forEach(function(a){ a.addEventListener('click', function(){ nav.classList.remove('open'); }); });

  // Header: transparent at the top, green once scrolled
  function setNav(){ if (nav) nav.classList.toggle('solid', window.scrollY > 40); document.body.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', setNav, { passive: true });
  if (lenis) lenis.on('scroll', setNav);
  setNav();

  // Home hero parallax (desktop only), carried over from the original live site: the photo drifts down slower
  // than the page and zooms a touch, the text lifts and fades. Inner pages have no parallax on purpose.
  var hMedia = document.querySelector('.hero-media'), hText = document.querySelector('.hero-text');
  var wide = window.matchMedia('(min-width: 901px)');
  function heroFx(){
    if (!hMedia || reduce) return;
    if (!wide.matches) { hMedia.style.transform = hText.style.transform = hText.style.opacity = ''; return; }
    var y = window.scrollY, vh = window.innerHeight;
    if (y > vh * 1.2) return;
    var p = Math.min(1, y / vh);
    hMedia.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(1) + 'px,0) scale(' + (1 + p * 0.08).toFixed(4) + ')';
    hText.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)';
    hText.style.opacity = Math.max(0, 1 - p * 1.4).toFixed(3);
  }
  window.addEventListener('scroll', heroFx, { passive: true });
  window.addEventListener('resize', heroFx, { passive: true });
  if (lenis) lenis.on('scroll', heroFx);
  heroFx();

  // 1. Live clock in the header: "2:14am \u00b7 Open now" (Sabah time, UTC+8)
  var clocks = document.querySelectorAll('[data-live-clock]');
  function tick(){
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuching', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var h = +p.find(function(x){ return x.type === 'hour'; }).value % 24;
    var m = p.find(function(x){ return x.type === 'minute'; }).value;
    var h12 = h % 12 || 12, txt;
    if (ms) {
      var part = h < 12 ? 'pagi' : h < 14 ? 'tengah hari' : h < 19 ? 'petang' : 'malam';
      txt = h12 + ':' + m + ' ' + part + ' \u00b7 Buka sekarang';
    } else {
      txt = h12 + ':' + m + (h < 12 ? 'am' : 'pm') + ' \u00b7 Open now';
    }
    clocks.forEach(function(el){ el.querySelector('.t').textContent = txt; });
  }
  if (clocks.length && window.Intl) { tick(); setInterval(tick, 15000); }

  // 4. Headline reveal: the hero headline rises in word by word from behind a mask
  document.querySelectorAll('[data-split]').forEach(function(h){
    if (reduce) return;
    var i = 0, frag = document.createDocumentFragment();
    function word(node){
      var o = document.createElement('span'); o.className = 'w';
      var n = document.createElement('span'); n.className = 'wi'; n.style.transitionDelay = (0.15 + i++ * 0.07).toFixed(2) + 's';
      n.appendChild(node); o.appendChild(n); return o;
    }
    [].slice.call(h.childNodes).forEach(function(c){
      if (c.nodeType === 3) {
        c.textContent.split(/(\s+)/).forEach(function(part){
          if (!part) return;
          frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(' ') : word(document.createTextNode(part)));
        });
      } else if (c.nodeName === 'BR') { frag.appendChild(c); }
      else { frag.appendChild(word(c)); }
    });
    h.textContent = ''; h.appendChild(frag); h.classList.add('hsplit');
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ h.classList.add('go'); }); });
  });

  // Reveal on scroll. Plain fade for text blocks (.rv), sideways wipe for photos (.wipe),
  // and 3. counting numbers for the stats ([data-count]).
  function countUp(el){
    var end = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = null, dur = 1400;
    function step(t){
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var targets = document.querySelectorAll('.rv, .wipe, [data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    document.querySelectorAll('[data-count]').forEach(function(el){ el.textContent = '0' + (el.dataset.suffix || ''); });
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      if (e.target.dataset.count) countUp(e.target);
      io.unobserve(e.target);
    }); }, { rootMargin: '0px 0px -10% 0px' });
    targets.forEach(function(el){ io.observe(el); });
  } else { targets.forEach(function(el){ el.classList.add('in'); }); }

  // GA4 contact events (only fires on the live domain, where gtag exists)
  if (typeof gtag === 'function') document.addEventListener('click', function(e){
    var a = e.target.closest('a'); if (!a) return;
    var h = a.getAttribute('href') || '', n = '';
    if (h.indexOf('wa.me') > -1) n = 'whatsapp_click';
    else if (h.indexOf('tel:') === 0) n = 'call_click';
    else if (h.indexOf('mailto:') === 0) n = 'email_click';
    else if (h.indexOf('google.com/maps') > -1 || h.indexOf('maps.app.goo.gl') > -1) n = 'directions_click';
    if (n) gtag('event', n, { link_url: h, transport_type: 'beacon' });
  }, true);
})();

// Check-up page: "Show all tests" button opens the rest of the single tests table
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.pt-more');
  if (!b) return;
  var open = !b.previousElementSibling.classList.toggle('collapsed');
  b.textContent = open ? (document.documentElement.lang === 'ms' ? 'Tunjuk lebih sedikit' : 'Show fewer tests') : b.getAttribute('data-label');
  b.setAttribute('aria-expanded', open ? 'true' : 'false');
});
