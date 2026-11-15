// Prototype controls: art direction, colour theme, appearance and the test lab.
// Desktop: rendered in the panel beside the phone stage. Phone: the same component inside a sheet (openControls()).
import { useEffect, useState } from 'preact/hooks';
import { useStore, setStyle, setTheme, setAppearance, setUnlimited, skipTime, resetAll, DAY } from '../../core/index.js';
import { STYLES, THEMES, APPEARANCES } from './theme.js';
import { Section, List, ListRow } from './content.jsx';
import { Segmented, Toggle, Button } from './controls.jsx';
import { Sheet, confirm, toast } from './overlays.jsx';
import { Icon } from './icons.js';

const SKIPS = [1, 7, 14];
const dayWord = (n) => (n === 1 ? '1 day' : `${n} days`);

async function resetToDayOne() {
  const ok = await confirm({
    title: 'Reset to day one?',
    message: 'Your gym, points and purchases go back to the starting state. The seeded workout history is restored.',
    confirmLabel: 'Reset', destructive: true,
  });
  if (!ok) return;
  resetAll();
  toast('Back to day one', { icon: 'check-circle' });
}

export function PrototypeControls() {
  const settings = useStore((s) => s.settings);
  const skipped = Math.round((settings.timeOffsetMs || 0) / DAY);
  const skip = (days) => { skipTime(days * DAY); toast(`Skipped ${dayWord(days)}`, { icon: 'check-circle' }); };
  return (
    <div class="gb-controls">
      <Section title="Art direction">
        <List role="radiogroup" aria-label="Art direction">
          {STYLES.map((s) => (
            <ListRow key={s.id} role="radio" title={s.name} subtitle={s.blurb} selected={settings.style === s.id} onClick={() => setStyle(s.id)} />
          ))}
        </List>
      </Section>

      <Section title="Colour theme">
        <div class="gb-swatches" role="radiogroup" aria-label="Colour theme">
          {THEMES.map((t) => (
            <button key={t.id} type="button" role="radio" class="gb-swatch" data-gbtheme={t.id} aria-checked={settings.theme === t.id ? 'true' : 'false'} onClick={() => setTheme(t.id)}>
              <span class="gb-swatch__dot"><Icon name="check" size={18} weight="bold" /></span>
              <span class="gb-swatch__name">{t.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Appearance">
        <Segmented label="Appearance" options={APPEARANCES} value={settings.appearance} onChange={setAppearance} />
      </Section>

      <Section title="Test lab" footnote={skipped > 0 ? `The app clock is ${dayWord(skipped)} ahead.` : 'Skipping time builds dust and passive income.'}>
        <List>
          <ListRow title="Unlimited points" subtitle="Purchases cost nothing" trailing={<Toggle label="Unlimited points" checked={!!settings.unlimited} onChange={setUnlimited} />} />
          <ListRow title="Skip time">
            <span class="gb-controls__skips">
              {SKIPS.map((d) => <Button key={d} variant="quiet" size="s" onClick={() => skip(d)}>{dayWord(d)}</Button>)}
            </span>
          </ListRow>
          <ListRow title="Reset to day one" tone="bad" icon="arrow-counter-clockwise" onClick={resetToDayOne} />
        </List>
      </Section>
    </div>
  );
}

let notifyOpen = () => {};
/** Opens the prototype controls in a sheet (the profile button calls this). */
export function openControls() { notifyOpen(true); }

/** Mounted once by the shell. */
export function ControlsSheet() {
  const [open, setOpen] = useState(false);
  useEffect(() => { notifyOpen = setOpen; return () => { notifyOpen = () => {}; }; }, []);
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Prototype controls" detents={['large']}>
      <PrototypeControls />
    </Sheet>
  );
}
