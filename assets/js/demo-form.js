(() => {
  'use strict';
  const form = document.querySelector('[data-demo-form]');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form-status');
  const notice = document.querySelector('#demo-confirmation');
  const noticeTitle = notice.querySelector('h2');
  const noticeText = notice.querySelector('p');
  const pendingKey = 'crenex.demo.pending.v1';
  const lifetime = 30 * 60 * 1000;
  const now = Date.now();
  const url = new URL(window.location.href);
  const track = name => window.crenexAnalytics?.track(name);
  let sending = false;
  let started = false;

  function readPending() {
    try { return JSON.parse(sessionStorage.getItem(pendingKey)); }
    catch (_) { return null; }
  }

  function resetButton() {
    sending = false;
    button.disabled = false;
    button.textContent = 'Request a demo';
    form.removeAttribute('aria-busy');
  }

  function showNotice(confirmed) {
    notice.hidden = false;
    notice.dataset.state = confirmed ? 'success' : 'unconfirmed';
    noticeTitle.textContent = confirmed ? 'Thank you. Your request has been submitted.' : 'Need to check your request?';
    noticeText.textContent = confirmed
      ? 'We’ll review your details and follow up by email to arrange the next step.'
      : 'We can’t confirm a submission from this link. If you completed the form and spam check, please allow time for our reply. Otherwise, you can send your request below.';
    notice.focus({ preventScroll: true });
    notice.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  const pending = readPending();
  const receipt = url.searchParams.get('submission');
  const isReturn = receipt !== null || url.searchParams.has('submitted');
  const recent = pending && Number.isFinite(pending.at) && now >= pending.at && now - pending.at < lifetime;
  const confirmed = Boolean(receipt && recent && receipt === pending.id && /^[a-f0-9]{32}$/.test(receipt));
  if (isReturn) {
    // The provider return must match this tab's recent attempt. A copied URL alone is not a lead.
    let consumed = false;
    if (confirmed) {
      try { sessionStorage.removeItem(pendingKey); consumed = true; } catch (_) {}
    }
    url.searchParams.delete('submission');
    url.searchParams.delete('submitted');
    url.hash = 'demo-confirmation';
    history.replaceState({ crenexDemoConfirmedAt: confirmed ? now : null }, '', url.pathname + url.search + url.hash);
    showNotice(confirmed);
    if (confirmed && consumed) track('generate_lead');
  } else if (history.state?.crenexDemoConfirmedAt && now >= history.state.crenexDemoConfirmedAt && now - history.state.crenexDemoConfirmedAt < lifetime) {
    // Refreshing this confirmation preserves feedback without emitting a second event.
    showNotice(true);
  }

  form.addEventListener('input', () => {
    if (!started) { started = true; track('demo_form_start'); }
  });

  form.addEventListener('submit', event => {
    if (sending) { event.preventDefault(); return; }
    if (!form.checkValidity()) { event.preventDefault(); form.reportValidity(); return; }
    if (navigator.onLine === false) {
      event.preventDefault();
      status.textContent = 'You appear to be offline. Reconnect and send your request again. Your details are still in the form.';
      status.setAttribute('role', 'alert');
      track('demo_form_offline');
      return;
    }
    const next = new URL('/demo.html', window.location.origin);
    next.searchParams.set('submitted', '1');
    next.hash = 'demo-confirmation';
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      // No name, email, company or free text is persisted in browser storage.
      sessionStorage.setItem(pendingKey, JSON.stringify({ id, at: Date.now() }));
      next.searchParams.delete('submitted');
      next.searchParams.set('submission', id);
    } catch (_) {
      // Storage restrictions must never prevent a genuine enquiry; the fallback makes no success claim.
    }
    form.elements._next.value = next.href;
    const attribution = window.crenexAnalytics?.attribution() || {};
    form.querySelectorAll('[data-attribution]').forEach(input => {
      input.value = attribution[input.dataset.attribution] || '';
      input.disabled = !input.value;
    });
    sending = true;
    button.disabled = true;
    button.textContent = 'Continue to verification…';
    form.setAttribute('aria-busy', 'true');
    status.setAttribute('role', 'status');
    status.textContent = 'Complete the spam check on the next page to finish sending your request.';
    track('demo_submit_attempt');
  });

  window.addEventListener('pageshow', event => {
    // Back from the provider (including the back/forward cache) must leave a usable form.
    if (event.persisted || sending) {
      resetButton();
      status.setAttribute('role', 'status');
      status.textContent = 'If you didn’t finish the spam check, you can send your request again. If you did, please allow time for our reply.';
    }
  });
})();
