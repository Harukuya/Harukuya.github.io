// 07-cafe-front：最前面一层（离镜头最近；底色画进 Fr，打同样的光）
// 左下角一盆矮矮的龟背竹（编织篮盆，叶子带裂口，被屏幕左边切掉一部分，不挡住窗边的猫）；吧台前三把高脚凳（胡桃木圆坐面、黑色铁腿 + 踏脚圈）；
// 右下角一棵琴叶榕（白瓷盆，细干上一片片提琴形的大叶子，被屏幕右边切掉一部分）。
(function (PX) {
  'use strict';

  PX.need('07-cafe-front', ['cafeRnd', 'cafeSpot']);
  var rnd = PX.cafeRnd, cafeSpot = PX.cafeSpot;

  function pen(sp) { return function (ux, uy) { return [sp.x + ux * sp.k, sp.y + uy * sp.k]; }; }
  function bar(R, a, b, w, c) { R.capsule(a[0], a[1], b[0], b[1], w, w, c); }

  // 一片龟背竹叶：从叶柄顶端 base 沿方向 d（单位向量）长出去；心形，两边几道裂口（从叶缘切向中脉）+ 几个小孔；靠光的一半亮，中脉浅
  function monsteraLeaf(R, base, d, len, seed) {
    var n = [-d[1], d[0]], W = len * 0.62;
    for (var v = -len * 0.12; v < len; v += 0.5) {
      for (var u = -W; u <= W; u += 0.5) {
        var t = v / len, half = W * (t < 0 ? 0.8 + t * 3 : Math.sin(Math.min(1, t * 1.05) * Math.PI) * (1 - t * 0.25) + 0.08 * (1 - t));
        if (Math.abs(u) > half) continue;
        if (t < 0 && Math.abs(u) < W * 0.12) continue;                                    // 叶基的缺口
        var slit = Math.abs(u) / Math.max(1, half), ph = t * 7 + (u > 0 ? 0.4 : 0.9), k = Math.floor(ph);
        if (slit > 0.38 && Math.abs(ph - k - 0.5) < 0.07 + 0.05 * slit && t > 0.12 && t < 0.9) continue;
        if (rnd(k * 13 + (u > 0 ? 1 : 2) + seed, 301) > 0.55 && Math.hypot(slit - 0.3, (ph % 1) - 0.5) < 0.09) continue;
        var x = base[0] + u * n[0] + v * d[0], y = base[1] + u * n[1] + v * d[1];
        var lit = u * n[0] > 0 || u * n[1] < 0;
        R.px(x, y, Math.abs(u) < 0.9 ? '#8cbf6a' : lit ? (slit < 0.55 ? '#4f8f43' : '#3f7a38') : (slit < 0.55 ? '#3c7336' : '#2f5e2d'));
      }
    }
  }

  function monstera(R, ctx, sp) {
    var p = pen(sp), k = sp.k, st = p(0, -26);
    // 叶子：从盆里放射出去（角度 = 离竖直方向往右偏多少，负的往左）
    [[0.55, 150, 0.95, 1], [1.15, 128, 0.85, 2], [0.1, 118, 0.8, 3], [1.65, 104, 0.7, 4], [-0.4, 96, 0.7, 5], [0.85, 80, 0.62, 6]].forEach(function (lf) {
      var d = [Math.sin(lf[0]), -Math.cos(lf[0])], stemLen = lf[1] * 0.17 * k, tip = [st[0] + d[0] * stemLen, st[1] + d[1] * stemLen];
      bar(R, st, tip, 1.3 * k, '#4a7a36');
      monsteraLeaf(R, tip, d, lf[1] * lf[2] * 0.22 * k, lf[3]);
    });
    // 编织篮盆
    R.poly([p(-17, -27), p(17, -27), p(14, 0), p(-14, 0)], function (x, y) {
      var u = (x - sp.x) / k, v = (y - sp.y) / k, weave = (Math.floor((u + 40) / 2.4) + Math.floor((v + 60) / 2.4)) % 2;
      return v < -24.5 ? '#c9a46e' : u > 10 ? (weave ? '#8a6a44' : '#7a5c3a') : (weave ? '#b8925c' : '#a8824e');
    });
  }

  // 琴叶榕：细干，叶子提琴形（前宽、中间收一点、叶尖圆），深绿，左右交替往外上方长
  function fig(R, ctx, sp) {
    var p = pen(sp), k = sp.k;
    bar(R, p(0, -30), p(-3, -140), 2.4 * k, '#6a4a34');
    for (var i = 0; i < 10; i++) {
      var t = i / 9, at = p(-3 * t, -52 - t * 92), side = i % 2 ? 1 : -1, len = (19 - t * 6) * k, th = 1.25 - t * 0.45;
      var d = [side * Math.sin(th), -Math.cos(th)], n = [-d[1], d[0]];
      for (var v = 0; v < len; v += 0.5) {
        var tt = v / len, half = len * 0.36 * (tt < 0.6 ? 0.7 + 0.3 * Math.sin(tt / 0.6 * Math.PI / 2) : Math.sqrt(Math.max(0, 1 - Math.pow((tt - 0.6) / 0.4, 2)))) * (tt < 0.45 && tt > 0.3 ? 0.9 : 1);
        for (var u = -half; u <= half; u += 0.5) {
          var x = at[0] + u * n[0] + v * d[0], y = at[1] + u * n[1] + v * d[1];
          R.px(x, y, Math.abs(u) < 0.8 ? '#7fae5c' : (u * n[1] < 0 ? (tt > 0.5 ? '#4a8a3e' : '#3e7536') : '#2f5a2c'));
        }
      }
    }
    R.poly([p(-18, -30), p(18, -30), p(14, 0), p(-14, 0)], function (x, y) { var u = (x - sp.x) / k; return y < p(0, -27)[1] ? '#f4f1ea' : u < -7 ? '#fbf9f4' : u > 9 ? '#cfcac0' : '#e9e5dc'; });
  }

  // 高脚凳：圆木坐面（看得到顶面）+ 四条外撇的铁腿 + 踏脚圈
  function stool(R, ctx, sp) {
    var p = pen(sp), k = sp.k, top = -70;
    [[-12, 0], [12, 0], [-6, 3], [6, 3]].forEach(function (lg, i) {
      bar(R, p(lg[0] * 0.55, top + 4), p(lg[0], lg[1]), 1.7 * k, i > 1 ? '#1d1d21' : '#2c2c31');
    });
    R.ellipse(p(0, -24)[0], p(0, -24)[1], 11 * k, 2.4 * k, 0, function (x, y, dx, dy, d) { return d > 0.72 ? (dy < 0 ? '#3a3a40' : '#1d1d21') : null; });
    R.ellipse(p(0, top + 3)[0], p(0, top + 3)[1], 15 * k, 3.6 * k, 0, '#4a2e20');
    R.ellipse(p(0, top)[0], p(0, top)[1], 15 * k, 3.6 * k, 0, function (x, y, dx, dy) { return dy < -1.2 * k ? '#9a6a46' : Math.sin(dx * 0.4) > 0.8 ? '#7a5238' : '#86593c'; });
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 16 * k, ry: 3.6 * k, f: 0.55 });
  }

  function cafeFront(R, ctx) {
    var L = ctx.L;
    [0.662, 0.768, 0.874].forEach(function (f) { stool(R, ctx, cafeSpot(L, f, 232)); });
    monstera(R, ctx, cafeSpot(L, -0.02, 268));
    fig(R, ctx, cafeSpot(L, 1.04, 262));
  }

  PX.provide('07-cafe-front', { cafeFront: cafeFront });
})(window.__abPixel = window.__abPixel || {});
