// Public surface of the gym engine. See README.md.
export { CATALOG, itemById } from './catalog.js';
export { SHOWROOMS, starterRoom } from './showrooms.js';
export { GymCanvas } from './GymCanvas.jsx';
export { createGymEngine } from './engine.js';
export { renderItemThumb, renderRoomThumb, renderAvatarPortrait, itemThumbUrl, roomThumbUrl, avatarPortraitUrl } from './thumbs.js';
export { canPlaceIn, findSpot, footprintOf, areaOf, isWallItem } from './placement.js';
export { DEFAULT_PALETTES, paletteFromCSS } from './palette.js';
export { SKIN, HAIR, DEFAULT_AVATAR } from './models-avatar.js';
export { POSE_IDS } from './avatar.js';
export { STYLES } from './shade.js';
