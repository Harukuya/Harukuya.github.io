// About 页像素 Hero · 04b-atlas-px-kit：把分层素材版的零件「转成我们的画风」（现在用于翁法罗斯中间的光芒 08c-amphoreus-light-px；
// 整套 px 版挪到了 E:\fblog\窗外地标-备用版本\ 备用）
// 构图、角度、每个零件的位置和大小都和素材版一模一样（同一张贴图、同一个 rect、同一个取景 atlasFrame），只换画法：
//   · 先把贴图缩到要画的尺寸，亮度做一次 3×3 中值平滑（去掉照片式的细碎纹理，只留大的明暗）；
//   · 每个像素按颜色分到一种材质（白色船身 / 黑色船身 / 金 / 云 / 玻璃…，由各零件的 style.classify 决定），
//     亮度映射到这种材质的色阶上：平面块（默认）直接取最近的一档、不抖动，软的东西（云、光）档与档之间 Bayer 抖动；
//   · 边：硬零件的透明度一刀切（≥ 一半就画），明暗突变的地方（折角 / 接缝）暗的一侧压一道线，外轮廓压暗一档；
//     软零件（云 / 烟 / 光晕）的透明度分成几档再抖动，像我们画的光晕。
//   · 要画得平滑细腻的光（翁法罗斯的碎光、横向蓝光）：style.alphaSmooth 透明度连续、style.smoothRamp 颜色在档间连续插值，都不抖动；
//     style.fine 不做亮度中值（留住贴图里的细光丝）。
// 画的时候接受和素材版 atlasDraw 一样的 fx（dx / dy / wave / flow / time / offset / opacity / alpha / shade），所以各零件原来的动画照搬。
// 贴图自己再加载一份（和素材版同一个地址，浏览器缓存里取），不碰素材版的缓存。
(function (PX) {
  'use strict';

  PX.need('04b-atlas-px-kit', ['advectCells', 'advectPrep', 'advectSrc', 'band', 'clamp', 'dith', 'hex', 'mix']);
  var advectCells = PX.advectCells, advectPrep = PX.advectPrep, advectSrc = PX.advectSrc, band = PX.band, clamp = PX.clamp, dith = PX.dith, hex = PX.hex, mix = PX.mix;
  var imgs = {}, styled = {}, order = [];

  function pxAtlasLoad(names) {
    return Promise.all(names.map(function (name) {
      if (imgs[name]) return imgs[name].ready;
      var A = imgs[name] = { canvas: null };
      A.ready = new Promise(function (resolve) {
        var img = new window.Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          A.canvas = c;
          resolve();
        };
        img.onerror = function () { resolve(); };
        img.src = '/img/about-atlas/' + name + '.png';
      });
      return A.ready;
    }));
  }

  // 颜色 → 色相（度）/ 饱和度（0 ~ 1）/ 亮度（0 ~ 255）
  function hsl(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d > 0) {
      s = d / (255 - Math.abs(mx + mn - 255) || 1);
      h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  // 亮度 lum（0 ~ 255）在色阶 ramp 里的位置（0 ~ 1）：按各档颜色自己的亮度插值
  var lumCache = {};
  function rampPos(ramp, lum) {
    var key = ramp.join(','), ls = lumCache[key];
    if (!ls) {
      ls = lumCache[key] = ramp.map(function (c) { c = hex(c); return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; });
      for (var q = 1; q < ls.length; q++) ls[q] = Math.max(ls[q], ls[q - 1] + 0.01);
    }
    if (lum <= ls[0]) return 0;
    for (var i = 1; i < ls.length; i++) if (lum <= ls[i]) return (i - 1 + (lum - ls[i - 1]) / (ls[i] - ls[i - 1])) / (ls.length - 1);
    return 1;
  }

  // 去雾（style.sparks）：透明度做两遍盒式模糊（近似高斯）当「周围的平均」，只留高出它 thr 且够亮的像素
  // 透明度做两遍盒式模糊（近似高斯），半径 R（采样像素）
  function lowpass(alpha, w, h, R) {
    var tmp = new Float32Array(w * h), avg = new Float32Array(alpha), x, y;
    for (var pass = 0; pass < 2; pass++) {
      for (y = 0; y < h; y++) {
        var acc = 0, row = y * w;
        for (x = -R; x < w; x++) {
          if (x + R < w) acc += avg[row + x + R];
          if (x - R - 1 >= 0) acc -= avg[row + x - R - 1];
          if (x >= 0) tmp[row + x] = acc / (2 * R + 1);
        }
      }
      for (x = 0; x < w; x++) {
        var acc2 = 0;
        for (y = -R; y < h; y++) {
          if (y + R < h) acc2 += tmp[(y + R) * w + x];
          if (y - R - 1 >= 0) acc2 -= tmp[(y - R - 1) * w + x];
          if (y >= 0) avg[y * w + x] = acc2 / (2 * R + 1);
        }
      }
    }
    return avg;
  }
  // 去雾（style.sparks）：只留透明度高出「周围的平均」thr 且够亮的像素
  function keepSparks(S, alpha, on, L, w, h, scale) {
    var avg = lowpass(alpha, w, h, Math.max(1, Math.round(S.r * scale)));
    for (var k = 0; k < w * h; k++) {
      if (!on[k]) continue;
      if (alpha[k] - avg[k] < S.thr || L[k] < S.lum) { on[k] = 0; alpha[k] = 0; }
    }
  }
  // 只要雾（style.haze）：透明度模糊成平滑的一片，颜色按浓淡在色阶里连续插值（不分档、不抖动），画的时候透明度也不分档
  function hazePart(style, alpha, w, h, scale) {
    var S = style.haze, avg = lowpass(alpha, w, h, Math.max(1, Math.round(S.r * scale))), n = w * h, mx = 0, out = new Uint8ClampedArray(n * 4);
    var ramp = style.ramps.h.map(hex), last = ramp.length - 1;
    for (var k = 0; k < n; k++) if (avg[k] > mx) mx = avg[k];
    for (var i = 0; i < n; i++) {
      var a = Math.min(1, avg[i] * S.gain);
      if (a < 0.004) continue;
      var t = avg[i] / (mx || 1) * last, j = Math.min(last - 1, Math.floor(t)), c = mix(ramp[j], ramp[j + 1], t - j), o = i * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = Math.round(a * 255);
    }
    return { w: w, h: h, d: out, smooth: true };
  }
  function styledPart(name, w, h, style) {
    var key = name + ':' + w + 'x' + h + ':' + style.id;
    if (styled[key]) return styled[key];
    var A = imgs[name];
    if (!A || !A.canvas) return null;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(A.canvas, 0, 0, w, h);
    var src = ctx.getImageData(0, 0, w, h).data, n = w * h;
    var L = new Float32Array(n), on = new Uint8Array(n), alpha = new Float32Array(n), x, y, i;
    for (i = 0; i < n; i++) {
      var a = src[i * 4 + 3] / 255;
      alpha[i] = a;
      on[i] = style.soft ? (a > 0.04 ? 1 : 0) : (a >= 0.5 ? 1 : 0);
      if (a > 0) L[i] = src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11;   // ImageData 是非预乘的，颜色不用再除透明度
    }
    if (style.haze) {
      order.push(key);
      if (order.length > 48) delete styled[order.shift()];
      return (styled[key] = hazePart(style, alpha, w, h, w / A.canvas.width));
    }
    if (style.sparks) keepSparks(style.sparks, alpha, on, L, w, h, w / A.canvas.width);
    // 亮度 3×3 中值（只在不透明的像素之间取）
    var M = new Float32Array(n), win = [];
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        if (!on[i]) continue;
        if (style.fine) { M[i] = L[i]; continue; }   // 细的光（style.fine）：不做中值，留住细光丝
        win.length = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          var j = yy * w + xx;
          if (on[j]) win.push(L[j]);
        }
        win.sort(function (p, q) { return p - q; });
        M[i] = win[win.length >> 1];
      }
    }
    var out = new Uint8ClampedArray(n * 4), cls = new Array(n), dset = style.dither || [];
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        if (!on[i]) continue;
        var col = [src[i * 4], src[i * 4 + 1], src[i * 4 + 2]], H = hsl(col[0], col[1], col[2]);
        var k = style.classify(col, H, x / w, y / h), ramp = style.ramps[k], rg = (style.range && style.range[k]) || [0, 255];
        // 亮度按色阶里各档自己的亮度对上去（原图多亮，换过来的颜色就差不多多亮），range 可以整体提亮 / 压暗
        var t = rampPos(ramp, clamp((M[i] - rg[0]) / (rg[1] - rg[0]), 0, 1) * 255), cc;
        if (dset.indexOf(k) >= 0) cc = hex(band(ramp, t, x, y));
        else if (style.smoothRamp) {   // 颜色在相邻两档之间连续插值（不分档、不抖动）
          var rt = t * (ramp.length - 1), rj = Math.min(ramp.length - 2, Math.floor(rt));
          cc = mix(ramp[rj], ramp[rj + 1], rt - rj);
        } else cc = hex(ramp[Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1)))]);
        cls[i] = k;
        var o = i * 4;
        out[o] = cc[0]; out[o + 1] = cc[1]; out[o + 2] = cc[2];
        // 透明度：硬零件全不透明；软零件分 4 档、档间抖动
        if (style.alphaSmooth) out[o + 3] = Math.round(alpha[i] * 255);   // 透明度连续（不分档、不抖动）
        else if (style.soft) {
          var v = alpha[i] * 4, lv = Math.floor(v);
          if (dith(x, y, v - lv)) lv++;
          out[o + 3] = Math.min(4, lv) * 63.75;
        } else out[o + 3] = 255;
      }
    }
    // 折线：明暗突变处暗的那一侧压一道线；外轮廓压暗
    if (style.crease || style.rim) {
      var line = hex(style.line || '#0c0e16'), mark = new Uint8Array(n);
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          i = y * w + x;
          if (!on[i]) continue;
          var edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !on[i - 1] || !on[i + 1] || !on[i - w] || !on[i + w];
          if (edge && style.rim) { mark[i] = 2; continue; }
          if (!style.crease) continue;
          [[1, 0], [0, 1]].forEach(function (e) {
            var j2 = (y + e[1]) * w + x + e[0];
            if (x + e[0] >= w || y + e[1] >= h || !on[j2]) return;
            var dl = M[j2] - M[i];
            if (Math.abs(dl) > style.crease || (cls[j2] !== cls[i] && Math.abs(dl) > style.crease * 0.5)) mark[dl > 0 ? i : j2] = 1;
          });
        }
      }
      for (i = 0; i < n; i++) {
        if (!mark[i]) continue;
        var f = mark[i] === 1 ? 0.55 : style.rim, q = i * 4, mc = mix([out[q], out[q + 1], out[q + 2]], line, f);
        out[q] = mc[0]; out[q + 1] = mc[1]; out[q + 2] = mc[2];
      }
    }
    order.push(key);
    if (order.length > 48) delete styled[order.shift()];
    return (styled[key] = { w: w, h: h, d: out, smooth: !!style.alphaSmooth });
  }

  function pxAtlasPoint(F, x, y) { return [F.x + x * F.s, F.y + y * F.s]; }

  // 每行有东西（不透明）的最左、最右像素；空行记成 [w, -1]
  var ZERO = [0, 0];
  function rowSpans(A) {
    var w = A.w, h = A.h, d = A.d, rows = new Int32Array(h * 2);
    for (var y = 0; y < h; y++) {
      var a = w, b = -1;
      for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { if (x < a) a = x; b = x; }
      rows[2 * y] = a; rows[2 * y + 1] = b;
    }
    return rows;
  }

  // fx.cacheKey：这一笔逐像素都不随时间变（没有 advect / offset / flow / shade / opacity / wave），只有整体透明度 fx.alpha 会变——
  // 第一次把有东西的像素（位置、颜色、贴图透明度）按原来的扫描顺序记下来，之后每次只乘 fx.alpha、分档、再调 px。
  // 顺序、公式和逐像素现算完全一样，画出来一个字节都不差（见 04a 的同名开关）
  var prepared = {}, preparedOrder = [];
  function prepareStyled(fx, A, w, h, x0, y0, key) {
    if (prepared[key]) return prepared[key];
    var d = A.d, rows = A.rows || (A.rows = rowSpans(A)), list = [];
    for (var y = 0; y < h; y++) {
      var xb = Math.min(rows[2 * y + 1], w - 1);
      for (var x = rows[2 * y]; x <= xb; x++) {
        var i = (y * w + x) * 4, alpha = d[i + 3] / 255;
        if (!alpha) continue;
        list.push(x0 + x, y0 + y, d[i], d[i + 1], d[i + 2], alpha);
      }
    }
    preparedOrder.push(key);
    if (preparedOrder.length > 24) delete prepared[preparedOrder.shift()];
    return (prepared[key] = new Float64Array(list));
  }

  // 画一个零件：参数和素材版的 atlasDraw 一样，多一个 style
  function pxAtlasDraw(r, F, name, rect, style, fx) {
    var w = Math.max(1, Math.round(rect[2] * F.s)), h = Math.max(1, Math.round(rect[3] * F.s));
    var A = styledPart(name, w, h, style);
    if (!A) return;
    fx = fx || {};
    var at = pxAtlasPoint(F, rect[0], rect[1]);
    var x0 = Math.round(at[0] + (fx.dx || 0)), y0 = Math.round(at[1] + (fx.dy || 0)), d = A.d;
    if (fx.cacheKey) {
      var P = prepareStyled(fx, A, w, h, x0, y0, fx.cacheKey + '|' + name + '|' + w + 'x' + h + '|' + x0 + ',' + y0), n = P.length, fa = fx.alpha === undefined ? 1 : fx.alpha, c = [0, 0, 0];
      // 画到 08-amphoreus 的 blockRaster 上（一个像素写成 k×k 一块）：按它的 px 同一个算法直接写，不再每个像素调一次
      var blk = r.block, BD, BW, BH, K, BX, BY;
      if (blk) { BD = blk.d; BW = blk.w; BH = blk.h; K = blk.k; BX = blk.ox; BY = blk.oy; }
      for (var j = 0; j < n; j += 6) {
        var a = P[j + 5] * fa;
        if (a <= 0) continue;
        if (a < 1 && !A.smooth) a = Math.round(a * 8) / 8;
        if (!(a > 0)) continue;
        if (!blk) { c[0] = P[j + 2]; c[1] = P[j + 3]; c[2] = P[j + 4]; r.px(P[j], P[j + 1], c, a); continue; }
        var cr = P[j + 2], cg = P[j + 3], cb = P[j + 4], bx0 = P[j] * K + BX, by0 = P[j + 1] * K + BY, solid = a >= 1;
        for (var jj = 0; jj < K; jj++) {
          var yy = by0 + jj;
          if (yy < 0 || yy >= BH) continue;
          for (var ii = 0; ii < K; ii++) {
            var xx = bx0 + ii;
            if (xx < 0 || xx >= BW) continue;
            var o = (yy * BW + xx) * 4;
            if (solid) { BD[o] = cr; BD[o + 1] = cg; BD[o + 2] = cb; BD[o + 3] = 255; continue; }
            var da = BD[o + 3] / 255, oa = a + da * (1 - a);
            BD[o] = (cr * a + BD[o] * da * (1 - a)) / oa;
            BD[o + 1] = (cg * a + BD[o + 1] * da * (1 - a)) / oa;
            BD[o + 2] = (cb * a + BD[o + 2] * da * (1 - a)) / oa;
            BD[o + 3] = oa * 255;
          }
        }
      }
      return;
    }
    // fx.advect（见 03-advect）：物质沿方向流动；mix = 1 时透明度也跟着流，所以原本透明的像素也要算
    var adv = fx.advect ? advectPrep(fx.advect) : null, advAll = !!(adv && adv.mix === 1), cells = advAll ? advectCells(A, adv.len, adv) : null;
    var rows = A.rows || (A.rows = rowSpans(A)), rgb = [0, 0, 0];
    for (var y = 0; y < h; y++) {
      var shift = fx.wave ? Math.round(Math.sin(y * 0.09 + fx.time) * fx.wave) : 0;
      // 每行只扫有东西的那一段（透明度跟着流时，再并上这一行附近会流进东西的格子）
      var xa = rows[2 * y], xb = rows[2 * y + 1];
      if (advAll) { var ca = cells.span[2 * (y >> 3)], cb = cells.span[2 * (y >> 3) + 1]; if (cb >= ca) { xa = Math.min(xa, ca * 8); xb = Math.max(xb, cb * 8 + 7); } }
      if (xb > w - 1) xb = w - 1;
      for (var x = xa; x <= xb; x++) {
        var i = (y * w + x) * 4, alpha = d[i + 3] / 255;
        if (!alpha && (!advAll || !cells.on[(y >> 3) * cells.gw + (x >> 3)])) continue;
        var u = x / w, v = y / h, k = i;
        if (adv) {
          var src = advectSrc(adv, x, y, w, h);
          if (src !== -2) {
            var ma = src >= 0 ? d[src + 3] / 255 : 0;
            if (ma) k = src;
            alpha = alpha * (1 - adv.mix) + ma * adv.mix;
          }
          if (!alpha) continue;
        }
        var offset = fx.offset ? fx.offset(u, v) : ZERO;
        var px = x0 + x + shift + offset[0], py = y0 + y + offset[1];
        if (fx.flow) {
          var sx = clamp(x + Math.round(Math.sin(y * 0.17 + fx.time) * fx.flow), 0, w - 1), cand = (y * w + sx) * 4;
          if (d[cand + 3] > 80) k = cand;
        }
        var c = fx.shade ? [d[k], d[k + 1], d[k + 2]] : rgb;
        if (!fx.shade) { rgb[0] = d[k]; rgb[1] = d[k + 1]; rgb[2] = d[k + 2]; }
        if (fx.shade) c = fx.shade(c, u, v, px, py);
        if (fx.opacity) alpha *= fx.opacity(u, v);
        alpha *= fx.alpha === undefined ? 1 : fx.alpha;
        if (alpha <= 0) continue;
        // 整体半透明的零件（烟 / 光）：透明度也分档（每档 1/8），不出现连续的淡入淡出
        if (alpha < 1 && !A.smooth) alpha = Math.round(alpha * 8) / 8;
        if (alpha > 0) r.px(px, py, c, alpha);
      }
    }
  }

  // 取一个转好画风的零件（{ w, h, d }，d 为 RGBA）和它左上角在画面上的位置——要自己逐像素做动画的零件用（翁法罗斯的碎光）
  function pxAtlasStyled(F, name, rect, style) {
    var w = Math.max(1, Math.round(rect[2] * F.s)), h = Math.max(1, Math.round(rect[3] * F.s)), A = styledPart(name, w, h, style);
    if (!A) return null;
    var at = pxAtlasPoint(F, rect[0], rect[1]);
    return { A: A, x0: Math.round(at[0]), y0: Math.round(at[1]) };
  }

  PX.provide('04b-atlas-px-kit', { pxAtlasStyled: pxAtlasStyled, pxAtlasDraw: pxAtlasDraw, pxAtlasHsl: hsl, pxAtlasLoad: pxAtlasLoad, pxAtlasPoint: pxAtlasPoint });
})(window.__abPixel = window.__abPixel || {});
