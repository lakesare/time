// Handles to every DOM element the app touches
const $ = (id) => document.getElementById(id);

export const menuOverlay = $('menuOverlay');
export const settingsModal = $('settingsModal');
export const setupPanel = $('setupPanel');
export const timerSection = $('timerSection');
export const timerBlocks = $('timerBlocks');
export const applySettingsBtn = $('applySettingsBtn');
export const displaySettingsBtn = $('displaySettingsBtn');
export const stopTimerBtn = $('stopTimerBtn');
export const closeModalBtn = $('closeModalBtn');
export const startStopBtn = $('startStopBtn');
export const resetBtn = $('resetBtn');
export const menuBtn = $('menuBtn');
export const rotateBtn = $('rotateBtn');
export const currentTime = $('currentTime');
export const shimmerSound = $('shimmerSound');
export const installButton = $('installButton');
export const copyLinkBtn = $('copyLinkBtn');

export const sessionsInput = $('sessionsInput');
export const startWithRestCheckbox = $('startWithRestCheckbox');
export const showWorkNumbersCheckbox = $('showWorkNumbersCheckbox');
export const largeTimeCheckbox = $('largeTimeCheckbox');
export const workColorPicker = $('workColorPicker');
export const colorPresets = document.querySelectorAll('.color-preset');

export const savedTimersSection = $('savedTimersSection');
export const savedTimersList = $('savedTimersList');
