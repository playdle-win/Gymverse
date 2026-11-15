// Content building blocks: Section, List, ListRow, Card, Stat, StatRow, Points, PointsPill, Badge, Avatar,
// EmptyState, Skeleton, ProgressRing, Meter. Group with spacing, hairlines and type first; Card is the exception.
import { useStore } from '../../core/index.js';
import { Icon, PointsGlyph } from './icons.js';
import { cx, clamp, formatInt } from './util.js';

/** Section: a titled group. action: { label, onClick } renders a plain text button on the trailing side.
 *  footnote: one short line of help under the group. */
export function Section({ title, action, footnote, class: cls, children }) {
  return (
    <section class={cx('gb-section', cls)}>
      {(title || action) && (
        <header class="gb-section__head">
          {title && <h2 class="gb-section__title">{title}</h2>}
          {action && <button type="button" class="gb-section__action" onClick={action.onClick}>{action.label}</button>}
        </header>
      )}
      {children}
      {footnote && <p class="gb-section__foot">{footnote}</p>}
    </section>
  );
}

/** List: rows separated by hairlines. variant 'inset' (default) sits on one raised surface;
 *  'plain' has no surface at all. Use 'plain' inside a Card or Sheet so surfaces never stack. */
export function List({ variant = 'inset', class: cls, children, ...rest }) {
  return <ul class={cx('gb-list', `gb-list--${variant}`, cls)} {...rest}>{children}</ul>;
}

/** ListRow.
 *  leading: any node (Avatar, exercise art). icon: icon name shorthand for leading.
 *  title, subtitle: text. value: trailing text. trailing: any node (Toggle, Badge, Points).
 *  chevron: shows the disclosure caret. selected: shows a check (single choice lists).
 *  onClick makes the whole row a button with a pressed state. tone: 'bad' for destructive rows. */
export function ListRow({ leading, icon, title, subtitle, value, trailing, chevron = false, selected, onClick, tone, disabled = false, role, children }) {
  const body = (
    <>
      {(leading || icon) && <span class="gb-row__leading">{leading || <Icon name={icon} size={24} />}</span>}
      <span class="gb-row__text">
        <span class="gb-row__title">{title}</span>
        {subtitle && <span class="gb-row__subtitle">{subtitle}</span>}
        {children}
      </span>
      {value !== undefined && value !== null && <span class="gb-row__value">{value}</span>}
      {trailing && <span class="gb-row__trailing">{trailing}</span>}
      {selected !== undefined && <span class="gb-row__check" data-on={selected ? 'true' : 'false'}><Icon name="check" size={18} weight="bold" /></span>}
      {chevron && <Icon class="gb-row__chevron" name="caret-right" size={14} weight="bold" />}
    </>
  );
  const cls = cx('gb-row', tone && `gb-row--${tone}`);
  return (
    <li class="gb-list__item" role={role ? 'presentation' : undefined}>
      {onClick
        ? <button type="button" class={cls} onClick={onClick} disabled={disabled} role={role} aria-checked={role === 'radio' ? (selected ? 'true' : 'false') : undefined}>{body}</button>
        : <div class={cls}>{body}</div>}
    </li>
  );
}

/** Card: one distinct object on the page background (a feed post, a routine, a shop item).
 *  Maximum nesting is one: a Card inside a Card or inside an inset List flattens itself on purpose. */
export function Card({ onClick, padded = true, class: cls, children, ...rest }) {
  const Tag = onClick ? 'button' : 'div';
  return <Tag class={cx('gb-card', padded && 'gb-card--padded', onClick && 'gb-card--tap', cls)} type={onClick ? 'button' : undefined} onClick={onClick} {...rest}>{children}</Tag>;
}

/** Stat: a number with a label, no box. Put several in a StatRow.
 *  value: string or number. unit: small suffix ("kg"). delta: { text, tone: 'good' | 'bad' }. size: 'm' | 'l'. */
export function Stat({ value, unit, label, delta, size = 'm' }) {
  return (
    <div class={cx('gb-stat', `gb-stat--${size}`)}>
      <div class="gb-stat__value t-num">{value}{unit && <span class="gb-stat__unit">{unit}</span>}</div>
      <div class="gb-stat__label">{label}</div>
      {delta && <div class={cx('gb-stat__delta', delta.tone && `c-${delta.tone}`)}>{delta.text}</div>}
    </div>
  );
}

/** StatRow: stats side by side, separated by hairlines. */
export function StatRow({ class: cls, children }) {
  return <div class={cx('gb-statrow', cls)}>{children}</div>;
}

