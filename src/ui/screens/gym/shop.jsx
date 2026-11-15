// The shop: category chips, a two-column grid, an item detail with the buy actions, and the Space panel.
// A large sheet, not a pushed page: the room stays underneath and every purchase ends one swipe from it.
import {
  useStore, getState, buyItem, buyFinish, buyExpansion, buyExtraFloor, equip, canExpand, expansionCost, extraFloorCost,
  gymMultipliers, selDust, TUNING,
} from '../../../core/index.js';
import { itemById } from '../../../gym/index.js';
import { Sheet, FilterChips, Card, Button, IconButton, Points, Badge, List, ListRow, Icon, confirm, toast, formatInt, cx } from '../../system/index.js';
import { Balance } from './hud.jsx';
import { CatalogThumb, Portrait } from './thumbs.jsx';
import {
  SHOP_CATEGORIES, BIG_PURCHASE, itemsIn, categoryOf, isFinish, isPlaceable, boostsOf, boostLabel, sizeLabel, roomSizeLabel,
  finishMaths, placedCount, multiplierWith, formatMultiplier, formatPercent, useSelectedChipInView,
} from './lib.js';

const FAILURES = { funds: 'Not enough points for that', owned: 'You already own that', 'max-size': 'This room is at full size', 'max-rooms': 'Four floors is the limit' };

// Runs a purchase: asks first when it is a big one, and says why when it fails. Resolves to the action result or null.
async function purchase(cost, what, run) {
  if (cost >= BIG_PURCHASE) {
    const { settings, wallet } = getState();
    const message = settings.unlimited ? `That is ${formatInt(cost)} points. Unlimited points are on, so nothing is deducted.` : `That is ${formatInt(cost)} of your ${formatInt(wallet.points)} points.`;
    const sure = await confirm({ title: `Buy ${what}?`, message, confirmLabel: 'Buy' });
    if (!sure) return null;
  }
  const result = run();
  if (!result.ok) { toast(FAILURES[result.reason] || 'That purchase did not go through', { icon: 'warning' }); return null; }
  return result;
}

function useShopState() {
  const gym = useStore((s) => s.gym);
  return {
    gym,
    room: gym.rooms[gym.active],
    owned: useStore((s) => s.owned),
    avatar: useStore((s) => s.avatar),
    points: useStore((s) => s.wallet.points),
    unlimited: useStore((s) => s.settings.unlimited),
  };
}

const shortBy = (shop, cost) => (shop.unlimited ? 0 : Math.max(0, cost - shop.points));

// What a tile says about ownership: { text, tone } or null.
function ownership(item, shop) {
  const count = shop.owned[item.id] || 0;
  if (!count) return null;
  if (item.kind === 'cosmetic') return shop.avatar[item.slot] === item.id ? { text: 'Wearing', tone: 'accent' } : { text: 'Owned', tone: 'neutral' };
  if (isFinish(item)) return shop.room[item.kind] === item.id ? { text: 'In use', tone: 'accent' } : { text: 'Owned', tone: 'neutral' };
  return { text: `${count} owned`, tone: 'neutral' };
}

// What one purchase costs right now: finishes are priced for the active room and are free once owned.
function costOf(item, shop) {
  if (isFinish(item)) return shop.owned[item.id] ? 0 : finishMaths(shop.room, item).total;
  return item.price;
}

function Tile({ item, shop, onOpen }) {
  const status = ownership(item, shop);
  const finish = isFinish(item);
  const hidePrice = item.starter || ((finish || item.kind === 'cosmetic') && status);
  const maths = finish && !status ? finishMaths(shop.room, item) : null;
  const short = hidePrice ? 0 : shortBy(shop, costOf(item, shop));
  const effect = item.kind === 'equipment' ? boostLabel(boostsOf(item)[0]) : item.kind === 'decor' ? `+${formatPercent(item.vibe)} vibe` : null;
  return (
    <Card class="gy-tile" padded={false} onClick={() => onOpen(item.id)} data-testid={`shop-item-${item.id}`}>
      <span class="gy-tile__art"><CatalogThumb itemId={item.id} avatar={shop.avatar} size={96} /></span>
      <span class="gy-tile__name">{item.name}</span>
      {effect && <span class="gy-tile__note t-caption c-accent">{effect}</span>}
      <span class="gy-tile__meta">
        {!hidePrice && (
          <span class={cx('gy-price', short > 0 && 'gy-price--short')}>
            <Points value={item.price} size="s" />
            {maths && <span class="t-caption c-2">{maths.unit}</span>}
          </span>
        )}
        {status && <Badge tone={status.tone}>{status.text}</Badge>}
      </span>
      {maths && <span class="gy-tile__note t-caption c-2">x {maths.measure} = {formatInt(maths.total)}</span>}
      {short > 0 && <span class="gy-tile__note t-caption c-3">{formatInt(short)} short</span>}
    </Card>
  );
}

