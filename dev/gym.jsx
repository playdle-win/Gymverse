// Dev harness for the gym engine: the room full-viewport with a compact control strip.
// Headless use (tools/shot.mjs --eval): window.gymdev.set({ room: 'big', dust: 1, mode: 'build', training: true }),
// gymdev.place('rack-squat', 3, 2), gymdev.select(uid), gymdev.ghost('treadmill', 2, 1), gymdev.use('bench-worn'),
// gymdev.set({ view: 'thumbs' }) for the thumbnail sheet. Every call returns after the next paint.
import { render } from 'preact';
import { useState, useRef, useEffect, useMemo } from 'preact/hooks';
import {
  GymCanvas, CATALOG, itemById, SHOWROOMS, DEFAULT_PALETTES, DEFAULT_AVATAR, STYLES, canPlaceIn,
  itemThumbUrl, avatarPortraitUrl, roomThumbUrl,
} from '../src/gym/index.js';

const boot = window.__GB_BOOT__ || {};
const prefersDark = () => (boot.appearance ? boot.appearance === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);

const AVATARS = [
  DEFAULT_AVATAR,
  { skin: 's4', hair: 'hair-curls', hairColor: 'h1', beard: 'beard-none', top: 'top-tee-team', bottom: 'bottom-joggers-grey', shoes: 'shoes-hightops-red', accessory: 'acc-headband' },
  { skin: 's1', hair: 'hair-bun', hairColor: 'h3', beard: 'beard-none', top: 'top-tee-white', bottom: 'bottom-shorts-blue', shoes: 'shoes-trainers-white', accessory: 'acc-headphones' },
  { skin: 's3', hair: 'hair-crop', hairColor: 'h1', beard: 'beard-full', top: 'top-hoodie-black', bottom: 'bottom-shorts-black', shoes: 'shoes-trainers-white', accessory: 'acc-none' },
  { skin: 's5', hair: 'hair-buzz', hairColor: 'h1', beard: 'beard-stubble', top: 'top-tank-grey', bottom: 'bottom-joggers-grey', shoes: 'shoes-hightops-red', accessory: 'acc-cap' },
  { skin: 's2', hair: 'hair-crop', hairColor: 'h4', beard: 'beard-stubble', top: 'top-tee-team', bottom: 'bottom-shorts-blue', shoes: 'shoes-trainers-white', accessory: 'acc-none' },
];
const PLACEABLE = CATALOG.filter((i) => i.size);
const cloneRoom = (key) => JSON.parse(JSON.stringify((SHOWROOMS[key] || SHOWROOMS.starter).rooms[0]));
const afterPaint = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 60))));

const CSS = `
.gd { position: fixed; inset: 0; display: flex; flex-direction: column; font: 13px/1.2 system-ui, sans-serif; color: var(--gd-ink); background: var(--gd-bg); }
.gd-stage { position: absolute; inset: 0; }
.gd-bar { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; background: var(--gd-panel); border-bottom: 1px solid var(--gd-line); }
.gd-bar.bottom { margin-top: auto; border-bottom: 0; border-top: 1px solid var(--gd-line); justify-content: center; }
.gd-seg { display: inline-flex; border: 1px solid var(--gd-line); border-radius: 8px; overflow: hidden; }
.gd-seg button { border: 0; border-radius: 0; }
.gd button, .gd select { font: inherit; color: inherit; background: transparent; border: 1px solid var(--gd-line); border-radius: 8px; padding: 0 10px; min-height: 32px; }
.gd button[aria-pressed="true"] { background: var(--gd-accent); color: var(--gd-accent-ink); border-color: var(--gd-accent); }
.gd button:disabled { opacity: 0.4; }
.gd label { display: inline-flex; align-items: center; gap: 6px; }
.gd input[type=range] { width: 84px; }
.gd-note { flex-basis: 100%; text-align: center; color: var(--gd-ink2); font-size: 12px; min-height: 15px; }
.gd-sheet { position: relative; z-index: 1; flex: 1; overflow: auto; padding: 10px; background: var(--gd-bg); }
.gd-sheet h2 { font-size: 12px; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gd-ink2); }
.gd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 6px; }
.gd-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px; border-radius: 10px; background: var(--gd-panel); font-size: 10px; text-align: center; }
.gd-cell img { width: 64px; height: 64px; }
.gd-rooms img { width: 170px; height: 128px; border-radius: 10px; background: var(--gd-panel); }
`;

