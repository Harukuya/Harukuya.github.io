// 09-cafe-mount：把咖啡厅挂到 #ab-cafe 上
// 时间每次打开随机一个（调试：/about/?cafe=dawn|day|dusk|night 固定），整幅都用它。
// 像素是 Hero 的一半（Hero 画布高约 300 像素，这里约 540）；分几块画布叠起来：
//   窗外的天 → 云（另外慢慢往右飘）→ 窗外的小动画 → 房间 + 家具 → 霓虹招牌的亮光（咖啡杯、字各一层，各闪各的，能关）→ 屋里的小动画 → 最前面的盆栽和高脚凳。
// 鼠标视差：窗外挪得多（隔着窗框看外面在动）；屋里只挪一点——地面和家具在同一块画布上一起挪，前景的盆栽 / 高脚凳只比地面多挪一点点。
// 画一整幅要一两百毫秒，拆成十几小步放在浏览器空闲时做（空闲时间够就一次多做几步，不够就一步；不卡滚动）；窗口尺寸变了重画，画好之前旧的先留着。
// opts.manualStart：先不画，等调用 start() 才开始（about.js 等页面加载完、入场播完再开画，不和加载、入场抢主线程）。
// 只在 setRunning(true)（about.js：Hero 滚过一半、且不在分割段里）或纯享背景时、且页面在前台时动；减少动态效果：只画一帧、不视差、云不飘。
// 分割段：mirror(遮罩板, live) 在两块遮罩板里放一张对齐的快照，板滑开时咖啡厅跟着分开（见下面 mirror）。
// 手机（窄屏，宽 ≤ 768）：整幅仍按横屏的比例排（左边落地窗、右边砖墙和吧台），屏幕只露出最右边那一截（霓虹招牌、木架、黑板菜单、吧台）；
//   高度按地址栏收起时的最大高度画，地址栏出来 / 收起不用重画、底下也不会露空。
// 纯享背景：setSolo(true)（about.js 的右上角按钮）——纸色纱淡掉；点到能玩的东西（ctx.hot，画的时候记下的矩形）就玩，
//   点空白处调 opts.onSoloExit()。能玩的：唱片机（开关页眉里的店内 BGM，opts.music）、猫、吉他、萤火虫瓶、望远镜、咖啡机、霓虹招牌、帕姆。
(function (PX) {
  'use strict';

  PX.need('09-cafe-mount', ['CAFE_TIMES', 'CAFE_TIME_IDS', 'CafeLight', 'Raster', 'cafeApplyLights', 'cafeBar', 'cafeClouds', 'cafeCompose', 'cafeFloor', 'cafeFront',
    'cafeFxFast', 'cafeFxIn', 'cafeFxOut', 'cafeHiss', 'cafeLayout', 'cafeLightAt', 'cafeLounge', 'cafePop', 'cafeRoom', 'cafeRoomLight', 'cafeShafts', 'cafeSky', 'cafeStrum', 'cafeWindowSeat', 'clamp']);
  var TIMES = PX.CAFE_TIMES, IDS = PX.CAFE_TIME_IDS, Raster = PX.Raster, clamp = PX.clamp;

  var TICK = 83, TICK_FAST = 33, CLOUD_SPEED = 0.8;   // 小动画每 83 毫秒一帧（猫甩尾巴那一下 33 毫秒一帧，甩得顺）；云每秒飘 0.8 个画布像素
  // 跟着鼠标挪的比例（× maxShift）：窗外 / 屋里（地面 + 家具）/ 最前面的盆栽和高脚凳
  var OUT_DEPTH = 0.7, ROOM_DEPTH = 0.14, FRONT_DEPTH = 0.2;
  var NARROW = 768, WIDE = 1.6;   // 窄屏（手机）：整幅按 16:10 的宽度排，右边对齐屏幕
  var SAY = { cat: ['喵', '喵~', '喵？', '呼噜呼噜…'], pompom: ['帕！', '帕~', '帕姆在此！'] };

  function pickTime() {
    var q = /[?&]cafe=([a-z]+)/.exec(location.search);
    if (q && TIMES[q[1]]) return q[1];
    return IDS[Math.floor(Math.random() * IDS.length)];
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // 现在的视口；窄屏的高度取地址栏收起时的最大高度（100lvh，不支持就用当前高度）
  var lvhProbe = null;
  function viewport() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w <= NARROW) {
      if (!lvhProbe) {
        lvhProbe = document.createElement('div');
        lvhProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';
        document.body.appendChild(lvhProbe);
      }
      h = Math.max(h, lvhProbe.offsetHeight);
    }
    return { w: w, h: h };
  }
  function canvasFrom(r) {
    var c = document.createElement('canvas');
    c.width = r.w; c.height = r.h;
    c.getContext('2d').putImageData(r.img, 0, 0);
    return c;
  }

  function mount(box, opts) {
    opts = opts || {};
    var reduce = !!opts.reduceMotion, T = TIMES[pickTime()], music = opts.music || null;
    box.dataset.time = T.id;
    var built = null, job = 0, running = false, solo = false, visible = !document.hidden, raf = 0, started = !opts.manualStart;
    var clock = 0, lastNow = 0, lastTick = -1e9, mouse = { x: 0.5, y: 0.5 }, cur = { x: 0, y: 0 };
    var ev = { tail: -1e9, jar: -1e9, scope: -1e9, burst: -1e9, neonOff: false, neonT: -1e9 };   // 纯享时点东西的时刻
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 60); };
    // 画布都插在这个占位前面（后面是点东西时弹出来的字 / 音符）
    var anchor = document.createComment('cafe-layers');
    box.appendChild(anchor);

    // 分十几小步画（每次空闲回调里，剩余时间够就接着做下一步）；中途窗口又变了就作废重来
    function build(deadline) {
      var my = ++job, vp = viewport(), vw = vp.w, vh = vp.h;
      var fw = vw <= NARROW ? Math.max(vw, Math.round(vh * WIDE)) : vw;   // 排版用的宽度（窄屏按横屏排，见文件开头）
      var P = clamp(Math.round(Math.max(fw / 460, vh / 300)), 2, 6), P2 = Math.max(2, Math.round(P / 2));
      var ox = Math.round((fw - vw) / P2) * P2;   // 整幅往左挪多少（屏幕外的左边那截），按整画布像素
      var maxShift = reduce ? 0 : Math.min(24, vw * 0.016), m = Math.ceil(maxShift / P2) + 2;
      var L = PX.cafeLayout(Math.ceil(fw / P2), Math.ceil(vh / P2), m), w = L.w, h = L.h;
      var ctx = { L: L, T: T, lights: [], shadows: [], fx: [], hot: [] }, R = {};
      // 顺序和原来一整块画时完全一样，只是切得更细（结果一像素不差）
      var steps = [
        function () { R.sky = new Raster(w, h, 0, 0); PX.cafeSky(R.sky, L, T); },
        function () { if (T.id !== 'night') { R.cloud = new Raster(w, h, 0, 0); PX.cafeClouds(R.cloud, L, T, w); } },
        function () { R.A = new Raster(w, h, 0, 0); PX.cafeRoom(R.A, ctx); },
        function () { PX.cafeFloor(R.A, ctx); },
        function () { R.B = new Raster(w, h, 0, 0); ctx.E = new Raster(w, h, 0, 0); ctx.N = new Raster(w, h, 0, 0); ctx.N2 = new Raster(w, h, 0, 0); PX.cafeWindowSeat(R.B, ctx); },
        function () { PX.cafeLounge(R.B, ctx); },
        function () { PX.cafeBar(R.B, ctx); },
        function () { R.F = new Raster(w, h, 0, 0); PX.cafeFront(R.F, ctx); },
        function () { R.LA = new PX.CafeLight(w, h, T.amb); PX.cafeApplyLights(R.LA, ctx, 'room'); PX.cafeRoomLight(R.LA, ctx); },
        function () { R.LB = new PX.CafeLight(w, h, T.amb); PX.cafeApplyLights(R.LB, ctx, 'obj'); },
        function () { R.LF = new PX.CafeLight(w, h, T.amb); PX.cafeApplyLights(R.LF, ctx, 'front'); },
        function () { PX.cafeShafts([R.LA, R.LB, R.LF], ctx); },
        function () { R.out = new Raster(w, h, 0, 0); PX.cafeCompose(R.A, R.LA, R.out); },
        function () { PX.cafeCompose(R.B, R.LB, R.out); R.out.blit(ctx.E, 0, 0); },
        function () { R.front = new Raster(w, h, 0, 0); PX.cafeCompose(R.F, R.LF, R.front); },
        function () {
          // 家具上的小动画按那一处的光调暗
          ctx.fx.forEach(function (f) {
            if (!f.lit) return;
            var x = Math.round(f.kind === 'tail' ? f.x + 17 * f.k : f.x), y = Math.round(f.kind === 'tail' ? f.y - 4 * f.k : f.y);
            x = clamp(x, 0, w - 1); y = clamp(y, 0, h - 1);
            var i = (y * w + x) * 3;
            f.mul = [clamp(R.LB.d[i], 0.15, 1.5), clamp(R.LB.d[i + 1], 0.15, 1.5), clamp(R.LB.d[i + 2], 0.15, 1.5)];
            // 猫尾巴尖：甩到的那一块逐像素记下实际乘上去的光（和画死的那截尾巴同一套算法），甩起来颜色和身上那截接得上
            var o = f.occ;
            if (o) {
              o.light = new Float32Array(o.w * o.h * 3);
              for (var yy = 0; yy < o.h; yy++) for (var xx = 0; xx < o.w; xx++) {
                var lx = o.x0 + xx, ly = o.y0 + yy;
                if (lx < 0 || ly < 0 || lx >= w || ly >= h) continue;
                var lc = PX.cafeLightAt(R.LB, lx, ly), q = (yy * o.w + xx) * 3;
                o.light[q] = lc[0]; o.light[q + 1] = lc[1]; o.light[q + 2] = lc[2];
              }
            }
          });
          finish(my, P2, m, L, ctx, R, vw, vh, maxShift, ox);
        }
      ];
      // 每次至少做一步；空闲回调给的剩余时间还够（> 6 毫秒）就接着做下一步，不够就等下一次空闲
      (function next(dl) {
        if (my !== job) return;
        do { steps.shift()(); } while (steps.length && dl && !dl.didTimeout && dl.timeRemaining() > 6);
        // 兜底 0.4 秒：页面一直「加载中」（外部请求挂着）时浏览器几乎不给空闲时间，不至于一步等一秒、十几步拖十几秒
        if (steps.length) idle(next, { timeout: 400 });
      })(deadline);
    }

    // 画好了：换上新画布（旧的一起拿掉）
    function finish(my, P2, m, L, ctx, R, vw, vh, maxShift, ox) {
      if (my !== job) return;
      var layers = [];
      function add(c, depth, extra) {
        c.className = 'ab-cafe-layer' + (depth || extra ? ' is-moving' : '');
        c.style.width = c.width * P2 + 'px'; c.style.height = c.height * P2 + 'px';
        c.style.left = -m * P2 - ox - (extra || 0) + 'px'; c.style.top = -m * P2 + 'px';
        var Lr = { c: c, depth: depth, tf: '', cloud: !!extra, dx: 0, dy: 0 };
        layers.push(Lr);
        return Lr;
      }
      add(canvasFrom(R.sky), OUT_DEPTH);
      if (R.cloud) {
        // 云：两块一样的图块并排，整体往右挪、挪满一块宽就回到原位（看起来一直在飘）
        var cc = document.createElement('canvas'), tc = canvasFrom(R.cloud);
        cc.width = R.cloud.w * 2; cc.height = R.cloud.h;
        cc.getContext('2d').drawImage(tc, 0, 0); cc.getContext('2d').drawImage(tc, R.cloud.w, 0);
        add(cc, OUT_DEPTH, R.cloud.w * P2);
      }
      var fo = document.createElement('canvas'); fo.width = L.w; fo.height = L.h;
      add(fo, OUT_DEPTH);
      // 霓虹两块：咖啡杯（ctx.N）和字（ctx.N2），各闪各的
      var room = add(canvasFrom(R.out), ROOM_DEPTH), neon = add(canvasFrom(ctx.N), ROOM_DEPTH), neon2 = add(canvasFrom(ctx.N2), ROOM_DEPTH);
      var fi = document.createElement('canvas'); fi.width = L.w; fi.height = L.h;
      add(fi, ROOM_DEPTH);
      add(canvasFrom(R.front), FRONT_DEPTH);
      if (built) built.layers.forEach(function (Lr) { Lr.c.remove(); });
      layers.forEach(function (Lr) { box.insertBefore(Lr.c, anchor); });
      built = {
        layers: layers, room: room, neon: neon, neonA: 1, neon2: neon2, neonA2: 1, hot: ctx.hot, P2: P2, m: m, ox: ox, w: L.w, h: L.h, maxShift: maxShift, vw: vw, vh: vh,
        cloudW: R.cloud ? R.cloud.w : 0, gIn: fi.getContext('2d'), gOut: fo.getContext('2d'),
        env: { L: L, T: T, fx: ctx.fx, shafts: ctx.shafts, music: music, ev: ev }
      };
      drawFx(reduce ? 3 : clock);
      place();
      if (mirrors.length) refreshMirrors();
      wake();
    }

    function drawFx(t) {
      PX.cafeFxIn(built.gIn, built.env, t);
      PX.cafeFxOut(built.gOut, built.env, t);
    }
    function place() {
      var drift = built.cloudW ? Math.floor(clock * CLOUD_SPEED) % built.cloudW : 0;
      built.layers.forEach(function (Lr) {
        if (!Lr.depth && !Lr.cloud) return;
        // 按整画布像素挪（和窗框的像素格对齐，遮罩板里的快照也能一像素不差）
        var P2 = built.P2, tx = Math.round(cur.x * Lr.depth / P2) * P2 + (Lr.cloud ? drift * P2 : 0), ty = Math.round(cur.y * Lr.depth / P2) * P2;
        var tf = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
        Lr.dx = tx; Lr.dy = ty;
        if (tf !== Lr.tf) { Lr.tf = tf; Lr.c.style.transform = tf; }
      });
      // 霓虹：关着就 0；开关的那 0.45 秒里亮灭交替；平时隔一阵闪一下。
      // 咖啡杯和字各闪各的（周期、错开的时刻都不一样，开关时字也晚一点点跟上），不会一起闪
      var a1 = neonAlpha(clock - ev.neonT, clock % 9.3), a2 = neonAlpha(clock - ev.neonT - 0.11, (clock + 5.2) % 12.7);
      if (a1 !== built.neonA) { built.neonA = a1; built.neon.c.style.opacity = a1; }
      if (a2 !== built.neonA2) { built.neonA2 = a2; built.neon2.c.style.opacity = a2; }
    }

    // dt = 距上次开关多久，ph = 在自己闪烁周期里的位置
    function neonAlpha(dt, ph) {
      var on = !ev.neonOff;
      if (dt >= 0 && dt < 0.45) on = Math.floor(dt / 0.075) % 2 ? ev.neonOff : !ev.neonOff;
      return on ? (ph < 0.35 && !(ph > 0.12 && ph < 0.2) ? 0.3 : 1) : 0;
    }

    function frame(now) {
      raf = 0;
      if (!built || !(running || solo) || !visible) { lastNow = 0; return; }
      if (lastNow) clock += Math.min(0.1, (now - lastNow) / 1000);   // 暂停过（切后台 / 被盖住）不补跑
      lastNow = now;
      var tx = -(mouse.x - 0.5) * 2 * built.maxShift, ty = -(mouse.y - 0.5) * built.maxShift;
      cur.x += (tx - cur.x) * 0.07; cur.y += (ty - cur.y) * 0.07;
      var tick = now - lastTick >= (PX.cafeFxFast(built.env, clock) ? TICK_FAST : TICK);
      if (tick) { lastTick = now; drawFx(clock); }
      place();
      if (tick && mirrorLive) refreshMirrors();
      raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && built && (running || solo) && visible && !reduce) raf = requestAnimationFrame(frame); }

    function setRunning(on) { running = !!on; wake(); }

    // ---------- 纯享背景 ----------
    function setSolo(on) {
      solo = !!on;
      box.classList.toggle('is-solo', solo);
      if (!solo) box.style.cursor = '';
      wake();
    }
    // 屏幕坐标 ↔ 房间那块画布的像素（房间层自己也跟着鼠标挪了 dx / dy）
    function hitAt(x, y) {
      if (!built) return null;
      var R = built.room, cx = (x - R.dx + built.ox) / built.P2 + built.m, cy = (y - R.dy) / built.P2 + built.m, best = null, ba = Infinity;
      built.hot.forEach(function (h) {
        if (cx < h.x0 || cx > h.x1 || cy < h.y0 || cy > h.y1) return;
        var a = (h.x1 - h.x0) * (h.y1 - h.y0);
        if (a < ba) { ba = a; best = h; }
      });
      return best;
    }
    function toScreen(cx, cy) { var R = built.room; return [(cx - built.m) * built.P2 + R.dx - built.ox, (cy - built.m) * built.P2 + R.dy]; }
    function act(h) {
      var top = toScreen((h.x0 + h.x1) / 2, h.y0 + 2);
      switch (h.id) {
        case 'record':
          if (music && music.toggle) music.toggle();
          break;
        case 'cat':
          ev.tail = clock;
          PX.cafePop(box, pick(SAY.cat), top[0], top[1]);
          break;
        case 'guitar':
          PX.cafeStrum();
          var mid = toScreen((h.x0 + h.x1) / 2, h.y0 + (h.y1 - h.y0) * 0.55);
          ['♪', '♫', '♩', '♬'].forEach(function (n, i) { PX.cafePop(box, n, mid[0] + (i - 1.5) * 14, mid[1] - i * 6, true, i * 110); });
          break;
        case 'jar': ev.jar = clock; break;
        case 'scope': ev.scope = clock; break;
        case 'espresso':
          ev.burst = clock;
          PX.cafeHiss();
          var sp = toScreen(h.x1 - 6, h.y0 + (h.y1 - h.y0) * 0.35);
          PX.cafePop(box, '滋——', sp[0], sp[1]);
          break;
        case 'neon': ev.neonOff = !ev.neonOff; ev.neonT = clock; break;
        case 'pompom': PX.cafePop(box, pick(SAY.pompom), top[0], top[1]); break;
      }
      wake();
    }
    box.addEventListener('click', function (e) {
      if (!solo) return;
      var h = hitAt(e.clientX, e.clientY);
      if (h) act(h);
      else if (opts.onSoloExit) opts.onSoloExit();
    });
    box.addEventListener('pointermove', function (e) {
      if (solo) box.style.cursor = hitAt(e.clientX, e.clientY) ? 'var(--ab-cursor-hand)' : ''; // 能点的东西上换成页面的像素小手
    });

    // ---------- 分割段的遮罩板 ----------
    // 分割段的两块全屏遮罩板（about.js 的分割动画）：板里放一张和背景对齐的咖啡厅快照 + 同样的纸色纱，
    // 板上下滑开时咖啡厅跟着分成两半，而不是被纯色的板盖掉。live = 快到分割段时每一拍都更新快照（进了分割段就停在那一帧）
    var mirrors = [], mirrorLive = false;
    function mirror(els, live) {
      els.forEach(function (el) {
        if (!el || mirrors.some(function (M) { return M.el === el; })) return;
        var wrap = document.createElement('div'), c = document.createElement('canvas'), veil = document.createElement('div');
        wrap.className = 'ab-cafe-mirror'; c.className = 'ab-cafe-layer'; veil.className = 'ab-cafe-mirror-veil';
        wrap.appendChild(c); wrap.appendChild(veil);
        el.insertBefore(wrap, el.firstChild);
        mirrors.push({ el: el, c: c, g: c.getContext('2d') });
      });
      if (live && !mirrorLive) refreshMirrors();
      mirrorLive = !!live;
    }
    function refreshMirrors() {
      if (!built) return;
      var P2 = built.P2, w = built.w, h = built.h, m = built.m;
      mirrors.forEach(function (M) {
        if (M.c.width !== w || M.c.height !== h) {
          M.c.width = w; M.c.height = h;
          M.c.style.width = w * P2 + 'px'; M.c.style.height = h * P2 + 'px';
        }
        M.c.style.left = -m * P2 - built.ox + 'px';
        M.c.style.top = -m * P2 - M.el.offsetTop + 'px';
        M.g.imageSmoothingEnabled = false;
        M.g.clearRect(0, 0, w, h);
        built.layers.forEach(function (Lr) {
          M.g.globalAlpha = Lr === built.neon ? built.neonA : Lr === built.neon2 ? built.neonA2 : 1;
          M.g.drawImage(Lr.c, Lr.dx / P2 - (Lr.cloud ? built.cloudW : 0), Lr.dy / P2);
        });
        M.g.globalAlpha = 1;
      });
    }

    if (!reduce && window.matchMedia('(hover: hover)').matches) {
      window.addEventListener('pointermove', function (e) { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight; }, { passive: true });
    }
    document.addEventListener('visibilitychange', function () { visible = !document.hidden; wake(); });
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!started) return;   // 还没开画（manualStart 等着 start()）：开画时自然按当时的尺寸画
        var vp = viewport();
        if (!built || built.vw !== vp.w || built.vh !== vp.h) build();
      }, 250);
    });
    if (started) idle(build, { timeout: 1500 });
    function start() {
      if (started) return;
      started = true;
      idle(build, { timeout: 1500 });
    }

    return { mirror: mirror, setRunning: setRunning, setSolo: setSolo, start: start, time: T.id };
  }

  window.AboutCafe = { mount: mount };
})(window.__abPixel = window.__abPixel || {});