/** Points: an amount with the coin. Use it for prices, rewards and breakdown lines. sign: show + or -. */
export function Points({ value, sign = false, size = 'm', class: cls }) {
  const prefix = sign ? (value < 0 ? '-' : '+') : '';
  return (
    <span class={cx('gb-points', `gb-points--${size}`, cls)}>
      <PointsGlyph size={size === 'l' ? 24 : size === 's' ? 14 : 18} />
      <span class="t-num">{prefix}{formatInt(Math.abs(value))}</span>
      <span class="gb-sr">points</span>
    </span>
  );
}

/** PointsPill: the wallet balance. Reads the store by default; shows the infinity sign while points are unlimited.
 *  Pass value / unlimited to override, onClick to make it a button. */
export function PointsPill({ value, unlimited, onClick }) {
  const wallet = useStore((s) => (s.wallet ? s.wallet.points : 0));
  const testUnlimited = useStore((s) => !!(s.settings && s.settings.unlimited));
  const infinite = unlimited === undefined ? testUnlimited : unlimited;
  const amount = value === undefined ? wallet : value;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag class="gb-pointspill" type={onClick ? 'button' : undefined} onClick={onClick} aria-label={infinite ? 'Unlimited points' : `${formatInt(amount)} points`}>
      <PointsGlyph size={18} />
      {infinite ? <Icon name="infinity" size={20} weight="bold" /> : <span class="t-num">{formatInt(amount)}</span>}
    </Tag>
  );
}

/** Badge: a short status label. tone: 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'points'. solid: filled. */
export function Badge({ tone = 'neutral', solid = false, icon, children }) {
  return (
    <span class={cx('gb-badge', `gb-badge--${tone}`, solid && 'gb-badge--solid')}>
      <span class="gb-badge__in">{icon && <Icon name={icon} size={12} weight="fill" />}{children}</span>
    </span>
  );
}

const initials = (name) => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** Avatar: a slot. Children (a canvas or SVG of the character) fill it; without children it shows initials.
 *  size in px (28, 36, 44, 64, 96). ring: accent ring for "me" or "live". */
export function Avatar({ size = 44, name, ring = false, class: cls, children }) {
  return (
    <span class={cx('gb-avatar', ring && 'gb-avatar--ring', cls)} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} role={name ? 'img' : undefined} aria-label={name}>
      {children || <span class="gb-avatar__initials" aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}

/** EmptyState: says what belongs here and offers the next action. action: a node (usually a Button). */
export function EmptyState({ icon, title, text, action }) {
  return (
    <div class="gb-empty">
      {icon && <span class="gb-empty__icon"><Icon name={icon} size={32} /></span>}
      <h3 class="gb-empty__title t-title">{title}</h3>
      {text && <p class="gb-empty__text">{text}</p>}
      {action && <div class="gb-empty__action">{action}</div>}
    </div>
  );
}

/** Skeleton: a loading placeholder shaped like the content. w/h: CSS sizes. shape: 'rect' | 'text' | 'circle'. */
export function Skeleton({ w = '100%', h = 16, shape = 'rect' }) {
  return <span class={cx('gb-skeleton', `gb-skeleton--${shape}`)} style={{ width: typeof w === 'number' ? w + 'px' : w, height: typeof h === 'number' ? h + 'px' : h }} aria-hidden="true" />;
}

/** ProgressRing: value 0..1. Children render in the middle (a number, an icon). tone: 'accent' | 'good' | 'points'. */
export function ProgressRing({ value, size = 64, stroke = 7, tone = 'accent', label, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = clamp(value || 0, 0, 1);
  return (
    <span class={cx('gb-ring', `gb-ring--${tone}`)} style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(v * 100)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle class="gb-ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" stroke-width={stroke} />
        <circle class="gb-ring__value" cx={size / 2} cy={size / 2} r={r} fill="none" stroke-width={stroke} stroke-dasharray={c} stroke-dashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {children && <span class="gb-ring__center">{children}</span>}
    </span>
  );
}

/** Meter: a horizontal level, value 0..1. tone: 'accent' | 'good' | 'warn' | 'bad' | 'points'. */
export function Meter({ value, tone = 'accent', label }) {
  const v = clamp(value || 0, 0, 1);
  return (
    <span class={cx('gb-meter', `gb-meter--${tone}`)} role="meter" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(v * 100)}>
      <span class="gb-meter__fill" style={{ width: v * 100 + '%' }} />
    </span>
  );
}
