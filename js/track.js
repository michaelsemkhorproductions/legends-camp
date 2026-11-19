(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Visit and registration tracking. Two tools, each OFF until its ID is
  // pasted below. While an ID is empty, that tool's script never loads and
  // nothing is sent anywhere.
  //
  //   META_PIXEL_ID      Jeff's Meta (Facebook/Instagram) Pixel ID: digits only,
  //                      from Meta Events Manager > Data sources.
  //   GA_MEASUREMENT_ID  Google Analytics 4 ID, looks like "G-XXXXXXXXXX".
  //
  // What gets recorded (no names, emails or other personal details, ever):
  //   page view            every page (GA also keeps utm_ campaign tags)
  //   register click       a Register / Sign up button on the home page
  //                        (Meta: "Lead")
  //   registration started first change to the registration form
  //                        (Meta: "InitiateCheckout")
  //   registration paid    payment and registration went through, with total
  //                        (Meta: "Purchase")
  // ---------------------------------------------------------------------
  var META_PIXEL_ID = "467495714040681";
  var GA_MEASUREMENT_ID = "";

  var senders = [];

  if (/^[0-9]{6,20}$/.test(META_PIXEL_ID)) {
    /* Meta Pixel base code (standard loader) */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");

    var META_EVENTS = {
      register_click: "Lead",
      begin_registration: "InitiateCheckout",
      registration_paid: "Purchase"
    };
    senders.push(function (name, params) {
      var metaName = META_EVENTS[name];
      if (!metaName) return;
      var p = {};
      if (params && params.value > 0) { p.value = params.value; p.currency = params.currency || "USD"; }
      if (params && params.player_type) p.content_category = params.player_type;
      window.fbq("track", metaName, p);
    });
  }

  if (/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(g);
    senders.push(function (name, params) { window.gtag("event", name, params || {}); });
  }

  window.legendsTrack = function (name, params) {
    senders.forEach(function (send) { try { send(name, params); } catch (e) {} });
  };
  if (!senders.length) return;

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