function App() {
  const [s, setS] = useState({
    style: STYLES.includes(boot.style) ? boot.style : 'studio', dark: prefersDark(), room: 'starter', dust: 0, training: false,
    mode: 'view', guests: 0, avatar: 0, view: 'room', nonce: 0,
  });
  const [room, setRoom] = useState(() => cloneRoom('starter'));
  const [selected, setSelected] = useState(null);
  const [placing, setPlacing] = useState(null);
  const [pickId, setPickId] = useState('rack-squat');
  const gym = useRef(null), live = useRef({ room, placing });
  live.current = { room, placing };
  const palette = s.dark ? DEFAULT_PALETTES.dark : DEFAULT_PALETTES.light;
  const guests = useMemo(() => AVATARS.slice(1, 1 + s.guests).map((avatar, i) => ({ id: 'g' + i, avatar })), [s.guests]);
  const insets = useMemo(() => ({ top: 98, bottom: s.mode === 'build' ? 76 : 12, left: 0, right: 0 }), [s.mode]);
  const canPlace = (itemId, x, y, rot, ignore) => canPlaceIn(live.current.room, itemId, x, y, rot, ignore);

  useEffect(() => {
    window.gymdev = {
      async set(patch) {
        const { fresh, ...rest } = patch;
        if (rest.room) { setRoom(cloneRoom(rest.room)); setSelected(null); setPlacing(null); }
        setS((p) => ({ ...p, ...rest, nonce: p.nonce + (fresh ? 1 : 0) }));
        await afterPaint();
      },
      async place(itemId, x, y, rot = 0) {
        const uid = 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
        setRoom((r) => ({ ...r, items: [...r.items, { uid, itemId, x, y, rot }] }));
        await afterPaint();
        return uid;
      },
      async select(uid) { gym.current.select(uid); await afterPaint(); },
      async ghost(itemId, x, y, rot = 0) {
        gym.current.beginPlacement(itemId);
        await afterPaint();
        for (let i = 0; i < rot; i++) gym.current.rotate();
        const at = live.current.placing;
        if (at) gym.current.nudge(x - at.x, y - at.y);
        await afterPaint();
      },
      async use(idOrUid) {
        const it = live.current.room.items.find((i) => i.uid === idOrUid || i.itemId === idOrUid);
        return it ? gym.current.sendAvatarTo(it.uid) : false;
      },
      get room() { return live.current.room; },
      get engine() { return gym.current; },
    };
  }, []);

  const set = (patch) => setS((p) => ({ ...p, ...patch }));
  const thumbs = { style: s.style, palette, size: 64 };
  const vars = { '--gd-bg': palette.bg, '--gd-panel': s.dark ? '#22242a' : '#ffffff', '--gd-line': s.dark ? '#3a3d45' : '#d8d5cd', '--gd-ink': palette.ink, '--gd-ink2': s.dark ? '#a7a9b1' : '#62646c', '--gd-accent': palette.accent, '--gd-accent-ink': palette.accentInk };

  return (
    <div class="gd" style={vars}>
      <style>{CSS}</style>
      {s.view === 'room' && (
        <div class="gd-stage">
          <GymCanvas
            key={s.nonce} ref={gym} room={room} avatar={AVATARS[s.avatar]} guests={guests} style={s.style} palette={palette} dust={s.dust}
            training={s.training} mode={s.mode} insets={insets} canPlace={canPlace}
            onSelect={setSelected} onPlacementChange={setPlacing}
            onMove={({ uid, x, y, rot }) => setRoom((r) => ({ ...r, items: r.items.map((i) => (i.uid === uid ? { ...i, x, y, rot } : i)) }))}
            onPlace={({ itemId, x, y, rot }) => setRoom((r) => ({ ...r, items: [...r.items, { uid: 'n' + r.items.length + Date.now().toString(36), itemId, x, y, rot }] }))}
            onStore={({ uid }) => setRoom((r) => ({ ...r, items: r.items.filter((i) => i.uid !== uid) }))}
            onTap={({ uid }) => uid && gym.current.sendAvatarTo(uid)}
          />
        </div>
      )}
      <div class="gd-bar">
        <span class="gd-seg">{STYLES.map((id) => <button aria-pressed={s.style === id} onClick={() => set({ style: id })}>{id}</button>)}</span>
        <select value={s.room} onChange={(e) => window.gymdev.set({ room: e.target.value })} aria-label="Room">
          {Object.keys(SHOWROOMS).map((k) => <option value={k}>{k}</option>)}
        </select>
        <button aria-pressed={s.dark} onClick={() => set({ dark: !s.dark })}>dark</button>
        <button aria-pressed={s.view === 'thumbs'} onClick={() => set({ view: s.view === 'thumbs' ? 'room' : 'thumbs' })}>thumbs</button>
        <label>dust <input type="range" min="0" max="1" step="0.05" value={s.dust} onInput={(e) => set({ dust: +e.target.value })} /></label>
        <button aria-pressed={s.training} onClick={() => set({ training: !s.training })}>training</button>
        <button aria-pressed={s.mode === 'build'} onClick={() => set({ mode: s.mode === 'build' ? 'view' : 'build' })}>build</button>
        <button onClick={() => set({ guests: (s.guests + 1) % 4 })}>guests {s.guests}</button>
        <button onClick={() => set({ avatar: (s.avatar + 1) % AVATARS.length })}>look</button>
      </div>
      {s.view === 'thumbs' && (
        <div class="gd-sheet">
          {['equipment', 'decor', 'floor', 'wall', 'cosmetic'].map((kind) => (
            <section>
              <h2>{kind}</h2>
              <div class="gd-grid">{CATALOG.filter((i) => i.kind === kind).map((i) => <div class="gd-cell"><img src={itemThumbUrl(i.id, thumbs)} alt="" />{i.name}</div>)}</div>
            </section>
          ))}
          <h2>portraits</h2>
          <div class="gd-grid">
            {AVATARS.map((a) => <div class="gd-cell"><img src={avatarPortraitUrl(a, { ...thumbs, size: 64 })} alt="" />full</div>)}
            {AVATARS.map((a) => <div class="gd-cell"><img src={avatarPortraitUrl(a, { ...thumbs, size: 64, crop: 'head' })} alt="" />head</div>)}
          </div>
          <h2>rooms</h2>
          <div class="gd-grid gd-rooms" style="grid-template-columns: repeat(auto-fill, minmax(170px, 1fr))">
            {Object.keys(SHOWROOMS).map((k) => <img src={roomThumbUrl(SHOWROOMS[k].rooms[0], { style: s.style, palette, width: 170, height: 128, avatar: AVATARS[0] })} alt="" />)}
          </div>
        </div>
      )}
      {s.view === 'room' && s.mode === 'build' && (
        <div class="gd-bar bottom">
          <span class="gd-note">
            {placing ? `${itemById(placing.itemId).name} at ${placing.x}, ${placing.y}: ${placing.valid ? 'fits' : 'blocked'}` : selected ? 'Drag to move. Rotate or store below.' : 'Tap an item, or place a new one.'}
          </span>
          <select value={pickId} onChange={(e) => setPickId(e.target.value)} aria-label="Item to place">
            {PLACEABLE.map((i) => <option value={i.id}>{i.name}</option>)}
          </select>
          {placing && !placing.uid
            ? [<button onClick={() => gym.current.commitPlacement()} aria-pressed="true">place</button>, <button onClick={() => gym.current.cancel()}>cancel</button>]
            : <button onClick={() => gym.current.beginPlacement(pickId)}>add</button>}
          <button disabled={!selected && !placing} onClick={() => gym.current.rotate()}>rotate</button>
          <button disabled={!selected} onClick={() => gym.current.store()}>store</button>
        </div>
      )}
    </div>
  );
}

render(<App />, document.getElementById('app'));
