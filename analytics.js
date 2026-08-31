(function () {
  'use strict';

  const MEASUREMENT_ID = 'G-4TVC0YE9Y5';
  const STORAGE_KEY = 'road10-consent-v1';
  const PRODUCTION_HOSTS = new Set(['road10.ai', 'www.road10.ai']);
  const isProduction = PRODUCTION_HOSTS.has(window.location.hostname);
  const sentOnce = new Set();
  let preference = readPreference();
  let analyticsConsent = preference?.analytics === 'granted' ? 'granted' : 'denied';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: analyticsConsent,
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  window.gtag('set', 'ads_data_redaction', true);

  if (isProduction) {
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    document.head.appendChild(tag);
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function readPreference() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return value?.version === 1 ? value : null;
    } catch {
      return null;
    }
  }

  function savePreference(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Consent remains valid for current page even if browser storage is unavailable.
    }
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(part => {
      const name = part.split('=')[0].trim();
      if (!name.startsWith('_ga')) return;
      const base = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      document.cookie = base;
      document.cookie = `${base}; domain=${window.location.hostname}`;
      document.cookie = `${base}; domain=.road10.ai`;
    });
  }

  function updateConsent(value) {
    analyticsConsent = value;
    preference = { version: 1, analytics: value, updatedAt: new Date().toISOString() };
    savePreference(preference);
    window.gtag('consent', 'update', { analytics_storage: value });
    if (value === 'denied') clearAnalyticsCookies();
    window.dispatchEvent(new CustomEvent('road10:consent-change', {
      detail: { analytics: value }
    }));
    updateChoiceState();
    hidePanel();
  }

  function cleanParameters(parameters) {
    const clean = {};
    Object.entries(parameters || {}).forEach(([key, value]) => {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) return;
      if (['string', 'number', 'boolean'].includes(typeof value)) clean[key] = value;
    });
    return clean;
  }

  const analytics = {
    measurementId: MEASUREMENT_ID,
    consent: () => analyticsConsent,
    track(eventName, parameters) {
      if (!isProduction || analyticsConsent !== 'granted') return false;
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) return false;
      window.gtag('event', eventName, cleanParameters(parameters));
      return true;
    },
    trackOnce(key, eventName, parameters) {
      if (sentOnce.has(key)) return false;
      const sent = this.track(eventName, parameters);
      if (sent) sentOnce.add(key);
      return sent;
    },
    openSettings() {
      showPanel(true);
    }
  };
  window.road10Analytics = analytics;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .r10-consent-settings{border:0;background:transparent;color:inherit;padding:7px 9px;border-radius:9px;font:inherit;font-size:.8rem;cursor:pointer}
      .r10-consent-settings:hover{background:#fff}.r10-consent-settings:focus-visible,.r10-consent-panel button:focus-visible,.r10-consent-panel a:focus-visible{outline:3px solid #f17a54;outline-offset:3px}
      .r10-consent-panel{position:fixed;z-index:1000;left:50%;bottom:18px;transform:translateX(-50%);width:min(720px,calc(100% - 28px));padding:20px;border:1px solid #d7d1c5;border-radius:20px;background:#fffdf8;color:#132a2b;box-shadow:0 24px 70px #132a2b35;font-family:ui-rounded,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif}
      .r10-consent-panel[hidden]{display:none}.r10-consent-panel h2{margin:0 0 7px;font-size:1.1rem;letter-spacing:-.025em}.r10-consent-panel p{margin:0;color:#65716c;font-size:.86rem;line-height:1.6}.r10-consent-panel a{color:#9e402c;font-weight:800}
      .r10-consent-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:15px}.r10-consent-actions button{min-height:42px;padding:9px 14px;border:1px solid #132a2b;border-radius:11px;background:#fff;color:#132a2b;font:inherit;font-weight:900;cursor:pointer}.r10-consent-actions .allow{background:#132a2b;color:#fff}.r10-consent-actions .close{border-color:#d7d1c5;color:#65716c}.r10-consent-status{display:inline-block;margin-top:9px;padding:4px 8px;border-radius:999px;background:#d9eadb;color:#274436;font-size:.73rem;font-weight:900}
      @media(max-width:560px){.r10-consent-panel{bottom:10px;padding:17px;border-radius:16px}.r10-consent-actions{display:grid;grid-template-columns:1fr}.r10-consent-actions button{width:100%}.r10-consent-actions .allow{order:-1}}
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const panel = document.createElement('section');
    panel.className = 'r10-consent-panel';
    panel.id = 'r10-consent-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'r10-consent-title');
    panel.hidden = true;
    panel.innerHTML = `
      <h2 id="r10-consent-title">방문 통계 선택</h2>
      <p>필수 저장은 학습 진행과 선택 보관에 사용합니다. 분석을 허용하면 Google Analytics가 페이지·기기·유입·학습 이벤트 통계를 측정합니다. 거부 시 분석 저장소는 사용하지 않으며 Consent Mode에 따른 쿠키 없는 기본 신호만 전송될 수 있습니다. <a href="/cookies.html">자세히 보기</a></p>
      <span class="r10-consent-status" id="r10-consent-status"></span>
      <div class="r10-consent-actions">
        <button type="button" class="close" data-consent-close>닫기</button>
        <button type="button" data-consent-deny>필수만 사용</button>
        <button type="button" class="allow" data-consent-allow>분석 허용</button>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('[data-consent-allow]').addEventListener('click', () => updateConsent('granted'));
    panel.querySelector('[data-consent-deny]').addEventListener('click', () => updateConsent('denied'));
    panel.querySelector('[data-consent-close]').addEventListener('click', hidePanel);
    return panel;
  }

  function addSettingsButton() {
    const container = document.querySelector('.site-footer nav') || document.querySelector('footer');
    if (!container || container.querySelector('.r10-consent-settings')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'r10-consent-settings';
    button.textContent = '쿠키 설정';
    button.addEventListener('click', () => showPanel(true));
    container.appendChild(button);
  }

  function updateChoiceState() {
    const status = document.querySelector('#r10-consent-status');
    if (!status) return;
    status.textContent = preference
      ? `현재 선택 · ${analyticsConsent === 'granted' ? '분석 허용' : '필수만 사용'}`
      : '현재 선택 · 분석 거부 기본값';
  }

  function showPanel(force) {
    const panel = document.querySelector('#r10-consent-panel');
    if (!panel || (!force && preference)) return;
    updateChoiceState();
    panel.hidden = false;
  }

  function hidePanel() {
    const panel = document.querySelector('#r10-consent-panel');
    if (panel) panel.hidden = true;
  }

  function initInterface() {
    addStyles();
    buildPanel();
    addSettingsButton();
    showPanel(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInterface, { once: true });
  } else {
    initInterface();
  }
})();
