(function () {
  "use strict";

  // Any host on *.semlab.test hits that same host’s API (site01, site08, …) with the
  // lab client/event. Production uses legendscamp + live Stripe on all other hosts.
  var IS_DEV = /\.semlab\.test$/i.test(window.location.hostname);
  var API = IS_DEV
    ? window.location.protocol + "//" + window.location.hostname + "/api/"
    : "https://www.semkhor.com/api/";
  var CLIENT_CODE = IS_DEV ? "abctooldyeco" : "legendscamp";
  var EVENT_ID = IS_DEV ? 70782 : 49762;
  var STRIPE_KEY = IS_DEV
    ? "pk_test_51SNvEuDsMwG2Us15PsCrXPvBuvlXRYudnUdBtNNcuKhKmYKwtjwAhM4gYEVck3QMuoQuzGO0edwn4vyDiCspPQfG00LiBw1aHp"
    : "pk_live_51USn01C02ppokKCQT3lhkQk6AMvwZQIhcVe17d2k7vfNIEHMjiANhe1vNw6Qb03L8SRRKarEKOXdzZK1gyO6oHh700DDS6Ybut";
  var SHIRT_CODE = IS_DEV ? "_Playertshirtsize" : "_PlayerTshirtSize";

  var registrationCost = null;
  var pricingSnapshot = null;
  var cardComplete = false;
  var stripe = null;
  var cardElement = null;
  var promoState = {
    code: "",
    applied: false,
    discount: 0,
    chargeTotal: null,
    status: "",
    message: ""
  };
  var promoBlurTimer = null;

  var testCardMode = (function () {
    var match = /(?:^|[?&])xstripe=([^&]*)/.exec(window.location.search || "");
    if (!match) return false;
    return decodeURIComponent(match[1].replace(/\+/g, " ")).replace(/^\s+|\s+$/g, "") !== "";
  })();

  var SHIRTS = {
    YS: "Youth S", YM: "Youth M", YL: "Youth L", YXL: "Youth XL",
    AS: "Adult S", AM: "Adult M", AL: "Adult L", AXL: "Adult XL"
  };

  function money(amount) {
    return "$" + Number(amount).toFixed(2);
  }

  function formatPhone(digits) {
    if (!digits || digits.length !== 10) return digits || "";
    return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
  }

  function setStatus(text) {
    var el = document.getElementById("regStatus");
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
  }

  function easternDateKey(date) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    var year = 0;
    var month = 0;
    var day = 0;
    parts.forEach(function (part) {
      if (part.type === "year") year = Number(part.value);
      if (part.type === "month") month = Number(part.value);
      if (part.type === "day") day = Number(part.value);
    });
    return year * 10000 + month * 100 + day;
  }

  var DATE_CLAUSE = /^_?RegistrationDate\s*=\s*(on or before|on or after|before|after|on)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/i;

  function dateClauseMatches(clause, todayKey) {
    var match = DATE_CLAUSE.exec(clause);
    if (!match) return null;
    var month = Number(match[2]);
    var day = Number(match[3]);
    var year = Number(match[4]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    var key = year * 10000 + month * 100 + day;
    var op = match[1].toLowerCase();
    if (op === "before") return todayKey < key;
    if (op === "after") return todayKey > key;
    if (op === "on or before") return todayKey <= key;
    if (op === "on or after") return todayKey >= key;
    return todayKey === key;
  }

  function ruleMatches(rule, todayKey) {
    var clauses = String((rule && rule.match) || "").split("|^|");
    var sawClause = false;
    for (var i = 0; i < clauses.length; i++) {
      var clause = clauses[i].replace(/^\s+|\s+$/g, "");
      if (!clause) continue;
      var matched = dateClauseMatches(clause, todayKey);
      if (matched !== true) return false;
      sawClause = true;
    }
    return sawClause;
  }

  function priceFromPricing(pricing) {
    var price = null;
    var flat = Number(pricing && pricing.registration_cost);
    if (flat > 0) price = Math.round(flat * 100) / 100;

    var todayKey = easternDateKey(new Date());
    var rules = (pricing && pricing.rules) || [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (!ruleMatches(rule, todayKey)) continue;
      var rulePrice = Number(rule && rule.price);
      if (!(rulePrice >= 0) || rulePrice === Infinity) continue;
      return Math.round(rulePrice * 100) / 100;
    }
    return price;
  }

  function extendedCareAddOn(pricing, extendedCare) {
    var choice = extendedCare === "Yes" ? "Yes" : "No";
    var rules = (pricing && pricing.value_add_rules) || [];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (String((rule && rule.match) || "") === "_ExtendedCare=" + choice) {
        var add = Number(rule && rule.price);
        return add >= 0 && add !== Infinity ? Math.round(add * 100) / 100 : 0;
      }
    }
    return choice === "Yes" ? 100 : 0;
  }

  function registrantSubtotal(data) {
    var care = (data && data.extended_care) || "No";
    if (registrationCost === null) return 0;
    return registrationCost + extendedCareAddOn(pricingSnapshot, care);
  }

  function showPrice(amount) {
    var el = document.getElementById("payTotalAmount");
    if (!el) return;
    el.textContent = money(amount);
  }

  function updatePriceDisplay(data) {
    var subtotal = registrantSubtotal(data);
    var lineEl = document.getElementById("payPromoLine");
    if (promoState.applied && promoState.chargeTotal != null) {
      showPrice(promoState.chargeTotal);
      if (lineEl) {
        lineEl.hidden = false;
        if (promoState.discount > 0) {
          lineEl.textContent = "Subtotal " + money(subtotal) + " · Promo −" + money(promoState.discount);
        } else {
          lineEl.textContent = "Subtotal " + money(subtotal);
        }
      }
    } else {
      showPrice(subtotal);
      if (lineEl) {
        lineEl.hidden = true;
        lineEl.textContent = "";
      }
    }
  }

  function setPromoMessage(text, kind) {
    var el = document.getElementById("promoMessage");
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
    el.classList.remove("is-success", "is-error");
    if (text && kind === "success") el.classList.add("is-success");
    if (text && kind === "error") el.classList.add("is-error");
  }

  function resetPromoState() {
    promoState = {
      code: "",
      applied: false,
      discount: 0,
      chargeTotal: null,
      status: "",
      message: ""
    };
  }

  function getCollectFn() {
    var LR = window.LegendsRegistration;
    return LR && typeof LR.collect === "function" ? LR.collect : null;
  }

  function promoPrereqsMet(data) {
    return !!(
      data.parent_first_name &&
      data.parent_last_name &&
      data.email &&
      data.player_first_name &&
      data.player_last_name
    );
  }

  function apiPost(path, body) {
    return fetch(API + path, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "SEMKHOR-CLIENT-CODE": CLIENT_CODE
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (response) {
      return response.json().catch(function () {
        throw new Error("Registration is unavailable right now. You were not charged.");
      });
    });
  }

  function apiError(result) {
    var lines = [];
    var messages = (result && result.messages) || [];
    messages.forEach(function (message) {
      if (message) lines.push(String(message));
    });
    var registrants = (result && result.registration && result.registration.registrants) || [];
    registrants.forEach(function (registrant) {
      (registrant.errors || []).forEach(function (message) {
        if (message) lines.push(String(message));
      });
    });
    return lines.join(" ");
  }

  function buildPayload(data, feeTotal, editId, paymentId, wantIntent, card, promoCode) {
    var subtotal = registrantSubtotal(data);
    var body = {
      event_id: EVENT_ID,
      session: "",
      discount_quantity: 0,
      surcharges: [],
      promo_code: promoCode || "",
      fee_total: feeTotal,
      cc_auth: paymentId || "",
      pay_currency: "USD",
      payment_intent: wantIntent ? "stripe" : "",
      registrants: [
        {
          edit_id: editId || 0,
          fee: subtotal,
          fee_note: "Registration|^|" + Number(subtotal).toFixed(2),
          first_name: data.parent_first_name,
          last_name: data.parent_last_name,
          address: data.address,
          address2: "",
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: "USA",
          phone: "",
          mobile_phone: formatPhone(data.mobile_phone),
          email: data.email,
          _PlayerFirstName: data.player_first_name,
          _PlayerLastName: data.player_last_name,
          _PlayerBirthDate: data.player_birthdate,
          _PlayerAgeGroup: data.player_team_age_group === "NONE" ? "Not on a team" : data.player_team_age_group,
          _PlayerGender: data.player_sex === "F" ? "Female" : "Male",
          _ExtendedCare: data.extended_care === "Yes" ? "Yes" : "No"
        }
      ]
    };
    body.registrants[0][SHIRT_CODE] = SHIRTS[data.player_tshirt_size] || data.player_tshirt_size;
    if (data.player_position) {
      body.registrants[0]._PlayerPosition = data.player_position;
    }
    if (card) {
      body.cc_num = card.number;
      body.cc_exp_month = card.month;
      body.cc_exp_year = card.year;
      body.cc_cvv = card.cvv;
      body.cc_auth = "";
      body.payment_intent = "";
    }
    return body;
  }

  function applyPromoFromReview(data, code, reg) {
    var discount = Number(reg && reg.discount_promo) || 0;
    var total = Number(reg && reg.fee_total);
    if (!(total >= 0)) total = Math.max(0, registrantSubtotal(data) - discount);
    promoState.code = code;
    promoState.applied = true;
    promoState.discount = discount;
    promoState.chargeTotal = Math.round(total * 100) / 100;
    promoState.status = reg.promo_status || "";
    promoState.message = reg.promo_message || "";
    updatePriceDisplay(data);
    if (reg.promo_status === "ok" && discount > 0) {
      setPromoMessage(reg.promo_message || "Promo applied.", "success");
    } else if (reg.promo_status === "ok") {
      setPromoMessage(reg.promo_message || "This code is valid but does not change your total.", "success");
    } else if (reg.promo_message) {
      setPromoMessage(reg.promo_message, "success");
    } else {
      setPromoMessage("", "");
    }
  }

  function runPromoReview(data, code) {
    if (!code) {
      resetPromoState();
      setPromoMessage("", "");
      updatePriceDisplay(data);
      return Promise.resolve();
    }
    if (!promoPrereqsMet(data)) {
      setPromoMessage(
        "Fill in parent and player names and email first, then apply your promo code.",
        "error"
      );
      return Promise.reject(new Error("Complete parent and player details before applying a promo code."));
    }
    var subtotal = registrantSubtotal(data);
    var body = buildPayload(data, subtotal, 0, "", false, null, code);
    return apiPost("register/review", body).then(function (result) {
      var message = apiError(result);
      var reg = result && result.registration;
      if (!result || !result.success || message) {
        resetPromoState();
        updatePriceDisplay(data);
        var errText = message || "That promo code could not be applied.";
        setPromoMessage(errText, "error");
        throw new Error(errText);
      }
      applyPromoFromReview(data, code, reg);
      return reg;
    });
  }

  function chargeTotalForSubmit(data) {
    if (promoState.applied && promoState.chargeTotal != null) {
      return promoState.chargeTotal;
    }
    return registrantSubtotal(data);
  }

  function ensurePromoBeforePay(data) {
    var input = document.getElementById("promoCode");
    var code = input ? String(input.value || "").replace(/^\s+|\s+$/g, "") : "";
    if (!code) {
      resetPromoState();
      updatePriceDisplay(data);
      return Promise.resolve(chargeTotalForSubmit(data));
    }
    if (promoState.applied && promoState.code === code && promoState.chargeTotal != null) {
      return Promise.resolve(promoState.chargeTotal);
    }
    return runPromoReview(data, code).then(function () {
      return chargeTotalForSubmit(data);
    });
  }

  function wirePromoControls() {
    var input = document.getElementById("promoCode");
    var btn = document.getElementById("promoApply");
    if (!input || !btn) return;

    function setPromoBusy(busy) {
      btn.disabled = busy;
      btn.textContent = busy ? "Checking…" : "Apply";
    }

    function triggerApply() {
      var collect = getCollectFn();
      if (!collect) {
        setPromoMessage("Registration is still loading. Try again in a moment.", "error");
        return;
      }
      var code = String(input.value || "").replace(/^\s+|\s+$/g, "");
      if (!code) {
        resetPromoState();
        setPromoMessage("", "");
        var data = collect();
        updatePriceDisplay(data);
        return;
      }
      return configReady.then(function () {
        setPromoBusy(true);
        setPromoMessage("", "");
        var data = collect();
        return runPromoReview(data, code).catch(function () {
          /* message already shown */
        }).then(function () {
          setPromoBusy(false);
        });
      });
    }

    btn.addEventListener("click", function () {
      triggerApply();
    });

    input.addEventListener("blur", function () {
      if (promoBlurTimer) clearTimeout(promoBlurTimer);
      promoBlurTimer = setTimeout(function () {
        var code = String(input.value || "").replace(/^\s+|\s+$/g, "");
        if (!code) return;
        if (promoState.applied && promoState.code === code) return;
        triggerApply();
      }, 200);
    });

    input.addEventListener("input", function () {
      var code = String(input.value || "").replace(/^\s+|\s+$/g, "");
      if (!code && promoState.applied) {
        resetPromoState();
        setPromoMessage("", "");
        var collect = getCollectFn();
        if (collect) updatePriceDisplay(collect());
      }
    });
  }

  function readTestCard() {
    var number = (document.getElementById("ccNum").value || "").replace(/\D/g, "");
    var month = document.getElementById("ccMonth").value;
    var year = document.getElementById("ccYear").value;
    var cvv = (document.getElementById("ccCvv").value || "").replace(/\D/g, "");
    var problems = [];
    if (number.length < 13 || number.length > 19) problems.push("Enter the card number.");
    if (!month || !year) problems.push("Enter the expiry month and year.");
    if (cvv.length < 3 || cvv.length > 4) problems.push("Enter the security code.");
    return { number: number, month: month, year: year, cvv: cvv, problems: problems };
  }

  function showTestCard() {
    var host = document.getElementById("payment-element");
    var card = document.getElementById("payCard");
    if (host) host.hidden = true;
    if (card) card.hidden = false;
  }

  function mountCard() {
    var host = document.getElementById("payment-element");
    if (!host || !window.Stripe) return;
    host.classList.remove("is-placeholder");
    host.textContent = "";
    stripe = window.Stripe(STRIPE_KEY);
    cardElement = stripe.elements().create("card", {
      hidePostalCode: true,
      style: {
        base: {
          fontFamily: '"Segoe UI", sans-serif',
          fontSize: "16px",
          color: "#050f1e",
          "::placeholder": { color: "#8b93a7" }
        },
        invalid: { color: "#b42318" }
      }
    });
    cardElement.mount(host);
    cardElement.on("change", function (event) {
      cardComplete = !event.error && !!event.complete;
    });
  }

  function loadConfig() {
    return apiPost("register/query/" + EVENT_ID).then(function (result) {
      if (!result || !result.success || !result.registration) {
        throw new Error(apiError(result) || "Registration is unavailable right now. Please email or text us.");
      }
      pricingSnapshot = result.registration.pricing || {};
      registrationCost = priceFromPricing(pricingSnapshot);
      if (!(registrationCost > 0)) {
        registrationCost = null;
        throw new Error("The camp price could not be loaded, so registration is paused. Please text us at 941-725-5881.");
      }
      var collect = getCollectFn();
      updatePriceDisplay(collect ? collect() : { extended_care: "No" });
    });
  }

  var regForm = document.getElementById("registrationForm");
  if (regForm) {
    regForm.addEventListener("change", function (e) {
      if (e.target.name !== "extended_care") return;
      if (registrationCost === null) return;
      var collect = getCollectFn();
      if (!collect) return;
      var data = collect();
      var code = promoState.applied ? promoState.code : "";
      if (code) {
        runPromoReview(data, code).catch(function () { updatePriceDisplay(data); });
      } else {
        updatePriceDisplay(data);
      }
    });
  }

  var configReady = loadConfig();
  configReady.catch(function (err) {
    var priceEl = document.getElementById("payTotalAmount");
    if (priceEl) priceEl.textContent = "Price unavailable";
    var msg = err && err.message;
    setStatus(msg && msg.indexOf("price could not be loaded") >= 0 ? msg : "Registration is unavailable right now, so nothing was charged. Please refresh the page, or text us at 941-725-5881.");
  });

  wirePromoControls();

  window.LegendsRegistration = window.LegendsRegistration || {};
  window.LegendsRegistration.submit = function (data) {
    return configReady.then(function () {
      return ensurePromoBeforePay(data).then(function (fee) {
        var promoCode = promoState.applied ? promoState.code : "";

        if (testCardMode) {
          var card = readTestCard();
          if (card.problems.length) throw new Error(card.problems.join(" "));
          setStatus("Saving your registration…");
          return apiPost("register/add", buildPayload(data, fee, 0, "", false, card, promoCode)).then(function (result) {
            var message = apiError(result);
            if (!result || !result.success || message) {
              throw new Error(message || "Registration could not be completed.");
            }
            var txn = result.registration && result.registration.transaction_id;
            if (!txn) {
              throw new Error("Registration was not completed. The Semkhor test card is 4000200020002000.");
            }
          });
        }

        if (!stripe || !cardElement) {
          throw new Error("Card payment could not be loaded. Please refresh the page, or email us.");
        }
        if (!cardComplete) {
          throw new Error("Enter the card number, expiry, and security code.");
        }

        setStatus("Checking registration…");
        return apiPost("register/add", buildPayload(data, fee, 0, "", true, null, promoCode)).then(function (first) {
          var firstError = apiError(first);
          if (!first || !first.success || firstError) {
            throw new Error(firstError || "Registration could not be checked. You were not charged.");
          }

          var registrants = (first.registration && first.registration.registrants) || [];
          var editId = Number((registrants[0] && registrants[0].registrantId) || 0);
          var clientSecret = first.registration && first.registration.payment_intent;
          if (!clientSecret) {
            throw new Error("Payment could not be started. You were not charged.");
          }

          setStatus("Confirming card payment…");
          return stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: data.parent_first_name + " " + data.parent_last_name,
                email: data.email,
                phone: formatPhone(data.mobile_phone),
                address: {
                  line1: data.address,
                  city: data.city,
                  state: data.state,
                  postal_code: data.zip,
                  country: "US"
                }
              }
            }
          }).then(function (paymentResult) {
            if (paymentResult.error) {
              throw new Error(paymentResult.error.message || "The card was declined.");
            }
            var paymentId = paymentResult.paymentIntent && paymentResult.paymentIntent.id;
            if (!paymentId) {
              throw new Error("The payment did not return a confirmation. Please contact us before trying again.");
            }

            setStatus("Saving your registration…");
            return apiPost("register/add", buildPayload(data, fee, editId, paymentId, false, null, promoCode)).then(function (finalPass) {
              var finalError = apiError(finalPass);
              if (!finalPass || !finalPass.success || finalError) {
                throw new Error(finalError || "The card was charged, but the registration could not be saved. Please contact us and do not submit again.");
              }
            });
          });
        });
      });
    });
  };

  if (testCardMode) showTestCard();
  else mountCard();
})();