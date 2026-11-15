// Dev harness for the exercise art: every animation, icon and muscle map, in each style and
// appearance. Drive it from the console or tools/shot.mjs --eval:
//   exdev.freeze(0.5)                       pin every animation at a phase (null to release)
//   exdev.set({ tokens: 'mock' | 'app', gbtheme: 'cobalt' })   token source and app colour theme
//   exdev.set({ size: 300, only: 'deadlift', section: 'anims' | 'icons' | 'muscles' | 'strip' | 'all' })
//   ('strip' lays out fixed phases of each rep side by side)
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { ExerciseAnim, ExerciseIcon, MuscleFigure, EXERCISES, MUSCLE_LABEL } from '../src/exercises/index.js';
import { freeze } from '../src/exercises/clock.js';
import { Stage, tintOf } from '../src/exercises/stage.jsx';
import { MOVES } from '../src/exercises/moves.jsx';

const STRIP = [0, 0.14, 0.25, 0.36, 0.5, 0.75];

// Throwaway token values ("mock") so the art can be judged without the app's design tokens.
// "app" uses the real tokens from src/styles and adds the colour theme switch.
const TOKENS = {
  studio: {
    light: { bg: '#f2f2f7', raised: '#ffffff', ink: '#1c1c1e', ink2: '#6c6c72', ink3: '#a1a1a8', fill: 'rgba(118,118,128,.12)', fillStrong: 'rgba(118,118,128,.22)', line: 'rgba(60,60,67,.2)', accent: '#f2541b', accentSoft: 'rgba(242,84,27,.14)' },
    dark: { bg: '#000000', raised: '#1c1c1e', ink: '#f5f5f7', ink2: '#aeaeb4', ink3: '#6e6e75', fill: 'rgba(118,118,128,.24)', fillStrong: 'rgba(118,118,128,.36)', line: 'rgba(84,84,88,.6)', accent: '#ff7a3d', accentSoft: 'rgba(255,122,61,.2)' },
    bw: '0.5px', font: '-apple-system, "SF Pro Text", system-ui, sans-serif',
  },
  arcade: {
    light: { bg: '#e6e0cf', raised: '#fbf6e6', ink: '#1d1b33', ink2: '#56536e', ink3: '#8f8ca3', fill: 'rgba(29,27,51,.1)', fillStrong: 'rgba(29,27,51,.2)', line: '#1d1b33', accent: '#e23f4f', accentSoft: '#f8cdc9' },
    dark: { bg: '#121126', raised: '#211f3d', ink: '#f6f1df', ink2: '#b9b5d0', ink3: '#7d7a99', fill: 'rgba(246,241,223,.1)', fillStrong: 'rgba(246,241,223,.2)', line: '#f6f1df', accent: '#ffcf3f', accentSoft: '#4a431f' },
    bw: '2px', font: '"Courier New", ui-monospace, monospace',
  },
  varsity: {
    light: { bg: '#efece4', raised: '#ffffff', ink: '#101014', ink2: '#4d4d57', ink3: '#8c8c96', fill: 'rgba(16,16,20,.08)', fillStrong: 'rgba(16,16,20,.16)', line: '#101014', accent: '#1f4dff', accentSoft: '#d9e1ff' },
    dark: { bg: '#0a0a0e', raised: '#18181f', ink: '#ffffff', ink2: '#b6b6c2', ink3: '#74748a', fill: 'rgba(255,255,255,.1)', fillStrong: 'rgba(255,255,255,.2)', line: '#ffffff', accent: '#c8ff3a', accentSoft: '#33401a' },
    bw: '2.5px', font: '"Arial Narrow", "Helvetica Neue", sans-serif',
  },
};

function tokenStyle(style, theme) {
  const s = TOKENS[style], c = s[theme];
  return {
    '--bg': c.bg, '--bg-raised': c.raised, '--ink': c.ink, '--ink-2': c.ink2, '--ink-3': c.ink3,
    '--fill': c.fill, '--fill-strong': c.fillStrong, '--line': c.line,
    '--accent': c.accent, '--accent-soft': c.accentSoft, '--bw': s.bw,
    background: c.bg, color: c.ink, fontFamily: s.font,
  };
}

const HEAT = { chest: 0.9, back: 0.75, shoulders: 0.6, biceps: 0.55, triceps: 0.45, core: 0.3, quads: 0.2, hamstrings: 0.12, glutes: 0.1, calves: 0 };

const THEMES = ['ember', 'cobalt', 'pine', 'berry', 'graphite'];
const hasAppTokens = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() !== '';

const boot = window.__GB_BOOT__ || {};
const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
const initial = {
  style: boot.style || 'studio',
  theme: boot.appearance || (prefersDark ? 'dark' : 'light'),
  tokens: hasAppTokens ? 'app' : 'mock',
  gbtheme: boot.theme || THEMES[0],
  size: 196,
  only: null,
  section: 'all',
  phases: STRIP,
  playing: true,
};

const Switch = ({ value, options, onPick }) => (
  <span style={{ display: 'inline-flex', gap: '4px' }}>
    {options.map((o) => (
      <button
        type="button"
        onClick={() => onPick(o)}
        style={{
          font: 'inherit', fontSize: '13px', padding: '6px 12px', cursor: 'pointer', color: 'inherit',
          border: 'var(--bw) solid var(--line)', borderRadius: '8px',
          background: o === value ? 'var(--accent-soft)' : 'transparent',
        }}
      >{o}</button>
    ))}
  </span>
);

