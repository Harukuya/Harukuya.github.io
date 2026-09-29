// About 页像素 Hero · 11-voyage：hero 退场 / 返回时用的一块画布——满屏星空、跃迁穿梭、像素地球（一路推近到上海）。
// 只负责「画」：每一帧画成什么样（星星多亮、飞多快、背景多暗、闪白、地球多大）由 about.js 的 initHeroVoyage 按时间轴给参数。
// 像素大小和 hero 一样（CSS 按整数倍放大、最近邻取样）；对外只暴露 window.AboutVoyage = { preload, create }。
// 地球贴图 /img/about/earth-map.png：NASA Visible Earth「Blue Marble」（公有领域）2048×1024 等距圆柱投影图，按像素风调色板重新配色（11 色 + 海岸带）
(function (PX) {
  'use strict';

  PX.need('11-voyage', ['clamp', 'fbm2', 'mulberry']);
  var clamp = PX.clamp, fbm2 = PX.fbm2, mulberry = PX.mulberry;

  var MAP_SRC = '/img/about/earth-map.png';
  var D2R = Math.PI / 180;
  var LAT0 = 31.23 * D2R, LON0 = 121.47 * D2R;          // 上海：地球正对镜头的那一点，推近时一直在画面正中
  var SIN0 = Math.sin(LAT0), COS0 = Math.cos(LAT0);
  var SUN = norm([-0.55, -0.5, 0.67]);                   // 光从左上前方来，右下是夜面
  var HALF = norm([SUN[0], SUN[1], SUN[2] + 1]);        // 海面高光方向
  // 星星的颜色和 hero 星空同一套
  var STAR_COLS = [[255, 255, 255], [255, 122, 217], [111, 224, 255], [255, 226, 106], [122, 154, 255], [200, 170, 255], [255, 255, 255]];

  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }

  // ---------- 贴图：地表（像素调色板）+ 云（程序生成，只算一次）----------
  var earth = null, loading = null;
  var CW = 768, CH = 384;

  // 云图：等距圆柱投影，每格取球面上那一点的三维坐标喂给二维噪声——经度 ±180° 接缝两边是同一点，云不会断开
  function cloudMap() {
    var c = new Uint8Array(CW * CH);
    for (var v = 0; v < CH; v++) {
      var lat = (0.5 - (v + 0.5) / CH) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      // 中纬度云多、副热带少一点、两极带一圈
      var belt = 0.08 * Math.cos(lat * 4) - 0.03;
      for (var u = 0; u < CW; u++) {
        var lon = ((u + 0.5) / CW) * Math.PI * 2 - Math.PI;
        var X = cl * Math.cos(lon), Y = cl * Math.sin(lon), Z = sl;
        var n = fbm2(X * 2.6 + Z * 1.7 + 9, Y * 2.6 - Z * 1.3 + 3, 71) * 0.7 + fbm2(X * 7 + Z * 3, Y * 7 - Z * 5, 73) * 0.3;
        c[v * CW + u] = clamp(Math.round((n + belt) * 255), 0, 255);
      }
    }
    return c;
  }

  function preload() {
    if (earth) return Promise.resolve(earth);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var img = document.createElement('img');
      img.decoding = 'async';
      img.onload = function () {
        var cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        var x = cv.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        var d = x.getImageData(0, 0, cv.width, cv.height).data;
        var n = cv.width * cv.height, sea = new Uint8Array(n);
        for (var i = 0; i < n; i++) sea[i] = d[i * 4 + 2] > d[i * 4] + 50 ? 1 : 0;   // 调色板里的三种海蓝都是 B 远大于 R
        earth = { w: cv.width, h: cv.height, d: d, sea: sea, cloud: cloudMap() };
        resolve(earth);
      };
      img.onerror = function () { loading = null; reject(new Error('about-voyage: 地球贴图加载失败')); };
      img.src = MAP_SRC;
    });
    return loading;
  }

  // ---------- 画布 ----------
  function create(host, opts) {
    opts = opts || {};
    var c = document.createElement('canvas');
    c.className = 'ab-voyage';
    c.setAttribute('aria-hidden', 'true');
    if (opts.before) host.insertBefore(c, opts.before);
    else host.appendChild(c);
    var ctx = c.getContext('2d');
    var W = 0, H = 0, P = 1, img = null, d = null, bg = null;
    var rnd = mulberry(opts.seed || 20260929), stars = [];

    function resize(p) {
      P = p || P;
      W = Math.max(1, Math.ceil(host.clientWidth / P));
      H = Math.max(1, Math.ceil(host.clientHeight / P));
      c.width = W; c.height = H;
      c.style.width = W * P + 'px';
      c.style.height = H * P + 'px';
      img = ctx.createImageData(W, H);
      d = img.data;
      // 深空底色：中间一点点靛蓝，四周近黑（逐像素算好存起来）
      bg = new Uint8Array(W * H * 3);
      var cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var k = Math.min(1, Math.hypot(x - cx, y - cy) / R), o = (y * W + x) * 3;
        bg[o] = Math.round(15 - 10 * k); bg[o + 1] = Math.round(17 - 11 * k); bg[o + 2] = Math.round(44 - 28 * k);
      }
      if (!stars.length) seedStars();
    }

    // 星星放在一个锥形空间里：屏幕位置 = 中心 + (x, y) / z · F。静止时均匀铺满屏幕；z 变小（往前飞）就往外散、拉出光迹
    function spawn(s, z, spread) {
      var F = Math.max(W, H) / 2;
      s.z = z;
      s.x = (rnd() - 0.5) * W / F * spread * z;
      s.y = (rnd() - 0.5) * H / F * spread * z;
      s.b = 0.35 + rnd() * 0.65;
      s.c = STAR_COLS[(rnd() * STAR_COLS.length) | 0];
      s.sp = 0.6 + rnd() * 2.2;
      s.ph = rnd() * 6.28;
      return s;
    }
    function seedStars() {
      var n = Math.round(W * H / 70);
      for (var i = 0; i < n; i++) stars.push(spawn({}, 0.25 + rnd() * 0.75, 1.1));
    }

    function px(x, y, r, g, b, a) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
      var i = (y * W + x) * 4;
      if (a >= 1) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; return; }
      var da = d[i + 3] / 255, oa = a + da * (1 - a);
      d[i] = (r * a + d[i] * da * (1 - a)) / oa;
      d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
      d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
      d[i + 3] = oa * 255;
    }

    function drawStars(f) {
      var F = Math.max(W, H) / 2, cx = W / 2, cy = H / 2, v = f.speed || 0, dt = f.dt || 0;
      var trail = Math.min(0.5, Math.abs(v) * 0.07), still = Math.abs(v) < 0.02;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.z -= v * dt;
        if (v > 0 && s.z < 0.04) spawn(s, 1, 1.1);
        else if (v < 0 && s.z > 1.25) spawn(s, 0.12 + rnd() * 0.2, 1.4);
        var hx = cx + s.x / s.z * F, hy = cy + s.y / s.z * F;
        if (hx < -2 || hy < -2 || hx > W + 2 || hy > H + 2) { if (v > 0) spawn(s, 1, 1.1); continue; }
        var near = clamp(1.25 - s.z, 0.35, 1);
        var a = s.b * near * f.stars;
        if (still) a *= Math.round((0.55 + 0.45 * Math.sin(f.t * s.sp + s.ph)) * 4) / 4;   // 静止时和 hero 的星一样一闪一闪（四档）
        if (a <= 0.02) continue;
        if (still || trail < 0.004) { px(hx, hy, s.c[0], s.c[1], s.c[2], a); continue; }
        // 光迹：从更远处（往前飞时是更靠中心的一侧）拖到星星现在的位置，尾淡头亮
        var tz = v > 0 ? s.z + trail : Math.max(0.04, s.z - trail);
        var tx = cx + s.x / tz * F, ty = cy + s.y / tz * F;
        var n = Math.max(1, Math.ceil(Math.max(Math.abs(hx - tx), Math.abs(hy - ty))));
        for (var k = 0; k <= n; k++) {
          var q = k / n;
          px(tx + (hx - tx) * q, ty + (hy - ty) * q, s.c[0], s.c[1], s.c[2], a * (0.15 + 0.85 * q));
        }
      }
    }

    // 跃迁时画面中间的一团光：一圈圈硬边色阶（不抖动），越往里越亮
    function drawGlow(k) {
      if (k <= 0) return;
      var cx = W / 2, cy = H / 2, R = H * (0.18 + 0.3 * k);
      var x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H, Math.ceil(cy + R));
      for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
        var t = 1 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R;
        if (t <= 0) continue;
        t = Math.ceil(t * 5) / 5;
        px(x, y, 150 + 90 * t, 175 + 70 * t, 255, k * t * t * 0.8);
      }
    }

    // 地球：正交投影，逐像素反算经纬度取贴图；光照分四档硬边色阶 + 夜面；云、海面高光、边缘大气
    function drawEarth(R, alpha, t) {
      if (!earth || R <= 0.5 || alpha <= 0) return;
      var cx = W / 2, cy = H / 2, A = Math.max(1.6 / R, 0.045), RA = R * (1 + A);
      var x0 = Math.max(0, Math.floor(cx - RA)), x1 = Math.min(W, Math.ceil(cx + RA)), y0 = Math.max(0, Math.floor(cy - RA)), y1 = Math.min(H, Math.ceil(cy + RA));
      var TW = earth.w, TH = earth.h, T = earth.d, sea = earth.sea, cloud = earth.cloud, drift = t * 0.012;
      for (var y = y0; y < y1; y++) {
        var ny = (y + 0.5 - cy) / R;
        for (var x = x0; x < x1; x++) {
          var nx = (x + 0.5 - cx) / R, q = nx * nx + ny * ny;
          if (q > 1) {
            // 大气：球外一圈，受光一侧亮
            var h = (Math.sqrt(q) - 1) / A;
            if (h >= 1) continue;
            var lit = clamp(0.35 + (nx * SUN[0] + ny * SUN[1]) / Math.sqrt(q) * 0.9, 0.12, 1);
            var lv = Math.ceil((1 - h) * 3) / 3;
            px(x, y, 120, 176, 255, alpha * lv * lv * 0.75 * lit);
            continue;
          }
          var nz = Math.sqrt(1 - q), yu = -ny;
          var lat = Math.asin(clamp(nz * SIN0 + yu * COS0, -1, 1));
          var lonRel = Math.atan2(nx, nz * COS0 - yu * SIN0);
          var u = (LON0 + lonRel) / (Math.PI * 2) + 0.5;
          u -= Math.floor(u);
          var v = 0.5 - lat / Math.PI;
          var ti = Math.min(TH - 1, (v * TH) | 0) * TW + Math.min(TW - 1, (u * TW) | 0);
          var r = T[ti * 4], g = T[ti * 4 + 1], b = T[ti * 4 + 2];
          var lam = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
          // 云：云图双线性取值再按阈值切（推得很近时轮廓仍是圆润的一格格像素，不会变成一块块方砖）
          var fu = (u + drift) * CW - 0.5, fv = v * CH - 0.5;
          fu -= Math.floor(fu / CW) * CW;
          var iu = fu | 0, iv = Math.max(0, Math.min(CH - 2, Math.floor(fv))), au = fu - iu, av = clamp(fv - iv, 0, 1), iu2 = iu + 1 === CW ? 0 : iu + 1;
          var cvv = (cloud[iv * CW + iu] * (1 - au) + cloud[iv * CW + iu2] * au) * (1 - av) + (cloud[(iv + 1) * CW + iu] * (1 - au) + cloud[(iv + 1) * CW + iu2] * au) * av;
          if (cvv > 157) { var ca = cvv > 177 ? 0.92 : 0.55; r += (238 - r) * ca; g += (243 - g) * ca; b += (250 - b) * ca; }
          else if (sea[ti]) {
            var hs = nx * HALF[0] + ny * HALF[1] + nz * HALF[2];
            if (hs > 0.975) { var sa = hs > 0.992 ? 0.5 : 0.25; r += (200 - r) * sa; g += (222 - g) * sa; b += (255 - b) * sa; }
          }
          var k = lam > 0.42 ? 1 : lam > 0.2 ? 0.86 : lam > 0.04 ? 0.68 : lam > -0.08 ? 0.46 : 0.24;
          r *= k; g *= k; b *= k;
          if (k < 0.3) { r = r * 0.8 + 4; g = g * 0.85 + 8; b = b * 1.05 + 20; }   // 夜面偏蓝
          if (q > 0.9) { var la = (q - 0.9) / 0.1 * 0.55 * clamp(lam + 0.4, 0, 1); r += (150 - r) * la; g += (196 - g) * la; b += (255 - b) * la; }
          px(x, y, r, g, b, alpha);
        }
      }
    }

    // f = { t 秒, dt 本帧秒数, stars 星星亮度 0~1, speed 前进速度（负 = 倒着飞）, dark 深空底色 0~1, glow 中心光 0~1,
    //       flash 闪白 0~1, earth 地球半径（屏幕高的倍数，0 = 不画）, earthA 地球透明度 }
    function draw(f) {
      if (!d) return;
      var dark = clamp(f.dark || 0, 0, 1), i, o;
      if (dark > 0) {
        for (i = 0, o = 0; i < d.length; i += 4, o += 3) { d[i] = bg[o]; d[i + 1] = bg[o + 1]; d[i + 2] = bg[o + 2]; d[i + 3] = dark * 255; }
      } else d.fill(0);
      drawGlow(f.glow || 0);
      drawStars(f);
      if (f.earth > 0) drawEarth(f.earth * H, f.earthA === undefined ? 1 : f.earthA, f.t);
      var fl = clamp(f.flash || 0, 0, 1);
      if (fl > 0) for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) px(x, y, 236, 242, 255, fl);
      ctx.putImageData(img, 0, 0);
    }

    return {
      el: c,
      resize: resize,
      draw: draw,
      destroy: function () {
        c.width = c.height = 0;
        c.remove();
        img = d = bg = null;
        stars = [];
      }
    };
  }

  window.AboutVoyage = { preload: preload, create: create, ready: function () { return !!earth; } };
})(window.__abPixel = window.__abPixel || {});
