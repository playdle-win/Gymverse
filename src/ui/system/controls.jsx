// Controls: Button, IconButton, Spinner, Segmented, Chip, FilterChips, Toggle, Slider, Stepper, NumberField, TextField.
// Every control has pressed, focus-visible and disabled states and a 44px touch target (CSS in 20-controls.css).
import { useRef, useState, useEffect } from 'preact/hooks';
import { Icon } from './icons.js';
import { cx, clamp } from './util.js';

export function Spinner({ size = 20 }) {
  return <span class="gb-spinner" style={{ width: size, height: size }} role="status" aria-label="Loading" />;
}

/** Button.
 *  variant: 'primary' (accent fill) | 'secondary' (accent tint) | 'quiet' (neutral fill) | 'plain' (text only) | 'destructive'
 *  size: 'l' (50px, default) | 'm' (44px) | 's' (34px visual, 44px target)
 *  icon / iconEnd: icon names. loading: shows a spinner and blocks input. block: full width.
 *  Label copy says what happens ("Start workout"), sentence case. */
export function Button({ variant = 'primary', size = 'l', icon, iconEnd, loading = false, disabled = false, block = false, type = 'button', class: cls, children, ...rest }) {
  const iconSize = size === 's' ? 16 : 20;
  return (
    <button
      type={type}
      class={cx('gb-btn', `gb-btn--${variant}`, `gb-btn--${size}`, block && 'gb-btn--block', cls)}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      {...rest}
    >
      {loading ? <Spinner size={iconSize} /> : icon && <Icon name={icon} size={iconSize} weight="bold" />}
      {children != null && <span class="gb-btn__label">{children}</span>}
      {iconEnd && <Icon name={iconEnd} size={iconSize} weight="bold" />}
    </button>
  );
}

/** IconButton. `label` is required (it becomes aria-label).
 *  variant: 'plain' (default) | 'quiet' (neutral circle) | 'tinted' | 'primary'. size: 'm' (44px) | 's' (36px visual). */
export function IconButton({ icon, label, variant = 'plain', size = 'm', weight = 'regular', disabled = false, class: cls, ...rest }) {
  return (
    <button type="button" class={cx('gb-iconbtn', `gb-iconbtn--${variant}`, `gb-iconbtn--${size}`, cls)} aria-label={label} disabled={disabled} {...rest}>
      <Icon name={icon} size={size === 's' ? 18 : 22} weight={weight} />
    </button>
  );
}

const normalise = (options) => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

