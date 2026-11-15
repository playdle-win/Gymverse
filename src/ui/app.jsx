// App root: keeps the <html> attributes in step with settings and renders the shell.
import { useLayoutEffect } from 'preact/hooks';
import { useStore } from '../core/index.js';
import { AppShell, applyRootAttributes } from './system/index.js';

export function App() {
  const style = useStore((s) => s.settings.style);
  const theme = useStore((s) => s.settings.theme);
  const appearance = useStore((s) => s.settings.appearance);
  useLayoutEffect(() => applyRootAttributes({ style, theme, appearance }), [style, theme, appearance]);
  return <AppShell />;
}
