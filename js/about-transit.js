// 主站点 → 「关于店长」（指向 /about/ 的链接，菜单 / 侧栏 / 作者卡按钮都算）：
// 先在后台预渲染 About 页，顶上那条进度条（pace 的那个小胶囊）跑起来；About 页的星空一画好就在 localStorage 里
// 写一个时间戳（about-transit-ready；预渲染中的页面发的 BroadcastChannel 消息 / storage 事件这边收不到，只能轮询读），
// 这时才切过去——预渲染好的页面瞬间接上，先停在星空上、页面加载完就左右滑入，进度条由 About 页走完、往上收回（source/js/about.js 的 initTransitBar）。
// 只给支持预渲染（Speculation Rules）的浏览器（Chrome / Edge）做；不支持的浏览器这里什么都不做，照常跳转
(function () {
  if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
  var MIN = 600;    // 进度条至少跑这么久（毫秒），太快了看不出跑过
  var MAX = 8000;   // 预渲染没起来 / 太慢：最多等这么久就照常跳
  var busy = false;

  function aboutHref(target) {
    var a = target && target.closest ? target.closest('a[href]') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
    var u = new URL(a.href, location.href);
    return u.origin === location.origin && u.pathname === '/about/' && !u.hash ? u.href : null;
  }

  // 主站本来就有的 pace 进度条；pace 没加载出来就照它的结构造一个（样式在 custom.css 的 .pace）
  function paceBar() {
    var el = document.querySelector('body > .pace');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pace pace-inactive';
      el.innerHTML = '<div class="pace-progress"></div>';
      document.body.appendChild(el);
    }
    return el;
  }

  function setProgress(el, p, ms) {
    var bar = el.querySelector('.pace-progress');
    if (!bar) return;
    bar.style.transition = 'transform ' + (ms || 400) + 'ms ease-out';
    bar.style.transform = 'translate3d(' + p + '%, 0, 0)';
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = aboutHref(e.target);
    if (!href || location.pathname === '/about/') return;
    e.preventDefault();
    e.stopImmediatePropagation();   // 不让 pjax 接手（About 页不是主题页面）
    if (busy) return;
    busy = true;

    var el = paceBar(), t0 = Date.now(), p = 0, gone = false;
    setProgress(el, 0, 0);
    el.classList.remove('pace-inactive');
    el.classList.add('pace-active');
    // 等 ready 期间慢慢往 85% 爬，越往后越慢
    var creep = setInterval(function () {
      p += (85 - p) * 0.12;
      setProgress(el, p.toFixed(1));
    }, 120);

    function go() {
      if (gone) return;
      gone = true;
      clearInterval(creep);
      clearInterval(poll);
      clearTimeout(cap);
      setProgress(el, 90, 250);
      setTimeout(function () { location.href = href; }, Math.max(0, MIN - (Date.now() - t0)));
    }
    // About 页准备好了：它写的时间戳比这次点击晚
    var poll = setInterval(function () {
      var v = 0;
      try { v = +localStorage.getItem('about-transit-ready') || 0; } catch (e) { /* 读不了就等上限时间 */ }
      if (v >= t0) go();
    }, 100);
    var cap = setTimeout(go, MAX);

    var rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({ prerender: [{ source: 'list', urls: [href] }] });
    document.head.appendChild(rules);
  }, true);

  // 从 About 页后退回来（页面是从往返缓存里恢复的）：进度条收起、可以再点
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    busy = false;
    var el = document.querySelector('body > .pace');
    if (el) { el.classList.remove('pace-active'); el.classList.add('pace-inactive'); }
  });
})();
