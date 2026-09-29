/**
 * About 页背景：一整幅像素咖啡厅内景（纯 Canvas 程序绘制），铺满视口，上面整幅一层纸色薄纱（见 about.css）。
 * 左边约六成是一整面落地窗（窗外的天随时间变），右边是砖墙和吧台。时间（清晨 / 白天 / 黄昏 / 夜晚）每次打开随机一个。
 * 和 Hero 共用 about-pixel 的模块机制与基础工具（window.__abPixel：Raster / band / hex / mix / 噪声 / 像素字…，见 about-pixel/01-core.js），
 * 但文件、名字都是自己的：导出的名字一律以 cafe 开头，不碰 Hero 的任何东西。
 *   01-cafe-kit：房间的透视、布局（每样东西摆在哪）、四个时间的光、光照图（albedo × 光 → 分档 + 抖动）
 *   02-cafe-sky：窗外（天、太阳 / 月亮 / 银河、远山、海、小镇、窗外的露台和树梢）
 *   03-cafe-room：房子本身（天花板木梁、落地窗框、砖柱、砖墙、木地板、地毯）
 *   04-cafe-window：最左边的靠窗座位（长凳、猫、小圆桌、吊篮绿植、小灯串）
 *   05-cafe-lounge：窗前的休息区（望远镜、小圆桌和笔记本、单人沙发、落地灯、边几、吉他）
 *   06-cafe-bar：右边的砖墙和吧台（霓虹招牌、挂钟、软木板、木架、黑板菜单、咖啡机、磨豆机、蛋糕柜、唱机、筒灯）
 *   07-cafe-front：最前面的盆栽和高脚凳
 *   08-cafe-fx：会动的小东西（热气、光里的浮尘、猫尾巴、唱片机、秒针、萤火虫瓶、窗外的云 / 鸟 / 星星 / 流星 / 列车）
 *   08b-cafe-play：纯享背景时点东西弹出来的字 / 音符，吉他和咖啡机的声音（现合成）
 *   09-cafe-mount：挂载、分层、视差、分割段的快照、纯享背景和点东西
 */
