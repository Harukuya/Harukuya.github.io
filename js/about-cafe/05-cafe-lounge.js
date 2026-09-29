// 05-cafe-lounge：窗前的休息区
// 左边：窗边一架望远镜（木三脚架、奶白镜筒、黄铜箍，斜指着窗外的天）；前面一张胡桃木小圆桌——一台打开的笔记本（屏幕上是代码，夜里发光）、
//          一杯卡布奇诺、一本笔记本 + 笔、一小盆多肉；桌子两边各一把曲木椅；桌子上方一盏藤编吊灯。
// 右边：一张墨绿丝绒的高背单人沙发（扶手上搭着一条米白针织毯、一个芥末黄靠垫），旁边一盏三脚落地灯（米白灯罩）、
//          一张小边几（一摞书、一只冒热气的马克杯、一副眼镜）；砖柱边靠着一把木吉他；窗前再吊一盆绿萝。
(function (PX) {
  'use strict';

  PX.need('05-cafe-lounge', ['cafeChair', 'cafeDepth', 'cafeHanging', 'cafeHot', 'cafeSpot']);
  var cafeChair = PX.cafeChair, cafeDepth = PX.cafeDepth, cafeHanging = PX.cafeHanging, cafeHot = PX.cafeHot, cafeSpot = PX.cafeSpot;

  function pen(sp) { return function (ux, uy) { return [sp.x + ux * sp.k, sp.y + uy * sp.k]; }; }
  // 粗线段（两头圆）
  function bar(B, a, b, w, c) { B.capsule(a[0], a[1], b[0], b[1], w, w, c); }

  function telescope(B, ctx, sp) {
    var p = pen(sp), k = sp.k, top = p(0, -92);
    // 三脚架：两条腿在前，一条在后（暗一点）
    bar(B, top, p(-4, 0), 2.2 * k, '#5a3e2c');
    bar(B, top, p(-20, 0), 2.6 * k, '#7a5438');
    bar(B, top, p(18, 0), 2.6 * k, '#86603f');
    bar(B, p(-12, -34), p(11, -34), 1.2 * k, '#6a4a34');
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 24 * k, ry: 4 * k, f: 0.6 });
    // 云台：三脚架顶上一块深色的托架，往上托住镜筒（镜筒的支点 M 在托架顶上）
    var M = [top[0], top[1] - 7 * k];
    B.disc(top[0], top[1] - 1 * k, 3.4 * k, '#3a3739');
    B.poly([[top[0] - 2.6 * k, top[1] - 1 * k], [top[0] + 2.6 * k, top[1] - 1 * k], [M[0] + 2 * k, M[1]], [M[0] - 2 * k, M[1]]], function (x) { return x < top[0] - 0.8 * k ? '#4a474b' : '#2f2d30'; });
    // 镜筒：朝左上 34°，支点在离目镜那头 36% 处；目镜那头在右下
    var ang = -Math.PI + 0.6, dx = Math.cos(ang), dy = Math.sin(ang), c0 = [M[0] - dx * 74 * k * 0.36, M[1] - dy * 74 * k * 0.36];
    var c1 = [c0[0] + dx * 74 * k, c0[1] + dy * 74 * k], nx = -dy, ny = dx;
    B.poly([[c0[0] + nx * 4 * k, c0[1] + ny * 4 * k], [c1[0] + nx * 5.2 * k, c1[1] + ny * 5.2 * k], [c1[0] - nx * 5.2 * k, c1[1] - ny * 5.2 * k], [c0[0] - nx * 4 * k, c0[1] - ny * 4 * k]],
      function (x, y) { var q = (x - c0[0]) * nx + (y - c0[1]) * ny; return q < -1.5 * k ? '#f6f2ea' : q > 2.5 * k ? '#bdb6aa' : '#e6e0d4'; });
    [0.12, 0.55, 0.96].forEach(function (t) {
      var bx = c0[0] + dx * 74 * k * t, by = c0[1] + dy * 74 * k * t, hw = (4.4 + t * 1.2) * k;
      bar(B, [bx + nx * hw, by + ny * hw], [bx - nx * hw, by - ny * hw], 2.2 * k, t > 0.9 ? '#b8903c' : '#d0a74c');
    });
    bar(B, c0, [c0[0] - dx * 7 * k, c0[1] - dy * 7 * k], 2.4 * k, '#2d2b2e');                  // 目镜
    bar(B, [c0[0] + dx * 30 * k + nx * 7 * k, c0[1] + dy * 30 * k + ny * 7 * k], [c0[0] + dx * 46 * k + nx * 7 * k, c0[1] + dy * 46 * k + ny * 7 * k], 2 * k, '#d9d3c6');   // 寻星镜
    // 抱住镜筒的深色抱箍（就在托架顶上）
    var hw = 5.2 * k;
    bar(B, [M[0] + nx * hw, M[1] + ny * hw], [M[0] - nx * hw, M[1] - ny * hw], 3 * k, '#2f2d30');
    B.disc(M[0] - nx * hw * 0.2, M[1] - ny * hw * 0.2, 1.2 * k, '#6a676c');
    cafeHot(ctx, 'scope', [c0, c1, p(-20, 0), p(18, 0)], 2);
  }

  // 胡桃木小圆桌 + 笔记本电脑、卡布奇诺、本子、多肉
  function bistro(B, ctx, sp) {
    var p = pen(sp), k = sp.k, T = ctx.T;
    B.poly([p(-13, 0), p(13, 0), p(9, -3), p(-9, -3)], '#2b292c');
    B.rect(p(-1.8, -70)[0], p(-1.8, -70)[1], 3.6 * k, 68 * k, '#3a373b');
    var c = p(0, -72), rx = 25 * k, ry = 5.5 * k;
    B.ellipse(c[0], c[1] + 2.4 * k, rx, ry, 0, '#4a2e20');
    B.ellipse(c[0], c[1], rx, ry, 0, function (x, y, dx, dy) { return dy < -ry * 0.35 ? '#8a5a3c' : Math.sin(dx * 0.5 + dy) > 0.9 ? '#6a432d' : '#7a4f35'; });
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 22 * k, ry: 5 * k, f: 0.5 });
    // 笔记本：底座（银灰）+ 屏幕（斜着朝向镜头，上面几行彩色代码）
    var lb = p(-6, -73);
    B.poly([[lb[0] - 11 * k, lb[1] + 1.5 * k], [lb[0] + 8 * k, lb[1] + 1.5 * k], [lb[0] + 10 * k, lb[1] - 1.5 * k], [lb[0] - 9 * k, lb[1] - 1.5 * k]], '#b9bcc4');
    B.poly([[lb[0] - 9 * k, lb[1] - 1.5 * k], [lb[0] + 10 * k, lb[1] - 1.5 * k], [lb[0] + 8.5 * k, lb[1] - 16 * k], [lb[0] - 10.5 * k, lb[1] - 16 * k]], '#8e929c');
    var sx0 = lb[0] - 9 * k, sy0 = lb[1] - 14.8 * k, lines = [['#7fc4ff', 0.5], ['#e6c07a', 0.8], ['#c792ea', 0.35], ['#9be39f', 0.7], ['#7fc4ff', 0.55], ['#e6c07a', 0.45], ['#f07f8a', 0.6]];
    var night = T.id === 'night' || T.id === 'dusk', scr = night ? ctx.E : B;
    scr.poly([[lb[0] - 8.2 * k, lb[1] - 2.6 * k], [lb[0] + 9 * k, lb[1] - 2.6 * k], [lb[0] + 7.7 * k, lb[1] - 15 * k], [lb[0] - 9.5 * k, lb[1] - 15 * k]], night ? '#1d2233' : '#2a3040');
    lines.forEach(function (ln, i) {
      var yy = sy0 + (1.3 + i * 1.6) * k, x0 = sx0 + (0.8 + (i % 3 === 2 ? 2 : i % 2)) * k + (15 - i) * 0.08 * k;
      scr.rect(x0, yy, Math.max(1, ln[1] * 11 * k), Math.max(1, 0.7 * k), ln[0]);
    });
    if (night) {
      ctx.E.glow(lb[0], lb[1] - 9 * k, 3 * k, 22 * k, '#9fc6ff', 0.14);
      ctx.lights.push({ x: lb[0], y: lb[1] - 4 * k, rx: 26 * k, ry: 12 * k, col: [0.3, 0.42, 0.7], k: 0.6, on: 'always' });
    }
    ctx.fx.push({ kind: 'cursor', x: sx0 + 3 * k, y: sy0 + (1.3 + 7 * 1.6) * k, k: k, E: night });
    // 卡布奇诺（右边）
    var cc = p(14, -73);
    B.ellipse(cc[0], cc[1] + 1.2 * k, 5.5 * k, 1.5 * k, 0, '#e4e0da');
    B.poly([[cc[0] - 3.6 * k, cc[1] - 5.4 * k], [cc[0] + 3.6 * k, cc[1] - 5.4 * k], [cc[0] + 2.8 * k, cc[1] + 0.6 * k], [cc[0] - 2.8 * k, cc[1] + 0.6 * k]], function (x) { return x > cc[0] + 1.2 * k ? '#d6d2cc' : '#f8f6f2'; });
    B.ellipse(cc[0], cc[1] - 5.4 * k, 3.6 * k, 1.2 * k, 0, '#e9d8bf');
    ctx.fx.push({ kind: 'steam', x: cc[0], y: cc[1] - 6.5 * k, k: k, lit: true });
    // 本子 + 笔（前沿）、一小盆多肉（左后）
    var nb = p(8, -70.5);
    B.poly([[nb[0] - 5 * k, nb[1]], [nb[0] + 4 * k, nb[1] - 0.8 * k], [nb[0] + 5 * k, nb[1] + 1.6 * k], [nb[0] - 4 * k, nb[1] + 2.4 * k]], '#e9c36a');
    B.line(nb[0] - 3 * k, nb[1] + 1.6 * k, nb[0] + 4 * k, nb[1] - 0.2 * k, '#2d3a5c');
    var sc = p(-20, -73);
    B.poly([[sc[0] - 3 * k, sc[1] - 4 * k], [sc[0] + 3 * k, sc[1] - 4 * k], [sc[0] + 2.4 * k, sc[1]], [sc[0] - 2.4 * k, sc[1]]], '#e8e2d6');
    for (var i = 0; i < 5; i++) B.ellipse(sc[0] + (i - 2) * 1.5 * k, sc[1] - 5 * k - Math.abs(i - 2) * -0.6 * k, 1.4 * k, 2.4 * k, (i - 2) * 0.4, i % 2 ? '#7fa889' : '#98bf9c');
  }

  // 吊灯：藤编的半球灯罩（小圆桌上方）/ 乳白玻璃球（沙发那边）；从屏幕顶上垂下来的线；亮的时候灯罩下沿发光 + 地上一片光
  function pendant(B, ctx, x, y, k, kind, D) {
    var L = ctx.L, T = ctx.T, on = T.lamps > 0;
    var dd = cafeDepth(L, D * L.s), hookY = L.VPy - (L.VPy - L.CEIL) * dd.k;
    B.line(x, Math.max(0, hookY), x, y - 12 * k, '#2a2624');
    if (kind === 'rattan') {
      B.ellipse(x, y, 16 * k, 13 * k, 0, function (xx, yy, dx, dy) {
        if (dy > 0) return null;
        var weave = (Math.floor((dx + 40) / (2 * k)) + Math.floor((dy + 40) / (2 * k))) % 2;
        return dx < -5 * k ? (weave ? '#8a6a44' : '#7a5c3a') : (weave ? '#c49a62' : '#b08850');
      });
      B.rect(x - 3 * k, y - 15 * k, 6 * k, 3 * k, '#3a3430');
      if (on) {
        ctx.E.ellipse(x, y, 13 * k, 3 * k, 0, function (xx, yy, dx, dy) { return dy < 0 ? null : '#ffe6a8'; });
        ctx.E.glow(x, y + 2 * k, 4 * k, 34 * k, '#ffc978', 0.22 * T.lamps);
      } else B.ellipse(x, y, 13 * k, 2.4 * k, 0, function (xx, yy, dx, dy) { return dy < 0 ? null : '#5a4a3a'; });
    } else {
      B.rect(x - 2 * k, y - 12 * k, 4 * k, 3 * k, '#b8903c');
      if (on) {
        ctx.E.disc(x, y, 9 * k, function (xx, yy, dx, dy) { return Math.hypot(dx + 3 * k, dy + 3 * k) < 3 * k ? '#fffbef' : '#ffeac0'; });
        ctx.E.glow(x, y, 9 * k, 36 * k, '#ffd28a', 0.25 * T.lamps);
      } else B.disc(x, y, 9 * k, function (xx, yy, dx, dy) { return Math.hypot(dx + 3 * k, dy + 3 * k) < 3 * k ? '#ffffff' : dx > 3 * k ? '#cfd0cc' : '#ebebe6'; });
    }
  }

  // 高背单人沙发（正面）：两侧翼、扶手、坐垫、短木腿；右扶手搭一条针织毯，坐垫上一个芥末黄靠垫
  function armchair(B, ctx, sp) {
    var p = pen(sp), k = sp.k, V = '#3f6b5f', Vd = '#2e5249', Vh = '#548577';
    [-30, 30].forEach(function (lx) { B.rect(p(lx - 2, -6)[0], p(lx - 2, -6)[1], 4 * k, 6 * k, '#4a2f22'); });
    // 靠背（上沿微微拱起）+ 两侧翼
    B.poly([p(-27, -44), p(-27, -100), p(-18, -108), p(0, -111), p(18, -108), p(27, -100), p(27, -44)], function (x, y) {
      var dx = (x - sp.x) / k;
      if (Math.abs(dx) > 20) return dx < 0 ? Vh : Vd;
      return Math.abs(((dx + 30) % 10) - 5) < 0.6 ? Vd : V;
    });
    // 扶手（卷边）
    [-1, 1].forEach(function (sd) {
      B.poly([p(sd * 36, -6), p(sd * 36, -54), p(sd * 33, -60), p(sd * 24, -60), p(sd * 22, -54), p(sd * 22, -6)], function (x, y) {
        var t = ((x - sp.x) / k - sd * 22) * sd;
        return y < p(0, -55)[1] ? Vh : t > 11 ? Vd : V;
      });
    });
    // 坐垫 + 座前沿
    B.poly([p(-22, -46), p(22, -46), p(23, -38), p(-23, -38)], '#4d7d70');
    B.poly([p(-23, -38), p(23, -38), p(23, -8), p(-23, -8)], function (x, y) { return y < p(0, -34)[1] ? V : Vd; });
    // 芥末黄靠垫
    B.ellipse(p(-8, -54)[0], p(-8, -54)[1], 10 * k, 8 * k, -0.2, function (x, y, dx, dy) { return dx + dy < -4 * k ? '#e0b456' : dx + dy > 6 * k ? '#a8792e' : '#cc9d45'; });
    // 针织毯：从右扶手上垂下来，一道道麻花纹
    B.poly([p(18, -62), p(38, -60), p(40, -18), p(34, -12), p(28, -16), p(26, -52)], function (x, y) {
      var u = (x - sp.x) / k, v = (y - sp.y) / k, cable = Math.abs(((u + v * 0.15) % 5) - 2.5) < 0.9;
      return u > 36 ? '#cbbfa6' : cable ? '#e2d7bf' : '#efe6d2';
    });
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 42 * k, ry: 6 * k, f: 0.5 });
  }

  function floorLamp(B, ctx, sp) {
    var p = pen(sp), k = sp.k, T = ctx.T, on = T.lamps > 0, top = p(0, -150);
    bar(B, p(0, -40), p(-12, 0), 1.6 * k, '#6a4a34'); bar(B, p(0, -40), p(11, 0), 1.6 * k, '#7a5438'); bar(B, p(0, -40), p(-1, -2), 1.4 * k, '#5a3e2c');
    bar(B, p(0, -40), top, 1.6 * k, '#b8903c');
    var sy = top[1] - 2 * k;
    B.poly([[top[0] - 11 * k, sy - 18 * k], [top[0] + 11 * k, sy - 18 * k], [top[0] + 15 * k, sy], [top[0] - 15 * k, sy]], function (x) { return x > top[0] + 6 * k ? '#d8cbb0' : '#efe3c8'; });
    if (on) {
      ctx.E.poly([[top[0] - 11 * k, sy - 18 * k], [top[0] + 11 * k, sy - 18 * k], [top[0] + 15 * k, sy], [top[0] - 15 * k, sy]], function () { return ['#ffe9bc', 0.55 * T.lamps + 0.2]; });
      ctx.E.rect(top[0] - 14 * k, sy - 1 * k, 28 * k, 1.4 * k, '#fff4d6');
      ctx.E.glow(top[0], sy - 8 * k, 12 * k, 44 * k, '#ffcf86', 0.2 * T.lamps);
      ctx.lights.push({ x: top[0], y: sy + 30 * k, rx: 70 * k, ry: 60 * k, col: [1, 0.72, 0.4], k: 0.8, on: 'lamps' });
      ctx.lights.push({ x: top[0], y: sp.y, rx: 60 * k, ry: 14 * k, col: [0.9, 0.6, 0.3], k: 0.5, on: 'lamps' });
    }
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 14 * k, ry: 3 * k, f: 0.6 });
  }

  function sideTable(B, ctx, sp) {
    var p = pen(sp), k = sp.k;
    bar(B, p(0, -2), p(0, -46), 2.6 * k, '#5a3e2c');
    B.ellipse(p(0, 0)[0], p(0, 0)[1], 9 * k, 2 * k, 0, '#4a3326');
    var c = p(0, -48);
    B.ellipse(c[0], c[1] + 1.8 * k, 14 * k, 3.4 * k, 0, '#5a3e2c');
    B.ellipse(c[0], c[1], 14 * k, 3.4 * k, 0, '#8a6244');
    [['#8a3f3a', 12, 3], ['#3f5f7a', 11, 2.6], ['#d9b45a', 10, 2.4]].forEach(function (bk, i) {
      var by = c[1] - 1.5 * k - i * 2.7 * k, bx = c[0] - 4 * k + (i % 2 ? 1.2 : -0.6) * k;
      B.rect(bx - bk[1] / 2 * k, by - bk[2] * k, bk[1] * k, bk[2] * k, bk[0]);
      B.rect(bx - bk[1] / 2 * k + 0.6 * k, by - bk[2] * k + 0.6 * k, bk[1] * k - 1.2 * k, Math.max(1, 0.5 * k), '#f1e8d6');
    });
    var mg = p(7, -49);
    B.rect(mg[0] - 2.6 * k, mg[1] - 6 * k, 5.2 * k, 6 * k, '#e8e2d6');
    B.rect(mg[0] - 2.6 * k, mg[1] - 4 * k, 5.2 * k, 1.4 * k, '#c05a3c');
    B.ellipse(mg[0], mg[1] - 6 * k, 2.6 * k, 0.9 * k, 0, '#3a2418');
    ctx.fx.push({ kind: 'steam', x: mg[0], y: mg[1] - 7 * k, k: k, lit: true });
    B.ellipse(p(-6, -49.5)[0], p(-6, -49.5)[1], 1.6 * k, 1 * k, 0, '#2a2a30');
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 12 * k, ry: 3 * k, f: 0.55 });
  }

  // 木吉他：靠在砖柱左边，稍微歪着
  function guitar(B, ctx, sp) {
    var k = sp.k, a = 0.16, c = Math.cos(a), sn = Math.sin(a);
    function G(u, v) { return [sp.x + (u * c - v * sn) * k, sp.y + (u * sn + v * c) * k]; }
    var body = function (cy, r) { var q = G(0, cy); B.ellipse(q[0], q[1], r * k, r * 0.95 * k, a, function (x, y, dx, dy) { return dx < -r * 0.5 * k ? '#a8663a' : '#cf8a4c'; }); };
    body(-14, 14); body(-37, 11);
    B.ellipse(G(0, -30)[0], G(0, -30)[1], 4 * k, 4 * k, 0, '#2a1a12');
    B.poly([G(-5, -10), G(5, -10), G(5, -6), G(-5, -6)], '#3a2418');
    B.poly([G(-2, -46), G(2, -46), G(1.6, -98), G(-1.6, -98)], '#6a4228');
    B.poly([G(-3, -98), G(3, -98), G(2.6, -108), G(-2.6, -108)], '#3a2418');
    for (var i = 0; i < 3; i++) B.line(G(-0.8 + i * 0.8, -8)[0], G(-0.8 + i * 0.8, -8)[1], G(-0.8 + i * 0.8, -98)[0], G(-0.8 + i * 0.8, -98)[1], '#e8e2d0', 0.6);
    ctx.shadows.push({ x: sp.x, y: sp.y + 1, rx: 14 * k, ry: 3 * k, f: 0.6 });
    cafeHot(ctx, 'guitar', [G(-14, -2), G(14, -2), G(-4, -108), G(4, -108)], 2);
  }

  function cafeLounge(B, ctx) {
    var L = ctx.L;
    cafeHanging(B, ctx, L.X(0.43), 40, 0.14);
    telescope(B, ctx, cafeSpot(L, 0.252, 32));
    guitar(B, ctx, cafeSpot(L, 0.574, 12));
    floorLamp(B, ctx, cafeSpot(L, 0.548, 36));
    armchair(B, ctx, cafeSpot(L, 0.47, 52));
    sideTable(B, ctx, cafeSpot(L, 0.528, 80));
    cafeChair(B, ctx, cafeSpot(L, 0.27, 186), 1);
    bistro(B, ctx, cafeSpot(L, 0.325, 172));
    cafeChair(B, ctx, cafeSpot(L, 0.382, 184), -1);
    var sp = cafeSpot(L, 0.325, 172);
    pendant(B, ctx, L.X(0.325), L.Y(0.3), sp.k * 0.85, 'rattan', 172);
    if (ctx.T.lamps > 0) ctx.lights.push({ x: L.X(0.325), y: sp.y - 72 * sp.k, rx: 60 * sp.k, ry: 26 * sp.k, col: [1, 0.74, 0.42], k: 0.9, on: 'lamps' });
    if (ctx.T.lamps > 0) ctx.lights.push({ x: L.X(0.325), y: L.Y(0.3), rx: 50 * sp.k, ry: 40 * sp.k, col: [0.8, 0.6, 0.35], k: 0.5, on: 'lamps' });
    pendant(B, ctx, L.X(0.46), L.Y(0.2), cafeSpot(L, 0.46, 60).k * 0.8, 'globe', 60);
    if (ctx.T.lamps > 0) ctx.lights.push({ x: L.X(0.46), y: L.Y(0.2), rx: 60 * L.ps, ry: 50 * L.ps, col: [0.9, 0.7, 0.4], k: 0.6, on: 'lamps' });
  }

  PX.provide('05-cafe-lounge', { cafeLounge: cafeLounge });
})(window.__abPixel = window.__abPixel || {});