// ---- detail ------------------------------------------------------------------------------------------

function EffectLines({ item, shop }) {
  if (item.kind === 'decor') {
    return (
      <div class="gy-effects">
        <div class="gy-badges"><Badge tone="accent">+{formatPercent(item.vibe)} vibe</Badge></div>
        <p class="t-foot c-2">Vibe lifts every muscle while the item stands in a room. A second copy counts half, and decor tops out at +{formatPercent(TUNING.vibeCap)}.</p>
      </div>
    );
  }
  const boosts = boostsOf(item);
  const dust = selDust();
  const best = boosts[0];
  const current = gymMultipliers(shop.gym, itemById, dust).byMuscle[best.muscle];
  const after = multiplierWith(shop.gym, item, best.muscle, dust);
  return (
    <div class="gy-effects">
      <div class="gy-badges">{boosts.map((b) => <Badge key={b.muscle} tone="accent">{boostLabel(b)}</Badge>)}</div>
      <p class="t-foot c-2">
        Placed in your gym, it takes {best.label.toLowerCase()} from {formatMultiplier(current)} to {formatMultiplier(after)}. Your best piece for a muscle counts in full, every next one a little less.
      </p>
    </div>
  );
}

function PlaceableDetail({ item, shop, onBought, onPlace }) {
  const count = shop.owned[item.id] || 0, placed = placedCount(shop.gym, item.id), stored = Math.max(0, count - placed);
  const short = shortBy(shop, item.price);
  const buy = async (thenPlace) => {
    if (!(await purchase(item.price, item.name, () => buyItem(item.id)))) return;
    if (thenPlace) onPlace(item.id); else onBought(`Bought ${item.name}`);
  };
  return (
    <>
      <EffectLines item={item} shop={shop} />
      <List variant="plain">
        <ListRow title="Size" value={sizeLabel(item)} />
        <ListRow title="Goes" value={item.mount === 'wall' ? 'On a wall' : 'On the floor'} />
        <ListRow title="You own" value={count ? `${count}, ${placed} placed` : 'None yet'} />
      </List>
      <div class="gy-buybar">
        {item.starter ? <p class="t-foot c-2">Came with the room. Not for sale.</p> : (
          <>
            <div class="gy-buybar__price">
              <Points value={item.price} size="l" />
              {short > 0 && <span class="t-foot c-bad">You need {formatInt(short)} more points</span>}
            </div>
            <div class="gy-buybar__actions">
              <Button variant="secondary" disabled={short > 0} onClick={() => buy(false)} data-testid="shop-buy">Buy</Button>
              <Button disabled={short > 0} onClick={() => buy(true)} data-testid="shop-buy-place">Buy and place</Button>
            </div>
          </>
        )}
        {stored > 0 && <Button variant="plain" size="m" block onClick={() => onPlace(item.id)} data-testid="shop-place-owned">Place one from storage ({stored})</Button>}
      </div>
    </>
  );
}

