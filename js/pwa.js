// Wake lock, install prompt and service worker registration
import { state } from './state.js';
import { installButton } from './dom.js';

// ----- Wake lock (keeps the screen on while the timer runs) -----

export async function requestWakeLock() {
  try {
    state.wakeLock = await navigator.wakeLock.request('screen');
    console.log('Wake Lock activated');

    state.wakeLock.addEventListener('release', () => {
      console.log('Wake Lock released');
    });
  } catch (err) {
    console.error(`${err.name}, ${err.message}`);
  }
}

export function releaseWakeLock() {
  if (state.wakeLock !== null) {
    state.wakeLock.release();
    state.wakeLock = null;
  }
}

// Reacquire wake lock if page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.isRunning) {
    requestWakeLock();
  }
});

// ----- Install prompt -----

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    state.deferredPrompt = e;
    installButton.style.display = 'block';
  });

  installButton.addEventListener('click', async () => {
    if (!state.deferredPrompt) {
      return;
    }
    state.deferredPrompt.prompt();
    const { outcome } = await state.deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    state.deferredPrompt = null;
    installButton.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    installButton.style.display = 'none';
    state.deferredPrompt = null;
  });
}

// ----- Service worker -----

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;

  // Reload page when new service worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('New service worker activated, reloading...');
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/time/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);

        // Check for updates every time the app is opened
        registration.update();

        // Check for updates when page becomes visible
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            registration.update();
          }
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found, installing...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed, will activate...');
            }
          });
        });
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
