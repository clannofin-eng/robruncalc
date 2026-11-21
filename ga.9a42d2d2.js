/* Visit counter (Google Analytics 4) with a consent question for visitors from the EU/EEA, the UK and Switzerland.
   build_site.py copies this file to the site root as ga.<hash>.js and replaces G-4PKS5FLNR5.
   - Ads storage stays off for everyone (no ads on the site yet).
   - Outside Europe analytics cookies are on by default.
   - In Europe (guessed from the browser time zone) analytics cookies stay off until the visitor presses "Allow";
     Google also keeps them off for visitors whose IP is in those countries, whatever the time zone says.
   - The choice is kept in localStorage; a "Cookies" button in the footer lets a European visitor change it. */
(function () {
  'use strict';
  var ID = 'G-4PKS5FLNR5';
  var KEY = 'rrcalc:consent';
  var REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
    'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH'];
  var EU_TZ = ['Europe/Vienna', 'Europe/Brussels', 'Europe/Sofia', 'Europe/Zagreb', 'Asia/Nicosia', 'Asia/Famagusta',
    'Europe/Nicosia', 'Europe/Prague', 'Europe/Copenhagen', 'Europe/Tallinn', 'Europe/Helsinki', 'Europe/Mariehamn',
    'Europe/Paris', 'Europe/Berlin', 'Europe/Busingen', 'Europe/Athens', 'Europe/Budapest', 'Europe/Dublin', 'Europe/Rome',
    'Europe/Riga', 'Europe/Vilnius', 'Europe/Luxembourg', 'Europe/Malta', 'Europe/Amsterdam', 'Europe/Warsaw',
    'Europe/Lisbon', 'Atlantic/Madeira', 'Atlantic/Azores', 'Europe/Bucharest', 'Europe/Bratislava', 'Europe/Ljubljana',
    'Europe/Madrid', 'Africa/Ceuta', 'Atlantic/Canary', 'Europe/Stockholm', 'Atlantic/Reykjavik', 'Europe/Vaduz',
    'Europe/Oslo', 'Arctic/Longyearbyen', 'Europe/London', 'Europe/Belfast', 'Europe/Guernsey', 'Europe/Jersey',
    'Europe/Isle_of_Man', 'Europe/Gibraltar', 'Europe/Zurich', 'America/Guadeloupe', 'America/Martinique',
    'America/Cayenne', 'Indian/Reunion', 'Indian/Mayotte', 'America/Marigot', 'Europe/Monaco', 'Europe/San_Marino'];
  var TEXT = {
    ru: ['Мы считаем посещения через Google Analytics, чтобы понимать, откуда приходят игроки. Разрешить cookie для статистики?',
      'Разрешить', 'Не разрешать', 'Подробнее', 'Cookie'],
    en: ['We count visits with Google Analytics to see where players come from. Allow analytics cookies?',
      'Allow', 'Decline', 'Details', 'Cookies'],
    es: ['Contamos las visitas con Google Analytics para saber de dónde vienen los jugadores. ¿Permites las cookies de estadística?',
      'Permitir', 'Rechazar', 'Más información', 'Cookies'],
    pt: ['Contamos as visitas com o Google Analytics para saber de onde vêm os jogadores. Você permite cookies de estatística?',
      'Permitir', 'Recusar', 'Saiba mais', 'Cookies']
  };
  var MORE = 'https://policies.google.com/technologies/partner-sites';

  function load(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }

  var saved = load(KEY);
  if (saved !== 'granted' && saved !== 'denied') saved = null;
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
  var ask = EU_TZ.indexOf(tz) >= 0;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  function consent(a) {
    return {analytics_storage: a, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'};
  }
  var c = consent('denied');
  c.region = REGIONS;
  gtag('consent', 'default', c);
  gtag('consent', 'default', consent(ask ? 'denied' : 'granted'));
  if (saved) gtag('consent', 'update', consent(saved));
  gtag('js', new Date());
  gtag('config', ID);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
  document.head.appendChild(s);

  if (!ask) return;

  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var T = TEXT[lang] || TEXT.en;
  var box = null;

  function dropCookies() {
    var host = location.hostname;
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < parts.length; i++) {
      var name = parts[i].split('=')[0].replace(/^\s+|\s+$/g, '');
      if (!/^_ga/.test(name)) continue;
      var gone = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = name + gone;
      document.cookie = name + gone + '; domain=' + host;
      document.cookie = name + gone + '; domain=.' + host.replace(/^www\./, '');
    }
  }
  function choose(v) {
    save(KEY, v);
    gtag('consent', 'update', consent(v));
    if (v === 'denied') dropCookies();
    hide();
  }
  function hide() {
    if (box && box.parentNode) box.parentNode.removeChild(box);
    box = null;
  }
  function style() {
    if (document.getElementById('rr-consent-css')) return;
    var st = document.createElement('style');
    st.id = 'rr-consent-css';
    st.textContent =
      '.rr-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;' +
      'box-sizing:border-box;padding:14px 16px;background:#252a2f;color:#ece6da;border:1px solid #3e454d;' +
      'border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.45);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
      '.rr-consent p{margin:0 0 12px}' +
      '.rr-consent a{color:#9ca3ab}' +
      '.rr-consent .rr-row{display:flex;gap:8px;flex-wrap:wrap}' +
      '.rr-consent button{flex:1 1 140px;min-height:40px;padding:8px 14px;border-radius:8px;border:1px solid #3e454d;' +
      'background:#30363d;color:#ece6da;font:inherit;font-weight:600;cursor:pointer}' +
      '.rr-consent button:hover{border-color:#f47d30}' +
      '.rr-consent button:focus-visible{outline:2px solid #f47d30;outline-offset:2px}' +
      '.rr-cookies{background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}';
    document.head.appendChild(st);
  }
  function show() {
    if (box) return;
    style();
    box = document.createElement('div');
    box.className = 'rr-consent';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', T[4]);
    var p = document.createElement('p');
    p.appendChild(document.createTextNode(T[0] + ' '));
    var a = document.createElement('a');
    a.href = MORE;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = T[3];
    p.appendChild(a);
    var row = document.createElement('div');
    row.className = 'rr-row';
    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'rr-yes';
    yes.textContent = T[1];
    yes.addEventListener('click', function () { choose('granted'); });
    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'rr-no';
    no.textContent = T[2];
    no.addEventListener('click', function () { choose('denied'); });
    row.appendChild(yes);
    row.appendChild(no);
    box.appendChild(p);
    box.appendChild(row);
    document.body.appendChild(box);
  }
  function footerButton() {
    var spot = document.querySelector('.foot-links') || document.querySelector('p.src');
    if (!spot) return;
    style();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rr-cookies linkish';
    b.textContent = T[4];
    b.addEventListener('click', show);
    spot.appendChild(document.createTextNode(' '));
    spot.appendChild(b);
  }
  function ready() {
    footerButton();
    if (!saved) show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
