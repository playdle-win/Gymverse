// App shell: the phone stage, tab panes with their navigation stacks, the tab bar, the cover layer and overlay hosts.
// On wide windows the stage is a centred phone with the prototype controls beside it.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './icons.js';
import { nav, useNav, PageContext, TABS } from './nav.js';
import { useScreen } from './registry.js';
import { PLACEHOLDERS } from './placeholders.jsx';
import { PrototypeControls, ControlsSheet } from './prototype-controls.jsx';
import { DialogHost, ToastHost } from './overlays.jsx';
import { cx, useMediaQuery } from './util.js';

const PHONE = { w: 402, h: 874 };
const BEZEL = 11;
const DESK_MARGIN = 28;

/** One page of a stack. `phase` drives the slide: top | under | entering | covering | revealing | leaving. */
function Page({ entry, tabId, depth, phase, active }) {
  const context = { tabId, depth, active: active && (phase === 'top' || phase === 'entering' || phase === 'revealing'), cover: false, pop: nav.pop };
  const done = (e) => {
    if (e.target !== e.currentTarget) return;
    if (phase === 'entering') nav.settle(tabId, 'push');
    if (phase === 'leaving') nav.settle(tabId, 'pop');
  };
  const { Component, props } = entry;
  return (
    <div class="gb-page" data-phase={phase} inert={phase === 'under' || phase === 'covering' || phase === 'leaving'} onAnimationEnd={done}>
      <PageContext.Provider value={context}><Component {...props} /></PageContext.Provider>
    </div>
  );
}

function phaseOf(index, count, transition) {
  const top = index === count - 1;
  if (transition && transition.type === 'push') return top ? 'entering' : index === count - 2 ? 'covering' : 'under';
  if (transition && transition.type === 'pop') return top ? 'revealing' : 'under';
  return top ? 'top' : 'under';
}

/** A tab's root screen plus everything pushed on top of it. Stays mounted once visited, so scroll and state survive. */
function TabPane({ tab, active }) {
  const { stacks, transitions } = useNav();
  const Registered = useScreen(tab.id);
  const root = useRef({ key: 'root' });
  root.current.Component = Registered || PLACEHOLDERS[tab.id];
  root.current.props = {};
  const pages = [root.current, ...stacks[tab.id]];
  const transition = transitions[tab.id];
  return (
    <div class="gb-tabpane" data-active={active ? 'true' : 'false'} inert={!active} role="tabpanel" aria-label={tab.label}>
      {pages.map((entry, i) => <Page key={entry.key} entry={entry} tabId={tab.id} depth={i} phase={phaseOf(i, pages.length, transition)} active={active} />)}
      {transition && transition.leaving && <Page key={transition.leaving.key} entry={transition.leaving} tabId={tab.id} depth={pages.length} phase="leaving" active={false} />}
    </div>
  );
}

function Cover() {
  const { cover, coverLeaving } = useNav();
  if (!cover) return null;
  const { Component, props } = cover;
  const context = { tabId: null, depth: 0, active: true, cover: true, pop: nav.dismiss };
  const done = (e) => { if (e.target === e.currentTarget && coverLeaving) nav.finishDismiss(); };
  return (
    <div class="gb-cover" data-leaving={coverLeaving ? 'true' : 'false'} onAnimationEnd={done}>
      <PageContext.Provider value={context}><Component {...props} /></PageContext.Provider>
    </div>
  );
}

/** Tab bar: five tabs, labels always visible, filled icon for the active tab. */
export function TabBar() {
  const { tab, tabBarHidden, cover } = useNav();
  const onClick = (e, id) => { e.preventDefault(); nav.select(id); };
  return (
    <nav class={cx('gb-tabbar', (tabBarHidden || cover) && 'is-hidden')} aria-label="Sections" inert={tabBarHidden || !!cover}>
      <div class="gb-tabbar__bar">
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <a key={t.id} href={'#' + t.id} class="gb-tab" aria-current={on ? 'page' : undefined} onClick={(e) => onClick(e, t.id)} draggable={false}>
              <span class="gb-tab__icon"><Icon name={t.icon} size={24} weight={on ? 'fill' : 'regular'} /></span>
              <span class="gb-tab__label">{t.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function useStageScale(framed) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    if (!framed) { setScale(1); return undefined; }
    const update = () => setScale(Math.min(1, (window.innerHeight - DESK_MARGIN * 2) / (PHONE.h + BEZEL * 2)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [framed]);
  return scale;
}

/** The whole app frame. Renders the five tabs from the registry (or their placeholders). */
export function AppShell() {
  const { tab } = useNav();
  const framed = useMediaQuery('(min-width: 700px)');
  const scale = useStageScale(framed);
  const [visited, setVisited] = useState(() => new Set([tab]));
  useEffect(() => { if (!visited.has(tab)) setVisited(new Set(visited).add(tab)); }, [tab]);
  // the framed stage has its own safe areas (a home indicator), set where the tokens resolve
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('gb-framed', framed);
    return () => document.documentElement.classList.remove('gb-framed');
  }, [framed]);

  const outer = (PHONE.w + BEZEL * 2) * scale, outerH = (PHONE.h + BEZEL * 2) * scale;
  const deviceStyle = framed ? { width: outer + 'px', height: outerH + 'px' } : undefined;
  const bezelStyle = framed ? { width: PHONE.w + BEZEL * 2 + 'px', height: PHONE.h + BEZEL * 2 + 'px', transform: `scale(${scale})` } : undefined;
  return (
    <div class={cx('gb-frame', framed && 'gb-frame--desk')}>
      <div class="gb-device" style={deviceStyle}>
        <div class="gb-bezel" style={bezelStyle}>
          <div id="gb-stage" class="gb-stage">
            <main class="gb-panes">
              {TABS.filter((t) => visited.has(t.id) || t.id === tab).map((t) => <TabPane key={t.id} tab={t} active={t.id === tab} />)}
            </main>
            <TabBar />
            <Cover />
            <div id="gb-overlays" class="gb-overlays" />
            {framed && <span class="gb-homebar" aria-hidden="true" />}
          </div>
        </div>
      </div>
      {framed && (
        <aside class="gb-panel gb-scroll" aria-label="Prototype controls">
          <h1 class="gb-panel__title t-title">Prototype controls</h1>
          <p class="gb-panel__lede">Everything in the phone restyles live.</p>
          <PrototypeControls />
        </aside>
      )}
      <ControlsSheet />
      <DialogHost />
      <ToastHost />
    </div>
  );
}
