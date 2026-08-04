export const ADAPTIVE_PATH_NUDGE_KEY = 'threadlearn:adaptive-path-nudge';

export const queueAdaptivePathNudge = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ADAPTIVE_PATH_NUDGE_KEY, 'pending');
};