// 01-cafe-kit
// 画布坐标：W × H 是屏幕那一块（细像素：Hero 像素的一半），四周各多画 m 像素给鼠标视差；所以屏幕左上角在 (m, m)。
// 透视：一点透视，镜头正对后墙；后墙和地面交线 FL，视平线（灭点）VP；离后墙 D（按后墙处的像素算）的东西缩放 Dc / (Dc − D)。
(function (PX) {
  'use strict';

  PX.need('01-cafe-kit', ['dith', 'hex']);
  var dith = PX.dith, hex = PX.hex;

  // 四个时间：amb 环境光（乘在底色上）、sun 太阳（elev 仰角、az 横向偏、col 颜色；夜里没有）、lamps 灯开多亮、neon 招牌多亮、glass 窗玻璃反光
  var TIMES = {
    dawn: { id: 'dawn', name: '清晨', amb: [0.74, 0.68, 0.76], sun: { elev: 12, az: 38, col: [1.5, 1.08, 0.86], k: 0.42 }, lamps: 0.3, neon: 0.45 },
    day: { id: 'day', name: '白天', amb: [0.96, 0.95, 0.93], sun: { elev: 50, az: 28, col: [1.3, 1.2, 1], k: 0.32 }, lamps: 0, neon: 0.25 },
    dusk: { id: 'dusk', name: '黄昏', amb: [0.68, 0.56, 0.58], sun: { elev: 9, az: 26, col: [1.6, 0.98, 0.62], k: 0.5 }, lamps: 0.75, neon: 0.85 },
    night: { id: 'night', name: '夜晚', amb: [0.27, 0.28, 0.42], sun: null, lamps: 1, neon: 1 }
  };
  var TIME_IDS = ['dawn', 'day', 'dusk', 'night'];

  // 布局：W, H 屏幕那块的画布尺寸，m 视差边距。所有位置都按屏幕比例算，大小按 s = H / 540 缩放（参考画幅 960 × 540）
  function cafeLayout(W, H, m) {
    var s = H / 540;
    var L = {
      W: W, H: H, m: m, s: s, w: W + 2 * m, h: H + 2 * m,
      X: function (f) { return m + f * W; }, Y: function (f) { return m + f * H; }, u: function (v) { return v * s; }
    };
    L.CEIL = Math.round(L.Y(0.085));
    L.FL = Math.round(L.Y(0.73));
    L.VPx = L.X(0.5); L.VPy = L.Y(0.47);
    L.Dc = 600 * s;
    L.ps = 1.3 * s;                      // 家具的缩放（贴着后墙处）：1 单位 ≈ 0.7 厘米，家具比房子本身的比例大一点，画面更满
    // 落地窗：左三列（再往左伸出屏幕），四扇大窗 + 上面一排小窗
    L.win = { x0: L.X(-0.16), x1: L.X(0.585), top: L.CEIL + Math.round(10 * s), sill: L.FL - Math.round(16 * s) };
    L.win.mull = [-0.16, -0.002, 0.146, 0.293, 0.439, 0.585].map(function (f) { return Math.round(L.X(f)); });
    L.win.transom = L.win.top + Math.round(58 * s);
    L.win.fw = Math.max(2, Math.round(5 * s));
    L.pillar = [Math.round(L.X(0.585)), Math.round(L.X(0.624))];
    return L;
  }
  // 透视：离后墙 D 处、后墙坐标 xw（按后墙处的像素）→ 画布 x；地面上那一点的 y；该处的缩放
  function cafeDepth(L, D) {
    var k = L.Dc / (L.Dc - D);
    return {
      k: k,
      x: function (xw) { return L.VPx + (xw - L.VPx) * k; },
      y: function (hh) { return L.VPy + (L.FL - L.VPy) * k - (hh || 0) * k; }   // hh = 离地高度（按后墙处的像素）
    };
  }
  // 反过来：地面上的画布像素 (x, y) → 离后墙 D、后墙坐标 xw
  function cafeFloorAt(L, x, y) {
    var k = (y - L.VPy) / (L.FL - L.VPy);
    if (k < 1) k = 1;
    return { D: L.Dc * (1 - 1 / k), xw: L.VPx + (x - L.VPx) / k, k: k };
  }

  // ---------- 光照图 ----------
  // 每个像素一份 RGB 光强（1 = 不变）；最后 albedo × 光，光强按亮度分档（档与档之间用 4×4 Bayer 抖动过渡），保持像素画的色阶感
  function Light(w, h, amb) {
    this.w = w; this.h = h;
    this.d = new Float32Array(w * h * 3);
    for (var i = 0; i < w * h; i++) { this.d[i * 3] = amb[0]; this.d[i * 3 + 1] = amb[1]; this.d[i * 3 + 2] = amb[2]; }
  }
  Light.prototype.addPx = function (x, y, c, k) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    var i = (y * this.w + x) * 3;
    this.d[i] += c[0] * k; this.d[i + 1] += c[1] * k; this.d[i + 2] += c[2] * k;
  };
  Light.prototype.mulPx = function (x, y, f) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    var i = (y * this.w + x) * 3;
    this.d[i] *= f; this.d[i + 1] *= f; this.d[i + 2] *= f;
  };
  // 椭圆形的光池：中心最亮，往外按 (1 − r²)^p 衰减
  Light.prototype.pool = function (cx, cy, rx, ry, c, k, p) {
    p = p || 1.6;
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, e = dx * dx + dy * dy;
        if (e < 1) this.addPx(x, y, c, k * Math.pow(1 - e, p));
      }
    }
  };
  // 椭圆形的暗处（桌下、角落）：乘 1 − (1 − f) × 衰减
  Light.prototype.shadow = function (cx, cy, rx, ry, f, p) {
    p = p || 1;
    for (var y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (var x = Math.floor(cx - rx); x <= cx + rx; x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, e = dx * dx + dy * dy;
        if (e < 1) this.mulPx(x, y, 1 - (1 - f) * Math.pow(1 - e, p));
      }
    }
  };
  // 多边形区域加光（k 可以是函数 (x, y) → 强度）
  Light.prototype.poly = function (pts, c, k) {
    var y0 = Infinity, y1 = -Infinity;
    pts.forEach(function (p) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    for (var y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, y1); y++) {
      var cy = y + 0.5, xs = [];
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        if ((pts[i][1] > cy) !== (pts[j][1] > cy)) xs.push(pts[i][0] + (pts[j][0] - pts[i][0]) * (cy - pts[i][1]) / (pts[j][1] - pts[i][1]));
      }
      xs.sort(function (a, b) { return a - b; });
      for (var q = 0; q + 1 < xs.length; q += 2) {
        for (var x = Math.max(0, Math.ceil(xs[q] - 0.5)); x + 0.5 <= xs[q + 1] && x < this.w; x++) this.addPx(x, y, c, typeof k === 'function' ? k(x, y) : k);
      }
    }
  };

  // albedo（底色，带形体明暗）× 光 → 叠到 out 上（半透明的和 out 里已有的混合）；光强分档：每档 1/STEPS，档间抖动
  var STEPS = 7;
  // (x, y) 这一格实际乘上去的光（和 cafeCompose 一样：亮度分档、档间抖动）——会动的小东西要和画死的部分同色时用（猫尾巴尖）
  function cafeLightAt(light, x, y) {
    var i = y * light.w + x, ld = light.d, r = ld[i * 3], g = ld[i * 3 + 1], b = ld[i * 3 + 2], lum = (r + g + b) / 3;
    if (lum > 0.001) {
      var v = lum * STEPS, lv = Math.floor(v);
      if (dith(x, y, v - lv)) lv++;
      var f = lv / STEPS / lum;
      r *= f; g *= f; b *= f;
    }
    return [r, g, b];
  }

  function cafeCompose(albedo, light, out) {
    var a = albedo.d, o = out.d, ld = light.d, w = albedo.w, h = albedo.h;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = y * w + x, j = i * 4;
        if (!a[j + 3]) continue;
        var r = ld[i * 3], g = ld[i * 3 + 1], b = ld[i * 3 + 2], lum = (r + g + b) / 3;
        if (lum > 0.001) {
          var v = lum * STEPS, lv = Math.floor(v);
          if (dith(x, y, v - lv)) lv++;
          var f = lv / STEPS / lum;
          r *= f; g *= f; b *= f;
        }
        var cr = Math.min(255, a[j] * r), cg = Math.min(255, a[j + 1] * g), cb = Math.min(255, a[j + 2] * b), al = a[j + 3] / 255;
        if (al >= 1 || !o[j + 3]) { o[j] = cr; o[j + 1] = cg; o[j + 2] = cb; o[j + 3] = a[j + 3]; continue; }
        // 半透明的（玻璃罩、玻璃罐…）盖在已经画好的东西上：和底下混合，不能把底下变透明（否则会透出最后面的窗外）
        var ob = o[j + 3] / 255, oa = al + ob * (1 - al);
        o[j] = (cr * al + o[j] * ob * (1 - al)) / oa; o[j + 1] = (cg * al + o[j + 1] * ob * (1 - al)) / oa; o[j + 2] = (cb * al + o[j + 2] * ob * (1 - al)) / oa;
        o[j + 3] = oa * 255;
      }
    }
  }

  // 家具摆放：屏幕横向 fx 处、离后墙 D（按参考尺寸的像素）→ 地面那一点的画布坐标 + 缩放 k（家具的 1 单位 → 画布像素）
  function cafeSpot(L, fx, D) { var dd = cafeDepth(L, D * L.s); return { x: L.X(fx), y: dd.y(), k: L.ps * dd.k }; }
  // 灯：家具画的时候往 ctx.lights 里记 { x, y, rx, ry, col, k, on: 'lamps' | 'neon' | 'always' | 'warm'（黄昏 / 夜里 / 清晨才亮）}，
  // 这里按时间乘上亮度加进光照图；ctx.shadows 是桌下 / 家具脚下的接触阴影
  function cafeApplyLights(Lt, ctx, kind) {
    var T = ctx.T;
    ctx.lights.forEach(function (l) {
      var on = l.on === 'lamps' ? T.lamps : l.on === 'neon' ? T.neon : l.on === 'warm' ? (T.id === 'day' ? 0 : T.id === 'night' ? 1 : 0.6) : 1;
      if (on > 0 && (!l.only || l.only === kind)) Lt.pool(l.x, l.y, l.rx, l.ry, l.col, l.k * on, l.p);
    });
    if (kind !== 'front') ctx.shadows.forEach(function (sh) { Lt.shadow(sh.x, sh.y, sh.rx, sh.ry, sh.f, 1.2); });
  }

  // 纯享背景时可以点的东西：记一块矩形（画布像素，pts 是几个角点，取包围盒再往外放 pad）
  function cafeHot(ctx, id, pts, pad) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    pad = pad || 0;
    ctx.hot.push({ id: id, x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad });
  }

  // 小工具
  function rnd(n, seed) { var x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); }
  function shade(c, f) { c = hex(c); return [c[0] * f, c[1] * f, c[2] * f]; }
  function lerpC(a, b, t) { a = hex(a); b = hex(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  // 竖直渐变的颜色（stops 从上到下），抖动过渡
  function vgrad(stops, t, x, y) {
    t = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
    var i = Math.floor(t), f = t - i;
    return dith(x, y, f) ? stops[i + 1] : stops[i];
  }

  PX.provide('01-cafe-kit', { CAFE_TIMES: TIMES, CAFE_TIME_IDS: TIME_IDS, CafeLight: Light, cafeApplyLights: cafeApplyLights, cafeCompose: cafeCompose, cafeDepth: cafeDepth, cafeLightAt: cafeLightAt, cafeHot: cafeHot,
    cafeFloorAt: cafeFloorAt, cafeLayout: cafeLayout, cafeLerp: lerpC, cafeRnd: rnd, cafeShade: shade, cafeSpot: cafeSpot, cafeVgrad: vgrad });
})(window.__abPixel = window.__abPixel || {});
