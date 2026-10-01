// Luofu: silver foreground ribbon and ascending stern arc.
(function (PX) {
  'use strict';
  PX.need('07b-xianzhou-ribbon', ['atlasDraw', 'mix', 'xianzhouRibbonOffset']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  var goldOffset = ((130 + 167 / 256 * 600) + (330 + 125.5 / 256 * 680)) / 2 - (330 + 87.5 / 256 * 680)
    + PX.xianzhouRibbonOffset[0] - 18;
  function goldMask(u, v) { return u * 256 >= 76 && u * 256 <= 98 && v * 256 <= 52; }
  function goldMotion(t) {
    return [goldOffset, PX.xianzhouRibbonOffset[1] + Math.sin(t * Math.PI * 2 / 6.4) * 3.2];
  }
  function xianzhouRibbon(r, F, t) {
    var motion = goldMotion(t);
    var goldMove = [motion[0] * F.s, motion[1] * F.s];
    var ribbonMove = [PX.xianzhouRibbonOffset[0] * F.s, PX.xianzhouRibbonOffset[1] * F.s];
    atlasDraw(r, F, 'luofu-ribbon', [330, -40, 680, 540], {
      detail: !!F.detail,
      // Retain the source alpha, including the rail's folded rear extension.
      // Translate the bright arc, lower support and broad rail as one intact piece.
      offset: function (u, v) { return goldMask(u, v) ? goldMove : ribbonMove; },
      shade: function (c, u, v) {
        var sheen = Math.pow(Math.max(0, Math.sin(u * 8 + v * 5 - t * 0.35)), 12);
        return mix(c, '#e4ffef', sheen * 0.16);
      }
    });
  }
  PX.provide('07b-xianzhou-ribbon', { xianzhouRibbon: xianzhouRibbon, xianzhouGoldOffset: goldOffset,
    xianzhouGoldMask: goldMask, xianzhouGoldMotion: goldMotion });
})(window.__abPixel = window.__abPixel || {});
