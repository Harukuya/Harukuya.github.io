// About 页像素 Hero · 09c-cabin-clock：舱壁上显示当前时间（时:分）的地方，每个舱室找一处顺手的位置：
//   观景台 = 星图屏右上角的一行读数；TechCafe = 霓虹招牌右边一块木框暖光小钟；货舱 = 从天花吊下来的一块红色数码屏，挂在 A-02 货位上方；
//   实验舱 = 那排显示器正下方一块绿色读数。星穹列车舱本来就有一只走真实时间的挂钟（09-cabins），不另加。
// 数码屏底下垫一层很淡的 88:88（没点亮的笔画），冒号每秒闪一下（减少动态时常亮）。
// 画在单独一层（10-mount 的 clock 层，视差和舱壁同速，hero 退场时跟舱壁一起往右走），每半秒看一眼时间，变了才重画。竖屏不画（竖屏舱壁上的装饰都不画）
// 独立作用域：只能用下面 PX.need 声明过的别的文件的名字；给别的文件用的东西在末尾 PX.provide 里列出（机制见 01-core.js 开头）
(function (PX) {
  'use strict';

  PX.need('09c-cabin-clock', ['drawText', 'lerp']);
  var drawText = PX.drawText, lerp = PX.lerp;

  var TW = 17, TH = 5;   // "HH:MM" 在 3×5 像素字下的尺寸：两位数 7 + 空 1 + 冒号 1 + 空 1 + 两位数 7

  // 舱壁上参考 x、墙高比例 f 处的画布坐标（和 09-cabins 的 wallPt 同一个算法）
  function wallPt(g, xr, f) { var x = g.RX(xr); return { x: x, y: lerp(g.wallTopAt(x), g.sillAt(x), f) }; }

  // 这个舱室的钟放在哪、什么颜色；null = 不画
  function clockSpot(g, cfg) {
    if (g.portrait) return null;
    var p;
    switch (cfg.cabin) {
      case 'deck': {
        // 星图屏（09-cabins deckScreen：参考 x 1430~1700、墙高 10%~46%）右上角，红色指示灯左边；左上角是 NAV 字样
        var a = wallPt(g, 1430, 0.1), b = wallPt(g, 1700, 0.46), sx = Math.round(a.x), sw = Math.round(b.x) - sx;
        return { x: sx + sw - 8 - TW, y: Math.round(a.y) + 2, digit: [120, 230, 255], panel: null };
      }
      case 'cafe':
        // 招牌右边、吊灯线再往右一点的空墙上，和招牌上沿齐平
        p = wallPt(g, 1856, 0.12);
        return { x: Math.round(p.x - TW / 2), y: Math.round(p.y) + 2, digit: [255, 196, 106], panel: ['#1a1411', '#8a6446'] };
      case 'hangar':
        // 吊在 A-02 货位上方：屏的下沿在舱壁上沿之上（窄屏时两块货位牌之间放不下，吊在天花上哪种宽度都不挤）；
        // 避开吊钩的绳子（09-cabins hangarItems 的 hook，参考 x 1620）
        p = wallPt(g, 1722, 0);
        return { x: Math.round(p.x - TW / 2), y: Math.round(p.y) - TH - 4, digit: [255, 104, 64], panel: ['#15181c', '#3f4854'], hang: '#2c333d' };
      case 'lab':
        // 显示器那排（参考 x 1572~1774、墙高 10%~30%）正下方
        p = wallPt(g, 1673, 0.4);
        return { x: Math.round(p.x - TW / 2), y: Math.round(p.y), digit: [120, 255, 170], panel: ['#0a141a', '#1a2026'] };
      default:
        return null;
    }
  }

  function cabinHasClock(cfg) { return cfg.cabin !== 'express'; }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // T = 场景光染色（09-cabins castFn）：框和底板跟着舱壁一起被窗外光染色，发光的数字不染
  function drawCabinClock(r, g, cfg, T, now, colon) {
    var S = clockSpot(g, cfg);
    if (!S) return;
    if (S.hang) {
      // 两根吊杆
      r.rect(S.x - 1, S.y - 7, 1, 5, T(S.hang));
      r.rect(S.x + TW, S.y - 7, 1, 5, T(S.hang));
    }
    if (S.panel) {
      r.rect(S.x - 3, S.y - 2, TW + 6, TH + 4, T(S.panel[1]));
      r.rect(S.x - 2, S.y - 1, TW + 4, TH + 2, T(S.panel[0]));
      // 没点亮的笔画
      drawText(r, S.x, S.y, '88', S.digit, 1, 0.1);
      drawText(r, S.x + 10, S.y, '88', S.digit, 1, 0.1);
      r.px(S.x + 8, S.y + 1, S.digit, 0.1); r.px(S.x + 8, S.y + 3, S.digit, 0.1);
    }
    drawText(r, S.x, S.y, pad2(now.getHours()), S.digit);
    if (colon) { r.px(S.x + 8, S.y + 1, S.digit); r.px(S.x + 8, S.y + 3, S.digit); }
    drawText(r, S.x + 10, S.y, pad2(now.getMinutes()), S.digit);
  }

  PX.provide('09c-cabin-clock', { cabinHasClock: cabinHasClock, drawCabinClock: drawCabinClock });
})(window.__abPixel = window.__abPixel || {});
