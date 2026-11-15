// The floating layer over the room: balance, passive income, multiplier, dust banner, floor switcher.
import { useState } from 'preact/hooks';
import { useStore, collectPassive, TUNING } from '../../../core/index.js';
import { Icon, PointsGlyph, PointsPill, Segmented, Button, Points, Badge, toast, formatInt, cx } from '../../system/index.js';
import { PersonAvatar } from '../shared/index.jsx';
import { formatMultiplier, formatWholePercent, formatRate, daysAgoLabel, pointsWord, useCountTo } from './lib.js';

/** The wallet pill with a number that counts to its new value after a purchase or a collection. */
export function Balance() {
  const points = useStore((s) => s.wallet.points);
  return <PointsPill value={useCountTo(points)} />;
}

function HudChip({ label, onClick, fill, tone, testid, children }) {
  return (
    <button type="button" class={cx('gy-chip', tone && `gy-chip--${tone}`)} aria-label={label} onClick={onClick} data-testid={testid}>
      {fill !== undefined && <span class="gy-chip__track" aria-hidden="true"><span class="gy-chip__fill" style={{ width: `${Math.round(fill * 100)}%` }} /></span>}
      <span class="gy-chip__in">{children}</span>
    </button>
  );
}

/** Passive income: the hourly rate, filling up to the cap; a tap collects. Says what it takes while inactive. */
export function PassiveChip({ income }) {
  const [burst, setBurst] = useState(null);
  if (!income.active) {
    const needed = TUNING.consistencyLevels[TUNING.passiveMinLevel].workouts14;
    const explain = () => toast(`Earn while away: ${needed} workouts in 14 days`, { icon: 'person-simple-run', duration: 3600 });
    return (
      <HudChip label="Passive income is off. Train twice a week and your character earns while you are away." onClick={explain} testid="hud-passive">
        <Icon name="person-simple-run" size={18} />
        <span class="gy-chip__text">Train 2x a week</span>
      </HudChip>
    );
  }
  const full = income.hoursAccrued >= TUNING.passiveCapHours;
  const collect = () => {
    const result = collectPassive();
    if (!result.ok) { toast(`Nothing yet. Earning ${formatRate(income.ratePerHour)} an hour.`, { icon: 'clock' }); return; }
    setBurst({ amount: result.collected, key: Date.now() });
    toast(`Collected ${pointsWord(result.collected)}`, { icon: 'coins' });
  };
  return (
    <span class="gy-chipwrap">
      <HudChip
        label={`Collect ${pointsWord(income.accrued)}. Your character earns ${formatRate(income.ratePerHour)} an hour${full ? ' and is full' : ''}.`}
        onClick={collect} fill={income.hoursAccrued / TUNING.passiveCapHours} tone={full ? 'full' : undefined} testid="hud-passive"
      >
        <PointsGlyph size={18} />
        <span class="t-num gy-chip__num">{formatInt(income.accrued)}</span>
        <span class="gy-chip__text gy-chip__text--quiet">{full ? 'Full' : `+${formatRate(income.ratePerHour)}/h`}</span>
      </HudChip>
      {burst && <span key={burst.key} class="gy-burst t-num" aria-hidden="true">+{formatInt(burst.amount)}</span>}
    </span>
  );
}

/** The gym's average multiplier; opens the Multipliers sheet. */
export function MultiplierChip({ multipliers, onClick }) {
  const dusty = multipliers.dustPenalty > 0;
  return (
    <HudChip label={`Gym multiplier ${formatMultiplier(multipliers.average)}. Show the breakdown.`} onClick={onClick} tone={dusty ? 'warn' : undefined} testid="hud-multiplier">
      <Icon name={dusty ? 'broom' : 'lightning'} size={18} weight="fill" />
      <span class="t-num gy-chip__num">{formatMultiplier(multipliers.average)}</span>
    </HudChip>
  );
}

/** Slim notice while dust is building up. */
export function DustBanner({ multipliers, lastWorkoutAt, t }) {
  return (
    <p class="gy-banner" role="status" data-testid="dust-banner">
      <Icon name="broom" size={20} weight="fill" />
      <span>
        <strong>Dust is settling.</strong> Your last workout was {daysAgoLabel(lastWorkoutAt, t)}. Multipliers down {formatWholePercent(multipliers.dustPenalty)}. One workout clears it.
      </span>
    </p>
  );
}

const SHORT_FLOORS = ['Ground', 'Floor 1', 'Floor 2', 'Floor 3'];

/** Switches between the rooms of a gym. Two rooms show their names, more show short floor labels. */
export function FloorSwitcher({ rooms, active, onChange }) {
  const options = rooms.map((room, i) => ({ value: i, label: rooms.length <= 2 ? room.name : SHORT_FLOORS[i] }));
  return <Segmented class="gy-floors" label="Floor" options={options} value={active} onChange={onChange} />;
}

/** Replaces the HUD while visiting: whose gym this is. */
export function VisitTitle({ person }) {
  return (
    <span class="gy-visit" data-testid="visit-title">
      <PersonAvatar person={person} size={36} />
      <span class="gy-visit__text">
        <span class="t-headline t-truncate">{person.name}</span>
        <span class="t-caption c-2 t-truncate">@{person.handle}</span>
      </span>
    </span>
  );
}

/** What a visited gym is worth and how its owner is doing. */
export function VisitFacts({ value, streakWeeks, dusty }) {
  return (
    <p class="gy-banner gy-banner--facts">
      <span class="gy-fact"><Points value={value} size="s" /> <span class="c-2">gym value</span></span>
      {streakWeeks > 0 && <span class="gy-fact"><Icon name="fire" size={16} weight="fill" /> {streakWeeks} week streak</span>}
      {dusty && <Badge tone="warn" icon="broom">Dusty</Badge>}
    </p>
  );
}

export const LeaveButton = ({ onClick }) => <Button size="s" variant="primary" onClick={onClick} data-testid="visit-leave">Leave</Button>;
