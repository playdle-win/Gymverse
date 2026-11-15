// Screen registry. Phase-2 screen agents call registerScreen('home', HomeScreen) from src/ui/screens/index.js;
// the shell renders the registered component for a tab and falls back to a built-in placeholder.
import { useEffect, useState } from 'preact/hooks';

const screens = new Map();
const listeners = new Set();

/** tabId: 'home' | 'train' | 'gym' | 'progress' | 'exercises'. Component is the tab's root page (render a <Screen>). */
export function registerScreen(tabId, Component) {
  screens.set(tabId, Component);
  listeners.forEach((l) => l());
}

export const getScreen = (tabId) => screens.get(tabId) || null;

export function useScreen(tabId) {
  const [Component, setComponent] = useState(() => getScreen(tabId));
  useEffect(() => {
    const update = () => setComponent(() => getScreen(tabId));
    update();
    listeners.add(update);
    return () => listeners.delete(update);
  }, [tabId]);
  return Component;
}
