// About 页像素 Hero · 08c-amphoreus-light-px：翁法罗斯中间的光芒（十字亮星、放射碎光、柔光、横向蓝光）——用 px 版的画法
// 翁法罗斯定稿 = 素材版（08a 暗盘 + 08b 玻璃带 + 08 组装）+ 这里的光芒（原来 px 版 08r 里的 amphoreusStar / amphoreusLight 原样搬过来）：
// 光的贴图经 04b-atlas-px-kit 转成我们的画风（软的，透明度分档抖动），位置、大小和素材版一样。
// 素材版原来的光芒（08c-amphoreus-star / 08d-amphoreus-light）和整份 px 版都挪到了 E:\fblog\窗外地标-备用版本\翁法罗斯\ 里备用。
// 动效（fx.advect 流动见 03-advect）：
//   · 十字亮星：光体大小固定，上面叠一层放大 1.2 倍、半透明的同一颗星，慢慢浮现又淡掉（时隐时现），不再靠整体放大缩小；
//   · 两道放射状的辐光往外扩散：light-1 碎光（去掉了贴图里的淡雾，见 04b 的 style.sparks）拆成一颗颗小精灵，各自慢慢往外飘、淡入淡出
//     （亚像素移动、透明度连续；玻璃带后面，两倍像素密度的 view-sparks 层）；去掉的雾换成一层平滑的淡蓝辉光（04b 的 style.haze，景色层）；
//     light-2 彩色辐条的颜色 / 浓淡沿辐条往外涌；
//   · 横向蓝光：颜色 / 浓淡从中间往左右两边流——画得细：两倍像素密度、颜色和透明度连续、流动按小数平滑插值（amphoreusBeam）；
//   · 亮星、彩色辐条、横向蓝光在 10-mount 的 view-fx 层（两倍密度：蓝光和辐条按两倍画，亮星保留一倍像素尺寸）、
//     碎光在 view-sparks 层（都约 30 帧 / 秒）；辉光和柔光在景色层（约 12 帧 / 秒）。
(function (PX) {
  'use strict';

  PX.need('08c-amphoreus-light-px', ['atlasPoint', 'clamp', 'hash', 'pxAtlasDraw', 'pxAtlasLoad', 'pxAtlasStyled']);
  var atlasPoint = PX.atlasPoint, clamp = PX.clamp, hash = PX.hash, pxAtlasStyled = PX.pxAtlasStyled, pxAtlasDraw = PX.pxAtlasDraw, pxAtlasLoad = PX.pxAtlasLoad;

  function softStyle(id, ramp) {
    return { id: id, soft: true, classify: function () { return 's'; }, ramps: { s: ramp }, dither: ['s'] };
  }
  var STAR = softStyle('am-star', ['#4a6a8c', '#9ec8b0', '#d8f78b', '#f4ffe0', '#ffffff']);
  // 碎光贴图（light-1）拆成两样画：
  //   · 碎光：去掉那一大片淡雾（抖动出来是噪点，和后面暗盘的纹理叠出一个圈），只留一颗颗碎光，各按自己原来的颜色
  //     （青 / 黄绿 / 蓝 / 粉 / 白，各一条色阶）；画在两倍像素密度的 view-sparks 层（比别处细一倍），约 30 帧 / 秒；
  //   · 淡蓝辉光：反过来只要那片雾，模糊成平滑的一片，颜色连续渐变、透明度不分档（没有点阵），画在景色层
  var LIGHT1 = {
    id: 'am-light1-sprites', soft: true, alphaSmooth: true, sparks: { r: 10, thr: 0.07, lum: 110 },
    classify: function (c, H) {
      if (H.s < 0.15) return 'white';
      if (H.h >= 60 && H.h < 165) return 'lime';
      if (H.h >= 165 && H.h < 205) return 'cyan';
      if (H.h >= 205 && H.h < 275) return 'blue';
      return 'pink';
    },
    ramps: {
      white: ['#6a7ab0', '#b4c4ec', '#eef4ff', '#ffffff'],
      lime: ['#4a7a60', '#8ccf96', '#d4f7a8', '#f4ffe0'],
      cyan: ['#2a7496', '#5fd0e8', '#bff6ff', '#f0feff'],
      blue: ['#2c48a8', '#6a92ea', '#b8d0ff', '#eef4ff'],
      pink: ['#7a4c96', '#d08ed0', '#ffd0f0', '#fff4fb']
    },
    dither: []
  };
  var HAZE = { id: 'am-light1-haze', haze: { r: 16, gain: 1.4 }, ramps: { h: ['#16266a', '#24449e', '#4a74d0', '#8fb4f2', '#cfe0ff'] } };
  // 柔光（星心那团白光）：同样用平滑画法（原来是点阵抖动，本身就是一个带点阵的小圆）
  var HALO = { id: 'am-halo-smooth', haze: { r: 2, gain: 1 }, ramps: { h: ['#2a4a80', '#5a8ac0', '#a0dcd0', '#dcfff0'] } };
  var LIGHT2 = softStyle('am-light2', ['#1c2a70', '#4a6ad0', '#9ab8ff', '#e8f0ff']);
  LIGHT2.fine = true;
  // 横向蓝光：色阶和原来一样，但颜色在档间连续插值、透明度连续（不抖动、没有点阵），画在两倍像素密度上（见 amphoreusBeam）
  var BEAM = { id: 'am-beam-fine', soft: true, fine: true, alphaSmooth: true, smoothRamp: true, classify: function () { return 's'; },
    ramps: { s: ['#0e2a8c', '#2a5ae0', '#5fa8ff', '#bfe6ff', '#ffffff'] }, dither: [] };

  // 这几张光的贴图由 px 画法的贴图缓存加载（和素材版的缓存分开），08-amphoreus 的 loadAmphoreus 里一起等
  function amphoreusLightLoad() {
    return pxAtlasLoad(['amphoreus-star', 'amphoreus-light-1', 'amphoreus-light-2', 'amphoreus-halo', 'amphoreus-blue-light']);
  }

  function frac(v) { return v - Math.floor(v); }

  // ---------- 十字亮星 ----------
  // 叠在光体上那层大一点的光：3.2 秒一个周期，前 85% 慢慢浮现又淡掉，后面空着
  function overlayAlpha(t) { var f = frac(t / 3.2), k = Math.sin(Math.PI * clamp(f / 0.85, 0, 1)); return 0.5 * k * k; }
  function starRect(at, size) { return [at[0] - size * 234 / 512, at[1] - size * 291 / 512, size, size]; }   // 贴图里亮心在 (234, 291)
  function amphoreusStar(r, F, t) {
    var at = F.lightCenter, C = atlasPoint(F, at[0], at[1]);
    F.starScale = 1;
    r.glow(C[0], C[1], 6 * F.s, 66 * F.s, '#d8ffe3', 0.48);
    var rays = [[-1.9, 90, '#d8f78b'], [-2.25, 65, '#86dcb9'], [-1.4, 102, '#97e8e3'], [0.15, 83, '#9bc5ff'], [1.1, 65, '#b8eca0'], [2.55, 96, '#9bafff']];
    rays.forEach(function (ray, i) {
      var a = ray[0], length = ray[1] * F.s, start = (0.25 + (t * 0.04 + i * 0.13) % 0.65) * length;
      r.line(C[0] + Math.cos(a) * start, C[1] + Math.sin(a) * start, C[0] + Math.cos(a) * (start + length * 0.15), C[1] + Math.sin(a) * (start + length * 0.15), ray[2], 0.5);
    });
    pxAtlasDraw(r, F, 'amphoreus-star', starRect(at, 500), STAR, { alpha: 0.94, cacheKey: 'amphoreus-star' });
    var k = overlayAlpha(t);
    if (k > 0.03) {
      r.glow(C[0], C[1], 8 * F.s, 92 * F.s, '#e8fff0', 0.3 * k);
      pxAtlasDraw(r, F, 'amphoreus-star', starRect(at, 600), STAR, { alpha: k, cacheKey: 'amphoreus-star' });
    }
    r.disc(C[0], C[1], Math.max(1.5, 7.2 * F.s), '#ffffff');
  }

  // ---------- 光：放射碎光 / 柔光（玻璃带后面）、彩色辐条 / 横向蓝光（玻璃带前面）----------
  function amphoreusLight(r, F, t, front) {
    var C = F.lightCenter, pulse = 0.5 + 0.5 * Math.sin(t * 0.75);
    if (!front) {
      // 玻璃带后面（景色层）：平滑的淡蓝辉光 + 柔光
      // 这两笔逐像素都不随时间变，只有整体透明度在呼吸：打开 cacheKey（见 04b）
      pxAtlasDraw(r, F, 'amphoreus-light-1', [C[0] - 420, C[1] - 420, 840, 840], HAZE, { alpha: 0.75 + pulse * 0.05, cacheKey: 'amphoreus-haze' });
      pxAtlasDraw(r, F, 'amphoreus-halo', [C[0] - 175, C[1] - 175, 350, 350], HALO, { alpha: 0.2 + pulse * 0.015, cacheKey: 'amphoreus-halo' });
      return;
    }
    // 彩色辐条：轮廓不动，颜色和浓淡沿着往外流（mix 0.5），像光一股股往外涌（横向蓝光单独画，见 amphoreusBeam）
    var s = F.s, w = 900, h = 450;
    pxAtlasDraw(r, F, 'amphoreus-light-2', [C[0] - w * 0.5, C[1] - h * 0.48, w, h], LIGHT2, { alpha: 0.3 + pulse * 0.03,
      advect: { mode: 'radial', cx: w * 0.5 * s, cy: h * 0.48 * s, len: 60 * s, phase: t / 2.4, mix: 0.5 } });
  }

  // ---------- 横向蓝光：颜色 / 浓淡从中间往左右两边流 ----------
  // 画得细：F 是按图层像素密度放大过的取景（view-fx 层在翁法罗斯时是两倍密度），贴图按两倍尺寸取样；颜色、透明度都连续。
  // 流动也是平滑的（和 03-advect 的 axisX 一样的走法，但不抖动）：每个像素往回（上游）取样的位置按小数算、左右两格线性插值；
  // 两套相位差半个周期，按「离跳回那一刻多远」的权重直接混合（原来是按这个权重 Bayer 抖动二选一，会出点阵）。
  // 轮廓不动：透明度 = 原地的一半 + 流过来的一半（BEAM_MIX）；颜色取流过来的那份（流过来的几乎没有时平滑退回原地的颜色）。
  // BEAM_GAMMA：透明度再过一道曲线，淡边收得更快，光束细而利落（连续透明度下淡边会整片显出来，看着发虚发宽）
  // 每帧都要画两倍密度的一整条，逐像素的活儿都写在一个循环里（不调函数、不走 r.px）：
  // 取样 = 左右两格线性插值（出界算透明），颜色按透明度加权（预乘）；透明度曲线查表；混合公式和 Raster.px 一样（盖在已有的像素上）
  var BEAM_LEN = 90, BEAM_PERIOD = 2, BEAM_MIX = 0.5, BEAM_GAMMA = 1.35;
  var GAMMA_LUT = new Float32Array(1025);
  for (var gq = 0; gq <= 1024; gq++) GAMMA_LUT[gq] = Math.pow(gq / 1024, BEAM_GAMMA);
  function amphoreusBeam(r, F, t) {
    var C = F.lightCenter, s = F.s, pulse = 0.5 + 0.5 * Math.sin(t * 0.75);
    var P = pxAtlasStyled(F, 'amphoreus-blue-light', [C[0] - 660, C[1] - 54, 1320, 78], BEAM);
    if (!P) return;
    var d = P.A.d, w = P.A.w, h = P.A.h, cx = 660 * s, len = BEAM_LEN * s, alpha = 0.52 + pulse * 0.02;
    var pa = frac(t / BEAM_PERIOD), pb = frac(pa + 0.5), la = len * pa, lb = len * pb, wa = 1 - Math.abs(1 - 2 * pa), wb = 1 - wa;
    var D = r.d, RW = r.w, RH = r.h, X0 = Math.round(P.x0) + r.ox, Y0 = Math.round(P.y0) + r.oy;
    for (var y = 0; y < h; y++) {
      var ty = Y0 + y;
      if (ty < 0 || ty >= RH) continue;
      var row = y * w;
      for (var x = 0; x < w; x++) {
        var i = (row + x) * 4, a0 = d[i + 3];
        if (!a0) continue;
        var tx = X0 + x;
        if (tx < 0 || tx >= RW) continue;
        var dir = x < cx ? -1 : 1, ar = 0, ag = 0, ab = 0, aa = 0, j, k;
        // 两套相位各取一次样：往回（上游）la / lb 远处，左右两格插值；k = 透明度（0 ~ 255）× 插值权重 × 相位权重
        var sa = x - dir * la, xa = Math.floor(sa), fa = sa - xa;
        if (xa >= 0 && xa < w) { j = (row + xa) * 4; k = d[j + 3] * (1 - fa) * wa; ar += d[j] * k; ag += d[j + 1] * k; ab += d[j + 2] * k; aa += k; }
        if (xa + 1 >= 0 && xa + 1 < w) { j = (row + xa + 1) * 4; k = d[j + 3] * fa * wa; ar += d[j] * k; ag += d[j + 1] * k; ab += d[j + 2] * k; aa += k; }
        var sb = x - dir * lb, xb = Math.floor(sb), fb = sb - xb;
        if (xb >= 0 && xb < w) { j = (row + xb) * 4; k = d[j + 3] * (1 - fb) * wb; ar += d[j] * k; ag += d[j + 1] * k; ab += d[j + 2] * k; aa += k; }
        if (xb + 1 >= 0 && xb + 1 < w) { j = (row + xb + 1) * 4; k = d[j + 3] * fb * wb; ar += d[j] * k; ag += d[j + 1] * k; ab += d[j + 2] * k; aa += k; }
        var a = (a0 * (1 - BEAM_MIX) + aa * BEAM_MIX) / 255;
        if (a <= 0.002) continue;
        // 颜色取流过来的那份；流过来的几乎没有时平滑退回原地的颜色（原地那份只占很小的权重）
        var k0 = a0 * 0.02, kk = aa + k0;
        var cr = (ar + d[i] * k0) / kk, cg = (ag + d[i + 1] * k0) / kk, cb = (ab + d[i + 2] * k0) / kk;
        var fa2 = GAMMA_LUT[Math.min(1024, (a * 1024) | 0)] * alpha, o = (ty * RW + tx) * 4;
        if (fa2 <= 0) continue;
        var da = D[o + 3] / 255, oa = fa2 + da * (1 - fa2);
        D[o] = (cr * fa2 + D[o] * da * (1 - fa2)) / oa;
        D[o + 1] = (cg * fa2 + D[o + 1] * da * (1 - fa2)) / oa;
        D[o + 2] = (cb * fa2 + D[o + 2] * da * (1 - fa2)) / oa;
        D[o + 3] = oa * 255;
      }
    }
  }

  // ---------- 碎光（已去雾）：每颗碎光拆成一个小精灵，各自从原位置浮现、沿离开星心的方向往外飘、再淡掉 ----------
  // 飘 SPARK_LEN（贴图单位）远、一个来回 SPARK_PERIOD 秒；每颗的节奏按编号错开（画面里一直有碎光在飘）。
  // 位置按小数算：每个像素按比例分到相邻四格（亚像素），慢慢移动也不会一格一格地跳；淡入淡出的透明度是连续的（不抖动）。
  // F 是按图层像素密度放大过的取景（两倍密度的层里 F.s 也是两倍），距离都按 F.s 算。
  var SPARK_LEN = 70, SPARK_PERIOD = 6;
  function smooth01(a, b, x) { var k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }

  // 把去雾后的碎光图按连通块拆开（8 邻接），每块记下像素（相对块左上角）、离星心的方向、错开的相位；缓存在零件上（scale = F.s）
  function sparkSprites(A, cx, cy, scale) {
    if (A.sprites) return A.sprites;
    var w = A.w, h = A.h, d = A.d, seen = new Uint8Array(w * h), list = [], stack = [];
    for (var i0 = 0; i0 < w * h; i0++) {
      if (seen[i0] || !d[i0 * 4 + 3]) continue;
      var px = [], minx = w, miny = h, maxx = 0, maxy = 0, sx = 0, sy = 0, sa = 0;
      stack.length = 0; stack.push(i0); seen[i0] = 1;
      while (stack.length) {
        var i = stack.pop(), x = i % w, y = (i - x) / w, a = d[i * 4 + 3] / 255;
        px.push(x, y, d[i * 4], d[i * 4 + 1], d[i * 4 + 2], a);
        if (x < minx) minx = x; if (y < miny) miny = y; if (x > maxx) maxx = x; if (y > maxy) maxy = y;
        sx += x * a; sy += y * a; sa += a;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var xx = x + dx, yy = y + dy, j = yy * w + xx;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || seen[j] || !d[j * 4 + 3]) continue;
          seen[j] = 1; stack.push(j);
        }
      }
      for (var k = 0; k < px.length; k += 6) { px[k] -= minx; px[k + 1] -= miny; }
      var ox = sx / sa - cx, oy = sy / sa - cy, ol = Math.sqrt(ox * ox + oy * oy), n = list.length;
      if (ol < 1) { var ang = hash(n * 97 + 5) * Math.PI; ox = Math.cos(ang); oy = Math.sin(ang); ol = 1; }
      var S = { x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1, px: px, dx: ox / ol, dy: oy / ol, ph: (hash(n * 131 + 17) + 1) * 0.5 };
      // 去雾后残下的雾渣：又小又暗（面积 < 45、平均不透明度 < 0.45，按贴图单位算）、形状不规则——
      // 大一点的换成一颗小碎光（原位置、朝离开星心的方向），只有几个像素的直接丢掉
      var area = px.length / 6 / (scale * scale);
      if (area < 45 && sa / (px.length / 6) < 0.45) {
        if (area < 5) continue;
        S = smallSpark(sx / sa, sy / sa, S.dx, S.dy, scale, S.ph);
      }
      list.push(S);
    }
    return (A.sprites = list);
  }
  // 一颗小碎光：沿方向 (dx, dy) 的细长一条（长 13、宽约 2，贴图单位），中间亮、两头和两边渐隐，青色
  function smallSpark(cx, cy, dx, dy, scale, ph) {
    var half = 6.5 * scale, hw = 1.1 * scale, R = Math.ceil(half + 2), px = [], minx = Infinity, miny = Infinity, pts = [];
    for (var y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (var x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      var ux = x + 0.5 - cx, uy = y + 0.5 - cy, along = (ux * dx + uy * dy) / half, across = (ux * -dy + uy * dx) / hw;
      if (Math.abs(along) >= 1) continue;
      var a = (1 - along * along) * Math.exp(-across * across);
      if (a < 0.06) continue;
      var c = a > 0.7 ? [191, 246, 255] : a > 0.35 ? [95, 208, 232] : [42, 116, 150];
      pts.push([x, y, c, Math.min(1, a * 1.1)]);
      if (x < minx) minx = x; if (y < miny) miny = y;
    }
    var maxx = minx, maxy = miny;
    pts.forEach(function (q) { px.push(q[0] - minx, q[1] - miny, q[2][0], q[2][1], q[2][2], q[3]); if (q[0] > maxx) maxx = q[0]; if (q[1] > maxy) maxy = q[1]; });
    return { x: minx, y: miny, w: maxx - minx + 1, h: maxy - miny + 1, px: px, dx: dx, dy: dy, ph: ph };
  }

  var scratch = new Float32Array(0);
  function amphoreusSparks(r, F, t) {
    var C = F.lightCenter, s = F.s, pulse = 0.5 + 0.5 * Math.sin(t * 0.75);
    var P = pxAtlasStyled(F, 'amphoreus-light-1', [C[0] - 420, C[1] - 420, 840, 840], LIGHT1);
    if (!P) return;
    var sprites = sparkSprites(P.A, 420 * s, 420 * s, s), base = 0.85 + pulse * 0.03, len = SPARK_LEN * s;
    sprites.forEach(function (S) {
      var f = (t / SPARK_PERIOD + S.ph) % 1, env = smooth01(0, 0.18, f) * (1 - smooth01(0.55, 1, f)) * base;
      if (env < 0.01) return;
      var ox = S.dx * len * f, oy = S.dy * len * f, ix = Math.floor(ox), iy = Math.floor(oy), fx = ox - ix, fy = oy - iy;
      var bw = S.w + 1, bh = S.h + 1, n = bw * bh * 4;
      if (scratch.length < n) scratch = new Float32Array(n * 2);
      scratch.fill(0, 0, n);
      var w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy, p = S.px;
      for (var k = 0; k < p.length; k += 6) {
        var a = p[k + 5] * env, q = (p[k + 1] * bw + p[k]) * 4;
        splat(q, w00 * a, p[k + 2], p[k + 3], p[k + 4]); splat(q + 4, w10 * a, p[k + 2], p[k + 3], p[k + 4]);
        splat(q + bw * 4, w01 * a, p[k + 2], p[k + 3], p[k + 4]); splat(q + bw * 4 + 4, w11 * a, p[k + 2], p[k + 3], p[k + 4]);
      }
      var X0 = P.x0 + S.x + ix, Y0 = P.y0 + S.y + iy, col = [0, 0, 0];
      for (var yy = 0; yy < bh; yy++) for (var xx = 0; xx < bw; xx++) {
        var o = (yy * bw + xx) * 4, aa = scratch[o + 3];
        if (aa < 0.004) continue;
        col[0] = scratch[o] / aa; col[1] = scratch[o + 1] / aa; col[2] = scratch[o + 2] / aa;
        r.px(X0 + xx, Y0 + yy, col, Math.min(1, aa));
      }
    });
  }
  function splat(o, a, cr, cg, cb) {
    if (a <= 0) return;
    scratch[o] += cr * a; scratch[o + 1] += cg * a; scratch[o + 2] += cb * a; scratch[o + 3] += a;
  }

  PX.provide('08c-amphoreus-light-px', { amphoreusBeam: amphoreusBeam, amphoreusLight: amphoreusLight, amphoreusLightLoad: amphoreusLightLoad, amphoreusSparks: amphoreusSparks, amphoreusStar: amphoreusStar });
})(window.__abPixel = window.__abPixel || {});
