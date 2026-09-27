// Behavioral checks for the production scripts; no real form, email or Analytics requests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const root = path.join(__dirname, '..');
const demoCode = fs.readFileSync(path.join(root, 'assets/js/demo-form.js'), 'utf8');
const analyticsCode = fs.readFileSync(path.join(root, 'assets/js/analytics.js'), 'utf8');
const pendingKey = 'crenex.demo.pending.v1';
const choiceKey = 'crenex.analytics.choice.v1';
const sourceKey = 'crenex.analytics.source.v1';
const token = '1234567890abcdef1234567890abcdef';
const time = 1790538000000;
class Node {
  constructor() { this.handlers = {}; this.attrs = {}; this.dataset = {}; this.children = []; this.hidden = false; }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  emit(type, event = {}) { event.preventDefault ||= () => { event.prevented = true; }; for (const fn of this.handlers[type] || []) fn(event); return event; }
  setAttribute(key, value) { this.attrs[key] = value; }
  removeAttribute(key) { delete this.attrs[key]; }
  appendChild(node) { this.children.push(node); }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
}
function storage(seed = {}, blocked = false) {
  const map = new Map(Object.entries(seed));
  return { map, getItem(k) { if (blocked) throw Error('blocked'); return map.get(k) || null; }, setItem(k, v) { if (blocked) throw Error('blocked'); map.set(k, v); }, removeItem(k) { if (blocked) throw Error('blocked'); map.delete(k); } };
}
function demo({ query = '', seed = {}, blocked = false, online = true, valid = true, state = null } = {}) {
  const form = new Node(), button = new Node(), status = new Node(), notice = new Node(), title = new Node(), text = new Node(), win = new Node();
  const session = storage(seed, blocked), calls = [];
  const location = new URL('https://crenex.io/demo.html' + query);
  const attribution = ['landing_page','source','medium','campaign'].map(key => Object.assign(new Node(), { dataset: { attribution: key } }));
  form.elements = { _next: { value: '' } };
  form.querySelector = selector => selector === '.form-status' ? status : button;
  form.querySelectorAll = () => attribution;
  form.checkValidity = () => valid;
  form.reportValidity = () => { form.reported = true; };
  notice.querySelector = selector => selector === 'h2' ? title : text;
  win.location = location;
  win.crenexAnalytics = { track: name => calls.push(name), attribution: () => ({ source: 'google', landing_page: '/platform.html' }) };
  const history = { state, replaceState(value, _, target) { this.state = value; this.url = target; } };
  const document = { querySelector: selector => selector === '[data-demo-form]' ? form : notice };
  vm.runInNewContext(demoCode, { window: win, document, sessionStorage: session, history, navigator: { onLine: online }, crypto: webcrypto, Uint8Array, URL, Date: class extends Date { static now() { return time; } } });
  return { form, button, status, notice, title, text, session, calls, history, win, attribution };
}
test('a copied legacy success URL never reports a lead', () => {
  const d = demo({query:'?submitted=1'});
  assert.equal(d.notice.dataset.state, 'unconfirmed'); assert.deepEqual(d.calls, []); assert.equal(d.history.url, '/demo.html#demo-confirmation');
});
test('a matched recent provider return consumes the attempt and reports one lead', () => {
  const seed = {[pendingKey]:JSON.stringify({id:token,at:time-1000})};
  const d = demo({query:'?submission='+token,seed});
  assert.equal(d.notice.dataset.state, 'success'); assert.equal(d.notice.focused, true); assert.deepEqual(d.calls, ['generate_lead']); assert.equal(d.session.getItem(pendingKey), null);
  const refresh = demo({state:d.history.state}); assert.equal(refresh.notice.dataset.state,'success'); assert.deepEqual(refresh.calls, []);
  const replay = demo({query:'?submission='+token}); assert.equal(replay.notice.dataset.state,'unconfirmed'); assert.deepEqual(replay.calls, []);
});
test('mismatched, expired and future attempts never count as leads', () => {
  for(const attempt of [{id:'bad',at:time-1000},{id:token,at:time-1800001},{id:token,at:time+1000}]) {
    const d=demo({query:'?submission='+token,seed:{[pendingKey]:JSON.stringify(attempt)}}); assert.deepEqual(d.calls,[]); assert.equal(d.notice.dataset.state,'unconfirmed');
  }
});
test('valid submit keeps native verification, persists no contact data, and prevents double click', () => {
  const d = demo(); d.form.emit('input'); d.form.emit('input'); const first=d.form.emit('submit');
  assert.equal(first.prevented,undefined); assert.equal(d.button.disabled,true); assert.equal(d.calls.filter(x=>x==='demo_form_start').length,1); assert.equal(d.calls.includes('generate_lead'),false);
  const saved=JSON.parse(d.session.getItem(pendingKey)); assert.deepEqual(Object.keys(saved).sort(),['at','id']); assert.match(saved.id,/^[a-f0-9]{32}$/);
  const next=new URL(d.form.elements._next.value); assert.equal(next.searchParams.get('submission'),saved.id); assert.equal(next.hash,'#demo-confirmation');
  assert.equal(d.form.emit('submit').prevented,true); assert.equal(d.calls.filter(x=>x==='demo_submit_attempt').length,1);
  d.win.emit('pageshow',{persisted:true}); assert.equal(d.button.disabled,false); assert.equal(d.form.attrs['aria-busy'],undefined);
});
test('offline and invalid forms do not submit or count leads', () => {
  const offline=demo({online:false}); assert.equal(offline.form.emit('submit').prevented,true); assert.match(offline.status.textContent,/offline/); assert.equal(offline.session.getItem(pendingKey),null);
  const invalid=demo({valid:false}); assert.equal(invalid.form.emit('submit').prevented,true); assert.deepEqual(invalid.calls,[]); assert.equal(invalid.form.reported,true);
});
test('blocked session storage does not prevent enquiries or pretend to verify success', () => {
  const d=demo({blocked:true}); assert.equal(d.form.emit('submit').prevented,undefined); assert.equal(new URL(d.form.elements._next.value).searchParams.get('submitted'),'1');
  const back=demo({query:'?submitted=1',blocked:true}); assert.equal(back.notice.dataset.state,'unconfirmed'); assert.deepEqual(back.calls,[]);
});
function analytics({choice,query='',hostname='crenex.io',referrer='',blocked=false}={}) {
  const win=new Node(), document=new Node(), head=new Node(), body=new Node(), footer=new Node();
  const local=storage(choice ? {[choiceKey]:JSON.stringify(choice)} : {},blocked), session=storage({},blocked);
  const location=new URL('https://'+hostname+'/demo.html'+query); location.reload=()=>{location.reloaded=true;};
  let panel;
  document.title='Crenex demo'; document.referrer=referrer; document.cookie=''; document.head=head; document.body=body;
  document.querySelector=selector=>selector.startsWith('link') ? {href:'https://crenex.io/demo.html'} : footer;
  document.createElement=tag=>{
    const node=new Node(); node.tagName=tag;
    if(tag==='section') {
      panel=node; const reject=Object.assign(new Node(),{dataset:{choice:'denied'}}), allow=Object.assign(new Node(),{dataset:{choice:'granted'}});
      node.querySelectorAll=()=>[reject,allow]; node.querySelector=()=>reject;
    }
    return node;
  };
  // Supply a test ID to exercise consent independently from the external account setup.
  const code=analyticsCode.replace(/const measurementId = '[^']*';/,"const measurementId = 'G-TEST123';");
  vm.runInNewContext(code,{window:win,document,localStorage:local,sessionStorage:session,location,URL,Date:class extends Date{static now(){return time;}}});
  return {win,head,body,footer,panel,local,session,location,document};
}
test('no tag or analytics events before consent, including after rejection',()=>{
  const a=analytics(); assert.equal(a.head.children.length,0); assert.equal(a.panel.hidden,false); assert.equal(a.win.crenexAnalytics.track('generate_lead'),false); assert.equal(a.session.getItem(sourceKey),null);
  a.panel.querySelectorAll()[0].emit('click'); assert.equal(a.head.children.length,0); assert.equal(a.panel.hidden,true);
  const next=analytics({choice:{value:'denied',at:time-1000}}); assert.equal(next.head.children.length,0); assert.equal(next.panel.hidden,true);
});
test('consent loads one tag and canonical-only page data; form fields and unknown events are excluded',()=>{
  const a=analytics({query:'?email=secret@example.com&submission=private-token&utm_source=google&utm_medium=cpc&utm_campaign=leasing_2026',referrer:'https://search.example/query?email=secret@example.com'});
  a.panel.querySelectorAll()[1].emit('click'); assert.equal(a.head.children.length,1);
  assert.equal(a.win.crenexAnalytics.track('generate_lead'),true); assert.equal(a.win.crenexAnalytics.track('email'),false);
  const data=JSON.stringify(a.win.dataLayer); assert.equal(data.includes('secret'),false); assert.equal(data.includes('private-token'),false); assert.equal(data.includes('leasing_2026'),true);
  assert.equal(a.win.crenexAnalytics.attribution().landing_page,'/demo.html');
  a.panel.querySelectorAll()[1].emit('click'); assert.equal(a.head.children.length,1);
});
test('revoking consent disables analytics and clears source context',()=>{
  const a=analytics({choice:{value:'granted',at:time-1000}}); assert.equal(a.head.children.length,1);
  a.panel.querySelectorAll()[0].emit('click'); assert.equal(a.win['ga-disable-G-TEST123'],true); assert.equal(a.win.crenexAnalytics.track('generate_lead'),false); assert.equal(a.session.getItem(sourceKey),null); assert.equal(a.location.reloaded,true);
});
test('expired, malformed or future consent is not accepted',()=>{
  for(const choice of [{value:'granted',at:time-181*86400000},{value:'granted',at:time+1000},{value:'surprise',at:time}]) {
    const a=analytics({choice}); assert.equal(a.head.children.length,0); assert.equal(a.panel.hidden,false);
  }
});
test('local preview never sends Analytics and unusual campaign values are not forwarded',()=>{
  const local=analytics({hostname:'localhost',choice:{value:'granted',at:time-1000}}); assert.equal(local.head.children.length,0);
  const a=analytics({query:'?utm_source=person@example.com&utm_campaign=Alice%20Smith',choice:{value:'granted',at:time-1000}});
  assert.equal(JSON.stringify(a.win.dataLayer).includes('Alice'),false); assert.equal(JSON.stringify(a.win.dataLayer).includes('person@'),false);
});
