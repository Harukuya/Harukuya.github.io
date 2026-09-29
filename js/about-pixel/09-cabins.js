// About 页像素 Hero · 09-cabins：船舱：构图骨架、地板 / 窗台 / 舱壁 / 横梁、五种舱室的门和墙面、成组摆放的摆设和它们的小动画
// 独立作用域：只能用下面 PX.need 声明过的别的文件的名字；给别的文件用的东西在末尾 PX.provide 里列出（机制见 01-core.js 开头）
(function (PX) {
  'use strict';

  PX.need('09-cabins', ['VIEW_LIGHT', 'clamp', 'dith', 'drawText', 'hash', 'hex', 'lerp', 'mix', 'mulberry',
    'smooth', 'textWidth']);
  var VIEW_LIGHT = PX.VIEW_LIGHT, clamp = PX.clamp, dith = PX.dith, drawText = PX.drawText, hash = PX.hash,
    hex = PX.hex, lerp = PX.lerp, mix = PX.mix, mulberry = PX.mulberry, smooth = PX.smooth, textWidth = PX.textWidth;

  // ========== 构图 + 船舱（中景）==========
  // 构图照搬同人图 "Let's go on a trip."（用它 1920×1080 的坐标，横屏按宽高比例映射，竖屏另收一版）：
  //   左侧一整面大舷窗，上、左两边不见窗框；窗台是一条从左到右微微上扬的引导线（深色窗台带 + 一排小灯）；
  //   右上是层层叠叠的天花横梁，左端切成一道斜向右下的阶梯线，梁上成排小灯与长灯带，中间斜压一道阴影；
  //   右下是被窗外光照亮的舱壁，前面一排机柜 / 箱子的剪影；地板大部分被窗光照着（两档亮色），只有右下角一小块压暗；
  //   右下的地板上再散放几件摆设，越靠近画面下沿越大，最近的一件被画框裁掉一截（前中后三排，拉出纵深）。
  // 五种主题（观景台 / 星穹列车 / TechCafe / 货舱 / 具身智能实验舱）换材质、灯色、舱门、墙上的东西、地面纹样和摆设，骨架不变。

  // 参考坐标里的骨架
  var REF = {
    edge: [[955, -80], [1310, 480], [1250, 560], [1250, 1400]],      // 右侧结构的左边界
    beams: [[-120, 140], [153, 227], [240, 333], [353, 440], [453, 526]], // 横梁在左端的上下沿
    beamSlope: 0.07,                                                   // 梁缝往右微微下斜
    shade: [1133, 1293, 0.64],                                         // 阴影带：y=0 时左右边界 + 斜率
    dots: [[1400, 92, 1545, 101, 3], [1360, 138, 1450, 146, 2], [1150, 202, 1505, 236, 7], [1305, 384, 1612, 419, 6]],
    strips: [[1670, 31, 0.052, 3.5], [1585, 106, 0.066, 4], [1480, 144, 0.1, 6], [1530, 209, 0.09, 4], [1810, 627, 0.11, 4]],
    tube: [1660, 325],
    wallTop: [1250, 548, 0.1]                                          // 舱壁上沿：起点 + 往右的斜率
  };

  function composition(g) {
    var W = g.W, H = g.H, m = g.m;
    if (!g.portrait) {
      g.sx = W / 1920; g.sy = H / 1080;
      g.RX = function (x) { return x * g.sx; };
      g.RY = function (y) { return y * g.sy; };
      g.sill0 = H * 0.859;
      g.chars = { x: W * 0.382, feet: Math.round(H * 0.866), h: H * 0.24 };   // 从右往左 0.618（黄金分割）处
      g.view = { x: W * 0.31, y: H * 0.43, S: H * 0.6 };
      g.planet = { x: W * 0.3615, y: H + 163 * g.sy, R: 913 * g.sy };
    } else {
      // 竖屏：舷窗占满上方，右上角只露出横梁的阶梯端头，右侧一窄条舱壁
      g.sx = W / 1500; g.sy = H / 1500;
      g.RX = function (x) { return W * 0.72 + (x - 955) * g.sx; };
      g.RY = function (y) { return y * g.sy; };
      g.sill0 = H * 0.8;
      g.chars = { x: W * 0.5, feet: Math.round(H * 0.835), h: H * 0.2 };
      g.view = { x: W * 0.5, y: H * 0.4, S: W * 0.74 };
      g.planet = { x: W * 0.46, y: H * 0.4 + W * 1.35, R: W * 1.35 };
    }
    g.jk = 11;
    g.slope = -0.0625;
    g.sillAt = function (x) { return g.sill0 + g.slope * x; };
    g.band = Math.max(8, Math.round(40 * Math.min(g.sy * 1.15, H / 1080)));
    var E = REF.edge.map(function (p) { return [g.RX(p[0]), g.RY(p[1])]; });
    g.edgeAt = function (y) {
      for (var i = 0; i + 1 < E.length; i++) {
        if (y <= E[i + 1][1]) return lerp(E[i][0], E[i + 1][0], clamp((y - E[i][1]) / (E[i + 1][1] - E[i][1]), 0, 1));
      }
      return E[E.length - 1][0];
    };
    g.wallTopAt = function (x) { return g.RY(REF.wallTop[1]) + (x - g.RX(REF.wallTop[0])) * REF.wallTop[2] * g.sy / g.sx * (g.portrait ? 0.4 : 1); };
    g.inWin = function (x, y) { return y < g.sillAt(x) && x < g.edgeAt(y); };
  }

  // 场景光：把主题颜色往窗外光的色相上染（保持明度）
  function castFn(vl) {
    var cc = hex(vl.cast), cl = 0.3 * cc[0] + 0.59 * cc[1] + 0.11 * cc[2];
    var memo = {};
    return function (c) {
      var key = typeof c === 'string' ? c : c.join(',');
      if (memo[key]) return memo[key];
      var h = hex(c), l = 0.3 * h[0] + 0.59 * h[1] + 0.11 * h[2], f = l / cl;
      return (memo[key] = mix(h, [Math.min(255, cc[0] * f), Math.min(255, cc[1] * f), Math.min(255, cc[2] * f)], vl.castA));
    };
  }

  var CABIN = {
    // 科幻观景台：参考图本色
    deck: {
      beamLit: ['#5a6bd6', '#4455c0', '#3444a4', '#2a3890'], lip: '#7888e8', gap: '#0a0c26', shade: '#0c0d24',
      far: ['#07091a', '#0d122e', '#1b2754', '#27396e', '#314a84'],
      wall: ['#26358f', '#4a66c4', '#6385de', '#5c80c2', '#577baf'], wallLine: '#1e2a78',
      dot: '#f2f5ff', strip: '#eef3ff', tube: '#e6eeff', glowC: [200, 215, 255],
      sill: ['#15172e', '#131844', '#1d2f80', '#152579'], sillLight: '#f0f4ff',
      floor: ['#10154a', '#0c0f38', '#090b2a'], floorGlow: '#2a3aa6', floorDark: '#020308', seam: '#1e2a70', gloss: 0.34,
      prop: { lit: '#4e66c8', base: '#2f4299', dark: '#151a40', rib: '#1b275d' },
      pattern: 'guides', door: 'slide', items: deckItems,
    },
    // 星穹列车观景车厢：深色木梁 + 黄铜饰线，暖光灯泡，红丝绒窗台，地上红地毯
    express: {
      beamLit: ['#8a6a58', '#735444', '#5e4234', '#4c3428'], lip: '#d4a656', gap: '#170d09', shade: '#120a07',
      far: ['#0e0806', '#1c120c', '#2c1c14', '#3a261a', '#46301f'],
      wall: ['#3c241a', '#5e3c2c', '#744a34', '#6a4430', '#5c3a2a'], wallLine: '#2a1810',
      dot: '#ffdca0', strip: '#e0b060', tube: '#d8a850', glowC: [255, 205, 140],
      sill: ['#1c100b', '#3a141c', '#6e1e2a', '#521620'], sillLight: '#ffdca0',
      floor: ['#44121c', '#340e16', '#240a10'], floorGlow: '#7a3444', floorDark: '#080303', seam: '#5a1c26',
      prop: { lit: '#9a3a48', base: '#6e1e2a', dark: '#2a0c10', rib: '#c89a52' },
      pattern: 'rug', door: 'train', items: expressItems,
    },
    // 星际 TechCafe：暖木横梁挂彩色小灯串，舱壁上小黑板，吧台 + 咖啡机
    cafe: {
      beamLit: ['#7a5c48', '#664a3a', '#523a2e', '#422e24'], lip: '#a8845e', gap: '#120c09', shade: '#0f0a07',
      far: ['#0c0907', '#1a130e', '#281e16', '#34271c', '#3e2f22'],
      wall: ['#382a22', '#56443a', '#6a5646', '#62503e', '#584636'], wallLine: '#261c15',
      dot: '#ffd98a', strip: '#ffd98a', tube: '#ffcf7a', glowC: [255, 210, 150],
      sill: ['#1a120c', '#2a1e16', '#4e3a2a', '#3c2c20'], sillLight: '#ffd98a',
      floor: ['#34261c', '#281d15', '#1c140e'], floorGlow: '#5a4636', floorDark: '#060403', seam: '#42321f', gloss: 0.2,
      prop: { lit: '#8a6a4c', base: '#5e4432', dark: '#2a1e16', rib: '#3c2c20' },
      pattern: 'planks', door: 'wood', items: cafeItems
    },
    // 货舱：灰色金属梁端头刷黄黑警示条，橙色信号灯，管线；地面金属格栅
    hangar: {
      beamLit: ['#6c7688', '#5a6476', '#4a5364', '#3c4454'], lip: '#a4aec0', gap: '#0c0e12', shade: '#0b0c0f',
      far: ['#08090c', '#12151b', '#1e232c', '#282e38', '#313844'],
      wall: ['#2a3039', '#454d5a', '#56606e', '#505a68', '#48515e'], wallLine: '#1e2229',
      dot: '#ffb45a', strip: '#e8eef8', tube: '#e8b83a', glowC: [255, 180, 90],
      sill: ['#131518', '#1c1f24', '#2a2f37', '#1c1f24'], sillLight: '#ffb45a', hazard: true,
      floor: ['#1f2329', '#181b20', '#111317'], floorGlow: '#3a4250', floorDark: '#040405', seam: '#2e343e', gloss: 0.24,
      prop: { lit: '#6e788a', base: '#4a5262', dark: '#1c2026', rib: '#2c323c' },
      pattern: 'bays', door: 'shutter', items: hangarItems
    },
    // 具身智能实验舱：浅灰蓝的干净舱壁，青色灯带；防静电地板格 + 黄黑警戒线圈出的测试区
    lab: {
      beamLit: ['#8a98a8', '#768494', '#627080', '#505c6a'], lip: '#b8c6d4', gap: '#0c1014', shade: '#0a0d10',
      far: ['#080a0d', '#11161b', '#1c242c', '#27313b', '#303c48'],
      wall: ['#34444c', '#566a74', '#6c848e', '#667e88', '#5c727c'], wallLine: '#24323a',
      dot: '#c6f8ff', strip: '#e8fbff', tube: '#7ff0ff', glowC: [150, 240, 255],
      sill: ['#12181c', '#1a2328', '#28545c', '#1a2328'], sillLight: '#9ff4ff',
      floor: ['#2a3438', '#222a2e', '#1a2024'], floorGlow: '#4a5a60', floorDark: '#050708', seam: '#3c4a50', gloss: 0.28,
      prop: { lit: '#a4b2be', base: '#6e7c88', dark: '#2e363e', rib: '#3e4852' },
      pattern: 'tiles', door: 'slide', items: labItems
    }
  };

  function drawCabin(r, g, cfg, t) {
    var th = CABIN[cfg.cabin], vl = VIEW_LIGHT[cfg.view], T = castFn(vl), rnd = mulberry(cfg.seed + 21);
    drawSill(r, g, th, T);
    drawWall(r, g, th, T);
    drawBeams(r, g, th, T, cfg.cabin);
    ({ deck: decoDeck, express: decoExpress, cafe: decoCafe, hangar: decoHangar, lab: decoLab })[cfg.cabin](r, g, th, T, rnd, t);
  }

  // 地板单独一层：鼠标视差时它不是整块平移，而是沿窗台线和舱壁同速、越往画面下沿动得越多（见 05-mount 的 floor 图层）
  function drawCabinFloor(r, g, cfg) {
    drawFloor(r, g, CABIN[cfg.cabin], castFn(VIEW_LIGHT[cfg.view]));
  }

  // 地面深度 d（0 = 窗台线，1 ≈ 画面下沿）的统一分母：取舱壁那段（x ≈ 0.75W）的地板高度，
  // 地板图层的仿射视差和人物 / 摆设图层的视差都按它算，才能对得上
  function floorGeom(g) {
    var xr = g.W * (g.portrait ? 0.6 : 0.75), top0 = g.sill0 + g.band;
    return { t0: top0, slope: g.slope, dn: g.H * 1.02 - (top0 + g.slope * xr) };
  }

  // ---------- 窗外来的光 ----------
  // 舱里唯一的大光源是舷窗：逐列统计窗里景色（景物 + 夜空）的颜色总量——亮的星球正对着哪一段窗，
  // 那一段窗下的地板就亮；再横向模糊成柔和的光。顺带求出光的重心（影子朝反方向拖）和整体亮度。
  function measureWindowLight(r, g, vl) {
    var density = r.pixelDensity || 1;
    var m = g.m, n = g.W + 2 * m, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
    var sky = hex(vl.sky[2]), full = Math.max(1, Math.round(g.H * 0.5 / 2));
    for (var i = 0; i < n; i++) {
      var x = i - m, y1 = Math.floor(g.sillAt(x)) - 1, y0 = Math.max(-m, Math.floor(y1 - g.H * 0.5));
      var sr = 0, sg = 0, sb = 0;
      for (var y = y0; y <= y1; y += 2) {
        if (x >= g.edgeAt(y)) continue;
        var j = ((y * density + r.oy) * r.w + (x * density + r.ox)) * 4, a = r.d[j + 3] / 255;
        sr += r.d[j] * a + sky[0] * (1 - a); sg += r.d[j + 1] * a + sky[1] * (1 - a); sb += r.d[j + 2] * a + sky[2] * (1 - a);
      }
      R[i] = sr / full; G[i] = sg / full; B[i] = sb / full;
    }
    var rb = Math.max(2, Math.round(g.W * 0.035));
    [R, G, B].forEach(function (A) {
      for (var pass = 0; pass < 2; pass++) {
        var src = A.slice(), acc = 0, cnt = 0;
        for (var k = 0; k < n + rb; k++) {
          if (k < n) { acc += src[k]; cnt++; }
          if (k - 2 * rb - 1 >= 0 && k - 2 * rb - 1 < n) { acc -= src[k - 2 * rb - 1]; cnt--; }
          if (k - rb >= 0 && k - rb < n) A[k - rb] = acc / cnt;
        }
      }
    });
    var Lm = new Float32Array(n), sw = 0, sx = 0, tot = 0;
    for (var q = 0; q < n; q++) {
      Lm[q] = 0.3 * R[q] + 0.59 * G[q] + 0.11 * B[q];
      var w = Lm[q] * Lm[q];
      sw += w; sx += w * (q - m); tot += Lm[q];
    }
    g.win = { r: R, g: G, b: B, lum: Lm, cx: sw ? sx / sw : g.W * 0.3, mean: tot / n / 255 };
  }
  // 地板上某点收到的窗光（0~1）与光色；d = 离窗台下沿的距离（像素）。光从窗口往观者这边铺开、越远越弱
  function floorLight(g, x, d) {
    var W0 = g.win;
    if (!W0) return null;
    var xs = x + (W0.cx - x) * Math.min(1, d / (g.H * 0.3)) * 0.35;
    var i = clamp(Math.round(xs) + g.m, 0, W0.lum.length - 1), mx = Math.max(W0.r[i], W0.g[i], W0.b[i], 1);
    return { I: W0.lum[i] / 255 * Math.exp(-d / (g.H * 0.085)), c: [W0.r[i] / mx * 255, W0.g[i] / mx * 255, W0.b[i] / mx * 255] };
  }
  // 分档取色，只在每档最后一小段（dz）里抖动过渡：大面积是平涂色块，交界处一两行细碎的过渡（像素画的色阶感）
  function qband(stops, t, x, y, dz) {
    var n = stops.length - 1, f = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i;
    dz = dz || 0.14;
    if (r > 1 - dz && dith(x, y, (r - 1 + dz) / dz)) return hex(stops[i + 1]);
    return hex(stops[r > 0.999 ? i + 1 : i]);
  }

  // ---------- 地板：大部分铺成被窗光照着的两档亮色（窗台边最亮、往前稍暗），只有右下角一小块压到最暗 ----------
  // 同一条色阶：最暗 → 地板本色三档 → 被窗光染色的三档亮色；每个像素按"离窗深度 + 窗光 − 右下角"取一个值再分档
  function drawFloor(r, g, th, T) {
    var m = g.m, fl = th.floor.map(T), dk = T(th.floorDark), glow = T(th.floorGlow);
    var tint = g.win ? (function () {
      var W0 = g.win, sr = 0, sg = 0, sb = 0, sw = 0;
      for (var i = 0; i < W0.lum.length; i++) { var w = W0.lum[i]; sr += W0.r[i] * w; sg += W0.g[i] * w; sb += W0.b[i] * w; sw += w; }
      var c = sw ? [sr / sw, sg / sw, sb / sw] : [128, 128, 160], mx = Math.max(c[0], c[1], c[2], 1);
      return [c[0] / mx * 255, c[1] / mx * 255, c[2] / mx * 255];
    })() : hex(glow);
    var lc = mix(glow, tint, 0.45);
    var ramp = [mix(dk, fl[2], 0.5), fl[2], fl[1], fl[0], mix(fl[0], lc, 0.3), mix(fl[0], lc, 0.55), mix(fl[0], lc, 0.78)];
    var cx0 = g.portrait ? 0.84 : 0.78;
    for (var x = -m; x < g.W + m; x++) {
      var top = Math.floor(g.sillAt(x) + g.band), cornerX = smooth((x / g.W - cx0) / (1.02 - cx0));
      for (var y = top; y < g.H + m; y++) {
        var dep = (y - top) / Math.max(1, g.H + m - top);
        var L = floorLight(g, x, y - top), I = L ? clamp(L.I * 1.15, 0, 1) : 0;
        // 本色：0.84（窗台边，第二亮）→ 0.6（画面最下沿）；窗光把窗台边推到最亮那档；右下角一小块往最暗压
        var corner = cornerX * smooth((dep - 0.4) / 0.6);
        var v = 0.84 - dep * 0.24 + I * 0.3 - corner * 0.55;
        r.px(x, y, qband(ramp, v, x, y));
      }
    }
    var seam = T(th.seam);
    if (th.pattern) { floorPattern(r, g, th, T); return; }
    // 地砖缝：两道淡淡的斜线（参考图里的地面接缝）
    [[[0, 1030], [760, 986]], [[760, 986], [1020, 1080]], [[250, 1100], [560, 1040]]].forEach(function (s) {
      var x0 = g.portrait ? s[0][0] * g.W / 1920 : g.RX(s[0][0]), x1 = g.portrait ? s[1][0] * g.W / 1920 : g.RX(s[1][0]);
      var y0 = g.H * s[0][1] / 1080, y1 = g.H * s[1][1] / 1080;
      var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
      for (var i = 0; i <= n; i++) {
        var x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n);
        if (y > g.sillAt(x) + g.band + 2) r.px(x, y, seam, 0.55);
      }
    });
  }

  // 地面上深度 d（0 = 窗台线，1 ≈ 画面下沿）、画布 x 处的 y；和摆设底边用的是同一套（见 propLayout）
  function floorY(g, x, d) { return lerp(g.sillAt(x) + g.band, g.H * 1.02, d); }
  // 地面上一块"平行四边形"：左右两边竖直（参考 x），上下两边沿 d0 / d1 两排；fn(x, y, u, v) 给颜色（u、v 为块内 0~1 坐标）
  function floorQuad(r, g, xr0, xr1, d0, d1, fn) {
    var x0 = Math.round(g.RX(xr0)), x1 = Math.round(g.RX(xr1));
    for (var x = x0; x < x1; x++) {
      var ya = Math.round(floorY(g, x, d0)), yb = Math.round(floorY(g, x, d1));
      for (var y = ya; y < yb; y++) {
        var v = fn(x, y, (x - x0) / Math.max(1, x1 - x0), (y - ya) / Math.max(1, yb - ya), x - x0, y - ya, yb - ya);
        if (v) r.fill(x, y, function () { return v; });
      }
    }
  }
  // 黄黑警示带（沿斜线方向的条纹）
  function hazard(x, y, per) { return Math.floor((x + y) / (per || 3)) % 2 ? '#d8a83a' : '#1c1f24'; }

  function floorPattern(r, g, th, T) {
    var m = g.m, seam = T(th.seam), kind = th.pattern;
    function rowLine(d, c, a, xa, xb) { for (var x = xa === undefined ? -m : xa; x < (xb === undefined ? g.W + m : xb); x++) r.px(x, floorY(g, x, d), c, a); }
    if (kind === 'planks') {
      // TechCafe：木地板——一行行和窗台平行的板缝（越往前越疏），相邻两行的短接缝错开半格
      var rows = [0.06, 0.15, 0.26, 0.39, 0.54, 0.71, 0.9, 1.12];
      rows.forEach(function (d, ri) {
        rowLine(d, seam, 0.5);
        if (ri + 1 >= rows.length) return;
        var d1 = rows[ri + 1], step = g.W * (0.07 + d * 0.07);
        for (var jx = -m + (ri % 2) * step / 2; jx < g.W + m; jx += step) {
          var ya = floorY(g, jx, d), yb = floorY(g, jx, d1);
          r.line(jx, ya + 1, jx + (yb - ya) * 0.3, yb - 1, seam, 0.4);
        }
      });
    } else if (kind === 'tiles') {
      // 实验舱：防静电地板格（横缝沿排、竖缝竖直）+ 黄黑警戒线圈出测试区
      [0.1, 0.23, 0.38, 0.55, 0.74, 0.96, 1.2].forEach(function (d) { rowLine(d, seam, 0.55); });
      for (var xr = 1000; xr < 1920 + 200; xr += 70) {
        var tx = Math.round(g.RX(xr));
        for (var ty = Math.round(floorY(g, tx, 0)); ty < g.H + m; ty++) r.px(tx, ty, seam, 0.4);
      }
      if (g.portrait) return;
      floorQuad(r, g, 1430, 1830, 0.3, 0.74, function (x, y, u, v, ix, iy, hh) {
        var w = Math.round(g.RX(1830)) - Math.round(g.RX(1430));
        return ix < 2 || ix >= w - 2 || iy < 1 || iy >= hh - 1 ? T(hazard(x, y)) : null;
      });
    } else if (kind === 'guides') {
      // 观景台：从舱门通到窗边的两道导引灯带，中间一排往窗边指的小箭头（箭头依次亮起在 FLOOR_ANIM 里）
      var gc = T('#6ff0ff'), end = g.portrait ? g.W + m : Math.round(g.RX(1327));
      rowLine(0.14, gc, 0.55, -m, end); rowLine(0.24, gc, 0.55, -m, end);
      guideArrows(g).forEach(function (a) { drawArrow(r, a.x, a.y, a.s, gc, 0.3); });
    } else if (kind === 'rug') {
      // 星穹列车：会客区下面一块金边红地毯（菱形暗纹）
      if (g.portrait) return;
      var gold = T('#c89a52'), red = T('#7a1e2a'), redD = T('#5e1620'), redL = T('#8e2a36');
      floorQuad(r, g, 1370, 1880, 0.34, 0.68, function (x, y, u, v, ix, iy, hh) {
        var w = Math.round(g.RX(1880)) - Math.round(g.RX(1370));
        if (ix < 1 || ix >= w - 1 || iy < 1 || iy >= hh - 1) return gold;
        if (ix === 3 || ix === w - 4 || iy === 3 || iy === hh - 4) return gold;
        var px = (ix + 3) % 8, py = (iy * 2) % 8;
        return Math.abs(px - 4) + Math.abs(py - 4) === 3 ? redD : (ix + iy) % 7 === 0 ? redL : red;
      });
    } else if (kind === 'bays') {
      // 货舱：黄色货位线（沿墙一条、前面一条，中间竖线分成 A-01 / A-02 两格）+ 卷帘门前一块斜纹禁停区
      var yl = T('#d8a83a');
      if (!g.portrait) {
        var xa = Math.round(g.RX(1405)), xb = g.W + m;
        rowLine(0.04, yl, 0.8, xa, xb); rowLine(0.6, yl, 0.8, xa, xb);
        [1405, 1612, 1820].forEach(function (xr) {
          var x = Math.round(g.RX(xr));
          for (var y = Math.round(floorY(g, x, 0.04)); y <= floorY(g, x, 0.6); y++) r.px(x, y, yl, 0.8);
        });
        floorQuad(r, g, 1272, 1398, 0.02, 0.3, function (x, y) { return Math.floor((x - y) / 3) % 3 === 0 ? [yl, 0.55] : null; });
      } else rowLine(0.3, yl, 0.7);
    }
  }

  // 观景台地上的导引箭头（静态画暗的，FLOOR_ANIM 里一个接一个亮起来）
  function guideArrows(g) {
    var out = [], end = g.portrait ? g.W : g.RX(1300);
    for (var x = 8; x < end; x += Math.max(8, Math.round(g.W * 0.04))) out.push({ x: x, y: floorY(g, x, 0.19), s: 2 });
    return out;
  }
  function drawArrow(r, x, y, s, c, a) {
    for (var k = 0; k <= s; k++) { r.px(x + k, y - k, c, a); r.px(x + k, y + k, c, a); }
  }

  // 地面上会动的：观景台的导引箭头从舱门往窗边一个接一个亮起
  var FLOOR_ANIM = {
    deck: function (r, g, th, T, t) {
      var A = guideArrows(g), n = A.length, head = (1 - (t * 0.6) % 1) * (n + 4), gc = T('#bff8ff');
      A.forEach(function (a, i) {
        var k = head - i;
        if (k >= 0 && k < 4) drawArrow(r, a.x, a.y, a.s, gc, 0.9 - k * 0.2);
      });
    }
  };

  // ---------- 窗台带：暗边 → 深色 → 一道亮一点的灯带（一排小灯）→ 下沿 ----------
  function drawSill(r, g, th, T) {
    var m = g.m, s = th.sill.map(T), light = T(th.sillLight), gl = th.glowC;
    for (var x = -m; x < g.W + m; x++) {
      var y0 = g.sillAt(x);
      for (var y = Math.floor(y0); y < y0 + g.band; y++) {
        var f = (y + 0.5 - y0) / g.band, c;
        if (f < 0.07) c = s[0];
        else if (f < 0.38) c = s[1];
        else if (f < 0.66) c = th.hazard ? (Math.floor((x + y) / 3) % 2 ? T('#d8a83a') : T('#1c1f24')) : s[2];
        else c = s[3];
        r.px(x, y, c);
      }
    }
    // 小灯：椭圆光斑 + 柔光
    var step = g.RX(1085) - g.RX(1000), lw = Math.max(2, step * 0.24), lh = Math.max(1, g.band * 0.16);
    if (g.portrait) { step = g.W / 6; lw = 3; lh = 1; }
    var gloss = th.gloss || 0, rl = g.H * 0.06;
    for (var lx = -m + step * 0.4; lx < g.W + m; lx += step) {
      var ly = g.sillAt(lx) + g.band * 0.52;
      r.glow(lx, ly, 0, lw * 1.6, gl, 0.28, 0.6);
      r.ellipse(lx, ly, lw / 2, lh / 2 + 0.3, g.slope, light);
      // 光亮的地板上，小灯往下拖出一道倒影（右边被摆设挡住的那几盏不画）
      if (!gloss || lx > g.W * (g.portrait ? 0.76 : 0.7)) continue;
      var fy = g.sillAt(lx) + g.band;
      // 倒影：上宽下尖、越往下越淡（三档实色）
      for (var dy = 1; dy < rl; dy++) {
        var f = dy / rl, a = gloss * (f < 0.25 ? 0.9 : f < 0.55 ? 0.5 : 0.22), hw = Math.round(lw * 0.45 * Math.pow(1 - f, 2));
        for (var k = -hw; k <= hw; k++) r.px(lx + k, fy + dy, light, a * (Math.abs(k) === hw && hw ? 0.6 : 1));
      }
    }
  }

  // ---------- 右下舱壁：被窗外光照亮的一整面墙（中间最亮），一道斜梁 + 光柱边缘 ----------
  function drawWall(r, g, th, T) {
    var m = g.m, wc = th.wall.map(T), line = T(th.wallLine);
    var xL = g.edgeAt(g.H), xR = g.W + m;
    for (var x = Math.floor(xL); x < xR; x++) {
      var top = g.wallTopAt(x), bot = g.sillAt(x) + 1;
      var hx = clamp((x - xL) / Math.max(1, g.W - xL), 0, 1);
      for (var y = Math.floor(top); y < bot; y++) {
        var vy = (y - top) / Math.max(1, bot - top);
        var c = qband(wc, hx * 0.92 + vy * 0.08, x, y);
        c = mix(c, wc[0], Math.floor((1 - vy) * 4) / 4 * 0.25);
        r.px(x, y, c);
      }
    }
    if (g.portrait) return;
    // 斜梁：从墙中上部斜向右下
    r.line(g.RX(1600), g.RY(560), g.RX(1920) + m, g.RY(640) + m * 0.25, line);
    r.line(g.RX(1600), g.RY(560) + 1, g.RX(1920) + m, g.RY(640) + m * 0.25 + 1, line, 0.6);
    // 光柱边缘：一道由亮转暗的斜线
    for (var y2 = Math.floor(g.RY(548)); y2 < g.RY(700); y2++) {
      var x2 = g.RX(1700) - (y2 - g.RY(548)) * (160 / 152) * g.sx / g.sy;
      for (var k = 0; k < g.W * 0.08; k++) {
        var xx = x2 + k;
        if (y2 < g.wallTopAt(xx) || y2 > g.sillAt(xx)) continue;
        r.px(xx, y2, line, 0.22 * (1 - k / (g.W * 0.08)));
      }
    }
  }

  // ---------- 天花横梁 ----------
  function drawBeams(r, g, th, T, kind) {
    var m = g.m, lit = th.beamLit.map(T), far = th.far.map(T), gap = T(th.gap), shade = T(th.shade), lip = T(th.lip);
    var beams = REF.beams.map(function (b) { return [g.RY(b[0]), g.RY(b[1])]; });
    var slope = REF.beamSlope * g.sy / g.sx;
    var shA = g.RX(REF.shade[0]), shB = g.RX(REF.shade[1]), shK = REF.shade[2] * g.sx / g.sy;
    var yMax = Math.max(g.RY(560), g.wallTopAt(g.W + m));
    for (var y = -m; y < yMax; y++) {
      var ex = g.edgeAt(y);
      for (var x = Math.floor(ex); x < g.W + m; x++) {
        if (y >= g.wallTopAt(x)) continue;
        var d = x - ex, yb = y - d * slope, bi = -1;
        for (var i = 0; i < beams.length; i++) if (yb >= beams[i][0] && yb < beams[i][1]) { bi = i; break; }
        var sa = shA + y * shK, sb = shB + y * shK * 0.84;
        var c;
        if (bi < 0) c = yb > beams[beams.length - 1][1] ? far[3] : gap;
        else {
          var fb = (yb - beams[bi][0]) / (beams[bi][1] - beams[bi][0]);
          if (x < sa) {
            c = qband(lit, clamp(fb * 0.7 + d / Math.max(1, sa - ex) * 0.5, 0, 1), x, y);
            if (fb > 0.9) c = lip;
          } else if (x < sb) {
            c = shade;
          } else {
            c = qband(far, clamp((y + m) / (yMax + m) * 0.8 + fb * 0.2, 0, 1), x, y);
            if (fb > 0.93) c = mix(c, lip, 0.25);
          }
          // 阴影带两侧柔一点
          if (x >= sa - 3 && x < sa) c = mix(c, shade, (x - sa + 3) / 4);
        }
        r.px(x, y, c);
      }
    }
    // 小灯（成排的椭圆灯点）
    var dot = T(th.dot), gl = th.glowC, dw = Math.max(1.6, 14 * g.sx), dh = Math.max(0.8, 7 * g.sy);
    REF.dots.forEach(function (row, ri) {
      for (var i = 0; i < row[4]; i++) {
        var f = row[4] > 1 ? i / (row[4] - 1) : 0, x = g.RX(lerp(row[0], row[2], f)), y = g.RY(lerp(row[1], row[3], f));
        if (x < g.edgeAt(y) + 2) continue;
        var c = kind === 'cafe' ? T(['#ffd98a', '#ff9a7a', '#9ae0ff', '#b8ff9a', '#ffb0e0'][(i + ri) % 5]) : dot;
        r.glow(x, y, 0, dw * 1.5, kind === 'cafe' ? hex(c) : gl, 0.3, 0.7);
        r.ellipse(x, y, dw / 2, dh / 2, 0.08, c);
      }
    });
    // 长灯带（往右微微下斜、互相略微发散）
    var strip = T(th.strip);
    REF.strips.forEach(function (s) {
      var x0 = g.RX(s[0]), y0 = g.RY(s[1]), k = s[2] * g.sy / g.sx, th2 = Math.max(1, s[3] * g.sy);
      for (var x = Math.floor(x0); x < g.W + m; x++) {
        var y = y0 + (x - x0) * k;
        for (var j = 0; j < th2; j++) r.px(x, y + j, strip);
        r.px(x, y - 1, strip, 0.3); r.px(x, y + th2, strip, 0.25);
      }
    });
    // 环形灯管（右侧中部）
    if (!g.portrait) {
      var tube = T(th.tube), tx = g.RX(REF.tube[0]), ty = g.RY(REF.tube[1]), tw = Math.max(1, 5 * g.sy);
      var pts = [];
      for (var x3 = g.W + m; x3 > tx + 14 * g.sx; x3--) pts.push([x3, ty + (x3 - tx) * 0.077 * g.sy / g.sx]);
      for (var a = -Math.PI / 2; a <= 0.25; a += 0.05) pts.push([tx + 14 * g.sx + Math.cos(Math.PI + a) * 18 * g.sx, ty + 22 * g.sy + Math.sin(a) * 22 * g.sy]);
      var bx0 = tx - 4 * g.sx, by0 = ty + 44 * g.sy, bx1 = g.RX(1720), by1 = g.RY(470);
      for (var q = 0; q <= 20; q++) pts.push([lerp(bx0, bx1, q / 20), lerp(by0, by1, q / 20)]);
      for (var x4 = bx1; x4 < g.W + m; x4++) pts.push([x4, by1 + (x4 - bx1) * 0.15 * g.sy / g.sx]);
      pts.forEach(function (p) { for (var j = 0; j < tw; j++) r.px(p[0], p[1] + j, tube); });
    }
  }

  // ---------- 主题装饰：舱壁上的东西都挂在同一条腰线（墙高 10% 处）上 ----------
  // 舱壁上参考 x、墙高比例 f 处的画布坐标
  function wallPt(g, xr, f) { var x = g.RX(xr); return { x: x, y: lerp(g.wallTopAt(x), g.sillAt(x), f) }; }
  function wallBox(g, xr0, xr1, f0, f1) {
    var a = wallPt(g, xr0, f0), b = wallPt(g, xr1, f1);
    return { x: Math.round(a.x), y: Math.round(a.y), w: Math.round(b.x) - Math.round(a.x), h: Math.round(b.y - a.y) };
  }

  // 观景台：滑门（DECK）+ 一块全息星图屏（两侧竖灯条）+ 右边一块 D-01 舱位牌；屏幕上的扫描线、轨道上的小点在 DECO_ANIM 里动
  function deckScreen(g) { return wallBox(g, 1430, 1700, 0.1, 0.46); }
  function decoDeck(r, g, th, T) {
    if (g.portrait) return;
    drawDoor(r, g, T, th);
    var S = deckScreen(g), frame = T('#0d1233'), grid = [90, 200, 255];
    r.rect(S.x - 2, S.y - 2, S.w + 4, S.h + 4, frame);
    r.rect(S.x, S.y, S.w, S.h, T('#0a1a3c'));
    for (var gx = S.x + 4; gx < S.x + S.w; gx += 6) r.rect(gx, S.y, 1, S.h, grid, 0.12);
    for (var gy = S.y + 3; gy < S.y + S.h; gy += 6) r.rect(S.x, gy, S.w, 1, grid, 0.12);
    var O = deckOrbit(S);
    for (var a = 0; a < 6.3; a += 0.05) r.px(O.cx + Math.cos(a) * O.rx, O.cy + Math.sin(a) * O.ry, [120, 230, 255], 0.55);
    r.disc(O.cx, O.cy, Math.max(2, S.h * 0.14), [70, 150, 255]);
    r.disc(O.cx - 1, O.cy - 1, Math.max(1, S.h * 0.06), [170, 220, 255]);
    drawText(r, S.x + 2, S.y + 2, 'NAV', [120, 230, 255]);
    r.glow(S.x + S.w / 2, S.y + S.h / 2, 0, S.w * 0.7, [90, 170, 255], 0.12, 0.5);
    [1410, 1720].forEach(function (xr) {
      var b = wallBox(g, xr, xr, 0.08, 0.5);
      r.glow(b.x, b.y + b.h / 2, 0, b.h * 0.6, [150, 200, 255], 0.2, 1.6);
      r.rect(b.x - 1, b.y, 2, b.h, T('#dfe8ff'));
    });
    var P = wallBox(g, 1780, 1880, 0.12, 0.3);
    r.rect(P.x, P.y, P.w, P.h, frame); r.rect(P.x, P.y, P.w, 1, T('#3a4aa0'));
    drawText(r, P.x + Math.round((P.w - textWidth('D-01')) / 2), P.y + Math.round((P.h - 5) / 2), 'D-01', [111, 240, 255]);
  }
  function deckOrbit(S) { return { cx: S.x + S.w * 0.58, cy: S.y + S.h * 0.56, rx: S.w * 0.3, ry: S.h * 0.26 }; }

  // 星穹列车：连接门（NO.3）+ 黄铜腰线；腰线上方一幅风景画、一对壁灯夹着一只挂钟（指针走的是真实时间）、右边一幅小画
  function expressClock(g) { var p = wallPt(g, 1644, 0.24); return { x: Math.round(p.x), y: Math.round(p.y), r: Math.max(5, Math.round((g.sillAt(p.x) - g.wallTopAt(p.x)) * 0.12)) }; }
  function decoExpress(r, g, th, T) {
    if (g.portrait) return;
    var brass = T('#c89a52');
    for (var x = Math.floor(g.edgeAt(g.H)); x < g.W + g.m; x++) {
      var y = lerp(g.wallTopAt(x), g.sillAt(x), 0.5);
      r.px(x, y, brass); r.px(x, y + 1, T('#6a4430'));
    }
    drawDoor(r, g, T, th);
    // 风景画：金框里一颗行星挂在海面上
    var A = wallBox(g, 1420, 1545, 0.1, 0.36);
    r.rect(A.x - 2, A.y - 2, A.w + 4, A.h + 4, brass);
    for (var yy = 0; yy < A.h; yy++) for (var xx = 0; xx < A.w; xx++) {
      var f = yy / A.h, c = f < 0.62 ? mix('#2a3a6a', '#e8a070', f / 0.62) : mix('#3a5a7a', '#1a2a44', (f - 0.62) / 0.38);
      r.px(A.x + xx, A.y + yy, T(c));
    }
    r.disc(A.x + A.w * 0.66, A.y + A.h * 0.4, Math.max(2, A.h * 0.18), T('#f4d8a8'));
    r.rect(A.x, Math.round(A.y + A.h * 0.62), A.w, 1, T('#f0c890'));
    // 挂钟（表盘；指针在 DECO_ANIM 里）+ 两侧壁灯
    var C = expressClock(g);
    r.disc(C.x, C.y, C.r + 1, brass); r.disc(C.x, C.y, C.r, T('#f4ead6'));
    for (var k = 0; k < 12; k++) r.px(C.x + Math.cos(k * Math.PI / 6) * (C.r - 1), C.y + Math.sin(k * Math.PI / 6) * (C.r - 1), T('#6a4430'));
    [1586, 1702].forEach(function (xr) {
      var p = wallPt(g, xr, 0.2), lx = Math.round(p.x), ly = Math.round(p.y);
      r.glow(lx, ly, 1, g.H * 0.06, [255, 200, 120], 0.32);
      r.rect(lx - 1, ly + 2, 3, 5, brass);
      r.poly([[lx - 3, ly + 2], [lx + 3, ly + 2], [lx + 2, ly - 3], [lx - 2, ly - 3]], '#ffd79a');
    });
    // 小画：椭圆画框里一枝花
    var B = wallBox(g, 1760, 1850, 0.12, 0.36);
    r.rect(B.x - 2, B.y - 2, B.w + 4, B.h + 4, brass); r.rect(B.x, B.y, B.w, B.h, T('#2a1a22'));
    r.line(B.x + B.w / 2, B.y + B.h - 2, B.x + B.w / 2, B.y + B.h * 0.3, T('#5a8a4a'));
    r.disc(B.x + B.w / 2, B.y + B.h * 0.3, Math.max(1.5, B.w * 0.12), T('#e86a7a'));
  }

  // TechCafe 舱壁：左端一扇木门（圆舷窗 + OPEN 牌）；菜单小黑板 + 下面的挂杯架；双层霓虹招牌 TECH / CAFE。
  // 这几样都挂在同一条腰线（墙高 10% 处）上；中排吊灯的线正好落在黑板和招牌之间、招牌右边的空当里。
  // 霓虹平时画成暗的灯管，亮起来的字在 DECO_ANIM 里画（偶尔某个字母闪一下）
  function cafeNeon(g) {
    var cx = g.RX(1676), s = 2, tw = textWidth('TECH', s);
    return { x: Math.round(cx - tw / 2), y: Math.round(lerp(g.wallTopAt(cx), g.sillAt(cx), 0.1)), s: s, tw: tw, gap: 3 };
  }

  function decoCafe(r, g, th, T) {
    if (g.portrait) return;
    drawDoor(r, g, T, th);
    // 菜单小黑板
    var bx = Math.round(g.RX(1420)), bw = Math.round(g.RX(1530)) - bx, by = Math.round(lerp(g.wallTopAt(bx), g.sillAt(bx), 0.1)), bh = Math.round(bw * 0.62);
    r.rect(bx - 1, by - 1, bw + 2, bh + 2, T('#8a6446'));
    r.rect(bx, by, bw, bh, T('#2a3530'));
    drawText(r, bx + Math.round((bw - textWidth('MENU')) / 2), by + 2, 'MENU', T('#f2efe6'));
    [[0.5, 0.78, '#dfe8e0'], [0.68, 0.6, '#ffd98a'], [0.84, 0.72, '#dfe8e0']].forEach(function (l) {
      r.line(bx + 3, by + bh * l[0], bx + bw * l[1], by + bh * l[0], T(l[2]), 0.8);
    });
    // 挂杯架：一块木板 + 一排杯子（杯口朝下）
    var sy = Math.round(lerp(g.wallTopAt(bx), g.sillAt(bx), 0.46)), sx0 = Math.round(g.RX(1412)), sx1 = Math.round(g.RX(1548));
    r.rect(sx0, sy, sx1 - sx0, 1, T('#a8845e')); r.rect(sx0, sy + 1, sx1 - sx0, 1, T('#3c2c20'));
    var cupC = ['#f2eee6', '#e8a86a', '#f2eee6', '#8ab0c8', '#f2eee6', '#d87a6a'];
    for (var i = 0, cx = sx0 + 2; cx + 3 < sx1; i++, cx += 5) {
      var cc = T(cupC[i % cupC.length]);
      r.rect(cx, sy - 3, 3, 3, cc); r.px(cx + 3, sy - 2, cc); r.rect(cx, sy - 3, 3, 1, mix(cc, '#ffffff', 0.3));
    }
    // 霓虹招牌：深色背板 + 暗的灯管
    var n = cafeNeon(g), nh = 10 * n.s / 2 * 2 + n.gap, off = T('#4a3a40');
    r.rect(n.x - 3, n.y - 3, n.tw + 6, nh + 6, T('#1a1411'));
    r.rect(n.x - 3, n.y - 3, n.tw + 6, 1, T('#3a2c22'));
    drawText(r, n.x, n.y, 'TECH', off, n.s);
    drawText(r, n.x, n.y + 5 * n.s + n.gap, 'CAFE', off, n.s);
  }

  // 舱门：画在舱壁左端（参考 x 1282~1372，货舱的卷帘门宽一些），从地板一直开到墙高 26% 处
  function doorBox(g, xr0, xr1, f) {
    var x0 = Math.round(g.RX(xr0)), x1 = Math.round(g.RX(xr1)), cx = (x0 + x1) / 2, bot = Math.round(g.sillAt(cx) + g.band);
    var top = Math.round(lerp(g.wallTopAt(cx), bot, f));
    return { x0: x0, x1: x1, w: x1 - x0, cx: cx, bot: bot, top: top, h: bot - top };
  }

  function drawDoor(r, g, T, th) {
    var kind = th.door;
    if (kind === 'wood') doorWood(r, g, T);
    else if (kind === 'slide') doorSlide(r, g, T, th);
    else if (kind === 'train') doorTrain(r, g, T);
    else if (kind === 'shutter') doorShutter(r, g, T);
  }

  // TechCafe：木门（圆舷窗 + OPEN 牌），门缝下漏出一线光
  function doorWood(r, g, T) {
    var D = doorBox(g, 1282, 1372, 0.26), x0 = D.x0, x1 = D.x1, w = D.w, cx = D.cx, top = D.top, bot = D.bot, ph = D.h;
    r.rect(x0 - 2, top - 2, w + 4, bot - top + 2, T('#241810'));
    r.rect(x0, top, w, bot - top, T('#6a4a34'));
    r.rect(x0, top, 1, bot - top, T('#8a6446')); r.rect(x1 - 1, top, 1, bot - top, T('#3e2a1e'));
    var p0 = Math.round(top + ph * 0.56);
    r.rect(x0 + 3, p0, w - 6, Math.round(ph * 0.36), T('#5a3e2c'));
    r.rect(x0 + 3, p0, w - 6, 1, T('#3e2a1e')); r.rect(x0 + 3, p0, 1, Math.round(ph * 0.36), T('#3e2a1e'));
    var wy = Math.round(top + ph * 0.24), wr = Math.max(3, Math.round(w * 0.24));
    r.glow(cx, wy, wr, wr * 2.2, [255, 205, 140], 0.25);
    r.disc(cx, wy, wr + 1, T('#c89a52'));
    r.disc(cx, wy, wr, T('#ffd98a'));
    r.rect(Math.round(cx - wr), wy, wr * 2, 1, T('#8a6446')); r.rect(Math.round(cx), wy - wr, 1, wr * 2, T('#8a6446'));
    r.rect(x1 - 4, Math.round(top + ph * 0.5), 2, 3, T('#e0b060'));
    var tw = textWidth('OPEN'), py = Math.round(top + ph * 0.4);
    r.line(cx - tw / 2, py - 1, cx, py - 4, T('#3e2a1e')); r.line(cx + tw / 2, py - 1, cx, py - 4, T('#3e2a1e'));
    r.rect(Math.round(cx - tw / 2) - 1, py - 1, tw + 2, 7, T('#f2e6cc'));
    drawText(r, Math.round(cx - tw / 2), py, 'OPEN', T('#c0392b'));
    r.rect(x0 + 1, bot - 1, w - 2, 1, '#ffd98a', 0.55);
  }

  // 观景台 / 实验舱：金属滑门（左右两扇在中间合缝）+ 门框两侧的灯带 + 门顶状态灯 + 门牌
  function doorSlide(r, g, T, th) {
    var D = doorBox(g, 1282, 1372, 0.24), lab = th === CABIN.lab, lc = lab ? [127, 240, 255] : [111, 240, 255];
    var frame = T(lab ? '#2a343c' : '#141a44'), panel = T(lab ? '#8a98a4' : '#3a4aa0'), panelD = T(lab ? '#6a7884' : '#2c3a86');
    r.rect(D.x0 - 3, D.top - 3, D.w + 6, D.h + 3, frame);
    r.rect(D.x0, D.top, D.w, D.h, panel);
    var mid = Math.round(D.cx);
    r.rect(D.x0, D.top, 1, D.h, mix(panel, '#ffffff', 0.25)); r.rect(mid, D.top, 1, D.h, frame); r.rect(mid + 1, D.top, Math.max(1, (D.x1 - mid) - 1), D.h, panelD);
    [0.34, 0.66].forEach(function (f) { r.rect(D.x0 + 2, Math.round(D.top + D.h * f), D.w - 4, 1, frame); });
    r.rect(mid - 3, Math.round(D.top + D.h * 0.48), 2, 3, T(lab ? '#dfe8ee' : '#9fb0ff')); r.rect(mid + 2, Math.round(D.top + D.h * 0.48), 2, 3, T(lab ? '#dfe8ee' : '#9fb0ff'));
    [D.x0 - 2, D.x1 + 1].forEach(function (x) { r.glow(x, D.top + D.h / 2, 0, D.h * 0.5, lc, 0.18, 1.8); r.rect(x, D.top, 1, D.h, lc); });
    r.rect(mid - 1, D.top - 6, 3, 2, [120, 255, 150]);
    var label = lab ? 'LAB' : 'DECK', tw = textWidth(label), ly = D.top - 14;
    r.rect(Math.round(D.cx - tw / 2) - 2, ly - 2, tw + 4, 9, frame);
    drawText(r, Math.round(D.cx - tw / 2), ly, label, lc);
    r.rect(D.x0, D.bot - 1, D.w, 1, lc, 0.5);
  }

  // 星穹列车：连接车厢的木门——黄铜门框、上半截一扇高窗（暖光 + 帘边），门顶一块 NO.3 车厢牌
  function doorTrain(r, g, T) {
    var D = doorBox(g, 1282, 1372, 0.24), brass = T('#c89a52'), wood = T('#4a1e1a'), woodL = T('#6a2e26'), woodD = T('#2e120e');
    r.rect(D.x0 - 2, D.top - 2, D.w + 4, D.h + 2, brass);
    r.rect(D.x0, D.top, D.w, D.h, wood); r.rect(D.x0, D.top, 1, D.h, woodL); r.rect(D.x1 - 1, D.top, 1, D.h, woodD);
    var wx0 = D.x0 + 3, wx1 = D.x1 - 3, wy0 = D.top + 3, wy1 = Math.round(D.top + D.h * 0.46);
    r.glow(D.cx, (wy0 + wy1) / 2, 0, D.w * 0.9, [255, 205, 140], 0.2, 1.4);
    r.rect(wx0 - 1, wy0 - 1, wx1 - wx0 + 2, wy1 - wy0 + 2, brass);
    r.rect(wx0, wy0, wx1 - wx0, wy1 - wy0, T('#ffd79a'));
    r.rect(wx0, wy0, 2, wy1 - wy0, T('#9a2a34')); r.rect(wx1 - 2, wy0, 2, wy1 - wy0, T('#9a2a34'));
    r.rect(wx0, Math.round((wy0 + wy1) / 2), wx1 - wx0, 1, brass);
    r.rect(D.x0 + 3, Math.round(D.top + D.h * 0.58), D.w - 6, Math.round(D.h * 0.32), woodD);
    r.rect(D.x0 + 4, Math.round(D.top + D.h * 0.58) + 1, D.w - 8, Math.round(D.h * 0.32) - 2, wood);
    r.rect(D.x1 - 4, Math.round(D.top + D.h * 0.52), 2, 3, brass);
    var tw = textWidth('NO.3'), ly = D.top - 12;
    r.rect(Math.round(D.cx - tw / 2) - 2, ly - 2, tw + 4, 9, brass);
    drawText(r, Math.round(D.cx - tw / 2), ly, 'NO.3', T('#3a1410'));
  }

  // 货舱：卷帘门——两侧黄黑警示立柱、一条条横向卷帘、底边警示条，右边一个控制盒（红 / 绿按钮）
  function doorShutter(r, g, T) {
    var D = doorBox(g, 1272, 1398, 0.2), s1 = T('#6a7482'), s2 = T('#545d6a'), dk = T('#1c1f24');
    r.rect(D.x0 - 1, D.top - 3, D.w + 2, 3, dk);
    for (var y = D.top; y < D.bot; y++) {
      for (var x = D.x0; x < D.x1; x++) r.px(x, y, (y - D.top) % 3 === 2 ? s2 : s1);
      for (var k = 0; k < 2; k++) { r.px(D.x0 - 2 + k, y, T(hazard(D.x0 + k, y))); r.px(D.x1 + k, y, T(hazard(D.x1 + k, y))); }
    }
    for (var x2 = D.x0; x2 < D.x1; x2++) for (var y2 = D.bot - 3; y2 < D.bot - 1; y2++) r.px(x2, y2, T(hazard(x2, y2)));
    var bx = D.x1 + 4, by = Math.round(D.top + D.h * 0.45);
    r.rect(bx, by, 5, 8, T('#3f4854')); r.px(bx + 2, by + 2, '#ff5a4a'); r.px(bx + 2, by + 5, '#6aff8a');
  }

  // 舱壁上会动的：TechCafe 的霓虹（光晕轻轻呼吸；每 4 秒轮到一个字母接触不良，闪几下）；观景台星图屏的扫描线和轨道小点；
  // 列车挂钟的指针（真实时间）；货舱信号灯转动的光；实验舱三台显示器的内容
  var DECO_ANIM = {
    deck: function (r, g, th, T, t) {
      if (g.portrait) return;
      var S = deckScreen(g), O = deckOrbit(S), sx = S.x + Math.floor(((t * 0.22) % 1) * S.w);
      for (var y = S.y; y < S.y + S.h; y++) { r.px(sx, y, [150, 240, 255], 0.5); r.px(sx - 1, y, [150, 240, 255], 0.2); }
      var a = t * 0.8, px = O.cx + Math.cos(a) * O.rx, py = O.cy + Math.sin(a) * O.ry;
      r.rect(Math.round(px) - 1, Math.round(py) - 1, 3, 3, [255, 230, 140]);
      if (Math.floor(t * 2) % 2) r.rect(S.x + S.w - 5, S.y + 2, 3, 3, [255, 120, 120]);
    },
    express: function (r, g, th, T, t) {
      if (g.portrait) return;
      var C = expressClock(g), now = new Date(), sec = now.getSeconds(), min = now.getMinutes() + sec / 60, hr = (now.getHours() % 12) + min / 60;
      var hand = function (v, len, c) { var a = v * Math.PI * 2 - Math.PI / 2; r.line(C.x, C.y, C.x + Math.cos(a) * len, C.y + Math.sin(a) * len, c); };
      hand(hr / 12, C.r * 0.5, T('#2a1810')); hand(min / 60, C.r * 0.8, T('#2a1810')); hand(sec / 60, C.r * 0.85, T('#c0392b'));
      r.px(C.x, C.y, T('#c89a52'));
    },
    hangar: function (r, g, th, T, t) {
      if (g.portrait) return;
      var B = hangarBeacon(g), a = t * 3.2, on = Math.cos(a);
      r.glow(B.x + Math.sin(a) * 4, B.y, 1, g.H * 0.07, [255, 150, 60], 0.18 + 0.3 * Math.max(0, on));
      r.rect(B.x - 2, B.y - 2, 5, 4, on > 0 ? '#ffb45a' : '#c0602a');
      r.px(B.x + Math.round(Math.sin(a) * 2), B.y - 1, '#fff0c0');
    },
    lab: function (r, g, th, T, t) {
      if (g.portrait) return;
      var M = labMonitors(g), gn = [120, 255, 170], cy = [120, 230, 255], am = [255, 200, 90];
      // 1：滚动的波形
      var a = M[0];
      for (var x = 1; x < a.w - 1; x++) r.px(a.x + x, a.y + a.h / 2 + Math.sin((x + t * 14) * 0.45) * (a.h * 0.3) * Math.sin((x + t * 6) * 0.08 + 1), gn);
      // 2：柱状图（每根慢慢起伏）
      var b = M[1], n = Math.floor((b.w - 2) / 3);
      for (var i = 0; i < n; i++) { var hh = Math.round((0.35 + 0.3 * Math.sin(t * 1.3 + i * 0.9) + 0.25 * Math.sin(t * 0.7 + i * 2.3)) * (b.h - 3)); r.rect(b.x + 1 + i * 3, b.y + b.h - 1 - hh, 2, hh, i % 3 ? cy : am); }
      // 3：摄像头画面——测试区里的机器狗轮廓 + 闪烁的 REC 点
      var c = M[2], ox = c.x + c.w * 0.3, oy = c.y + c.h * 0.62;
      r.rect(c.x + 1, Math.round(c.y + c.h * 0.78), c.w - 2, 1, cy, 0.5);
      r.rect(Math.round(ox), Math.round(oy - 2), Math.round(c.w * 0.36), 3, cy); r.rect(Math.round(ox - 2), Math.round(oy - 3), 3, 2, cy);
      [0, 1].forEach(function (k) { r.rect(Math.round(ox + 1 + k * c.w * 0.3), Math.round(oy + 1), 1, Math.round(c.h * 0.16), cy); });
      if (Math.floor(t * 1.5) % 2) r.rect(c.x + 2, c.y + 2, 2, 2, [255, 80, 80]);
    },
    cafe: function (r, g, th, T, t) {
      if (g.portrait) return;
      var n = cafeNeon(g), rows = [['TECH', [110, 230, 255]], ['CAFE', [255, 120, 184]]];
      var cyc = Math.floor(t / 4), bad = (cyc * 5 + 2) % 8, flick = t % 4 > 3.3 && Math.floor(t * 12) % 2;
      var nh = 10 * n.s + n.gap;
      r.glow(n.x + n.tw / 2, n.y + nh / 2, 0, n.tw * 0.95, [255, 170, 220], 0.14 + 0.04 * Math.sin(t * 2.2), 0.7);
      rows.forEach(function (row, ri) {
        for (var i = 0, cx = n.x; i < 4; i++) {
          if (!(ri * 4 + i === bad && flick)) drawText(r, cx, n.y + ri * (5 * n.s + n.gap), row[0][i], row[1], n.s);
          cx += textWidth(row[0][i], n.s) + n.s;
        }
      });
    }
  };

  // 货舱：梁端警示条、墙上两道管线、卷帘门、门边一块警示三角牌、两个货位编号牌 A-01 / A-02（对准地上的货位格）、
  // 右上一盏旋转信号灯（光在 DECO_ANIM 里转）
  function hangarBeacon(g) { var p = wallPt(g, 1846, 0.12); return { x: Math.round(p.x), y: Math.round(p.y) }; }
  function decoHangar(r, g, th, T) {
    // 梁的受光端头刷黄黑警示条
    var y0 = g.RY(REF.beams[1][0]), y1 = g.RY(REF.beams[1][1]);
    for (var y = Math.floor(y0); y < y1; y++) {
      var ex = g.edgeAt(y);
      for (var k = 0; k < Math.max(3, 30 * g.sx); k++) r.px(ex + k, y, Math.floor((ex + k + y) / 3) % 2 ? T('#d8a83a') : T('#1c1f24'));
    }
    if (g.portrait) return;
    // 舱壁上的管线 + 橙色信号灯
    var p1 = T('#5a6472'), p2 = T('#2c333d');
    for (var x = Math.floor(g.edgeAt(g.H)); x < g.W + g.m; x++) {
      var y2 = lerp(g.wallTopAt(x), g.sillAt(x), 0.3);
      r.px(x, y2, p1); r.px(x, y2 + 1, p2); r.px(x, y2 + 3, p1); r.px(x, y2 + 4, p2);
    }
    drawDoor(r, g, T, th);
    // 警示三角牌
    var w0 = wallPt(g, 1424, 0.12), tx = Math.round(w0.x), ty = Math.round(w0.y), ts = 7;
    r.poly([[tx, ty + ts], [tx + ts, ty + ts], [tx + ts / 2, ty - 1]], T('#d8a83a'));
    r.rect(tx + 3, ty + 2, 1, 3, T('#1c1f24')); r.px(tx + 3, ty + 6, T('#1c1f24'));
    // 货位编号牌
    [['A-01', 1508], ['A-02', 1716]].forEach(function (L) {
      var p = wallPt(g, L[1], 0.1), tw = textWidth(L[0]), x = Math.round(p.x - tw / 2), y = Math.round(p.y);
      r.rect(x - 2, y - 2, tw + 4, 9, T('#e8eef4')); r.rect(x - 2, y + 6, tw + 4, 1, T('#9aa4b0'));
      drawText(r, x, y, L[0], T('#1c1f24'));
    });
    // 信号灯座（灯罩和转动的光在 DECO_ANIM 里）
    var B = hangarBeacon(g);
    r.rect(B.x - 3, B.y + 2, 7, 2, T('#3f4854'));
    r.rect(B.x - 2, B.y - 2, 5, 4, T('#8a3a20'));
  }

  // 实验舱：滑门（LAB）；洞洞板工具墙；一排三台显示器（波形 / 柱状图 / 摄像头画面，内容在 DECO_ANIM 里刷新）；右边一块 TEST 警示牌
  function labMonitors(g) { return [1572, 1642, 1712].map(function (xr) { return wallBox(g, xr, xr + 62, 0.1, 0.3); }); }
  function decoLab(r, g, th, T) {
    if (g.portrait) return;
    drawDoor(r, g, T, th);
    // 洞洞板 + 工具剪影
    var Pb = wallBox(g, 1410, 1532, 0.1, 0.44), pb = T('#c8b08a'), hole = T('#8a7458'), tool = T('#3a4450');
    r.rect(Pb.x - 1, Pb.y - 1, Pb.w + 2, Pb.h + 2, T('#6a5a44')); r.rect(Pb.x, Pb.y, Pb.w, Pb.h, pb);
    for (var hy = Pb.y + 2; hy < Pb.y + Pb.h - 1; hy += 3) for (var hx = Pb.x + 2; hx < Pb.x + Pb.w - 1; hx += 3) r.px(hx, hy, hole);
    var tx = Pb.x + 3, ty = Pb.y + 3, th2 = Pb.h - 6;
    r.rect(tx, ty, 2, th2 * 0.7, tool); r.rect(tx - 1, ty, 4, 2, tool);                                   // 扳手
    r.rect(tx + 6, ty + 1, 1, th2 * 0.6, tool); r.rect(tx + 5, ty + th2 * 0.6, 3, 3, T('#e0602a'));        // 螺丝刀
    r.line(tx + 11, ty, tx + 14, ty + th2 * 0.5, tool); r.line(tx + 14, ty, tx + 11, ty + th2 * 0.5, tool); // 钳子
    r.disc(tx + Pb.w * 0.72, ty + th2 * 0.3, Math.max(2, Pb.w * 0.09), T('#d8a83a')); r.disc(tx + Pb.w * 0.72, ty + th2 * 0.3, 1, tool); // 卷尺
    r.rect(Math.round(Pb.x + Pb.w * 0.6), Math.round(ty + th2 * 0.62), Math.round(Pb.w * 0.3), 2, T('#e0602a'));   // 热熔胶枪
    // 显示器：挂在一根横杆上
    var M = labMonitors(g), bar = T('#2a343c');
    r.rect(M[0].x - 2, M[0].y - 3, M[2].x + M[2].w - M[0].x + 4, 1, bar);
    M.forEach(function (m) {
      r.rect(Math.round(m.x + m.w / 2), m.y - 3, 1, 3, bar);
      r.rect(m.x - 1, m.y - 1, m.w + 2, m.h + 2, T('#1a2026')); r.rect(m.x, m.y, m.w, m.h, T('#0a141a'));
    });
    r.glow(M[1].x + M[1].w / 2, M[1].y + M[1].h / 2, 0, (M[2].x + M[2].w - M[0].x) * 0.6, [120, 230, 255], 0.1, 0.5);
    // TEST 警示牌
    var S = wallBox(g, 1790, 1880, 0.12, 0.3);
    r.rect(S.x, S.y, S.w, S.h, T('#d8a83a')); r.rect(S.x + 1, S.y + 1, S.w - 2, 1, T('#1c1f24')); r.rect(S.x + 1, S.y + S.h - 2, S.w - 2, 1, T('#1c1f24'));
    drawText(r, S.x + Math.round((S.w - textWidth('TEST')) / 2), S.y + Math.round((S.h - 5) / 2), 'TEST', T('#1c1f24'));
  }

  // ========== 摆设（中近景）==========
  // 地面坐标：参考 x（1920 宽的参考图）+ 深度 d（0 = 贴墙 / 窗台，1 ≈ 画面下沿，> 1 被画框裁掉一截）。
  // 同一排（同一 d）的底边落在同一条线上：base = lerp(地板上沿, 1.02H, d)，这条线和窗台平行、越往前越平；
  // 越往前画得越大：s = 1 + 0.8d。按 d 分四档各画一层（贴墙 / 中排 / 前排 / 最前），每层的视差取本层摆设的平均深度，
  // 和脚下那一排地板同速（地板本身的视差随深度变化），鼠标移动时摆设不会在地上"滑"。
  // 优先保证没有时钟时的构图——被右下的时钟挡住也无所谓。
  //
  // 每个舱室一个 items(rnd)，成组摆放。条目 { k 种类, x 参考中心 x, ox 组内偏移（随深度缩放）, w, h, d, win 窗边组, flip 镜像,
  //   lift 悬空高度（吊灯 / 吊钩）, zb 同排里的先后 }；竖屏只摆窗边组
  function propLayout(g, cfg) {
    if (g.propCache) return g.propCache;
    var th = CABIN[cfg.cabin], rnd = mulberry(cfg.seed + 33), out = [];
    th.items(rnd).forEach(function (p) {
      if (g.portrait && !p.win) return;
      var d = p.d || 0, s = 1 + d * 0.8, jit = p.fixed ? 1 : 0.96 + rnd() * 0.08;
      var w = p.w * g.sx * s, h = p.h * g.sy * s * jit, x = g.RX(p.x) + (p.ox || 0) * g.sx * s - w / 2;
      if (g.portrait) { x = g.W * 0.8 + (p.x - p.w / 2 - 1060) * g.W / 1400; w = p.w * g.W / 1400; h = p.h * g.H / 1900; }
      var top = g.sillAt(x + w / 2) + g.band * (p.win ? 1.05 : 0.95);
      var base = lerp(top, g.H * 1.02, d);
      out.push({ kind: p.k, x: x, w: w, h: h, base: base, d: d, stack: false, z: base + (p.zb || 0), band: propBand(d), i: out.length,
        flip: !!p.flip, lift: (p.lift || 0) * g.sy * s, ceil: g.RY(522) });
    });
    return (g.propCache = out.sort(function (a, b) { return a.z - b.z; }));
  }

  // 深度分档：0 贴墙（< 0.3）、1 中排（< 0.62）、2 前排（< 0.9）、3 最前
  function propBand(d) { return d < 0.3 ? 0 : d < 0.62 ? 1 : d < 0.9 ? 2 : 3; }
  var BAND_D = [0.08, 0.46, 0.76, 1.05];
  // 某一档摆设的代表深度（本档摆设的平均 d；没有摆设时用默认值）
  function bandDepth(g, cfg, band) {
    var sum = 0, n = 0;
    propLayout(g, cfg).forEach(function (it) { if (it.band === band) { sum += it.d; n++; } });
    return n ? sum / n : BAND_D[band];
  }

  // 越靠前离窗越远、受光越少：主题摆设色往暗色压一点（和地板越往前越暗一致）
  function propColors(th, T, d) {
    var pc = { lit: T(th.prop.lit), base: T(th.prop.base), dark: T(th.prop.dark), rib: T(th.prop.rib) };
    var k = clamp(d * 0.2, 0, 0.22);
    return k ? { lit: mix(pc.lit, pc.dark, k), base: mix(pc.base, pc.dark, k), dark: pc.dark, rib: mix(pc.rib, pc.dark, k * 0.5) } : pc;
  }

  function drawProps(r, g, cfg, band) {
    var th = CABIN[cfg.cabin], T = castFn(VIEW_LIGHT[cfg.view]);
    propLayout(g, cfg).forEach(function (it) {
      if (it.band !== band) return;
      if (!it.stack && !PROP_NOSHADOW[it.kind]) propShadow(r, g, it.x, it.base, it.w, it.h);
      PROP[it.kind](r, Math.round(it.x), Math.round(it.base), Math.max(3, Math.round(it.w)), Math.max(3, Math.round(it.h)), propColors(th, T, it.d), mulberry(cfg.seed + 101 + it.i), T, it);
    });
  }

  // 会动的小细节（咖啡机蒸汽、笔记本滚动的代码、机柜指示灯……）：图层先画好静态底图缓存起来，每一拍只在上面补这几个像素
  function propsAnimated(g, cfg, band) {
    return propLayout(g, cfg).some(function (it) { return it.band === band && PROP_ANIM[it.kind]; });
  }

  function animProps(r, g, cfg, band, t) {
    var th = CABIN[cfg.cabin], T = castFn(VIEW_LIGHT[cfg.view]);
    propLayout(g, cfg).forEach(function (it) {
      if (it.band !== band || !PROP_ANIM[it.kind]) return;
      PROP_ANIM[it.kind](r, Math.round(it.x), Math.round(it.base), Math.max(3, Math.round(it.w)), Math.max(3, Math.round(it.h)), t, T, it, propColors(th, T, it.d));
    });
  }

  // 观景台：窗边一架望远镜；贴墙一排三张观景长椅（面朝窗）+ 两罐冷却液；中排「导航台 — 全息投影台 — 导航台」对称一组；
  // 前排一个小清洁机器人、右下角一段玻璃护栏
  function deckItems() {
    return [
      { k: 'telescope', x: 1140, w: 84, h: 124, win: 1 },
      { k: 'bench', x: 1452, w: 118, h: 56, d: 0.06 },
      { k: 'bench', x: 1590, w: 118, h: 56, d: 0.06 },
      { k: 'bench', x: 1728, w: 118, h: 56, d: 0.06 },
      { k: 'cyl', x: 1846, w: 46, h: 150 },
      { k: 'cyl', x: 1894, w: 46, h: 150 },
      { k: 'console', x: 1446, w: 98, h: 68, d: 0.5 },
      { k: 'holo', x: 1600, w: 106, h: 146, d: 0.5 },
      { k: 'console', x: 1754, w: 98, h: 68, d: 0.5, flip: 1 },
      { k: 'bot', x: 1236, w: 46, h: 44, d: 0.7 },
      { k: 'rail', x: 1846, w: 260, h: 92, d: 1.0 }
    ];
  }

  // 星穹列车：窗边一张侧对的单人扶手椅 + 小茶几；贴墙「书柜 — 留声机 — 书柜」+ 一盆绿植；
  // 中排在地毯上「扶手椅 — 圆桌（台灯）— 扶手椅」；前排门边一个衣帽架、右下角一辆行李推车
  function expressItems() {
    return [
      { k: 'sidechair', x: 1100, w: 104, h: 92, win: 1 },
      { k: 'ctable', x: 1196, w: 52, h: 56, win: 1 },
      { k: 'shelf', x: 1440, w: 112, h: 150 },
      { k: 'phono', x: 1566, w: 86, h: 118 },
      { k: 'shelf', x: 1692, w: 112, h: 150 },
      { k: 'plant', x: 1852, w: 72, h: 126 },
      { k: 'armchair', x: 1624, ox: -118, w: 104, h: 96, d: 0.5 },
      { k: 'table', x: 1624, w: 88, h: 78, d: 0.5, zb: 0.01 },
      { k: 'armchair', x: 1624, ox: 118, w: 104, h: 96, d: 0.5 },
      { k: 'coatrack', x: 1238, w: 48, h: 160, d: 0.7 },
      { k: 'cart', x: 1836, w: 146, h: 126, d: 1.0 }
    ];
  }

  // 货舱：窗边一架人字梯 + 工具箱；贴墙两排货架正对 A-01 / A-02 两格货位 + 气瓶；
  // 中排「叉车 — 吊钩上悬着的箱子 — 托盘货」；前排油桶、右下角一辆工具推车
  function hangarItems() {
    return [
      { k: 'ladder', x: 1100, w: 64, h: 128, win: 1 },
      { k: 'toolbox', x: 1196, w: 70, h: 40, win: 1 },
      { k: 'prack', x: 1508, w: 180, h: 156 },
      { k: 'prack', x: 1716, w: 180, h: 156 },
      { k: 'cyl', x: 1866, w: 50, h: 160 },
      { k: 'forklift', x: 1468, w: 140, h: 118, d: 0.46 },
      { k: 'hook', x: 1620, w: 66, h: 54, d: 0.46, lift: 76 },
      { k: 'pallet', x: 1772, w: 140, h: 104, d: 0.46 },
      { k: 'barrels', x: 1236, w: 140, h: 104, d: 0.72 },
      { k: 'toolcart', x: 1880, w: 112, h: 112, d: 1.05 }
    ];
  }

  // 具身智能实验舱：窗边一台架在三脚架上的相机（对着测试区）；贴墙「机械臂工作台 — 3D 打印机 — 算力机柜」；
  // 中排警戒线圈出的测试区里一只四足机器狗 + 充电桩；前排一卷线缆盘、右下角一摞收纳箱
  function labItems() {
    return [
      { k: 'tripod', x: 1140, w: 56, h: 116, win: 1 },
      { k: 'armbench', x: 1490, w: 220, h: 150 },
      { k: 'printer', x: 1706, w: 92, h: 104 },
      { k: 'rack', x: 1860, w: 76, h: 156 },
      { k: 'dog', x: 1592, w: 116, h: 78, d: 0.5 },
      { k: 'dock', x: 1712, w: 80, h: 70, d: 0.5 },
      { k: 'reel', x: 1236, w: 62, h: 60, d: 0.72 },
      { k: 'bins', x: 1900, w: 100, h: 100, d: 1.05 }
    ];
  }

  // TechCafe 的摆法（参考坐标，中心 x）：
  //   窗边：靠窗吧台桌（笔记本）+ 高脚凳
  //   贴墙：吧台（咖啡机）+ 甜品冷柜 + 服务器机柜（店长兼职网管的角落）；吧台前三张等距高脚凳
  //   中排：两组「小圆桌 + 两把椅子」，各配一盏吊灯——吊灯线落在墙上招牌之间的空当里
  //   前排：A 字立牌（写着 WIFI，门口通道左边）、右下角一大盆绿植
  //   舱门在舱壁左端（1282~1372），门前到窗边留出通道
  function cafeItems(rnd) {
    function tableSet(x, d) {
      return [
        { k: 'chair', x: x, ox: -58, w: 42, h: 72, d: d },
        { k: 'chair', x: x, ox: 58, w: 42, h: 72, d: d, flip: 1 },
        { k: 'ctable', x: x, w: 66, h: 62, d: d, zb: 0.01 },
        { k: 'pendant', x: x, w: 34, h: 22, d: d, lift: 170, zb: 0.02 }
      ];
    }
    return [
      { k: 'bartable', x: 1112, w: 150, h: 104, win: 1 },
      { k: 'stool', x: 1222, w: 44, h: 78, win: 1 },
      { k: 'counter', x: 1550, w: 300, h: 118 },
      { k: 'pastry', x: 1762, w: 106, h: 102 },
      { k: 'rack', x: 1866, w: 76, h: 156 },
      { k: 'stool', x: 1466, w: 42, h: 80, d: 0.1 },
      { k: 'stool', x: 1550, w: 42, h: 80, d: 0.1 },
      { k: 'stool', x: 1634, w: 42, h: 80, d: 0.1 }
    ].concat(tableSet(1528, 0.55), tableSet(1782, 0.55), [
      { k: 'aframe', x: 1182, w: 56, h: 74, d: 0.72 },
      { k: 'plant', x: 1884, w: 100, h: 170, d: 1.1 }
    ]);
  }

  // 摆设脚下：贴地的一道暗边 + 背着窗光往观者这边拖出的一截淡影
  function propShadow(r, g, x, base, w, h) {
    var sh = hex('#000006'), L = g.win, len = Math.min(h * 0.35, g.H * 0.07);
    var dir = L ? clamp((x + w / 2 - L.cx) / (g.H * 0.8), -0.8, 0.8) : 0.3, str = L ? clamp(0.3 + L.mean * 1.6, 0.35, 0.7) : 0.4;
    r.poly([[x, base], [x + w, base], [x + w + dir * len, base + len], [x + dir * len, base + len]], function (px, py) {
      var f = (py - base) / len;
      return [sh, str * (f < 0.45 ? 0.62 : 0.3)];
    });
    for (var i = 0; i < w; i++) r.px(x + i, base, sh, 0.45);
  }

  // 笔记本屏幕 / 服务器单元的位置（静态和动画两处都要用）
  function laptopBox(x, y, w, h) {
    var lw = Math.max(8, Math.round(w * 0.26)), lh = Math.max(6, Math.round(lw * 0.68));
    return { x: Math.round(x + w * 0.5), w: lw, h: lh, top: Math.round(y - h) };
  }
  function rackUnits(x, y, w, h) {
    var uh = Math.max(4, Math.round(h / 8)), out = [];
    for (var k = 0; ; k++) { var uy = Math.round(y - h + 2 + k * uh); if (uy + uh > y - 3) break; out.push({ y: uy, h: uh }); }
    return out;
  }

  function consoleX(x, w, it) { var f = it && it.flip; return function (u) { return f ? x + w - u * w : x + u * w; }; }
  function phonoGeom(x, y, w, h) { var ch = Math.round(h * 0.5); return { tx: x + w * 0.4, ty: Math.round(y - ch) - 3, tw: Math.round(w * 0.56) }; }
  function tripodCam(x, y, w, h) {
    var hx = Math.round(x + w * 0.5), hy = Math.round(y - h * 0.62), bw = Math.round(w * 0.5), bh = Math.max(4, Math.round(h * 0.2));
    return { hx: hx, hy: hy, bw: bw, bh: bh, bx: hx - Math.round(bw * 0.4), by: hy - bh - 1 };
  }
  function labArmGeom(x, y, w, h) { var bh = Math.round(h * 0.44); return { bh: bh, bx: Math.round(x + w * 0.46), by: y - bh - 4, L1: h * 0.3, L2: h * 0.26 }; }
  function printerGeom(x, y, w, h) {
    var top = Math.round(y - h), baseH = Math.round(h * 0.18), cavH = h - 4 - baseH, bedY = Math.round(y - h * 0.3), ph = Math.round(h * 0.22);
    return { top: top, baseH: baseH, cavH: cavH, bedY: bedY, ph: ph };
  }

  var PROP_ANIM = {
    // 导航台屏幕：一道亮线从上往下扫（两台错开半拍）
    console: function (r, x, y, w, h, t, T, it) {
      var X = consoleX(x, w, it), k = (t * 0.7 + (it && it.flip ? 0.5 : 0)) % 1;
      r.line(lerp(X(0.14), X(0.16), k), lerp(y - h * 0.94, y - h * 0.76, k), lerp(X(0.86), X(0.84), k), lerp(y - h * 0.68, y - h * 0.52, k), [200, 255, 255], 0.7);
    },
    // 全息星球：一道往上张开的淡光柱，星球轮廓 + 三条转动的经线 + 赤道，整体微微闪烁
    holo: function (r, x, y, w, h, t) {
      var cx = x + w / 2, by = y - Math.max(3, Math.round(h * 0.12)), pr = Math.max(4, w * 0.26), py = y - h + pr, cyan = [120, 240, 255];
      var fl = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 2.3);
      for (var yy = Math.round(py); yy < by; yy++) {
        var k = (yy - py) / Math.max(1, by - py), hw = lerp(pr, w * 0.26, k);
        for (var xx = -hw; xx <= hw; xx++) if (dith(Math.round(cx + xx), yy, 0.16)) r.px(cx + xx, yy, cyan, 0.22 * fl);
      }
      r.disc(cx, py, pr, [cyan, 0.12 * fl]);
      for (var a = 0; a < 6.3; a += 0.1) r.px(cx + Math.cos(a) * pr, py + Math.sin(a) * pr, cyan, 0.85 * fl);
      for (var j = 0; j < 3; j++) {
        var rx = Math.cos(t * 0.8 + j * Math.PI / 3) * pr;
        for (var b = 0; b < 6.3; b += 0.15) r.px(cx + Math.cos(b) * rx, py + Math.sin(b) * pr, cyan, 0.45 * fl);
      }
      for (var e = 0; e < 6.3; e += 0.12) r.px(cx + Math.cos(e) * pr, py + Math.sin(e) * pr * 0.25, cyan, 0.5 * fl);
    },
    // 清洁机器人的顶灯
    bot: function (r, x, y, w, h, t) {
      if (Math.floor(t * 1.6) % 2) return;
      var cx = Math.round(x + w / 2), ty = Math.round(y - h * 0.55 - h * 0.45) - 1;
      r.rect(cx - 1, ty, 2, 2, [120, 255, 170]); r.glow(cx, ty + 1, 0, 5, [120, 255, 170], 0.3);
    },
    // 留声机：唱片上一点反光绕着转
    phono: function (r, x, y, w, h, t) {
      var P = phonoGeom(x, y, w, h), a = t * 3.3;
      r.px(P.tx + Math.cos(a) * P.tw * 0.32, P.ty + Math.sin(a) * 0.9, [255, 240, 210], 0.8);
    },
    // 叉车警示灯
    forklift: function (r, x, y, w, h, t) {
      if (Math.floor(t * 2.5) % 2) return;
      var lx = Math.round(x + w * 0.52), ly = Math.round(y - h * 0.96) - 2;
      r.rect(lx, ly, 2, 2, [255, 170, 60]); r.glow(lx + 1, ly, 0, 6, [255, 150, 60], 0.35);
    },
    // 吊钩：钢缆从横梁垂下，末端的滑轮 + 两根吊索吊着一只箱子，整体绕横梁上的吊点轻轻摆
    hook: function (r, x, y, w, h, t, T, it, c) {
      var top = Math.round(it.ceil), ax = x + w / 2, L = (y - it.lift) - top, sw = Math.sin(t * 1.1) * 0.05;
      var cx = ax + Math.sin(sw) * L, cb = top + Math.cos(sw) * L, ctop = cb - h, cable = T('#2c323c');
      r.line(ax, top, cx, ctop - 5, cable);
      r.rect(Math.round(cx) - 2, Math.round(ctop) - 7, 4, 3, T('#d8a83a'));
      r.line(cx, ctop - 4, cx - w * 0.36, ctop, cable); r.line(cx, ctop - 4, cx + w * 0.36, ctop, cable);
      PROP.crate(r, Math.round(cx - w / 2), Math.round(cb), w, h, c);
    },
    // 相机 REC 灯
    tripod: function (r, x, y, w, h, t) {
      if (Math.floor(t * 1.2) % 2) return;
      var C = tripodCam(x, y, w, h);
      r.px(C.bx + 1, C.by + 1, [255, 70, 70]);
    },
    // 机械臂：大臂、小臂两个关节慢慢摆动，夹爪一开一合
    armbench: function (r, x, y, w, h, t, T) {
      var A = labArmGeom(x, y, w, h), a1 = -1.95 + 0.35 * Math.sin(t * 0.6), a2 = a1 + 1.35 + 0.45 * Math.sin(t * 0.6 + 1.2);
      var ex = A.bx + Math.cos(a1) * A.L1, ey = A.by + Math.sin(a1) * A.L1, fx = ex + Math.cos(a2) * A.L2, fy = ey + Math.sin(a2) * A.L2;
      var white = T('#e8ecf0'), orange = T('#f08a3a'), dark = T('#3a444e');
      r.capsule(A.bx, A.by, ex, ey, 3, 3, white); r.capsule(ex, ey, fx, fy, 2.4, 2, white);
      r.disc(A.bx, A.by, 1.8, orange); r.disc(ex, ey, 1.6, orange);
      var open = 1.5 + Math.sin(t * 1.2), pa = a2 + Math.PI / 2, gx = fx + Math.cos(a2) * 3, gy = fy + Math.sin(a2) * 3;
      r.line(fx, fy, gx + Math.cos(pa) * open, gy + Math.sin(pa) * open, dark);
      r.line(fx, fy, gx - Math.cos(pa) * open, gy - Math.sin(pa) * open, dark);
    },
    // 3D 打印机：横梁上的打印头左右走，喷嘴一点橙光
    printer: function (r, x, y, w, h, t, T) {
      var P = printerGeom(x, y, w, h), gy = P.bedY - P.ph - 5, hx = Math.round(x + 4 + (Math.sin(t * 1.5) + 1) / 2 * (w - 14));
      r.rect(x + 3, gy, w - 6, 1, T('#6a7482'));
      r.rect(hx, gy - 1, 5, 4, T('#dfe6ee')); r.px(hx + 2, gy + 3, [255, 150, 80]);
    },
    // 机器狗（朝左）：四条腿（远的两条暗一点，膝关节折向后）、身体、头部传感器、背上的雷达；待机时身体轻轻起伏、眼灯偶尔眨一下
    dog: function (r, x, y, w, h, t, T) {
      var bob = Math.sin(t * 2.2) > 0.2 ? 1 : 0, body = T('#dfe4ea'), dark = T('#3a444e'), mid = T('#a8b2bc'), acc = T('#f08a3a');
      var top = Math.round(y - h * 0.78) + bob, bh = Math.max(4, Math.round(h * 0.3)), b0 = Math.round(x + w * 0.18), b1 = Math.round(x + w * 0.86), hipY = top + bh - 1;
      function leg(hx, dir, col, off) {
        var kx = hx + dir * w * 0.07 + off, ky = Math.round(y - h * 0.3);
        r.capsule(hx + off, hipY, kx, ky, 2.4, 2, col); r.capsule(kx, ky, hx + off - dir * 1, y - 1, 2, 1.6, col);
      }
      leg(x + w * 0.28, 1, mid, 2); leg(x + w * 0.76, -1, mid, 2);
      r.rect(b0, top, b1 - b0, bh, body); r.rect(b0, top, b1 - b0, 1, T('#ffffff')); r.rect(b0, top + bh - 1, b1 - b0, 1, mid);
      r.rect(b0 + 2, top + Math.round(bh * 0.5), Math.round((b1 - b0) * 0.4), 1, acc);
      var hx = Math.round(x + w * 0.03), hw = b0 - hx + 1, hh = Math.max(4, Math.round(bh * 0.85));
      r.rect(hx, top, hw, hh, mid); r.rect(hx, top, hw, 1, body); r.rect(hx, top + 1, 2, hh - 2, dark);
      if (Math.floor(t * 0.7) % 5) r.rect(hx, top + 2, 1, 2, [120, 240, 255]);
      r.rect(Math.round(x + w * 0.58), top - 2, Math.round(w * 0.14), 2, dark);
      leg(x + w * 0.28, 1, dark, 0); leg(x + w * 0.76, -1, dark, 0);
    },
    // 充电桩：地上的光圈一圈圈往外扩，立柱小屏上的电量条来回走
    dock: function (r, x, y, w, h, t) {
      var cx = x + w / 2, k = (t * 0.8) % 1, rx = w * 0.36 * (0.4 + k * 0.6), a = (1 - k) * 0.6;
      for (var b = 0; b < 6.3; b += 0.08) r.px(cx + Math.cos(b) * rx, y - 2 + Math.sin(b) * Math.max(1, h * 0.04) * (0.4 + k * 0.6), [120, 240, 255], a);
      var px = Math.round(x + w * 0.82), top = Math.round(y - h), n = 1 + Math.floor(((t * 0.6) % 1) * 5);
      r.rect(px - 1, top + 2, n, 2, [120, 255, 170]);
    },
    // 咖啡机上冒的三缕蒸汽
    counter: function (r, x, y, w, h, t) {
      var mw = Math.max(6, w * 0.12), mh = h * 0.42, sx = Math.round(x + w * 0.62 + mw / 2), sy = Math.round(y - h - mh) - 1;
      for (var i = 0; i < 3; i++) {
        var ph = (t * 0.5 + i / 3) % 1, a = 0.55 * Math.sin(ph * Math.PI), yy = sy - ph * h * 0.45, xx = sx + Math.sin(t * 1.7 + i * 2.1 + ph * 5) * 1.6;
        r.px(xx, yy, [255, 250, 240], a); r.px(xx, yy - 1, [255, 250, 240], a * 0.6);
      }
    },
    // 笔记本屏幕：一行行代码往上滚，最后一行有闪烁的光标
    bartable: function (r, x, y, w, h, t) {
      var L = laptopBox(x, y, w, h), sx0 = L.x + 1, sy0 = L.top - L.h, sw = L.w - 2, sh = L.h - 2, off = Math.floor(t * 1.4);
      var cols = [[120, 230, 255], [150, 255, 170], [255, 214, 120]], rows = Math.floor((sh + 1) / 2);
      for (var row = 0; row < rows; row++) {
        var n = off + row, ind = ((hash(n * 13 + 5) + 1) * 1.2) | 0, len = 1 + (((hash(n * 7 + 3) + 1) / 2) * (sw - 2)) | 0;
        for (var i = 0; i < len && ind + i < sw; i++) r.px(sx0 + ind + i, sy0 + row * 2, cols[((n % 3) + 3) % 3], 0.9);
      }
      if (Math.floor(t * 2.4) % 2) r.px(sx0 + 1, sy0 + (rows - 1) * 2, [240, 250, 255]);
    },
    // 机柜指示灯：每个单元两颗，绿 / 琥珀，各按自己的节奏闪
    rack: function (r, x, y, w, h, t) {
      rackUnits(x, y, w, h).forEach(function (u, k) {
        var ly = u.y + (u.h >> 1);
        [[x + 4, [90, 255, 140], 5.3], [x + 6, [255, 190, 80], 2.1]].forEach(function (L, j) {
          if (hash(k * 31 + j * 7 + Math.floor(t * L[2] + k)) > -0.2) { r.px(L[0], ly, L[1]); r.px(L[0], ly - 1, L[1], 0.25); }
        });
      });
    }
  };

  // 不在地上投影的（吊在半空的）
  var PROP_NOSHADOW = { pendant: 1, hook: 1 };

  // 摆设都画成「左侧受光、右侧暗」的剪影，顶面一道亮边
  var PROP = {
    cyl: function (r, x, y, w, h, c) {
      var rr = Math.max(1, w * 0.18);
      for (var yy = y - h; yy < y; yy++) {
        for (var xx = x; xx < x + w; xx++) {
          var f = (xx - x) / w, top = yy < y - h + rr && (Math.min(xx - x, x + w - 1 - xx) < rr - Math.sqrt(Math.max(0, rr * rr - Math.pow(y - h + rr - yy, 2))));
          if (top) continue;
          var col = f < 0.22 ? c.lit : f < 0.6 ? c.base : c.dark;
          if (yy < y - h + 2) col = mix(col, c.lit, 0.6);
          if (Math.abs(yy - (y - h * 0.62)) < 1 || Math.abs(yy - (y - h * 0.3)) < 1) col = c.rib;
          r.px(xx, yy, col);
        }
      }
    },
    crate: function (r, x, y, w, h, c) {
      for (var yy = y - h; yy < y; yy++) {
        for (var xx = x; xx < x + w; xx++) {
          var f = (xx - x) / w, col = f < 0.12 ? c.lit : c.base;
          if (f > 0.7) col = mix(c.base, c.dark, (f - 0.7) / 0.3);
          if (yy < y - h + 2) col = c.lit;
          // 竖向肋条
          if (w > 8 && ((xx - x) % Math.max(4, Math.round(w / 4)) === 1)) col = mix(col, c.lit, 0.5);
          r.px(xx, yy, col);
        }
      }
      r.rect(x + 1, Math.round(y - h * 0.55), w - 2, 1, c.rib);
    },
    // 导航台：高的一头在左、屏幕朝右上（flip：镜像，两台面对面）
    console: function (r, x, y, w, h, c, rnd, T, it) {
      var X = consoleX(x, w, it);
      r.poly([[X(0), y], [X(1), y], [X(0.9), y - h * 0.7], [X(0.1), y - h]], function (px) { return Math.abs(px - X(0)) < w * 0.2 ? c.lit : c.base; });
      r.poly([[X(0.14), y - h * 0.94], [X(0.86), y - h * 0.68], [X(0.84), y - h * 0.52], [X(0.16), y - h * 0.76]], function (px, py) { return (px + py) % 3 ? T('#5ff0ff') : T('#2a9ac0'); });
      r.glow(x + w / 2, y - h * 0.7, 2, h * 0.9, [90, 220, 255], 0.16);
    },
    armchair: function (r, x, y, w, h, c) {
      r.rect(x + w * 0.1, y - h, w * 0.8, h * 0.55, c.dark);
      r.rect(x, y - h * 0.5, w, h * 0.35, c.base); r.rect(x, y - h * 0.5, w, 2, c.lit);
      r.rect(x, y - h * 0.62, w * 0.14, h * 0.5, c.lit); r.rect(x + w * 0.86, y - h * 0.62, w * 0.14, h * 0.5, c.dark);
      r.rect(x + w * 0.1, y - h * 0.15, 2, h * 0.15, c.rib); r.rect(x + w * 0.85, y - h * 0.15, 2, h * 0.15, c.rib);
    },
    shelf: function (r, x, y, w, h, c, rnd, T) {
      r.rect(x, y - h, w, h, c.dark); r.rect(x, y - h, 2, h, c.lit); r.rect(x, y - h, w, 2, c.lit);
      var cols = ['#7a2230', '#2f4a6a', '#b98a44', '#4a6a3a', '#6a4a7a'].map(T), rows = 4;
      for (var s = 0; s < rows; s++) {
        var sy = y - h + 3 + s * (h - 4) / rows, sh = (h - 4) / rows;
        r.rect(x + 2, sy + sh - 1, w - 3, 1, c.base);
        for (var b = 0; b * 3 + 3 < w - 3; b++) r.rect(x + 3 + b * 3, sy + 1 + (b % 3), 2, sh - 2 - (b % 3), mix(cols[(b + s) % 5], c.dark, 0.35));
      }
    },
    plant: function (r, x, y, w, h, c, rnd, T) {
      var ph = h * 0.3;
      r.poly([[x + w * 0.2, y - ph], [x + w * 0.8, y - ph], [x + w * 0.7, y], [x + w * 0.3, y]], c.rib === '#3c2c20' ? T('#6a4a38') : c.base);
      var g1 = T('#3f7a4a'), g2 = T('#5a9a5e'), k = Math.max(1, w / 24);   // 画在近处（大）时叶子跟着加粗
      for (var i = 0; i < 11; i++) {
        var a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, len = h * (0.35 + rnd() * 0.4);
        r.capsule(x + w / 2, y - ph, x + w / 2 + Math.cos(a) * len * 0.6, y - ph + Math.sin(a) * len, 2.2 * k, k, i % 2 ? g1 : g2);
      }
    },
    table: function (r, x, y, w, h, c, rnd, T) {
      r.ellipse(x + w / 2, y - h, w / 2, Math.max(1.5, h * 0.08), 0, c.base);
      r.rect(x + w / 2 - 1, y - h, 2, h, c.rib); r.rect(x + w * 0.3, y - 1, w * 0.4, 1, c.rib);
      r.glow(x + w * 0.7, y - h * 1.3, 1, h * 0.5, [255, 200, 120], 0.3);
      r.poly([[x + w * 0.58, y - h * 1.22], [x + w * 0.82, y - h * 1.22], [x + w * 0.76, y - h * 1.42], [x + w * 0.64, y - h * 1.42]], T('#ffd79a'));
    },
    stool: function (r, x, y, w, h, c) {
      r.ellipse(x + w / 2, y - h, w / 2, Math.max(1.2, h * 0.08), 0, c.lit);
      r.rect(x + w / 2 - 1, y - h, 2, h, c.dark); r.rect(x + w * 0.15, y - 1, w * 0.7, 1, c.dark); r.rect(x + w * 0.25, y - h * 0.4, w * 0.5, 1, c.dark);
    },
    counter: function (r, x, y, w, h, c, rnd, T) {
      r.rect(x, y - h, w, h, c.base); r.rect(x - 2, y - h - 2, w + 4, 3, c.lit);
      for (var i = 6; i < w; i += 8) r.rect(x + i, y - h + 3, 1, h - 3, c.dark);
      var mx = x + w * 0.62, mw = Math.max(6, w * 0.12), mh = h * 0.42;
      r.rect(mx, y - h - mh, mw, mh, T('#b8bcc4')); r.rect(mx + 1, y - h - mh + 1, mw - 2, 2, T('#d8dce4')); r.rect(mx + mw / 2 - 1, y - h - mh * 0.45, 3, 3, T('#2a2a30'));
      r.rect(x + w * 0.3, y - h - 4, 3, 3, '#f2f0ea'); r.rect(x + w * 0.36, y - h - 4, 3, 3, '#f2f0ea');
      // 偶尔趴一只黑猫
      if (rnd() < 0.5) {
        var cx = x + w * 0.16, cy = y - h - 2;
        r.ellipse(cx, cy - 2, 5, 2.6, 0, '#1e1e24'); r.disc(cx + 5, cy - 4, 2.4, '#1e1e24');
        r.poly([[cx + 3.4, cy - 5.5], [cx + 4.2, cy - 8], [cx + 5, cy - 5.6]], '#1e1e24'); r.poly([[cx + 5.4, cy - 5.6], [cx + 6.4, cy - 8], [cx + 7, cy - 5]], '#1e1e24');
        r.px(cx + 6, cy - 4.6, '#ffd98a');
      }
    },
    barrels: function (r, x, y, w, h, c) {
      var bw = Math.round(w / 3);
      [[0, 0, 1], [bw, 0, 1], [bw * 2, 0, 0.85], [bw * 0.5, -h * 0.5, 1]].forEach(function (b, i) {
        var bx = x + b[0], by = y + b[1], bh = Math.round(h * 0.5 * b[2]);
        for (var yy = by - bh; yy < by; yy++) for (var xx = bx; xx < bx + bw - 1; xx++) {
          var f = (xx - bx) / bw, col = f < 0.25 ? c.lit : f < 0.7 ? c.base : c.dark;
          if (yy === by - bh || yy === Math.round(by - bh * 0.5)) col = c.rib;
          r.px(xx, yy, col);
        }
      });
    },
    toolbox: function (r, x, y, w, h, c, rnd, T) {
      r.rect(x, y - h, w, h, T('#b8392b')); r.rect(x, y - h, w, 1, T('#e05a4a')); r.rect(x + w * 0.35, y - h - 2, w * 0.3, 2, c.dark);
    },
    // 小餐椅（侧面）：椅面 + 前腿 + 外侧的靠背（一块略向后仰的靠板连着后腿）；flip = 靠背在右
    chair: function (r, x, y, w, h, c, rnd, T, it) {
      var f = it && it.flip, st = Math.max(1, Math.round(h * 0.08)), sy = Math.round(y - h * 0.46);
      var lw = Math.max(1, Math.round(w * 0.1)), bw = Math.max(2, Math.round(w * 0.16)), bx = f ? x + w - bw : x, lean = f ? 1 : -1;
      r.rect(bx, sy, bw, y - sy, c.dark);                                   // 后腿
      for (var yy = Math.round(y - h); yy < sy; yy++) {                    // 靠板：越往上越往外仰一点
        var k = (sy - yy) / Math.max(1, sy - y + h), ox = Math.round(k * lean * 1.4);
        r.rect(bx + ox, yy, bw, 1, yy < y - h + 2 ? c.lit : c.base);
      }
      r.rect(x, sy, w, st, c.lit);
      r.rect(x, sy + st, w, 1, c.dark);
      r.rect(f ? x : x + w - lw, sy + st, lw, y - sy - st, c.dark);        // 前腿
    },
    // 咖啡小圆桌（侧面）：薄桌面 + 中柱 + 脚座；桌上多半放着一杯咖啡
    ctable: function (r, x, y, w, h, c, rnd, T) {
      var cx = Math.round(x + w / 2), tt = Math.max(1, Math.round(h * 0.07)), ty = Math.round(y - h), pw = Math.max(2, Math.round(w * 0.08));
      r.rect(x, ty, w, tt, c.lit); r.rect(x + 1, ty + tt, w - 2, 1, c.dark);
      r.rect(cx - (pw >> 1), ty + tt + 1, pw, y - ty - tt - 1, c.base);
      r.rect(Math.round(x + w * 0.24), y - 1, Math.round(w * 0.52), 1, c.dark);
      if (rnd() < 0.8) {
        var ux = Math.round(x + w * (0.22 + rnd() * 0.4)), cup = T('#f2eee6');
        r.rect(ux - 1, ty - 1, 5, 1, T('#d8d2c6')); r.rect(ux, ty - 3, 3, 2, cup); r.px(ux + 3, ty - 3, cup);
      }
    },
    // 吊灯：从横梁垂下的线 + 灯罩 + 暖光，正下方的桌面上铺一片淡淡的光锥（it.lift = 灯离地高，it.ceil = 横梁下沿）
    pendant: function (r, x, y, w, h, c, rnd, T, it) {
      var cx = Math.round(x + w / 2), ly = Math.round(y - it.lift), top = Math.round(it.ceil), warm = [255, 226, 168];
      for (var yy = ly + 1; yy < y - 1; yy++) {
        var k = (yy - ly) / Math.max(1, y - ly), hw = w * 0.32 + (yy - ly) * 0.3;
        for (var xx = -hw; xx <= hw; xx++) if (dith(cx + Math.round(xx), yy, 0.2 * (1 - k))) r.px(cx + xx, yy, warm, 0.28);
      }
      r.line(cx, top, cx, ly - h, T('#1a1410'));
      r.glow(cx, ly + 1, 0, w * 0.9, [255, 205, 130], 0.35, 0.8);
      r.poly([[cx - w / 2, ly], [cx + w / 2, ly], [cx + w * 0.2, ly - h], [cx - w * 0.2, ly - h]], function (px) { return px < cx - w * 0.15 ? c.lit : px < cx + w * 0.2 ? c.base : c.dark; });
      r.rect(cx - Math.round(w * 0.3), ly, Math.round(w * 0.6), 1, T('#ffd98a'));
    },
    // 靠窗吧台桌：长桌面 + 两条腿 + 脚踏横杆；桌上一台打开的笔记本（屏幕朝外，代码在 PROP_ANIM 里滚动）和一只马克杯
    bartable: function (r, x, y, w, h, c, rnd, T) {
      var tt = Math.max(1, Math.round(h * 0.06)), ty = Math.round(y - h), L = laptopBox(x, y, w, h);
      r.rect(x, ty, w, tt, c.lit); r.rect(x, ty + tt, w, 1, c.dark);
      [0.08, 0.88].forEach(function (f) { r.rect(Math.round(x + w * f), ty + tt, Math.max(1, Math.round(w * 0.04)), h - tt, c.base); });
      r.rect(Math.round(x + w * 0.08), Math.round(y - h * 0.28), Math.round(w * 0.84), 1, c.dark);
      r.rect(L.x - 1, ty - 1, L.w + 2, 1, T('#9aa0aa'));
      r.rect(L.x, ty - 1 - L.h, L.w, L.h, T('#3a3f48'));
      r.rect(L.x + 1, ty - L.h, L.w - 2, L.h - 2, T('#0e1c26'));
      r.glow(L.x + L.w / 2, ty - L.h / 2, 0, L.w * 1.3, [120, 220, 255], 0.16);
      var mx = Math.round(x + w * 0.2), mug = T('#e8e2d6');
      r.rect(mx, ty - 3, 3, 3, mug); r.px(mx + 3, ty - 2, mug);
    },
    // 甜品冷柜：木底座 + 上半截玻璃柜（半透明，里面暖光，两层蛋糕）
    pastry: function (r, x, y, w, h, c, rnd, T) {
      var gh = Math.round(h * 0.56), gy = Math.round(y - h), by = gy + gh, dw = Math.max(1, Math.round(w * 0.12));
      r.rect(x, by, w, y - by, c.base); r.rect(x, by, w, 1, c.lit); r.rect(x + w - dw, by, dw, y - by, c.dark);
      r.rect(x, gy, w, gh, T('#ffe9c4'), 0.32);
      r.glow(x + w / 2, gy + gh / 2, 0, w * 0.7, [255, 220, 160], 0.22, 0.6);
      r.rect(x, gy, w, 1, c.lit); r.rect(x, gy, 1, gh, c.lit); r.rect(x + w - 1, gy, 1, gh, c.dark);
      var cakes = ['#f4a8b8', '#fff0d0', '#7a4a2a', '#e86a6a', '#c8e0a0'].map(T), k0 = (rnd() * 5) | 0;
      [0.42, 0.9].forEach(function (f, sI) {
        var sy = Math.round(gy + gh * f);
        r.rect(x + 1, sy, w - 2, 1, T('#d8d0c0'));
        for (var i = 0; x + 2 + i * 5 + 4 <= x + w - 2; i++) {
          var col = cakes[(i + sI * 2 + k0) % 5];
          r.rect(x + 2 + i * 5, sy - 3, 4, 3, col); r.rect(x + 2 + i * 5, sy - 3, 4, 1, mix(col, '#ffffff', 0.45));
        }
      });
    },
    // 服务器机柜（店长兼职网管的角落）：黑色柜体 + 一格格服务器（指示灯在 PROP_ANIM 里闪）
    rack: function (r, x, y, w, h, c, rnd, T) {
      var body = T('#23272e'), edge = T('#3c424c'), unit = T('#2f343d'), slot = T('#14171c'), R = rackUnits(x, y, w, h);
      r.rect(x, y - h, w, h, body); r.rect(x, y - h, w, 1, edge); r.rect(x, y - h, 1, h, edge); r.rect(x + w - 1, y - h, 1, h, slot);
      R.forEach(function (u) {
        r.rect(x + 2, u.y, w - 4, u.h - 1, unit); r.rect(x + 2, u.y + u.h - 1, w - 4, 1, slot);
        for (var gx = x + Math.round(w * 0.45); gx < x + w - 3; gx += 2) r.px(gx, u.y + (u.h >> 1), slot);
      });
      r.rect(x + 1, y - 2, w - 2, 2, slot);
    },
    // ---- 观景台 ----
    // 望远镜：三脚架 + 云台，镜筒朝左上指向窗外
    telescope: function (r, x, y, w, h, c) {
      var hx = Math.round(x + w * 0.58), hy = Math.round(y - h * 0.5);
      r.line(hx, hy, x + w * 0.2, y - 1, c.base); r.line(hx, hy, x + w * 0.96, y - 1, c.dark); r.line(hx, hy, hx + 1, y - 1, c.base);
      var ex = x + w * 0.04, ey = y - h, bx = hx + w * 0.22, by = hy - h * 0.06;
      r.capsule(bx, by, ex, ey, Math.max(2, w * 0.14), Math.max(3, w * 0.2), c.lit);
      r.line(bx, by - 1, ex + 1, ey - 1, mix(c.lit, '#ffffff', 0.35));
      r.disc(ex, ey, Math.max(1.5, w * 0.1), c.rib);
      r.rect(hx - 1, hy - 1, 3, 3, c.dark);
    },
    // 观景长椅：座面 + 右侧靠背（面朝窗）+ 座面下一道灯带
    bench: function (r, x, y, w, h, c, rnd, T) {
      var sy = Math.round(y - h * 0.46), st = Math.max(2, Math.round(h * 0.16)), bw = Math.max(2, Math.round(w * 0.05)), top = Math.round(y - h);
      r.rect(x + w - bw, top, bw, sy - top, c.base); r.rect(x + w - bw, top, bw, 1, c.lit);
      r.rect(x, sy, w, st, c.lit); r.rect(x, sy + st, w, 1, c.dark);
      [0.08, 0.88].forEach(function (f) { r.rect(Math.round(x + w * f), sy + st + 1, Math.max(1, Math.round(w * 0.04)), y - sy - st - 1, c.dark); });
      r.rect(x + 2, sy + st + 1, w - 4, 1, T('#6ff0ff'), 0.45);
    },
    // 全息投影台：底座 + 发光圈（上面浮着的星球在 PROP_ANIM 里）
    holo: function (r, x, y, w, h, c, rnd, T) {
      var cx = x + w / 2, bh = Math.max(3, Math.round(h * 0.12)), by = y - bh;
      r.rect(Math.round(x + w * 0.12), by, Math.round(w * 0.76), bh, c.base);
      r.rect(Math.round(x + w * 0.12), by, Math.max(1, Math.round(w * 0.1)), bh, c.lit);
      r.ellipse(cx, by, w * 0.4, Math.max(1.5, bh * 0.45), 0, c.lit);
      r.ellipse(cx, by, w * 0.3, Math.max(1, bh * 0.3), 0, T('#6ff0ff'));
    },
    // 清洁小机器人：圆柱身 + 半球顶，朝左一条眼灯（顶灯闪烁在 PROP_ANIM 里）
    bot: function (r, x, y, w, h, c, rnd, T) {
      var cx = x + w / 2, by = Math.round(y - h * 0.55), bh = Math.round(y - 2 - by);
      r.rect(x, by, w, bh, c.base); r.rect(x, by, Math.max(1, Math.round(w * 0.2)), bh, c.lit); r.rect(Math.round(x + w * 0.8), by, Math.ceil(w * 0.2), bh, c.dark);
      r.ellipse(cx, by, w / 2, h * 0.45, 0, function (px, py) { return py >= by ? null : px < cx - w * 0.2 ? c.lit : px < cx + w * 0.25 ? c.base : c.dark; });
      r.rect(x + 1, y - 2, w - 2, 2, c.dark);
      r.rect(Math.round(cx - w * 0.36), Math.round(by - h * 0.18), Math.max(2, Math.round(w * 0.24)), 1, T('#6ff0ff'));
      r.rect(Math.round(x + w * 0.1), Math.round(by + bh * 0.45), Math.round(w * 0.8), 1, c.rib);
    },
    // 玻璃护栏：几根立柱 + 扶手 + 半透明玻璃（几道反光斜线）
    rail: function (r, x, y, w, h, c, rnd, T) {
      var top = Math.round(y - h), posts = 4;
      r.rect(x, top + 2, w, Math.round(h * 0.86), T('#9fe8ff'), 0.14);
      for (var i = 0; i < 3; i++) r.line(x + w * (0.1 + i * 0.3), top + h * 0.8, x + w * (0.22 + i * 0.3), top + h * 0.15, [230, 250, 255], 0.35);
      for (var q = 0; q <= posts; q++) { var px = Math.round(x + (w - 3) * q / posts); r.rect(px, top, 3, h, c.lit); r.rect(px + 2, top, 1, h, c.dark); }
      r.rect(x - 1, top - 1, w + 2, 3, c.lit); r.rect(x - 1, top + 1, w + 2, 1, c.dark);
      r.rect(x, y - 2, w, 2, c.dark);
    },

    // ---- 星穹列车 ----
    // 单人扶手椅（侧面）：靠背在右（面朝窗），flip 反过来
    sidechair: function (r, x, y, w, h, c, rnd, T, it) {
      var f = it && it.flip, bw = Math.max(3, Math.round(w * 0.2)), bx = f ? x : x + w - bw, top = Math.round(y - h);
      r.rect(bx, top, bw, Math.round(h * 0.8), c.base); r.rect(bx, top, bw, 1, c.lit);
      r.rect(x, Math.round(y - h * 0.46), w, Math.round(h * 0.28), c.base); r.rect(x, Math.round(y - h * 0.46), w, 2, c.lit);
      r.rect(f ? x + bw : x, Math.round(y - h * 0.62), w - bw, Math.max(2, Math.round(h * 0.08)), c.lit);
      r.rect(f ? x + w - Math.max(2, Math.round(w * 0.06)) : x, Math.round(y - h * 0.56), Math.max(2, Math.round(w * 0.06)), Math.round(h * 0.12), c.dark);
      [0.06, 0.9].forEach(function (k) { r.rect(Math.round(x + w * k), Math.round(y - h * 0.18), 2, Math.round(h * 0.18), c.rib); });
    },
    // 留声机：木柜 + 唱盘 + 往左上张开的黄铜大喇叭（唱片的反光在 PROP_ANIM 里转）
    phono: function (r, x, y, w, h, c, rnd, T) {
      var wood = T('#5a3624'), woodL = T('#7a4a30'), woodD = T('#3a2016'), brass = T('#c89a52'), ch = Math.round(h * 0.5), cy = Math.round(y - ch);
      r.rect(x, cy, w, ch, wood); r.rect(x, cy, w, 1, woodL); r.rect(x, cy, 1, ch, woodL); r.rect(x + w - 2, cy, 2, ch, woodD);
      r.rect(x + 2, cy + 3, w - 4, Math.round(ch * 0.44), woodD); r.rect(x + 3, cy + 4, w - 6, Math.round(ch * 0.44) - 2, wood);
      [0.3, 0.7].forEach(function (f) { r.px(x + w * f, cy + ch * 0.66, brass); });
      var P = phonoGeom(x, y, w, h);
      r.rect(P.tx - P.tw / 2, P.ty, P.tw, 3, woodD); r.ellipse(P.tx, P.ty, P.tw * 0.45, 1.3, 0, T('#1a1414'));
      var ax = x + w * 0.74, ay = P.ty - 1, mx = x + w * 0.24, my = y - h * 0.9, dx = mx - ax, dy = my - ay, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, R = w * 0.26;
      r.poly([[ax + nx, ay + ny], [mx + nx * R, my + ny * R], [mx - nx * R, my - ny * R], [ax - nx, ay - ny]], function (px, py) { return (px - ax) * nx + (py - ay) * ny > 0 ? mix(brass, '#ffffff', 0.2) : brass; });
      r.ellipse(mx, my, R, R * 0.4, Math.atan2(ny, nx), T('#6a4a1a'));
    },
    // 衣帽架：立杆 + 三脚 + 挂钩，挂着一件长外套和一顶礼帽
    coatrack: function (r, x, y, w, h, c, rnd, T) {
      var cx = Math.round(x + w / 2), pole = T('#3a2016'), top = Math.round(y - h), co = cx + Math.round(w * 0.08);
      r.rect(cx - 1, top, 2, h, pole); r.line(cx, y - 3, x + 1, y - 1, pole); r.line(cx, y - 3, x + w - 2, y - 1, pole);
      r.line(cx, top + 3, cx - w * 0.36, top, pole); r.line(cx, top + 3, cx + w * 0.36, top, pole); r.disc(cx, top, 1.5, T('#c89a52'));
      r.poly([[co - w * 0.14, top + 4], [co + w * 0.2, top + 4], [co + w * 0.34, top + h * 0.62], [co - w * 0.24, top + h * 0.62]], function (px) { return px < co - w * 0.05 ? T('#3a3a4e') : T('#2a2a3a'); });
      r.rect(co, top + 4, 1, Math.round(h * 0.5), T('#1a1a26'));
      r.rect(cx - Math.round(w * 0.46), top - 1, Math.round(w * 0.34), 2, T('#1a1a22')); r.rect(cx - Math.round(w * 0.4), top - 4, Math.round(w * 0.22), 3, T('#1a1a22'));
    },
    // 行李推车：黄铜架（平台 + 两根立柱 + 顶上弧形横杆）+ 三只叠放的箱子
    cart: function (r, x, y, w, h, c, rnd, T) {
      var brass = T('#c89a52'), brassD = T('#8a6a32'), top = Math.round(y - h), py = Math.round(y - h * 0.12);
      var bags = [[0.08, 0.44, 0.34, '#8a2a2a', 0], [0.55, 0.38, 0.28, '#3a5a7a', 0], [0.12, 0.34, 0.2, '#c8a060', 1]];
      bags.forEach(function (b) {
        var bw = Math.round(w * b[1]), bh = Math.round(h * b[2]), bx = Math.round(x + w * b[0]), by = b[4] ? py - Math.round(h * 0.34) : py, col = T(b[3]);
        r.rect(bx, by - bh, bw, bh, col); r.rect(bx, by - bh, 1, bh, mix(col, '#ffffff', 0.25)); r.rect(bx + bw - 1, by - bh, 1, bh, mix(col, '#000000', 0.3));
        r.rect(bx + Math.round(bw * 0.3), by - bh, 1, bh, brassD); r.rect(bx + Math.round(bw * 0.4), by - bh - 2, Math.round(bw * 0.2), 2, T('#2a1a14'));
      });
      r.rect(x, py, w, 2, brass);
      r.rect(x + 1, top, 2, py - top, brass); r.rect(x + w - 3, top, 2, py - top, brassD);
      for (var i = 0; i <= w; i++) r.px(x + i, top - Math.sin(i / w * Math.PI) * h * 0.08, brass);
      [0.15, 0.85].forEach(function (k) { r.disc(x + w * k, y - 2, Math.max(1.5, h * 0.05), T('#2a1a14')); });
    },

    // ---- 货舱 ----
    // 人字梯：带踏板的前梯 + 后撑 + 中间拉杆，顶上一个橙色托盘
    ladder: function (r, x, y, w, h, c, rnd, T) {
      var al = T('#b8c0cc'), alD = T('#7a8494'), top = Math.round(y - h), cx = Math.round(x + w * 0.45);
      r.line(cx, top, x + 1, y - 1, al); r.line(cx + 1, top, x + 2, y - 1, al); r.line(cx + 1, top, x + w - 2, y - 1, alD);
      for (var k = 1; k < 5; k++) { var f = k / 5, yy = Math.round(top + h * f), x0 = Math.round(lerp(cx, x + 1, f)); r.rect(x0 - 1, yy, 4, 1, al); }
      r.line(lerp(cx, x + 1, 0.6), top + h * 0.6, lerp(cx + 1, x + w - 2, 0.6), top + h * 0.6, alD);
      r.rect(cx - 2, top - 1, 5, 2, T('#e0602a'));
    },
    // 货架：蓝色立柱 + 橙色横梁，两层各放两只货箱（主题色）
    prack: function (r, x, y, w, h, c, rnd, T) {
      var or = T('#d8702a'), orD = T('#a0521e'), blue = T('#3a5a9a'), top = Math.round(y - h), mid = Math.round(y - h * 0.5);
      [[y - 2, 0.38], [mid - 2, 0.36]].forEach(function (L, li) {
        [0.06, 0.52].forEach(function (k, j) { if (li === 1 && j === 1 && rnd() < 0.35) return; PROP.crate(r, Math.round(x + w * k), L[0], Math.round(w * 0.42), Math.round(h * L[1]), c); });
      });
      [x, x + w - 3].forEach(function (px) {
        r.rect(px, top, 3, h, blue); r.rect(px, top, 1, h, mix(blue, '#ffffff', 0.25));
        for (var yy = top + 2; yy < y; yy += 4) r.px(px + 1, yy, T('#1c2430'));
      });
      [y, mid, top + 2].forEach(function (ly) { r.rect(x, ly - 2, w, 2, or); r.rect(x, ly - 1, w, 1, orD); });
    },
    // 叉车（朝左）：门架 + 货叉、黄色车身 + 后部配重、护顶架、座椅、两只轮子，护顶架上一盏警示灯（闪烁在 PROP_ANIM 里）
    forklift: function (r, x, y, w, h, c, rnd, T) {
      var yel = T('#e0a830'), yelL = T('#f4c860'), yelD = T('#a8781a'), dk = T('#1c1f24'), dk2 = T('#2c323c');
      var mx = Math.round(x + w * 0.16), bx = Math.round(x + w * 0.26), by = Math.round(y - h * 0.52), bw = Math.round(w * 0.7), bh = Math.round(h * 0.34);
      r.rect(mx, Math.round(y - h * 0.98), 3, Math.round(h * 0.92), dk2); r.rect(mx, Math.round(y - h * 0.98), 1, Math.round(h * 0.92), T('#4a5260'));
      r.rect(x, Math.round(y - h * 0.14), mx - x + 2, 2, dk);
      r.rect(bx, by, bw, bh, yel); r.rect(bx, by, bw, 1, yelL); r.rect(bx, by + bh - 2, bw, 2, yelD);
      var cwx = Math.round(x + w * 0.74), cwy = Math.round(y - h * 0.64);
      r.rect(cwx, cwy, Math.round(w * 0.22), by - cwy + 1, yel); r.rect(cwx, cwy, Math.round(w * 0.22), 1, yelL);
      var c0 = Math.round(x + w * 0.34), c1 = Math.round(x + w * 0.7), ct = Math.round(y - h * 0.96);
      r.rect(c0, ct, 2, by - ct, dk); r.rect(c1, ct, 2, cwy - ct, dk); r.rect(c0 - 1, ct, c1 - c0 + 4, 2, dk);
      r.rect(Math.round(x + w * 0.54), Math.round(by - h * 0.14), Math.round(w * 0.1), Math.round(h * 0.14), dk2);
      r.line(Math.round(x + w * 0.42), by - 1, Math.round(x + w * 0.46), Math.round(by - h * 0.12), dk);
      [[0.36, 0.13], [0.84, 0.12]].forEach(function (k) { var wx = x + w * k[0], wr = h * k[1]; r.disc(wx, y - wr, wr, dk); r.disc(wx, y - wr, wr * 0.4, T('#6a7482')); });
      r.rect(Math.round(x + w * 0.52), ct - 2, 2, 2, T('#8a3a20'));
    },
    // 托盘货：木托盘上码得整整齐齐的 2×2 货箱，外面一层缠绕膜 + 一条黄色绑带
    pallet: function (r, x, y, w, h, c, rnd, T) {
      var wood = T('#9a7448'), woodD = T('#6a4e2e'), ph = Math.max(2, Math.round(h * 0.1)), cw = Math.round((w - 2) / 2), chh = Math.round((h - ph) / 2);
      r.rect(x, y - ph, w, 1, wood); r.rect(x, y - 1, w, 1, woodD);
      for (var k = 0; k < 3; k++) r.rect(Math.round(x + (w - 3) * k / 2), y - ph, 3, ph, woodD);
      for (var row = 0; row < 2; row++) for (var col = 0; col < 2; col++) PROP.crate(r, x + 1 + col * cw, y - ph - row * chh, cw - 1, chh - 1, c);
      r.rect(x + 1, y - ph - 2 * chh + 1, w - 2, 2 * chh - 1, T('#dfe8f0'), 0.12);
      r.rect(Math.round(x + w * 0.5) - 1, y - ph - 2 * chh, 2, 2 * chh, T('#d8a83a'), 0.8);
    },
    // 吊钩：整件（钢缆、滑轮、吊索、箱子）都在 PROP_ANIM 里画，才能轻轻晃
    hook: function () {},
    // 工具推车：红色三层抽屉 + 推把 + 轮子，台面上一把扳手
    toolcart: function (r, x, y, w, h, c, rnd, T) {
      var red = T('#b8392b'), redL = T('#e05a4a'), redD = T('#7a2018'), top = Math.round(y - h * 0.86), bh = Math.round(h * 0.78), bw = Math.round(w * 0.86), steel = T('#9aa4b0');
      r.rect(x, top, bw, bh, red); r.rect(x, top, bw, 1, redL); r.rect(x, top, 1, bh, redL); r.rect(x + bw - 2, top, 2, bh, redD);
      for (var k = 1; k < 4; k++) { var dy = Math.round(top + bh * k / 4); r.rect(x + 1, dy, bw - 2, 1, redD); r.rect(Math.round(x + w * 0.3), dy - 3, Math.round(w * 0.24), 1, T('#dfe6ee')); }
      r.rect(x + bw, Math.round(top - h * 0.04), Math.round(w * 0.12), 2, steel); r.rect(Math.round(x + w * 0.96), Math.round(top - h * 0.04), 2, Math.round(h * 0.3), steel);
      [0.1, 0.76].forEach(function (k) { r.disc(x + w * k, y - 2, Math.max(1.5, h * 0.06), T('#1c1f24')); });
      r.rect(Math.round(x + w * 0.1), top - 2, Math.round(w * 0.4), 2, steel); r.rect(Math.round(x + w * 0.1), top - 3, 2, 3, steel);
    },

    // ---- 实验舱 ----
    // 三脚架上的相机：镜头朝右对着测试区（REC 灯在 PROP_ANIM 里闪）
    tripod: function (r, x, y, w, h, c, rnd, T) {
      var C = tripodCam(x, y, w, h), leg = T('#2a3038');
      r.line(C.hx, C.hy, x + 1, y - 1, leg); r.line(C.hx, C.hy, x + w - 2, y - 1, leg); r.line(C.hx, C.hy, C.hx, y - 1, leg);
      r.rect(C.bx, C.by, C.bw, C.bh, T('#1c2228')); r.rect(C.bx, C.by, C.bw, 1, T('#3a444e'));
      var lw = Math.round(w * 0.22);
      r.rect(C.bx + C.bw, C.by + 1, lw, C.bh - 2, T('#2a3038')); r.rect(C.bx + C.bw + lw - 1, C.by + 1, 1, C.bh - 2, T('#6ad0ff'));
      r.rect(C.hx - 1, C.hy - 1, 3, 2, leg);
    },
    // 机械臂工作台：台面 + 下层隔板（一台小工控机）；台上机械臂底座、一只橙色方块、一块小屏（手臂在 PROP_ANIM 里动）
    armbench: function (r, x, y, w, h, c, rnd, T) {
      var A = labArmGeom(x, y, w, h), bh = A.bh, ty = y - bh;
      r.rect(x, ty, w, 2, c.lit); r.rect(x, ty + 2, w, 1, c.dark);
      [0.03, 0.94].forEach(function (k) { r.rect(Math.round(x + w * k), ty + 2, 2, bh - 2, c.base); });
      var sy = Math.round(y - bh * 0.3), pc = Math.round(bh * 0.28);
      r.rect(Math.round(x + w * 0.03), sy, Math.round(w * 0.93), 1, c.base);
      r.rect(Math.round(x + w * 0.1), sy - pc, Math.round(w * 0.16), pc, T('#2a3038')); r.px(Math.round(x + w * 0.12), sy - pc + 2, [120, 255, 170]);
      r.rect(A.bx - 3, ty - 2, 7, 2, T('#3a444e')); r.rect(A.bx - 2, ty - 4, 5, 2, T('#e8ecf0'));
      r.rect(Math.round(x + w * 0.12), ty - 4, 4, 4, T('#e0602a'));
      var sw = Math.round(w * 0.14), sh = Math.max(4, Math.round(h * 0.12)), sx = Math.round(x + w * 0.78);
      r.rect(sx, ty - sh - 1, sw, sh, T('#1c2228')); r.rect(sx + 1, ty - sh, sw - 2, sh - 2, T('#1c4a5a'));
    },
    // 3D 打印机：框 + 打印腔（亚克力罩）+ 底座小屏，平台上一座一层层叠起来的橙色小塔（打印头在 PROP_ANIM 里走）
    printer: function (r, x, y, w, h, c, rnd, T) {
      var P = printerGeom(x, y, w, h), fr = T('#2a3038');
      r.rect(x, P.top, w, h, fr); r.rect(x + 2, P.top + 2, w - 4, P.cavH, T('#0e1418'));
      r.rect(x, y - P.baseH, w, P.baseH, T('#3a444e')); r.rect(x + w - 8, y - Math.round(P.baseH * 0.7), 5, 3, T('#1c4a5a'));
      r.rect(x + 4, P.bedY, w - 8, 1, T('#8a96a4'));
      for (var k = 0; k < P.ph; k++) r.rect(Math.round(x + w * 0.4), P.bedY - 1 - k, Math.round(w * 0.2), 1, k % 2 ? T('#e0602a') : T('#f08a3a'));
      r.rect(x + 2, P.top + 2, w - 4, P.cavH, T('#9fe8ff'), 0.08);
    },
    // 机器狗：整只在 PROP_ANIM 里画（待机时身体轻轻起伏），这里只留地上的影子
    dog: function () {},
    // 充电桩：地上一圈充电垫 + 一根带小屏的立柱（充电光圈和电量条在 PROP_ANIM 里）
    dock: function (r, x, y, w, h, c, rnd, T) {
      var cx = x + w / 2, px = Math.round(x + w * 0.82), top = Math.round(y - h), sh = Math.round(h * 0.22);
      r.ellipse(cx, y - 2, w * 0.5, Math.max(1.5, h * 0.06), 0, T('#3a444e'));
      r.ellipse(cx, y - 2, w * 0.36, Math.max(1, h * 0.04), 0, T('#1c4a5a'));
      r.rect(px, top, 3, h - 2, T('#8a96a4')); r.rect(px - 3, top, 9, sh, T('#2a3038')); r.rect(px - 2, top + 1, 7, sh - 2, T('#0e1c24'));
    },
    // 线缆盘：黑色边盘 + 一圈圈橙色线缆 + 中间轴心，一截线拖在地上
    reel: function (r, x, y, w, h, c, rnd, T) {
      var cx = x + w / 2, cy = y - h / 2, R = Math.min(w, h) / 2;
      r.line(cx + R * 0.6, cy + R * 0.6, x + w * 1.5, y - 1, T('#e0802a'));
      r.disc(cx, cy, R, T('#2a3038')); r.disc(cx, cy, R * 0.8, T('#e0802a')); r.disc(cx, cy, R * 0.64, T('#c0661e'));
      r.disc(cx, cy, R * 0.52, T('#e0802a')); r.disc(cx, cy, R * 0.28, T('#3a444e')); r.disc(cx, cy, R * 0.1, T('#8a96a4'));
    },
    // 两只叠放的半透明蓝色收纳箱（盖子 + 白标签）
    bins: function (r, x, y, w, h, c, rnd, T) {
      var bh = Math.round(h / 2), cols = ['#3a7ab8', '#2e6aa4'];
      for (var k = 0; k < 2; k++) {
        var by = y - k * bh, inset = k ? Math.round(w * 0.06) : 0, bx = x + inset, bw = w - inset * 2, col = T(cols[k]);
        r.rect(bx, by - bh + 2, bw, bh - 2, col, 0.85); r.rect(bx - 1, by - bh, bw + 2, 3, T('#1c3a5a'));
        r.rect(bx + 2, by - bh + 4, 1, bh - 6, mix(col, '#ffffff', 0.3));
        r.rect(Math.round(bx + bw * 0.35), by - Math.round(bh * 0.55), Math.round(bw * 0.3), Math.max(2, Math.round(bh * 0.2)), T('#f2f0e8'));
      }
    },

    // A 字立牌：木框小黑板，粉笔写 WIFI 和两行字，底下露出两条腿
    aframe: function (r, x, y, w, h, c, rnd, T) {
      var top = Math.round(y - h), bh = Math.round(h * 0.8), ink = T('#2a3530');
      r.poly([[x + w * 0.1, top], [x + w * 0.9, top], [x + w, top + bh], [x, top + bh]], c.lit);
      r.poly([[x + w * 0.1 + 2, top + 2], [x + w * 0.9 - 2, top + 2], [x + w - 2, top + bh - 2], [x + 2, top + bh - 2]], ink);
      r.rect(x + 1, top + bh, 2, y - top - bh, c.base); r.rect(x + w - 3, top + bh, 2, y - top - bh, c.dark);
      var tw = textWidth('WIFI', 1);
      drawText(r, Math.round(x + w / 2 - tw / 2), top + 4, 'WIFI', T('#f2efe6'));
      r.line(x + w * 0.24, top + 12, x + w * 0.76, top + 12, T('#dfe8e0'), 0.8);
      r.line(x + w * 0.22, top + 15, x + w * 0.64, top + 15, T('#ffd98a'), 0.9);
      if (bh > 20) r.line(x + w * 0.2, top + 18, x + w * 0.7, top + 18, T('#dfe8e0'), 0.7);
    }
  };

  PX.provide('09-cabins', { CABIN: CABIN, DECO_ANIM: DECO_ANIM, FLOOR_ANIM: FLOOR_ANIM, animProps: animProps,
    bandDepth: bandDepth, castFn: castFn, composition: composition, drawCabin: drawCabin,
    drawCabinFloor: drawCabinFloor, drawProps: drawProps, floorGeom: floorGeom,
    measureWindowLight: measureWindowLight, propsAnimated: propsAnimated });
})(window.__abPixel = window.__abPixel || {});
