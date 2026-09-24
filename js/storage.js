// Everything that reads or writes localStorage
import { state } from './state.js';
import {
  sessionsInput, startWithRestCheckbox,
  showWorkNumbersCheckbox, largeTimeCheckbox, workColorPicker,
} from './dom.js';

// ----- Display settings -----

export function loadDisplaySettings() {
  const showWorkNumbers = localStorage.getItem('showWorkNumbers');
  const largeTime = localStorage.getItem('largeTime');
  const workColor = localStorage.getItem('workColor');

  if (showWorkNumbers !== null) {
    showWorkNumbersCheckbox.checked = showWorkNumbers === 'true';
  }
  if (largeTime !== null) {
    largeTimeCheckbox.checked = largeTime === 'true';
  }
  if (workColor !== null) {
    workColorPicker.value = workColor;
  }
}

export function saveDisplaySettings() {
  localStorage.setItem('showWorkNumbers', showWorkNumbersCheckbox.checked);
  localStorage.setItem('largeTime', largeTimeCheckbox.checked);
  localStorage.setItem('workColor', workColorPicker.value);
}

// ----- Rotation -----

export function loadRotation() {
  const savedRotation = parseInt(localStorage.getItem('rotation'), 10);
  if ([90, 180, 270].includes(savedRotation)) {
    state.rotation = savedRotation;
  }
}

export function saveRotation() {
  localStorage.setItem('rotation', state.rotation);
}

// ----- Last timer configuration -----

export function loadTimerConfig() {
  const lastTimer = localStorage.getItem('lastTimer');
  const startWithRest = localStorage.getItem('startWithRest');

  if (lastTimer) {
    sessionsInput.value = lastTimer;
  }
  if (startWithRest !== null) {
    startWithRestCheckbox.checked = startWithRest === 'true';
  }
}

export function saveTimerConfig() {
  localStorage.setItem('lastTimer', sessionsInput.value);
  localStorage.setItem('startWithRest', startWithRestCheckbox.checked);
}

// ----- Saved timers list -----

export function getSavedTimers() {
  const saved = localStorage.getItem('savedTimers');
  return saved ? JSON.parse(saved) : [];
}

export function setSavedTimers(savedTimers) {
  localStorage.setItem('savedTimers', JSON.stringify(savedTimers));
}

// Adds the current timer to the saved list. Returns true if the list changed.
export function addCurrentTimerToSavedList() {
  const sessions = sessionsInput.value.trim();
  const startWithRest = startWithRestCheckbox.checked;

  if (!sessions) return false;

  let savedTimers = getSavedTimers();
  const timerObj = { sessions, startWithRest };

  const exists = savedTimers.some(t =>
    t.sessions === timerObj.sessions && t.startWithRest === timerObj.startWithRest
  );
  if (exists) return false;

  // Newest first, keep only the last 10
  savedTimers.unshift(timerObj);
  if (savedTimers.length > 10) {
    savedTimers = savedTimers.slice(0, 10);
  }
  setSavedTimers(savedTimers);
  return true;
}

// ----- Timer progress (so a closed tab can resume where it was) -----

export function saveTimerProgress() {
  // Only save if we have valid state
  const { timeRemaining } = state;
  if (timeRemaining.length === 0 || timeRemaining.some(t => typeof t !== 'number' || isNaN(t))) {
    return;
  }

  const progress = {
    timeRemaining,
    currentBlockIndex: state.currentBlockIndex,
    isRunning: state.isRunning,
    timerStarted: state.timerStarted,
    timestamp: Date.now(),
    sessions: sessionsInput.value,
    startWithRest: startWithRestCheckbox.checked,
  };
  localStorage.setItem('timerProgress', JSON.stringify(progress));
}

export function clearTimerProgress() {
  localStorage.removeItem('timerProgress');
}

// Returns the saved progress, or null if there is none or it is malformed
export function loadTimerProgress() {
  const saved = localStorage.getItem('timerProgress');
  if (!saved) return null;

  try {
    const progress = JSON.parse(saved);
    if (!progress.sessions ||
      !Array.isArray(progress.timeRemaining) ||
      progress.timeRemaining.length === 0 ||
      progress.timeRemaining.some(t => typeof t !== 'number' || isNaN(t)) ||
      typeof progress.currentBlockIndex !== 'number') {
      clearTimerProgress();
      return null;
    }
    return progress;
  } catch (e) {
    console.error('Failed to parse timer progress:', e);
    clearTimerProgress();
    return null;
  }
}
