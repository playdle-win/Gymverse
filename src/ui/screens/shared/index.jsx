// Shared bits for all screen areas. Owned by the manager; screen agents import from here, never edit.
import { useMemo } from 'preact/hooks';
import { useStore, now, DAY, HOUR } from '../../../core/index.js';
import { useThemeColors, Avatar } from '../../system/index.js';
import { avatarPortraitUrl, itemThumbUrl, roomThumbUrl, paletteFromCSS } from '../../../gym/index.js';

/** The gym renderer options for the current art direction and colour theme. Re-created when either changes. */
export function useGymLook() {
  const style = useStore((s) => s.settings.style);
  const colors = useThemeColors();
  return useMemo(() => ({ style, palette: paletteFromCSS() }), [style, colors]);
}

/** A person's rendered avatar head. person: { name, avatar } (me, a friend or a stranger). size in px. */
export function PersonAvatar({ person, size = 40 }) {
  const look = useGymLook();
  const src = useMemo(() => avatarPortraitUrl(person.avatar, { ...look, size, crop: 'head' }), [person.avatar, look, size]);
  return (
    <Avatar size={size} name={person.name}>
      <img src={src} alt="" width={size} height={size} draggable={false} />
    </Avatar>
  );
}

/** Thumbnail of a catalog item drawn by the gym renderer in the current style. */
export function ItemThumb({ itemId, size = 72 }) {
  const look = useGymLook();
  const src = useMemo(() => itemThumbUrl(itemId, { ...look, size }), [itemId, look, size]);
  return <img src={src} alt="" width={size} height={size} draggable={false} />;
}

/** Thumbnail of a whole room. */
export function RoomThumb({ room, avatar, width = 160, height = 120 }) {
  const look = useGymLook();
  const src = useMemo(() => roomThumbUrl(room, { ...look, width, height, avatar }), [room, avatar, look, width, height]);
  return <img src={src} alt="" width={width} height={height} draggable={false} />;
}

/** "Just now", "25 min ago", "3 h ago", "Yesterday", "4 days ago", "12 Oct". */
export function timeAgo(ts, t = now()) {
  const d = t - ts;
  if (d < 90e3) return 'Just now';
  if (d < HOUR) return `${Math.round(d / 60e3)} min ago`;
  if (d < DAY) return `${Math.round(d / HOUR)} h ago`;
  if (d < 2 * DAY) return 'Yesterday';
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} days ago`;
  return shortDate(ts);
}

export const shortDate = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** 54 -> "54 min", 75 -> "1 h 15 min". */
export const formatMinutes = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ''}`.trim());

const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
/** 82.5 -> "82.5", 80 -> "80", 1399.25 -> "1,399.3". */
export const formatKg = (kg) => oneDecimal.format(kg);

/** Running clock "24:18" or "1:02:45" from milliseconds. */
export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
