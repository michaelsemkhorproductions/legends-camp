(function () {
  "use strict";

  // *.semlab.test uses the lab API and the sandbox Stripe key. Every other host,
  // including the live site, uses the Legends Camp production account.
  var IS_DEV = /\.semlab\.test$/i.test(window.location.hostname);
  var API = IS_DEV ? "https://site01.semlab.test/api/" : "https://www.semkhor.com/api/";
  var CLIENT_CODE = IS_DEV ? "abctooldyeco" : "legendscamp";
  var EVENT_ID = IS_DEV ? 70782 : 49762;
  var STRIPE_KEY = IS_DEV
    ? "pk_test_51SNvEuDsMwG2Us15PsCrXPvBuvlXRYudnUdBtNNcuKhKmYKwtjwAhM4gYEVck3QMuoQuzGO0edwn4vyDiCspPQfG00LiBw1aHp"
    : "pk_live_51USn01C02ppokKCQT3lhkQk6AMvwZQIhcVe17d2k7vfNIEHMjiANhe1vNw6Qb03L8SRRKarEKOXdzZK1gyO6oHh700DDS6Ybut";
  // The live form's shirt field code differs from the lab form.
  var SHIRT_CODE = IS_DEV ? "_Playertshirtsize" : "_PlayerTshirtSize";

  var registrationCost = 772.5;
  var cardComplete = false;
  var stripe = null;
  var cardElement = null;
  // ?xstripe=1 (any non-blank value) skips Stripe and posts card fields to Semkhor.
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

  function showPrice(amount) {
    var el = document.getElementById("payTotalAmount");
    if (!el) return;
    el.textContent = "";
    el.appendChild(document.createTextNode(money(amount) + " "));
    var note = document.createElement("small");
    note.textContent = "includes 3% card fee";
    el.appendChild(note);
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

  function buildPayload(data, fee, editId, paymentId, wantIntent, card) {
    var body = {
      event_id: EVENT_ID,
      session: "",
      discount_promo: 0,
      discount_promoCode: "",
      discount_quantity: 0,
      surcharges: [],
      fee_total: fee,
      cc_auth: paymentId || "",
      pay_currency: "USD",
      payment_intent: wantIntent ? "stripe" : "",
      registrants: [
        {
          edit_id: editId || 0,
          fee: fee,
          fee_note: "Registration|^|" + Number(fee).toFixed(2),
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
          _PlayerGender: data.player_sex === "F" ? "Female" : "Male"
        }
      ]
    };
    body.registrants[0][SHIRT_CODE] = SHIRTS[data.player_tshirt_size] || data.player_tshirt_size;
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
      var pricing = result.registration.pricing || {};
      var cost = Number(pricing.registration_cost);
      if (cost > 0) registrationCost = Math.round(cost * 100) / 100;
      showPrice(registrationCost);
    });
  }

  var configReady = loadConfig();
  configReady.catch(function (err) {
    setStatus((err && err.message) || "Registration details could not be loaded.");
  });

  window.LegendsRegistration = window.LegendsRegistration || {};
  window.LegendsRegistration.submit = function (data) {
    return configReady.then(function () {
      var fee = registrationCost;

      if (testCardMode) {
        var card = readTestCard();
        if (card.problems.length) throw new Error(card.problems.join(" "));
        setStatus("Saving your registration…");
        return apiPost("register/add", buildPayload(data, fee, 0, "", false, card)).then(function (result) {
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
      return apiPost("register/add", buildPayload(data, fee, 0, "", true)).then(function (first) {
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
          return apiPost("register/add", buildPayload(data, fee, editId, paymentId, false)).then(function (finalPass) {
            var finalError = apiError(finalPass);
            if (!finalPass || !finalPass.success || finalError) {
              throw new Error(finalError || "The card was charged, but the registration could not be saved. Please contact us and do not submit again.");
            }
          });
        });
      });
    });
  };

  if (testCardMode) showTestCard();
  else mountCard();
})();
