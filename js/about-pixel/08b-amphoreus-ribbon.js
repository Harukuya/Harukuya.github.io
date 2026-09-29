// Amphoreus: broad asymmetric folded ribbon with authored broken tips.
(function (PX) {
  'use strict';
  PX.need('08b-amphoreus-ribbon', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  function amphoreusRibbon(r, F, t) {
    atlasDraw(r, F, 'amphoreus-ribbon', [0, 0, 1000, 520], {
      detail: !!F.detail,
      offset: function (u, v) {
        // The lower sweep is continuous; only the detached upper tips drift.
        if (u < 0.74 || v > 0.22) return [0, 0];
        var fragment = Math.floor(u * 16), amplitude = Math.max(0.6 * (F.pixelDensity || 1), F.s * 3);
        return [Math.sin(t * 0.45 + fragment) * amplitude, Math.cos(t * 0.35 + fragment) * amplitude * 0.7];
      },
      shade: function (c, u, v) {
        var sheen = Math.pow(Math.max(0, Math.sin(u * 13 - v * 5 - t * 0.65)), 9);
        return mix(c, '#b2eaff', sheen * 0.3);
      }
    });
  }
  PX.provide('08b-amphoreus-ribbon', { amphoreusRibbon: amphoreusRibbon });
})(window.__abPixel = window.__abPixel || {});
