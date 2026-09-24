// Timer blocks, ticking, start/stop/reset and restoring saved progress
import { state } from './state.js';
import {
  timerBlocks, setupPanel, timerSection, startStopBtn, menuBtn,
  currentTime, shimmerSound,
  sessionsInput, startWithRestCheckbox, showWorkNumbersCheckbox,
} from './dom.js';
import { clearTimerProgress, loadTimerProgress } from './storage.js';
import { requestWakeLock, releaseWakeLock } from './pwa.js';

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function playChime() {
  shimmerSound.currentTime = 0;
  shimmerSound.play().catch(e => console.log('Sound play failed:', e));
}

// ----- Building blocks -----

// Parses the sessions input ("50 10 20s 5sec") into seconds. Minutes by default.
function parseDurations(input) {
  return input.trim().split(/\s+/).map(token => {
    if (token.endsWith('sec')) {
      const num = parseInt(token.slice(0, -3));
      return !isNaN(num) && num > 0 ? num : null;
    } else if (token.endsWith('s')) {
      const num = parseInt(token.slice(0, -1));
      return !isNaN(num) && num > 0 ? num : null;
    } else {
      const num = parseInt(token);
      return !isNaN(num) && num > 0 ? num * 60 : null;
    }
  }).filter(d => d !== null);
}

// Rebuilds all blocks from the sessions input. Returns false if the input is invalid.
export function generateTimerBlocks() {
  const durations = parseDurations(sessionsInput.value);

  if (durations.length === 0) {
    alert('Please enter at least one duration');
    return false;
  }

  // Max duration is the reference for proportional block widths
  state.maxDuration = Math.max(...durations);

  timerBlocks.innerHTML = '';
  state.blocks = [];
  state.timeRemaining = [];

  const startWithRest = startWithRestCheckbox.checked;
  const showWorkNumbers = showWorkNumbersCheckbox.checked;

  let firstWorkSeen = false;
  durations.forEach((duration, index) => {
    const type = startWithRest
      ? (index % 2 === 0 ? 'rest' : 'work')
      : (index % 2 === 0 ? 'work' : 'rest');
    const typeCount = startWithRest
      ? (type === 'work' ? Math.floor((index + 1) / 2) : Math.floor(index / 2) + 1)
      : (Math.floor(index / 2) + 1);
    const isFirstWork = type === 'work' && !firstWorkSeen;
    if (type === 'work') firstWorkSeen = true;
    createBlock(type, typeCount, duration, index, isFirstWork, showWorkNumbers);
  });

  state.blocks = document.querySelectorAll('.timer-block');
  return true;
}

function createBlock(type, number, duration, index, isFirstWork = false, showWorkNumbers = true) {
  const block = document.createElement('div');
  block.className = `timer-block ${type}${isFirstWork ? ' first-work' : ''}`;
  block.dataset.index = index;
  block.dataset.duration = duration;

  const label = type === 'work'
    ? (showWorkNumbers ? `Work (${number})` : `Work`)
    : `Rest`;

  const proportionalWidth = (duration / state.maxDuration) * 100;

  block.innerHTML = `
    <span class="active-dot"></span>
    <div class="block-fill" style="width: ${proportionalWidth}%;"></div>
    <div class="block-content">
      <span class="block-label">${label}</span>
      <span class="block-time">${formatTime(duration)}</span>
    </div>
  `;

  timerBlocks.appendChild(block);
  state.timeRemaining[index] = duration;
}

// Rebuilds the blocks with the current display settings, keeping timer state intact
export function regenerateBlocksWithSettings() {
  const showWorkNumbers = showWorkNumbersCheckbox.checked;

  const blockData = Array.from(state.blocks).map(block => ({
    duration: parseInt(block.dataset.duration),
    type: block.classList.contains('work') ? 'work' : 'rest',
    isCompleted: block.classList.contains('completed'),
  }));
  const savedTimeRemaining = [...state.timeRemaining];

  timerBlocks.innerHTML = '';

  let firstWorkSeen = false;
  blockData.forEach((data, index) => {
    const typeCount = blockData.slice(0, index + 1).filter(b => b.type === data.type).length;
    const isFirstWork = data.type === 'work' && !firstWorkSeen;
    if (data.type === 'work') firstWorkSeen = true;
    createBlock(data.type, typeCount, data.duration, index, isFirstWork, showWorkNumbers);
  });

  // createBlock overwrites timeRemaining, so restore it
  state.timeRemaining = savedTimeRemaining;

  state.blocks = document.querySelectorAll('.timer-block');
  state.blocks.forEach((block, index) => {
    if (blockData[index].isCompleted) {
      markBlockCompleted(block);
    } else if (index === state.currentBlockIndex) {
      updateBlockDisplay(index);
      if (state.timerStarted || state.isRunning) {
        block.classList.add('active');
      }
    }
  });
}

// ----- Display updates -----

function markBlockCompleted(block) {
  block.classList.add('completed');
  block.querySelector('.block-fill').style.width = '0%';
  block.querySelector('.block-time').textContent = '00:00';
}

export function updateBlockDisplay(index) {
  const block = state.blocks[index];
  const remaining = state.timeRemaining[index];

  block.querySelector('.block-time').textContent = formatTime(remaining);
  currentTime.textContent = formatTime(remaining);

  const proportionalWidth = (remaining / state.maxDuration) * 100;
  block.querySelector('.block-fill').style.width = proportionalWidth + '%';
}

export function updateRestMode() {
  const { blocks, currentBlockIndex } = state;
  const inRest = currentBlockIndex < blocks.length && blocks[currentBlockIndex].classList.contains('rest');
  document.body.classList.toggle('rest-mode', inRest);
}

// ----- Screens -----

