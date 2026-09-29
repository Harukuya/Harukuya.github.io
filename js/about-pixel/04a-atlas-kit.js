// Fixed-view atlas parts, sampled onto the existing pixel grid. Local assets only.
(function (PX) {
  'use strict';
  PX.need('04a-atlas-kit', ['advectCells', 'advectPrep', 'advectSrc', 'clamp']);
  var advectCells = PX.advectCells, advectPrep = PX.advectPrep, advectSrc = PX.advectSrc, clamp = PX.clamp, assets = {}, fits = {};

  function atlasLoad(names) {
    return Promise.all(names.map(function (name) {
      if (assets[name]) return assets[name].ready;
      var A = assets[name] = { pixels: null, samples: {} };
      A.ready = new Promise(function (resolve) {
        var img = new window.Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          var ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          A.canvas = c; A.w = c.width; A.h = c.height;
          A.pixels = ctx.getImageData(0, 0, A.w, A.h).data;
          resolve();
        };
        img.onerror = function () {
          console.error('about-pixel: atlas asset unavailable: ' + name);
          resolve();
        };
        img.src = '/img/about-atlas/' + name + '.png';
      });
      return A.ready;
    }));
  }

  function atlasSample(name, w, h, detail, direct) {
    var A = assets[name];
    if (!A || !A.pixels) return null;
    var key = w + 'x' + h + (direct ? ':raw' : detail ? ':detail' : '');
    if (A.samples[key]) return A.samples[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    if (detail || direct) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(A.canvas, 0, 0, w, h);
    var d = ctx.getImageData(0, 0, w, h).data;
    var original = detail && !direct ? d.slice() : null;
    // Direct sampling retains the source RGBA without the pixel-art paint pass.
    for (var i = 0; !direct && i < d.length; i += 4) {
      if (d[i + 3] < 28) { d[i + 3] = 0; continue; }
      // Keep solid colour clusters instead of photographic microdetail.
      // Sharpen opaque material interiors without pulling hidden RGB into alpha edges.
      if (detail && original[i + 3] > 210 && i >= w * 4 && i < (h - 1) * w * 4 &&
          i % (w * 4) >= 4 && i % (w * 4) < (w - 1) * 4 &&
          original[i - 1] > 210 && original[i + 7] > 210 && original[i - w * 4 + 3] > 210 && original[i + w * 4 + 3] > 210) {
        for (var k = 0; k < 3; k++) {
          var mean = (original[i - 4 + k] + original[i + 4 + k] + original[i - w * 4 + k] + original[i + w * 4 + k]) / 4;
          d[i + k] = clamp(original[i + k] + (original[i + k] - mean) * 0.55, 0, 255);
        }
      }
      var l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      var step = detail ? 8 : 16;
      for (var j = 0; j < 3; j++) {
        var v = (l + (d[i + j] - l) * 1.12 - 96) * 1.06 + 96;
        d[i + j] = clamp(Math.round(v / step) * step, 0, 255);
      }
      var alphaStep = detail ? 17 : 51;
      d[i + 3] = Math.round(d[i + 3] / alphaStep) * alphaStep;
    }
    // Pulsing flares use a small set of sizes; retain them without unbounded growth.
    var keys = Object.keys(A.samples);
    if (keys.length >= 32) delete A.samples[keys[0]];
    return (A.samples[key] = { w: w, h: h, d: d });
  }

  function atlasPoint(F, x, y) { return [F.x + x * F.s, F.y + y * F.s]; }

  function atlasDraw(r, F, name, rect, fx) {
    fx = fx || {};
    var w = Math.max(1, Math.round(rect[2] * F.s)), h = Math.max(1, Math.round(rect[3] * F.s));
    var A = atlasSample(name, w, h, fx.detail, fx.direct);
    if (!A) return;
    var at = atlasPoint(F, rect[0], rect[1]);
    var x0 = Math.round(at[0] + (fx.dx || 0)), y0 = Math.round(at[1] + (fx.dy || 0)), d = A.d;
    // fx.advect（见 03-advect）：物质沿方向流动；mix = 1 时透明度也跟着流，所以原本透明的像素也要算
    var adv = fx.advect ? advectPrep(fx.advect) : null, advAll = !!(adv && adv.mix === 1), cells = advAll ? advectCells(A, adv.len, adv) : null;
    for (var y = 0; y < h; y++) {
      var shift = fx.wave ? Math.round(Math.sin(y * 0.09 + fx.time) * fx.wave) : 0;
      for (var x = 0; x < w; x++) {
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
        var offset = fx.offset ? fx.offset(u, v) : [0, 0];
        var px = x0 + x + shift + offset[0], py = y0 + y + offset[1];
        // Flow changes texture inside the stable silhouette, not camera orientation.
        if (fx.flow && (!fx.flowMask || fx.flowMask(u, v, [d[i], d[i + 1], d[i + 2]]))) {
          var sx = clamp(x + Math.round(Math.sin(y * 0.17 + fx.time) * fx.flow), 0, w - 1);
          var candidate = (y * w + sx) * 4;
          if (d[candidate + 3] > 80 && (!fx.flowMask || fx.flowMask(sx / w, v,
            [d[candidate], d[candidate + 1], d[candidate + 2]]))) k = candidate;
        }
        var c = [d[k], d[k + 1], d[k + 2]];
        if (fx.shade) c = fx.shade(c, u, v, px, py);
        if (fx.opacity) alpha *= fx.opacity(u, v);
        alpha *= fx.alpha === undefined ? 1 : fx.alpha;
        r.px(px, py, c, alpha);
      }
    }
  }

  // Fit opaque silhouettes, excluding transparent PNG margins and peripheral glow.
  function atlasFrame(g, name, parts, opts) {
    var key = name + ':' + g.W + 'x' + g.H + ':' + g.portrait;
    if (fits[key]) { g.atlasFit = fits[key]; return fits[key]; }
    var points = [], x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    function add(x, y) {
      points.push([x, y]);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    for (var p = 0; p < parts.length; p++) {
      var part = parts[p], A = assets[part.name], R = part.rect;
      if (part.disc) {
        for (var dy = -part.disc[2]; dy <= part.disc[2]; dy += 12) {
          for (var dx = -part.disc[2]; dx <= part.disc[2]; dx += 12) {
            if (dx * dx + dy * dy <= part.disc[2] * part.disc[2]) add(part.disc[0] + dx, part.disc[1] + dy);
          }
        }
        continue;
      }
      if (!A || !A.pixels) return null;
      for (var y = 0; y < A.h; y += 4) for (var x = 0; x < A.w; x += 4) {
        if (part.opacity && !part.opacity(x / A.w, y / A.h)) continue;
        if (A.pixels[(y * A.w + x) * 4 + 3] > 100) add(R[0] + x / A.w * R[2], R[1] + y / A.h * R[3]);
      }
    }
    if (!points.length) return null;
    // The window mask, not the viewport or foreground actors, defines the anchor.
    var wx = 0, wy = 0, area = 0;
    for (var py = 1; py < g.H; py += 2) for (var px = 1; px < g.W; px += 2) {
      if (!g.inWin(px, py)) continue;
      wx += px; wy += py; area++;
    }
    var cx = wx / area, cy = wy / area;
    var anchor = opts.anchor || [(x0 + x1) * 0.5, (y0 + y1) * 0.5];
    var base = opts.tall ? g.H * 0.82 / (y1 - y0) : Math.min(g.W * (g.portrait ? 1.1 : 0.87), g.H * 1.65) / (x1 - x0);
    function frame(scale) {
      return { x: cx - anchor[0] * scale, y: cy - anchor[1] * scale, s: scale };
    }
    function visible(F) {
      var count = 0;
      points.forEach(function (pt) {
        var x = F.x + pt[0] * F.s, y = F.y + pt[1] * F.s;
        if (x >= 0 && y >= 0 && x < g.W && y < g.H && g.inWin(x, y)) count++;
      });
      return count / points.length;
    }
    function landmarks(F) {
      return (opts.keep || []).every(function (pt) {
        var x = F.x + pt[0] * F.s, y = F.y + pt[1] * F.s;
        return x >= 2 && y >= 2 && x < g.W - 2 && g.inWin(x + 2, y + 2);
      });
    }
    var lo = base * 0.1, hi = base * 3;
    for (var n = 0; n < 16; n++) {
      var mid = (lo + hi) * 0.5;
      var target = opts.visible || 0.8;
      if (visible(frame(mid)) > target && landmarks(frame(mid))) lo = mid; else hi = mid;
    }
    var F = frame(lo * (opts.zoom || 1));
    F.center = [cx, cy]; F.anchor = anchor;
    F.visible = visible(F); F.scene = name;
    fits[key] = F; g.atlasFit = F;
    return F;
  }

  PX.provide('04a-atlas-kit', { atlasDraw: atlasDraw, atlasFrame: atlasFrame, atlasLoad: atlasLoad, atlasPoint: atlasPoint });
})(window.__abPixel = window.__abPixel || {});
