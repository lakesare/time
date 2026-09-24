// Entry point: wires up event listeners and boots the app
import { state } from './state.js';
import {
  applySettingsBtn, startStopBtn, resetBtn, menuBtn, rotateBtn, displaySettingsBtn,
  stopTimerBtn, closeModalBtn, copyLinkBtn, menuOverlay, settingsModal,
  showWorkNumbersCheckbox, largeTimeCheckbox, workColorPicker, colorPresets,
  sessionsInput, startWithRestCheckbox,
} from './dom.js';
import { saveTimerConfig, saveTimerProgress } from './storage.js';
import { startNewTimer, startTimer, stopTimer, resetTimer, restoreTimerProgress } from './timer.js';
import {
  openMenu, closeMenu, openSettingsModal, closeSettingsModal, applyDisplaySettings,
  updateSelectedColorPreset, selectColorPreset, rotateBy90, goToSetup,
  saveToTimersList, renderSavedTimers, copyTimerLink, loadSettings,
} from './ui.js';
import { setupInstallPrompt, registerServiceWorker } from './pwa.js';

// ----- Timer controls -----

applySettingsBtn.addEventListener('click', () => {
  saveTimerConfig();
  saveToTimersList();
  if (startNewTimer()) {
    applyDisplaySettings();
  }
});

startStopBtn.addEventListener('click', () => {
  if (state.isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
});

resetBtn.addEventListener('click', resetTimer);

// ----- Menu -----

menuBtn.addEventListener('click', openMenu);
rotateBtn.addEventListener('click', rotateBy90);
displaySettingsBtn.addEventListener('click', openSettingsModal);
stopTimerBtn.addEventListener('click', goToSetup);

// Close menu when clicking outside
menuOverlay.addEventListener('click', (e) => {
  if (e.target === menuOverlay) closeMenu();
});

// ----- Display settings modal -----

closeModalBtn.addEventListener('click', closeSettingsModal);

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettingsModal();
});

// Apply display settings in real-time as inputs change
showWorkNumbersCheckbox.addEventListener('change', applyDisplaySettings);
largeTimeCheckbox.addEventListener('change', applyDisplaySettings);
workColorPicker.addEventListener('input', applyDisplaySettings);
workColorPicker.addEventListener('input', updateSelectedColorPreset);
colorPresets.forEach(preset => {
  preset.addEventListener('click', () => selectColorPreset(preset));
});

// ----- Setup screen -----

copyLinkBtn.addEventListener('click', () => copyTimerLink(copyLinkBtn));

// ----- Boot -----

loadSettings();
updateSelectedColorPreset();
renderSavedTimers();

// A "?50 10 50 10" or "?rest:10 50" query opens that timer directly
function handleUrlQuery() {
  const query = window.location.search.slice(1);
  if (!query) return false;

  // Spaces might be encoded as %20 or +
  let sessions = decodeURIComponent(query.replace(/\+/g, ' '));

  const startWithRest = sessions.startsWith('rest:');
  if (startWithRest) {
    sessions = sessions.slice(5);
  }

  sessionsInput.value = sessions;
  startWithRestCheckbox.checked = startWithRest;

  if (!startNewTimer()) return false;
  applyDisplaySettings();

  // Remove query from URL without reload
  history.replaceState({}, '', window.location.pathname);
  return true;
}

// Handle URL query first, otherwise restore timer progress
if (!handleUrlQuery()) {
  restoreTimerProgress();
}

// Save timer progress when page is hidden/closing
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.blocks.length > 0) {
    saveTimerProgress();
  }
});

setupInstallPrompt();
registerServiceWorker();
