// About 页像素 Hero · 03-advect：贴图里的「物质沿某个方向流动」（flowmap 的做法），给 04a / 04b 两套贴图绘制用（fx.advect）
// 每个像素沿流向往回（上游）取样：位移 = 流向 × len × 相位；相位随时间从 0 走到 1 再跳回 0。两套相位差半个周期，
// 按「离跳回那一刻多远」加权，用 Bayer 抖动在两套之间交叉淡化（像素画的做法，不出现半透明混色）——所以纹理一直往前流、看不出跳回。
// A = { mode, len（一个周期里的位移，采样像素）, phase（周期数，t / 周期）, mix（0 = 轮廓不动只流颜色，1 = 连透明度一起流）,
//       rmax（radial 可选：只在离中心这么远以内流动，外圈照原样画，省计算） }
//   mode 'radial'：从 (cx, cy)（采样像素）往外；'axisX'：以 x = cx 为界往左右两边；
//   'field'：按一张方向场流（field = Float32Array，gw × gh 格，每格一个单位向量 [dx, dy]，覆盖整张采样图）
(function (PX) {
  'use strict';

  PX.need('03-advect', ['dith']);
  var dith = PX.dith;

  function frac(v) { return v - Math.floor(v); }

  // 每次绘制前算一次：两套相位的位移、交叉淡化的权重（放在 A 身上，逐像素时直接用）
  function advectPrep(A) {
    var pa = frac(A.phase), pb = frac(pa + 0.5);
    A.la = A.len * pa; A.lb = A.len * pb; A.wa = 1 - Math.abs(1 - 2 * pa);
    A.r2 = A.rmax ? A.rmax * A.rmax : Infinity;
    return A;
  }
  // 返回 (x, y) 这一格该取的源像素下标（RGBA 数组里的偏移）；出界返回 -1；
  // radial 模式超出 rmax（不流动的外圈）返回 -2 = 照原样取自己这一格
  function advectSrc(A, x, y, w, h) {
    var dx, dy;
    if (A.mode === 'radial') {
      dx = x - A.cx; dy = y - A.cy;
      var l2 = dx * dx + dy * dy;
      if (l2 > A.r2) return -2;
      var il = 1 / (Math.sqrt(l2) || 1);
      dx *= il; dy *= il;
    } else if (A.mode === 'axisX') {
      dx = x < A.cx ? -1 : 1; dy = 0;
    } else {
      var gx = Math.min(A.gw - 1, (x / w * A.gw) | 0), gy = Math.min(A.gh - 1, (y / h * A.gh) | 0), gi = (gy * A.gw + gx) * 2;
      dx = A.field[gi]; dy = A.field[gi + 1];
    }
    var l = dith(x, y, A.wa) ? A.la : A.lb;
    var sx = Math.round(x - dx * l), sy = Math.round(y - dy * l);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return -1;
    return (sy * w + sx) * 4;
  }

  // 透明度也跟着流（mix = 1）时要逐像素取样，大片空白很费；按 8×8 的格子标出「附近 len 像素内有东西」的格子，其余直接跳过。
  // img = 采样图 { w, h, d }，结果缓存在它身上（同一张图、同一个 len 只算一次）
  function advectCells(img, len, A) {
    var key = Math.round(len) + ':' + (A && A.mode === 'radial' ? [Math.round(A.cx), Math.round(A.cy), Math.round(A.rmax || 0)].join(',') : '');
    if (img.advCells && img.advCells.key === key) return img.advCells;
    var w = img.w, h = img.h, gw = (w + 7) >> 3, gh = (h + 7) >> 3, has = new Uint8Array(gw * gh), on = new Uint8Array(gw * gh), d = img.d;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) has[(y >> 3) * gw + (x >> 3)] = 1;
    var rr = Math.ceil(len / 8) + 1;
    function mark(qx, qy, q) {
      for (var yy = Math.max(0, qy - q); yy <= Math.min(gh - 1, qy + q); yy++) for (var xx = Math.max(0, qx - q); xx <= Math.min(gw - 1, qx + q); xx++) on[yy * gw + xx] = 1;
    }
    for (var cy = 0; cy < gh; cy++) for (var cx = 0; cx < gw; cx++) {
      if (!has[cy * gw + cx]) continue;
      if (A && A.mode === 'radial') {
        // 往外流：东西只会流到它外侧那一条上，沿着往外的方向走 len 远；格子里各点的方向和格子中心的方向差一点，
        // 离中心越近差得越多，所以两边留的宽度按距离放宽（贴着中心的格子等于四面都留）
        var ox = cx * 8 + 4 - A.cx, oy = cy * 8 + 4 - A.cy, ol = Math.sqrt(ox * ox + oy * oy) || 1;
        var q = Math.min(rr, 1 + Math.ceil((len + 8) * 6 / ol / 8));
        for (var st = 0; st <= len + 8; st += 4) mark(((cx * 8 + 4 + ox / ol * st) >> 3), ((cy * 8 + 4 + oy / ol * st) >> 3), q);
        continue;
      }
      for (var yy = Math.max(0, cy - rr); yy <= Math.min(gh - 1, cy + rr); yy++) for (var xx = Math.max(0, cx - rr); xx <= Math.min(gw - 1, cx + rr); xx++) on[yy * gw + xx] = 1;
    }
    if (A && A.rmax) {
      var lim = A.rmax + 12;
      for (var qy = 0; qy < gh; qy++) for (var qx = 0; qx < gw; qx++) if (Math.hypot(qx * 8 + 4 - A.cx, qy * 8 + 4 - A.cy) > lim) on[qy * gw + qx] = 0;
    }
    // 每一行格子里最左、最右的「要算」的格子（空行记成 [gw, -1]）
    var span = new Int32Array(gh * 2);
    for (var ry = 0; ry < gh; ry++) {
      var a = gw, b = -1;
      for (var rx = 0; rx < gw; rx++) if (on[ry * gw + rx]) { if (rx < a) a = rx; b = rx; }
      span[2 * ry] = a; span[2 * ry + 1] = b;
    }
    return (img.advCells = { key: key, gw: gw, on: on, span: span });
  }

  // 沿一条折线（贴图坐标，从上游到下游）建方向场：每格取离它最近的那一段的走向（段与段之间按投影位置插值，转弯处连续）
  function advectField(pts, texW, texH, gw, gh) {
    var field = new Float32Array(gw * gh * 2), segs = [];
    for (var i = 0; i + 1 < pts.length; i++) {
      var ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1], L = Math.hypot(bx - ax, by - ay) || 1;
      segs.push({ ax: ax, ay: ay, dx: (bx - ax) / L, dy: (by - ay) / L, L: L });
    }
    for (var gy = 0; gy < gh; gy++) {
      for (var gx = 0; gx < gw; gx++) {
        var px = (gx + 0.5) / gw * texW, py = (gy + 0.5) / gh * texH, best = Infinity, bi = 0, bt = 0;
        segs.forEach(function (S, k) {
          var t = Math.max(0, Math.min(S.L, (px - S.ax) * S.dx + (py - S.ay) * S.dy));
          var qx = S.ax + S.dx * t - px, qy = S.ay + S.dy * t - py, d2 = qx * qx + qy * qy;
          if (d2 < best) { best = d2; bi = k; bt = t / S.L; }
        });
        // 段中间用本段方向；靠两端和相邻段的方向平均，转弯处不突变
        var S0 = segs[bi], S1 = bt > 0.5 ? segs[Math.min(segs.length - 1, bi + 1)] : segs[Math.max(0, bi - 1)], f = Math.abs(bt - 0.5);
        var vx = S0.dx * (1 - f) + S1.dx * f, vy = S0.dy * (1 - f) + S1.dy * f, vl = Math.hypot(vx, vy) || 1;
        field[(gy * gw + gx) * 2] = vx / vl; field[(gy * gw + gx) * 2 + 1] = vy / vl;
      }
    }
    return field;
  }

  PX.provide('03-advect', { advectCells: advectCells, advectField: advectField, advectPrep: advectPrep, advectSrc: advectSrc });
})(window.__abPixel = window.__abPixel || {});
