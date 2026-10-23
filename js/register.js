(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Semkhor + Stripe live in js/semkhor.js, which sets
  // LegendsRegistration.submit. That function receives the validated object
  // from collect() and must return a Promise: resolve once payment has
  // cleared, or reject with an Error whose message is safe to show.
  // This file sends nothing and stores nothing.
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
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------------
  // Styled dropdowns. The real <select> stays in the form (so validation,
  // FormData and autofill keep working) and this listbox drives it.
  // ---------------------------------------------------------------------
  var openDropdown = null;

  function enhanceSelect(sel) {
    var label = document.querySelector('label[for="' + sel.id + '"]');
    if (!label) return;
    if (!label.id) label.id = sel.id + "-label";

    var wrap = document.createElement("div");
    wrap.className = "dd";
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add("dd__native");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dd__button";
    btn.id = sel.id + "-button";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    var valueEl = document.createElement("span");
    valueEl.className = "dd__value";
    valueEl.id = sel.id + "-value";
    btn.setAttribute("aria-labelledby", label.id + " " + valueEl.id);
    btn.appendChild(valueEl);
    label.htmlFor = btn.id;

    var list = document.createElement("ul");
    list.className = "dd__list";
    list.id = sel.id + "-list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-labelledby", label.id);
    list.tabIndex = -1;
    list.hidden = true;
    btn.setAttribute("aria-controls", list.id);

    var opts = [];
    Array.prototype.forEach.call(sel.children, function (child) {
      if (child.tagName === "OPTGROUP") {
        var g = document.createElement("li");
        g.className = "dd__group";
        g.setAttribute("role", "presentation");
        g.textContent = child.label;
        list.appendChild(g);
        Array.prototype.forEach.call(child.children, addOpt);
      } else {
        addOpt(child);
      }
    });
    function addOpt(o) {
      if (!o.value) return;   // the "Select…" placeholder
      var li = document.createElement("li");
      li.className = "dd__opt";
      li.id = sel.id + "-opt-" + o.value;
      li.setAttribute("role", "option");
      li.setAttribute("data-value", o.value);
      li.textContent = o.textContent;
      list.appendChild(li);
      opts.push(li);
    }

    wrap.appendChild(btn);
    wrap.appendChild(list);
    sel._ddButton = btn;

    var active = -1;
    var typed = "", typedAt = 0;

    function render() {
      var o = sel.options[sel.selectedIndex];
      var has = !!sel.value;
      valueEl.textContent = has ? o.textContent : "Select…";
      btn.classList.toggle("is-placeholder", !has);
      opts.forEach(function (li) { li.setAttribute("aria-selected", li.getAttribute("data-value") === sel.value ? "true" : "false"); });
    }
    function setActive(i) {
      if (!opts.length) return;
      active = Math.max(0, Math.min(opts.length - 1, i));
      opts.forEach(function (li, j) { li.classList.toggle("is-active", j === active); });
      list.setAttribute("aria-activedescendant", opts[active].id);
      var li = opts[active];
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 6;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 6;
    }
    function open() {
      if (openDropdown && openDropdown !== api) openDropdown.close(false);
      list.hidden = false;
      // Open downward unless there's clearly more room above (below the sticky header),
      // and never taller than the room it has.
      var r = btn.getBoundingClientRect();
      var header = document.getElementById("siteHeader");
      var top = header ? header.getBoundingClientRect().bottom : 0;
      var below = window.innerHeight - r.bottom - 16;
      var above = r.top - top - 16;
      var up = below < 200 && above > below;
      wrap.classList.toggle("dd--up", up);
      list.style.maxHeight = Math.max(140, Math.min(288, up ? above : below)) + "px";
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      var sel_i = -1;
      opts.forEach(function (li, j) { if (li.getAttribute("data-value") === sel.value) sel_i = j; });
      setActive(sel_i < 0 ? 0 : sel_i);
      list.focus({ preventScroll: true });
      openDropdown = api;
    }
    function close(refocus) {
      if (list.hidden) return;
      list.hidden = true;
      wrap.classList.remove("is-open", "dd--up");
      btn.setAttribute("aria-expanded", "false");
      list.removeAttribute("aria-activedescendant");
      if (refocus !== false) btn.focus();
      if (openDropdown === api) openDropdown = null;
    }
    function choose(i) {
      var v = opts[i].getAttribute("data-value");
      if (sel.value !== v) {
        sel.value = v;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      render();
      close();
    }
    var api = { close: close, wrap: wrap };

    btn.addEventListener("click", function () { if (list.hidden) open(); else close(); });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    list.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Home") { e.preventDefault(); setActive(0); }
      else if (e.key === "End") { e.preventDefault(); setActive(opts.length - 1); }
      else if (e.key === "PageDown") { e.preventDefault(); setActive(active + 6); }
      else if (e.key === "PageUp") { e.preventDefault(); setActive(active - 6); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (active >= 0) choose(active); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") { close(false); }
      else if (e.key.length === 1 && /\S/.test(e.key)) {
        // Type-ahead: "f" jumps to Florida, "ne" to Nebraska, and so on.
        var now = Date.now();
        typed = (now - typedAt > 700 ? "" : typed) + e.key.toLowerCase();
        typedAt = now;
        for (var j = 0; j < opts.length; j++) {
          if (opts[j].textContent.toLowerCase().indexOf(typed) === 0) { setActive(j); break; }
        }
      }
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest(".dd__opt");
      if (li) setActive(opts.indexOf(li));
    });
    list.addEventListener("click", function (e) {
      var li = e.target.closest(".dd__opt");
      if (li) choose(opts.indexOf(li));
    });
    sel.addEventListener("change", render);   // autofill or reset
    render();
  }

  form.querySelectorAll("select[data-dropdown]").forEach(enhanceSelect);
  document.addEventListener("mousedown", function (e) {
    if (openDropdown && !openDropdown.wrap.contains(e.target)) openDropdown.close(false);
  });

  // Step chips in the hero jump to (and focus) their section.
  document.querySelectorAll(".reg-steps a[data-step]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.getElementById(a.getAttribute("data-step"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      target.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, "", "#" + target.id);
    });
  });

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
    player_team_age_group: "Current team age group",
    player_tshirt_size: "T-shirt size",
    player_position: "Player type",
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
      var iso = dmyToIso(v);
      if (!iso) {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(v)
          ? "That date doesn’t exist. Check the day and month (DD/MM/YYYY)."
          : "Enter the date as DD/MM/YYYY, for example 09/03/2014.";
      }
      if (iso < el.getAttribute("data-min") || iso > el.getAttribute("data-max")) return "Please check the birthdate. Is the year right?";
    }
    return "";
  }

  // "DD/MM/YYYY" -> "YYYY-MM-DD", or "" if it isn't a real calendar date.
  function dmyToIso(v) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v).trim());
    if (!m) return "";
    var d = +m[1], mo = +m[2], y = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "";
    return m[3] + "-" + m[2] + "-" + m[1];
  }

  // Birthdate: type digits only, slashes are added as you go (DD/MM/YYYY).
  var birth = document.getElementById("birthdate");
  if (birth) {
    birth.addEventListener("input", function () {
      var d = digits(birth.value).slice(0, 8);
      var out = d.slice(0, 2);
      if (d.length > 2) out += "/" + d.slice(2, 4);
      if (d.length > 4) out += "/" + d.slice(4);
      if (out !== birth.value) birth.value = out;
    });
  }

  function setError(el, msg) {
    var wrap = el.type === "radio" ? el.closest(".choice") : fieldWrap(el);
    if (!wrap) return;
    var id = (el.type === "radio" ? wrap.id : el.id) + "-error";
    var err = document.getElementById(id);
    var targets = el.type === "radio" ? form.querySelectorAll('input[name="' + el.name + '"]') : [el._ddButton || el];

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
      var target = p.el.type === "radio" ? form.querySelector('input[name="' + p.el.name + '"]') : (p.el._ddButton || p.el);
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
    data.player_birthdate = dmyToIso(data.player_birthdate);   // sent as YYYY-MM-DD
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
