// Optional cel-pixel paint pass. Geometry, alpha, camera and animation stay upstream.
(function (PX) {
  'use strict';
  PX.need('04b-cabin-paint', ['clamp', 'dith', 'hex', 'mix']);
  var clamp = PX.clamp, dith = PX.dith, hex = PX.hex, mix = PX.mix;
  var ramps = [
    // Silver/graphite steps follow the legacy station's WHITE and DARK2 materials.
    ['#10162e', '#353b4b', '#6e7a98', '#98a4bd', '#c2cbdb', '#f6f8fc'],
    ['#101e2e', '#234b55', '#367e79', '#62b398', '#a5dec5', '#e6fff0'],
    ['#17182e', '#514256', '#87676c', '#bd9568', '#eac779', '#fff1b8'],
    ['#10162e', '#243867', '#3b61a4', '#6694d9', '#a7d6fa', '#e7faff'],
    ['#16152e', '#3e326b', '#7654a0', '#b17bc4', '#deb5e8', '#fff0fc']
  ];
  var cuts = [28, 68, 112, 160, 206], palettes = {};

  function palette(cabin) {
    var key = cabin.gap + ':' + cabin.wallLine;
    if (palettes[key]) return palettes[key];
    var ink = mix(cabin.gap, '#10162e', 0.4);
    return (palettes[key] = ramps.map(function (ramp) {
      return ramp.map(function (c, level) {
        var rgb = level === 0 ? ink : level < 3 ? mix(c, cabin.wallLine, 0.1) : hex(c);
        return rgb.map(Math.round);
      });
    }));
  }

  function family(red, green, blue) {
    var hi = Math.max(red, green, blue), lo = Math.min(red, green, blue);
    if (hi - lo < 20 || (hi - lo) / Math.max(1, hi) < 0.14) return 0;
    if (green > red + 10 && green > blue - 4) return 1;
    if (red > blue + 17 && green > blue + 8) return 2;
    if (red > green + 8 && blue > green + 10) return 4;
    if (blue > red + 10 || (green > red + 10 && blue > red + 10)) return 3;
    return 0;
  }

  function shade(value, x, y) {
    var level = 0;
    for (var i = 0; i < cuts.length; i++) {
      // Dither only within a narrow transition band, like the cabin's band().
      if (value > cuts[i] + 3) level++;
      else if (value >= cuts[i] - 3) {
        if (dith(x, y, (value - cuts[i] + 3) / 6)) level++;
        break;
      } else break;
    }
    return level;
  }

  function paintViewCabin(r, cabin) {
    var n = r.w * r.h, d = r.d, S = r.cabinPaint;
    if (!S || S.raw.length !== d.length) {
      S = r.cabinPaint = { raw: new Uint8ClampedArray(d.length), hue: new Uint8Array(n),
        light: new Uint8Array(n), level: new Uint8Array(n) };
    }
    var raw = S.raw, hue = S.hue, light = S.light, level = S.level, colours = palette(cabin), w = r.w;
    raw.set(d);
    for (var i = 0; i < n; i++) {
      var p = i * 4;
      if (!raw[p + 3]) continue;
      hue[i] = family(raw[p], raw[p + 1], raw[p + 2]);
      light[i] = Math.round(raw[p] * 0.3 + raw[p + 1] * 0.59 + raw[p + 2] * 0.11);
    }
    // Merge low-contrast microtexture within one material, never across a seam.
    for (var y = 0; y < r.h; y++) for (var x = 0; x < w; x++) {
      var at = y * w + x, a = raw[at * 4 + 3];
      if (!a) continue;
      var sum = light[at] * 3, weight = 3;
      if (a > 160) {
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= r.h) continue;
          var near = at + dy * w + dx;
          if (raw[near * 4 + 3] < 160 || hue[near] !== hue[at] || Math.abs(light[near] - light[at]) > 42) continue;
          var k = dx && dy ? 1 : 2;
          sum += light[near] * k; weight += k;
        }
      }
      level[at] = shade(sum / weight, x - r.ox, y - r.oy);
    }
    for (var yy = 0; yy < r.h; yy++) for (var xx = 0; xx < w; xx++) {
      var index = yy * w + xx, offset = index * 4;
      if (!raw[offset + 3]) continue;
      var tone = level[index];
      if (raw[offset + 3] > 180 && xx > 0 && xx + 1 < w && yy > 0 && yy + 1 < r.h) {
        var up = index - w, left = index - 1, right = index + 1, down = index + w;
        var U = raw[up * 4 + 3] > 160, L = raw[left * 4 + 3] > 160;
        var R = raw[right * 4 + 3] > 160, D = raw[down * 4 + 3] > 160;
        // One-pixel selective contours stay INSIDE the original silhouette.
        // Thin antennae, rails and emitting star rays are not outlined away.
        if (U + L + R + D >= 3 && tone < 5) {
          if ((!D || !R) && tone > 1) tone--;
          else if ((!U || !L) && tone > 2) tone++;
          else if (D && level[down] + 2 < tone && hue[index] !== hue[down]) tone--;
        }
      }
      var c = colours[hue[index]][clamp(tone, 0, 5)];
      d[offset] = c[0]; d[offset + 1] = c[1]; d[offset + 2] = c[2];
      // No alpha writes: fitting, occlusion and every transparent hole are identical.
    }
  }

  PX.provide('04b-cabin-paint', { paintViewCabin: paintViewCabin });
})(window.__abPixel = window.__abPixel || {});
