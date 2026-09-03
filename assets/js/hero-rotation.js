(() => {
  const phrases = [
    'specialty leasing',
    'space listing',
    'enquiry management',
    'booking workflows',
    'agreements & compliance',
    'invoicing & finance',
    'AI-powered operations'
  ];

  const el = document.getElementById('vts-typed');
  if (!el) return;

  let phraseIndex = 0;
  let charIndex = phrases[0].length;
  let deleting = false;

  function tick(){
    const current = phrases[phraseIndex];

    if(!deleting){
      if(charIndex < current.length){
        charIndex++;
        el.textContent = current.slice(0, charIndex);
        window.setTimeout(tick, 55);
      } else {
        deleting = true;
        window.setTimeout(tick, 1500);
      }
      return;
    }

    if(charIndex > 0){
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      window.setTimeout(tick, 28);
    } else {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      charIndex = 0;
      window.setTimeout(tick, 260);
    }
  }

  window.setTimeout(tick, 1500);
})();
