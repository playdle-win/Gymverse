// Character: a live portrait and one slot at a time. Owned things are worn with a tap; unowned ones are bought and worn.
import { useState } from 'preact/hooks';
import { useStore, equip, setSkin, setHairColor, buyItem, SKIN_KEYS, HAIR_COLOR_KEYS } from '../../../core/index.js';
import { CATALOG, SKIN, HAIR } from '../../../gym/index.js';
import { Sheet, FilterChips, Button, Points, Badge, toast, formatInt, cx } from '../../system/index.js';
import { Balance } from './hud.jsx';
import { CosmeticThumb, Portrait } from './thumbs.jsx';
import { useSelectedChipInView } from './lib.js';

const SLOTS = [
  { value: 'skin', label: 'Skin' }, { value: 'hair', label: 'Hair' }, { value: 'hairColor', label: 'Hair colour' }, { value: 'beard', label: 'Beard' },
  { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }, { value: 'shoes', label: 'Shoes' }, { value: 'accessory', label: 'Accessory' },
];
const SKIN_NAMES = { s1: 'Fair', s2: 'Light', s3: 'Medium', s4: 'Brown', s5: 'Deep' };
const HAIR_NAMES = { h1: 'Black', h2: 'Brown', h3: 'Blond', h4: 'Copper', h5: 'Silver' };

function Swatches({ label, keys, colors, names, value, onPick }) {
  return (
    <div class="gy-swatches" role="radiogroup" aria-label={label}>
      {keys.map((key) => (
        <button key={key} type="button" role="radio" class="gy-swatch" aria-checked={value === key ? 'true' : 'false'} aria-label={names[key]} onClick={() => onPick(key)} data-testid={`swatch-${key}`}>
          <span class="gy-swatch__dot" style={{ background: colors[key] }} />
          <span class="t-caption">{names[key]}</span>
        </button>
      ))}
    </div>
  );
}

function Wearable({ item, avatar, owned, short, wearing, onPick }) {
  return (
    <button type="button" role="radio" class="gy-wear" aria-checked={wearing ? 'true' : 'false'} onClick={() => onPick(item)} data-testid={`wear-${item.id}`}>
      <span class="gy-wear__art"><CosmeticThumb itemId={item.id} avatar={avatar} size={84} /></span>
      <span class="gy-wear__name">{item.name}</span>
      <span class="gy-wear__meta">
        {wearing ? <Badge tone="accent">Wearing</Badge> : owned ? <span class="t-caption c-2">Owned</span> : (
          <span class={cx('gy-price', short > 0 && 'gy-price--short')}><Points value={item.price} size="s" /></span>
        )}
      </span>
    </button>
  );
}

export function CharacterSheet({ open, onClose }) {
  const [slot, setSlot] = useState('hair');
  const avatar = useStore((s) => s.avatar);
  const owned = useStore((s) => s.owned);
  const points = useStore((s) => s.wallet.points);
  const unlimited = useStore((s) => s.settings.unlimited);
  const slotLabel = SLOTS.find((s) => s.value === slot).label;
  const chips = useSelectedChipInView([open, slot]);

  const options = CATALOG.filter((item) => item.kind === 'cosmetic' && item.slot === slot);
  const sorted = [...options.filter((item) => owned[item.id]), ...options.filter((item) => !owned[item.id])];
  const shortFor = (item) => (unlimited || owned[item.id] ? 0 : Math.max(0, item.price - points));
  const pick = (item) => {
    if (avatar[slot] === item.id) return;
    if (!owned[item.id]) {
      const bought = buyItem(item.id);
      if (!bought.ok) { toast(`${formatInt(shortFor(item))} points short`, { icon: 'warning' }); return; }
      toast(`Bought ${item.name}`, { icon: 't-shirt' });
    }
    equip(slot, item.id);
  };

  return (
    <Sheet
      open={open} onClose={onClose} title="Character" detents={['large']}
      trailing={<span class="gy-sheettrail"><Balance /><Button variant="plain" size="s" onClick={onClose} data-testid="character-done">Done</Button></span>}
    >
      <div class="gy-character" data-testid="character">
        <div class="gy-sticky gy-character__top">
          <div class="gy-stage gy-stage--tall"><Portrait avatar={avatar} size={208} label="Your character" /></div>
          <div ref={chips}><FilterChips label="Part" options={SLOTS} value={slot} onChange={setSlot} /></div>
        </div>
        {slot === 'skin' && <Swatches label="Skin" keys={SKIN_KEYS} colors={SKIN} names={SKIN_NAMES} value={avatar.skin} onPick={setSkin} />}
        {slot === 'hairColor' && <Swatches label="Hair colour" keys={HAIR_COLOR_KEYS} colors={HAIR} names={HAIR_NAMES} value={avatar.hairColor} onPick={setHairColor} />}
        {options.length > 0 && (
          <div class="gy-wears" role="radiogroup" aria-label={slotLabel}>
            {sorted.map((item) => (
              <Wearable key={item.id} item={item} avatar={avatar} owned={Boolean(owned[item.id])} short={shortFor(item)} wearing={avatar[slot] === item.id} onPick={pick} />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
