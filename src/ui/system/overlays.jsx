// Overlays: Sheet, Dialog (+ confirm()), Toast (+ toast()), Fab, FabMenu.
// Sheets, dialogs and toasts render into the stage's overlay layer, above the tab bar, never the browser viewport.
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './icons.js';
import { Button, IconButton } from './controls.jsx';
import { usePage } from './nav.js';
import { cx, overlayHost, stageScale, useFocusTrap, usePresence } from './util.js';

const CLOSE_DISTANCE = 110;   // px dragged down before a release closes the sheet
const GROW_DISTANCE = 50;     // px dragged up before a medium sheet snaps to large
const FLICK_VELOCITY = 0.55;  // px per ms

/** Sheet: a bottom sheet for one short task.
 *  open, onClose. title: shown in the header. trailing: header action node (for example a Done button).
 *  detents: ['medium'], ['large'], ['medium', 'large'] (default; drag the grabber to resize) or ['auto'] (fits content).
 *  Drag down to dismiss, tap the scrim, or press Escape. Focus is trapped while open. */
export function Sheet({ open, onClose, title, trailing, detents = ['medium', 'large'], label, children }) {
  const [mounted, shown] = usePresence(open);
  const [detent, setDetent] = useState(detents[0]);
  const sheet = useRef(null);
  const drag = useRef(null);
  useEffect(() => { if (open) setDetent(detents[0]); }, [open]);
  useFocusTrap(sheet, mounted && shown, onClose);
  if (!mounted) return null;

  const canGrow = detent === 'medium' && detents.includes('large');
  const onPointerDown = (e) => {
    if (e.button > 0) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* pointer already released: dragging still works while it stays on the handle */ }
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0, v: 0, h: sheet.current.offsetHeight };
    sheet.current.classList.add('is-dragging');
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = (e.clientY - d.y) / stageScale();
    d.v = (dy - d.dy) / Math.max(1, e.timeStamp - d.t);
    d.dy = dy; d.t = e.timeStamp;
    if (dy >= 0) { sheet.current.style.transform = `translateY(${dy}px)`; sheet.current.style.height = ''; }
    else if (canGrow) { sheet.current.style.transform = ''; sheet.current.style.height = d.h - dy + 'px'; }
    else sheet.current.style.transform = `translateY(${dy / 6}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const el = sheet.current;
    el.classList.remove('is-dragging');
    el.style.transform = ''; el.style.height = '';
    if (d.dy > CLOSE_DISTANCE || d.v > FLICK_VELOCITY) {
      if (detent === 'large' && detents.includes('medium') && d.dy < 320) setDetent('medium'); else onClose();
    } else if (canGrow && (d.dy < -GROW_DISTANCE || d.v < -FLICK_VELOCITY)) setDetent('large');
  };

  return createPortal(
    <div class={cx('gb-sheetlayer', shown && 'is-open')}>
      <div class="gb-scrim" onClick={onClose} />
      <div ref={sheet} class={cx('gb-sheet', `gb-sheet--${detent}`)} role="dialog" aria-modal="true" aria-label={label || title} tabIndex={-1}>
        <div class="gb-sheet__handle" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <span class="gb-sheet__grabber" aria-hidden="true" />
          <div class="gb-sheet__bar">
            <h2 class="gb-sheet__title">{title}</h2>
            <div class="gb-sheet__trailing" onPointerDown={(e) => e.stopPropagation()}>
              {trailing || <IconButton icon="x" weight="bold" label="Close" variant="quiet" size="s" onClick={onClose} />}
            </div>
          </div>
        </div>
        <div class="gb-sheet__body gb-scroll">{children}</div>
      </div>
    </div>,
    overlayHost(),
  );
}

/** Dialog: a confirmation in the middle of the stage. Prefer the confirm() helper below.
 *  destructive: the confirm button is red and Cancel takes initial focus. */
export function Dialog({ open, title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false, onConfirm, onCancel }) {
  const [mounted, shown] = usePresence(open, 260);
  const box = useRef(null);
  useFocusTrap(box, mounted && shown, onCancel);
  if (!mounted) return null;
  return createPortal(
    <div class={cx('gb-dialoglayer', shown && 'is-open')}>
      <div class="gb-scrim" onClick={onCancel} />
      <div ref={box} class="gb-dialog" role="alertdialog" aria-modal="true" aria-labelledby="gb-dialog-title" aria-describedby={message ? 'gb-dialog-msg' : undefined} tabIndex={-1}>
        <h2 id="gb-dialog-title" class="gb-dialog__title">{title}</h2>
        {message && <p id="gb-dialog-msg" class="gb-dialog__msg">{message}</p>}
        <div class="gb-dialog__actions">
          <Button variant="quiet" size="m" block onClick={onCancel} data-autofocus={destructive ? '' : undefined}>{cancelLabel}</Button>
          <Button variant={destructive ? 'destructive' : 'primary'} size="m" block onClick={onConfirm} data-autofocus={destructive ? undefined : ''}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    overlayHost(),
  );
}

// ---- confirm(): promise-based dialog, replaces window.confirm (which the sandbox forbids) ----------
let dialogRequest = null;
let notifyDialog = () => {};

/** const ok = await confirm({ title, message, confirmLabel, cancelLabel, destructive }); */
export function confirm(options) {
  return new Promise((resolve) => {
    if (dialogRequest) dialogRequest.resolve(false);
    dialogRequest = { options, resolve };
    notifyDialog();
  });
}

/** Mounted once by the shell. */
export function DialogHost() {
  const [request, setRequest] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    notifyDialog = () => { setRequest(dialogRequest); setOpen(true); };
    return () => { notifyDialog = () => {}; };
  }, []);
  const finish = (result) => {
    if (dialogRequest) { dialogRequest.resolve(result); dialogRequest = null; }
    setOpen(false);
  };
  if (!request) return null;
  return <Dialog open={open} {...request.options} onConfirm={() => finish(true)} onCancel={() => finish(false)} />;
}

// ---- toast() ---------------------------------------------------------------------------------------
let toastSeq = 0;
let notifyToast = () => {};

/** toast('Routine saved') or toast('Skipped 7 days', { icon: 'fast-forward', duration: 2600 }). One at a time. */
export function toast(message, options = {}) {
  notifyToast({ id: ++toastSeq, message, icon: options.icon, duration: options.duration || 2600 });
}

/** Mounted once by the shell. */
export function ToastHost() {
  const [current, setCurrent] = useState(null);
  const [mounted, shown] = usePresence(!!current, 240);
  const last = useRef(null);
  if (current) last.current = current;
  useEffect(() => { notifyToast = setCurrent; return () => { notifyToast = () => {}; }; }, []);
  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(() => setCurrent(null), current.duration);
    return () => clearTimeout(timer);
  }, [current]);
  const item = current || last.current;
  if (!mounted || !item) return null;
  return createPortal(
    <div class={cx('gb-toast', shown && 'is-open')} role="status" aria-live="polite">
      {item.icon && <Icon name={item.icon} size={18} weight="fill" />}
      <span>{item.message}</span>
    </div>,
    overlayHost(),
  );
}

/** Fab: one floating action above the tab bar. Place it in <Screen fab={...}>. label is required;
 *  extended shows the label next to the icon. */
export function Fab({ icon = 'plus', label, extended = false, onClick }) {
  return (
    <div class="gb-fabwrap">
      <button type="button" class={cx('gb-fab', extended && 'gb-fab--extended')} aria-label={extended ? undefined : label} onClick={onClick}>
        <Icon name={icon} size={24} weight="bold" />
        {extended && <span>{label}</span>}
      </button>
    </div>
  );
}

/** FabMenu: a floating button that expands into labelled actions. Place it in <Screen fab={...}>.
 *  actions: [{ icon, label, onClick }] listed top to bottom. label names the menu for assistive tech. */
export function FabMenu({ icon = 'plus', label, actions }) {
  const [open, setOpen] = useState(false);
  const page = usePage();
  const fab = useRef(null);
  useEffect(() => { if (!page.active) setOpen(false); }, [page.active]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); fab.current.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const run = (action) => { setOpen(false); action.onClick(); };
  return (
    <>
      <div class={cx('gb-fabscrim', open && 'is-open')} onClick={() => setOpen(false)} />
      <div class={cx('gb-fabwrap', open && 'is-open')}>
        <ul class="gb-fabmenu" aria-hidden={open ? undefined : 'true'}>
          {actions.map((action, i) => (
            <li key={action.label} style={{ '--i': actions.length - 1 - i }}>
              <button type="button" class="gb-fabaction" tabIndex={open ? 0 : -1} onClick={() => run(action)}>
                <span class="gb-fabaction__label">{action.label}</span>
                <span class="gb-fabaction__icon"><Icon name={action.icon} size={22} /></span>
              </button>
            </li>
          ))}
        </ul>
        <button ref={fab} type="button" class="gb-fab" aria-label={label} aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)}>
          <span class="gb-fab__glyph"><Icon name={open ? 'x' : icon} size={24} weight="bold" /></span>
        </button>
      </div>
    </>
  );
}
