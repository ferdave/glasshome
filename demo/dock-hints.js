/* Glass Home web demo — shows that the dock has more apps than fit on screen.
 * DEMO ONLY: the TV app itself doesn't have these.
 *  - Edge fade: apps dissolve into the glass on a side that has more.
 *  - Bounce: the row slides left a little and springs back, showing a glimpse of the next app
 *    (when the home screen opens, then again after 20 s without a key press). */
(function () {
  "use strict";
  var FADE = "200px";
  var CSS =
    ".dh.more-r .dockrow{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - " + FADE + "),transparent);mask-image:linear-gradient(to right,#000 calc(100% - " + FADE + "),transparent)}" +
    ".dh.more-l .dockrow{-webkit-mask-image:linear-gradient(to left,#000 calc(100% - " + FADE + "),transparent);mask-image:linear-gradient(to left,#000 calc(100% - " + FADE + "),transparent)}" +
    ".dh.more-l.more-r .dockrow{-webkit-mask-image:linear-gradient(to right,transparent,#000 " + FADE + ",#000 calc(100% - " + FADE + "),transparent);mask-image:linear-gradient(to right,transparent,#000 " + FADE + ",#000 calc(100% - " + FADE + "),transparent)}" +
    "@keyframes dh-bounce{0%{transform:translateX(0)}30%{transform:translateX(-120px)}55%{transform:translateX(14px)}75%{transform:translateX(-30px)}90%{transform:translateX(4px)}100%{transform:translateX(0)}}" +
    ".dh .dockrow.go>*{animation:dh-bounce 1.1s cubic-bezier(.3,.7,.4,1)}";

  document.addEventListener("DOMContentLoaded", function () {
    var row = document.getElementById("dockRow"), dock = document.getElementById("dock");
    if (!row || !dock) return; // home screen only
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    dock.classList.add("dh");

    function update() {
      var max = row.scrollWidth - row.clientWidth;
      dock.classList.toggle("more-l", row.scrollLeft > 4);
      dock.classList.toggle("more-r", row.scrollLeft < max - 4);
    }
    row.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    new MutationObserver(update).observe(row, { childList: true });
    update();

    var lastKey = Date.now();
    document.addEventListener("keydown", function () { lastKey = Date.now(); }, true);
    function bounce() {
      if (!dock.classList.contains("more-r")) return;
      row.classList.remove("go"); void row.offsetWidth; row.classList.add("go");
    }
    setTimeout(bounce, 1600);
    setInterval(function () { if (Date.now() - lastKey > 20000) { bounce(); lastKey = Date.now(); } }, 2000);
  });
})();
