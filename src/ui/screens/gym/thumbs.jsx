// Renderer images the shared components do not cover: a cosmetic on my own avatar and the full portrait.
import { useMemo } from 'preact/hooks';
import { itemThumbUrl, avatarPortraitUrl, itemById } from '../../../gym/index.js';
import { useGymLook, ItemThumb } from '../shared/index.jsx';

/** A cosmetic worn by `avatar` (head crop for hair, beard and accessories; full body for clothes). */
export function CosmeticThumb({ itemId, avatar, size = 72 }) {
  const look = useGymLook();
  const src = useMemo(() => itemThumbUrl(itemId, { ...look, size, avatar }), [itemId, avatar, look, size]);
  return <img src={src} alt="" width={size} height={size} draggable={false} />;
}

/** Any catalog item: cosmetics on my avatar, everything else as the renderer draws it. */
export function CatalogThumb({ itemId, avatar, size = 72 }) {
  return itemById(itemId).kind === 'cosmetic' ? <CosmeticThumb itemId={itemId} avatar={avatar} size={size} /> : <ItemThumb itemId={itemId} size={size} />;
}

/** The whole character, standing. */
export function Portrait({ avatar, size = 200, label }) {
  const look = useGymLook();
  const src = useMemo(() => avatarPortraitUrl(avatar, { ...look, size, crop: 'full' }), [avatar, look, size]);
  return <img src={src} alt={label || ''} width={size} height={size} draggable={false} />;
}
