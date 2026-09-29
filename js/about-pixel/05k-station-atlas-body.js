// Preserve the source camera and hull silhouette; only surface light changes.
(function (PX) {
  'use strict';
  PX.need('05k-station-atlas-body', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  function stationAtlasBody(r, F, t) {
    atlasDraw(r, F, 'station-body', [0, 0, 512, 512], {
      detail: !!F.detail,
      shade: function (c, u, v) {
        if (u > 0.85 && v > 0.73 && c[2] > c[0] * 1.2) {
          return mix(c, '#d6ffff', 0.08 + 0.07 * Math.sin(t * 1.1 - u * 24));
        }
        if (c[0] > 96 && c[0] > c[2] * 1.35 && v > 0.4) {
          return mix(c, '#fff3bf', 0.08 + 0.07 * Math.sin(t * 0.85 + u * 28 + v * 13));
        }
        return c;
      }
    });
  }
  PX.provide('05k-station-atlas-body', { stationAtlasBody: stationAtlasBody });
})(window.__abPixel = window.__abPixel || {});