function FinishDetail({ item, shop, onApplied }) {
  const floor = item.kind === 'floor';
  const owned = Boolean(shop.owned[item.id]), inUse = shop.room[item.kind] === item.id;
  const maths = finishMaths(shop.room, item);
  const cost = owned ? 0 : maths.total, short = shortBy(shop, cost);
  const apply = async () => {
    if (!(await purchase(cost, item.name, () => buyFinish(shop.gym.active, item.id)))) return;
    onApplied(floor ? `${item.name} laid` : `${item.name} is on the walls`);
  };
  const label = inUse ? 'In this room now' : owned ? (floor ? 'Lay in this room' : 'Paint this room') : (floor ? 'Buy and lay' : 'Buy and paint');
  return (
    <>
      <List variant="plain">
        <ListRow title={shop.room.name} value={`${roomSizeLabel(shop.room)}, ${maths.measure}`} />
        <ListRow title="Price" value={<span class="gy-maths" data-testid="shop-maths">{formatInt(item.price)} {maths.unit} x {maths.measure} = <Points value={maths.total} size="s" /></span>} />
      </List>
      <p class="t-foot c-2">{owned ? 'You own this finish. Using it in any room is free.' : 'Buy it once and it is free to use in every room, also after the room grows.'}</p>
      <div class="gy-buybar">
        {!owned && (
          <div class="gy-buybar__price">
            <Points value={maths.total} size="l" />
            {short > 0 && <span class="t-foot c-bad">You need {formatInt(short)} more points</span>}
          </div>
        )}
        <Button block disabled={inUse || short > 0} onClick={apply} data-testid="shop-buy-apply">{label}</Button>
      </div>
    </>
  );
}

function CosmeticDetail({ item, shop, onBought }) {
  const owned = Boolean(shop.owned[item.id]), wearing = shop.avatar[item.slot] === item.id;
  const short = owned ? 0 : shortBy(shop, item.price);
  const buy = async () => { if (await purchase(item.price, item.name, () => buyItem(item.id))) onBought(`Bought ${item.name}`); };
  const wear = () => { if (equip(item.slot, item.id).ok) toast(`Wearing ${item.name}`, { icon: 't-shirt' }); };
  return (
    <div class="gy-buybar">
      {!owned && (
        <div class="gy-buybar__price">
          <Points value={item.price} size="l" />
          {short > 0 && <span class="t-foot c-bad">You need {formatInt(short)} more points</span>}
        </div>
      )}
      {owned
        ? <Button block disabled={wearing} onClick={wear} data-testid="shop-wear">{wearing ? 'Wearing' : 'Wear now'}</Button>
        : <Button block disabled={short > 0} onClick={buy} data-testid="shop-buy">Buy</Button>}
    </div>
  );
}

function Detail({ item, shop, onBack, onBought, onApplied, onPlace }) {
  const category = SHOP_CATEGORIES.find((c) => c.value === categoryOf(item));
  const cosmetic = item.kind === 'cosmetic';
  return (
    <div class="gy-detail" data-testid="shop-detail">
      <Button class="gy-back" variant="plain" size="s" icon="caret-left" onClick={onBack} data-testid="shop-back">All {category.label.toLowerCase()}</Button>
      <div class="gy-stage">
        {cosmetic ? <Portrait avatar={{ ...shop.avatar, [item.slot]: item.id }} size={176} /> : <CatalogThumb itemId={item.id} size={176} />}
      </div>
      <p class="t-body">{item.blurb}</p>
      {isPlaceable(item) && <PlaceableDetail item={item} shop={shop} onBought={onBought} onPlace={onPlace} />}
      {isFinish(item) && <FinishDetail item={item} shop={shop} onApplied={onApplied} />}
      {cosmetic && <CosmeticDetail item={item} shop={shop} onBought={onBought} />}
    </div>
  );
}

// ---- space -------------------------------------------------------------------------------------------

