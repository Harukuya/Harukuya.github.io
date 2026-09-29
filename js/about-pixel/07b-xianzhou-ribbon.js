// Luofu: silver foreground ribbon and ascending stern arc.
(function (PX) {
  'use strict';
  PX.need('07b-xianzhou-ribbon', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  var goldOffset = ((130 + 167 / 256 * 600) + (330 + 125.5 / 256 * 680)) / 2 - (330 + 87.5 / 256 * 680);
  function goldMask(u, v) { return u * 256 >= 76 && u * 256 <= 98 && v * 256 <= 52; }
  function ribbonMask(u, v) {
    var x = u * 256, y = v * 256;
    // This packed inward-facing spur incorrectly crosses the exposed jade deck.
    return x >= 184 && ((x < 231 && y < 112) || (x < 225 && y < 120)) ? 0 : 1;
  }
  function goldMotion(t) { return [goldOffset, Math.sin(t * Math.PI * 2 / 6.4) * 3.2]; }
  function xianzhouRibbon(r, F, t) {
    var motion = goldMotion(t);
    atlasDraw(r, F, 'luofu-ribbon', [330, -40, 680, 540], {
      detail: !!F.detail,
      opacity: ribbonMask,
      // Move only the floating ornament; both silver arcs retain their geometry.
      offset: function (u, v) { return goldMask(u, v) ? [motion[0] * F.s, motion[1] * F.s] : [0, 0]; },
      shade: function (c, u, v) {
        var sheen = Math.pow(Math.max(0, Math.sin(u * 8 + v * 5 - t * 0.35)), 12);
        return mix(c, '#e4ffef', sheen * 0.16);
      }
    });
  }
  PX.provide('07b-xianzhou-ribbon', { xianzhouRibbon: xianzhouRibbon, xianzhouGoldOffset: goldOffset,
    xianzhouGoldMask: goldMask, xianzhouGoldMotion: goldMotion, xianzhouRibbonMask: ribbonMask });
})(window.__abPixel = window.__abPixel || {});