// Switches from the setup panel to a fresh, not yet started timer
export function showTimerScreen() {
  setupPanel.classList.add('hidden');
  timerSection.classList.remove('hidden');
  menuBtn.classList.add('visible');
  state.currentBlockIndex = 0;
  state.isRunning = false;
  state.timerStarted = false;
  startStopBtn.textContent = 'START';
  startStopBtn.disabled = false;
  document.body.classList.add('screen-timer');
}

export function showSetupScreen() {
  setupPanel.classList.remove('hidden');
  timerSection.classList.add('hidden');
  currentTime.textContent = 'Pomodoro';
  document.body.classList.remove('screen-timer');
  document.body.classList.remove('rest-mode');
}

// ----- Running -----

function completeTimer() {
  state.isRunning = false;
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
  startStopBtn.textContent = 'COMPLETED';
  startStopBtn.disabled = true;
  menuBtn.classList.add('visible');
  currentTime.textContent = 'Completed!';
  document.body.classList.remove('rest-mode');
  document.body.classList.add('timer-completed');
  releaseWakeLock();
  clearTimerProgress();
}

function tick() {
  const { blocks } = state;
  if (state.currentBlockIndex >= blocks.length) {
    completeTimer();
    return;
  }

  const currentBlock = blocks[state.currentBlockIndex];

  if (state.timeRemaining[state.currentBlockIndex] > 0) {
    state.timeRemaining[state.currentBlockIndex]--;
    updateBlockDisplay(state.currentBlockIndex);
    return;
  }

  // Current block finished
  currentBlock.classList.remove('active');
  currentBlock.classList.add('completed');
  state.currentBlockIndex++;
  playChime();

  if (state.currentBlockIndex < blocks.length) {
    blocks[state.currentBlockIndex].classList.add('active');
    currentTime.textContent = formatTime(state.timeRemaining[state.currentBlockIndex]);
    updateRestMode();
  } else {
    completeTimer();
  }
}

export function startTimer(silent = false) {
  if (state.isRunning) return;

  state.isRunning = true;
  state.timerStarted = true;
  startStopBtn.textContent = 'PAUSE';
  menuBtn.classList.remove('visible');
  document.body.classList.remove('timer-completed');
  state.blocks[state.currentBlockIndex].classList.add('active');
  updateRestMode();
  requestWakeLock();

  // Play sound when starting or resuming (unless silent, e.g. on restore)
  if (!silent) playChime();

  state.interval = setInterval(tick, 1000);
}

export function stopTimer() {
  state.isRunning = false;
  startStopBtn.textContent = 'RESUME';
  menuBtn.classList.add('visible');
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
  releaseWakeLock();
}

export function resetTimer() {
  stopTimer();
  clearTimerProgress();
  menuBtn.classList.remove('visible');
  showSetupScreen();
  state.currentBlockIndex = 0;
  startStopBtn.disabled = false;
  document.body.classList.remove('timer-completed');
  releaseWakeLock();
}

// Starts a brand new timer from the sessions input. Returns false if the input is invalid.
export function startNewTimer() {
  // Initialize audio on user interaction to avoid autoplay restrictions
  shimmerSound.load();

  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
  state.isRunning = false;
  document.body.classList.remove('rest-mode');
  document.body.classList.remove('timer-completed');
  releaseWakeLock();

  if (!generateTimerBlocks()) return false;

  showTimerScreen();
  if (state.timeRemaining.length > 0) {
    currentTime.textContent = formatTime(state.timeRemaining[0]);
  }
  return true;
}

// ----- Restoring a timer that was in progress when the page was closed -----

export function restoreTimerProgress() {
  const progress = loadTimerProgress();
  if (!progress) return false;

  try {
    sessionsInput.value = progress.sessions;
    startWithRestCheckbox.checked = progress.startWithRest;

    if (!generateTimerBlocks()) {
      clearTimerProgress();
      return false;
    }

    state.timeRemaining = progress.timeRemaining;
    state.currentBlockIndex = progress.currentBlockIndex;

    // If the timer was running, subtract the time that passed while away
    if (progress.isRunning) {
      let remaining = Math.floor((Date.now() - progress.timestamp) / 1000);
      while (remaining > 0 && state.currentBlockIndex < state.blocks.length) {
        if (state.timeRemaining[state.currentBlockIndex] > remaining) {
          state.timeRemaining[state.currentBlockIndex] -= remaining;
          remaining = 0;
        } else {
          remaining -= state.timeRemaining[state.currentBlockIndex];
          state.timeRemaining[state.currentBlockIndex] = 0;
          state.currentBlockIndex++;
        }
      }
    }

    // Timer completed while away
    if (state.currentBlockIndex >= state.blocks.length) {
      clearTimerProgress();
      return false;
    }

    setupPanel.classList.add('hidden');
    timerSection.classList.remove('hidden');
    document.body.classList.add('screen-timer');

    state.blocks.forEach((block, index) => {
      if (index < state.currentBlockIndex) {
        markBlockCompleted(block);
      } else if (index === state.currentBlockIndex) {
        updateBlockDisplay(index);
      }
    });

    currentTime.textContent = formatTime(state.timeRemaining[state.currentBlockIndex]);

    state.timerStarted = progress.timerStarted || false;
    if (progress.isRunning) {
      startTimer(true);
    } else if (state.timerStarted) {
      startStopBtn.textContent = 'RESUME';
      menuBtn.classList.add('visible');
      state.blocks[state.currentBlockIndex].classList.add('active');
      updateRestMode();
    } else {
      startStopBtn.textContent = 'START';
      menuBtn.classList.add('visible');
    }

    return true;
  } catch (e) {
    console.error('Failed to restore timer progress:', e);
    clearTimerProgress();
    return false;
  }
}
