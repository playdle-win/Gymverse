// Hand-built SVG charts. Colours, line weight and corner radius come from tokens through 52-progress.css,
// so the same marks follow the art direction, the theme and the appearance without any per-style code.
// Each chart is drawn at its real pixel size (no scaling), has one y scale, and carries a text summary.
import { useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { shortDate } from '../shared/index.jsx';
import { niceScale } from './format.js';

/** Measures an element's layout width so a chart can draw at real pixels. Returns [ref, width]. */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

const crisp = (v) => Math.round(v) + 0.5;

/**
 * Scrubbing: the whole plot is one slider. Touch selects and stays; a mouse selects on hover and clears on leave;
 * arrow keys step through the marks. indexAt maps an x in layout pixels to the nearest mark.
 */
function scrubProps({ count, selected, onSelect, indexAt, label, valueText }) {
  const current = selected ?? count - 1;
  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const scale = box.width ? e.currentTarget.offsetWidth / box.width : 1; // the desktop stage may be scaled
    onSelect(indexAt((e.clientX - box.left) * scale));
  };
  const keys = { ArrowLeft: current - 1, ArrowDown: current - 1, ArrowRight: current + 1, ArrowUp: current + 1, Home: 0, End: count - 1 };
  return {
    role: 'slider', tabIndex: 0, 'aria-label': label, 'aria-orientation': 'horizontal',
    'aria-valuemin': 1, 'aria-valuemax': count, 'aria-valuenow': current + 1, 'aria-valuetext': valueText,
    onPointerDown: (e) => {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers cannot be captured */ }
      pick(e);
    },
    onPointerMove: (e) => { if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) pick(e); },
    onPointerLeave: (e) => { if (e.pointerType === 'mouse') onSelect(null); },
    onBlur: () => onSelect(null),
    onKeyDown: (e) => {
      if (e.key === 'Escape') { onSelect(null); return; }
      if (!(e.key in keys)) return;
      e.preventDefault();
      onSelect(Math.min(count - 1, Math.max(0, keys[e.key])));
    },
  };
}

/**
 * Line chart of one measure over sessions, on a true time axis.
 * points: [{ t, v }] oldest first (at least one). selected: index or null (null emphasises the latest point).
 * onSelect(index | null). summary: the text alternative. valueText(index): what a screen reader hears while scrubbing.
 */
