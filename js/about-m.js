// About 页 · 手机版专属的交互（只在 html.ab-m 时加载，见 index.pug 末尾）。
// 2026-11-07 起，设计见 docs/个人页设计/13-手机版方案（草案）.md。
// 和 about.js 不共享变量，只通过页面元素打交道：跳章借用藏起来的章节书签（.ab-mark，点它走 about.js 原来的跳章：幕布淡出 → 滚过去 → 淡回），
// 当前在哪一章读书签上的 is-on（about.js 的滚动导演照旧在维护）。
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('ab-m')) return;

  // ========== 章节目录卡 ==========
  // 手机上不挂书签（会压住内容）。点页眉的头像 / 章节名（电脑版是回到顶部）：从页眉下面滑下来一张横线纸，
  // 五章各一行（编号 · 名字 · 英文眉题），正在读的那章名字下面一道荧光笔；点哪章就收起、跳过去。
  // 点卡片外面、按 Esc、开始滚动都会收起
  function initSheet() {
    var brand = document.getElementById('ab-bar-brand');
    var marks = [].slice.call(document.querySelectorAll('.ab-mark'));
    if (!brand || !marks.length) return;

    var sheet = document.createElement('div');
    sheet.className = 'abm-sheet';
    sheet.innerHTML =
      '<div class="abm-sheet-catch"></div>' +
      '<div class="abm-sheet-card" role="dialog" aria-label="章节目录">' +
      '<p class="abm-sheet-kicker">TECHCAFE · 目录</p><ol class="abm-sheet-list"></ol></div>';
    var list = sheet.querySelector('.abm-sheet-list');
    marks.forEach(function (m) {
      var n = m.dataset.chapter;
      var brow = document.querySelector('#block-' + n + ' .about-eyebrow');
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" class="abm-sheet-item"><span class="abm-sheet-no"></span><span class="abm-sheet-name"></span><span class="abm-sheet-en"></span></button>';
      var item = li.firstChild;
      item.dataset.chapter = n;
      item.querySelector('.abm-sheet-no').textContent = (m.firstChild && m.firstChild.textContent || '').trim();
      item.querySelector('.abm-sheet-name').textContent = m.querySelector('.ab-mark-name').textContent;
      // 英文眉题「01 / PROFILE」只取后半截
      item.querySelector('.abm-sheet-en').textContent = brow ? brow.textContent.replace(/^\s*\d+\s*\/\s*/, '').trim() : '';
      list.appendChild(li);
    });
    document.body.appendChild(sheet);

    var open = false, openY = 0;
    function set(on) {
      if (open === on) return;
      open = on;
      sheet.classList.toggle('is-open', on);
      root.classList.toggle('abm-sheet-open', on);
      brand.setAttribute('aria-expanded', String(on));
      if (!on) return;
      openY = window.scrollY;
      var cur = document.querySelector('.ab-mark.is-on');
      [].forEach.call(list.querySelectorAll('.abm-sheet-item'), function (b) {
        b.classList.toggle('is-on', !!cur && b.dataset.chapter === cur.dataset.chapter);
      });
    }

    brand.setAttribute('aria-haspopup', 'dialog');
    brand.setAttribute('aria-expanded', 'false');
    // 捕获阶段先接住：不走 about.js 里「回到顶部」那个点击
    brand.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      set(!open);
    }, true);
    sheet.querySelector('.abm-sheet-catch').addEventListener('click', function () { set(false); });
    list.addEventListener('click', function (e) {
      var item = e.target.closest('.abm-sheet-item');
      if (!item) return;
      set(false);
      var mark = marks[+item.dataset.chapter - 1];
      if (mark) mark.click();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    window.addEventListener('scroll', function () {
      if (open && Math.abs(window.scrollY - openY) > 24) set(false);
    }, { passive: true });
  }

  // ========== 进入视野时浮现 ==========
  // 电脑版的浮现是分割段那一套里的（ScrollTrigger），手机版没有：块里的每件东西（标题、工牌、信、格子墙……）和每张扉页，
  // 第一次进到屏幕里时淡入、往上挪一点，之后不再藏回去。只动透明度和 translate（about-m.css 的 .abm-rv）。
  // 已经在屏幕上（或屏幕上方）的不藏，免得一打开先空一下
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    [].forEach.call(document.querySelectorAll('.about-block-inner > *, .about-split-media'), function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.classList.add('abm-rv');
      io.observe(el);
    });
  }

  // ========== 工牌：正反两面，点一下翻面 ==========
  // 一整张工牌在手机上要占满一屏：把内容分进两面（正面：横幅、头像、名字、职务、座右铭、社交按钮、条形码和编号——真工牌也印在正面；
  // 背面：STAFF FILE 抬头、信息行。这样分两面差不多高，正面不会空出一截），
  // 和流萤相片、票根一样点一下翻面。在 about.js 初始化之前（这个文件在页面末尾同步执行，DOMContentLoaded 之前）就分好，
  // 工牌的长按挂式（about.js initBadge）照旧作用在 #idcard 上；点社交按钮、挂着的时候不翻
  function initIdFlip() {
    var card = document.getElementById('idcard'), rig = document.getElementById('badge-rig');
    if (!card) return;
    function take(face, sel) {
      var el = card.querySelector(':scope > ' + sel);
      if (el) face.appendChild(el);
      return el;
    }
    var flip = document.createElement('div'), front = document.createElement('div'), back = document.createElement('div');
    flip.className = 'abm-id-flip';
    front.className = 'abm-id-face abm-id-front';
    back.className = 'abm-id-face abm-id-back';
    ['.about-idcard-banner', '.about-avatar', '.about-name', '.about-role', '.about-motto', '.about-social', '.about-idcard-barcode', '.about-idcard-serial'].forEach(function (s) { take(front, s); });
    var name = front.querySelector('.about-name');
    var head = document.createElement('div');
    head.className = 'abm-id-backhead';
    head.innerHTML = '<span class="abm-id-backkicker">TECHCAFE · STAFF FILE</span><span class="abm-id-backname"></span>';
    head.querySelector('.abm-id-backname').textContent = name ? name.textContent : '';
    back.appendChild(head);
    take(back, '.about-idcard-info');
    [[front, '轻点翻面 ↻'], [back, '↺ 翻回正面']].forEach(function (p) {
      var hint = document.createElement('span');
      hint.className = 'abm-id-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = p[1];
      p[0].appendChild(hint);
    });
    flip.appendChild(front);
    flip.appendChild(back);
    card.appendChild(flip);
    card.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      if (rig && rig.classList.contains('is-hanging')) return;
      card.classList.toggle('abm-flipped');
    });
  }

  // ========== 自我介绍信：阅读抽屉 ==========
  // 手机上信在页面里展开会多出好几百 px、把后面的内容推开。改成：页面里只放收好的信（about.js 照旧管收起的高度、小三角、第一次进视野时升起来），
  // 点信纸 / 小三角时从底部滑上来一张完整的信纸，铺满屏幕、能在里面上下滚。点 ×、点信纸外面、按 Esc、往下拖顶上的小横条收回。
  // 签名旁边的格言第一次滚到眼前时一行一行写出来（和电脑版展开时一样）
  function initLetterReader() {
    var card = document.getElementById('ab-letter');
    if (!card) return;
    var paper = card.querySelector('.ab-letter-paper'), toggle = card.querySelector('.ab-letter-toggle');
    if (!paper) return;
    var reader = null, sheet = null, scroller = null, lastFocus = null;

    function build() {
      reader = document.createElement('div');
      reader.className = 'abm-reader';
      reader.innerHTML =
        '<div class="abm-reader-catch"></div>' +
        '<div class="abm-reader-sheet" role="dialog" aria-modal="true" aria-label="店长的信">' +
        '<div class="abm-reader-grip" aria-hidden="true"><span></span></div>' +
        '<button type="button" class="abm-reader-close" aria-label="收起信">×</button>' +
        '<div class="abm-reader-scroll"></div></div>';
      sheet = reader.querySelector('.abm-reader-sheet');
      scroller = reader.querySelector('.abm-reader-scroll');
      var copy = paper.cloneNode(true);
      copy.removeAttribute('style');   // about.js 写在行内的裁切（插在信封里）
      [].forEach.call(copy.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
      copy.classList.add('abm-reader-paper');
      scroller.appendChild(copy);
      document.body.appendChild(reader);

      reader.querySelector('.abm-reader-catch').addEventListener('click', close);
      reader.querySelector('.abm-reader-close').addEventListener('click', close);

      // 往下拖顶上的小横条：跟着手指走，拖过 90px 松手就收回，不够就弹回去
      var grip = reader.querySelector('.abm-reader-grip'), y0 = null, dy = 0;
      grip.addEventListener('pointerdown', function (e) { y0 = e.clientY; dy = 0; sheet.style.transition = 'none'; grip.setPointerCapture(e.pointerId); });
      grip.addEventListener('pointermove', function (e) {
        if (y0 === null) return;
        dy = Math.max(0, e.clientY - y0);
        sheet.style.transform = 'translateY(' + dy + 'px)';
      });
      function end() {
        if (y0 === null) return;
        y0 = null;
        sheet.style.transition = '';
        sheet.style.transform = '';
        if (dy > 90) close();
      }
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);

      // 格言：滚到眼前时一行一行写出来（只写一次）
      var motto = copy.querySelectorAll('.ab-letter-motto span');
      if (motto.length && 'IntersectionObserver' in window && copy.animate) {
        [].forEach.call(motto, function (line) { line.style.clipPath = 'inset(-0.5em 100% -0.5em -0.5em)'; });
        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          [].forEach.call(motto, function (line, i) {
            line.style.clipPath = '';
            line.animate([{ clipPath: 'inset(-0.5em 100% -0.5em -0.5em)' }, { clipPath: 'inset(-0.5em -0.5em -0.5em -0.5em)' }],
              { duration: 1200, easing: 'cubic-bezier(0.45, 0.05, 0.4, 1)', delay: 300 + i * 1250, fill: 'backwards' });
          });
        }, { root: scroller, threshold: 0.6 });
        io.observe(motto[0].parentNode);
      }
    }
    function open() {
      if (!reader) build();
      lastFocus = document.activeElement;
      scroller.scrollTop = 0;
      reader.classList.add('is-open');
      root.classList.add('abm-reader-open');
      reader.querySelector('.abm-reader-close').focus({ preventScroll: true });
    }
    function close() {
      if (!reader || !reader.classList.contains('is-open')) return;
      reader.classList.remove('is-open');
      root.classList.remove('abm-reader-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    // 捕获阶段先接住点信纸 / 小三角：不走 about.js 里在页面里展开的那一套
    card.addEventListener('click', function (e) {
      if (!paper.contains(e.target) && !(toggle && toggle.contains(e.target))) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      open();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  // ========== GitHub 打卡本：默认停在最新一周 ==========
  // 手机上格子放大到看得清（about-m.css），一年排不下，横着滑；打卡数据回来、网格画好以后滚到最右边（最近的几个月）
  function initHeatmapScroll() {
    var box = document.getElementById('github-heatmap');
    if (!box) return;
    function toEnd() { box.scrollLeft = box.scrollWidth; }
    if (box.querySelector('.about-heatmap-grid')) { toEnd(); return; }
    new MutationObserver(function (list, ob) {
      if (!box.querySelector('.about-heatmap-grid')) return;
      ob.disconnect();
      requestAnimationFrame(toEnd);
    }).observe(box, { childList: true });
  }

  // ========== 横滑：同一类的几张卡收进一行 ==========
  // 第二部分的四张技能卡、第三部分精选文章里主卡以外的几篇：竖着一张张排太长，收进一行横着滑（吸附在正中、露出下一张的一角），
  // 下面一排小圆点跟着滑到第几张走
  function makeSwipe(items, label) {
    if (items.length < 2) return;
    var row = document.createElement('div');
    row.className = 'abm-swipe';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    items[0].parentNode.insertBefore(row, items[0]);
    items.forEach(function (el) { row.appendChild(el); });
    var dots = document.createElement('div');
    dots.className = 'abm-dots';
    dots.setAttribute('aria-hidden', 'true');
    items.forEach(function () { dots.appendChild(document.createElement('span')); });
    row.parentNode.insertBefore(dots, row.nextSibling);
    var raf = 0;
    function paint() {
      raf = 0;
      var w = row.scrollWidth - row.clientWidth, i = w > 0 ? Math.round(row.scrollLeft / w * (items.length - 1)) : 0;
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle('is-on', k === i); });
    }
    row.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    paint();
  }
  function initSwipes() {
    var bento = document.querySelector('.about-bento');
    if (bento) makeSwipe([].slice.call(bento.querySelectorAll(':scope > .about-bento-cell:not(.about-bento-img):not(.about-bento-code)')), '正在折腾的方向');
    var posts = document.querySelector('.about-posts');
    if (posts) makeSwipe([].slice.call(posts.querySelectorAll(':scope > .about-post:not(.about-post-feature)')), '更多文章');
  }

  // ========== 头脑风暴：左右滑也能翻页 ==========
  // 在便签本上横着划一下 = 点「翻一页」（about.js initMuse 照旧管翻页）
  function initMuseSwipe() {
    var pad = document.querySelector('.about-muse-pad'), next = document.querySelector('.about-muse-next');
    if (!pad || !next) return;
    var x0 = null, y0 = 0;
    pad.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    pad.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) next.click();
    }, { passive: true });
  }

  // ========== 背景咖啡厅：随章节在店里走动 ==========
  // 竖屏一次只看得到咖啡厅的三成宽（整幅按横屏 16:10 排，见 about-cafe/09-cafe-mount）。换章时整幅横着挪到另一段，像在店里走：
  // 第一部分靠窗的长凳和猫 → 望远镜和笔记本 → 沙发和落地灯 → 挂钟、软木板上的拍立得和咖啡机 → 霓虹招牌、黑板和唱片机。
  // 挪多远 = 整幅比屏幕宽出来的那截（咖啡厅每画好一幅写在 data-pan-max 上）× 这一章的位置；按画布像素取整，停下来时像素格不糊。
  // 只在换章时挪一次（about-m.css 里 1.4 秒的 translate 过渡，在合成层上做），滚动时背景不动
  var CAFE_STOPS = [0, 0.225, 0.465, 0.73, 1];   // 第 1～5 章：0 = 整幅最左边，1 = 最右边
  function initCafePan() {
    var box = document.getElementById('ab-cafe'), marks = document.getElementById('ab-marks');
    if (!box) return;
    var chapter = 1;
    function apply() {
      var max = +box.dataset.panMax || 0, px = +box.dataset.px || 1;
      var s = CAFE_STOPS[chapter - 1];
      var x = Math.round(max * (1 - (s === undefined ? 1 : s)) / px) * px;
      box.style.setProperty('--abm-pan', x + 'px');
    }
    if (marks) {
      new MutationObserver(function () {
        var on = marks.querySelector('.ab-mark.is-on'), n = on ? +on.dataset.chapter : 1;
        if (n !== chapter) { chapter = n; apply(); }
      }).observe(marks, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    new MutationObserver(apply).observe(box, { attributes: true, attributeFilter: ['data-pan-max', 'data-px'] });
    apply();
  }

  // 先改结构（工牌两面、横滑），再挂浮现（浮现按改好之后块里的东西来）
  initIdFlip();
  initLetterReader();
  initHeatmapScroll();
  initSwipes();
  initMuseSwipe();
  initCafePan();
  initSheet();
  initReveal();
})();
