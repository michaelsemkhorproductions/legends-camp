(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // INTEGRATION POINT (Alex): Semkhor registration API + Stripe payment.
  //
  // Set LegendsRegistration.submit to a function that takes the validated
  // registration object (see collect() below for the exact keys) and returns
  // a Promise. Resolve it once payment has cleared to show the success panel;
  // reject it with an Error whose message is safe to show the parent.
  // Stripe's payment fields can mount into #payment-element.
  //
  // This file sends nothing anywhere and stores nothing in the browser.
  // ---------------------------------------------------------------------
  window.LegendsRegistration = window.LegendsRegistration || { submit: null };

  var form = document.getElementById("registrationForm");
  if (!form) return;

  var errorBox = document.getElementById("regErrors");
  var errorList = document.getElementById("regErrorList");
  var statusEl = document.getElementById("regStatus");
  var submitBtn = document.getElementById("regSubmit");
  var submitLabel = submitBtn.querySelector(".btn-split__label");
  var success = document.getElementById("regSuccess");

  var LABELS = {
    parent_first_name: "Parent first name",
    parent_last_name: "Parent last name",
    address: "Street address",
    city: "City",
    state: "State",
    zip: "ZIP code",
    mobile_phone: "Mobile phone",
    email: "Email",
    player_first_name: "Player first name",
    player_last_name: "Player last name",
    player_birthdate: "Birthdate",
    player_tshirt_size: "T-shirt size",
    player_sex: "Sex"
  };

  function digits(v) { return String(v || "").replace(/\D/g, ""); }

  function fieldWrap(el) { return el.closest(".field"); }

  function messageFor(el) {
    var name = el.name;
    var v = el.value.trim();
    if (el.type === "radio") {
      return form.querySelector('input[name="' + name + '"]:checked') ? "" : "Please choose one.";
    }
    if (!v) return el.tagName === "SELECT" ? "Please choose an option." : "Please fill this in.";
    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter an email like name@example.com.";
    if (name === "zip" && !/^\d{5}(-\d{4})?$/.test(v)) return "Enter a 5-digit ZIP code.";
    if (name === "mobile_phone") {
      var d = digits(v);
      if (!(d.length === 10 || (d.length === 11 && d.charAt(0) === "1"))) return "Enter a 10-digit US mobile number.";
    }
    if (name === "player_birthdate") {
      if (el.validity && el.validity.badInput) return "Enter a valid date.";
      if ((el.min && v < el.min) || (el.max && v > el.max)) return "The camp is for players born 2010–2018.";
    }
    return "";
  }

  function setError(el, msg) {
    var wrap = el.type === "radio" ? el.closest(".choice") : fieldWrap(el);
    if (!wrap) return;
    var id = (el.type === "radio" ? wrap.id : el.id) + "-error";
    var err = document.getElementById(id);
    var targets = el.type === "radio" ? form.querySelectorAll('input[name="' + el.name + '"]') : [el];

    wrap.classList.toggle("is-invalid", !!msg);
    if (msg) {
      if (!err) {
        err = document.createElement("p");
        err.className = "field__error";
        err.id = id;
        wrap.appendChild(err);
      }
      err.textContent = msg;
    } else if (err) {
      err.remove();
    }
    Array.prototype.forEach.call(targets, function (t) {
      var hint = t.getAttribute("data-hint-id") || t.getAttribute("aria-describedby") || "";
      if (!t.hasAttribute("data-hint-id")) t.setAttribute("data-hint-id", hint);
      var ids = [t.getAttribute("data-hint-id")];
      if (msg) ids.push(id);
      var joined = ids.filter(Boolean).join(" ");
      if (joined) t.setAttribute("aria-describedby", joined); else t.removeAttribute("aria-describedby");
      if (msg) t.setAttribute("aria-invalid", "true"); else t.removeAttribute("aria-invalid");
    });
  }

  function controls() {
    var seen = {};
    return Array.prototype.filter.call(form.elements, function (el) {
      if (!el.name || !LABELS[el.name]) return false;
      if (el.type === "radio") { if (seen[el.name]) return false; seen[el.name] = true; }
      return true;
    });
  }

  function validateAll() {
    var problems = [];
    controls().forEach(function (el) {
      var msg = messageFor(el);
      setError(el, msg);
      if (msg) problems.push({ el: el, msg: msg });
    });
    return problems;
  }

  function showSummary(problems) {
    errorList.innerHTML = "";
    if (!problems.length) { errorBox.hidden = true; return; }
    problems.forEach(function (p) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      var target = p.el.type === "radio" ? form.querySelector('input[name="' + p.el.name + '"]') : p.el;
      a.href = "#" + (target.id || "");
      a.textContent = LABELS[p.el.name] + ": " + p.msg;
      a.addEventListener("click", function (e) { e.preventDefault(); target.focus(); });
      li.appendChild(a);
      errorList.appendChild(li);
    });
    errorBox.hidden = false;
    errorBox.focus();
  }

  // Re-check a field once the parent has touched it, so errors clear as they fix them.
  form.addEventListener("change", function (e) {
    var el = e.target;
    if (el.name && LABELS[el.name]) setError(el, messageFor(el));
  });
  form.addEventListener("input", function (e) {
    var el = e.target;
    var wrap = el.type === "radio" ? el.closest(".choice") : fieldWrap(el);
    if (wrap && wrap.classList.contains("is-invalid")) setError(el, messageFor(el));
  });

  function collect() {
    var fd = new FormData(form);
    var data = {};
    Object.keys(LABELS).forEach(function (k) { data[k] = String(fd.get(k) || "").trim(); });
    data.email = data.email.toLowerCase();
    data.state = data.state.toUpperCase();
    var d = digits(data.mobile_phone);
    data.mobile_phone = d.length === 11 ? d.slice(1) : d;   // 10 digits, US
    return data;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitLabel.textContent = busy ? "Processing…" : "Complete registration";
  }

  function showStatus(text) {
    statusEl.textContent = text;
    statusEl.hidden = !text;
  }

  function showSuccess(data) {
    document.getElementById("regSuccessName").textContent = data.parent_first_name;
    document.getElementById("regSuccessEmail").textContent = data.email;
    document.body.classList.add("is-registered");
    success.hidden = false;
    success.focus();
    success.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showStatus("");
    var problems = validateAll();
    showSummary(problems);
    if (problems.length) return;

    var data = collect();
    var submit = window.LegendsRegistration.submit;

    if (typeof submit !== "function") {
      showStatus("Online registration isn’t connected yet, so nothing was sent or charged. Please email or text us to reserve a spot.");
      statusEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    setBusy(true);
    Promise.resolve()
      .then(function () { return submit(data); })
      .then(function () { showSuccess(data); })
      .catch(function (err) {
        showStatus((err && err.message) || "Something went wrong and you were not charged. Please try again, or email us.");
      })
      .then(function () { setBusy(false); });
  });
})();
