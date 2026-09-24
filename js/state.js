// Mutable app state shared between modules
export const state = {
  isRunning: false,
  timerStarted: false,
  currentBlockIndex: 0,
  interval: null,
  timeRemaining: [],
  blocks: [],
  maxDuration: 0,
  wakeLock: null,
  deferredPrompt: null,
  // Manual rotation of the page, in degrees (0, 90, 180 or 270)
  rotation: 0,
};
