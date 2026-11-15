// Gym tab helpers: labels, small formatters, the shop's category table and two hooks.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore, now, DAY, gymMultipliers } from '../../../core/index.js';
import { CATALOG, itemById } from '../../../gym/index.js';
import { MUSCLES, MUSCLE_LABEL } from '../../../exercises/data.js';
import { formatInt } from '../../system/index.js';

/** Purchases from this price up ask for confirmation first. */
export const BIG_PURCHASE = 5000;

/** Shop categories in display order. `match` picks catalog items; Space has its own panel. */
export const SHOP_CATEGORIES = [
  { value: 'equipment', label: 'Equipment', match: (i) => i.kind === 'equipment' },
  { value: 'decor', label: 'Decor', match: (i) => i.kind === 'decor' },
  { value: 'floor', label: 'Floors', match: (i) => i.kind === 'floor' },
  { value: 'wall', label: 'Walls', match: (i) => i.kind === 'wall' },
  { value: 'space', label: 'Space', match: () => false },
  { value: 'clothes', label: 'Clothes', match: (i) => i.kind === 'cosmetic' && ['top', 'bottom', 'shoes'].includes(i.slot) },
  { value: 'hair', label: 'Hair and beard', match: (i) => i.kind === 'cosmetic' && ['hair', 'beard'].includes(i.slot) && !isNoneOption(i) },
  { value: 'accessory', label: 'Accessories', match: (i) => i.kind === 'cosmetic' && i.slot === 'accessory' && !isNoneOption(i) },
];

/** The catalog's "wear nothing" entries (Clean Shaven, No Accessory). */
export const isNoneOption = (item) => item.kind === 'cosmetic' && item.id.endsWith('-none');

export const itemsIn = (category) => {
  const entry = SHOP_CATEGORIES.find((c) => c.value === category);
  return entry ? CATALOG.filter(entry.match) : [];
};

export const categoryOf = (item) => {
  const entry = SHOP_CATEGORIES.find((c) => c.match(item));
  return entry ? entry.value : 'equipment';
};

export const isFinish = (item) => item.kind === 'floor' || item.kind === 'wall';
export const isPlaceable = (item) => Boolean(item && item.size && (item.kind === 'equipment' || item.kind === 'decor'));

/** 1.1234 -> "x1.12" */
export const formatMultiplier = (m) => `x${m.toFixed(2)}`;

/** 0.1 -> "10%", 0.005 -> "0.5%" */
export function formatPercent(fraction) {
  const p = Math.round(fraction * 1000) / 10;
  return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
}

/** 0.159 -> "16%" */
export const formatWholePercent = (fraction) => `${Math.round(fraction * 100)}%`;

/** 4.5 -> "4.5", 5 -> "5" */
export const formatRate = (perHour) => String(Math.round(perHour * 10) / 10);

/** Equipment boosts, strongest first: [{ muscle, label, bonus }]. */
export const boostsOf = (item) => Object.entries(item.muscles || {})
  .map(([muscle, bonus]) => ({ muscle, label: MUSCLE_LABEL[muscle], bonus }))
  .sort((a, b) => b.bonus - a.bonus);

/** "+10% quads" */
export const boostLabel = (boost) => `+${formatPercent(boost.bonus)} ${boost.label.toLowerCase()}`;

/** "2 x 1 m" for floor items, "2 m of wall" for wall-mounted ones. */
export const sizeLabel = (item) => (item.mount === 'wall' ? `${item.size[0]} m of wall` : `${item.size[0]} x ${item.size[1]} m`);

export const roomSizeLabel = (room) => `${room.w} x ${room.d} m`;

/** How much of a finish a room takes and how the shop words it. */
export function finishMaths(room, item) {
  const floor = item.kind === 'floor';
  const amount = floor ? room.w * room.d : room.w + room.d;
  return {
    amount,
    total: item.price * amount,
    unit: floor ? 'per m²' : 'per m',
    measure: floor ? `${amount} m²` : `${amount} m of wall`,
  };
}

/** Number of placed copies of an item across the whole gym. */
export const placedCount = (gym, itemId) => gym.rooms.reduce((n, room) => n + room.items.filter((p) => p.itemId === itemId).length, 0);

/** Names of the placed equipment that feeds a muscle, strongest first, each name once. */
export function sourcesFor(gym, muscle) {
  const items = gym.rooms.flatMap((room) => room.items).map((p) => itemById(p.itemId)).filter((i) => i && i.muscles && i.muscles[muscle]);
  const unique = [...new Map(items.map((i) => [i.id, i])).values()];
  return unique.sort((a, b) => b.muscles[muscle] - a.muscles[muscle]);
}

/** The muscle with the lowest multiplier and the shop item that lifts it most: { muscle, label, value, item, bonus } or null. */
export function weakestFix(multipliers) {
  const ranked = MUSCLES.map((muscle) => ({ muscle, label: MUSCLE_LABEL[muscle], value: multipliers.byMuscle[muscle] })).sort((a, b) => a.value - b.value);
  for (const entry of ranked) {
    const options = CATALOG.filter((i) => i.kind === 'equipment' && !i.starter && i.muscles[entry.muscle]);
    if (!options.length) continue;
    const item = options.reduce((best, i) => (i.muscles[entry.muscle] > best.muscles[entry.muscle] ? i : best));
    return { ...entry, item, bonus: item.muscles[entry.muscle] };
  }
  return null;
}

/** What the multiplier of a muscle becomes once one more copy of an item stands in the gym. */
export function multiplierWith(gym, item, muscle, dust) {
  const extra = { rooms: [...gym.rooms, { items: [{ itemId: item.id }] }] };
  return gymMultipliers(extra, itemById, dust).byMuscle[muscle];
}

/** "today", "yesterday", "9 days ago" */
export function daysAgoLabel(ts, t) {
  const days = Math.floor((t - ts) / DAY);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

export const pointsWord = (n) => `${formatInt(n)} ${n === 1 ? 'point' : 'points'}`;

/** The app clock, refreshed on an interval and whenever the test lab skips time. */
export function useNow(intervalMs = 20000) {
  useStore((s) => s.settings.timeOffsetMs);
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now();
}

/** Keeps the selected chip of a sideways-scrolling FilterChips row in view. Returns a ref for the row's wrapper. */
export function useSelectedChipInView(deps) {
  const wrapper = useRef(null);
  useEffect(() => {
    const row = wrapper.current && wrapper.current.querySelector('.gb-chips'), chip = row && row.querySelector('[aria-pressed="true"]');
    if (chip) row.scrollLeft = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
  }, deps);
  return wrapper;
}

const COUNT_MS = 650;

/** A number that counts toward its target when the target changes (jumps when motion is reduced). */
export function useCountTo(target) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { from.current = target; setShown(target); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const step = (time) => {
      const k = Math.min(1, (time - t0) / COUNT_MS), eased = 1 - Math.pow(1 - k, 3);
      const value = Math.round(start + (target - start) * eased);
      from.current = value;
      setShown(value);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}