function PriceLadder({ from }) {
  const steps = ['This one', 'Next', 'After that'].map((label, i) => ({ label, cost: expansionCost(from + i) }));
  const top = steps[steps.length - 1].cost;
  return (
    <div class="gy-ladder" role="group" aria-label="Expansion prices">
      {steps.map((step, i) => (
        <div class={cx('gy-ladder__step', i === 0 && 'is-now')} key={step.label}>
          <span class="gy-ladder__col" aria-hidden="true"><span class="gy-ladder__bar" style={{ height: `${Math.round((step.cost / top) * 100)}%` }} /></span>
          <Points value={step.cost} size="s" />
          <span class="t-caption c-2">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function SpacePanel({ shop, onApplied }) {
  const { gym, room } = shop;
  const roomy = canExpand(room), expandCost = expansionCost(gym.expansions);
  const floors = gym.rooms.length, moreFloors = floors < TUNING.maxRooms, floorCost = extraFloorCost(floors);
  const start = TUNING.roomStartSize;
  const expand = async () => {
    if (await purchase(expandCost, 'a bigger room', buyExpansion)) onApplied(`${room.name} is now ${room.w + 1} x ${room.d + 1} m`);
  };
  const addFloor = async () => {
    if (await purchase(floorCost, 'another floor', buyExtraFloor)) onApplied('New floor added. Time to build.');
  };
  const expandShort = shortBy(shop, expandCost), floorShort = shortBy(shop, floorCost);
  return (
    <div class="gy-space" data-testid="shop-space">
      <Card class="gy-spacecard">
        <h3 class="t-headline">Expand room</h3>
        {roomy ? (
          <>
            <p class="gy-grow">
              <span class="t-num t-num-m">{room.w} x {room.d}</span>
              <Icon name="arrow-right" size={18} weight="bold" />
              <span class="t-num t-num-m c-accent">{room.w + 1} x {room.d + 1} m</span>
            </p>
            <p class="t-foot c-2">{room.name} gains {(room.w + 1) * (room.d + 1) - room.w * room.d} m² of floor. Every expansion costs {TUNING.expansionGrowth} times the one before.</p>
            <PriceLadder from={gym.expansions} />
            {expandShort > 0 && <p class="t-foot c-bad">You need {formatInt(expandShort)} more points</p>}
            <Button block disabled={expandShort > 0} onClick={expand} data-testid="shop-expand">Expand to {room.w + 1} x {room.d + 1} m</Button>
          </>
        ) : (
          <>
            <p class="t-foot c-2">{room.name} is {roomSizeLabel(room)}, the largest a room gets. Add a floor for more space.</p>
            <Button block disabled data-testid="shop-expand">Room is at full size</Button>
          </>
        )}
      </Card>
      <Card class="gy-spacecard">
        <h3 class="t-headline">Add a floor</h3>
        <p class="t-foot c-2">
          {moreFloors
            ? `A new empty ${start} x ${start} m room above the others. You have ${floors} of ${TUNING.maxRooms} floors, and equipment on every floor counts.`
            : `You have all ${TUNING.maxRooms} floors.`}
        </p>
        {moreFloors && <Points value={floorCost} size="l" />}
        {moreFloors && floorShort > 0 && <p class="t-foot c-bad">You need {formatInt(floorShort)} more points</p>}
        <Button block variant="secondary" disabled={!moreFloors || floorShort > 0} onClick={addFloor} data-testid="shop-add-floor">{moreFloors ? 'Add a floor' : 'Four floors is the limit'}</Button>
      </Card>
    </div>
  );
}

// ---- sheet -------------------------------------------------------------------------------------------

const GRID_NOTES = {
  floor: (room) => `Floors are priced per m². ${room.name} has ${room.w * room.d} m².`,
  wall: (room) => `Walls are priced per metre. ${room.name} has ${room.w + room.d} m of wall.`,
};

/** at: { category, itemId }. onPlace(itemId) leaves the shop for build mode. Anything that changes the room closes the sheet to show it. */
export function ShopSheet({ open, onClose, at, setAt, onPlace }) {
  const shop = useShopState();
  const item = at.itemId ? itemById(at.itemId) : null;
  const note = GRID_NOTES[at.category];
  const applied = (message) => { toast(message, { icon: 'check-circle' }); onClose(); };
  const chips = useSelectedChipInView([open, at.category, at.itemId]);
  return (
    <Sheet
      open={open} onClose={onClose} title={item ? item.name : 'Shop'} detents={['large']}
      trailing={<span class="gy-sheettrail"><Balance /><IconButton icon="x" weight="bold" label="Close shop" variant="quiet" size="s" onClick={onClose} /></span>}
    >
      {item ? (
        <Detail
          item={item} shop={shop} onBack={() => setAt({ category: at.category, itemId: null })}
          onBought={(message) => toast(message, { icon: 'package' })} onApplied={applied} onPlace={onPlace}
        />
      ) : (
        <div class="gy-shop" data-testid="shop">
          <div class="gy-sticky" ref={chips}>
            <FilterChips label="Shop category" options={SHOP_CATEGORIES} value={at.category} onChange={(category) => setAt({ category, itemId: null })} />
          </div>
          {note && <p class="t-foot c-2">{note(shop.room)}</p>}
          {at.category === 'space' ? <SpacePanel shop={shop} onApplied={applied} /> : (
            <div class="gy-grid">
              {itemsIn(at.category).map((entry) => <Tile key={entry.id} item={entry} shop={shop} onOpen={(itemId) => setAt({ category: at.category, itemId })} />)}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
