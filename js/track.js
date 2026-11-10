(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Visit and registration tracking (Google Analytics 4).
  // OFF until Jeff sends the GA4 Measurement ID (looks like "G-XXXXXXXXXX").
  // Paste it below; nothing else needs to change. While it is empty, no
  // Google script loads and nothing is sent anywhere.
  //
  // Events sent (no names, emails or other personal details, ever):
  //   page_view            every page (automatic; includes utm_ campaign tags)
  //   register_click       a Register / Sign up button on the home page
  //   begin_registration   first time someone fills in the registration form
  //   registration_paid    the registration and payment went through
  // ---------------------------------------------------------------------
  var GA_MEASUREMENT_ID = "";

  window.legendsTrack = function () {};
  if (!/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(s);

  window.legendsTrack = function (name, params) {
    try { window.gtag("event", name, params || {}); } catch (e) {}
  };

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href*="register.html"]');
    if (!link || /register\.html$/.test(window.location.pathname)) return;
    var section = link.closest("section, header, aside, .sticky-cta");
    window.legendsTrack("register_click", {
      placement: (section && (section.id || section.className.split(" ")[0])) || "page",
      player_type: (/player=(goalkeeper|field)/i.exec(link.getAttribute("href")) || [])[1] || "any"
    });
  });
})();
