(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // SINGLE PLACE TO EDIT: where every Register / Sign up button sends people.
  // Default: this site's own registration page (Semkhor + Stripe, per Alex and
  // David). Jeff's old page was https://www.lakewoodranchfc.org/the-legends-camp
  // ---------------------------------------------------------------------
  var REGISTER_URL = "register.html";

  // Camp start for the countdown: Sat Nov 21, 2026, 9:00 AM Eastern
  // (first session per the published schedule: Sat–Sun 9:00am–12:00pm).
  var CAMP_START = new Date("2026-11-21T09:00:00-05:00").getTime();

  document.documentElement.classList.add("js");

  document.querySelectorAll(".js-register-link").forEach(function (el) {
    el.setAttribute("href", REGISTER_URL);
    if (/^https?:/.test(REGISTER_URL)) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    } else {
      el.removeAttribute("target");
      el.removeAttribute("rel");
    }
  });

  // "Coaching that connects" carousel: swipe or scroll natively; the arrows
  // move one slide and switch off at either end.
  var track = document.getElementById("connectTrack");
  var prev = document.getElementById("connectPrev");
  var next = document.getElementById("connectNext");
  if (track && prev && next) {
    var step = function (dir) {
      var slide = track.querySelector(".connect-slide");
      if (!slide) return;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollBy({ left: dir * (slide.getBoundingClientRect().width + gap), behavior: smooth ? "smooth" : "auto" });
    };
    var syncArrows = function () {
      var end = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= end - 2;
    };
    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    track.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows);
    syncArrows();
  }

  // Copy that is waiting for Jeff's approval is in the page with data-proposed
  // and stays hidden. Add ?review=1 to the address to see it, marked "Proposed".
  if (/(?:^|[?&])review=1(?:&|$)/.test(window.location.search)) {
    document.documentElement.classList.add("is-review");
    document.querySelectorAll("[data-proposed]").forEach(function (el) { el.hidden = false; });
  }

  // Mobile nav toggle
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");
  if (toggle && nav) {
    var closeNav = function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
  }

  // Countdown
  var elDays = document.getElementById("cd-days");
  var elHours = document.getElementById("cd-hours");
  var elMins = document.getElementById("cd-mins");
  var elSecs = document.getElementById("cd-secs");
  var countdownEl = document.getElementById("countdown");
  var timer = null;

  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var diff = CAMP_START - Date.now();
    if (diff <= 0) {
      if (countdownEl) countdownEl.hidden = true;
      if (timer) clearInterval(timer);
      return;
    }
    var s = Math.floor(diff / 1000);
    elDays.textContent = Math.floor(s / 86400);
    elHours.textContent = pad(Math.floor((s % 86400) / 3600));
    elMins.textContent = pad(Math.floor((s % 3600) / 60));
    elSecs.textContent = pad(s % 60);
  }
  if (elDays && elHours && elMins && elSecs) {
    tick();
    timer = setInterval(tick, 1000);
  }

  // Click-to-play archive video (loads only when asked for)
  var playBtn = document.getElementById("archivePlay");
  var frame = document.getElementById("archiveFrame");
  var videoWrap = document.getElementById("archiveVideoWrap");
  var video = document.getElementById("archiveVideo");
  if (playBtn && frame && videoWrap && video) {
    playBtn.addEventListener("click", function () {
      frame.hidden = true;
      videoWrap.hidden = false;
      video.focus();
      video.play().catch(function () {});
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal-on-scroll + mobile sticky Register bar
  if ("IntersectionObserver" in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el) { revealIO.observe(el); });

    var sticky = document.getElementById("stickyCta");
    var hero = document.querySelector(".hero");
    var register = document.getElementById("register");
    if (sticky && hero && register) {
      var heroVisible = true, registerVisible = false;
      var update = function () {
        var show = !heroVisible && !registerVisible;
        sticky.classList.toggle("is-visible", show);
        sticky.setAttribute("aria-hidden", show ? "false" : "true");
        var link = sticky.querySelector("a");
        if (link) link.tabIndex = show ? 0 : -1;
      };
      new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }).observe(hero);
      new IntersectionObserver(function (e) { registerVisible = e[0].isIntersecting; update(); }).observe(register);
    }
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }
})();