export function LineChart({ points, selected, onSelect, summary, valueText, height = 212 }) {
  const [ref, width] = useWidth();
  const n = points.length;
  const values = points.map((p) => p.v);
  const scale = niceScale(Math.min(...values), Math.max(...values));
  const tickLabels = scale.ticks.map(scale.format);
  const left = Math.max(...tickLabels.map((l) => l.length)) * 6.4 + 10;
  const top = 10, right = 10, bottom = 26;
  const plotW = Math.max(0, width - left - right), plotH = height - top - bottom;
  const t0 = points[0].t, span = points[n - 1].t - t0;
  const xs = points.map((p) => (span ? left + ((p.t - t0) / span) * plotW : left + plotW / 2));
  const y = (v) => top + (1 - (v - scale.lo) / (scale.hi - scale.lo)) * plotH;
  const active = selected ?? n - 1;
  const indexAt = (px) => xs.reduce((best, x, i) => (Math.abs(x - px) < Math.abs(xs[best] - px) ? i : best), 0);
  const middle = Math.floor((n - 1) / 2);
  const dated = n < 2 ? [0] : n >= 5 && Math.min(xs[middle] - xs[0], xs[n - 1] - xs[middle]) > 84 ? [0, middle, n - 1] : [0, n - 1];
  const anchor = (i) => (n < 2 || (i > 0 && i < n - 1) ? 'middle' : i === 0 ? 'start' : 'end');
  return (
    <figure ref={ref} class="pg-chart" style={{ height }}>
      <figcaption class="gb-sr">{summary}</figcaption>
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          {scale.ticks.map((tick, i) => (
            <g key={tick}>
              <line class="pg-chart__grid" x1={left} x2={width} y1={crisp(y(tick))} y2={crisp(y(tick))} />
              <text class="pg-chart__tick t-axis" x={left - 8} y={y(tick) + 4} text-anchor="end">{tickLabels[i]}</text>
            </g>
          ))}
          {dated.map((i) => (
            <text key={i} class="pg-chart__tick t-axis" x={xs[i]} y={height - 6} text-anchor={anchor(i)}>{shortDate(points[i].t)}</text>
          ))}
          {selected !== null && <line class="pg-chart__cursor" x1={crisp(xs[active])} x2={crisp(xs[active])} y1={top} y2={top + plotH} />}
          {n > 1 && <path class="pg-chart__line" d={points.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${y(p.v).toFixed(1)}`).join('')} />}
          {n <= 40 && points.map((p, i) => i !== active && <circle key={p.t} class="pg-chart__vertex" cx={xs[i]} cy={y(p.v)} r="2.5" />)}
          <circle class="pg-chart__point" cx={xs[active]} cy={y(points[active].v)} r="5.5" />
        </svg>
      )}
      <div class="pg-chart__hit" data-testid="chart-scrub" {...scrubProps({ count: n, selected, onSelect, indexAt, label: 'Session', valueText: valueText(active) })} />
    </figure>
  );
}

/**
 * Workouts per week as bars against the active-week threshold.
 * weeks: [{ workouts }] oldest first. labels: one x label per week ('' to skip). threshold: workouts that make a week active.
 */
export function WeekBars({ weeks, labels, threshold, selected, onSelect, summary, valueText, height = 152 }) {
  const [ref, width] = useWidth();
  const clip = useId();
  const n = weeks.length;
  const top = 8, left = 22, bottom = 24;
  const plotW = Math.max(0, width - left), plotH = height - top - bottom;
  const peak = Math.max(threshold + 2, ...weeks.map((w) => w.workouts));
  const hi = peak + (peak % 2);
  const slot = plotW / n, barW = Math.min(24, slot * 0.58);
  const y = (v) => top + (1 - v / hi) * plotH;
  const active = selected ?? n - 1;
  const indexAt = (px) => Math.min(n - 1, Math.max(0, Math.floor((px - left) / slot)));
  const ticks = Array.from({ length: hi / 2 + 1 }, (_, i) => i * 2);
  return (
    <figure ref={ref} class="pg-chart" style={{ height }}>
      <figcaption class="gb-sr">{summary}</figcaption>
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          <clipPath id={clip}><rect x={left} y="0" width={plotW} height={top + plotH} /></clipPath>
          <rect class="pg-chart__band" x={left + active * slot} y={top} width={slot} height={plotH} />
          {ticks.map((tick) => (
            <g key={tick}>
              {tick !== threshold && <line class="pg-chart__grid" x1={left} x2={width} y1={crisp(y(tick))} y2={crisp(y(tick))} />}
              <text class="pg-chart__tick t-axis" x={left - 8} y={y(tick) + 4} text-anchor="end">{tick}</text>
            </g>
          ))}
          <line class="pg-chart__threshold" x1={left} x2={width} y1={crisp(y(threshold))} y2={crisp(y(threshold))} />
          <g clip-path={`url(#${clip})`}>
            {weeks.map((week, i) => week.workouts > 0 && (
              <rect key={i} class={week.workouts >= threshold ? 'pg-chart__bar' : 'pg-chart__bar pg-chart__bar--quiet'}
                x={left + i * slot + (slot - barW) / 2} y={y(week.workouts)} width={barW} height={plotH + 8} />
            ))}
          </g>
          {labels.map((label, i) => label && (
            <text key={i} class="pg-chart__tick t-axis" x={i === n - 1 ? width : left + (i + 0.5) * slot} y={height - 6} text-anchor={i === n - 1 ? 'end' : 'middle'}>{label}</text>
          ))}
        </svg>
      )}
      <div class="pg-chart__hit" data-testid="weeks-scrub" {...scrubProps({ count: n, selected, onSelect, indexAt, label: 'Week', valueText: valueText(active) })} />
    </figure>
  );
}

/** Sparkline: the shape of a series on its own scale, latest value marked. Decorative next to the numbers it sits with. */
export function Sparkline({ values, width = 64, height = 22 }) {
  const pad = 4;
  const lo = Math.min(...values), range = Math.max(...values) - lo;
  const x = (i) => (values.length > 1 ? pad + (i / (values.length - 1)) * (width - 2 * pad) : width - pad);
  const y = (v) => (range ? pad + (1 - (v - lo) / range) * (height - 2 * pad) : height / 2);
  const last = values.length - 1;
  return (
    <svg class="pg-spark" width={width} height={height} aria-hidden="true">
      {last > 0 && <path class="pg-spark__line" d={values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')} />}
      <circle class="pg-spark__end" cx={x(last)} cy={y(values[last])} r="2.5" />
    </svg>
  );
}
