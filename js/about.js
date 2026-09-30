/**
 * About 页动画与交互
 * 依赖（CDN，可缺失降级）：GSAP + ScrollTrigger + TypeIt
 * 桌面端：ScrollTrigger pin 驱动分割段；移动端/减少动态/库缺失：静态降级
 */
(function () {
  'use strict';

  // ========== 内容数据（改文案只动这一区） ==========

  // Hero 打字机：随机顺序轮播（打完停顿后删除换下一条）；写成函数的条目在轮到它时才生成（比如按当前时间问好）
  var HERO_QUOTES = [
    '“愿此行，终抵群星”',
    'Dream Big.',
    '“飞萤扑火，向死而生”',
    '关于店长的一切，从这里开始。',
    function () { return heroGreeting() + '好，这里是 TechCafe 的后厨。'; },
    '不论各位的世界有没有昼夜的概念，首先祝大家早上中午晚上好~'
  ];

  // 按访客本地时间问好：5 ~ 11 点早上，11 ~ 17 点中午，其余晚上
  function heroGreeting() {
    var h = new Date().getHours();
    return h >= 5 && h < 11 ? '早上' : h >= 11 && h < 17 ? '中午' : '晚上';
  }

  var SPLIT_QUOTES = {
    'split-text-1': {
      lines: ['去见你，我一定用跑的。'],
      source: '关于店长'
    },
    'split-text-2': {
      lines: ["Let's go on a trip."],
      source: '写过的文字'
    },
    'split-text-3': {
      lines: ['“我梦见一片焦土，一株破土而生的新蕊。它迎着朝阳绽放，向我低语呢喃...”', '“飞萤扑火，向死而生。”'],
      source: '店长的另一面'
    },
    'split-text-4': {
      lines: ['被快门留下来的瞬间，', '都会变成星星。'],
      source: '回忆录'
    }
  };

  // 回忆录：手帐本每个跨页右页的故事，按序号与 index.pug 的 MEMOIRS 一一对应（lines 一行一段，source 写在末尾）
  var MEMOIR_QUOTES = [
    { lines: ['占位回忆 01：', '之后把照片和这段话换成真实的。'], source: '回忆 01' },
    { lines: ['占位回忆 02：', '某次展子的下午。'], source: '回忆 02' },
    { lines: ['占位回忆 03：', '演唱会散场后的路上。'], source: '回忆 03' },
    { lines: ['占位回忆 04：', '扫街时偶遇的光。'], source: '回忆 04' },
    { lines: ['占位回忆 05：', '桌上的新周边。'], source: '回忆 05' },
    { lines: ['占位回忆 06：', '一次说走就走的旅行。'], source: '回忆 06' },
    { lines: ['占位回忆 07：', '雨停之后的街角。'], source: '回忆 07' },
    { lines: ['占位回忆 08：', '第一次出摊。'], source: '回忆 08' },
    { lines: ['占位回忆 09：', '深夜的实验室。'], source: '回忆 09' },
    { lines: ['占位回忆 10：', '海边的风。'], source: '回忆 10' },
    { lines: ['占位回忆 11：', '那年夏天。'], source: '回忆 11' },
    { lines: ['占位回忆 12：', '下一站去哪？'], source: '回忆 12' },
    { lines: ['占位回忆 13：', '冬日的站台。'], source: '回忆 13' },
    { lines: ['占位回忆 14：', '窗外的晚霞。'], source: '回忆 14' },
    { lines: ['占位回忆 15：', '一起看的烟花。'], source: '回忆 15' },
    { lines: ['占位回忆 16：', '未完待续。'], source: '回忆 16' }
  ];

  var BLOG_START = '2023-04-12';
  var FIREFLY_MET = '2024-02-06';   // 页脚「与萤宝相遇 N 天」的起算日：崩铁 2.0（匹诺康尼）上线、开拓者初遇流萤那天

  // ========== 环境判定 ==========

  var hasAnimLibs = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  var hasTypeIt = typeof TypeIt !== 'undefined';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 768px)').matches;
  var animOn = hasAnimLibs && !reduceMotion && !isMobile;

  document.documentElement.classList.add(animOn ? 'ab-anim' : 'ab-fallback');

  // 右上角的锁：锁着（默认）= 不放分割段嵌入图（钉住时长为 0，几块内容直接接着往下滚）；解开 = 分割段照常展开。
  // 选择只记在当前标签页（sessionStorage，存 'open' 表示解开）：刷新 / 后退回来保持原样（滚动位置的恢复也按这个状态算），
  // 新打开页面一律锁着。以前记在 localStorage 里的那条（会让之后每次打开都是解开的）顺手清掉。html.ab-locked 让 CSS 把嵌入图 / 遮罩板整个藏掉。见 initLock
  var LOCK_KEY = 'about-splits';
  var locked = true;
  try { locked = sessionStorage.getItem(LOCK_KEY) !== 'open'; } catch (e) { /* 存储不可用：按默认锁着 */ }
  try { localStorage.removeItem(LOCK_KEY); } catch (e) { /* 忽略 */ }
  document.documentElement.classList.toggle('ab-locked', locked);

  // Hero 的状态（动画模式，见 initHeroVoyage）：'hero' 在 hero 上（跟着滚轮来回）| 'auto' 退场自动播放中 |
  // 'gone' hero 已拆掉、页顶就是第一部分 | 'back' 正在倒着播回 hero。
  // 刷新 / 后退回来时，离开前 hero 已经拆掉的话就直接从拆掉的状态开始（html.ab-hero-gone 让 CSS 把 hero 藏掉，像素 hero 也不挂载）
  var HERO_GONE_KEY = 'about-hero-gone';
  var heroState = 'hero';
  if (animOn) {
    try {
      var navEntry = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
      if (navEntry && (navEntry.type === 'reload' || navEntry.type === 'back_forward') && sessionStorage.getItem(HERO_GONE_KEY) === '1') heroState = 'gone';
    } catch (e) { /* 存储不可用：从 hero 开始 */ }
  }
  document.documentElement.classList.toggle('ab-hero-gone', heroState === 'gone');

  // ========== 打字机 ==========

  var typeItInstances = {};

  function typeInto(id, quote) {
    var el = document.getElementById(id);
    if (!el || !quote) return;

    resetType(id);

    var lines = document.createElement('div');
    lines.className = 'about-typewriter-lines';
    var source = document.createElement('div');
    source.className = 'about-typewriter-source';
    source.textContent = '· ' + quote.source;
    el.appendChild(lines);
    el.appendChild(source);

    if (!hasTypeIt || reduceMotion) {
      lines.innerHTML = quote.lines.join('<br>');
      source.style.opacity = '1';
      return;
    }

    var ti = new TypeIt(lines, {
      speed: 80,
      startDelay: 350,
      cursorSpeed: 520,
      afterComplete: function () {
        source.style.opacity = '1';
      }
    });
    quote.lines.forEach(function (line, i) {
      ti.type(line);
      if (i < quote.lines.length - 1) ti.break();
    });
    ti.go();
    typeItInstances[id] = ti;
  }

  function resetType(id) {
    var el = document.getElementById(id);
    if (typeItInstances[id]) {
      try { typeItInstances[id].destroy(); } catch (e) { /* 已销毁则忽略 */ }
      delete typeItInstances[id];
    }
    if (el) el.innerHTML = '';
  }

  // Hero 专用：随机顺序无限轮播。不用 TypeIt，自己一格一格打——为了换行：
  // 每打一个"单元"（一个英文单词 / 一个汉字，连同后面不能放行首的标点、前面不能放行尾的引号）之前，
  // 先量一下这一行剩下的地方放不放得下整个单元，放不下就先换行再打，免得打到一半整个单词跳到下一行。
  // 另外两处也会让已经打出来的字跳行，一并避开：光标不占宽度（否则行快满时会把最后一个字挤下去）；
  // 霞鹜文楷是按字分片加载的，每条文案开打之前先把它用到的字形载好（否则打到一半字体换了、整行重排）。
  function initHeroType() {
    var el = document.getElementById('hero-typewriter');
    if (!el) return;
    var box = document.createElement('div');
    box.className = 'about-typewriter-lines';
    el.appendChild(box);

    var quotes = HERO_QUOTES.slice();
    for (var i = quotes.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = quotes[i]; quotes[i] = quotes[j]; quotes[j] = t;
    }
    function text(q) { return typeof q === 'function' ? q() : q; }

    if (reduceMotion) {
      box.textContent = text(quotes[0]);
      return;
    }

    var out = document.createElement('span');
    var cursor = document.createElement('span');
    cursor.className = 'ab-tw-cursor';
    cursor.textContent = '|';
    var meas = document.createElement('span');
    meas.className = 'ab-tw-measure';
    box.appendChild(out);
    box.appendChild(cursor);
    box.appendChild(meas);

    var SPEED = 80, DELETE_SPEED = 35, HOLD = 2600, GAP = 900;
    var UNIT = /[“‘（《]*(?:[A-Za-z0-9][A-Za-z0-9'’.\-]*|\s+|[^\sA-Za-z0-9])[，。！？、；：”’）》~,.!?…]*/g;
    var qi = 0;

    // 光标此刻在不在行首；一个单元接在光标处会不会超出这一行
    function atLineStart() { return cursor.getBoundingClientRect().left - box.getBoundingClientRect().left < 2; }
    function fits(unit) {
      meas.textContent = unit;
      return cursor.getBoundingClientRect().left + meas.getBoundingClientRect().width <= box.getBoundingClientRect().right - 0.5;
    }
    // 先把这条文案要用的字形载好再开打（最多等 3 秒）
    function fontsReady(str, cb) {
      var done = false;
      function go() { if (!done) { done = true; cb(); } }
      if (!document.fonts || !document.fonts.load) { go(); return; }
      var cs = getComputedStyle(box);
      document.fonts.load(cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, str).then(go, go);
      setTimeout(go, 3000);
    }
    function putChar(ch) {
      var last = out.lastChild;
      if (last && last.nodeType === 3) last.appendData(ch);
      else out.appendChild(document.createTextNode(ch));
    }
    function dropOne() {
      var last = out.lastChild;
      if (!last) return false;
      if (last.nodeType === 3 && last.length > 1) last.deleteData(last.length - 1, 1);
      else out.removeChild(last);
      return true;
    }

    function typeQuote() {
      var str = text(quotes[qi % quotes.length]);
      qi++;
      fontsReady(str, function () { typeUnits(str.match(UNIT) || []); });
    }
    function typeUnits(units) {
      cursor.classList.add('is-typing');
      var u = 0, c = 0;
      (function step() {
        if (u >= units.length) {
          cursor.classList.remove('is-typing');
          setTimeout(eraseQuote, HOLD);
          return;
        }
        var unit = units[u];
        if (c === 0 && !/^\s/.test(unit) && !atLineStart() && !fits(unit)) out.appendChild(document.createElement('br'));
        putChar(unit.charAt(c));
        if (++c >= unit.length) { u++; c = 0; }
        setTimeout(step, SPEED);
      })();
    }
    function eraseQuote() {
      cursor.classList.add('is-typing');
      (function step() {
        if (dropOne()) { setTimeout(step, DELETE_SPEED); return; }
        cursor.classList.remove('is-typing');
        setTimeout(typeQuote, GAP);
      })();
    }
    setTimeout(typeQuote, 350);
  }

  // ========== 滚动数字时钟（MAC 风：数字纵向滚动切换） ==========

  var rollClocks = [];

  function buildRollClock(root, withSeconds) {
    root.classList.add('ab-rollclock');
    root.textContent = '';
    var strips = [];
    var groups = withSeconds ? 3 : 2;
    for (var g = 0; g < groups; g++) {
      if (g > 0) {
        var colon = document.createElement('span');
        colon.className = 'ab-roll-colon';
        colon.textContent = ':';
        root.appendChild(colon);
      }
      for (var d = 0; d < 2; d++) {
        var slot = document.createElement('span');
        slot.className = 'ab-roll';
        var strip = document.createElement('span');
        strip.className = 'ab-roll-strip';
        for (var n = 0; n <= 9; n++) {
          var num = document.createElement('span');
          num.className = 'ab-roll-num';
          num.textContent = n;
          strip.appendChild(num);
        }
        slot.appendChild(strip);
        root.appendChild(slot);
        strips.push(strip);
      }
    }
    rollClocks.push({ strips: strips, withSeconds: withSeconds });
  }

  function tickClocks() {
    var now = new Date();
    var hh = now.getHours(), mm = now.getMinutes(), ss = now.getSeconds();
    rollClocks.forEach(function (c) {
      var digits = [(hh / 10) | 0, hh % 10, (mm / 10) | 0, mm % 10];
      if (c.withSeconds) digits.push((ss / 10) | 0, ss % 10);
      c.strips.forEach(function (strip, i) {
        // 条带共 10 格，每格占 10%
        strip.style.transform = 'translateY(-' + digits[i] * 10 + '%)';
      });
    });
  }

  // ========== Hero 像素夜景（js/about-pixel/*.js）：离开 Hero 后暂停动画，回来再恢复 ==========

  var pixelHero = null;
  var starsRunning = true;

  function setStarsRunning(on) {
    if (on === starsRunning) return;
    starsRunning = on;
    if (pixelHero) pixelHero.setRunning(on);
  }

  var heroConfig = null;   // 这次抽到的场景：hero 退场拆掉后再回来，沿用同一个

  function initPixelHero() {
    var el = document.getElementById('hero-pixel');
    if (!el || !window.AboutPixelHero || heroState === 'gone') return;
    try {
      pixelHero = window.AboutPixelHero.mount(el, { reduceMotion: reduceMotion, config: heroConfig || undefined });
      heroConfig = pixelHero.config;
    } catch (e) {
      pixelHero = null; // 画不出来就保留 CSS 夜色底
    }
  }

  // 降级模式（无 GSAP）：滚动监听判断 Hero 是否已收起（与动画模式一致：Hero 高度的 75%）
  function initStaticStarsFade() {
    var hero = document.getElementById('about-hero');
    if (!hero) return;
    var ticking = false;

    function update() {
      ticking = false;
      setStarsRunning(window.scrollY < hero.offsetHeight * 0.75);
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  // ========== 滚动位置记忆（后退 / 刷新回到原处） ==========
  // 浏览器自带的滚动恢复发生得太早：分割段还没把页面撑高、字体与图片未就绪，会落到错误位置。
  // 改为手动：离开时记下位置；回来时等字体与图片就绪、分割段重新测量后再跳回，期间用纸色遮罩盖住

  var SCROLL_KEY = 'about-scroll-y';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function initScrollMemory() {
    window.addEventListener('pagehide', function () {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)));
        sessionStorage.setItem(HERO_GONE_KEY, heroState === 'gone' ? '1' : '0');
      } catch (e) { /* 隐私模式等不可用时放弃记忆 */ }
    });

    var nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    var saved = 0;
    if (nav && (nav.type === 'back_forward' || nav.type === 'reload')) {
      try { saved = parseInt(sessionStorage.getItem(SCROLL_KEY), 10) || 0; } catch (e) { saved = 0; }
    }

    var flip = document.getElementById('ab-flip');
    if (saved > 0 && flip) {
      flip.style.transition = 'none';
      flip.classList.add('is-on');
    }

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    var loaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(function (r) { window.addEventListener('load', r, { once: true }); });
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    // 最多等 3 秒，慢网下不至于一直盖着
    Promise.race([Promise.all([loaded, fonts]), wait(3000)]).then(function () {
      // 字体换上后文字高度会变：无论是否恢复位置都重新测量一次分割段
      if (animOn) ScrollTrigger.refresh();
      if (saved > 0) {
        window.scrollTo(0, saved);
        if (animOn) ScrollTrigger.update();
      }
      director.request();
      if (flip && saved > 0) {
        requestAnimationFrame(function () {
          flip.style.transition = '';
          flip.classList.remove('is-on');
        });
      }
    });
  }

  // ========== 滚动导演：底色渐变 / 阅读进度 / 页眉与书签 / 章节与印花 ==========
  // 一个 rAF 节流的滚动监听统一驱动，动画模式与降级模式共用：
  // - 底色：改写 :root 的 --ab-bg / --ab-bg-rgb（背景层、遮罩板、Hero 底边都跟着变，始终同色无接缝）
  // - 进度：只写到页眉进度线与咖啡杯两个元素上，避免全局样式重算
  // - 章节：动画模式按"已过半的分割段数"判定（换章发生在幕布合上期间），降级模式按块位置判定
  // - 印花：当前章那层淡入 + 慢速视差；动画模式下分割段钉住前后整组淡出，换章藏在幕布后面

  var BG_STOPS = [
    [0, [243, 236, 224]],   // 清晨奶油
    [0.5, [238, 226, 207]], // 午后奶茶
    [1, [229, 212, 187]]    // 傍晚焦糖奶茶
  ];
  var CAFE_NEAR = 400;       // 离分割段还有这么远(px)就开始让背景咖啡厅往遮罩板里同步快照

  var pinTriggers = [];      // 动画模式下由 initAnimations 按页面顺序填充
  var director = { chapter: 0, request: function () {} };

  function bgAt(p) {
    for (var i = 1; i < BG_STOPS.length; i++) {
      var a = BG_STOPS[i - 1], b = BG_STOPS[i];
      if (p <= b[0]) {
        var t = (p - a[0]) / (b[0] - a[0]);
        return a[1].map(function (v, k) { return Math.round(v + (b[1][k] - v) * t); });
      }
    }
    return BG_STOPS[BG_STOPS.length - 1][1];
  }

  function currentChapter(blocks) {
    if (animOn && !locked && pinTriggers.length) {
      var passed = 0;
      pinTriggers.forEach(function (st) { if (st.progress > 0.45) passed++; });
      return 1 + passed;
    }
    var n = 1;
    blocks.forEach(function (b, i) {
      if (b.getBoundingClientRect().top < window.innerHeight * 0.5) n = i + 1;
    });
    return n;
  }

  // 动画模式：y 离哪个分割段钉住区间多近——'in' 在钉住区间里（遮罩板盖着背景）、'near' 前后 CAFE_NEAR 以内、'' 都不是
  function cafePinState(y) {
    var st = '';
    if (locked) return st;   // 锁着：没有分割段展开，遮罩板不用同步快照
    pinTriggers.forEach(function (t) {
      if (y >= t.start && y <= t.end) st = 'in';
      else if (st !== 'in' && y > t.start - CAFE_NEAR && y < t.end + CAFE_NEAR) st = 'near';
    });
    return st;
  }

  // 动画模式：是否处于某个分割段的"页眉一行被推走"区间（按钉住进度）。
  // 起点 0.03：分割线刚开始伸出（时间轴 0.1 才开始推，留出收拾的时间）；
  // 终点 0.8：上半页合拢落定（scrub 追赶期间书签还有 0.3s 伸出延迟兜着）
  var AWAY_FROM = 0.03, AWAY_TO = 0.8;

  function chromeAway(y) {
    if (!animOn || locked) return false;
    return pinTriggers.some(function (st) {
      var p = (y - st.start) / (st.end - st.start);
      return p >= AWAY_FROM && p < AWAY_TO;
    });
  }

  // 动画模式：块 n（从 1 起）的顶在页面上的坐标——滚到 y 时它在屏幕上的位置 = blockTop(n) − y。
  // 块 1 紧跟 Hero；块 n ≥ 2 在第 n − 1 个分割段结束时顶端正好在屏幕中央（块没被钉住 / 分开时成立）
  function blockTop(n) {
    if (n === 1) return document.getElementById('about-hero').offsetHeight;
    return pinTriggers[n - 2].end + window.innerHeight / 2;
  }

  function initDirector() {
    var root = document.documentElement;
    var hero = document.getElementById('about-hero');
    var bar = document.getElementById('ab-bar');
    var cup = document.getElementById('ab-cup');
    var label = document.getElementById('ab-bar-chapter');
    var flip = document.getElementById('ab-flip');
    var brand = document.getElementById('ab-bar-brand');
    var cafePanels = [document.getElementById('ab-panel-top'), document.getElementById('ab-panel-bottom')];
    var wash = document.querySelector('.about-hero-wash');
    var marks = [].slice.call(document.querySelectorAll('.ab-mark'));
    var blocks = [].slice.call(document.querySelectorAll('.about-block'));
    var lastBg = '';
    var lastY = window.scrollY;
    var ticking = false;

    function setChapter(n, instant) {
      if (n === director.chapter) return;
      director.chapter = n;
      marks.forEach(function (m) { m.classList.toggle('is-on', +m.dataset.chapter === n); });
      var mark = marks[n - 1];
      if (!label || !mark) return;
      function write() {
        label.querySelector('.ab-bar-chapter-no').textContent = ('0' + n).slice(-2);
        label.querySelector('.ab-bar-chapter-name').textContent = mark.querySelector('.ab-mark-name').textContent;
        label.classList.remove('is-swapping');
      }
      if (instant) return write();
      label.classList.add('is-swapping');
      setTimeout(write, 220);
    }

    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = root.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

      // 底色：颜色只有几十级，变了才写，避免每帧触发全局样式重算
      var rgb = bgAt(p).join(', ');
      if (rgb !== lastBg) {
        lastBg = rgb;
        root.style.setProperty('--ab-bg', 'rgb(' + rgb + ')');
        root.style.setProperty('--ab-bg-rgb', rgb);
      }

      // 阅读进度：页眉底边进度线 + 咖啡杯液面
      if (bar) bar.style.setProperty('--ab-progress', p.toFixed(4));
      if (cup) {
        cup.style.setProperty('--ab-progress', p.toFixed(4));
        var readTip = '已读 ' + Math.round(p * 100) + '%';
        if (cup.getAttribute('data-tip') !== readTip) { cup.setAttribute('data-tip', readTip); cup.setAttribute('aria-label', readTip); }
      }

      // 页眉：Hero 滚过 60% 后浮现（动画模式：hero 退场播完、拆掉之后才浮现）；收起时顺带收回播放器面板
      var barOn = animOn ? heroState === 'gone' : y > hero.offsetHeight * 0.6;
      document.body.classList.toggle('ab-bar-on', barOn);
      if (!barOn) player.close();

      // 分割段期间页眉一行被推走（位移由分割段时间轴驱动，见 initAnimations）：
      // 分割线一开始伸出就先收拾——播放器弹回、书签缩回页眉；合拢落定后书签再依次伸出
      var away = chromeAway(y);
      document.body.classList.toggle('ab-chrome-away', away);
      if (away) player.close();

      // 降级模式的 Hero 洗白（动画模式交给 GSAP）
      if (!animOn && wash) wash.style.opacity = Math.min(1, y / hero.offsetHeight).toFixed(3);

      setChapter(currentChapter(blocks), director.chapter === 0);

      // 工牌挂式彩蛋：往下滑到第 2 块浮现的那一刻（分割线出现前）自动恢复正常；往上滑不触发。
      // 动画模式与第 2 块浮现同一触发点（分割段 1 起点 − 0.4 屏）；降级模式按第 2 块顶进入视口 90%
      if (badge.hanging && blocks[1] && y > lastY) {
        var limit = animOn && pinTriggers[0]
          ? pinTriggers[0].start - window.innerHeight * 0.4
          : blocks[1].getBoundingClientRect().top + y - window.innerHeight * 0.9;
        if (y >= limit) badge.reset();
      }
      lastY = y;

      // 背景咖啡厅：一直显示；快到 / 进入分割段时把快照同步进两块遮罩板（板滑开时咖啡厅跟着分开），
      // 钉住期间背景被板盖着，暂停动画（快照也就停在那一帧）；Hero 还在屏幕上时也暂停
      var pin = animOn ? cafePinState(y) : '';
      if (cafeBg) {
        cafeBg.mirror(cafePanels, pin !== '');
        cafeBg.setRunning(pin !== 'in' && (animOn ? heroState !== 'hero' : y > hero.offsetHeight * 0.5));
      }
    }

    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    // 跳章目标：让该章标题落在页眉下方。动画模式下块被钉住/位移，按 ScrollTrigger 记录的位置换算：
    // 块 1 紧跟 Hero；块 n(≥2) 在第 n-1 个分割段结束时顶端正好位于屏幕中央
    function chapterTarget(n) {
      var block = blocks[n - 1];
      var offset = (bar ? bar.offsetHeight : 60) + 28;
      if (animOn && (n === 1 || pinTriggers[n - 2])) return blockTop(n) + parseFloat(getComputedStyle(block).paddingTop) - offset;
      var head = block.querySelector('.about-head') || block;
      return head.getBoundingClientRect().top + window.scrollY - offset;
    }

    // 翻页过渡：整屏淡成纸色 → 瞬间跳转 → 淡回
    function jumpTo(y) {
      flip.classList.add('is-on');
      setTimeout(function () {
        window.scrollTo(0, Math.max(0, Math.round(y)));
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { flip.classList.remove('is-on'); });
        });
      }, 190);
    }

    marks.forEach(function (m) {
      m.addEventListener('click', function (e) {
        e.preventDefault();
        jumpTo(chapterTarget(+m.dataset.chapter));
      });
    });
    if (brand) {
      brand.addEventListener('click', function (e) {
        e.preventDefault();
        jumpTo(0);
      });
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    director.request = request;
    update();
  }

  // ========== 右上角的锁：分割段嵌入图开 / 关 ==========
  // 锁着时分割段的钉住时长为 0（见 initAnimations 的 end），嵌入图和遮罩板由 CSS（html.ab-locked）整个藏掉——
  // 分割段那一套（lift / 浮现 / 换章）照旧在跑，只是每段都「一闪而过」，几块内容直接接着往下滚。
  // 切换时：纸色幕布盖住 → 记下屏幕上方那一块的位置 → 切换、重新测量 → 滚到同一块、同一位置 → 掀开幕布。
  // 解开时顺手把嵌入图提前解码（6000 像素宽的大图，第一次露出时才解码会卡住主线程，钉住的上下两块跟着滚轮抖）

  function preloadSplits() {
    [].forEach.call(document.querySelectorAll('.about-split-media img'), function (img) {
      img.loading = 'eager';
      if (img.decode) img.decode().catch(function () { /* 图挂了就算了，展开时照常显示占位 */ });
    });
  }

  function initLock() {
    var btn = document.getElementById('ab-lock-btn');
    var flip = document.getElementById('ab-flip');
    if (!btn) return;
    var blocks = [].slice.call(document.querySelectorAll('.about-block'));

    function paint() {
      var tip = locked ? '已上锁：不显示嵌入图（点击解锁）' : '已解锁：显示嵌入图（点击上锁）';
      btn.classList.toggle('is-unlocked', !locked);
      btn.setAttribute('aria-pressed', String(locked));
      btn.setAttribute('aria-label', tip);   // 只给读屏用；不设 title（不要鼠标悬停的提示框）
    }

    // 屏幕上方（顶在屏幕中线以上）最靠下的那一块，和它的顶此刻在屏幕上的位置；正在分开的分割段里 → 接缝下面那块、顶在屏幕中央
    function anchor() {
      var y = window.scrollY, n = 1, top;
      if (!animOn) {
        blocks.forEach(function (b, i) { if (b.getBoundingClientRect().top <= window.innerHeight * 0.5) n = i + 1; });
        return { n: n, top: blocks[n - 1].getBoundingClientRect().top };
      }
      var open = locked ? -1 : pinTriggers.findIndex(function (st) { return y > st.start && y < st.end; });
      if (open >= 0) return { n: open + 2, top: window.innerHeight / 2 };
      for (var k = 1; k <= blocks.length; k++) {
        if (k > 1 && !pinTriggers[k - 2]) break;
        if (blockTop(k) - y <= window.innerHeight * 0.5) n = k;
      }
      top = blockTop(n) - y;
      return { n: n, top: top };
    }

    function toggle() {
      var a = anchor();
      locked = !locked;
      try { sessionStorage.setItem(LOCK_KEY, locked ? 'shut' : 'open'); } catch (e) { /* 不记也能用 */ }
      document.documentElement.classList.toggle('ab-locked', locked);
      paint();
      if (!locked) preloadSplits();
      if (animOn) {
        ScrollTrigger.refresh();
        window.scrollTo(0, Math.max(0, Math.round(blockTop(a.n) - a.top)));
        ScrollTrigger.update();
      } else {
        window.scrollTo(0, Math.max(0, Math.round(window.scrollY + blocks[a.n - 1].getBoundingClientRect().top - a.top)));
      }
      director.request();
    }

    btn.addEventListener('click', function () {
      if (!flip) return toggle();
      flip.classList.add('is-on');
      setTimeout(function () {
        toggle();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { flip.classList.remove('is-on'); });
        });
      }, 190);
    });
    paint();
    if (!locked) preloadSplits();
  }

  // ========== 工牌上的邮箱：点一下复制（不跳 mailto），按钮上方冒一个小气泡 ==========

  function initCopyLinks() {
    [].forEach.call(document.querySelectorAll('[data-copy]'), function (a) {
      var timer = 0;
      function tip(text) {
        a.setAttribute('data-tip', text);
        a.classList.add('is-tip');
        clearTimeout(timer);
        timer = setTimeout(function () { a.classList.remove('is-tip'); }, 1600);
      }
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var text = a.getAttribute('data-copy');
        var done = function () { tip('已复制邮箱'); };
        var fail = function () { tip(text); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fail);
        else {
          // 旧浏览器 / 非 https：临时文本框 + execCommand
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
          document.body.appendChild(ta);
          ta.select();
          var ok = false;
          try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
          ta.remove();
          (ok ? done : fail)();
        }
      });
    });
  }

  // ========== 工牌彩蛋：长按 3 秒解锁挂式模式 ==========
  // 平时静止（微歪 + 纸胶带）。按住工牌（避开社交按钮）逐级抖动，中途松开/移动即取消；
  // 满 3 秒弹一下进入挂式：工牌挂在图钉 A 下方（绳长 L，伸进块顶留白），仍按着就直接接着拖。
  // 挂式下：Verlet 单摆——位置 = 当前 + (当前 − 上一帧) × 阻尼 + 重力，超出绳长投影回圆周
  // （绳只能拉紧不能拉长，可松弛）；工牌朝向与挂绳一致，绕顶边中点旋转；只在运动时跑 rAF。
  // 恢复正常：点工牌以外 / Esc / 下滑到下一块浮现时（滚动导演调用 badge.reset）。
  // 坐标系：工牌外框 #badge-rig 左上角

  var badge = { hanging: false, reset: function () {} };

  function initBadge() {
    var rig = document.getElementById('badge-rig');
    var card = document.getElementById('idcard');
    if (!rig || !card) return;
    var path = document.getElementById('lanyard-path');
    var pin = rig.querySelector('.about-lanyard-pin');

    var HOLD_MS = 3000;
    var DAMP = reduceMotion ? 0.86 : 0.986; // 每帧保留的速度比例
    var GRAVITY = 1.1;                      // px/帧²，配合绳长约 1.1s 一个摆动周期
    var MAX_PULL = 1.35;                    // 拖动时最多把绳子"拽长"到 1.35 倍（松手后弹回）
    var REST_DEG = -1.2;                    // 平时的歪角（与 CSS 一致）
    var A = { x: 0, y: 0 }, P0 = { x: 0, y: 0 }, L = 0;
    var P = { x: 0, y: 0 }, prev = { x: 0, y: 0 };
    var press = null, dragging = null, running = false;

    function layout() {
      L = parseFloat(getComputedStyle(rig).getPropertyValue('--lanyard')) || 108;
      P0 = { x: card.offsetLeft + card.offsetWidth / 2, y: card.offsetTop };
      A = { x: P0.x, y: P0.y - L };
      pin.style.left = A.x + 'px';
      pin.style.top = A.y + 'px';
    }

    function render() {
      var dx = P.x - A.x, dy = P.y - A.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      // 工牌朝向挂绳：上边中点指向图钉
      var angle = -Math.atan2(dx, dy) * 180 / Math.PI;
      card.style.transform = 'translate(' + (P.x - P0.x).toFixed(2) + 'px,' + (P.y - P0.y).toFixed(2) + 'px) rotate(' + angle.toFixed(2) + 'deg)';
      // 挂绳：绷紧时是直线，松弛时向下垂
      var sag = Math.max(0, L - d) * 0.7;
      var qx = (A.x + P.x) / 2, qy = (A.y + P.y) / 2 + sag;
      path.setAttribute('d', 'M' + A.x.toFixed(1) + ' ' + A.y.toFixed(1) + ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + P.x.toFixed(1) + ' ' + P.y.toFixed(1));
    }

    function constrain(max) {
      var dx = P.x - A.x, dy = P.y - A.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > max) { P.x = A.x + dx / d * max; P.y = A.y + dy / d * max; }
    }

    function step() {
      if (!badge.hanging) { running = false; return; }
      if (!dragging) {
        var vx = (P.x - prev.x) * DAMP, vy = (P.y - prev.y) * DAMP;
        prev.x = P.x; prev.y = P.y;
        P.x += vx;
        P.y += vy + GRAVITY;
        constrain(L);
      }
      render();
      var still = Math.abs(P.x - P0.x) < 0.25 && Math.abs(P.y - P0.y) < 0.25 &&
        Math.abs(P.x - prev.x) < 0.03 && Math.abs(P.y - prev.y) < 0.03;
      if (!dragging && still) {
        P.x = prev.x = P0.x; P.y = prev.y = P0.y;
        render();
        running = false;
        return;
      }
      requestAnimationFrame(step);
    }

    function run() {
      if (!running) { running = true; requestAnimationFrame(step); }
    }

    function local(e) {
      var r = rig.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function startDrag(e) {
      var p = local(e);
      dragging = { id: e.pointerId, ox: p.x - P.x, oy: p.y - P.y };
      card.classList.add('is-dragging');
      prev.x = P.x; prev.y = P.y;
      run();
    }

    // ---- 长按 ----
    function cancelPress() {
      if (!press) return;
      clearInterval(press.timer);
      press = null;
      card.classList.remove('is-pressing');
      delete card.dataset.shake;
    }

    function unlock(e) {
      cancelPress();
      layout();
      badge.hanging = true;
      card.classList.remove('is-returning');
      rig.classList.add('is-hanging');
      // 弹一下（scale 独立属性，与物理写入的 transform 叠加）
      card.classList.remove('is-pop');
      void card.offsetWidth;
      card.classList.add('is-pop');
      P.x = P0.x; P.y = P0.y;
      render();
      startDrag(e); // 还按着就直接接着拖
      prev.x = P.x - (reduceMotion ? 0 : 2.6); // 带一点初速度：松手后轻轻晃起来
    }

    // ---- 恢复正常 ----
    badge.reset = function () {
      if (!badge.hanging) return;
      badge.hanging = false;
      dragging = null;
      running = false;
      card.classList.remove('is-dragging', 'is-pop');
      rig.classList.remove('is-hanging');
      // 与 CSS 平时态同一套函数列表，过渡才能逐项插值
      card.classList.add('is-returning');
      card.style.transform = 'translate(0px, 0px) rotate(' + REST_DEG + 'deg)';
      setTimeout(function () {
        if (badge.hanging) return;
        card.classList.remove('is-returning');
        card.style.transform = '';
      }, 650);
    };

    // 弹一下播完就把 is-pop 去掉：ScrollTrigger 刷新时会把钉住的那一对块移出文档再放回去，类还在的话"弹一下"会从头再播一遍
    card.addEventListener('animationend', function (e) {
      if (e.animationName === 'ab-pop') card.classList.remove('is-pop');
    });

    card.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('a, button')) return; // 社交按钮照常点击
      card.setPointerCapture(e.pointerId);
      if (badge.hanging) {
        startDrag(e);
        e.preventDefault();
        return;
      }
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, t0: Date.now() };
      card.dataset.shake = '1';
      card.classList.add('is-pressing');
      press.timer = setInterval(function () {
        var t = Date.now() - press.t0;
        card.dataset.shake = t > 2000 ? '3' : t > 1000 ? '2' : '1';
        if (t >= HOLD_MS) unlock(e);
      }, 100);
    });

    card.addEventListener('pointermove', function (e) {
      if (press && e.pointerId === press.id) {
        // 明显移动就不算长按（比如其实是想滚动页面）
        if (Math.abs(e.clientX - press.x) > 8 || Math.abs(e.clientY - press.y) > 8) cancelPress();
        return;
      }
      if (!dragging || e.pointerId !== dragging.id) return;
      var p = local(e);
      prev.x = P.x; prev.y = P.y;
      P.x = p.x - dragging.ox;
      P.y = p.y - dragging.oy;
      constrain(L * MAX_PULL);
    });

    function release(e) {
      if (press && e.pointerId === press.id) cancelPress();
      if (!dragging || e.pointerId !== dragging.id) return;
      dragging = null;
      card.classList.remove('is-dragging');
      // prev 保留最后一次移动前的位置：松手时的速度延续为甩出去的惯性
      run();
    }
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    // 长按 / 挂式期间屏蔽系统菜单（移动端长按会弹出）
    card.addEventListener('contextmenu', function (e) {
      if (press || badge.hanging) e.preventDefault();
    });

    // 点工牌以外任何地方 / Esc：恢复正常
    document.addEventListener('pointerdown', function (e) {
      if (badge.hanging && !card.contains(e.target)) badge.reset();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') badge.reset();
    });

    // 挂式时每次滚进视口轻轻晃一下（减少动态时不晃）
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var kick = 1;
      new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || !badge.hanging || dragging) return;
        prev.x = P.x - 3.2 * kick;
        prev.y = P.y;
        kick = -kick;
        run();
      }, { threshold: 0.35 }).observe(card);
    }

    window.addEventListener('resize', function () {
      if (badge.hanging && !dragging) { layout(); P.x = prev.x = P0.x; P.y = prev.y = P0.y; render(); }
    });
    layout();
  }

  // ========== 自我介绍信笺：收着的信，点一下从信封里抽出来 ==========
  // 平时信纸下半截插在信封里，只露出信头、称呼和前几行。收起时的块高按工牌算：两栏时让下面 GitHub 打卡本的下沿和工牌下沿差不多齐，
  // 单栏（手机）时露 400 左右。点信纸 / 信封正中朝下的小三角：信封往下退、信纸整张露出来，再盖到信封前面、信封缩回去一截；
  // 再点（这时朝上）或在信纸以外的地方按一下收起，反过来。信纸插在信封里 = 裁掉信封口以下的部分（信封口 = 块高 − ENV，about.css .ab-letter-env）。
  // 展开 / 收起之后块高变了：刷新 ScrollTrigger（分割段、跳章的位置跟着变）。
  // 动画模式下：第一次进入视野时信纸从信封口升到收着的位置；第一次展开时格言一行一行写出来。其余情况直接切换、格言直接在。
  function initIntroLetter() {
    var card = document.getElementById('ab-letter');
    if (!card) return;
    var paper = card.querySelector('.ab-letter-paper');
    var motto = card.querySelectorAll('.ab-letter-motto span');
    var btn = card.querySelector('.ab-letter-toggle');
    var idcard = document.getElementById('idcard');
    var heat = document.querySelector('.about-profile-main .about-heatmap-panel');
    var ENV = 74, UNDER = 30;                  // 信封高 / 展开时信纸盖住信封上沿的那一截
    var smooth = animOn && !!paper.animate;
    var open = false, busy = false, signed = !smooth, foldH = 0;
    var inOut3 = function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
    var out2 = function (u) { return 1 - (1 - u) * (1 - u); };

    function fullH() { return paper.offsetHeight + ENV - UNDER; }
    function calcFold() {
      var cr = card.getBoundingClientRect(), h;
      if (idcard && heat && idcard.getBoundingClientRect().right <= cr.left) {
        var gap = parseFloat(getComputedStyle(card).marginBottom) + parseFloat(getComputedStyle(heat).marginTop);
        h = idcard.getBoundingClientRect().bottom - cr.top - gap - heat.offsetHeight;
      } else {
        h = 400 + ENV - UNDER;
      }
      return Math.round(Math.max(240, Math.min(fullH(), h)));
    }
    // 块高设成 H（null = 按内容）；cut：信纸在信封口处裁开（插在信封里），否则整张盖在信封前面
    function setBox(H, cut) {
      card.style.height = H == null ? '' : H + 'px';
      paper.style.clipPath = cut ? 'inset(-40px -40px ' + Math.max(0, paper.offsetHeight - (H - ENV)) + 'px -40px)' : '';
    }
    // 标成展开 / 收着（isOpen）：信走到头了才标——三角跟着信封走到底（顶）再转过去（朝上 / 朝下由 CSS 按 is-folded 画，带转动过渡）
    function label(isOpen) {
      card.classList.toggle('is-folded', !isOpen);
      if (btn) {
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        btn.setAttribute('aria-label', isOpen ? '收起信' : '展开信');
      }
    }
    function refresh() { if (animOn) ScrollTrigger.refresh(); }
    // 走到头：先刷新 ScrollTrigger（它会把钉住的那一对块移出文档再放回去，放回去的元素不走过渡），
    // 再读一次三角现在的样子（定下转动的起点），然后才换方向，三角才是转过去的
    function arrive(isOpen) {
      refresh();
      if (btn) getComputedStyle(btn, '::before').transform;
      label(isOpen);
    }
    function tween(a, b, dur, ease, fn, done) {
      var t0 = performance.now();
      requestAnimationFrame(function f(now) {
        var u = Math.min(1, (now - t0) / dur);
        fn(a + (b - a) * ease(u));
        if (u < 1) requestAnimationFrame(f); else done();
      });
    }
    // 格言一行一行从左往右写出来（裁切框四周放宽半个字高，花体的起笔、字脚伸出行盒也不被裁）
    function sign() {
      if (signed) return;
      signed = true;
      card.classList.add('is-signed');
      [].forEach.call(motto, function (line, i) {
        line.animate([{ clipPath: 'inset(-0.5em 100% -0.5em -0.5em)' }, { clipPath: 'inset(-0.5em -0.5em -0.5em -0.5em)' }], { duration: 1200, easing: 'cubic-bezier(0.45, 0.05, 0.4, 1)', delay: 150 + i * 1250, fill: 'backwards' });
      });
    }
    function toggle() {
      if (busy) return;
      if (!smooth) {
        open = !open;
        setBox(open ? null : foldH, !open);
        label(open);
        refresh();
        return;
      }
      busy = true;
      var out = paper.offsetHeight + ENV; // 信封口正好退到信纸下沿：信纸整张露出来
      if (!open) {
        tween(foldH, out, 640, inOut3, function (h) { setBox(h, true); }, function () {
          tween(out, out - UNDER, 260, out2, function (h) { setBox(h, false); }, function () {
            setBox(null, false);
            busy = false;
            open = true;
            arrive(true);
            sign();
          });
        });
      } else {
        tween(out - UNDER, out, 200, out2, function (h) { setBox(h, false); }, function () {
          tween(out, foldH, 580, inOut3, function (h) { setBox(h, true); }, function () {
            open = busy = false;
            arrive(false);
          });
        });
      }
    }
    // 窗口宽度 / 字体变了：重新算收起的高度；信纸高度变了（字体后加载、换行）也要重新裁，裁切线才一直在信封口上
    function refit() {
      if (busy || open) return;
      var h = calcFold();
      setBox(h, true);
      if (h !== foldH) {
        foldH = h;
        refresh();
      }
    }

    foldH = calcFold();
    if (foldH >= fullH() - 40) {
      // 信本来就不长，不用收
      card.classList.add('is-out', 'is-signed');
      return;
    }
    card.classList.add('is-foldable');
    setBox(foldH, true);
    label(false);
    if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    paper.addEventListener('click', function () { if (!open) toggle(); });
    // 展开着的时候，在信纸以外的地方：鼠标一按下就收回去；触屏点一下才收（免得一碰屏幕滚动就收了）。
    // 鼠标按下就收：长按工牌变挂式时，信在按住的那几秒里就收好了，不会等松手才收、挂起来以后版面再动。
    // 点信纸本身不收；小三角自己处理（按下时不收，点击不冒泡到这里）
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button === 0 && open && !busy && !paper.contains(e.target) && !(btn && btn.contains(e.target))) toggle();
    });
    document.addEventListener('click', function (e) {
      if (open && !busy && !paper.contains(e.target)) toggle();
    });
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(refit, 200); });
    if (document.fonts) document.fonts.ready.then(refit);
    if (window.ResizeObserver) new ResizeObserver(function () { if (!open && !busy) setBox(foldH, true); }).observe(paper);

    if (!smooth || !('IntersectionObserver' in window)) {
      card.classList.add('is-out', 'is-signed');
      return;
    }
    // 第一次进入视野：信纸从信封口升到收着的位置（裁切线始终钉在信封口上：下面裁掉 P − 露出的高度 + 位移）
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var slot = foldH - ENV, P = paper.offsetHeight;
      var at = function (ty) { return { transform: 'translateY(' + ty + 'px)', clipPath: 'inset(-40px -40px ' + (P - slot + ty) + 'px -40px)' }; };
      card.classList.add('is-out');
      paper.animate([at(slot), at(0)], { duration: 1100, easing: 'cubic-bezier(0.25, 0.1, 0.3, 1)' });
    }, { threshold: 0.3 });
    io.observe(card);
  }

  // ========== 摄影磁贴：照片轮换 ==========
  // 每 4.5 秒交叉淡入下一张（当前那张慢慢推近），右下角小圆点跟着走；悬停时暂停，离开视野时也不转

  function initPhotoTile() {
    [].forEach.call(document.querySelectorAll('.about-bento-slides'), function (box) {
      var cell = box.parentNode;
      var slides = [].slice.call(box.querySelectorAll('.about-bento-slide'));
      var dots = [].slice.call(cell.querySelectorAll('.about-bento-dots span'));
      if (slides.length < 2) return;
      var k = 0, hover = false, seen = true;
      function show(n) {
        slides[k].classList.remove('is-on');
        if (dots[k]) dots[k].classList.remove('is-on');
        k = n;
        slides[k].classList.add('is-on');
        if (dots[k]) dots[k].classList.add('is-on');
      }
      cell.addEventListener('pointerenter', function () { hover = true; });
      cell.addEventListener('pointerleave', function () { hover = false; });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { seen = entries[0].isIntersecting; }).observe(cell);
      }
      setInterval(function () {
        if (hover || !seen || document.hidden) return;
        show((k + 1) % slides.length);
      }, 4500);
    });
  }

  // ========== 胡思乱想：便签本翻页 ==========
  // 进来时随机翻到某一页；页脚细线（CSS 动画 9s）走完 → 把这页往上翻过去：克隆当前页盖在最上面做翻页动画，
  // 底下这页直接换成下一条。悬停 / 离开视野 / 切到别的标签页时细线停住；「翻一页」手动翻。减少动态：不翻，直接换字

  function initMuse() {
    var box = document.getElementById('muse');
    if (!box) return;
    var pad = box.querySelector('.about-muse-pad'), sheet = box.querySelector('.about-muse-sheet');
    var texts = [].slice.call(box.querySelectorAll('.about-muse-text'));
    var num = box.querySelector('.about-muse-i'), bar = box.querySelector('.about-muse-timer i'), btn = box.querySelector('.about-muse-next');
    var n = texts.length;
    if (n < 2) return;
    var k = 0, hover = false, seen = !('IntersectionObserver' in window), busy = false;
    function set(i) {
      texts[k].classList.remove('is-on');
      texts[k].setAttribute('aria-hidden', 'true');
      k = i;
      texts[k].classList.add('is-on');
      texts[k].removeAttribute('aria-hidden');
      num.textContent = pad2(k + 1);
    }
    function hold() { box.classList.toggle('is-hold', hover || !seen || document.hidden); }
    function restart() {
      box.classList.remove('is-run');
      void bar.offsetWidth;
      box.classList.add('is-run');
    }
    function flip() {
      if (busy) return;
      var next = (k + 1) % n;
      if (reduceMotion) { set(next); restart(); return; }
      busy = true;
      var leaf = sheet.cloneNode(true);
      leaf.classList.add('is-leaf');
      leaf.setAttribute('aria-hidden', 'true');
      leaf.inert = true;
      pad.appendChild(leaf);
      set(next);
      restart();
      leaf.addEventListener('animationend', function (e) {
        if (e.target !== leaf || e.animationName !== 'ab-muse-flip') return;
        leaf.remove();
        busy = false;
      });
    }
    set(Math.floor(Math.random() * n));
    bar.addEventListener('animationend', flip);
    if (btn) btn.addEventListener('click', flip);
    pad.addEventListener('pointerenter', function () { hover = true; hold(); });
    pad.addEventListener('pointerleave', function () { hover = false; hold(); });
    document.addEventListener('visibilitychange', hold);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { seen = entries[0].isIntersecting; hold(); }).observe(pad);
    }
    hold();
    restart();
  }

  // ========== 写作账本 + 今日特调 ==========
  // 数据来自 /about/ledger.json（hexo 生成时由 scripts/about-ledger.js 从全部文章里算好）：
  //   { posts, words, first, last, years: { 年份: 篇数 }, list: [{ t 标题, u 链接, d 日期, c 分类, w 字数, x 摘要 }] }
  // 拿不到数据时：账本停在"—"，今日特调停在页面里写死的那杯（POSTS 第一篇），「换一杯」保持禁用

  function loadLedger() {
    if (!window.fetch) return Promise.reject(new Error('no fetch'));
    return fetch('/about/ledger.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function parseYmd(s) {
    var p = String(s).split('.');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayDate() {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  // 写作账本：数据到了先把柱子和数字准备好；小票进入视野时柱子长起来、数字从 0 滚上去（静态模式直接显示终值）
  function initLedger(d) {
    var box = document.getElementById('ledger');
    if (!box) return;
    var today = todayDate();
    var $ = function (id) { return document.getElementById(id); };

    var w = d.words, wan = w >= 10000;
    var days = Math.max(0, Math.round((today - parseYmd(d.last)) / 864e5));
    var yrs = (today - parseYmd(d.first)) / (365.25 * 864e5);
    var figs = [
      { el: $('lg-posts'), to: d.posts, dec: 0 },
      { el: $('lg-words'), to: wan ? w / 10000 : w, dec: wan ? 1 : 0 },
      { el: $('lg-last'), to: days, dec: 0 },
      { el: $('lg-years'), to: yrs, dec: 1 }
    ];
    $('lg-words-u').textContent = wan ? '万字' : '字';
    if (days === 0) { figs[2].text = '今天'; $('lg-last-u').textContent = ''; }
    $('lg-asof').textContent = '截至 ' + today.getFullYear() + '.' + pad2(today.getMonth() + 1) + '.' + pad2(today.getDate());

    // 每年篇数：从动笔那年排到今年（没写的年份也占一格）
    var bars = $('lg-years-bars'), y0 = parseYmd(d.first).getFullYear(), y1 = today.getFullYear(), max = 1, html = '';
    for (var y = y0; y <= y1; y++) max = Math.max(max, d.years[y] || 0);
    for (var y2 = y0, k = 0; y2 <= y1; y2++, k++) {
      var n = d.years[y2] || 0;
      html += '<span class="about-ledger-bar" style="--h:0;--k:' + k + '" data-h="' + (n / max).toFixed(3) + '" title="' + y2 + ' 年 · ' + n + ' 篇">' +
        '<em>' + n + '</em><i></i><b>\'' + String(y2).slice(2) + '</b></span>';
    }
    bars.innerHTML = html;

    function show(f, v) { f.el.textContent = f.text && v === f.to ? f.text : v.toFixed(f.dec); }
    function play() {
      [].forEach.call(bars.children, function (b) { b.style.setProperty('--h', b.dataset.h); });
      if (!animOn) { figs.forEach(function (f) { show(f, f.to); }); return; }
      var t0 = performance.now();
      (function frame(t) {
        var e = Math.min(1, (t - t0) / 1100), q = 1 - Math.pow(1 - e, 3);
        figs.forEach(function (f) { show(f, e < 1 ? f.to * q : f.to); });
        if (e < 1) requestAnimationFrame(frame);
      })(t0);
    }
    if (!animOn || !('IntersectionObserver' in window)) { play(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); play(); }
    }, { threshold: 0.5 });
    io.observe(box);
  }

  // 今日特调：分类 → 饮品名；每天按日期固定抽一杯（同一天打开都一样），「换一杯」随机抽另一杯
  var DRINKS = {
    '辉夜の编程之路': '代码冷萃',
    '辉夜の软件工程之路': '架构美式',
    '辉夜の集成电路之路': '硅晶浓缩',
    '辉夜の生活碎片': '日常拿铁',
    '摸点同人文': '萤火气泡水',
    '国G杂谈': '旮旯抹茶',
    'Minecraft服务器': '方块可可'
  };

  function hash32(x) {
    x = Math.imul((x >>> 16) ^ x, 0x45d9f3b);
    x = Math.imul((x >>> 16) ^ x, 0x45d9f3b);
    return ((x >>> 16) ^ x) >>> 0;
  }

  function initSpecial(d) {
    var cell = document.getElementById('special');
    if (!cell || !d.list || !d.list.length) return;
    var list = d.list, n = list.length;
    var $ = function (id) { return document.getElementById(id); };
    var menu = $('special-menu'), board = cell.querySelector('.about-special-board'), btn = $('special-reroll');
    var today = todayDate();
    var k = hash32(today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()) % n;
    $('special-date').textContent = ' · ' + pad2(today.getMonth() + 1) + '.' + pad2(today.getDate());

    function words(w) { return w >= 1000 ? (w / 1000).toFixed(1) + 'k' : String(w); }
    function fill(i) {
      var p = list[i];
      $('special-no').textContent = 'No.' + pad2(i + 1) + ' / ' + n;
      $('special-drink').textContent = DRINKS[p.c] || '店长特调';
      $('special-cat').textContent = p.c || '未分类';
      $('special-link').textContent = p.t;
      $('special-link').href = p.u;
      $('special-link').title = p.t;
      $('special-go').href = p.u;
      $('special-desc').textContent = p.x || '这篇没写摘要，店长说喝了就知道。';
      $('special-meta').textContent = p.d + ' · 约 ' + words(p.w) + ' 字 · ' + Math.max(1, Math.round(p.w / 300)) + ' 分钟';
    }
    fill(k);
    btn.disabled = false;

    var busy = false;
    btn.addEventListener('click', function () {
      if (busy || n < 2) return;
      var j = Math.floor(Math.random() * (n - 1));
      k = j >= k ? j + 1 : j; // 抽到的一定和当前这杯不同
      if (reduceMotion) { fill(k); return; }
      busy = true;
      board.classList.remove('is-wobble');
      void board.offsetWidth;
      board.classList.add('is-wobble');
      menu.classList.add('is-out');
      setTimeout(function () {
        fill(k);
        menu.classList.remove('is-out');
        busy = false;
      }, 230);
    });
  }

  // ========== 店内 BGM：页眉头像左侧的唱片 + 弹出式播放器 ==========
  // 平时唱片坐在头像左边；点唱片：唱片落进弹出的面板，头像与文字挪回原位；点唱片弹出面板（再点 / 点面板外 / Esc / 页眉收起时收回，音乐不停）。
  // 曲目在 data-tracks（JSON）。首次播放某首时整段下载成 blob 再播——本地 hexo-server 不支持 Range，
  // 直接用文件地址无法跳转进度。Web Audio 取频谱：低/中/高三段写进 --lo/--mid/--hi 驱动背景光晕，
  // 低频冲击（高出慢速均值的部分）写进 --beat 驱动亮度与外发光

  var player = { isOpen: false, close: function () {} };

  function initPlayer() {
    var root = document.getElementById('ab-player');
    if (!root) return;
    var tracks = [];
    try { tracks = JSON.parse(root.dataset.tracks) || []; } catch (e) { tracks = []; }
    if (!tracks.length) return;

    var bar = document.getElementById('ab-bar');
    var disc = root.querySelector('.ab-player-disc');
    var coverImg = root.querySelector('.ab-player-cover img');
    var bg = root.querySelector('.ab-player-bg');
    var btnPlay = root.querySelector('.ab-player-play');
    var prog = root.querySelector('.ab-player-progress');
    var title = root.querySelector('.ab-player-title');
    var time = root.querySelector('.ab-player-time');

    var audio = new Audio();
    var idx = 0, loadedIdx = -1, blobs = {};
    var ctx = null, analyser = null, freq = null, raf = 0, seeking = false;
    var bassAvg = 0, lv = { lo: 0, mid: 0, hi: 0, beat: 0 };

    function fmt(s) {
      if (!isFinite(s)) return '0:00';
      s = Math.max(0, Math.floor(s));
      return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    }

    function paintProgress() {
      var d = audio.duration;
      var p = isFinite(d) && d > 0 ? audio.currentTime / d : 0;
      prog.style.setProperty('--p', (p * 100).toFixed(2) + '%');
      prog.setAttribute('aria-valuenow', Math.round(p * 100));
      time.textContent = fmt(audio.currentTime) + (isFinite(d) ? ' / ' + fmt(d) : '');
    }

    function showTrack(i) {
      var t = tracks[i];
      title.textContent = t.title;
      title.title = t.title + (t.artist ? ' · ' + t.artist : '');
      coverImg.src = t.cover;
      bg.style.backgroundImage = 'url(' + t.cover + ')';
    }

    // 取得第 i 首的 blob 地址（下载一次后缓存）
    function blobOf(i) {
      var src = tracks[i].src;
      if (blobs[src]) return Promise.resolve(blobs[src]);
      return fetch(src)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.blob();
        })
        .then(function (b) { return (blobs[src] = URL.createObjectURL(b)); });
    }

    function ensureGraph() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (ctx || !AC) return;
      ctx = new AC();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      analyser.minDecibels = -82;
      analyser.maxDecibels = -16;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    }

    function play() {
      ensureGraph();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      var ready = loadedIdx === idx ? Promise.resolve() : blobOf(idx).then(function (url) {
        audio.src = url;
        loadedIdx = idx;
      });
      root.classList.add('is-loading');
      ready.then(function () {
        root.classList.remove('is-loading');
        return audio.play();
      }).catch(function () {
        root.classList.remove('is-loading');
        time.textContent = '加载失败';
      });
    }

    function go(i) {
      idx = (i + tracks.length) % tracks.length;
      audio.pause();
      showTrack(idx);
      prog.style.setProperty('--p', '0%');
      time.textContent = '0:00';
      play();
    }

    // 音频响应：三个频段 + 低频冲击，快起慢落
    function band(lo, hi) {
      var s = 0;
      for (var j = lo; j < hi; j++) s += freq[j];
      return s / (hi - lo) / 255;
    }

    function ease(key, target) {
      lv[key] += (target - lv[key]) * (target > lv[key] ? 0.5 : 0.1);
    }

    function draw() {
      raf = 0;
      var playing = !audio.paused;
      var lo = 0, mid = 0, hi = 0, beat = 0;
      if (playing && analyser && !reduceMotion) {
        analyser.getByteFrequencyData(freq);
        lo = band(0, 4);
        mid = band(4, 24);
        hi = Math.min(1, band(24, 80) * 1.8);
        bassAvg += (lo - bassAvg) * 0.06;
        beat = Math.min(1, Math.max(0, lo - bassAvg) * 6);
      }
      ease('lo', lo); ease('mid', mid); ease('hi', hi); ease('beat', beat);
      root.style.setProperty('--lo', lv.lo.toFixed(3));
      root.style.setProperty('--mid', lv.mid.toFixed(3));
      root.style.setProperty('--hi', lv.hi.toFixed(3));
      root.style.setProperty('--beat', lv.beat.toFixed(3));
      var moving = lv.lo + lv.mid + lv.hi + lv.beat > 0.004;
      if (playing || moving) raf = requestAnimationFrame(draw);
    }

    function kick() { if (!raf) raf = requestAnimationFrame(draw); }

    audio.addEventListener('play', function () {
      root.classList.add('is-playing');
      btnPlay.setAttribute('aria-label', '暂停');
      kick();
    });
    audio.addEventListener('pause', function () {
      root.classList.remove('is-playing');
      btnPlay.setAttribute('aria-label', '播放');
      kick();
    });
    audio.addEventListener('ended', function () { go(idx + 1); });
    audio.addEventListener('timeupdate', function () { if (!seeking) paintProgress(); });
    audio.addEventListener('loadedmetadata', paintProgress);

    // ---- 面板开合 ----
    function setOpen(on) {
      player.isOpen = on;
      root.classList.toggle('is-open', on);
      bar.classList.toggle('is-player-open', on); // 头像与文字随之挪回原位 / 让位
      disc.setAttribute('aria-expanded', on ? 'true' : 'false');
      disc.setAttribute('aria-label', on ? '收起店内 BGM' : '打开店内 BGM');
    }
    player.close = function () { if (player.isOpen) setOpen(false); };
    // 给背景咖啡厅的唱片机用：开关播放、是否在放、低频冲击（0 ~ 1）
    player.toggle = function () {
      if (root.classList.contains('is-loading')) return;
      if (audio.paused) play(); else audio.pause();
    };
    player.playing = function () { return !audio.paused; };
    player.beat = function () { return lv.beat; };

    disc.addEventListener('click', function () { setOpen(!player.isOpen); });
    document.addEventListener('pointerdown', function (e) {
      if (player.isOpen && !root.contains(e.target)) setOpen(false);
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') player.close();
    });

    // ---- 播放控制 ----
    btnPlay.addEventListener('click', function () {
      if (root.classList.contains('is-loading')) return;
      if (audio.paused) play(); else audio.pause();
    });
    root.querySelector('.ab-player-next').addEventListener('click', function () { go(idx + 1); });
    root.querySelector('.ab-player-prev').addEventListener('click', function () {
      // 播过 3 秒回到开头，否则上一首
      if (audio.currentTime > 3 && loadedIdx === idx) { audio.currentTime = 0; paintProgress(); }
      else go(idx - 1);
    });

    // ---- 进度：点击 / 拖动跳转；键盘 ←/→ 各 5 秒 ----
    function seekTo(e) {
      if (!isFinite(audio.duration)) return;
      var r = prog.getBoundingClientRect();
      audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * audio.duration;
      paintProgress();
    }
    prog.addEventListener('pointerdown', function (e) {
      if (!isFinite(audio.duration)) return;
      seeking = true;
      prog.setPointerCapture(e.pointerId);
      seekTo(e);
    });
    prog.addEventListener('pointermove', function (e) { if (seeking) seekTo(e); });
    prog.addEventListener('pointerup', function () { seeking = false; });
    prog.addEventListener('pointercancel', function () { seeking = false; });
    prog.addEventListener('keydown', function (e) {
      if (!isFinite(audio.duration)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + (e.key === 'ArrowRight' ? 5 : -5)));
        paintProgress();
      }
    });

    showTrack(0);
  }

  // ========== 运行天数 ==========

  function initRuntime() {
    [['about-runtime', BLOG_START], ['about-firefly', FIREFLY_MET]].forEach(function (d) {
      var el = document.getElementById(d[0]);
      if (el) el.textContent = Math.floor((Date.now() - new Date(d[1]).getTime()) / 86400000);
    });
  }

  // ========== GitHub 热力图 ==========
  // 数据来自 GitHub 个人页贡献图：私有仓库贡献是否计入，
  // 由 GitHub 账号设置决定（Settings → Profile → Include private contributions）

  function initHeatmap() {
    var box = document.getElementById('github-heatmap');
    if (!box) return;
    var user = box.dataset.user;

    fetch('https://github-contributions-api.jogruber.de/v4/' + user + '?y=last')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var days = data.contributions;
        var pad = new Date(days[0].date + 'T00:00:00').getDay();
        var cols = Math.ceil((pad + days.length) / 7);

        // 列主序填充，每列 8 格：第 0 行月份刻度 + 周日到周六；第 0 列是星期刻度
        var grid = document.createElement('div');
        grid.className = 'about-heatmap-grid';
        grid.style.setProperty('--cols', cols);

        ['', '', '一', '', '三', '', '五', ''].forEach(function (t) {
          var wd = document.createElement('span');
          wd.className = 'about-heatmap-wd';
          wd.textContent = t;
          grid.appendChild(wd);
        });

        var prevMonth = -1;
        for (var c = 0; c < cols; c++) {
          // 月份刻度：本列首个真实日期换月时标注；首列若只剩半个月、末两列放不下文字则不标
          var head = days[Math.max(0, c * 7 - pad)];
          var headDate = new Date(head.date + 'T00:00:00');
          var month = headDate.getMonth();
          var label = document.createElement('span');
          label.className = 'about-heatmap-month';
          if (month !== prevMonth && c < cols - 2 && !(c === 0 && headDate.getDate() > 14)) {
            label.textContent = (month + 1) + '月';
          }
          prevMonth = month;
          grid.appendChild(label);

          for (var r = 0; r < 7; r++) {
            var i = c * 7 + r - pad;
            var cell = document.createElement('span');
            cell.className = 'about-heatmap-cell';
            if (i < 0 || i >= days.length) {
              cell.style.visibility = 'hidden';
            } else {
              cell.dataset.level = days[i].level;
              cell.title = days[i].date + ' · ' + days[i].count + ' 次贡献';
            }
            grid.appendChild(cell);
          }
        }

        // 统计：年度总数 / 最长连续天数 / 单日最多
        var streak = 0, best = 0, max = 0, sum = 0;
        days.forEach(function (d) {
          sum += d.count;
          streak = d.count > 0 ? streak + 1 : 0;
          if (streak > best) best = streak;
          if (d.count > max) max = d.count;
        });
        var stats = { 'hm-total': (data.total && data.total.lastYear) || sum, 'hm-streak': best, 'hm-max': max };
        Object.keys(stats).forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = stats[id];
        });

        box.innerHTML = '';
        box.appendChild(grid);
        // 默认滚到最右（最近的周）
        box.scrollLeft = box.scrollWidth;
        // 骨架与真实网格同结构，高度几乎不变；周数不同会有像素级差异，仍重新测量一次分割段
        if (animOn) ScrollTrigger.refresh();
      })
      .catch(function () {
        // 保留骨架网格占位（不让面板塌陷打乱分割段位置），在下方补一行提示
        box.insertAdjacentHTML('beforeend', '<p class="about-heatmap-loading">贡献数据加载失败，' +
          '<a href="https://github.com/' + user + '" target="_blank" rel="noopener">去 GitHub 看看</a></p>');
        if (animOn) ScrollTrigger.refresh();
      });
  }

  // ========== 回忆录：手帐本翻页 ==========
  // 一段回忆一个跨页（左页照片、右页故事，故事文字按 MEMOIR_QUOTES 填）。往后翻：右页绕书脊翻到左边——
  // 把当前右页和下一跨页的左页各克隆一份，做成一张两面的「纸」转 180°；底下同时露出「当前左页 + 下一跨页右页」，
  // 转完换成下一跨页。往前翻反过来。点右半边 / 下一页 / → 往后，左半边 / 上一页 / ← 往前；手机上下两页，直接切换

  function initMemoBook() {
    var book = document.getElementById('memo-book');
    if (!book) return;
    var pages = book.querySelector('.mj-pages'), spreads = [].slice.call(book.querySelectorAll('.mj-spread'));
    var count = book.querySelector('.mj-count'), prevBtn = book.querySelector('.mj-prev'), nextBtn = book.querySelector('.mj-next');
    var n = spreads.length, k = 0, busy = false, narrow = window.matchMedia('(max-width: 768px)');
    if (!n) return;

    [].forEach.call(book.querySelectorAll('.mj-text'), function (el) {
      var q = MEMOIR_QUOTES[(parseInt(el.dataset.memoir, 10) || 0) % MEMOIR_QUOTES.length];
      q.lines.forEach(function (line) {
        var p = document.createElement('p');
        p.textContent = line;
        el.appendChild(p);
      });
      var src = document.createElement('p');
      src.className = 'mj-src';
      src.textContent = '—— ' + q.source;
      el.appendChild(src);
    });

    function paint() {
      spreads.forEach(function (s, i) {
        s.classList.toggle('is-on', i === k);
        s.classList.remove('show-left', 'show-right');
      });
      count.textContent = pad2(k + 1) + ' / ' + pad2(n);
      prevBtn.disabled = k === 0;
      nextBtn.disabled = k === n - 1;
    }

    function go(dir) {
      var to = k + dir;
      if (busy || to < 0 || to >= n) return;
      if (reduceMotion || narrow.matches || !pages.animate) { k = to; paint(); return; }
      busy = true;
      var cur = spreads[k], nxt = spreads[to], fwd = dir > 0;
      var leaf = document.createElement('div');
      leaf.className = 'mj-leaf ' + (fwd ? 'is-fwd' : 'is-back');
      var front = (fwd ? cur.querySelector('.mj-right') : cur.querySelector('.mj-left')).cloneNode(true);
      var back = (fwd ? nxt.querySelector('.mj-left') : nxt.querySelector('.mj-right')).cloneNode(true);
      front.classList.add('mj-face', 'mj-front');
      back.classList.add('mj-face', 'mj-back');
      leaf.appendChild(front);
      leaf.appendChild(back);
      // 底下：往后翻 = 当前左页 + 下一跨页右页；往前翻 = 上一跨页左页 + 当前右页
      cur.classList.remove('is-on');
      cur.classList.add(fwd ? 'show-left' : 'show-right');
      nxt.classList.add(fwd ? 'show-right' : 'show-left');
      pages.appendChild(leaf);
      var ang = fwd ? -180 : 180;
      var anim = leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(' + ang + 'deg)' }], { duration: 760, easing: 'cubic-bezier(0.45, 0.05, 0.35, 1)', fill: 'forwards' });
      // 翻起来的时候纸面暗一点，快躺平时再亮回来
      var t0 = performance.now();
      (function shade() {
        var p = Math.min(1, (performance.now() - t0) / 760), v = Math.sin(Math.PI * p);
        front.style.setProperty('--shade', v.toFixed(3));
        back.style.setProperty('--shade', v.toFixed(3));
        if (p < 1 && leaf.parentNode) requestAnimationFrame(shade);
      })();
      anim.onfinish = function () {
        leaf.remove();
        k = to;
        paint();
        busy = false;
      };
    }

    prevBtn.addEventListener('click', function () { go(-1); });
    nextBtn.addEventListener('click', function () { go(1); });
    book.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    // 点右半边往后、左半边往前；横着划一下也行
    var down = null;
    pages.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; });
    pages.addEventListener('pointerup', function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      down = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8 || narrow.matches) return;
      var r = pages.getBoundingClientRect();
      go(e.clientX > r.left + r.width / 2 ? 1 : -1);
    });
    paint();
  }

  // ========== Hero 退场 / 返回（动画模式）==========
  // 往下滚：hero 钉住，跟着滚轮——标题 / 打字机淡出；前景摆设往右滑出 → 舱壁连窗框（和贴墙那排摆设）往右、
  //   地面连人物往左 → 窗外的星体往左移。星体移出一半时不再跟滚轮，改成自动播放（期间滚轮不起作用，约 4 秒）：
  //   星体移出 → 只剩星空 → 跃迁穿梭（星星拉成光迹、越来越快、一闪）→ 像素地球出现、一路推近到上海 → 淡成博客背景（咖啡厅）→ 第一部分浮上来。
  //   播完把 hero 整个拆掉：像素 hero 停循环、清画布，钉住撤掉，页面顶端就是第一部分，hero 不再占任何资源。
  //   已经滑出屏幕的图层当场就停画（pixelHero.setOff），不用等播完。
  // 往上滚：到第一部分顶上就停住，不会马上回去。在顶上继续往上滚（新的一下——滚到顶那一下的惯性不算），
  //   页眉下面冒出「继续上滑 · 返回舰桥」和一个小圈，攒满一圈才倒着播回 hero（同一个场景，约 3.5 秒）；停手小圈会慢慢退回去。
  // 刷新 / 后退回来时如果 hero 已经拆掉，就直接从拆掉的状态开始（见 heroState 初值、initScrollMemory）。
  // 手机 / 减少动态 / 动画库没加载（降级模式）不走这一套，hero 照旧随页面滚走。

  var PIN_VH = 1.8;     // hero 钉住的滚动距离（屏高的倍数）
  var AUTO_AT = 0.8;    // 滚到钉住区间的这个比例 = 星体移出一半 → 自动播放；后面一截是缓冲，滚得猛也不会直接滚过 hero
  var PULL_VH = 0.6;    // 返回 hero 要在顶上继续往上滚的量（屏高的倍数）

  function initHeroVoyage() {
    var hero = document.getElementById('about-hero');
    var pix = document.getElementById('hero-pixel');
    var pullEl = document.getElementById('ab-pull');
    if (!hero || !pix) return;
    var fadeEls = [hero.querySelector('.about-hero-content'), hero.querySelector('.about-hero-overlay')].filter(Boolean);
    var hint = hero.querySelector('.about-scrollhint');
    var st = null, stage = null, els = {};
    var s = 0, target = 0, raf = 0;
    var scrollLock = false;

    // 退场分组：[图层, 方向（1 往右 / −1 往左）, 在滚动进度 s 里的起止]；星体（景色的几层）另算
    var GROUPS = [
      { names: ['near'], dir: 1, a: 0.02, b: 0.28 },
      { names: ['front'], dir: 1, a: 0.06, b: 0.32 },
      { names: ['props-mid'], dir: 1, a: 0.1, b: 0.36 },
      { names: ['cabin', 'props', 'clock'], dir: 1, a: 0.3, b: 0.62 },   // clock = 舱壁上的像素钟（09c-cabin-clock）
      { names: ['floor', 'chars'], dir: -1, a: 0.3, b: 0.62 }
    ];
    var VIEW = ['view', 'view-sparks', 'view-detail', 'view-fx'];
    var VIEW_A = 0.6;

    function seg(v, a, b) { return v <= a ? 0 : v >= b ? 1 : (v - a) / (b - a); }
    function easeIn(t) { return t * t; }
    function easeOut(t) { return 1 - (1 - t) * (1 - t); }
    function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); }
    function easeOut3(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // ---------- 图层 ----------
    function collect() {
      els = {};
      [].forEach.call(pix.querySelectorAll('canvas.ab-px-layer'), function (c) { els[c.className.replace('ab-px-layer ab-px-', '')] = c; });
    }
    function margin() { var p = pixelHero && pixelHero.pixel(); return p ? p.m * p.P : 40; }
    function outX() { return window.innerWidth + 2 * margin() + 24; }
    function shift(names, x) {
      names.forEach(function (n) {
        var c = els[n];
        if (!c) return;
        var v = Math.round(x) + 'px 0px';
        if (c.style.translate !== v) c.style.translate = v;
      });
    }
    function setOff(names, off) { if (pixelHero) pixelHero.setOff(names, off); }

    // 各组直接按离原位的距离摆：fr[i] = GROUPS 第 i 组移出去的比例（0 = 原位，1 = 屏幕外），view = 星体位移（px），
    // fade = 标题 / 微尘的透明度；hide = 已经移出屏幕的组停画（往下退场时要；返回时各层挂载时就画好了，原样平移进来，
    // 不来回停画、重画——重新显示时整层同步重画会卡住那一帧，正在移动的星体就跟着顿一下）
    function place(fr, view, fade, hide, fx) {
      var X = outX();
      if (fx === undefined) fx = fade;
      fadeEls.forEach(function (el) { el.style.opacity = fade > 0.999 ? '' : fade; });
      if (hint) hint.style.filter = fade < 1 ? 'opacity(' + fade.toFixed(3) + ')' : '';
      if (els.fx) els.fx.style.opacity = fx > 0.999 ? '' : fx;
      if (hide) setOff(['fx'], fx <= 0);
      GROUPS.forEach(function (g, i) {
        shift(g.names, g.dir * X * fr[i]);
        if (hide) setOff(g.names, fr[i] >= 1);
      });
      shift(VIEW, view);
    }
    // 滚动进度 v 时星体的位移：在 0.6 ~ 1 之间移出半屏
    function viewAt(v) { return -0.5 * window.innerWidth * Math.pow(seg(v, VIEW_A, 1), 1.6); }
    // 滚动进度 v（0 ~ 1）→ 各层位置；view 不传就按 v 算
    function apply(v, view) {
      if (v > 0.25 && pixelHero) pixelHero.fillSky();   // 舱壁挪开之前先把窗外以外的星星补上（这时还被挡着，看不出来）
      place(GROUPS.map(function (g) { return easeIn(seg(v, g.a, g.b)); }), view !== undefined ? view : viewAt(v), 1 - seg(v, 0, 0.16), true, 1 - seg(v, 0, 0.15));
    }

    // ---------- 跟着滚轮（钉住期间）----------
    function wake() { if (!raf) raf = requestAnimationFrame(tick); }
    function tick() {
      raf = 0;
      if (heroState !== 'hero') return;
      s += (target - s) * 0.16;   // 像 scrub 一样追一下滚轮，动作不生硬
      if (Math.abs(target - s) < 0.0006) s = target;
      apply(s);
      if (target >= 1) { startAuto(); return; }
      if (s !== target) wake();
    }

    function makePin() {
      st = ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * PIN_VH); },
        pin: true,
        refreshPriority: 1,
        onUpdate: function (self) {
          if (heroState !== 'hero') return;
          target = Math.min(1, self.progress / AUTO_AT);
          wake();
        },
        // 一下跳过了整段 hero（页内查找、End 键…）：不播，直接拆掉，停在跳到的那段内容上
        onLeave: function (self) {
          if (heroState !== 'hero') return;
          var rel = window.scrollY - self.end - hero.offsetHeight;
          heroState = 'auto';
          requestAnimationFrame(function () { teardown(rel); });
        }
      });
    }

    // ---------- 滚动锁（自动播放 / 返回期间）----------
    function lock(on) { scrollLock = on; lockY = window.scrollY; }
    window.addEventListener('wheel', function (e) { if (scrollLock) e.preventDefault(); }, { passive: false });
    window.addEventListener('touchmove', function (e) { if (scrollLock) e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (scrollLock && [' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].indexOf(e.key) >= 0) e.preventDefault();
    });

    // ---------- 穿梭画布 ----------
    function makeStage() {
      if (stage || !window.AboutVoyage) return;
      var p = pixelHero && pixelHero.pixel();
      stage = window.AboutVoyage.create(hero, { before: pix.nextSibling });
      stage.resize(p ? p.P : Math.max(2, Math.round(Math.max(window.innerWidth / 460, window.innerHeight / 300))));
    }
    window.addEventListener('resize', function () {
      if (stage) stage.resize();
      if (heroState === 'hero') { apply(s); wake(); }
    });
    function preloadEarth() { if (window.AboutVoyage) window.AboutVoyage.preload().catch(function () { /* 没有地球就只有星空 */ }); }

    // 按时间播放一段：fn(t 秒, dt) 返回 false 时结束。播放期间滚动锁着（滚轮 / 触摸 / 按键），
    // 万一还是被别的途径挪了（页内查找之类），每帧拉回 lockY
    var lockY = 0;
    function play(fn) {
      var t0 = performance.now(), last = t0;
      function step(now) {
        var t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (scrollLock && Math.abs(window.scrollY - lockY) > 1) window.scrollTo(0, lockY);
        if (fn(t, dt) !== false) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    // ---------- 往下：自动播放 ----------
    var EARTH0 = 0.05, EARTH1 = 3.6;   // 地球半径：出现时 / 推到最近时（屏高的倍数）
    function startAuto() {
      heroState = 'auto';
      lock(true);
      preloadEarth();
      makeStage();
      var s0 = s, X = outX(), vw = window.innerWidth, spaceOff = false, viewOff = false;
      play(function (t, dt) {
        // 0 ~ 0.3 s：把滚动那段收尾（s → 1）；之后星体继续往左移出。各层都是完全移出屏幕之后才停画（setOff），移动途中照常在动
        var v = lerp(s0, 1, easeOut(seg(t, 0, 0.3)));
        var vx = t < 0.3 ? undefined : lerp(-0.5 * vw, -X, easeIn(seg(t, 0.3, 0.95)));
        apply(v, vx);
        if (!viewOff && t > 0.95) { viewOff = true; setOff(VIEW, true); }
        // 星空：先盖上一层同样的星（透明底），再压暗成深空，然后加速成光迹，一闪（1.85 ~ 2.35 s）
        // 闪白一退（2.3 s 时只剩不到 3%）地球就整个在那儿了——像穿越出来一眼就找到了它，不淡入；
        // 出现后先慢慢靠近，再越推越快（半径按对数走 u^2.6），星星跟着一起加速
        var EARTH_ON = 2.3, u = seg(t, EARTH_ON, 4.3);
        var speed = t < 0.7 ? 0 : t < 1.95 ? 0.05 + 3.3 * Math.pow(seg(t, 0.7, 1.95), 3)
          : t < EARTH_ON ? lerp(3.35, 0.12, easeOut(seg(t, 1.95, EARTH_ON))) : 0.12 + 3 * Math.pow(u, 2.2);
        var dark = seg(t, 0.75, 1.3);
        if (!spaceOff && dark >= 1) { spaceOff = true; setOff(['space'], true); }
        var flash = t < 2.05 ? seg(t, 1.85, 2.05) : 1 - easeOut(seg(t, 2.05, 2.35));
        var e = t < EARTH_ON ? 0 : EARTH0 * Math.pow(EARTH1 / EARTH0, Math.pow(u, 2.6));
        if (stage) stage.draw({ t: t, dt: dt, stars: seg(t, 0.2, 0.7), speed: speed, dark: dark, glow: seg(t, 1.2, 1.95) * (1 - seg(t, 2, 2.3)), flash: flash, earth: e });
        // 推近到一定程度：整个 hero 淡掉，露出底下的博客背景（咖啡厅）
        hero.style.opacity = 1 - seg(t, 3.75, 4.3);
        if (t >= 4.3) { teardown(0); return false; }
      });
    }

    // 拆掉 hero：钉住撤掉、像素 hero 和穿梭画布都清掉，页顶 = 第一部分（newY：拆掉后滚到哪）
    function teardown(newY) {
      heroState = 'gone';
      if (st) { st.kill(true); st = null; }
      document.documentElement.classList.add('ab-hero-gone');
      hero.style.opacity = '';
      if (pixelHero) { pixelHero.destroy(); pixelHero = null; }
      if (stage) { stage.destroy(); stage = null; }
      els = {};
      ScrollTrigger.refresh();
      window.scrollTo(0, Math.max(0, Math.round(newY)));
      ScrollTrigger.update();
      lock(false);
      topAt = performance.now();
      director.request();
    }

    // ---------- 往上：在第一部分顶上继续往上滚 → 攒满小圈 → 返回 ----------
    var pull = 0, lastWheel = 0, streamAt = 0, topAt = 0, wasTop = window.scrollY <= 0, decay = 0, pullRaf = 0;
    function pullMax() { return Math.max(420, window.innerHeight * PULL_VH); }
    function paintPull() {
      if (!pullEl) return;
      var p = Math.min(1, pull / pullMax());
      pullEl.style.setProperty('--p', p.toFixed(3));
      pullEl.classList.toggle('is-on', p > 0.01);
    }
    function addPull(v) {
      pull += v;
      paintPull();
      clearTimeout(decay);
      if (pull >= pullMax()) { pull = 0; paintPull(); startReturn(); return; }
      // 停手 0.5 s 后小圈慢慢退回去
      decay = setTimeout(function drain() {
        pull = Math.max(0, pull - pullMax() * 0.06);
        paintPull();
        if (pull > 0) pullRaf = requestAnimationFrame(drain);
      }, 500);
    }
    window.addEventListener('scroll', function () {
      var top = window.scrollY <= 0;
      if (top && !wasTop) topAt = performance.now();
      if (!top && pull > 0) { pull = 0; paintPull(); }
      wasTop = top;
    }, { passive: true });
    window.addEventListener('wheel', function (e) {
      var now = performance.now();
      if (now - lastWheel > 180) streamAt = now;   // 一次新的滚动（中间停过）
      lastWheel = now;
      if (heroState !== 'gone' || solo.on || window.scrollY > 0 || e.deltaY >= 0) return;
      if (streamAt <= topAt) return;               // 这一下是滚到顶之前就开始的（惯性）：不算
      cancelAnimationFrame(pullRaf);
      addPull(-e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1));
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (heroState !== 'gone' || solo.on || window.scrollY > 0) return;
      if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') { cancelAnimationFrame(pullRaf); addPull(pullMax() / 3 + 1); }
    });

    // ---------- 返回：咖啡厅 → 地球拉远 → 反向穿梭 → 星体、舱室、摆设依次归位 ----------
    function startReturn() {
      if (heroState !== 'gone') return;
      heroState = 'back';
      lock(true);
      player.close();
      director.request();
      document.documentElement.classList.remove('ab-hero-gone');
      hero.classList.add('is-stage');   // 先作为盖在页面上的一层淡入，盖严了再放回文档流
      hero.style.opacity = 0;
      initPixelHero();
      collect();
      // 地球拉远那段（画面被穿梭画布整个盖着）先冻住像素 hero，让地球动画独占主线程；
      // 1 秒时放开——星体、舱室露出来之前就已经在动了（挂载时每层都画好，之后只平移进来，不来回停画重画）
      if (pixelHero) { pixelHero.fillSky(); pixelHero.setRunning(false); }
      place([1, 1, 1, 1, 1], -outX(), 0, false);
      makeStage();
      var X = outX(), swapped = false, live = false;
      preloadEarth();
      play(function (t, dt) {
        hero.style.opacity = seg(t, 0, 0.4);
        // 盖严之后：hero 放回文档流、重新钉住、滚到最顶（这时画面全被 hero 盖着，看不出跳动；
        // 重新测量要卡一下，所以地球等这一步做完才开始拉远）
        if (!swapped && t >= 0.4) {
          swapped = true;
          hero.classList.remove('is-stage');
          makePin();
          ScrollTrigger.refresh();
          window.scrollTo(0, 0);
          lockY = 0;
          ScrollTrigger.update();
        }
        var e = t < 1.45 ? EARTH1 * Math.pow(EARTH0 / EARTH1, easeInOut(seg(t, 0.5, 1.45))) : 0;
        var speed = t < 1.4 ? -0.18 : t < 1.95 ? -(0.05 + 3 * Math.sin(Math.PI * seg(t, 1.4, 1.95))) : 0;
        var flash = t < 1.45 ? 0.7 * seg(t, 1.35, 1.45) : 0.7 * (1 - seg(t, 1.45, 1.65));
        var dark = 1 - seg(t, 1.8, 2.2);
        if (!live && t >= 1) { live = true; if (pixelHero) pixelHero.setRunning(true); }
        if (stage) stage.draw({ t: t, dt: dt, stars: 1 - seg(t, 1.95, 2.4), speed: speed, dark: dark, glow: seg(t, 1.4, 1.65) * (1 - seg(t, 1.8, 2.05)), flash: flash, earth: e });
        // 星体：一条缓出曲线从左边一路移回原位（中途不停）；舱壁 / 地面随后合拢，再是前景摆设，最后标题回来
        function back(a, b) { return 1 - easeOut3(seg(t, a, b)); }
        place([back(2.7, 3.25), back(2.65, 3.2), back(2.6, 3.15), back(2.3, 2.95), back(2.3, 2.95)], -X * back(1.8, 2.9), seg(t, 3, 3.4), false);
        if (t >= 3.45) {
          s = target = 0;
          apply(0);
          heroState = 'hero';
          if (pixelHero) pixelHero.setRunning(true);
          if (stage) { stage.destroy(); stage = null; }
          lock(false);
          director.request();
          return false;
        }
      });
    }

    // ---------- 起步 ----------
    if (heroState !== 'gone') {
      collect();
      makePin();
      // 地球贴图（约 130KB）和云图提前在空闲时备好，自动播放时不用等
      var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1500); };
      window.addEventListener('load', function () { idle(preloadEarth, { timeout: 5000 }); }, { once: true });
    }
    if (hint) gsap.to(hint, { opacity: 1, duration: 0.9, delay: 1.6 });   // 下滑提示：打字机出字后浮现
  }

  // ========== 桌面端滚动动画 ==========

  function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Hero：动画模式下钉住 + 退场 / 返回那一套（见 initHeroVoyage）；必须在分割段之前建（钉住的顺序 = 页面顺序）
    initHeroVoyage();

    // ===== 分割段（白线 = 相邻两块的接缝）=====
    // 冻结时机：上一块底部（接缝）到达屏幕中央 —— 此刻上半屏是上一块尾部，
    // 下半屏是下一块头部。下一块被 lift 位移精确抵消 pin spacer 顶到接缝下方，
    // lift 随 pin 进度衰减到 0，unpin 时恰好落回自然文档流位置，全程无缝。
    // pin 内时间轴：0-0.1 白线在接缝（屏幕中央）展开 | 0.1-0.35 上下两块分离、
    // 变暗、星空淡出，嵌入图在 1/4~3/4 露出 | 0.35-0.55 保持 | 0.55-0.8 合拢 |
    // 0.82-0.92 白线收回（此刻下一块已铺满下半屏）| 0.92-1 死区（防拖影）
    var panelTop = document.getElementById('ab-panel-top');
    var panelBottom = document.getElementById('ab-panel-bottom');
    var panels = [panelTop, panelBottom];
    var panelDims = gsap.utils.toArray('.about-panel-dim');
    var edges = gsap.utils.toArray('.about-panel-edge');
    // 页眉一行（页眉条 / 书签 / 右上角微导航）：分离时跟着上半页一起被推出屏幕，合拢时一起落回。
    // 写 --ab-push（0~1），CSS 换算成 × −25vh 的 translate——与上半页同位移、同缓动、同时段，像粘在上半页上。
    // 变量只写在这三个元素上（写在根上会让整页每帧重算样式）
    var chrome = ['ab-bar', 'ab-marks', 'about-nav']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    var revealBefore = []; // 被分割段 lift 的块 → 该分割段的 ScrollTrigger（用于换算浮现时机）
    var lifts = [];

    // lift 是 transform，会污染 ScrollTrigger 的位置测量：
    // 测量前全部清零，并在创建/刷新期间锁住——否则进度非 0 的分割段（从页面中部加载、后退恢复、
    // 中途 resize）会在测量途中给下一块加上 lift，导致后续分割段的起止点整体偏移。测量完成后按进度恢复
    var liftLocked = true;
    ScrollTrigger.addEventListener('refreshInit', function () {
      liftLocked = true;
      lifts.forEach(function (l) {
        l.fix(false);
        gsap.set(l.el, { y: 0 });
      });
    });
    ScrollTrigger.addEventListener('refresh', function () {
      liftLocked = false;
      lifts.forEach(function (l) {
        var p = l.st.progress;
        if (p > 0 && p < 1) {
          l.fix(true); // 正处于钉住中：固定在接缝下方
        } else if (p <= 0) {
          gsap.set(l.el, { y: -(l.st.end - l.st.start) });
        } else if (l.nb) {
          // 已滚过整个分割段：lift 本就是 0，不写 transform——下一单元若也已被自己的分割段钉过，
          // 它的 transform 归 ScrollTrigger 的 pin 管（停在 spacer 底部的位移），覆盖会让它整体错位。
          // 只需保证下一块处于已浮现态
          gsap.set(l.nb, { y: 0, opacity: 1 });
        }
      });
    });

    // 除第一个外，每个 pair 外包一层占位：它在上一个分割段钉住期间会被 position:fixed，
    // 占位锁住高度，避免下方内容塌陷。必须在创建任何 pin 之前包好（pin-spacer 会生成在占位里面）
    var pairs = [].slice.call(document.querySelectorAll('.about-pair'));
    pairs.slice(1).forEach(function (p) {
      var holder = document.createElement('div');
      holder.className = 'ab-lift-holder';
      p.parentNode.insertBefore(holder, p);
      holder.appendChild(p);
    });

    pairs.forEach(function (pair, i) {
      var block = pair.querySelector('.about-block');
      var section = pair.querySelector('.about-split');
      if (!block || !section) return;
      var media = section.querySelector('.about-split-media');
      var img = media.querySelector('img');
      var textId = media.querySelector('.about-split-text').id;
      var typed = false;

      // 下一个单元（下一个 pair）：lift / 固定作用于整体，分离/变暗作用于其中的块
      var nextEl = pairs[i + 1] || null;
      var holder = nextEl ? nextEl.parentNode : null;
      var nextBlock = nextEl ? nextEl.querySelector('.about-block') : null;

      // media 是全屏 fixed 层：挪到 body 下，避免被钉住/位移的祖先改变其定位基准
      document.body.appendChild(media);

      // 下一单元的位置：钉住前 lift = −钉住时长（transform 常量，紧贴接缝随页面滚动）；钉住后 lift = 0；
      // 钉住中真正 position:fixed 在接缝下方——与 ScrollTrigger 固定当前 pair 同一机制，由浏览器合成。
      // （若钉住中逐帧用 JS 改 transform 抵消滚动，会比滚轮慢一帧，分割线伸缩时下一块跟着抖）
      var nextFixed = false;

      function setLift(y) {
        if (nextEl && !liftLocked && !nextFixed) gsap.set(nextEl, { y: y });
      }

      function fixNext(on) {
        if (!nextEl || nextFixed === on) return;
        nextFixed = on;
        if (on) {
          holder.style.height = holder.offsetHeight + 'px';
          // 接缝在视口中的位置：与 start 的取整方式一致（恰为屏幕中央）
          var seam = block.offsetHeight - Math.round(block.offsetHeight - window.innerHeight / 2);
          gsap.set(nextEl, { y: 0 });
          nextEl.style.position = 'fixed';
          nextEl.style.top = seam + 'px';
          nextEl.style.left = '0';
          nextEl.style.width = '100%';
        } else {
          nextEl.style.position = nextEl.style.top = nextEl.style.left = nextEl.style.width = '';
          holder.style.height = '';
        }
      }

      // 防拖影/漏图：离开 pin 区后强制回到完全闭合态
      // atEnd=true 正向滚出；false 反向滚出。上下两块的外层都回到闭合原位
      // （下一块在接缝前是否已浮现由它内层自己的浮现触发器决定）
      function forceClosed(self, atEnd) {
        gsap.set(block, { y: 0, opacity: 1 });
        if (nextBlock) gsap.set(nextBlock, { y: 0, opacity: 1 });
        fixNext(false);
        setLift(atEnd ? 0 : -(self.end - self.start));
        gsap.set(panels, { y: 0, autoAlpha: 0 });
        gsap.set(chrome, { '--ab-push': 0 });
        gsap.set(panelDims, { opacity: 0 });
        gsap.set(edges, { scaleX: 0 });
        gsap.set(media, { autoAlpha: 0 });
      }

      // 滚出 pin 区时先把 scrub 追赶补间立即结算，否则它会在之后 ~0.35s 内
      // 继续渲染时间轴中间态（反向快滚时表现为嵌入图整屏闪现），盖掉闭合态
      function settleOut(self, atEnd) {
        if (self.getTween) {
          var sc = self.getTween();
          if (sc) sc.progress(1);
        }
        forceClosed(self, atEnd);
      }

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: pair,
          start: function () {
            // 接缝（块底部）到达屏幕中央时冻结
            return 'top+=' + Math.round(block.offsetHeight - window.innerHeight / 2) + ' top';
          },
          // 锁着：钉住时长 0（ScrollTrigger 会把它当成一个 0.001px 的区间，一滚就过，分割段不展开）
          end: function () { return '+=' + (locked ? 0 : Math.round(window.innerHeight * 2.3)); },
          pin: true,
          scrub: 0.35,
          onToggle: function (self) {
            if (!liftLocked) fixNext(self.isActive);
          },
          onUpdate: function (self) {
            // 完全展开（上线 1/4、下线 3/4）后才开始打字
            if (!typed && self.progress > 0.33 && self.progress < 0.55) {
              typed = true;
              typeInto(textId, SPLIT_QUOTES[textId]);
            }
            // 滚回顶部则复位，下次展开重新打字
            if (typed && self.progress < 0.04) {
              typed = false;
              resetType(textId);
            }
          },
          onEnter: function () {
            // 飞速下滑时上下两块内层的浮现动画可能尚未播完，进 pin 前强制结算（只动内层，外层归本时间轴）
            var inners = [block.querySelector('.about-block-inner')];
            if (nextBlock) inners.push(nextBlock.querySelector('.about-block-inner'));
            gsap.getTweensOf(inners).forEach(function (t) {
              if (t.parent === gsap.globalTimeline) t.progress(1);
            });
          },
          onLeave: function (self) { settleOut(self, true); },
          onLeaveBack: function (self) { settleOut(self, false); }
        }
      });

      // 板与嵌入图就位（板同底色，出现时不可见；嵌入图被板完全盖住）
      tl.to(panels, { autoAlpha: 1, duration: 0.01 }, 0);
      tl.to(media, { autoAlpha: 1, duration: 0.01 }, 0.01);
      // 白线：冻结后才在接缝（屏幕中央）从中间向两边展开
      tl.fromTo(edges, { scaleX: 0 }, { scaleX: 1, ease: 'power2.inOut', duration: 0.1 }, 0.02);
      // 分离 / 合拢：起止值全部写死（fromTo + immediateRender:false）。
      // 用 .to 时起点取"首次播到这里那一刻"的实际值——后退恢复、跳章等一次性跳转时，
      // 那一刻块可能还处于未浮现的初始态，起点就被记错；写死后无论何时初始化、中途被谁改过，
      // 时间轴经过时都会写回正确值
      var FT = { immediateRender: false };
      // 上下两块对称：上半（上一块尾 + 上板）上移，下半（下一块头 + 下板）下移，两块同步淡出，遮罩压暗
      var upper = [panelTop, block];
      var lower = nextBlock ? [panelBottom, nextBlock] : [panelBottom];
      var fading = nextBlock ? [block, nextBlock] : [block];
      tl.fromTo(upper, { y: 0 }, Object.assign({ y: '-25vh', ease: 'power2.inOut', duration: 0.25 }, FT), 0.1);
      tl.fromTo(lower, { y: 0 }, Object.assign({ y: '25vh', ease: 'power2.inOut', duration: 0.25 }, FT), 0.1);
      tl.fromTo(fading, { opacity: 1 }, Object.assign({ opacity: 0, ease: 'none', duration: 0.25 }, FT), 0.1);
      tl.fromTo(panelDims, { opacity: 0 }, Object.assign({ opacity: 1, ease: 'none', duration: 0.25 }, FT), 0.1);
      tl.fromTo(chrome, { '--ab-push': 0 }, Object.assign({ '--ab-push': 1, ease: 'power2.inOut', duration: 0.25 }, FT), 0.1);
      tl.fromTo(img, { scale: 1.07 }, { scale: 1, ease: 'power1.out', duration: 0.3 }, 0.12);

      // 合拢
      tl.fromTo(upper, { y: '-25vh' }, Object.assign({ y: 0, ease: 'power2.inOut', duration: 0.25 }, FT), 0.55);
      tl.fromTo(lower, { y: '25vh' }, Object.assign({ y: 0, ease: 'power2.inOut', duration: 0.25 }, FT), 0.55);
      tl.fromTo(fading, { opacity: 0 }, Object.assign({ opacity: 1, ease: 'none', duration: 0.25 }, FT), 0.55);
      tl.fromTo(panelDims, { opacity: 1 }, Object.assign({ opacity: 0, ease: 'none', duration: 0.25 }, FT), 0.55);
      tl.fromTo(chrome, { '--ab-push': 1 }, Object.assign({ '--ab-push': 0, ease: 'power2.inOut', duration: 0.25 }, FT), 0.55);

      // 嵌入图闭合即隐藏（防漏图）→ 分割线收回 → 板隐藏 → 死区
      tl.to(media, { autoAlpha: 0, duration: 0.01 }, 0.81);
      tl.to(edges, { scaleX: 0, ease: 'power2.inOut', duration: 0.1 }, 0.82);
      tl.to(panels, { autoAlpha: 0, duration: 0.01 }, 0.93);
      tl.to({}, { duration: 0.06 }, 0.94);

      if (nextEl) lifts.push({ el: nextEl, st: tl.scrollTrigger, nb: nextBlock, fix: fixNext });
      if (nextBlock) revealBefore.push({ block: nextBlock, st: tl.scrollTrigger });
      pinTriggers.push(tl.scrollTrigger);
    });

    // 各块浮现：只作用于内层——外层的透明度/位移归分割段时间轴，两者若写同一属性，
    // 浮现动画在展开保持期间被触发（后退恢复、跳转）就会把块写回原位可见，压在嵌入图上。
    // 触发点统一为"块顶进入视口 90%"，即在分割线出现之前就浮现：
    // - block-1 直接以块为触发元素；它在被钉住的 pair 里，须声明 pinnedContainer，
    //   否则页面中部刷新时（pair 已钉完、带着停在 spacer 底部的位移）起点会被多算一整段钉住时长
    // - 其余块被上一个分割段 lift 到接缝正下方，文档流位置 ≠ 视觉位置：接缝在该分割段起点
    //   到达屏幕中央，所以块顶到达视口 90% 的时刻 = 分割段起点 − 0.4 屏
    // 有效区间都延伸到页面最底：从下方恢复位置 / 跳章越过时仍判定为"已进入"而播放；
    // 越过终点、从下方回来也播放（幂等），只有回到触发点之上才倒放
    function reveal(inner, trigger) {
      gsap.fromTo(inner, { opacity: 0, y: 52 }, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: Object.assign({ toggleActions: 'play play play reverse' }, trigger)
      });
    }

    document.querySelectorAll('.about-block').forEach(function (block) {
      var inner = block.querySelector('.about-block-inner');
      var after = revealBefore.filter(function (r) { return r.block === block; })[0];
      if (after) {
        reveal(inner, {
          start: function () { return after.st.start - window.innerHeight * 0.4; },
          end: function () { return ScrollTrigger.maxScroll(window) + 1; }
        });
      } else {
        reveal(inner, {
          trigger: block,
          pinnedContainer: block.closest('.about-pair'),
          start: 'top 90%',
          endTrigger: 'html',
          end: 'bottom bottom'
        });
      }
    });

    // 全部建完后统一测量一次（期间 lift 一直锁着），从页面任意位置加载都能得到正确的起止点
    ScrollTrigger.refresh();
  }

  // ========== 降级：分割段文字随可见触发 ==========

  function initStaticSplits() {
    var targets = document.querySelectorAll('.about-split-text');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { typeInto(el.id, SPLIT_QUOTES[el.id]); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          typeInto(entry.target.id, SPLIT_QUOTES[entry.target.id]);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // ========== 背景咖啡厅（js/about-cafe/*.js）：一整幅像素画 ==========
  // 唱片机开关的是页眉里的店内 BGM（player 在后面才初始化，所以这里按调用时的 player 取）；纯享时点空白处由它回调退出

  var cafeBg = null;

  function initCafe() {
    var box = document.getElementById('ab-cafe');
    if (!box || !window.AboutCafe || isMobile) return;
    try {
      cafeBg = window.AboutCafe.mount(box, {
        reduceMotion: reduceMotion,
        music: {
          toggle: function () { if (player.toggle) player.toggle(); },
          playing: function () { return player.playing ? player.playing() : false; },
          beat: function () { return player.beat ? player.beat() : 0; }
        },
        onSoloExit: function () { solo.exit(); }
      });
    } catch (e) {
      cafeBg = null; // 画不出来就只剩纸色底
    }
  }

  // ========== 纯享背景 ==========
  // 右上角按钮（咖啡杯右边）：其余内容淡出（Web Animations——不碰它们自己的过渡和内联样式，退出时原样倒放再撤掉），
  // 背景咖啡厅的纸色纱淡掉，淡完后背景层升到最上层接收点击：点到唱片机 / 猫 / 吉他…就玩，点空白处或按 Esc 返回。纯享期间锁住滚动。

  var solo = { on: false, exit: function () {} };

  function initSolo() {
    var btn = document.getElementById('ab-solo-btn');
    if (!btn) return;
    if (!cafeBg) { btn.hidden = true; return; }
    var anims = [], FADE = reduceMotion ? 1 : 450, topTimer = 0;

    function others() {
      return [].filter.call(document.body.children, function (el) { return el.id !== 'ab-backdrop' && el.tagName !== 'SCRIPT'; });
    }
    function enter() {
      if (solo.on) return;
      solo.on = true;
      player.close();
      anims.forEach(function (a) { a.cancel(); });
      anims = others().map(function (el) {
        return el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: FADE, easing: 'ease', fill: 'forwards' });
      });
      document.body.classList.add('ab-solo');
      cafeBg.setSolo(true);
      topTimer = setTimeout(function () { if (solo.on) document.body.classList.add('ab-solo-top'); }, FADE);
    }
    solo.exit = function () {
      if (!solo.on) return;
      solo.on = false;
      clearTimeout(topTimer);
      document.body.classList.remove('ab-solo-top', 'ab-solo');
      cafeBg.setSolo(false);
      anims.forEach(function (a) {
        a.onfinish = function () { a.cancel(); };
        a.reverse();
      });
      anims = [];
    };

    btn.addEventListener('click', enter);
    function block(e) { if (solo.on) e.preventDefault(); }
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchmove', block, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (!solo.on) return;
      if (e.key === 'Escape') solo.exit();
      else if ([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].indexOf(e.key) >= 0) e.preventDefault();
    });
  }

  // ========== 启动 ==========

  document.addEventListener('DOMContentLoaded', function () {
    var navClock = document.getElementById('nav-clock');
    if (navClock) buildRollClock(navClock, false);
    tickClocks();
    setInterval(tickClocks, 1000);

    initPixelHero();
    initCafe();
    initSolo();
    initDirector();
    initLock();
    initCopyLinks();
    initRuntime();
    initHeatmap();
    initHeroType();
    initMemoBook();
    initBadge();
    initPlayer();
    initIntroLetter();
    initPhotoTile();
    initMuse();
    loadLedger().then(function (d) {
      initLedger(d);
      initSpecial(d);
    }).catch(function () {});

    if (animOn) {
      initAnimations();
      // 分割段位置在每次 ScrollTrigger 刷新后才确定：章节判定 / 印花淡出 / 跳章都依赖它
      ScrollTrigger.addEventListener('refresh', director.request);
      director.request();
    } else {
      initStaticSplits();
      initStaticStarsFade();
    }
    initScrollMemory();
  });
})();
