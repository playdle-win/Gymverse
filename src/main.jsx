// Entry: boot the store, set the root attributes before first paint, start routing, render.
// Real screens join the build by being imported here once: import './ui/screens/index.js';
// (that module calls registerScreen for each tab; until then the shell shows its placeholders).
import { render } from 'preact';
import { bootStore } from './core/index.js';
import { applyRootAttributes, nav } from './ui/system/index.js';
import { App } from './ui/app.jsx';
import './ui/screens/index.js';

const state = bootStore();
applyRootAttributes(state.settings);
nav.start();
render(<App />, document.getElementById('app'));
