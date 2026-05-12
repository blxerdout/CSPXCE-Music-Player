/* ── Service Worker registration ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

/* ── Install prompt logic ── */
const DISMISSED_KEY = 'install-dismissed';

let deferredPrompt = null;

const banner     = document.getElementById('install-banner');
const androidMsg = document.getElementById('install-android');
const iosMsg     = document.getElementById('install-ios');
const btnInstall = document.getElementById('btn-install');
const btnDismiss = document.getElementById('install-dismiss');

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
const isStandalone = navigator.standalone === true ||
                     window.matchMedia('(display-mode: standalone)').matches;

function showBanner(type) {
  if (isStandalone) return;                          // already installed
  if (sessionStorage.getItem(DISMISSED_KEY)) return; // dismissed this session

  if (type === 'ios') {
    iosMsg.classList.remove('hidden');
  } else {
    androidMsg.classList.remove('hidden');
  }

  setTimeout(() => banner.classList.remove('hidden'), 4000); // wait 4s after load
}

/* Android / Chrome — intercept the browser's install event */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showBanner('android');
});

/* iOS Safari — no native prompt, show manual instructions */
if (isIOS && !isStandalone) {
  showBanner('ios');
}

/* Tap INSTALL on Android */
btnInstall?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  banner.classList.add('hidden');
});

/* Dismiss */
btnDismiss?.addEventListener('click', () => {
  banner.classList.add('hidden');
  sessionStorage.setItem(DISMISSED_KEY, '1');
});

/* Hide automatically after successful install */
window.addEventListener('appinstalled', () => {
  banner.classList.add('hidden');
  deferredPrompt = null;
});