/** Segmented control: 2 to 5 mutually exclusive views. options: strings or { value, label }. `label` names the group. */
export function Segmented({ options, value, onChange, label, class: cls }) {
  const items = normalise(options);
  const index = Math.max(0, items.findIndex((o) => o.value === value));
  const onKey = (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = items[(index + step + items.length) % items.length];
    onChange(next.value);
    const buttons = e.currentTarget.querySelectorAll('[role="radio"]');
    buttons[items.indexOf(next)].focus();
  };
  return (
    <div class={cx('gb-seg', cls)} role="radiogroup" aria-label={label} style={{ '--n': items.length, '--i': index }} onKeyDown={onKey}>
      <span class="gb-seg__thumb" aria-hidden="true" />
      {items.map((o, i) => (
        <button key={o.value} type="button" role="radio" class="gb-seg__opt" aria-checked={i === index ? 'true' : 'false'} tabIndex={i === index ? 0 : -1} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Chip: a single toggleable filter or tag. */
export function Chip({ selected = false, icon, onClick, disabled = false, children }) {
  return (
    <button type="button" class="gb-chip" aria-pressed={selected ? 'true' : 'false'} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={16} weight={selected ? 'fill' : 'regular'} />}
      <span>{children}</span>
    </button>
  );
}

/** FilterChips: a horizontally scrolling row. value is one id, or an array when `multiple`.
 *  bleed (default true) lets the row scroll edge to edge inside a padded Screen. */
export function FilterChips({ options, value, onChange, multiple = false, label, bleed = true }) {
  const items = normalise(options);
  const isOn = (v) => (multiple ? (value || []).includes(v) : value === v);
  const toggle = (v) => {
    if (!multiple) { onChange(v); return; }
    const current = value || [];
    onChange(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
  };
  return (
    <div class={cx('gb-chips gb-hscroll', bleed && 'gb-chips--bleed')} role="group" aria-label={label}>
      {items.map((o) => <Chip key={o.value} selected={isOn(o.value)} icon={o.icon} onClick={() => toggle(o.value)}>{o.label}</Chip>)}
    </div>
  );
}

/** Toggle (switch). Give it `label` unless it sits in a ListRow, which labels it. */
export function Toggle({ checked, onChange, label, disabled = false, ...rest }) {
  return (
    <button type="button" role="switch" class="gb-toggle" aria-checked={checked ? 'true' : 'false'} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} {...rest}>
      <span class="gb-toggle__thumb" />
    </button>
  );
}

/** Slider: native range input, so keyboard and assistive tech work. */
export function Slider({ value, min = 0, max = 100, step = 1, onInput, label, disabled = false }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range" class="gb-slider" min={min} max={max} step={step} value={value} disabled={disabled}
      aria-label={label} style={{ '--pct': pct + '%' }}
      onInput={(e) => onInput(Number(e.currentTarget.value))}
    />
  );
}

const roundTo = (v, step) => Math.round(v / step) * step;
const tidy = (v) => Number(v.toFixed(4));

/** Stepper: minus, value, plus. For small ranges (sets, rest seconds). */
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label, unit, format = String }) {
  const set = (v) => onChange(tidy(clamp(roundTo(v, step), min, max)));
  return (
    <div class="gb-stepper" role="group" aria-label={label}>
      <button type="button" class="gb-stepper__btn" aria-label={`Decrease ${label || 'value'}`} disabled={value <= min} onClick={() => set(value - step)}>
        <Icon name="minus" size={18} weight="bold" />
      </button>
      <output class="gb-stepper__value t-num" aria-live="polite">{format(value)}{unit && <span class="gb-stepper__unit">{unit}</span>}</output>
      <button type="button" class="gb-stepper__btn" aria-label={`Increase ${label || 'value'}`} disabled={value >= max} onClick={() => set(value + step)}>
        <Icon name="plus" size={18} weight="bold" />
      </button>
    </div>
  );
}

const parseNumber = (text) => {
  const n = parseFloat(String(text).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** NumberField: kg and reps entry. Numeric keypad, selects everything on focus, commits on blur or Enter.
 *  decimal: allow fractions (kg). unit: suffix inside the field. size: 'l' (56px, default) | 'm' (44px, for set rows).
 *  onChange receives a number, or null when the field is cleared. */
export function NumberField({ value, onChange, label, unit, min = 0, max = 9999, decimal = false, size = 'l', placeholder = '0', disabled = false, hideLabel = false, id }) {
  const [draft, setDraft] = useState(null);
  const shown = draft !== null ? draft : value === null || value === undefined ? '' : String(value);
  const commit = () => {
    if (draft === null) return;
    const n = parseNumber(draft);
    setDraft(null);
    onChange(n === null ? null : tidy(clamp(decimal ? n : Math.round(n), min, max)));
  };
  return (
    <label class={cx('gb-field gb-numfield', `gb-numfield--${size}`)}>
      <span class={cx('gb-field__label', hideLabel && 'gb-sr')}>{label}</span>
      <span class="gb-numfield__box">
        <input
          id={id} class="gb-numfield__input t-num" type="text" inputMode={decimal ? 'decimal' : 'numeric'} pattern={decimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
          autocomplete="off" enterkeyhint="done" placeholder={placeholder} disabled={disabled} value={shown}
          onFocus={(e) => e.currentTarget.select()}
          onInput={(e) => setDraft(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        {unit && <span class="gb-numfield__unit">{unit}</span>}
      </span>
    </label>
  );
}

/** TextField: label above, helper or error below. icon: leading icon name. multiline: textarea. */
export function TextField({ label, value, onInput, placeholder, helper, error, icon, type = 'text', multiline = false, disabled = false, hideLabel = false, ...rest }) {
  const ref = useRef(null);
  const [describedBy] = useState(() => 'gb-help-' + Math.random().toString(36).slice(2, 8));
  useEffect(() => {
    if (!multiline || !ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = ref.current.scrollHeight + 'px';
  }, [value, multiline]);
  const note = error || helper;
  const shared = {
    ref, class: 'gb-textfield__input', placeholder, disabled, value: value || '',
    'aria-invalid': error ? 'true' : undefined, 'aria-describedby': note ? describedBy : undefined,
    onInput: (e) => onInput(e.currentTarget.value),
    ...rest,
  };
  return (
    <label class={cx('gb-field gb-textfield', error && 'is-error')}>
      <span class={cx('gb-field__label', hideLabel && 'gb-sr')}>{label}</span>
      <span class="gb-textfield__box">
        {icon && <Icon name={icon} size={20} />}
        {multiline ? <textarea rows={2} {...shared} /> : <input type={type} {...shared} />}
      </span>
      {note && <span id={describedBy} class={cx('gb-field__note', error && 'is-error')}>{error && <Icon name="warning" size={14} weight="fill" />}{note}</span>}
    </label>
  );
}
