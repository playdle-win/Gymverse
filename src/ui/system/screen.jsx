// Screen: the page template every tab root and pushed page renders.
// NavBar: the bar on its own, for layouts that manage their own body (the workout session).
import { useEffect, useRef, useState } from 'preact/hooks';
import { IconButton } from './controls.jsx';
import { nav, usePage } from './nav.js';
import { cx } from './util.js';

/** NavBar. title: inline title (centred). leading / trailing: nodes (IconButton, PointsPill, a plain Button).
 *  solid: show the bar background (Screen turns this on once content scrolls under it). showTitle: fade the title in. */
export function NavBar({ title, leading, trailing, solid = false, showTitle = true }) {
  return (
    <header class={cx('gb-nav', solid && 'is-solid', showTitle && 'has-title')}>
      <div class="gb-nav__side gb-nav__side--leading">{leading}</div>
      <div class="gb-nav__title" aria-hidden={showTitle ? undefined : 'true'}>{title}</div>
      <div class="gb-nav__side gb-nav__side--trailing">{trailing}</div>
    </header>
  );
}

/** Screen.
 *  title: page title. large: collapsing large title (default: true for a tab root, false for a pushed page).
 *  trailing: nav bar actions. leading: replaces the automatic back button.
 *  fab: a Fab or FabMenu, kept above the tab bar. footer: a bar pinned above the tab bar (one primary action).
 *  scroll: false gives the children the whole area under a transparent nav bar (the gym canvas).
 *  padded: false removes the side gutters (children manage their own). */
export function Screen({ title, large, trailing, leading, fab, footer, scroll = true, padded = true, class: cls, children }) {
  const page = usePage();
  const isLarge = scroll && (large === undefined ? page.depth === 0 : large);
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(!isLarge);
  const scroller = useRef(null);
  const sentinel = useRef(null);
  const largeTitle = useRef(null);

  useEffect(() => {
    if (!scroll) return undefined;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === sentinel.current) setScrolled(!e.isIntersecting);
        else setCollapsed(e.intersectionRatio < 0.55);
      }
    }, { root: scroller.current, threshold: [0, 0.55, 1] });
    io.observe(sentinel.current);
    if (largeTitle.current) io.observe(largeTitle.current);
    return () => io.disconnect();
  }, [scroll, isLarge]);

  useEffect(() => nav.onReselect((tab) => {
    if (tab === page.tabId && page.active && scroller.current) scroller.current.scrollTo({ top: 0, behavior: 'smooth' });
  }), [page.tabId, page.active]);

  const back = page.depth > 0 ? <IconButton icon="caret-left" weight="bold" label="Back" variant="quiet" size="s" onClick={page.pop} /> : null;
  return (
    <section class={cx('gb-screen', !scroll && 'gb-screen--fixed', footer && 'gb-screen--footer', cls)} aria-label={title}>
      <NavBar title={title} leading={leading === undefined ? back : leading} trailing={trailing} solid={scroll && (isLarge ? collapsed : scrolled)} showTitle={!isLarge || collapsed} />
      {scroll ? (
        <div ref={scroller} class="gb-screen__body gb-scroll">
          <div ref={sentinel} class="gb-screen__sentinel" />
          {isLarge && <h1 ref={largeTitle} class="gb-screen__large t-large">{title}</h1>}
          <div class={cx('gb-screen__content', padded && 'gb-screen__content--padded')}>{children}</div>
        </div>
      ) : (
        <div class="gb-screen__body gb-screen__body--fixed">{children}</div>
      )}
      {footer && <div class="gb-screen__footer">{footer}</div>}
      {fab}
    </section>
  );
}
