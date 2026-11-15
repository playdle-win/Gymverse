// The app clock. The test lab can skip time by changing settings.timeOffsetMs.
import { getState } from './store.js';

export const HOUR = 3600e3;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export const now = () => Date.now() + ((getState().settings && getState().settings.timeOffsetMs) || 0);
