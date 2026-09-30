/**
 * About 页 Hero：像素风「观景舱」（Canvas 程序绘制 + 本地航图分层素材）
 * 构图照搬同人图 "Let's go on a trip."（@meot_ori）的近 → 中 → 远：
 *   近：流萤与开拓者（星 / 穹，随机）站在舷窗前、画面从右往左 0.618 处，约占画面高度的四分之一；卡通平涂小人，
 *       转头、侧身、顶胯、搭肩、牵手等六种动作随机
 *   中：船舱——左侧一整面大舷窗，窗台是一条从左到右微微上扬的灯带；右上层层叠叠的天花横梁切出一道斜向右下的阶梯线，
 *       右下是被窗外光照亮的舱壁，舱壁左端一扇门，地上成组摆着这个舱室的东西（贴墙 / 中排 / 前排）。
 *       主题随机（科幻观景台 / 星穹列车观景车厢 / 星际 TechCafe / 货舱 / 具身智能实验舱），骨架不变
 *   远：舷窗外的景色（随机：雅利洛-VI / 匹诺康尼 / 空间站「黑塔」/ 仙舟「罗浮」/ 翁法罗斯），
 *       照星轨航图各地图标的主体（不含金色选择框）；雅利洛程序绘制，其余固定视角分层绘制，主体约八成可见
 * 每层一块低分辨率画布，CSS 按整数倍放大（image-rendering: pixelated）；鼠标移动时各层按景深视差。
 * 调试：/about/?hero=景色,船舱,开拓者,姿势 固定组合，如 ?hero=penacony,express,stelle,2
 *
 * 代码拆成 source/js/about-pixel/ 下多个文件（空间站主体、星云、光束各占一个），按依赖顺序加载（见 about/index.pug），每个文件一个独立作用域：
 *   · 文件里自己定义的名字对别的文件不可见，重名也互不影响；
 *   · 要用别的文件的东西，先在开头 PX.need 里声明，再从 PX 上取；自己要给别人用的，在末尾 PX.provide 里列出；
 *   · 同一个名字被两个文件导出、或依赖的文件还没加载，页面会直接报错（不会悄悄覆盖）。
 */
