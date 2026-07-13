(function(){
  const body = document.body;
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('#site-nav');
  const mobile = window.matchMedia('(max-width: 860px)');

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
