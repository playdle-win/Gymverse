// Thin Preact wrapper around the gym engine. All behaviour lives in engine.js; this only owns the canvas
// element, keeps the engine's props in sync, and exposes the imperative build-mode commands through `ref`.
import { useRef, useEffect, useLayoutEffect, useImperativeHandle } from 'preact/hooks';
import { forwardRef } from 'preact/compat';
import { createGymEngine } from './engine.js';

const COMMANDS = ['beginPlacement', 'commitPlacement', 'cancel', 'rotate', 'nudge', 'store', 'refit', 'select', 'sendAvatarTo'];

export const GymCanvas = forwardRef(function GymCanvas(props, ref) {
  // `style` here is the art direction (studio | arcade | varsity), not CSS.
  const { class: className, label = 'Your gym', ...engineProps } = props;
  const canvas = useRef(null), engine = useRef(null), latest = useRef(engineProps);
  latest.current = engineProps;

  useLayoutEffect(() => {
    // Callbacks are read through `latest` so the host can pass fresh closures every render.
    const live = {};
    for (const name of ['canPlace', 'onSelect', 'onMove', 'onPlace', 'onStore', 'onPlacementChange', 'onTap']) {
      live[name] = (...args) => (latest.current[name] ? latest.current[name](...args) : name === 'canPlace' ? true : undefined);
    }
    const e = createGymEngine(canvas.current, { ...latest.current, ...live });
    engine.current = e;
    const ro = new ResizeObserver(() => e.resize());
    ro.observe(canvas.current);
    return () => { ro.disconnect(); e.destroy(); engine.current = null; };
  }, []);

  const { room, avatar, guests, style, palette, dust, training, mode, insets, reducedMotion } = engineProps;
  useEffect(() => {
    if (engine.current) engine.current.update({ room, avatar, guests, style, palette, dust, training, mode, insets, reducedMotion });
  }, [room, avatar, guests, style, palette, dust, training, mode, insets && insets.top, insets && insets.right, insets && insets.bottom, insets && insets.left, reducedMotion]);

  useImperativeHandle(ref, () => Object.fromEntries(COMMANDS.map((name) => [name, (...args) => engine.current && engine.current[name](...args)])), []);

  return <canvas ref={canvas} class={className} role="img" aria-label={label} style="display:block;width:100%;height:100%;touch-action:none" />;
});
