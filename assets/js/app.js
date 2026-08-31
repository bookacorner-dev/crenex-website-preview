(function(){
  const body = document.body;
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('#site-nav');
  const mobile = window.matchMedia('(max-width: 1040px)');

  function setNav(open){
    if(!toggle || !nav) return;
    body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(mobile.matches) nav.inert = !open;
    else nav.inert = false;
  }

  if(toggle && nav){
    setNav(false);
    toggle.addEventListener('click', () => setNav(!body.classList.contains('nav-open')));
    document.addEventListener('keydown', event => {
      if(event.key === 'Escape' && body.classList.contains('nav-open')){
        setNav(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', event => {
      if(!body.classList.contains('nav-open')) return;
      if(nav.contains(event.target) || toggle.contains(event.target)) return;
      setNav(false);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setNav(false)));
    mobile.addEventListener('change', () => setNav(false));
  }

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = (link.getAttribute('href') || '').split('#')[0];
    if(href === current){
      link.classList.add('active');
      link.setAttribute('aria-current','page');
    }
  });

  if(current === 'index.html' && !document.querySelector('.mri-award-spotlight')){
    const impactBand = document.querySelector('.impact-band');
    if(impactBand){
      const style = document.createElement('style');
      style.textContent = `
        .mri-award-spotlight{position:relative;overflow:hidden;background:#f4efe6;border-bottom:1px solid rgba(13,19,32,.10)}
        .mri-award-spotlight:before{content:"";position:absolute;width:760px;height:760px;right:-220px;top:-280px;border-radius:50%;background:radial-gradient(circle at 46% 44%,rgba(255,255,255,.98) 0%,rgba(255,255,255,.72) 20%,rgba(131,220,246,.14) 43%,rgba(49,95,189,.06) 61%,rgba(49,95,189,0) 72%);pointer-events:none}
        .mri-award-shell{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.12fr) minmax(430px,.88fr);gap:70px;align-items:center;padding:76px 0 82px}
        .mri-award-copy .eyebrow{display:inline-flex;width:max-content;padding:10px 14px;border-radius:12px;margin-bottom:25px;background:#d8f3ef;color:#18332e}
        .mri-award-copy h2{max-width:820px;font-size:clamp(44px,5.2vw,78px);line-height:.96;letter-spacing:-.06em}
        .mri-award-copy .lead{margin-top:30px;max-width:830px;font-size:clamp(18px,1.8vw,24px);line-height:1.55;color:#50607c}
        .mri-award-copy .text-link{display:inline-block;margin-top:31px;color:#315fbd;font-size:18px;font-weight:820}
        .partner-lockup{position:relative;min-height:430px;display:grid;place-items:center;isolation:isolate}
        .partner-lockup:before,.partner-lockup:after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(49,95,189,.13);pointer-events:none}
        .partner-lockup:before{width:390px;height:390px}.partner-lockup:after{width:290px;height:290px;border-color:rgba(64,169,183,.17)}
        .partner-orbit{position:absolute;width:500px;height:500px;border:1px solid rgba(255,255,255,.80);border-radius:50%;box-shadow:0 0 0 1px rgba(49,95,189,.035),inset 0 0 90px rgba(255,255,255,.28)}
        .partner-card{position:relative;z-index:2;width:min(100%,470px);padding:44px 42px 38px;border:1px solid rgba(13,19,32,.08);border-radius:34px;background:rgba(255,255,255,.64);backdrop-filter:blur(18px);box-shadow:0 28px 80px rgba(7,17,38,.10)}
        .partner-logos{display:grid;grid-template-columns:1fr 48px 1fr;align-items:center;gap:18px}.partner-logo{min-height:74px;display:flex;align-items:center;justify-content:center}
        .partner-logo--mri img{width:168px;max-height:78px;object-fit:contain}.partner-logo--crenex img{width:176px;max-height:54px;object-fit:contain}
        .partner-times{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:1px solid rgba(13,19,32,.10);background:rgba(255,255,255,.82);color:#768196;font-size:30px;font-weight:300}
        .partner-rule{height:1px;margin:32px 0 25px;background:linear-gradient(90deg,rgba(49,95,189,0),rgba(49,95,189,.34),rgba(64,169,183,.32),rgba(49,95,189,0))}
        .partner-award-copy{text-align:center}.partner-award-copy strong{display:block;color:#071126;font-size:22px;line-height:1.15;letter-spacing:-.035em}.partner-award-copy span{display:block;margin-top:10px;color:#657086;font-family:"Geist Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.09em;text-transform:uppercase}
        .partner-badge{position:absolute;z-index:3;right:4px;top:26px;padding:11px 16px;border-radius:999px;background:#fff;border:1px solid rgba(13,19,32,.08);box-shadow:0 14px 35px rgba(7,17,38,.09);color:#566176;font-family:"Geist Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase}
        @media(max-width:980px){.mri-award-shell{grid-template-columns:1fr;gap:42px;padding:58px 0 64px}.partner-lockup{min-height:390px}}
        @media(max-width:580px){.partner-card{padding:34px 24px 30px;border-radius:28px}.partner-logos{grid-template-columns:1fr 38px 1fr;gap:10px}.partner-logo--mri img{width:130px}.partner-logo--crenex img{width:138px}.partner-times{width:38px;height:38px;font-size:24px}.partner-orbit{width:410px;height:410px}.partner-lockup:before{width:320px;height:320px}.partner-lockup:after{width:235px;height:235px}.partner-badge{display:none}.mri-award-copy .text-link{font-size:16px}}
      `;
      document.head.appendChild(style);

      const section = document.createElement('section');
      section.className = 'mri-award-spotlight';
      section.setAttribute('aria-label','MRI APAC Partner of the Year 2026');
      section.innerHTML = `
        <div class="container mri-award-shell">
          <div class="mri-award-copy">
            <p class="eyebrow">Recognition</p>
            <h2>Named MRI Partner of the Year.</h2>
            <p class="lead">In 2026, MRI Software recognised Crenex as its APAC Partner of the Year — reflecting the strength of our partnership and the work being delivered across casual leasing operations in the region.</p>
            <a class="text-link" href="mri-integration.html">Explore our MRI partnership →</a>
          </div>
          <div class="partner-lockup">
            <div class="partner-orbit" aria-hidden="true"></div>
            <div class="partner-badge">APAC Partner of the Year · 2026</div>
            <div class="partner-card">
              <div class="partner-logos">
                <div class="partner-logo partner-logo--mri"><img src="assets/logos/mri-software-color.svg" alt="MRI Software"/></div>
                <div class="partner-times" aria-hidden="true">×</div>
                <div class="partner-logo partner-logo--crenex"><img src="assets/brand/crenex-logo-ink.svg" alt="Crenex"/></div>
              </div>
              <div class="partner-rule"></div>
              <div class="partner-award-copy"><strong>2026 APAC Partner of the Year</strong><span>Recognised by MRI Software</span></div>
            </div>
          </div>
        </div>
      `;
      impactBand.insertAdjacentElement('afterend', section);
    }
  }

  function freezeExactFrame(frame){
    frame.tabIndex = -1;
    frame.inert = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.addEventListener('load', () => {
      try {
        const documentInside = frame.contentDocument;
        documentInside.documentElement.inert = true;
        documentInside.documentElement.classList.add('static-preview');
        documentInside.querySelectorAll('a,button,input,select,textarea,[tabindex],[contenteditable]').forEach(element => {
          element.tabIndex = -1;
        });
        const stop = event => {
          event.preventDefault();
          event.stopImmediatePropagation();
        };
        ['click','dblclick','pointerdown','touchstart','keydown','submit'].forEach(type => {
          documentInside.addEventListener(type, stop, true);
        });
        frame.contentWindow.blur();
      } catch (_) {}
    });
  }

  document.querySelectorAll('.exact-screen-viewport iframe').forEach(freezeExactFrame);

  document.querySelectorAll('[data-exact-tour]').forEach(tour => {
    const tabs = Array.from(tour.querySelectorAll('[data-exact-tab]'));
    const frame = tour.querySelector('[data-exact-frame]');
    const image = tour.querySelector('[data-exact-image]');
    const title = tour.querySelector('[data-exact-title]');
    const description = tour.querySelector('[data-exact-description]');
    const stage = tour.querySelector('.tour-stage');
    const badge = tour.querySelector('.exact-screen-badge');
    const figure = tour.querySelector('[data-exact-figure]');
    const base = tour.dataset.screenBase;

    function select(tab){
      tabs.forEach(item => item.setAttribute('aria-selected', item === tab ? 'true' : 'false'));
      stage.classList.add('is-changing');
      window.setTimeout(() => {
        const isListing = tab.dataset.kind === 'listing';
        const source = tab.dataset.src || (base + '#' + tab.dataset.view);
        const previewTitle = isListing ? 'Crenex Listing marketplace preview' : 'Crenex OS ' + tab.dataset.title + ' preview';
        if(frame){
          frame.src = source;
          frame.title = previewTitle;
        }
        if(image){
          image.src = source;
          image.alt = previewTitle;
        }
        if(badge) badge.textContent = isListing ? 'Crenex Listing' : 'Crenex OS';
        if(figure) figure.setAttribute('aria-label', previewTitle);
        title.textContent = tab.dataset.title;
        description.textContent = tab.dataset.description;
        stage.classList.remove('is-changing');
      }, 90);
    }

    tabs.forEach(tab => tab.addEventListener('click', () => select(tab)));
  });

  const exactViewports = Array.from(document.querySelectorAll('.exact-screen-viewport'));
  if(exactViewports.length){
    const canvasWidth = 1366;
    const canvasHeight = 840;
    const fit = viewport => {
      const frame = viewport.querySelector('iframe');
      if(!frame) return;
      const naturalScale = viewport.clientWidth / canvasWidth;
      const scale = Math.min(1, naturalScale);
      viewport.style.height = Math.round(canvasHeight * scale) + 'px';
      frame.style.transform = 'scale(' + scale + ')';
    };
    exactViewports.forEach(fit);
    if('ResizeObserver' in window){
      const observer = new ResizeObserver(entries => entries.forEach(entry => fit(entry.target)));
      exactViewports.forEach(viewport => observer.observe(viewport));
    } else {
      window.addEventListener('resize', () => exactViewports.forEach(fit));
    }
  }

  document.querySelectorAll('[data-roi]').forEach(calculator => {
    const inputs = Array.from(calculator.querySelectorAll('input[type="range"]'));
    const scenarios = Array.from(calculator.querySelectorAll('.roi-scenarios input[type="radio"]'));
    const integer = new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
    const decimal = new Intl.NumberFormat('en-US',{maximumFractionDigits:1});
    const currency = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',currencyDisplay:'code',maximumFractionDigits:0});
    const money = value => currency.format(Math.round(value)).replace(/[\u00a0\u202f]/g,' ');
    const outputs = new Map(inputs.map(input => [input.name, calculator.querySelector('[data-output="' + input.name + '"]')]));
    const scenarioCopy = calculator.querySelector('[data-scenario-copy]');
    const results = {
      revenue: calculator.querySelector('[data-result="revenue"]'),
      baseline: calculator.querySelector('[data-result="baseline"]'),
      bookings: calculator.querySelector('[data-result="bookings"]'),
      monthly: calculator.querySelector('[data-result="monthly"]'),
      additionalBookings: calculator.querySelector('[data-result="additionalBookings"]')
    };

    function renderRoi(){
      const values = Object.fromEntries(inputs.map(input => [input.name, Number(input.value)]));
      const selectedScenario = scenarios.find(input => input.checked);
      const opportunityRate = selectedScenario ? Number(selectedScenario.value) : 5;
      inputs.forEach(input => {
        const output = outputs.get(input.name);
        if(!output) return;
        if(input.name === 'avgDeal') output.textContent = money(values[input.name]);
        else output.textContent = decimal.format(values[input.name]);
        const accessibleValues = {
          assets: decimal.format(values.assets) + ' shopping centres',
          deals: decimal.format(values.deals) + ' bookings per centre per year',
          avgDeal: money(values.avgDeal) + ' average booking value'
        };
        input.setAttribute('aria-valuetext',accessibleValues[input.name]);
        const range = Number(input.max) - Number(input.min);
        const progress = range ? ((values[input.name] - Number(input.min)) / range) * 100 : 0;
        input.style.setProperty('--range-progress', progress + '%');
      });

      const annualBookings = values.assets * values.deals;
      const baseline = annualBookings * values.avgDeal;
      const opportunity = baseline * (opportunityRate / 100);
      const additionalBookings = annualBookings * (opportunityRate / 100);
      const scenarioNames = {2:'Conservative',5:'Balanced',8:'Growth'};
      const additionalBookingsLabel = additionalBookings < 10 ? decimal.format(additionalBookings) : integer.format(Math.round(additionalBookings));

      if(scenarioCopy) scenarioCopy.textContent = 'Models a ' + opportunityRate + '% improvement in captured annual booking value (' + (scenarioNames[opportunityRate] || 'selected') + ' scenario).';
      if(results.revenue) results.revenue.textContent = money(opportunity);
      if(results.baseline) results.baseline.textContent = money(baseline);
      if(results.bookings) results.bookings.textContent = integer.format(annualBookings);
      if(results.monthly) results.monthly.textContent = money(opportunity / 12);
      if(results.additionalBookings) results.additionalBookings.textContent = additionalBookingsLabel;
    }

    inputs.forEach(input => input.addEventListener('input', renderRoi));
    scenarios.forEach(input => input.addEventListener('change', renderRoi));
    renderRoi();
  });

  document.querySelectorAll('[data-blog-filters]').forEach(filters => {
    const buttons = Array.from(filters.querySelectorAll('[data-blog-filter]'));
    const grid = document.querySelector('[data-blog-grid]');
    const cards = grid ? Array.from(grid.querySelectorAll('[data-blog-card]')) : [];
    if(!buttons.length || !cards.length) return;

    function selectCategory(category, updateUrl){
      const selected = buttons.some(button => button.dataset.blogFilter === category) ? category : 'all';
      buttons.forEach(button => button.setAttribute('aria-pressed', button.dataset.blogFilter === selected ? 'true' : 'false'));
      cards.forEach(card => {
        card.hidden = selected !== 'all' && card.dataset.category !== selected;
      });
      if(updateUrl && window.history && window.history.replaceState){
        const url = new URL(window.location.href);
        if(selected === 'all') url.searchParams.delete('category');
        else url.searchParams.set('category', selected);
        window.history.replaceState({},'',url.pathname + url.search + url.hash);
      }
    }

    buttons.forEach(button => button.addEventListener('click', () => selectCategory(button.dataset.blogFilter, true)));
    selectCategory(new URLSearchParams(window.location.search).get('category') || 'all', false);
  });

  const demoForm = document.querySelector('[data-demo-form]');
  if(demoForm){
    const status = demoForm.querySelector('.form-status');
    const submitButton = demoForm.querySelector('button[type="submit"]');
    const submitted = new URLSearchParams(window.location.search).get('submitted') === '1';
    if(submitted && status){
      status.textContent = 'Thank you — your demo request has been sent.';
      status.setAttribute('role','status');
    }
    demoForm.addEventListener('submit', () => {
      if(status) status.textContent = 'Sending your request…';
      if(submitButton){
        submitButton.disabled = true;
        submitButton.textContent = 'Sending…';
      }
    });
  }
})();
