// Luofu: engraved bow, jade deck, dark hull and enclosing stern.
(function (PX) {
  'use strict';
  PX.need('07a-xianzhou-body', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  function xianzhouBody(r, F, t) {
    atlasDraw(r, F, 'luofu-body', [0, 0, 1000, 500], {
      detail: !!F.detail,
      shade: function (c, u, v) {
        var jade = c[1] > c[0] * 1.08 && c[1] > c[2] * 0.98;
        var bright = Math.min(c[0], c[1], c[2]) > 150;
        var flow = Math.pow(Math.max(0, Math.sin(u * 20 - v * 7 - t * 0.9)), 6);
        return mix(c, bright ? '#effff2' : '#aaffd4', (bright ? 0.12 : jade ? 0.1 : 0) * flow);
      }
    });
  }
  // Bloom follows the actual deck pools and luminous arc, not the dark hull.
  var pools = [[394, 290, 30, 13], [571, 264, 44, 20], [641, 214, 40, 17],
    [759, 232, 35, 18], [740, 185, 48, 21], [839, 120, 32, 14], [843, 81, 27, 13]];
  var arc = [[145, 56], [161, 79], [171, 105], [172, 131], [164, 157]];
  // Reference-space translation shared by the silver ornament and its bloom.
  var ribbonOffset = [144.48, 30.92];
  function bloom(r, F, x, y, rx, ry, alpha, colour) {
    var cx = F.x + x * F.s, cy = F.y + y * F.s;
    rx *= F.s; ry *= F.s;
    for (var py = Math.floor(cy - ry); py <= cy + ry; py++) {
      for (var px = Math.floor(cx - rx); px <= cx + rx; px++) {
        var q = Math.pow((px + 0.5 - cx) / rx, 2) + Math.pow((py + 0.5 - cy) / ry, 2);
        if (q < 1) r.px(px, py, colour || '#c4ffe3', alpha * (Math.exp(-q * 4) - Math.exp(-4)));
      }
    }
  }
  function xianzhouGlow(r, F, t) {
    var breath = 0.95 + 0.05 * Math.sin(t * Math.PI * 2 / 7);
    pools.forEach(function (p) {
      bloom(r, F, p[0], p[1], p[2] * 2.7, p[3] * 2.7, 0.38 * breath);
      bloom(r, F, p[0], p[1], p[2], p[3], 0.50 * breath, '#f0fff5');
    });
    arc.forEach(function (p) {
      bloom(r, F, 330 + p[0] / 256 * 680 + ribbonOffset[0],
        -40 + p[1] / 256 * 540 + ribbonOffset[1], 38, 56, 0.28 * breath);
    });
  }
  PX.provide('07a-xianzhou-body', { xianzhouBody: xianzhouBody, xianzhouGlow: xianzhouGlow,
    xianzhouRibbonOffset: ribbonOffset });
})(window.__abPixel = window.__abPixel || {});
