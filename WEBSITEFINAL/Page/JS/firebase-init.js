// Simple Firebase loader using the compat SDKs so we can call firebase.auth() and firebase.database()
// Returns a promise that resolves to the global `firebase` object.
(function (global) {
  // Allow overriding via a small client-side env file (Page/JS/env.local.js)
  const FIREBASE_CONFIG = (window.__ENV && window.__ENV.FIREBASE_CONFIG) ? window.__ENV.FIREBASE_CONFIG : {
    apiKey: "AIzaSyAA25xHdOKXO3Xejj23-JjfGnTDd1gZPZM",
    authDomain: "perlas-database.firebaseapp.com",
    databaseURL: "https://perlas-database-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "perlas-database",
    storageBucket: "perlas-database.firebasestorage.app",
    messagingSenderId: "623014500525",
    appId: "1:623014500525:web:48b3fbb3759dd3c4b90e24",
    measurementId: "G-KFK18WZW79"
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  let initPromise = null;
  global.loadFirebase = function () {
    if (initPromise) return initPromise;

    initPromise = Promise.resolve()
      // use compat builds so we can use the familiar names (firebase.auth(), firebase.database())
      .then(() => loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js'))
      .then(() => loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js'))
      .then(() => loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js'))
      .then(() => {
        if (!global.firebase || !global.firebase.apps || global.firebase.apps.length === 0) {
          global.firebase.initializeApp(FIREBASE_CONFIG);
        }
        return global.firebase;
      });

    return initPromise;
  };

})(window);

// Page transition loader: fish passing animation
(function (global) {
  const LOAD_DELAY = 450; // ms before navigating to allow animation to show

  function createLoader() {
    const container = document.createElement('div');
    container.id = 'pageLoader';
    container.className = 'page-loader';
    container.innerHTML = `
      <div class="loader-backdrop"></div>
      <div class="fish-wrap" aria-hidden="true">
        <svg class="fish" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="g1" x1="0%" x2="100%">
              <stop offset="0%" stop-color="#ffd966" />
              <stop offset="100%" stop-color="#ff6b6b" />
            </linearGradient>
          </defs>
          <g>
            <ellipse cx="90" cy="50" rx="50" ry="30" fill="url(#g1)" />
            <polygon points="140,50 170,30 170,70" fill="#ff8a65" />
            <circle cx="70" cy="40" r="6" fill="#222" />
            <path d="M60 60 q-8 8 -16 0" stroke="#ff8a65" stroke-width="6" fill="none" stroke-linecap="round" />
          </g>
        </svg>
      </div>
    `;

    const style = document.createElement('style');
    style.id = 'pageLoaderStyles';
    style.textContent = `
      .page-loader { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; pointer-events: none; z-index: 99999; }
      .page-loader.visible { display: flex; pointer-events: auto; }
      .loader-backdrop { position: absolute; inset: 0; background: rgba(6,10,20,0.35); backdrop-filter: blur(2px); }
      .fish-wrap { position: relative; width: 60vw; max-width: 600px; height: 140px; overflow: visible; }
      .fish { width: 100%; height: 100%; transform-origin: left center; }
      /* Swim animation: move from left to right */
      .fish-wrap .fish { transform: translateX(-120%); animation: swim 1.2s linear forwards; }
      @keyframes swim { 0% { transform: translateX(-120%) scaleX(1); } 50% { transform: translateX(20%) scaleX(1); } 100% { transform: translateX(120%) scaleX(1); } }
      /* small bobbing */
      .fish-wrap { animation: bob 1.6s ease-in-out infinite; }
      @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      /* make sure loader content isn't selectable */
      .page-loader * { user-select: none; -webkit-user-select: none; }
    `;

    document.head.appendChild(style);
    document.body.appendChild(container);
    return container;
  }

  let loaderEl = null;
  function ensureLoader() {
    if (!loaderEl) loaderEl = createLoader();
    return loaderEl;
  }

  function showLoader() {
    const el = ensureLoader();
    el.classList.add('visible');
    // Remove any existing fish so animation restarts next time
    const wrap = el.querySelector('.fish-wrap');
    if (wrap) {
      const newWrap = wrap.cloneNode(true);
      wrap.parentNode.replaceChild(newWrap, wrap);
    }
  }

  function hideLoader() {
    if (!loaderEl) return;
    loaderEl.classList.remove('visible');
  }

  function isInternalLink(a) {
    try {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      if (a.target && a.target.toLowerCase() === '_blank') return false;
      const url = new URL(href, location.href);
      return url.origin === location.origin && url.pathname.endsWith('.html');
    } catch (e) { return false; }
  }

  function attachLinkInterceptors() {
    document.addEventListener('click', function (e) {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      if (!isInternalLink(a)) return;
      // Allow ctrl/cmd clicks to open in new tab
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      const url = a.href;
      showLoader();
      setTimeout(() => { location.assign(url); }, LOAD_DELAY);
    }, true);
  }

  // Patch location.assign/replace to show loader for programmatic navigations as well
  function patchLocationMethods() {
    try {
      const origAssign = location.assign.bind(location);
      location.assign = function (url) {
        showLoader();
        setTimeout(() => origAssign(url), LOAD_DELAY);
      };

      const origReplace = location.replace.bind(location);
      location.replace = function (url) {
        showLoader();
        setTimeout(() => origReplace(url), LOAD_DELAY);
      };
    } catch (e) {
      // If patching fails, silently ignore
      console.warn('Could not patch location methods for loader:', e);
    }
  }

  // Initialize loader on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureLoader();
      attachLinkInterceptors();
      patchLocationMethods();
    });
  } else {
    ensureLoader();
    attachLinkInterceptors();
    patchLocationMethods();
  }

  // Optionally hide loader when page becomes visible (in case navigation was cancelled)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') hideLoader();
  });

  // Expose API for other scripts to use programmatically
  global.showPageLoader = showLoader;
  global.hidePageLoader = hideLoader;

})(window);
