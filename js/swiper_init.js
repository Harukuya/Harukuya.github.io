// 首页轮播（hexo-butterfly-swiper）的初始化。原来直接用 npm.elemecdn.com/hexo-butterfly-swiper/lib/swiper_init.js，搬到本地（_config.yml 的 swiper.custom_js），
// 内容照旧，只多做一件事：轮播的两份样式（swiper.min.css、swiperstyle.css）是异步加载的（media="print" onload），第一次访问没缓存时常常比这里晚到；
// Swiper 初始化时按当时（还没样式）的排版记下每一张的位置，样式到了也不会自己重算，结果整块空白，要刷新一次（样式有了缓存）才正常。
// 所以等这两份样式加载完、整页 load 之后，各让它重新量一次（swiper.update()）
var swiper = new Swiper('.blog-slider', {
  passiveListeners: true,
  spaceBetween: 30,
  effect: 'fade',
  loop: true,
  autoplay: {
    disableOnInteraction: true,
    delay: 3000
  },
  mousewheel: true,
  // autoHeight: true,
  pagination: {
    el: '.blog-slider__pagination',
    clickable: true,
  }
});

(function () {
  if (!document.querySelector('.blog-slider') || !swiper || !swiper.initialized) return;
  var s = swiper, again = function () { if (!s.destroyed) s.update(); };
  [].forEach.call(document.querySelectorAll('link[href*="hexo-butterfly-swiper"]'), function (l) {
    if (l.media === 'print' || !l.sheet) l.addEventListener('load', again);   // 还没加载完的那份：到了再量
  });
  if (document.readyState !== 'complete') window.addEventListener('load', again);
})();

var comtainer = document.getElementById('swiper_container');
  if (comtainer !== null) {
    comtainer.onmouseenter = function() {
      swiper.autoplay.stop();
    };
    comtainer.onmouseleave = function() {
      swiper.autoplay.start();
      }
  } else {}