// About 页像素 Hero · 01-core：工具（颜色 / 噪声 / 抖动）、像素缓冲 Raster、3×5 像素字，以及这套模块机制本身
(function (PX) {
  'use strict';

  // ========== 模块机制 ==========
  // 各文件只通过这个内部命名空间（window.__abPixel）交换东西：
  //   PX.provide(文件, { 名字: 值 })：导出；同一个名字被两个文件导出 → 直接报错
  //   PX.need(文件, [名字])：声明依赖；依赖还没加载（script 顺序不对）→ 直接报错
  PX.provide = function (file, obj) {
    Object.keys(obj).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(PX, k)) throw new Error('about-pixel: ' + file + ' 导出的 ' + k + ' 已被别的文件导出过');
      PX[k] = obj[k];
    });
  };
  PX.need = function (file, names) {
    names.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(PX, k)) throw new Error('about-pixel: ' + file + ' 依赖的 ' + k + ' 还没加载（检查 script 顺序）');
    });
  };

  // ========== 可选项 ==========
  var VIEWS = ['jarilo', 'penacony', 'station', 'xianzhou', 'amphoreus'];
  var CABINS = ['deck', 'express', 'cafe', 'hangar', 'lab'];

  // ========== 工具 ==========
  var hexCache = {};
  function hex(s) {
    if (typeof s !== 'string') return s;
    var c = hexCache[s];
    if (!c) c = hexCache[s] = [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    return c;
  }
  function mix(a, b, t) { a = hex(a); b = hex(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // 4×4 Bayer 抖动阈值：渐变 / 光晕都用它把连续值拆成两档颜色，保持像素颗粒感
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dith(x, y, t) { return t * 16 > BAYER[((y & 3) << 2) | (x & 3)] + 0.5; }

  // 分档渐变：stops 为等距色标，t∈[0,1]；每档后 35% 用抖动过渡到下一档
  function band(stops, t, x, y) {
    var n = stops.length - 1, fi = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(fi)), f = fi - i;
    if (n === 0) return hex(stops[0]);
    if (f > 0.65 && dith(x, y, (f - 0.65) / 0.35)) return hex(stops[i + 1]);
    return hex(stops[f > 0.999 ? i + 1 : i]);
  }

  // 整数哈希 → [-1, 1)：必须用 Math.imul 做 32 位乘法，普通乘法在 JS 里会超出双精度而退化成常数
  function hash(n) {
    n = (n << 13) ^ n;
    var t = (Math.imul(Math.imul(n, n), 15731) + 789221) | 0;
    t = (Math.imul(n, t) + 1376312589) & 0x7fffffff;
    return 1 - t / 1073741824;
  }
  function noise1(x, s) {
    var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return hash(i + s * 57) * (1 - u) + hash(i + 1 + s * 57) * u;
  }
  // 值噪声 [0, 1]
  function noise2(x, y, s) {
    var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    function h(a, b) { return hash(a * 131 + b * 4099 + s * 7919); }
    return ((h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v) * 0.5 + 0.5;
  }
  // 分形噪声 [0, 1]（集中在 0.5 附近）
  function fbm2(x, y, s) { return noise2(x, y, s) * 0.6 + noise2(x * 2.1, y * 2.1, s + 1) * 0.3 + noise2(x * 4.3, y * 4.3, s + 2) * 0.1; }

  // ========== 像素缓冲：直接写 ImageData（带 alpha 叠加）==========
  // 坐标 (x, y) → 缓冲 (x + ox, y + oy)；图层画布四周留视差边距时 ox = oy = m
  function Raster(w, h, ox, oy) {
    this.w = w; this.h = h;
    this.ox = ox || 0; this.oy = oy === undefined ? this.ox : oy;
    this.img = new ImageData(w, h);
    this.d = this.img.data;
  }
  Raster.prototype.clear = function () { this.d.fill(0); };
  Raster.prototype.px = function (x, y, c, a) {
    x = Math.round(x) + this.ox; y = Math.round(y) + this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    c = hex(c);
    var d = this.d, i = (y * this.w + x) * 4;
    if (a === undefined || a >= 1) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
    if (a <= 0) return;
    var da = d[i + 3] / 255, oa = a + da * (1 - a);
    d[i] = (c[0] * a + d[i] * da * (1 - a)) / oa;
    d[i + 1] = (c[1] * a + d[i + 1] * da * (1 - a)) / oa;
    d[i + 2] = (c[2] * a + d[i + 2] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  };
  Raster.prototype.get = function (x, y) {
    x = Math.round(x) + this.ox; y = Math.round(y) + this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    var i = (y * this.w + x) * 4;
    return this.d[i + 3] ? [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]] : null;
  };
  Raster.prototype.rect = function (x, y, w, h, c, a) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, c, a);
  };
  // 颜色参数可以是颜色，也可以是函数 (x, y) → 颜色 / [颜色, 透明度] / null
  Raster.prototype.fill = function (x, y, c) {
    if (typeof c !== 'function') return this.px(x, y, c);
    var v = c(x, y);
    if (!v) return;
    if (v.length === 2 && typeof v[1] === 'number' && (typeof v[0] === 'string' || v[0].length === 3)) this.px(x, y, v[0], v[1]);
    else this.px(x, y, v);
  };
  // 多边形（偶奇规则，按像素中心取样）
  Raster.prototype.poly = function (pts, c) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (var k = 0; k < pts.length; k++) {
      x0 = Math.min(x0, pts[k][0]); x1 = Math.max(x1, pts[k][0]); y0 = Math.min(y0, pts[k][1]); y1 = Math.max(y1, pts[k][1]);
    }
    for (var y = Math.floor(y0); y <= y1; y++) {
      var cy = y + 0.5, xs = [];
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var yi = pts[i][1], yj = pts[j][1];
        if ((yi > cy) !== (yj > cy)) xs.push(pts[i][0] + (pts[j][0] - pts[i][0]) * (cy - yi) / (yj - yi));
      }
      xs.sort(function (a, b) { return a - b; });
      for (var q = 0; q + 1 < xs.length; q += 2) {
        for (var x = Math.ceil(xs[q] - 0.5); x + 0.5 <= xs[q + 1]; x++) this.fill(x, y, c);
      }
    }
  };
  // 实心圆 / 椭圆：fn(x, y, dx, dy, d) → 颜色或 [颜色, 透明度] 或 null
  Raster.prototype.disc = function (cx, cy, r, fn) { this.ellipse(cx, cy, r, r, 0, fn); };
  Raster.prototype.ellipse = function (cx, cy, rx, ry, rot, fn) {
    var cr = Math.cos(rot || 0), sr = Math.sin(rot || 0), R = Math.max(rx, ry) + 1;
    for (var y = Math.floor(cy - R); y <= cy + R; y++) {
      for (var x = Math.floor(cx - R); x <= cx + R; x++) {
        var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        var u = (dx * cr + dy * sr) / rx, v = (-dx * sr + dy * cr) / ry, e = u * u + v * v;
        if (e > 1) continue;
        var val = typeof fn === 'function' ? fn(x, y, dx, dy, Math.sqrt(e)) : fn;
        if (!val) continue;
        if (val.length === 2 && typeof val[1] === 'number' && (typeof val[0] === 'string' || val[0].length === 3)) this.px(x, y, val[0], val[1]);
        else this.px(x, y, val);
      }
    }
  };
  // 抖动光晕：r0 → r1 由 amax 衰减到 0，量化成 3 档再抖动
  // 普通缓冲：逐像素的混合直接写在循环里（和 px 同一个公式、同样的越界判断；x / y 本来就是整数，不用取整），不再每个像素调一次 px；
  // px 被换掉的（比如 08-amphoreus 的 blockRaster，一个像素写成 k×k 一块）照旧调它自己的 px
  Raster.prototype.glow = function (cx, cy, r0, r1, c, amax, sy) {
    sy = sy || 1;
    var fast = this.px === Raster.prototype.px && this.d;
    var cc = hex(c), D = this.d, W = this.w, H = this.h, ox = this.ox, oy = this.oy;
    for (var y = Math.floor(cy - r1 * sy); y <= cy + r1 * sy; y++) {
      var ty = y + oy;
      for (var x = Math.floor(cx - r1); x <= cx + r1; x++) {
        var dx = x + 0.5 - cx, dy = (y + 0.5 - cy) / sy, dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < r0 || dd > r1) continue;
        var t = 1 - (dd - r0) / (r1 - r0);
        var v = t * t * 3, lv = Math.floor(v), f = v - lv;
        if (dith(x, y, f)) lv++;
        if (lv <= 0) continue;
        if (!fast) { this.px(x, y, c, amax * lv / 3); continue; }
        var tx = x + ox;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        var a = amax * lv / 3, o = (ty * W + tx) * 4;
        if (a >= 1) { D[o] = cc[0]; D[o + 1] = cc[1]; D[o + 2] = cc[2]; D[o + 3] = 255; continue; }
        if (a <= 0) continue;
        var da = D[o + 3] / 255, oa = a + da * (1 - a);
        D[o] = (cc[0] * a + D[o] * da * (1 - a)) / oa;
        D[o + 1] = (cc[1] * a + D[o + 1] * da * (1 - a)) / oa;
        D[o + 2] = (cc[2] * a + D[o + 2] * da * (1 - a)) / oa;
        D[o + 3] = oa * 255;
      }
    }
  };
  Raster.prototype.line = function (x0, y0, x1, y1, c, a) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
    for (var i = 0; i <= n; i++) this.px(x0 + (x1 - x0) * i / Math.max(1, n), y0 + (y1 - y0) * i / Math.max(1, n), c, a);
  };
  // 粗线段（两端粗细可不同，端头圆），用于手臂 / 腿 / 带子
  Raster.prototype.capsule = function (x0, y0, x1, y1, w0, w1, c) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    this.poly([[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], c);
    this.disc(x0, y0, w0 / 2, c);
    this.disc(x1, y1, w1 / 2, c);
  };
  // 把另一块缓冲贴上来（alpha 叠加），可垂直翻转、整体透明度、逐行透明度
  // 普通缓冲：逐像素的混合直接写在循环里（和 px 同一个公式、同样的取整和越界判断），不再每个像素建一个颜色数组、调一次 px；
  // px 被换掉的照旧逐像素调它自己的 px
  Raster.prototype.blit = function (src, dx, dy, alpha, flipY, rowAlpha) {
    alpha = alpha === undefined ? 1 : alpha;
    if (this.px !== Raster.prototype.px || !this.d) {
      for (var y2 = 0; y2 < src.h; y2++) {
        var sy2 = flipY ? src.h - 1 - y2 : y2, ra2 = rowAlpha ? rowAlpha(y2) : 1;
        if (ra2 <= 0) continue;
        for (var x2 = 0; x2 < src.w; x2++) {
          var i2 = (sy2 * src.w + x2) * 4, a2 = src.d[i2 + 3];
          if (!a2) continue;
          this.px(dx + x2, dy + y2, [src.d[i2], src.d[i2 + 1], src.d[i2 + 2]], a2 / 255 * alpha * ra2);
        }
      }
      return;
    }
    var D = this.d, W = this.w, H = this.h, ox = this.ox, oy = this.oy, S = src.d, sw = src.w;
    for (var y = 0; y < src.h; y++) {
      var sy = flipY ? src.h - 1 - y : y;
      var ra = rowAlpha ? rowAlpha(y) : 1;
      if (ra <= 0) continue;
      var ty = Math.round(dy + y) + oy;
      if (ty < 0 || ty >= H) continue;
      for (var x = 0; x < sw; x++) {
        var i = (sy * sw + x) * 4, sa = S[i + 3];
        if (!sa) continue;
        var tx = Math.round(dx + x) + ox;
        if (tx < 0 || tx >= W) continue;
        var a = sa / 255 * alpha * ra, o = (ty * W + tx) * 4;
        if (a >= 1) { D[o] = S[i]; D[o + 1] = S[i + 1]; D[o + 2] = S[i + 2]; D[o + 3] = 255; continue; }
        if (a <= 0) continue;
        var da = D[o + 3] / 255, oa = a + da * (1 - a);
        D[o] = (S[i] * a + D[o] * da * (1 - a)) / oa;
        D[o + 1] = (S[i + 1] * a + D[o + 1] * da * (1 - a)) / oa;
        D[o + 2] = (S[i + 2] * a + D[o + 2] * da * (1 - a)) / oa;
        D[o + 3] = oa * 255;
      }
    }
  };

  // 椭圆弧：绕 (cx, cy)，半轴 rx / ry，旋转 rot；只画 a0~a1 之间、且 keep(角度) 为真的部分；w 为线宽（可随角度变化）
  function arc(r, cx, cy, rx, ry, rot, a0, a1, c, alpha, keep, w) {
    var cr = Math.cos(rot), sr = Math.sin(rot);
    for (var a = a0; a <= a1; a += 0.5 / Math.max(rx, ry, 1)) {
      if (keep && !keep(a)) continue;
      var ww = typeof w === 'function' ? w(a) : (w || 1);
      for (var k = 0; k < ww; k++) {
        var ex = Math.cos(a) * (rx - k * 0.8), ey = Math.sin(a) * (ry - k * 0.8 * ry / rx);
        r.px(cx + ex * cr - ey * sr, cy + ex * sr + ey * cr, typeof c === 'function' ? c(a, k) : c, alpha);
      }
    }
  }

  // 3×5 像素字（招牌 / 门牌 / 编号用）：每个字 5 行，每行 3 位；M、W 在 3 位宽里分不清，给 5 位宽
  var FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
    F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101',
    L: '100100100100111', M: '1000111011101011000110001', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
    W: '1000110001101011010101010', X: '101101010101101', Y: '101101010010010',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001',
    5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
    '-': '000000111000000', '.': '000000000000010', '/': '001001010100100', ' ': '000000000000000'
  };
  function glyph(ch) { return FONT[ch] || FONT[' ']; }
  function textWidth(str, s) {
    var w = -1;
    for (var i = 0; i < str.length; i++) w += glyph(str[i]).length / 5 + 1;
    return w * (s || 1);
  }
  function drawText(r, x, y, str, c, s, a) {
    s = s || 1;
    for (var i = 0, cx = x; i < str.length; i++) {
      var gl = glyph(str[i]), gw = gl.length / 5;
      for (var k = 0; k < gl.length; k++) if (gl[k] === '1') r.rect(cx + (k % gw) * s, y + Math.floor(k / gw) * s, s, s, c, a);
      cx += (gw + 1) * s;
    }
  }

  function rotPt(p, cx, cy, ang) {
    var c = Math.cos(ang), s = Math.sin(ang), dx = p[0] - cx, dy = p[1] - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }

  PX.provide('01-core', { CABINS: CABINS, Raster: Raster, VIEWS: VIEWS, band: band, clamp: clamp, dith: dith,
    drawText: drawText, fbm2: fbm2, hash: hash, hex: hex, lerp: lerp, mix: mix, mulberry: mulberry, noise2: noise2,
    rotPt: rotPt, smooth: smooth, textWidth: textWidth });
})(window.__abPixel = window.__abPixel || {});
