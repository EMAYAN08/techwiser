(function () {
  var roots = document.querySelectorAll("[data-carousel]");
  if (!roots.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INTERVAL = 5000;

  roots.forEach(function (root) {
    var track = root.querySelector(".carousel-track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel-slide"));
    var dots = Array.prototype.slice.call(root.querySelectorAll(".carousel-dot"));
    var prevBtn = root.querySelector("[data-carousel-prev]");
    var nextBtn = root.querySelector("[data-carousel-next]");
    var status = root.querySelector("[data-carousel-status]");
    if (!track || slides.length < 1) return;

    var total = slides.length;
    var index = 0;
    var timer = null;

    function caption(i) {
      return slides[i].getAttribute("data-caption") || ("Slide " + (i + 1));
    }

    function go(to) {
      index = ((to % total) + total) % total;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      slides.forEach(function (slide, i) {
        slide.setAttribute("aria-hidden", i === index ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        if (i === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      if (status) {
        status.textContent =
          "Showing " + caption(index) + ", slide " + (index + 1) + " of " + total;
      }
    }

    function next() { go(index + 1); }
    function prev() { go(index - 1); }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      stop();
      if (reduceMotion || total < 2) return;
      timer = setInterval(next, INTERVAL);
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); start(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); start(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { go(i); start(); });
    });

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) start();
    });
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); start(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); start(); }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    go(0);
    start();
  });
})();
