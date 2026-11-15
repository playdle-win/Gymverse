// Multipliers: what the gym does to workout points, muscle by muscle, and the best next purchase.
import { useStore, selUnplaced, TUNING } from '../../../core/index.js';
import { MUSCLES, MUSCLE_LABEL } from '../../../exercises/data.js';
import { Sheet, Stat, StatRow, Meter, Card, Button } from '../../system/index.js';
import { ItemThumb } from '../shared/index.jsx';
import { formatMultiplier, formatPercent, formatWholePercent, sourcesFor, weakestFix } from './lib.js';

const FULL_SCALE = TUNING.muscleBonusCap + TUNING.vibeCap;

function MuscleRow({ muscle, value, sources }) {
  return (
    <li class="gy-muscle">
      <span class="gy-muscle__head">
        <span class="t-callout">{MUSCLE_LABEL[muscle]}</span>
        <span class="t-num gy-muscle__value">{formatMultiplier(value)}</span>
      </span>
      <Meter value={(value - 1) / FULL_SCALE} tone={value < 1 ? 'warn' : 'accent'} label={`${MUSCLE_LABEL[muscle]} multiplier`} />
      <span class="t-caption c-2">{sources.length ? sources.map((item) => item.name).join(', ') : 'No equipment for this yet'}</span>
    </li>
  );
}

/** onShop(itemId) opens the shop on that item; onPlace(itemId) starts placing a stored copy. */
export function MultipliersSheet({ open, onClose, multipliers, onShop, onPlace }) {
  const gym = useStore((s) => s.gym);
  useStore((s) => s.owned);
  const ranked = [...MUSCLES].sort((a, b) => multipliers.byMuscle[b] - multipliers.byMuscle[a]);
  const fix = weakestFix(multipliers);
  const stored = fix ? selUnplaced(fix.item.id) : 0;
  return (
    <Sheet open={open} onClose={onClose} title="Multipliers" detents={['medium', 'large']}>
      <div class="gy-mults" data-testid="multipliers">
        <p class="t-callout c-2">Each exercise earns its points times the multiplier of the muscles it trains. Main muscles count double.</p>
        <StatRow>
          <Stat value={formatMultiplier(multipliers.average)} label="Gym average" />
          <Stat value={`+${formatPercent(multipliers.vibe)}`} label="Decor vibe" />
          <Stat value={multipliers.dustPenalty > 0 ? `-${formatWholePercent(multipliers.dustPenalty)}` : 'None'} label="Dust" delta={multipliers.dustPenalty > 0 ? { text: 'One workout clears it', tone: 'bad' } : undefined} />
        </StatRow>
        {fix && (
          <Card class="gy-fix">
            <ItemThumb itemId={fix.item.id} size={64} />
            <div class="gy-fix__text">
              <span class="t-headline">Weakest: {fix.label.toLowerCase()} at {formatMultiplier(fix.value)}</span>
              <span class="t-foot c-2">{fix.item.name} adds {formatPercent(fix.bonus)}{stored ? '. You have one in storage.' : ' once it stands in your gym.'}</span>
            </div>
            {stored
              ? <Button size="s" onClick={() => onPlace(fix.item.id)} data-testid="mult-place">Place it</Button>
              : <Button size="s" variant="secondary" onClick={() => onShop(fix.item.id)} data-testid="mult-shop">See in shop</Button>}
          </Card>
        )}
        <ul class="gy-muscles">
          {ranked.map((muscle) => <MuscleRow key={muscle} muscle={muscle} value={multipliers.byMuscle[muscle]} sources={sourcesFor(gym, muscle)} />)}
        </ul>
      </div>
    </Sheet>
  );
}
