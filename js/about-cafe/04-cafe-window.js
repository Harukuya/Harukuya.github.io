// 04-cafe-window：最左边的靠窗座位（画进家具那块底色 B；会发光的画进 ctx.E）
// 窗下一条嵌墙的长木凳：芥末黄长坐垫，靠着玻璃三个抱枕（青 / 米白条纹 / 砖红）；坐垫中间一只蜷着睡觉的灰色虎斑猫（尾巴绕到前面，尾巴尖会动）；
// 前面一张大理石面的小圆桌（铁脚）：一杯拉花拿铁、一只青色马克杯的黑咖啡、一小碟可颂、一本摊开的书、一支插在小瓶里的黄花，
// 黄昏 / 夜里多一盏小蜡烛；桌角一只装着萤火虫的玻璃瓶（夜里发光、一闪一闪）；桌子右边一把曲木椅。
// 天花板垂下来一盆绿萝（麻绳吊篮，藤蔓垂下来）；窗顶一串小灯泡（横跨三扇窗，每扇之间往下垂，黄昏 / 夜里亮）。
(function (PX) {
  'use strict';

  PX.need('04-cafe-window', ['cafeDepth', 'cafeHot', 'cafeRnd', 'cafeShade', 'cafeSpot']);
  var cafeDepth = PX.cafeDepth, cafeHot = PX.cafeHot, rnd = PX.cafeRnd, shade = PX.cafeShade, cafeSpot = PX.cafeSpot;

  function pen(sp) { return function (ux, uy) { return [sp.x + ux * sp.k, sp.y + uy * sp.k]; }; }

  // 嵌墙长凳：后墙坐标 x0 ~ x1，进深 dep、坐高 hh（单位）
  function bench(B, ctx, x0, x1) {
    var L = ctx.L, s = L.s, ps = L.ps, dep = 44, hh = 44, cu = 7;
    var front = cafeDepth(L, dep * s), back = cafeDepth(L, 0);
    var fx0 = front.x(x0), fx1 = front.x(x1), fy = front.y(), kf = front.k * ps;
    var topF = fy - (hh + cu) * kf, topB = back.y() - (hh + cu) * ps, faceTop = fy - hh * kf;
    // 木头正面（竖条护板）
    B.poly([[fx0, faceTop], [fx1, faceTop], [fx1, fy], [fx0, fy]], function (x, y) {
      if (y > fy - 4 * kf) return '#4e3527';
      return ((x - fx0) % Math.round(34 * kf)) < Math.max(1, kf) ? '#5a3f2e' : y < faceTop + 3 * kf ? '#8a6448' : '#7a5741';
    });
    // 坐垫：顶面 + 前面一截厚度，每 60 单位一道缝
    B.poly([[back.x(x0), topB], [back.x(x1), topB], [fx1, topF], [fx0, topF]], function (x, y) {
      return ((x - fx0) % Math.round(62 * kf)) < Math.max(1, kf) ? '#a87a34' : y < topB + 2 * s ? '#d8ac56' : '#cc9d48';
    });
    B.poly([[fx0, topF], [fx1, topF], [fx1, faceTop], [fx0, faceTop]], function (x) { return ((x - fx0) % Math.round(62 * kf)) < Math.max(1, kf) ? '#8e6428' : '#b0843a'; });
    ctx.shadows.push({ x: (fx0 + fx1) / 2, y: fy + 2 * s, rx: (fx1 - fx0) * 0.55, ry: 8 * s, f: 0.6 });
    return { topF: topF, topB: topB, back: back, front: front };
  }

  // 抱枕：靠在玻璃上的圆角方块，微微歪；kind 0 青、1 米白条纹、2 砖红
  function pillow(B, x, y, k, tilt, kind) {
    var cols = [['#3f7e7a', '#4f938d', '#2f6460'], ['#ece0c4', '#f6eddb', '#cdbd9c'], ['#b8603e', '#cc7450', '#94482e']][kind];
    var wd = 30 * k, ht = 28 * k, c = Math.cos(tilt), sn = Math.sin(tilt);
    for (var yy = -ht / 2 - 2; yy < ht / 2 + 2; yy++) {
      for (var xx = -wd / 2 - 2; xx < wd / 2 + 2; xx++) {
        var u = (xx * c + yy * sn) / (wd / 2), v = (-xx * sn + yy * c) / (ht / 2);
        var e = Math.pow(Math.abs(u), 3) + Math.pow(Math.abs(v), 3);
        if (e > 1) continue;
        var col = e > 0.75 ? cols[2] : (u + v < -0.5 ? cols[1] : cols[0]);
        if (kind === 1 && Math.abs(((u + 1) * 3) % 1 - 0.5) < 0.12 && e < 0.75) col = '#b9a27a';
        B.px(x + xx, y + yy, col);
      }
    }
  }

  // 猫尾巴上第 i 节（0 ~ 20）的位置（猫的单位）；0 ~ CAT_TAIL_FIX 节是画死的，后面几节是会动的尾巴尖
  var CAT_TAIL_FIX = 15;
  function catTail(i) { var a = Math.PI * (1.05 - i / 20 * 0.95); return [-2 + Math.cos(a) * 20, -4 + Math.sin(a) * 3.5]; }

  // 蜷着睡觉的虎斑猫：身体椭圆 + 头（耳朵、闭着的眼）+ 绕到前面的尾巴；尾巴尖交给 08-cafe-fx 动
  function cat(B, ctx, sp) {
    var p = pen(sp), k = sp.k;
    B.ellipse(p(0, -9)[0], p(0, -9)[1], 21 * k, 9.5 * k, 0, function (x, y, dx, dy) {
      var u = dx / k, v = dy / k;
      if (v > 4 && u > -4) return '#e9e4dc';
      var stripe = Math.sin(u * 0.55 + v * 0.2) > 0.55;
      return v < -5 ? (stripe ? '#77706a' : '#a9a29a') : (stripe ? '#6a645e' : '#948d86');
    });
    // 头：右端，稍低，下巴埋在前爪上
    B.ellipse(p(15, -8)[0], p(15, -8)[1], 7.5 * k, 6.5 * k, 0, function (x, y, dx, dy) {
      var u = dx / k, v = dy / k;
      if (v > 2 && u > -1) return '#efebe4';
      return Math.sin(u * 1.2) > 0.6 && v < -1 ? '#77706a' : '#a39c94';
    });
    B.poly([p(10, -12.5), p(12, -18.5), p(14.5, -13.5)], '#8f8881');
    B.poly([p(16, -13.5), p(19, -18), p(20.5, -12)], '#8f8881');
    B.px(p(12, -15)[0], p(12, -15)[1], '#d9a7a0'); B.px(p(18.6, -15)[0], p(18.6, -15)[1], '#d9a7a0');
    B.line(p(15.5, -8.6)[0], p(15.5, -8.6)[1], p(18, -8.2)[0], p(18, -8.2)[1], '#4a4440');   // 闭着的眼
    B.px(p(20.4, -6.4)[0], p(20.4, -6.4)[1], '#c98a86');                                     // 鼻子
    B.ellipse(p(12, -2.5)[0], p(12, -2.5)[1], 5 * k, 2.2 * k, 0, '#f3efe8');                // 前爪
    // 尾巴：从屁股后面绕到身体前下方（最后一截尾巴尖由 08-cafe-fx 画，隔一会儿甩一下）
    for (var i = 0; i <= CAT_TAIL_FIX; i++) {
      var q = catTail(i);
      B.disc(p(q[0], q[1])[0], p(q[0], q[1])[1], 2.6 * k, Math.floor(i / 3) % 2 ? '#7c756f' : '#9b948d');
    }
    // 尾巴尖甩起来会扫到的那一小块：先存下猫画完时的样子（occ.snap），等后面的家具（前面的小圆桌）画完再比一比，
    // 被后画的东西盖住的像素记进 occ.mask，08-cafe-fx 甩尾巴时跳过这些像素——尾巴留在桌子后面
    var a0 = p(4, -17), a1 = p(25, 5), ox = Math.floor(a0[0]), oy = Math.floor(a0[1]), ow = Math.ceil(a1[0]) - ox, oh = Math.ceil(a1[1]) - oy;
    var snap = new Uint8ClampedArray(ow * oh * 4);
    for (var yy = 0; yy < oh; yy++) for (var xx = 0; xx < ow; xx++) {
      var sx = ox + xx, sy = oy + yy;
      if (sx < 0 || sy < 0 || sx >= B.w || sy >= B.h) continue;
      for (var c = 0; c < 4; c++) snap[(yy * ow + xx) * 4 + c] = B.d[(sy * B.w + sx) * 4 + c];
    }
    var fx = { kind: 'tail', x: sp.x, y: sp.y, k: k, lit: true, occ: { x0: ox, y0: oy, w: ow, h: oh, snap: snap, mask: null } };
    ctx.fx.push(fx);
    cafeHot(ctx, 'cat', [p(-23, -20), p(23, 1)], 2);
    return fx;
  }
  // 猫画完之后又被别的东西盖住的像素（和 occ.snap 不一样的）→ occ.mask
  function tailOcclusion(B, occ) {
    var mask = new Uint8Array(occ.w * occ.h);
    for (var yy = 0; yy < occ.h; yy++) for (var xx = 0; xx < occ.w; xx++) {
      var sx = occ.x0 + xx, sy = occ.y0 + yy, i = yy * occ.w + xx;
      if (sx < 0 || sy < 0 || sx >= B.w || sy >= B.h) continue;
      var j = (sy * B.w + sx) * 4;
      if (B.d[j] !== occ.snap[i * 4] || B.d[j + 1] !== occ.snap[i * 4 + 1] || B.d[j + 2] !== occ.snap[i * 4 + 2] || B.d[j + 3] !== occ.snap[i * 4 + 3]) mask[i] = 1;
    }
    occ.mask = mask;
    occ.snap = null;
  }

  // 大理石小圆桌 + 桌上的东西
  function table(B, ctx, sp) {
    var L = ctx.L, p = pen(sp), k = sp.k, T = ctx.T;
    // 脚：十字底座 + 铁柱
    B.poly([p(-16, 0), p(16, 0), p(12, -3), p(-12, -3)], '#2b292c');
    B.rect(p(-2, -72)[0], p(-2, -72)[1], 4 * k, 70 * k, '#3a373b');
    B.rect(p(-2, -72)[0], p(-2, -72)[1], 1.2 * k, 70 * k, '#58545a');
    // 桌面：椭圆（看得到一点顶面）+ 一圈厚边
    var cy = p(0, -74)[1], rx = 30 * k, ry = 6.5 * k;
    B.ellipse(p(0, -74)[0], cy + 2.6 * k, rx, ry, 0, '#b8b0a4');
    B.ellipse(p(0, -74)[0], cy, rx, ry, 0, function (x, y, dx, dy) {
      var vein = Math.sin(dx * 0.35 + dy * 1.4 + Math.sin(dx * 0.11) * 3) > 0.93;
      return vein ? '#cfc8bd' : dy < -ry * 0.3 ? '#f6f2ec' : '#ebe5dc';
    });
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 26 * k, ry: 5 * k, f: 0.5 });
    // 书（左后方，摊开）
    var bk = p(-20, -76);
    B.poly([[bk[0] - 9 * k, bk[1] - 1.5 * k], [bk[0], bk[1] - 2.5 * k], [bk[0], bk[1] + 1.5 * k], [bk[0] - 9 * k, bk[1] + 2.4 * k]], '#f3ecdc');
    B.poly([[bk[0], bk[1] - 2.5 * k], [bk[0] + 9 * k, bk[1] - 1.5 * k], [bk[0] + 9 * k, bk[1] + 2.4 * k], [bk[0], bk[1] + 1.5 * k]], '#e8dfcb');
    for (var ln = 0; ln < 3; ln++) {
      B.line(bk[0] - 7.5 * k, bk[1] - 0.6 * k + ln * 1.1 * k, bk[0] - 1.5 * k, bk[1] - 1 * k + ln * 1.1 * k, '#b5ab98');
      B.line(bk[0] + 1.5 * k, bk[1] - 1 * k + ln * 1.1 * k, bk[0] + 7.5 * k, bk[1] - 0.6 * k + ln * 1.1 * k, '#b5ab98');
    }
    B.line(bk[0] - 9 * k, bk[1] + 2.6 * k, bk[0] + 9 * k, bk[1] + 2.6 * k, '#8a3f3a');
    // 拿铁：白瓷杯 + 碟 + 奶泡拉花
    var lc = p(-7, -75);
    B.ellipse(lc[0], lc[1] + 1.6 * k, 6.5 * k, 1.8 * k, 0, '#e4e0da');
    B.poly([[lc[0] - 4 * k, lc[1] - 6 * k], [lc[0] + 4 * k, lc[1] - 6 * k], [lc[0] + 3.2 * k, lc[1] + 0.8 * k], [lc[0] - 3.2 * k, lc[1] + 0.8 * k]], function (x) { return x > lc[0] + 1.5 * k ? '#d6d2cc' : '#f8f6f2'; });
    B.ellipse(lc[0], lc[1] - 6 * k, 4 * k, 1.3 * k, 0, function (x, y, dx) { return Math.abs(dx) < 1.4 * k ? '#f1e6d6' : '#a8703f'; });
    B.poly([[lc[0] + 4 * k, lc[1] - 4.6 * k], [lc[0] + 6 * k, lc[1] - 4 * k], [lc[0] + 5.6 * k, lc[1] - 1.8 * k], [lc[0] + 3.6 * k, lc[1] - 2 * k]], '#ece8e2');
    ctx.fx.push({ kind: 'steam', x: lc[0], y: lc[1] - 7 * k, k: k, lit: true });
    // 青色马克杯的黑咖啡
    var mc = p(9, -76);
    B.rect(mc[0] - 3.4 * k, mc[1] - 7.5 * k, 6.8 * k, 7.5 * k, '#3f8a86');
    B.rect(mc[0] - 3.4 * k, mc[1] - 7.5 * k, 2 * k, 7.5 * k, '#5aa39d');
    B.ellipse(mc[0], mc[1] - 7.5 * k, 3.4 * k, 1.1 * k, 0, '#3a2418');
    B.poly([[mc[0] + 3.4 * k, mc[1] - 6 * k], [mc[0] + 5.6 * k, mc[1] - 5.4 * k], [mc[0] + 5.2 * k, mc[1] - 2.4 * k], [mc[0] + 3.4 * k, mc[1] - 2.6 * k]], '#327672');
    ctx.fx.push({ kind: 'steam', x: mc[0], y: mc[1] - 8.5 * k, k: k, lit: true });
    // 可颂（小碟上）
    var cr = p(1, -72.5);
    B.ellipse(cr[0], cr[1], 6 * k, 1.6 * k, 0, '#f2eee8');
    for (var i = -2; i <= 2; i++) B.ellipse(cr[0] + i * 2.1 * k, cr[1] - 1.8 * k + Math.abs(i) * 0.5 * k, 1.9 * k, 1.6 * k, 0, i % 2 ? '#c98a44' : '#dca25a');
    // 小花瓶 + 黄花
    var fv = p(20, -77);
    B.rect(fv[0] - 1.3 * k, fv[1] - 5 * k, 2.6 * k, 5 * k, '#9cc3c8');
    B.line(fv[0], fv[1] - 5 * k, fv[0] + 0.6 * k, fv[1] - 12 * k, '#4f7a3f');
    B.disc(fv[0] + 0.6 * k, fv[1] - 12.5 * k, 1.8 * k, '#f2c53d');
    B.px(fv[0] + 0.6 * k, fv[1] - 12.5 * k, '#b0701f');
    // 萤火虫瓶（桌子前沿右边）：玻璃瓶 + 木塞，瓶里的光点交给 fx 闪
    var jar = p(25, -73);
    B.poly([[jar[0] - 3.2 * k, jar[1] - 9 * k], [jar[0] + 3.2 * k, jar[1] - 9 * k], [jar[0] + 3.6 * k, jar[1]], [jar[0] - 3.6 * k, jar[1]]], function () { return ['#bcd6d4', 0.45]; });
    B.rect(jar[0] - 2.2 * k, jar[1] - 11 * k, 4.4 * k, 2 * k, '#a47a52');
    B.line(jar[0] - 2.4 * k, jar[1] - 8 * k, jar[0] - 2.6 * k, jar[1] - 1 * k, '#eef6f4');
    ctx.fx.push({ kind: 'fireflies', x: jar[0], y: jar[1] - 4.5 * k, k: k, on: T.id !== 'day' });
    cafeHot(ctx, 'jar', [[jar[0] - 4 * k, jar[1] - 12 * k], [jar[0] + 4 * k, jar[1]]], 3);
    if (T.id !== 'day') ctx.lights.push({ x: jar[0], y: jar[1] - 4 * k, rx: 14 * k, ry: 10 * k, col: [0.35, 0.6, 0.3], k: T.id === 'night' ? 0.8 : 0.4, on: 'always' });
    // 小蜡烛（黄昏 / 夜里 / 清晨）
    if (T.id !== 'day') {
      var cd = p(-16, -74);
      B.rect(cd[0] - 2 * k, cd[1] - 3.4 * k, 4 * k, 3.4 * k, '#d9d2c6', 0.7);
      ctx.E.px(cd[0], cd[1] - 4.4 * k, '#fff2c0'); ctx.E.px(cd[0], cd[1] - 5.2 * k, '#ffcf6a');
      ctx.E.glow(cd[0], cd[1] - 4.6 * k, 1, 7 * k, '#ffc060', 0.35);
      ctx.lights.push({ x: cd[0], y: cd[1] - 3 * k, rx: 30 * k, ry: 16 * k, col: [0.9, 0.6, 0.3], k: 0.9, on: 'warm' });
    }
  }

  // 曲木椅（侧面；face = −1 面朝左、1 面朝右）：后腿连着弯弯的椅背，圆坐面，前腿，腿间一道横撑。
  // 下面的坐标按「面朝右」写（椅背在 −x 那侧），乘 face 翻到要的朝向——椅背总在背对桌子的那一侧
  function chair(B, ctx, sp, face) {
    var p = pen(sp), k = sp.k, f = face || -1, W = '#4a3024', Wh = '#6e4a34';
    function rod(a, b, w, c) { var A = p(a[0] * f, a[1]), Z = p(b[0] * f, b[1]); B.capsule(A[0], A[1], Z[0], Z[1], w * k, w * k, c); }
    rod([-9, 0], [-8, -46], 2.2, W);
    for (var i = 0; i < 18; i++) {
      var a = i / 18, a2 = (i + 1) / 18;
      rod([-8 - Math.sin(a * 2.6) * 3, -46 - a * 36], [-8 - Math.sin(a2 * 2.6) * 3, -46 - a2 * 36], 2.6, W);
    }
    rod([-10.4, -74], [-7.6, -52], 1.4, Wh);
    rod([-9, -16], [8, -16], 1.4, Wh);
    rod([8, 0], [8, -45], 2.2, W);
    B.ellipse(p(0, -46)[0], p(0, -46)[1], 12 * k, 2.6 * k, 0, function (x, y, dx, dy) { return dy < 0 ? '#86593c' : '#5a3a2a'; });
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 14 * k, ry: 3.4 * k, f: 0.55 });
  }

  // 吊篮绿萝：天花板一个钩子 → 三根麻绳 → 陶盆（高度 potF，按屏幕比例）→ 几条藤垂下来
  function hanging(B, ctx, x, D, potF) {
    var L = ctx.L, s = L.s, dd = cafeDepth(L, D * s), k = dd.k * L.ps;
    var hookY = L.VPy - (L.VPy - L.CEIL) * dd.k, potY = L.Y(potF || 0.2), pw = 11 * k;
    [-1, 0, 1].forEach(function (i) { B.line(x, hookY, x + i * pw, potY - 3 * k, '#c9b38a'); });
    B.poly([[x - pw, potY - 3 * k], [x + pw, potY - 3 * k], [x + pw * 0.75, potY + 9 * k], [x - pw * 0.75, potY + 9 * k]], function (xx, yy) { return xx < x - pw * 0.3 ? '#b8683f' : yy < potY - 1 * k ? '#d58258' : '#c47148'; });
    for (var v = 0; v < 6; v++) {
      var vx = x + (v - 2.5) * 4 * k, len = (30 + rnd(v, 31) * 60) * k, sw = rnd(v, 32) * 6;
      for (var t = 0; t < len; t += 1) {
        var px = vx + Math.sin(t / (9 * k) + sw) * 3 * k + (v - 2.5) * t * 0.05, py = potY + 2 * k + t;
        B.px(px, py, '#3e6a36');
        if (Math.floor(t / (6 * k)) !== Math.floor((t - 1) / (6 * k))) {
          var side = Math.floor(t / (6 * k)) % 2 ? 1 : -1;
          B.ellipse(px + side * 2.4 * k, py + 1 * k, 2.6 * k, 1.8 * k, side * 0.5, function (xx, yy, dx, dy) { return dy < 0 ? '#6aa052' : '#4f873e'; });
        }
      }
    }
    for (var l = 0; l < 9; l++) {
      var lx = x + (rnd(l, 33) - 0.5) * 2 * pw * 1.1, ly = potY - 4 * k - rnd(l, 34) * 5 * k;
      B.ellipse(lx, ly, 3 * k, 2 * k, (rnd(l, 35) - 0.5), function (xx, yy, dx, dy) { return dy < 0 ? '#74ad5a' : '#528a42'; });
    }
  }

  // 窗顶的小灯串：两根窗框之间往下垂一道弧，灯泡每隔一段一个；亮的时候画进 ctx.E 加光晕
  function fairy(B, ctx) {
    var L = ctx.L, s = L.s, win = L.win, y0 = win.top + win.fw + 3 * s, on = ctx.T.id !== 'day';
    for (var i = 0; i + 1 < win.mull.length; i++) {
      var a = win.mull[i], b = win.mull[i + 1], n = Math.max(4, Math.round((b - a) / (13 * s)));
      for (var x = a; x <= b; x++) { var t = (x - a) / (b - a); B.px(x, y0 + Math.sin(t * Math.PI) * 14 * s, '#3b3530'); }
      for (var j = 1; j < n; j++) {
        var t2 = j / n, bx = a + (b - a) * t2, by = y0 + Math.sin(t2 * Math.PI) * 14 * s + 2 * s;
        if (on) {
          ctx.E.rect(bx - s * 0.5, by - s * 0.5, Math.max(1, s * 1.4), Math.max(1, s * 1.8), j % 3 ? '#ffe3a0' : '#ffd1a0');
          ctx.E.glow(bx, by, 1, 6 * s, '#ffcf7a', ctx.T.id === 'night' ? 0.28 : 0.16);
          ctx.fx.push({ kind: 'bulb', x: bx, y: by, s: s, seed: i * 20 + j });
        } else B.rect(bx - s * 0.5, by - s * 0.5, Math.max(1, s * 1.4), Math.max(1, s * 1.8), '#d8d2c4');
      }
      if (on) ctx.lights.push({ x: (a + b) / 2, y: y0 + 10 * s, rx: (b - a) * 0.6, ry: 30 * s, col: [0.5, 0.36, 0.2], k: 0.35, on: 'warm' });
    }
  }

  function cafeWindowSeat(B, ctx) {
    var L = ctx.L, ps = L.ps;
    fairy(B, ctx);
    hanging(B, ctx, L.X(0.03), 70);
    var bn = bench(B, ctx, L.X(-0.2), L.X(0.2));
    // 抱枕靠在玻璃上（坐垫后沿），猫睡在左边，桌子在右前方
    var py = bn.topB - 12 * ps;
    pillow(B, L.X(-0.005), py, ps, -0.12, 0);
    pillow(B, L.X(0.105), py + 1 * ps, ps, 0.1, 1);
    pillow(B, L.X(0.182), py, ps, 0.14, 2);
    var tail = cat(B, ctx, { x: L.X(0.072), y: (bn.topB + bn.topF) / 2 + 1 * ps, k: ps * 1.02 });
    table(B, ctx, cafeSpot(L, 0.142, 150));
    chair(B, ctx, cafeSpot(L, 0.21, 172), -1);
    tailOcclusion(B, tail.occ);   // 猫前面的东西都画完了：记下哪些像素挡着甩动的尾巴尖
  }

  PX.provide('04-cafe-window', { CAFE_TAIL_FIX: CAT_TAIL_FIX, cafeCatTail: catTail, cafeChair: chair, cafeHanging: hanging, cafeWindowSeat: cafeWindowSeat });
})(window.__abPixel = window.__abPixel || {});
