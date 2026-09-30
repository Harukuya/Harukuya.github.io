// Amphoreus assembly: concentric disc, prismatic ribbon and central star.
// 定稿：暗盘 / 玻璃带用素材版（08a / 08b），中间的光芒用 px 版的画法（08c-amphoreus-light-px，光的贴图在那边加载）。
// 玻璃带前面的光（彩色辐条、横向蓝光、十字亮星）画在景色上面单独的高帧率层里（drawAmphoreusFx，见 10-mount 的 view-fx 层，翁法罗斯时两倍密度）；
// 玻璃带后面：淡蓝辉光 / 柔光在景色层，碎光在两倍像素密度的 view-sparks 层（drawAmphoreusSparks）。
(function (PX) {
  'use strict';
  PX.need('08-amphoreus', ['Raster', 'hex', 'amphoreusBeam', 'amphoreusDisc', 'amphoreusLight', 'amphoreusLightLoad', 'amphoreusRibbon', 'amphoreusSparks', 'amphoreusStar', 'atlasFrame', 'atlasLoad']);
  var Raster = PX.Raster, hex = PX.hex, amphoreusBeam = PX.amphoreusBeam, amphoreusDisc = PX.amphoreusDisc, amphoreusRibbon = PX.amphoreusRibbon,
    amphoreusStar = PX.amphoreusStar, amphoreusLight = PX.amphoreusLight, amphoreusLightLoad = PX.amphoreusLightLoad, amphoreusSparks = PX.amphoreusSparks,
    atlasFrame = PX.atlasFrame, atlasLoad = PX.atlasLoad;
  var center = [468.75, 331.1];
  var parts = [{ disc: [center[0], center[1], 292] }, { name: 'amphoreus-ribbon', rect: [0, 0, 1000, 520] }];
  function loadAmphoreus() {
    return Promise.all([atlasLoad(['amphoreus-ribbon', 'amphoreus-glow']), amphoreusLightLoad()]);
  }
  function frameOf(g) {
    var F = atlasFrame(g, 'amphoreus', parts, { anchor: center, zoom: 0.9 });
    if (F) F.lightCenter = center;
    return F;
  }
  function drawAmphoreusBackdrop(r, g, t) {
    var F = frameOf(g);
    if (!F) return;
    var density = r.pixelDensity || 1;
    amphoreusDisc(r, { x: F.x * density, y: F.y * density, s: F.s * density,
      lightCenter: center, pixelDensity: density, detail: density > 1 }, t);
    amphoreusLight(density > 1 ? blockRaster(r, density) : r, F, t, false);
  }
  function drawAmphoreusRibbon(r, g, t) {
    var F = frameOf(g);
    if (!F) return;
    var density = r.pixelDensity || 1;
    amphoreusRibbon(r, { x: F.x * density, y: F.y * density, s: F.s * density,
      pixelDensity: density, detail: density > 1 }, t);
  }
  // 碎光：画在两倍像素密度的 view-sparks 层（10-mount），取景按图层密度放大（和玻璃带的 view-detail 层一样）
  function drawAmphoreusSparks(r, g, t) {
    var F = frameOf(g);
    if (!F) return;
    var density = r.pixelDensity || 1;
    amphoreusSparks(r, { x: F.x * density, y: F.y * density, s: F.s * density, lightCenter: center }, t);
  }
  function drawAmphoreusBig(r, g, t) {
    drawAmphoreusBackdrop(r, g, t);
    drawAmphoreusSparks(r, g, t);
    drawAmphoreusRibbon(r, g, t);
  }
  // 玻璃带前面的光（view-fx 层，翁法罗斯时两倍像素密度）：横向蓝光按图层密度画（更细）；
  // 彩色辐条也按图层密度采样；十字亮星保留一倍画法，通过 blockRaster 保持原样。
  function drawAmphoreusFx(r, g, t) {
    var F = frameOf(g);
    if (!F) return;
    var density = r.pixelDensity || 1, R1 = density > 1 ? blockRaster(r, density) : r;
    amphoreusLight(r, { x: F.x * density, y: F.y * density, s: F.s * density, lightCenter: center }, t, true);
    amphoreusBeam(r, { x: F.x * density, y: F.y * density, s: F.s * density, lightCenter: center }, t);
    amphoreusStar(R1, F, t);
  }
  // 一倍像素的画法原样画进 k 倍密度的图层：Raster 的各种画法（光晕 / 线 / 圆 / 贴图）最后都落到 px 上，这里把每个像素写成 k×k 一块
  // （每帧都要画，直接写缓冲：颜色只转一次，混合公式和 Raster.px 一样）
  function blockRaster(r, k) {
    var B = Object.create(Raster.prototype), D = r.d, W = r.w, H = r.h;
    B.px = function (x, y, c, a) {
      if (a !== undefined && a <= 0) return;
      c = hex(c);
      var x0 = Math.round(x) * k + r.ox, y0 = Math.round(y) * k + r.oy, solid = a === undefined || a >= 1;
      for (var j = 0; j < k; j++) {
        var yy = y0 + j;
        if (yy < 0 || yy >= H) continue;
        for (var i = 0; i < k; i++) {
          var xx = x0 + i;
          if (xx < 0 || xx >= W) continue;
          var o = (yy * W + xx) * 4;
          if (solid) { D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255; continue; }
          var da = D[o + 3] / 255, oa = a + da * (1 - a);
          D[o] = (c[0] * a + D[o] * da * (1 - a)) / oa;
          D[o + 1] = (c[1] * a + D[o + 1] * da * (1 - a)) / oa;
          D[o + 2] = (c[2] * a + D[o + 2] * da * (1 - a)) / oa;
          D[o + 3] = oa * 255;
        }
      }
    };
    // 给 04b 的缓存路径直接按块写用（和上面 px 同一个算法）
    B.block = { d: D, w: W, h: H, k: k, ox: r.ox, oy: r.oy };
    return B;
  }
  PX.provide('08-amphoreus', { drawAmphoreusBig: drawAmphoreusBig, drawAmphoreusBackdrop: drawAmphoreusBackdrop,
    drawAmphoreusRibbon: drawAmphoreusRibbon, drawAmphoreusFx: drawAmphoreusFx, drawAmphoreusSparks: drawAmphoreusSparks, loadAmphoreus: loadAmphoreus });
})(window.__abPixel = window.__abPixel || {});
