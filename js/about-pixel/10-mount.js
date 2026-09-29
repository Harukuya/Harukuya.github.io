// About 页像素 Hero · 10-mount：组装：场景选择、各图层（含视差深度）、动画循环；对外只暴露 window.AboutPixelHero.mount
// 独立作用域：只能用下面 PX.need 声明过的别的文件的名字；给别的文件用的东西在末尾 PX.provide 里列出（机制见 01-core.js 开头）
(function (PX) {
  'use strict';

  PX.need('10-mount', ['CABIN', 'CABINS', 'DECO_ANIM', 'FLOOR_ANIM', 'POSES', 'Raster', 'VIEWS', 'VIEW_LIGHT',
    'animProps', 'band', 'bandDepth', 'cabinHasClock', 'castFn', 'charSprite', 'clamp', 'composition', 'dith', 'drawAmphoreusBackdrop', 'drawAmphoreusRibbon', 'drawAmphoreusFx', 'drawAmphoreusSparks',
    'drawCabin', 'drawCabinClock', 'drawCabinFloor', 'drawJariloBig', 'drawPenaconyBig', 'drawProps', 'drawStationBig', 'drawStationFx',
    'drawXianzhouBig', 'fbm2', 'floorGeom', 'hex', 'loadAmphoreus', 'loadPenacony', 'loadStation', 'loadXianzhou', 'measureWindowLight', 'mix', 'mulberry', 'paintViewCabin', 'propsAnimated']);
  var CABIN = PX.CABIN, CABINS = PX.CABINS, DECO_ANIM = PX.DECO_ANIM, FLOOR_ANIM = PX.FLOOR_ANIM, POSES = PX.POSES,
    Raster = PX.Raster, VIEWS = PX.VIEWS, VIEW_LIGHT = PX.VIEW_LIGHT, animProps = PX.animProps, band = PX.band,
    bandDepth = PX.bandDepth, cabinHasClock = PX.cabinHasClock, castFn = PX.castFn, charSprite = PX.charSprite, clamp = PX.clamp,
    composition = PX.composition, dith = PX.dith, drawAmphoreusBackdrop = PX.drawAmphoreusBackdrop,
    drawAmphoreusRibbon = PX.drawAmphoreusRibbon, drawAmphoreusFx = PX.drawAmphoreusFx, drawAmphoreusSparks = PX.drawAmphoreusSparks, drawCabin = PX.drawCabin, drawCabinClock = PX.drawCabinClock,
    drawCabinFloor = PX.drawCabinFloor, drawJariloBig = PX.drawJariloBig, drawPenaconyBig = PX.drawPenaconyBig,
    drawProps = PX.drawProps, drawStationBig = PX.drawStationBig, drawStationFx = PX.drawStationFx, drawXianzhouBig = PX.drawXianzhouBig,
    fbm2 = PX.fbm2, floorGeom = PX.floorGeom, hex = PX.hex, measureWindowLight = PX.measureWindowLight, mix = PX.mix,
    mulberry = PX.mulberry, paintViewCabin = PX.paintViewCabin, propsAnimated = PX.propsAnimated, loadAmphoreus = PX.loadAmphoreus,
    loadPenacony = PX.loadPenacony, loadStation = PX.loadStation, loadXianzhou = PX.loadXianzhou;

  // ========== 场景选择 ==========
  function chooseConfig() {
    var q = null, art = null;
    try {
      var params = new URLSearchParams(location.search);
      q = params.get('hero'); art = params.get('art');
    } catch (e) { q = null; }
    var parts = q ? q.split(',') : [];
    function pick(list, i) {
      if (parts[i] && list.indexOf(parts[i]) >= 0) return parts[i];
      return list[Math.floor(Math.random() * list.length)];
    }
    var pose = parseInt(parts[3], 10);
    return {
      view: pick(VIEWS, 0),
      art: art === 'hd' || art === 'raw' ? art : 'default',
      cabin: pick(CABINS, 1),
      tb: parts[2] === 'stelle' || parts[2] === 'caelus' ? parts[2] : (Math.random() < 0.5 ? 'stelle' : 'caelus'),
      // 人物（开拓者 + 流萤）小概率出现：30%；网址第三项写了 stelle / caelus 就一定有，写 none 就一定没有
      chars: parts[2] === 'stelle' || parts[2] === 'caelus' ? true : parts[2] === 'none' ? false : Math.random() < 0.3,
      pose: pose >= 0 && pose < POSES.length ? pose : Math.floor(Math.random() * POSES.length),
      seed: (Math.random() * 1e9) | 0
    };
  }

  // ========== 挂载 ==========
  // opts.config：沿用上一次挂载的场景（hero 退场后再回来时同一个景、同一套人物，不重新抽）
  function mount(container, opts) {
    opts = opts || {};
    var cfg = opts.config || chooseConfig();
    if (opts.seed !== undefined && isFinite(opts.seed)) cfg.seed = opts.seed | 0;
    var reduce = !!opts.reduceMotion;
    // 窗外主体（2026-09-27 定稿）：空间站 = 素材版 + cel 上色（04b-cabin-paint）；匹诺康尼 / 罗浮 = 素材版；
    // 翁法罗斯 = 素材版 + px 画法的中间光芒（08c-amphoreus-light-px）。对比过的其他版本（px / pxold / 3d / 3d-codex、其余景色的 cel）
    // 挪到了 E:\fblog\窗外地标-备用版本\，怎么接回来见那里的 README.md
    if (cfg.view === 'station') cfg.art = 'hd';
    var cabinPaint = cfg.view === 'station';
    var stationHD = cfg.view === 'station';
    var xianzhouHD = cfg.view === 'xianzhou' && cfg.art === 'hd';
    var vl = VIEW_LIGHT[cfg.view];
    container.setAttribute('data-scene', [cfg.view, cfg.cabin, cfg.chars ? cfg.tb : 'none', cfg.pose].join(','));
    container.setAttribute('data-art', stationHD || xianzhouHD ? cfg.art : 'default');

    var layers = [];
    var geo = null;
    var running = true, visible = true, destroyed = false;
    var skyFull = false;   // hero 退场时舱室挪走：星空补满整块画布、雅利洛不再按窗台线裁（fillSky）
    var t0 = performance.now(), lastTick = 0, lastFast = 0;
    var mouse = { x: 0.5, y: 0.5 }, cur = { x: 0, y: 0 };
    var dyn = {};

    // anim = { has(g), draw(r, g, t) }：静态图层上的小动画——整层画好后缓存成底图，每一拍拷回底图、只补画会动的几个像素
    // depth 可以是数字，也可以是 function(g)（按当前布局算：人物 / 摆设取脚下那排地板的深度）
    function layer(name, depth, draw, dynamic, anim) {
      var c = document.createElement('canvas');
      c.className = 'ab-px-layer ab-px-' + name;
      container.appendChild(c);
      var L = { name: name, el: c, ctx: c.getContext('2d'), depthFn: typeof depth === 'function' ? depth : null, depth: typeof depth === 'function' ? 0 : depth,
        draw: draw, dynamic: !!dynamic, anim: anim || null, base: null, r: null, off: false };
      layers.push(L);
      return L;
    }

    function layout() {
      var vw = container.clientWidth || window.innerWidth, vh = container.clientHeight || window.innerHeight;
      // 像素倍数：画布高度大约 270 像素（笔记本 800 高 → 3 倍，1080p → 4 倍），像素颗粒要看得出来
      var P = clamp(Math.round(Math.max(vw / 460, vh / 300)), 2, 6);
      var maxShift = reduce ? 0 : Math.min(30, vw * 0.022);
      var m = Math.ceil(maxShift / P) + 2;
      var W = Math.ceil(vw / P), H = Math.ceil(vh / P);
      var g = geo = { W: W, H: H, P: P, m: m, maxShift: maxShift, portrait: vh > vw * 1.05, fullView: skyFull };
      composition(g);
      layers.forEach(function (L) {
        // 翁法罗斯球体、辐条和横向蓝光按两倍采样；亮星保留原像素尺寸。
        var density = ((cfg.view === 'penacony' || cfg.view === 'amphoreus' || stationHD || xianzhouHD) && L.name === 'view') || L.name === 'view-detail' || L.name === 'view-sparks' ||
          (cfg.view === 'amphoreus' && L.name === 'view-fx') ? 2 : 1;
        L.el.width = (W + 2 * m) * density;
        L.el.height = (H + 2 * m) * density;
        L.el.style.width = (W + 2 * m) * P + 'px';
        L.el.style.height = (H + 2 * m) * P + 'px';
        L.el.style.left = -m * P + 'px';
        L.el.style.top = -m * P + 'px';
        L.el.style.transformOrigin = m * P + 'px ' + m * P + 'px';   // 变换原点 = 容器左上角（地板的仿射视差按容器坐标算）
        L.r = new Raster(L.el.width, L.el.height, m * density, m * density);
        L.r.pixelDensity = density;
        L.ox = L.oy = L.tf = null;
      });
      g.floor = floorGeom(g);
      layers.forEach(function (L) { if (L.depthFn) L.depth = L.depthFn(g); });
    }

    function paint(L, t, animOnly) {
      if (animOnly) {
        L.r.d.set(L.base);
        L.anim.draw(L.r, geo, t);
        L.ctx.putImageData(L.r.img, 0, 0);
        return;
      }
      L.r.clear();
      L.draw(L.r, geo, t);
      L.base = null;
      if (L.anim && L.anim.has(geo)) {
        L.base = new Uint8ClampedArray(L.r.d);
        L.anim.draw(L.r, geo, t);
      }
      L.ctx.putImageData(L.r.img, 0, 0);
    }

    // ---------- 远景：星空（静态底图缓存一次；彩色小星闪烁 + 偶尔流星）----------
    var STAR_COLS = [[255, 255, 255], [255, 122, 217], [111, 224, 255], [255, 226, 106], [122, 154, 255], [200, 170, 255], [255, 255, 255]];
    function initStars(g) {
      var rnd = mulberry(cfg.seed + 1), stars = [];
      var n = Math.round(g.W * g.H / 90);
      var cols = STAR_COLS;
      for (var i = 0; i < n; i++) {
        var x = rnd() * (g.W + 2 * g.m) - g.m, y = rnd() * (g.H * 0.85 + g.m) - g.m;
        if (!g.inWin(x, y)) continue;
        stars.push({ x: x, y: y, b: 0.35 + rnd() * 0.65, c: cols[(rnd() * cols.length) | 0], sp: 0.6 + rnd() * 2.2, ph: rnd() * 6.28, big: rnd() < 0.06 });
      }
      if (skyFull) addOuterStars(g, stars);
      dyn.stars = stars;
      dyn.shoot = null;
      dyn.nextShoot = 3 + Math.random() * 5;
      dyn.skyBase = null;
    }

    // 窗外以外（被舱壁 / 地板挡着的地方）也撒上同样密度的星：另起一串随机数，窗里原有的星一颗不动
    function addOuterStars(g, stars) {
      var rnd = mulberry(cfg.seed + 5), n = Math.round((g.W + 2 * g.m) * (g.H + 2 * g.m) / 90);
      for (var i = 0; i < n; i++) {
        var x = rnd() * (g.W + 2 * g.m) - g.m, y = rnd() * (g.H + 2 * g.m) - g.m;
        var s = { x: x, y: y, b: 0.35 + rnd() * 0.65, c: STAR_COLS[(rnd() * STAR_COLS.length) | 0], sp: 0.6 + rnd() * 2.2, ph: rnd() * 6.28, big: rnd() < 0.06 };
        if (g.inWin(x, y) && y < g.H * 0.85) continue;
        stars.push(s);
      }
    }

    function skyBase(r, g) {
      var m = g.m;
      for (var y = -m; y < g.H + m; y++) {
        var tt = (y + m) / (g.H * 0.9 + m);
        for (var x = -m; x < g.W + m; x++) {
          // 左上最暗偏紫，越靠近景物越蓝
          var c = band(vl.sky, clamp(tt * 0.8 + (x / g.W) * 0.25, 0, 1), x, y);
          var n = fbm2(x * 0.018, y * 0.026, 91);
          if (n > 0.56 && dith(x, y, (n - 0.56) * 3)) c = mix(c, vl.neb, 0.22);
          r.px(x, y, c);
        }
      }
      dyn.skyBase = new Uint8ClampedArray(r.d);
    }

    function drawSpace(r, g, t) {
      if (!dyn.skyBase || dyn.skyBase.length !== r.d.length) skyBase(r, g);
      else r.d.set(dyn.skyBase);
      dyn.stars.forEach(function (s) {
        var a = s.b * (reduce ? 0.85 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
        a = Math.round(a * 4) / 4;
        if (a <= 0) return;
        r.px(s.x, s.y, s.c, a);
        if (s.big && a > 0.5) { r.px(s.x - 1, s.y, s.c, a * 0.45); r.px(s.x + 1, s.y, s.c, a * 0.45); r.px(s.x, s.y - 1, s.c, a * 0.45); r.px(s.x, s.y + 1, s.c, a * 0.45); }
      });
      if (reduce) return;
      if (!dyn.shoot && t > dyn.nextShoot) {
        dyn.shoot = { x: g.W * (0.12 + Math.random() * 0.3), y: g.H * (0.04 + Math.random() * 0.16), t: t };
        dyn.nextShoot = t + 6 + Math.random() * 7;
      }
      if (dyn.shoot) {
        var k = (t - dyn.shoot.t) / 0.7;
        if (k > 1) { dyn.shoot = null; return; }
        var hx = dyn.shoot.x - k * g.W * 0.2, hy = dyn.shoot.y + k * g.W * 0.08;
        for (var i = 0; i < 12; i++) r.px(hx + i * 2.2, hy - i * 0.9, [255, 250, 230], (1 - i / 12) * (1 - k * 0.6));
      }
    }

    function drawView(r, g, t) {
      var started = performance.now();
      t = reduce ? 0 : t;
      if (cfg.view === 'jarilo') drawJariloBig(r, g);
      else if (cfg.view === 'station') drawStationBig(r, g, t);
      else if (cfg.view === 'penacony') drawPenaconyBig(r, g, t);
      else if (cfg.view === 'xianzhou') drawXianzhouBig(r, g, t);
      else drawAmphoreusBackdrop(r, g, reduce ? 0 : t);
      if (cabinPaint) paintViewCabin(r, CABIN[cfg.cabin]);
      if (g.atlasFit) {
        container.setAttribute('data-atlas-visible', g.atlasFit.visible.toFixed(3));
        container.setAttribute('data-atlas-center', g.atlasFit.center.map(function (v, i) { return (v / (i ? g.H : g.W)).toFixed(4); }).join(','));
        if (g.atlasFit.starScale) container.setAttribute('data-star-scale', g.atlasFit.starScale.toFixed(3));
      }
      if (location.search.indexOf('hero=') >= 0) {
        var hash = 2166136261, count = 0, colours = new Set();
        for (var i = 0; i < r.d.length; i += 4) {
          if (r.d[i + 3]) {
            count++;
            colours.add(r.d[i] | (r.d[i + 1] << 8) | (r.d[i + 2] << 16));
          }
          hash = Math.imul(hash ^ r.d[i] ^ (r.d[i + 1] << 8) ^ (r.d[i + 2] << 16) ^ (r.d[i + 3] << 24), 16777619);
        }
        container.setAttribute('data-view-hash', String(hash >>> 0));
        container.setAttribute('data-view-pixels', String(count));
        container.setAttribute('data-view-colours', String(colours.size));
        container.setAttribute('data-view-render-ms', (performance.now() - started).toFixed(1));
      }
      // 景色画好后量一次窗光，船舱 / 摆设 / 人物影子都按它来；翁法罗斯的亮星在灯光层里，量的时候临时画回来一起算（和挪层之前一样）
      if (!g.win) {
        if (viewFxLit) {
          var keep = new Uint8ClampedArray(r.d);
          drawAmphoreusSparks(r, g, t);
          drawAmphoreusRibbon(r, g, t);
          viewFx(r, g, t); measureWindowLight(r, g, vl); r.d.set(keep);
        }
        else measureWindowLight(r, g, vl);
      }
    }

    // ---------- 近景：两人 + 脚下影子 ----------
    function pairX(g) {
      var pose = POSES[cfg.pose], k = g.chars.h / 105, xs = {};
      xs[pose.order[0]] = g.chars.x - pose.gap / 2 * k;
      xs[pose.order[1]] = g.chars.x + pose.gap / 2 * k;
      return xs;
    }

    function drawChars(r, g) {
      var pose = POSES[cfg.pose], C = g.chars, k = C.h / 105, xs = pairX(g);
      var light = { shadow: vl.shadow, dim: 0.14, rim: vl.rim, rimA: 0.35 };
      var sp = { tb: charSprite(cfg.tb, pose.tb, light, k), ff: charSprite('firefly', pose.ff, light, k) };
      // 影子：光从窗外来，影子贴地朝观者这边拖出去，并背着窗光的重心往两侧偏；窗外越亮影子越实
      var shade = hex('#000008'), W0 = g.win, str = W0 ? clamp(0.35 + W0.mean * 1.8, 0.4, 0.85) : 0.5;
      ['tb', 'ff'].forEach(function (who) {
        var x = xs[who], y = C.feet, len = 30 * k * (0.75 + (W0 ? W0.mean : 0.2));
        var dir = W0 ? clamp((x - W0.cx) / (g.H * 0.55), -0.9, 0.9) : 0.3;
        // 两档实色：靠脚的一截深、远端淡（不用棋盘格抖动，免得地上一片麻点）
        r.poly([[x - 4.8 * k, y], [x + 4.8 * k, y], [x + dir * len + 8 * k, y + len], [x + dir * len - 8 * k, y + len]], function (px, py) {
          var f = (py - y) / len;
          return [shade, str * (f < 0.45 ? 0.6 : 0.3)];
        });
        r.ellipse(x, y + 0.5, 7.5 * k, 1.7 * k, 0, [shade, 0.6]);
      });
      var back = pose.front === 'tb' ? 'ff' : 'tb';
      [back, pose.front].forEach(function (who) { var s = sp[who]; r.blit(s, Math.round(xs[who] - s.ax), Math.round(C.feet - s.ay)); });
    }

    // ---------- 前景粒子：舱内漂浮的微尘 + 流萤身边几只萤火虫 ----------
    function initFx(g) {
      var rnd = mulberry(cfg.seed + 13), fx = [], k = g.chars.h / 105, ffx = pairX(g).ff;
      for (var i = 0; i < (cfg.chars ? 8 : 0); i++) {
        fx.push({ kind: 'firefly', x: ffx - 22 * k + rnd() * 44 * k, y: g.chars.feet - 115 * k + rnd() * 90 * k, ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.5, blink: 1.5 + rnd() * 2.5, amp: (3 + rnd() * 6) * k });
      }
      for (var j = 0; j < 34; j++) {
        fx.push({ kind: 'dust', x: rnd() * (g.W + 2 * g.m) - g.m, y: rnd() * g.H, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.4, s: rnd() });
      }
      dyn.fx = fx;
    }

    function drawFx(r, g, t, kind) {
      var span = g.H + 2 * g.m, glow = hex(vl.rim);
      dyn.fx.forEach(function (p) {
        if (p.kind !== kind) return;
        var x, y, a;
        if (p.kind === 'firefly') {
          x = p.x + Math.sin(t * p.sp + p.ph) * p.amp; y = p.y + Math.cos(t * p.sp * 0.8 + p.ph) * p.amp * 0.6;
          a = reduce ? 0.8 : Math.max(0, Math.sin(t * 6.28 / p.blink + p.ph));
          if (a < 0.1) return;
          r.px(x, y, [236, 255, 160], a);
          if (a > 0.5) { r.px(x - 1, y, [160, 235, 110], a * 0.4); r.px(x + 1, y, [160, 235, 110], a * 0.4); r.px(x, y - 1, [160, 235, 110], a * 0.4); r.px(x, y + 1, [160, 235, 110], a * 0.4); }
        } else {
          y = ((p.y - t * (1 + p.sp * 2)) % span + span) % span - g.m; x = p.x + Math.sin(t * p.sp + p.ph) * 4;
          a = 0.12 + 0.18 * Math.sin(t * 1.5 + p.ph);
          if (a > 0.05) r.px(x, y, glow, a);
        }
      });
    }

    function initDyn() {
      initStars(geo);
      initFx(geo);
    }

    // ---------- 组装（远 → 近）----------
    layer('space', 0.03, drawSpace, true);
    layer('view', 0.1, drawView, cfg.view !== 'jarilo');
    // 翁法罗斯玻璃带后面的碎光：两倍像素密度（更细）、帧率和灯光层一样高
    if (cfg.view === 'amphoreus') layer('view-sparks', 0.1, function (r, g, t) { drawAmphoreusSparks(r, g, reduce ? 0 : t); }, true).fast = true;
    if (cfg.view === 'amphoreus') layer('view-detail', 0.1, function (r, g, t) {
      drawAmphoreusRibbon(r, g, reduce ? 0 : t);
    }, true);
    // 景色上面的灯光 / 亮光层（空间站的灯、翁法罗斯玻璃带前面的光和亮星）：视差和景色层一样，但帧率高（约 30 帧 / 秒，景色层约 12 帧 / 秒）
    var viewFx = { station: drawStationFx, amphoreus: drawAmphoreusFx }[cfg.view], viewFxLit = cfg.view === 'amphoreus';
    if (viewFx) layer('view-fx', 0.1, function (r, g, t) { viewFx(r, g, reduce ? 0 : t); }, true).fast = true;
    // 视差深度：舱壁 / 窗台线 D0，画面下沿的地板 D1；地面深度 d 处 = D0 + (D1 − D0)·d
    var D0 = 0.32, D1 = 0.8;
    function floorDepth(d) { return D0 + (D1 - D0) * d; }
    var floorAnim = FLOOR_ANIM[cfg.cabin];
    layer('floor', 0, function (r, g) { drawCabinFloor(r, g, cfg); }, false, floorAnim && {
      has: function () { return true; },
      draw: function (r, g, t) { floorAnim(r, g, CABIN[cfg.cabin], castFn(vl), t); }
    }).floor = true;
    var decoAnim = DECO_ANIM[cfg.cabin];
    layer('cabin', D0, function (r, g, t) { drawCabin(r, g, cfg, t); }, false, decoAnim && {
      has: function () { return true; },
      draw: function (r, g, t) { decoAnim(r, g, CABIN[cfg.cabin], castFn(vl), t); }
    });
    // 舱壁上的时钟（09c-cabin-clock，时:分）：单独一层、视差和舱壁同速；不跟着 12 帧 / 秒的节拍重画，
    // 由下面的计时器每半秒看一眼，时间或冒号的亮灭变了才重画（星穹列车舱本来有挂钟，不建这层）
    var clock = { colon: true, key: '', timer: 0 };
    var clockL = cabinHasClock(cfg) ? layer('clock', D0, function (r, g) { drawCabinClock(r, g, cfg, castFn(vl), new Date(), clock.colon); }, false) : null;
    // 摆设按深度分四层（贴墙 / 中排 / 前排 / 最前），人物夹在贴墙那层和中排之间；各层视差 = 脚下那排地板的视差
    function propLayer(name, band) {
      layer(name, function (g) { return floorDepth(bandDepth(g, cfg, band)); }, function (r, g) { drawProps(r, g, cfg, band); }, false, {
        has: function (g) { return propsAnimated(g, cfg, band); },
        draw: function (r, g, t) { animProps(r, g, cfg, band, t); }
      });
    }
    propLayer('props', 0);
    // 人物：视差取脚下那一点的地板深度；流萤身边的萤火虫跟人物同层（不然鼠标一动就飘离她身边）。没抽到人物（cfg.chars）就不建这层
    if (cfg.chars) layer('chars', function (g) {
      var top = g.floor.t0 + g.floor.slope * g.chars.x;
      return floorDepth(clamp((g.chars.feet - top) / g.floor.dn, 0, 1));
    }, drawChars, false, {
      has: function () { return true; },
      draw: function (r, g, t) { drawFx(r, g, t, 'firefly'); }
    });
    propLayer('props-mid', 1);
    propLayer('front', 2);
    propLayer('near', 3);
    layer('fx', 1, function (r, g, t) { drawFx(r, g, t, 'dust'); }, true);

    function renderAll() {
      layout();
      initDyn();
      var t = (performance.now() - t0) / 1000;
      layers.forEach(function (L) { if (!L.off) paint(L, t); else L.stale = true; });   // 停着的层这次没画（画布尺寸变了已被清空），重新显示时再补画
    }
    renderAll();
    var loadScene = { station: loadStation, penacony: loadPenacony, xianzhou: loadXianzhou, amphoreus: loadAmphoreus }[cfg.view];
    if (loadScene) loadScene().then(function () {
      if (destroyed) return;
      geo.win = null;
      layers.forEach(function (L) { paint(L, reduce ? 0 : (performance.now() - t0) / 1000); });
    });

    // ---------- 视差 + 动画循环 ----------
    function onMove(e) {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
      wake();
    }
    if (!reduce && window.matchMedia('(hover: hover)').matches) window.addEventListener('pointermove', onMove, { passive: true });

    // 地板的视差：地面上一点 (X, Y)（容器像素）的深度 = D0 + (D1 − D0)·(Y − 窗台线(X)) / 地板高，窗台线是斜的直线，
    // 所以位移 (cur.x, cur.y)·深度 是 X、Y 的线性函数——整块地板做一个仿射变换：沿窗台线和舱壁同速，越往下动得越多
    function floorTransform(L) {
      var F = geo.floor, P = geo.P, k = (D1 - D0) / (F.dn * P), T0 = F.t0 * P, sl = F.slope, base = D0 - k * T0;
      var tf = 'matrix(' + [1 - cur.x * k * sl, -cur.y * k * sl, cur.x * k, 1 + cur.y * k, cur.x * base, cur.y * base].map(function (v) { return v.toFixed(5); }).join(',') + ')';
      if (tf !== L.tf) { L.tf = tf; L.el.style.transform = tf; }
    }

    var raf = 0;
    function wake() { if (!raf && running && visible) raf = requestAnimationFrame(frame); }

    function frame(now) {
      raf = 0;
      if (!running || !visible) return;
      var t = Math.max(0, (now - t0) / 1000);   // rAF 的时间戳可能比挂载时刻还早一点
      var tx = -(mouse.x - 0.5) * 2 * geo.maxShift, ty = -(mouse.y - 0.5) * 2 * geo.maxShift * 0.5;
      cur.x += (tx - cur.x) * 0.07;
      cur.y += (ty - cur.y) * 0.07;
      var stationFloat = cfg.view === 'station' && cfg.art === 'hd' && !reduce;
      var floatPhase = t * Math.PI * 2 / 9;
      var floatX = stationFloat ? Math.sin(floatPhase * 0.5) * (geo.portrait ? 0.45 : 0.8) : 0;
      var floatY = stationFloat ? Math.sin(floatPhase) * (geo.portrait ? 1.8 : 3) : 0;
      layers.forEach(function (L) {
        if (L.off) return;
        if (L.floor) { floorTransform(L); return; }
        if (!L.depth) return;
        var ox = Math.round(cur.x * L.depth), oy = Math.round(cur.y * L.depth);
        // Move hull and its separately rendered lights by the same subpixel offset.
        if (stationFloat && (L.name === 'view' || L.name === 'view-fx')) {
          ox = Math.round((ox + floatX) * 1000) / 1000;
          oy = Math.round((oy + floatY) * 1000) / 1000;
        }
        if (ox !== L.ox || oy !== L.oy) {
          L.ox = ox; L.oy = oy;
          L.el.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0)';
        }
      });
      if (!reduce && now - lastTick > 83) {
        lastTick = now;
        layers.forEach(function (L) {
          if (L.fast || L.off) return;
          if (L.dynamic) paint(L, t);
          else if (L.base) paint(L, t, true);
        });
      }
      if (!reduce && now - lastFast > 32) {
        lastFast = now;
        layers.forEach(function (L) { if (L.fast && !L.off) paint(L, t); });
      }
      if (!reduce || Math.abs(tx - cur.x) > 0.3) raf = requestAnimationFrame(frame);
    }

    var resizeTimer = 0;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { renderAll(); wake(); }, 150);
    }
    function onVisibility() {
      visible = !document.hidden;
      wake();
    }
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    wake();

    function tickClock() {
      if (!clockL || clockL.off || !running || !visible || !clockL.r) return;
      var d = new Date(), colon = reduce || d.getSeconds() % 2 === 0, key = d.getHours() + ':' + d.getMinutes() + (colon ? '' : '.');
      if (key === clock.key) return;
      clock.key = key;
      clock.colon = colon;
      paint(clockL, 0);
    }
    if (clockL) (function loop() { tickClock(); clock.timer = setTimeout(loop, 500); })();

    function sceneT() { return reduce ? 0 : (performance.now() - t0) / 1000; }

    return {
      config: cfg,
      setRunning: function (on) {
        running = on;
        wake();
      },
      // 当前的像素倍数 / 视差边距（hero 退场的星空、穿梭、地球按同样大小的像素画）
      pixel: function () { return geo ? { P: geo.P, m: geo.m, W: geo.W, H: geo.H } : null; },
      // hero 退场：已经挪出屏幕的图层停掉（不再重画、不再跟鼠标视差，画布藏起来）；off = false 时恢复显示——
      // 画布上还留着停之前那一帧，直接露出来就行，只有停着期间窗口尺寸变过（画布被清空）才补画（整层同步重画会卡住那一帧）
      setOff: function (names, off) {
        layers.forEach(function (L) {
          if (names.indexOf(L.name) < 0 || L.off === off) return;
          L.off = off;
          L.el.style.visibility = off ? 'hidden' : '';
          if (!off) { L.ox = L.oy = L.tf = null; if (L.stale) { L.stale = false; paint(L, sceneT()); } }
        });
        wake();
      },
      // hero 退场：舱室要挪走了，窗外以外也补上星星，雅利洛的星球不再按窗台线裁（露出完整的球）
      fillSky: function () {
        if (skyFull || !geo) return;
        skyFull = true;
        geo.fullView = true;
        addOuterStars(geo, dyn.stars);
        layers.forEach(function (L) { if (L.name === 'view' && !L.dynamic && !L.off) paint(L, sceneT()); });
      },
      // 彻底拆掉：停循环、摘监听、清空画布（hero 退场结束后调用；回来时重新 mount，传 config 沿用同一个场景）
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        clearTimeout(resizeTimer);
        clearTimeout(clock.timer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        layers.forEach(function (L) {
          L.el.width = L.el.height = 0;
          L.el.remove();
          L.r = L.base = null;
        });
        layers.length = 0;
      }
    };
  }

  window.AboutPixelHero = { mount: mount };
})(window.__abPixel = window.__abPixel || {});
