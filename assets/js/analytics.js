(() => {
  'use strict';
  const measurementId = 'G-MYNTDFN8VX';
  const choiceKey = 'crenex.analytics.choice.v1';
  const attributionKey = 'crenex.analytics.source.v1';
  const choiceLifetime = 180 * 24 * 60 * 60 * 1000;
  const sessionLifetime = 30 * 60 * 1000;
  const production = location.hostname === 'crenex.io';
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  if (!canonical) return;
  const page = new URL(canonical).pathname;
  const pageUrl = 'https://crenex.io' + page;
  const events = new Set(['demo_cta_click', 'demo_form_start', 'demo_submit_attempt', 'demo_form_offline', 'generate_lead']);
  let granted = false;
  let loaded = false;
  let source = {};
  let previousFocus = null;

  function readChoice() {
    try {
      const choice = JSON.parse(localStorage.getItem(choiceKey));
      if (choice && ['granted', 'denied'].includes(choice.value) && Date.now() >= choice.at && Date.now() - choice.at < choiceLifetime) return choice.value;
    } catch (_) {}
    return null;
  }

  function campaignCode(value) {
    // Only short campaign codes; never forward arbitrary query strings, emails or search terms.
    return /^[a-z0-9_-]{1,80}$/i.test(value || '') ? value : '';
  }

  function referrerOrigin() {
    try {
      const ref = new URL(document.referrer);
      return ['http:', 'https:'].includes(ref.protocol) && !['crenex.io', 'www.crenex.io', 'formsubmit.co'].includes(ref.hostname) ? ref.origin : '';
    } catch (_) { return ''; }
  }

  function captureSource() {
    const query = new URL(location.href).searchParams;
    const campaign = campaignCode(query.get('utm_campaign'));
    const campaignSource = campaignCode(query.get('utm_source'));
    let stored;
    try { stored = JSON.parse(sessionStorage.getItem(attributionKey)); } catch (_) {}
    if (!campaignSource && !campaign && stored && Date.now() >= stored.at && Date.now() - stored.at < sessionLifetime) {
      source = stored;
    } else {
      const ref = referrerOrigin();
      source = {
        at: Date.now(), landing_page: page,
        source: campaignSource || (ref ? new URL(ref).hostname : '(direct)'),
        medium: campaignCode(query.get('utm_medium')) || (ref ? 'referral' : '(none)'),
        campaign
      };
    }
    source.at = Date.now();
    try { sessionStorage.setItem(attributionKey, JSON.stringify(source)); } catch (_) {}
  }

  function startAnalytics() {
    captureSource();
    if (loaded || !production || !/^G-[A-Z0-9]+$/.test(measurementId)) return;
    loaded = true;
    window['ga-disable-' + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false,
      page_location: pageUrl,
      page_referrer: referrerOrigin(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 180 * 24 * 60 * 60,
      cookie_update: false,
      campaign_source: source.source === '(direct)' ? undefined : source.source,
      campaign_medium: source.medium === '(none)' ? undefined : source.medium,
      campaign_name: source.campaign || undefined
    });
    window.gtag('event', 'page_view', { page_location: pageUrl, page_title: document.title, page_referrer: referrerOrigin() });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
  }

  function clearAnalytics() {
    window['ga-disable-' + measurementId] = true;
    source = {};
    try { sessionStorage.removeItem(attributionKey); } catch (_) {}
    // Remove this site's GA cookies when consent is withdrawn.
    document.cookie.split(';').forEach(pair => {
      const name = pair.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) return;
      ['', '; domain=crenex.io', '; domain=.crenex.io'].forEach(domain => {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + domain;
      });
    });
  }

  function track(name, placement) {
    if (!granted || !loaded || !events.has(name)) return false;
    const params = { page_location: pageUrl, page_path: page };
    if (['header', 'footer', 'content'].includes(placement)) params.placement = placement;
    if (name === 'generate_lead') params.method = 'demo_form_provider_return';
    window.gtag('event', name, params);
    return true;
  }

  window.crenexAnalytics = {
    track,
    attribution: () => granted ? { landing_page: source.landing_page, source: source.source, medium: source.medium, campaign: source.campaign } : {}
  };

  const panel = document.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', 'Analytics preferences');
  panel.hidden = true;
  panel.innerHTML = '<div><h2>Help us improve Crenex</h2><p>With your permission, we use Google Analytics to understand visits and demo requests. Your form details are not sent to Analytics. <a href="/privacy-policy.html">Privacy Policy</a></p></div><div class="analytics-choice-actions"><button type="button" data-choice="denied">Reject analytics</button><button type="button" data-choice="granted">Allow analytics</button></div>';
  document.body.appendChild(panel);
  const footer = document.querySelector('.footer-bottom') || document.querySelector('footer');
  if (footer) {
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.className = 'analytics-settings';
    settings.textContent = 'Analytics preferences';
    settings.addEventListener('click', () => {
      previousFocus = settings;
      panel.hidden = false;
      panel.querySelector('button').focus();
    });
    footer.appendChild(settings);
  }
  panel.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.choice;
    try { localStorage.setItem(choiceKey, JSON.stringify({ value: choice, at: Date.now() })); } catch (_) {}
    granted = choice === 'granted';
    panel.hidden = true;
    previousFocus?.focus();
    if (granted) startAnalytics();
    else {
      clearAnalytics();
      // A fresh page also removes a previously loaded tag and its automatic listeners.
      if (loaded) location.reload();
    }
  }));
  window.addEventListener('storage', event => {
    if (event.key === choiceKey) {
      if (readChoice() !== 'granted') clearAnalytics();
      location.reload();
    }
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const target = new URL(link.href, location.href);
    if (target.origin !== location.origin || !(target.pathname === '/demo.html' || (page === '/demo.html' && target.hash === '#demo-form'))) return;
    track('demo_cta_click', link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'content');
  });

  const choice = readChoice();
  granted = choice === 'granted';
  if (granted) startAnalytics();
  else clearAnalytics();
  panel.hidden = choice !== null;
})();
