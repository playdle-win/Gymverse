// Build mode chrome: the storage tray (items, floors, walls) and the contextual action bar above it.
import { useState } from 'preact/hooks';
import { useStore } from '../../../core/index.js';
import { CATALOG, itemById } from '../../../gym/index.js';
import { Segmented, Button, Icon, cx } from '../../system/index.js';
import { ItemThumb } from '../shared/index.jsx';
import { isPlaceable, placedCount } from './lib.js';

const TABS = [{ value: 'items', label: 'Items' }, { value: 'floor', label: 'Floors' }, { value: 'wall', label: 'Walls' }];
const SHOP_FOR = { items: 'equipment', floor: 'floor', wall: 'wall' };
const SHOP_LABEL = { items: 'Shop for more', floor: 'Shop floors', wall: 'Shop walls' };

function Slot({ itemId, name, badge, note, active, onClick, testid }) {
  return (
    <button type="button" class={cx('gy-slot', active && 'is-active')} aria-pressed={active ? 'true' : 'false'} onClick={onClick} data-testid={testid}>
      <span class="gy-slot__art">
        <ItemThumb itemId={itemId} size={64} />
        {badge}
      </span>
      <span class="gy-slot__name">{name}{note && <span class="gb-sr">, {note}</span>}</span>
    </button>
  );
}

/** The bottom tray. placingId marks the item whose ghost is out; onPick(itemId) starts placing; onFinish(kind, itemId) applies. */
export function BuildTray({ room, placingId, onPick, onFinish, onShop }) {
  const [tab, setTab] = useState('items');
  const owned = useStore((s) => s.owned);
  const gym = useStore((s) => s.gym);
  const stored = CATALOG.filter(isPlaceable).map((item) => ({ item, count: (owned[item.id] || 0) - placedCount(gym, item.id) })).filter((entry) => entry.count > 0);
  const finishes = tab === 'items' ? [] : CATALOG.filter((item) => item.kind === tab && owned[item.id]);
  return (
    <div class="gy-tray" data-testid="build-tray">
      <Segmented label="Storage" options={TABS} value={tab} onChange={setTab} />
      <div class="gy-tray__row gb-hscroll">
        {tab === 'items' && stored.map(({ item, count }) => (
          <Slot
            key={item.id} itemId={item.id} name={item.name} active={placingId === item.id} onClick={() => onPick(item.id)} testid={`tray-${item.id}`}
            badge={<span class="gy-slot__count t-num" aria-hidden="true">{count}</span>} note={`${count} in storage`}
          />
        ))}
        {tab === 'items' && !stored.length && <p class="gy-tray__empty t-foot c-2" data-testid="tray-empty">Storage is empty. Everything you own stands in a room. New equipment and decor come from the shop.</p>}
        {finishes.map((item) => {
          const inUse = room[tab] === item.id;
          return (
            <Slot
              key={item.id} itemId={item.id} name={item.name} active={inUse} onClick={() => onFinish(tab, item.id)} testid={`tray-${item.id}`}
              badge={inUse ? <span class="gy-slot__check" aria-hidden="true"><Icon name="check" size={12} weight="bold" /></span> : null} note={inUse ? 'in use' : null}
            />
          );
        })}
        <button type="button" class="gy-slot gy-slot--shop" onClick={() => onShop(SHOP_FOR[tab])} data-testid="tray-shop">
          <span class="gy-slot__art"><Icon name="shopping-bag" size={28} /></span>
          <span class="gy-slot__name">{SHOP_LABEL[tab]}</span>
        </button>
      </div>
    </div>
  );
}

const HINT = 'Tap an item to move, turn or store it. Pick from storage to place something new.';

/** The bar above the tray. placing: live ghost or drag state from the engine; selected: uid of a placed item. */
export function BuildActions({ room, placing, selected, flash, onPlace, onRotate, onCancel, onStore }) {
  const ghost = placing && !placing.uid ? placing : null;
  const picked = selected ? room.items.find((p) => p.uid === selected) : null;
  const item = ghost ? itemById(ghost.itemId) : picked ? itemById(picked.itemId) : null;
  if (!item) return <p class="gy-actions gy-actions--hint t-foot" role="status" data-testid="build-status">{flash || HINT}</p>;
  const canTurn = item.mount !== 'wall';
  const dragging = placing && placing.uid;
  const blocked = placing && !placing.valid;
  const status = ghost
    ? (blocked ? 'Blocked. Something is in the way.' : 'Fits here. Drag it or tap a tile to move it.')
    : dragging ? (blocked ? 'Blocked. Let go and it snaps back.' : 'Let go to put it down.') : 'Drag to move it.';
  return (
    <div class="gy-actions" data-testid="build-actions">
      <div class="gy-actions__text" role="status" data-testid="build-status">
        <span class="t-headline t-truncate">{item.name}</span>
        <span class={cx('gy-actions__status t-foot', blocked ? 'c-bad' : 'c-2')}>
          {blocked && <Icon name="warning" size={14} weight="fill" />}
          {status}
        </span>
      </div>
      <div class="gy-actions__buttons">
        {ghost
          ? <Button variant="quiet" size="m" onClick={onCancel} data-testid="build-cancel">Cancel</Button>
          : <Button variant="quiet" size="m" icon="archive" onClick={onStore} data-testid="build-store">Store</Button>}
        {canTurn && <Button variant="quiet" size="m" icon="arrow-clockwise" onClick={onRotate} data-testid="build-rotate">Rotate</Button>}
        {ghost && <Button size="m" icon="check" disabled={blocked} onClick={onPlace} data-testid="build-place">Place</Button>}
      </div>
    </div>
  );
}