const card = (radius) => ({ background: 'var(--bg-raised)', border: 'var(--bw) solid var(--line)', borderRadius: radius, overflow: 'hidden' });
const heading = { fontSize: '13px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '22px 0 10px' };

function App() {
  const [state, setState] = useState(initial);
  const { style, theme, tokens, gbtheme, size, only, section, phases, playing } = state;
  const set = (patch) => setState((s) => ({ ...s, ...patch }));

  useEffect(() => { window.exdev = { freeze, set }; }, []);
  useEffect(() => {
    document.documentElement.dataset.style = style;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.gbtheme = gbtheme;
  }, [style, theme, gbtheme]);

  // Mock tokens live on the wrapper, so the wrapper is also the style scope for them.
  const scope = tokens === 'mock'
    ? { 'data-style': style, style: tokenStyle(style, theme) }
    : { style: { background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font-ui)' } };

  const list = only ? EXERCISES.filter((e) => [].concat(only).includes(e.id)) : EXERCISES;
  const show = (name) => section === 'all' || section === name;
  const corner = style === 'arcade' ? '4px' : '16px';

  return (
    <div {...scope} style={{ ...scope.style, minHeight: '100%', padding: '16px 20px 40px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '17px' }}>Exercise art</strong>
        <Switch value={style} options={['studio', 'arcade', 'varsity']} onPick={(v) => set({ style: v })} />
        <Switch value={theme} options={['light', 'dark']} onPick={(v) => set({ theme: v })} />
        {hasAppTokens && <Switch value={tokens} options={['app', 'mock']} onPick={(v) => set({ tokens: v })} />}
        {tokens === 'app' && <Switch value={gbtheme} options={THEMES} onPick={(v) => set({ gbtheme: v })} />}
        <Switch value={playing ? 'play' : 'pause'} options={['play', 'pause']} onPick={(v) => set({ playing: v === 'play' })} />
      </div>

      {show('anims') && (
        <section>
          <h2 style={heading}>Animations</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {list.map((e) => (
              <figure style={{ ...card(corner), margin: 0 }}>
                <ExerciseAnim id={e.id} size={size} playing={playing} />
                <figcaption style={{ fontSize: '13px', padding: '0 10px 10px', textAlign: 'center' }}>{e.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {section === 'strip' && (
        <section>
          <h2 style={heading}>Phases {phases.join(', ')}</h2>
          {list.map((e) => (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              {phases.map((t) => (
                <span style={card(corner)}>
                  <Stage move={MOVES[e.id]} t={t} size={size} tint={tintOf(e.primary, e.secondary)} label={e.name} />
                </span>
              ))}
            </div>
          ))}
        </section>
      )}

      {show('icons') && [44, 56].map((px) => (
        <section>
          <h2 style={heading}>Icons {px} px</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {EXERCISES.map((e) => (
              <span style={{ ...card(style === 'arcade' ? '4px' : '12px'), display: 'inline-flex', padding: '4px' }} title={e.name}>
                <ExerciseIcon id={e.id} size={px} />
              </span>
            ))}
          </div>
        </section>
      ))}

      {show('icons') && (
        <section>
          <h2 style={heading}>Icons in a list row</h2>
          <div style={{ ...card(corner), display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', padding: '4px 12px' }}>
            {EXERCISES.map((e) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
                <ExerciseIcon id={e.id} size={44} />
                <span style={{ fontSize: '15px' }}>{e.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {show('muscles') && (
        <section>
          <h2 style={heading}>Muscle figure: primary and secondary</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {['bench-press', 'back-squat', 'deadlift', 'pull-up'].map((id) => {
              const e = EXERCISES.find((x) => x.id === id);
              return (
                <figure style={{ ...card(corner), margin: 0, padding: '12px 14px 10px', textAlign: 'center' }}>
                  <MuscleFigure primary={e.primary} secondary={e.secondary} size={230} />
                  <figcaption style={{ fontSize: '13px', paddingTop: '6px' }}>{e.name}</figcaption>
                </figure>
              );
            })}
          </div>
          <h2 style={heading}>Muscle figure: heat values, single views, small</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <figure style={{ ...card(corner), margin: 0, padding: '12px 14px' }}>
              <MuscleFigure values={HEAT} size={300} />
            </figure>
            <figure style={{ ...card(corner), margin: 0, padding: '12px 14px' }}>
              <MuscleFigure values={HEAT} size={200} view="front" />
            </figure>
            <figure style={{ ...card(corner), margin: 0, padding: '12px 14px' }}>
              <MuscleFigure primary={['back']} secondary={['biceps']} size={200} view="back" />
            </figure>
            <figure style={{ ...card(corner), margin: 0, padding: '12px 14px' }}>
              <MuscleFigure values={HEAT} size={120} />
            </figure>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '12px', color: 'var(--ink-2)' }}>
              {Object.keys(HEAT).map((m) => <li>{MUSCLE_LABEL[m]} {Math.round(HEAT[m] * 100)}%</li>)}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

render(<App />, document.getElementById('app'));
