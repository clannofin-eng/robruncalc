/* Visit counter (Google Analytics 4) with a consent question for visitors from the EU/EEA, the UK and Switzerland.
   build_site.py copies this file to the site root as ga.<hash>.js and replaces G-4PKS5FLNR5.
   - Ads (Google AdSense): ad cookies are allowed outside Europe; in Europe they stay off here (AdSense asks itself).
   - The Russian pages show A-ADS banners instead (Google serves no ads in Russia). In Europe their frames wait inside
     <template class="aa-hold"> (a small script in the page puts them there) until the visitor presses "Allow" on a
     Russian page, where the question also names the ads; that answer is kept apart, under rrcalc:ads.
   - Outside Europe analytics cookies are on by default.
   - In Europe (guessed from the browser time zone) analytics cookies stay off until the visitor presses "Allow";
     Google also keeps them off for visitors whose IP is in those countries, whatever the time zone says.
   - The choice is kept in localStorage; a "Cookies" button in the footer lets a European visitor change it.
   - The site's owner opens any page with ?notrack once, and that browser is never counted again (no Google script at
     all, no consent question); ?track undoes it. A short note confirms either switch. */
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
  // [text, allow, decline, details, footer button, title]
  var TEXT = {
    ru: ['Для статистики посещений (Google Analytics): по ней видно, какие гайды и калькуляторы нужнее игрокам. И для рекламы A-ADS, ' +
      'благодаря которой сайт остаётся бесплатным.', 'Разрешить', 'Не разрешать', 'Подробнее', 'Cookie', 'Мы используем cookie'],
    en: ['For visit statistics (Google Analytics): they show which guides and calculators players need most, so we know what to improve.',
      'Allow', 'Decline', 'Details', 'Cookies', 'We use cookies'],
    es: ['Para las estadísticas de visitas (Google Analytics): muestran qué guías y calculadoras necesitan más los jugadores, para saber qué mejorar.',
      'Permitir', 'Rechazar', 'Más información', 'Cookies', 'Usamos cookies'],
    pt: ['Para as estatísticas de visitas (Google Analytics): mostram quais guias e calculadoras os jogadores mais usam, para sabermos o que melhorar.',
      'Permitir', 'Recusar', 'Saiba mais', 'Cookies', 'Usamos cookies'],
    de: ['Für die Besuchsstatistik (Google Analytics): Sie zeigt, welche Guides und Rechner die Spieler am meisten brauchen, damit wir wissen, ' +
      'was wir verbessern sollen.', 'Erlauben', 'Ablehnen', 'Details', 'Cookies', 'Wir verwenden Cookies'],
    fr: ['Pour les statistiques de visite (Google Analytics) : elles montrent quels guides et calculateurs servent le plus aux joueurs, ' +
      'pour savoir quoi améliorer.', 'Autoriser', 'Refuser', 'En savoir plus', 'Cookies', 'Nous utilisons des cookies']
  };
  var MORE = '/' + (document.documentElement.lang || 'en').slice(0, 2) + '/privacy/';
  var OFF = 'rrcalc:notrack';
  var SWITCHED = {
    ru: ['Статистика для этого браузера выключена: твои заходы больше не считаются.', 'Статистика для этого браузера снова включена.'],
    en: ['Analytics is off in this browser: your visits are no longer counted.', 'Analytics is on again in this browser.'],
    es: ['Estadísticas desactivadas en este navegador: tus visitas ya no se cuentan.', 'Estadísticas activadas de nuevo en este navegador.'],
    pt: ['Estatísticas desativadas neste navegador: suas visitas não são mais contadas.', 'Estatísticas ativadas de novo neste navegador.'],
    de: ['Die Statistik ist in diesem Browser aus: Deine Besuche werden nicht mehr gezählt.', 'Die Statistik ist in diesem Browser wieder an.'],
    fr: ['Les statistiques sont désactivées dans ce navigateur\u00a0: vos visites ne sont plus comptées.', 'Les statistiques sont de nouveau actives dans ce navigateur.']
  };

  function load(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  function drop(k) { try { window.localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }

  // ?notrack / ?track: the owner's switch. The word leaves the address at once, so it never travels in a shared link.
  var q = location.search, switched = -1;
  if (/[?&]notrack(=[^&]*)?(&|$)/.test(q)) { save(OFF, '1'); switched = 0; }
  else if (/[?&]track(=[^&]*)?(&|$)/.test(q)) { drop(OFF); switched = 1; }
  if (switched >= 0) {
    var rest = q.replace(/[?&](no)?track(=[^&]*)?(?=&|$)/g, '').replace(/^&/, '?');
    try { history.replaceState(null, '', location.pathname + (rest === '?' ? '' : rest) + location.hash); } catch (e) { /* ignore */ }
    var note = function () {
      var lg = (document.documentElement.lang || 'en').slice(0, 2);
      var d = document.createElement('div');
      d.className = 'rr-switched';
      d.setAttribute('role', 'status');
      d.textContent = (SWITCHED[lg] || SWITCHED.en)[switched];
      d.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;max-width:calc(100% - 24px);' +
        'box-sizing:border-box;padding:10px 14px;background:#252a2f;color:#ece6da;border:1px solid #3e454d;border-radius:10px;' +
        'box-shadow:0 8px 28px rgba(0,0,0,.45);font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
      document.body.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 5000);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', note); else note();
  }
  // events the page tracked before this deferred script ran (see track() in the page)
  var queued = window.rrEvents = window.rrEvents || [];
  if (load(OFF) === '1') {
    window.gtag = function () { /* the owner's browser: nothing is sent */ };
    queued.length = 0;
    queued.flushed = true;
    return;
  }

  var saved = load(KEY);
  if (saved !== 'granted' && saved !== 'denied') saved = null;
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
  var ask = EU_TZ.indexOf(tz) >= 0;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  function consent(a, ads) {
    ads = ads || 'denied';
    return {analytics_storage: a, ad_storage: ads, ad_user_data: ads, ad_personalization: ads};
  }
  var c = consent('denied');
  c.region = REGIONS;
  gtag('consent', 'default', c);
  gtag('consent', 'default', ask ? consent('denied') : consent('granted', 'granted'));
  if (saved) gtag('consent', 'update', consent(saved));
  gtag('js', new Date());
  gtag('config', ID);
  for (var i = 0; i < queued.length; i++) gtag('event', queued[i][0], queued[i][1]);
  queued.length = 0;
  queued.flushed = true;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
  document.head.appendChild(s);

  if (!ask) return;

  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var T = TEXT[lang] || TEXT.en;
  var box = null;
  // the A-ADS banners (Russian pages only): asked about together with the statistics, kept under their own key
  var ADS = 'rrcalc:ads';
  var adPage = !!document.querySelector('.aa-row');
  var savedAds = load(ADS);

  function releaseAds() {
    var held = document.querySelectorAll('template.aa-hold');
    for (var i = 0; i < held.length; i++) {
      var t = held[i], spot = t.parentNode;
      if (!t.content) continue;
      spot.insertBefore(document.importNode(t.content, true), t);
      spot.removeChild(t);
      spot.className = spot.className.replace(/(^|\s)aa-off(?=\s|$)/g, '');
    }
  }

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
    if (adPage) {
      save(ADS, v);
      savedAds = v;
      if (v === 'granted') releaseAds();
    }
    gtag('consent', 'update', consent(v));
    if (v === 'denied') dropCookies();
    hide();
  }
  function hide() {
    if (!box) return;
    var b = box;
    box = null;
    document.documentElement.classList.remove('rr-lock');
    if (b.open && b.close) b.close();
    if (b.parentNode) b.parentNode.removeChild(b);
  }
  function style() {
    if (document.getElementById('rr-consent-css')) return;
    var st = document.createElement('style');
    st.id = 'rr-consent-css';
    st.textContent =
      '.rr-consent{box-sizing:border-box;width:min(460px,calc(100% - 24px));max-width:none;max-height:calc(100% - 24px);overflow:auto;' +
      'margin:auto;padding:22px 22px 20px;background:#252a2f;color:#ece6da;border:1px solid #3e454d;border-radius:14px;' +
      'box-shadow:0 18px 60px rgba(0,0,0,.6);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
      '.rr-consent::backdrop{background:rgba(12,14,16,.74)}' +
      '.rr-consent:focus{outline:none}' +
      '.rr-consent h2{margin:0 0 8px;font-family:inherit;font-size:19px;line-height:1.25;font-weight:700;color:#ece6da}' +
      '.rr-consent p{margin:0 0 18px;color:#c9ced4}' +
      '.rr-consent a{color:#ece6da;text-decoration-color:#f47d30;text-underline-offset:3px}' +
      '.rr-consent .rr-row{display:flex;gap:10px;flex-wrap:wrap}' +
      '.rr-consent button{flex:1 1 150px;min-height:44px;padding:10px 16px;border-radius:10px;border:1px solid #3e454d;' +
      'background:#30363d;color:#ece6da;font:inherit;font-weight:600;cursor:pointer}' +
      '.rr-consent .rr-yes{background:#ece6da;border-color:#ece6da;color:#1c2024}' +
      '.rr-consent button:hover{border-color:#f47d30}' +
      '.rr-consent button:focus-visible{outline:2px solid #f47d30;outline-offset:2px}' +
      // the page with the details (the privacy page) keeps a small box at the bottom, so it can be read
      '.rr-consent.rr-bar{position:fixed;left:12px;right:12px;bottom:12px;top:auto;z-index:2147483000;width:auto;max-width:640px;' +
      'margin:0 auto;padding:14px 16px;font-size:14px}' +
      '.rr-bar h2{font-size:15px;margin:0 0 4px}.rr-bar p{margin:0 0 12px}.rr-bar button{min-height:40px}' +
      'html.rr-lock{overflow:hidden;scrollbar-gutter:stable}' +
      '.rr-cookies{background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}';
    document.head.appendChild(st);
  }
  // A window in the middle of the page that has to be answered before the site can be used: "Allow" or "Decline", side by
  // side on the first screen, as EU rules ask (no cookie wall, refusing as easy as allowing). On the privacy page it is a
  // small box at the bottom instead, so the details can be read; browsers without <dialog> get that box too.
  function show() {
    if (box) return;
    style();
    var modal = !/\/privacy\/$/.test(location.pathname) && typeof HTMLDialogElement === 'function' &&
      typeof HTMLDialogElement.prototype.showModal === 'function';
    box = document.createElement(modal ? 'dialog' : 'div');
    box.className = modal ? 'rr-consent' : 'rr-consent rr-bar';
    box.setAttribute('aria-labelledby', 'rr-consent-h');
    if (!modal) box.setAttribute('role', 'region');
    var h = document.createElement('h2');
    h.id = 'rr-consent-h';
    h.textContent = T[5];
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
    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(row);
    document.body.appendChild(box);
    if (!modal) return;
    var dlg = box;
    // Esc does not close it: one of the two answers is needed (if the browser closes it anyway, nothing is allowed and
    // the question comes back on the next page)
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); });
    dlg.addEventListener('close', function () { if (box === dlg) hide(); });
    // focus on the window itself, not on its first link (no ring around "Details" when it opens)
    dlg.setAttribute('autofocus', '');
    dlg.tabIndex = -1;
    document.documentElement.classList.add('rr-lock');
    dlg.showModal();
    if (document.activeElement !== dlg) dlg.focus({ preventScroll: true });
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
    if (!saved || (adPage && savedAds !== 'granted' && savedAds !== 'denied')) show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
