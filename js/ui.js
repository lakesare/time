// Menu, display settings modal, rotation, color presets and the saved timers list
import { state } from './state.js';
import {
  menuOverlay, settingsModal,
  largeTimeCheckbox, showWorkNumbersCheckbox, workColorPicker, colorPresets,
  sessionsInput, startWithRestCheckbox, savedTimersSection, savedTimersList,
} from './dom.js';
import {
  loadDisplaySettings, saveDisplaySettings, loadRotation, saveRotation, loadTimerConfig,
  getSavedTimers, setSavedTimers, addCurrentTimerToSavedList, clearTimerProgress,
} from './storage.js';
import { regenerateBlocksWithSettings, showSetupScreen } from './timer.js';

// ----- Menu -----

export function openMenu() {
  menuOverlay.classList.add('visible');
}

export function closeMenu() {
  menuOverlay.classList.remove('visible');
}

// ----- Display settings modal -----

export function openSettingsModal() {
  closeMenu();
  settingsModal.classList.add('visible');
}

export function closeSettingsModal() {
  applyDisplaySettings();
  settingsModal.classList.remove('visible');
}

export function applyDisplaySettings() {
  document.body.classList.toggle('setting-large-time', largeTimeCheckbox.checked);
  document.documentElement.style.setProperty('--custom-work-color', workColorPicker.value);

  // Regenerate blocks if a timer exists, to apply "show work numbers"
  if (state.blocks.length > 0 && !state.isRunning) {
    regenerateBlocksWithSettings();
  }

  saveDisplaySettings();
}

export function updateSelectedColorPreset() {
  const currentColor = workColorPicker.value.toLowerCase();
  colorPresets.forEach(preset => {
    const isCurrent = preset.getAttribute('data-color').toLowerCase() === currentColor;
    preset.classList.toggle('selected', isCurrent);
  });
}

export function selectColorPreset(preset) {
  workColorPicker.value = preset.getAttribute('data-color');
  applyDisplaySettings();
  updateSelectedColorPreset();
}

// ----- Rotation -----

export function applyRotation() {
  if (state.rotation === 0) {
    document.documentElement.removeAttribute('data-rotation');
  } else {
    document.documentElement.setAttribute('data-rotation', state.rotation);
  }
}

export function rotateBy90() {
  state.rotation = (state.rotation + 90) % 360;
  applyRotation();
  saveRotation();
}

// ----- Setup screen -----

// "STOP THIS TIMER": abandon the current timer and go back to the setup screen
export function goToSetup() {
  closeMenu();
  clearTimerProgress();
  state.blocks = [];
  state.timeRemaining = [];
  state.timerStarted = false;
  showSetupScreen();
  renderSavedTimers();
}

export function saveToTimersList() {
  if (addCurrentTimerToSavedList()) {
    renderSavedTimers();
  }
}

export function renderSavedTimers() {
  const savedTimers = getSavedTimers();

  if (savedTimers.length === 0) {
    savedTimersSection.style.display = 'none';
    return;
  }

  savedTimersSection.style.display = 'block';
  savedTimersList.innerHTML = '';

  savedTimers.forEach((timer, index) => {
    const chip = document.createElement('div');
    chip.className = 'saved-timer-chip';
    chip.style.cursor = 'pointer';

    const label = document.createElement('span');
    label.textContent = timer.sessions + (timer.startWithRest ? ' (rest first)' : '');

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'saved-timer-delete';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete this timer';

    // Load timer on chip click (excluding delete button)
    chip.addEventListener('click', (e) => {
      if (e.target === deleteBtn) return;
      sessionsInput.value = timer.sessions;
      startWithRestCheckbox.checked = timer.startWithRest;
    });

    deleteBtn.addEventListener('click', () => deleteSavedTimer(index));

    chip.appendChild(label);
    chip.appendChild(deleteBtn);
    savedTimersList.appendChild(chip);
  });
}

function deleteSavedTimer(index) {
  const savedTimers = getSavedTimers();
  savedTimers.splice(index, 1);
  setSavedTimers(savedTimers);
  renderSavedTimers();
}

// Copies a link that opens this timer directly
export function copyTimerLink(copyLinkBtn) {
  const sessions = sessionsInput.value.trim();
  if (!sessions) return;

  const prefix = startWithRestCheckbox.checked ? 'rest:' : '';
  const url = window.location.origin + window.location.pathname + '?' + prefix + encodeURIComponent(sessions);

  navigator.clipboard.writeText(url).then(() => {
    const originalText = copyLinkBtn.textContent;
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyLinkBtn.textContent = originalText;
    }, 1500);
  });
}

// ----- Initial load -----

export function loadSettings() {
  loadRotation();
  applyRotation();
  loadDisplaySettings();
  loadTimerConfig();
  applyDisplaySettings();
}
