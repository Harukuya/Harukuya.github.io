// Luofu: rear silver crossing, second stern arc and drifting smoke material.
(function (PX) {
  'use strict';
  PX.need('07d-xianzhou-detail', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  // The atlas packs the rear arc and horizontal rail together; their projected
  // positions differ in the reference camera, so place the two silhouettes separately.
  var arcPath = [[0, 164], [16, 166], [24, 162], [32, 150], [40, 144], [48, 138],
    [56, 135], [64, 132], [80, 130], [96, 131], [112, 136], [128, 143]];
  function arcEnvelope(u, v) {
    var y = v * 128, x = 143;
    for (var i = 1; i < arcPath.length; i++) {
      var a = arcPath[i - 1], b = arcPath[i];
      if (y > b[0]) continue;
      x = a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
      break;
    }
    return Math.abs(u * 256 - x) <= (y < 28 ? 12 : 9) ? 1 : 0;
  }
  // Trace only the arc through the packed rail crossing.
  var crossingEdges = [[48, 134, 143], [52, 132, 141], [56, 130, 139],
    [60, 129, 138], [64, 128, 137], [68, 127, 136], [72, 126, 136]];
  function arcMask(u, v) {
    var x = u * 256, y = v * 128;
    if (y < 48 || y > 72) return arcEnvelope(u, v);
    for (var i = 1; i < crossingEdges.length; i++) {
      var a = crossingEdges[i - 1], b = crossingEdges[i];
      if (y > b[0]) continue;
      var f = (y - a[0]) / (b[0] - a[0]);
      return x >= a[1] + (b[1] - a[1]) * f && x <= a[2] + (b[2] - a[2]) * f ? 1 : 0;
    }
    return 0;
  }
  var railEdges = [[118, 61.5, 68], [124, 59.3, 67], [132, 57.5, 66],
    [140, 56, 64], [148, 54, 63], [160, 53, 61], [168, 52, 60], [176, 52, 59]];
  function railMask(u, v) {
    var x = u * 256, y = v * 128;
    if (x < 118 || x > 176) return 1;
    for (var i = 1; i < railEdges.length; i++) {
      var a = railEdges[i - 1], b = railEdges[i];
      if (x > b[0]) continue;
      var f = (x - a[0]) / (b[0] - a[0]);
      var top = a[1] + (b[1] - a[1]) * f, bottom = a[2] + (b[2] - a[2]) * f;
      return Math.max(0, Math.min(1, (y - top + 0.5) / 1.5, (bottom - y + 0.5) / 1.5));
    }
    return 0;
  }
  var detailParts = [
    { name: 'luofu-detail', rect: [260, 65, 600, 250], opacity: railMask },
    { name: 'luofu-detail', rect: [130, 20, 600, 280], opacity: arcMask }
  ];
  function xianzhouDetail(r, F, t) {
    detailParts.forEach(function (part) {
      atlasDraw(r, F, part.name, part.rect, {
        detail: !!F.detail,
        opacity: part.opacity,
        shade: function (c, u, v) {
          // Restore the rail material under the source arc, instead of cutting
          // out the shared pixels and turning one long ornament into two stubs.
          if (part === detailParts[0]) {
            var x = u * 256, fill = Math.max(0, Math.min(1, (x - 124) / 4, (142 - x) / 4));
            if (fill) c = mix(c, '#7c878b', fill);
          }
          return mix(c, '#e7ffef', Math.pow(Math.max(0, Math.sin(u * 7 + v * 6 - t * 0.4)), 10) * 0.14);
        }
      });
    });
    atlasDraw(r, F, 'luofu-smoke', [555, -100, 480, 360], {
      detail: !!F.detail,
      wave: Math.max(F.pixelDensity || 1, F.s * 4), flow: 3, time: t * 0.25,
      dx: Math.sin(t * 0.24) * F.s * 12, alpha: 0.26,
      shade: function (c) { return mix(c, '#b1f4d3', 0.3); }
    });
  }
  PX.provide('07d-xianzhou-detail', { xianzhouDetail: xianzhouDetail, xianzhouDetailParts: detailParts });
})(window.__abPixel = window.__abPixel || {});
