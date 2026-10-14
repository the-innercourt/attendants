(function () {
  'use strict';

  var API = (window.PORTAL_CONFIG && window.PORTAL_CONFIG.api) || '';
  var CHURCH_NAME = 'TICC';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var STAFF_ID_RE = /^[A-Z0-9][A-Z0-9\-]{2,40}$/;
  var $ = function (id) { return document.getElementById(id); };
  var verified = { id: '', phone: '' };

  /* ---------- helpers ---------- */
  function showError(msg) {
    var e = $('error');
    e.textContent = msg;
    e.classList.remove('hidden');
  }
  function clearError() { $('error').classList.add('hidden'); }

  function setStep(n) {
    [1, 2, 3].forEach(function (i) {
      $('step' + i).classList.toggle('hidden', i !== n);
    });
    clearError();
    var h = $('h' + n);
    if (h) h.focus();
  }

  function setBusy(btn, on) {
    if (on) {
      btn.disabled = true;
      btn.textContent = 'Please wait…';
    } else {
      btn.textContent = btn.getAttribute('data-label');
      btn.disabled = false;
    }
  }

  function call(payload) {
    if (!API || API.indexOf('YOUR-') !== -1) {
      return Promise.reject(new Error('This page is not set up yet. Ask the admin to finish the setup.'));
    }
    // text/plain keeps this a "simple" request, so the browser skips the extra preflight round trip.
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        try { return JSON.parse(t); }
        catch (e) { throw new Error('The server sent an unexpected reply. Please try again in a few minutes.'); }
      });
  }

  /* ---------- step 1: identify the staff record ---------- */
  $('form1').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearError();
    var id = $('attId').value.trim().toUpperCase();
    var phone = $('phone').value.trim();
    if (!STAFF_ID_RE.test(id)) { showError('Enter a valid Attendant ID.'); return; }
    if (phone.replace(/\D/g, '').length < 10) { showError('Enter a valid phone number.'); return; }

    var btn = $('btn1');
    setBusy(btn, true);
    call({ action: 'staffCheck', attendantId: id, phone: phone })
      .then(function (res) {
        if (!res.success) { showError(res.error || 'Could not verify your details.'); return; }
        verified = { id: id, phone: phone };
        $('whoName').textContent = res.name || id;
        setStep(2);
        $('email').focus();
      })
      .catch(function (e) { showError(e.message || 'Network problem. Check your internet and try again.'); })
      .then(function () { setBusy(btn, false); });
  });

  /* ---------- step 2: set email + password ---------- */
  $('form2').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearError();
    var email = $('email').value.trim().toLowerCase();
    var pin = $('pin').value;
    var pin2 = $('pin2').value;

    if (!EMAIL_RE.test(email)) { showError('Enter a valid email address.'); return; }
    if (!/^\d{6}$/.test(pin)) { showError('Password must be exactly 6 digits (numbers only).'); return; }
    if (pin !== pin2) { showError('The two passwords do not match.'); return; }

    var btn = $('btn2');
    setBusy(btn, true);
    call({
      action: 'staffActivate',
      attendantId: verified.id,
      phone: verified.phone,
      email: email,
      pin: pin
    })
      .then(function (res) {
        if (!res.success) { showError(res.error || 'Could not activate your account.'); return; }
        $('doneMsg').textContent = 'Welcome to the ' + CHURCH_NAME + ' team' + (res.name ? ', ' + res.name : '') + '.';
        $('doneOrg').textContent = res.schoolId || '';
        $('doneAtt').textContent = res.attendantId || verified.id;
        setStep(3);
      })
      .catch(function (e) { showError(e.message || 'Network problem. Check your internet and try again.'); })
      .then(function () { setBusy(btn, false); });
  });

  /* ---------- password fields: digits only, max 6 ---------- */
  ['pin', 'pin2'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 6);
    });
  });

  /* ---------- show / hide password ---------- */
  document.querySelectorAll('[data-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var inp = $(b.getAttribute('data-toggle'));
      var hide = inp.type === 'password';
      inp.type = hide ? 'text' : 'password';
      b.textContent = hide ? 'Hide' : 'Show';
    });
  });

  /* ---------- copy buttons ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = $(b.getAttribute('data-copy')).textContent;
      function done() {
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy'; }, 1500);
      }
      function fallback() {
        var t = document.createElement('textarea');
        t.value = text;
        t.style.position = 'fixed';
        t.style.opacity = '0';
        document.body.appendChild(t);
        t.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(t);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }
    });
  });

  /* ---------- back button ---------- */
  $('back').addEventListener('click', function () {
    $('form2').reset();
    setStep(1);
  });
})();