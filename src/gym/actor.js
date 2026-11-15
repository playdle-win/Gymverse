// Behaviour for the people in a room: the player's avatar and guests. Pure simulation (no drawing):
// each actor walks the free tiles, idles, sits, or gets on a piece of equipment and loops its workout pose.
import { rng, rotPoint } from './iso.js';
import { POSES, POSE_STILL, skeleton, blendSkeleton, useContext, partOffsets } from './avatar.js';

const WALK_SPEED = 1.7, MOUNT_TIME = 0.45, TURN_SPEED = 9;
const angleTo = (from, to) => { let d = (to - from) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

// Walkable grid + the equipment actors can use. `layout` comes from scene.describeRoom, models from scene.modelOf.
function buildNav(room, layout, modelOf) {
  const { w, d } = room, blocked = new Uint8Array(w * d), stations = [];
  for (const e of layout.standing) {
    const tiles = [];
    for (let y = e.it.y; y < e.it.y + e.fd; y++) for (let x = e.it.x; x < e.it.x + e.fw; x++) {
      if (x >= 0 && y >= 0 && x < w && y < d) { blocked[y * w + x] = 1; tiles.push([x, y]); }
    }
    const use = e.def.use;
    if (!use || !POSES[use.pose]) continue;
    const anchors = modelOf(e.def).anchors || {}, [rx, ry] = rotPoint(use.at[0] + 0.5, use.at[1] + 0.5, e.def.size[0], e.def.size[1], e.it.rot);
    stations.push({
      uid: e.it.uid, pose: use.pose, tiles, x: e.it.x + rx, y: e.it.y + ry, yaw: ((use.face + e.it.rot) & 3) * Math.PI / 2,
      ctx: useContext(use, anchors),
      seat: use.pose === 'bench-press' ? { yaw: ((use.face + e.it.rot + 3) & 3) * Math.PI / 2, ctx: { z: anchors.z || 0 } } : null,
    });
  }
  return { w, d, blocked, stations };
}

const free = (nav, x, y) => x >= 0 && y >= 0 && x < nav.w && y < nav.d && !nav.blocked[y * nav.w + x];

function nearestFree(nav, x, y) {
  let best = null, bd = Infinity;
  for (let ty = 0; ty < nav.d; ty++) for (let tx = 0; tx < nav.w; tx++) {
    if (!free(nav, tx, ty)) continue;
    const dd = (tx + 0.5 - x) ** 2 + (ty + 0.5 - y) ** 2;
    if (dd < bd) { bd = dd; best = [tx, ty]; }
  }
  return best;
}

// Breadth-first path over free tiles; returns tile list excluding the start, or null.
function findPath(nav, from, to) {
  if (from[0] === to[0] && from[1] === to[1]) return [];
  const prev = new Int32Array(nav.w * nav.d).fill(-1), start = from[1] * nav.w + from[0], goal = to[1] * nav.w + to[0], queue = [start];
  prev[start] = start;
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    if (cur === goal) break;
    const cx = cur % nav.w, cy = (cur - cx) / nav.w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, ni = ny * nav.w + nx;
      if (free(nav, nx, ny) && prev[ni] < 0) { prev[ni] = cur; queue.push(ni); }
    }
  }
  if (prev[goal] < 0) return null;
  const path = [];
  for (let cur = goal; cur !== start; cur = prev[cur]) path.unshift([cur % nav.w, (cur - (cur % nav.w)) / nav.w]);
  return path;
}

// The free tile next to a station that is closest to where the avatar gets on.
function approachTile(nav, st) {
  let best = null, bd = Infinity;
  for (const [tx, ty] of st.tiles) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = tx + dx, y = ty + dy;
    if (!free(nav, x, y)) continue;
    const dd = (x + 0.5 - st.x) ** 2 + (y + 0.5 - st.y) ** 2;
    if (dd < bd) { bd = dd; best = [x, y]; }
  }
  return best;
}

export function createCrowd(modelOf, seed = 11) {
  const rand = rng(seed), actors = [];
  let nav = null, training = false, still = false, calm = false;

  const tileOf = (a) => [Math.floor(a.x), Math.floor(a.y)];
  const taken = (uid, self) => actors.some((o) => o !== self && o.station && o.station.uid === uid);
  const standPose = (a, id) => { a.pose = id; a.t = 0; };

  function settle(a) {
    const spot = nearestFree(nav, a.x, a.y) || [0, 0];
    a.x = spot[0] + 0.5; a.y = spot[1] + 0.5; a.station = null; a.state = 'idle'; a.path = null; a.k = 1;
    standPose(a, 'idle'); a.timer = 0.4 + rand() * 1.5;
  }

  function board(a, st, seated, instant) {
    a.station = st; a.seated = seated; a.state = instant ? 'use' : 'mount'; a.k = instant ? 1 : 0;
    a.from = { x: a.x, y: a.y, yaw: a.yaw, skel: a.skel };
    a.pose = seated ? 'sit' : st.pose; a.t = still ? POSE_STILL[a.pose] || 0 : rand() * 2;
    a.timer = seated ? 6 + rand() * 6 : 9 + rand() * 6;
    if (instant) { a.x = st.x; a.y = st.y; a.yaw = seated ? st.seat.yaw : st.yaw; }
  }

  function headFor(a, st, seated) {
    const spot = approachTile(nav, st);
    if (!spot) return false;
    const path = findPath(nav, tileOf(a), spot);
    if (!path) { a.x = spot[0] + 0.5; a.y = spot[1] + 0.5; a.path = []; } else a.path = path;
    a.goal = { st, seated }; a.state = 'walk'; standPose(a, 'walk');
    return true;
  }

  function pickStation(a) {
    const open = nav.stations.filter((s) => !taken(s.uid, a) && s !== a.last);
    const pool = open.length ? open : nav.stations.filter((s) => !taken(s.uid, a));
    return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
  }

  function think(a) {
    if (calm) { a.timer = 2; return; }
    const wantsWork = a.main ? training : rand() < 0.45;
    if (wantsWork) { const st = pickStation(a); if (st && headFor(a, st, false)) return; }
    if (!wantsWork && rand() < 0.22) {
      const seats = nav.stations.filter((s) => s.seat && !taken(s.uid, a));
      if (seats.length && headFor(a, seats[Math.floor(rand() * seats.length)], true)) return;
    }
    const [tx, ty] = tileOf(a), options = [];
    for (let y = Math.max(0, ty - 3); y <= Math.min(nav.d - 1, ty + 3); y++) for (let x = Math.max(0, tx - 3); x <= Math.min(nav.w - 1, tx + 3); x++) {
      if (free(nav, x, y) && (x !== tx || y !== ty)) options.push([x, y]);
    }
    const to = options.length ? options[Math.floor(rand() * options.length)] : null, path = to && findPath(nav, [tx, ty], to);
    if (path && path.length && path.length < 8) { a.path = path; a.goal = null; a.state = 'walk'; standPose(a, 'walk'); } else a.timer = 1 + rand() * 2;
  }

  function leave(a) {
    const spot = approachTile(nav, a.station) || nearestFree(nav, a.x, a.y) || [0, 0];
    a.last = a.station; a.state = 'dismount'; a.k = 0;
    a.from = { x: a.x, y: a.y, yaw: a.yaw, skel: a.skel };
    a.to = { x: spot[0] + 0.5, y: spot[1] + 0.5 };
    standPose(a, 'idle');
  }

  function stepActor(a, dt) {
    a.t += dt;
    a.blinkIn -= dt;
    if (a.blinkIn < -0.13) a.blinkIn = 2 + rand() * 3.5;
    a.lookIn -= dt;
    if (a.lookIn < 0) { a.lookIn = 1.5 + rand() * 4; a.lookTo = a.state === 'idle' && rand() < 0.6 ? (rand() - 0.5) * 1.3 : 0; }
    a.look += (a.lookTo - a.look) * Math.min(1, dt * 5);

    if (a.state === 'idle') {
      a.timer -= dt;
      if (a.timer <= 0) think(a);
    } else if (a.state === 'walk') {
      let budget = WALK_SPEED * dt;
      while (budget > 0 && a.path.length) {
        const tx = a.path[0][0] + 0.5, ty = a.path[0][1] + 0.5, dx = tx - a.x, dy = ty - a.y, dist = Math.hypot(dx, dy);
        if (dist > 1e-3) a.yaw += angleTo(a.yaw, Math.atan2(-dx, dy)) * Math.min(1, dt * TURN_SPEED);
        if (dist <= budget) { a.x = tx; a.y = ty; budget -= dist; a.path.shift(); } else { a.x += (dx / dist) * budget; a.y += (dy / dist) * budget; budget = 0; }
      }
      if (!a.path.length) {
        const g = a.goal;
        a.goal = null;
        if (g && nav.stations.includes(g.st) && !taken(g.st.uid, a)) board(a, g.st, g.seated, false);
        else { a.state = 'idle'; standPose(a, 'idle'); a.timer = 1.5 + rand() * 4; }
      }
    } else if (a.state === 'mount') {
      a.k = Math.min(1, a.k + dt / MOUNT_TIME);
      const e = a.k * a.k * (3 - 2 * a.k), yaw = a.seated ? a.station.seat.yaw : a.station.yaw;
      a.x = a.from.x + (a.station.x - a.from.x) * e; a.y = a.from.y + (a.station.y - a.from.y) * e; a.yaw = a.from.yaw + angleTo(a.from.yaw, yaw) * e;
      if (a.k >= 1) a.state = 'use';
    } else if (a.state === 'use') {
      a.timer -= dt;
      const stay = a.main && training && !a.seated && nav.stations.length < 2;
      if (a.timer <= 0) { if (stay) a.timer = 10; else leave(a); }
      if (a.main && a.seated && training) leave(a);
      if (a.main && !a.seated && !training && a.timer > 1.2) a.timer = 1.2;
    } else if (a.state === 'dismount') {
      a.k = Math.min(1, a.k + dt / MOUNT_TIME);
      const e = a.k * a.k * (3 - 2 * a.k);
      a.x = a.from.x + (a.to.x - a.from.x) * e; a.y = a.from.y + (a.to.y - a.from.y) * e;
      if (a.k >= 1) { a.station = null; a.state = 'idle'; a.timer = 0.5 + rand() * 1.5; }
    }
    pose(a);
  }

  // Current skeleton + the offsets of the station's moving parts.
  function pose(a) {
    const ctx = a.station ? (a.seated ? a.station.seat.ctx : a.station.ctx) : { z: 0 };
    const target = skeleton(POSES[a.pose](a.t, a.station && a.state !== 'dismount' ? ctx : { z: 0 }));
    const blending = a.state === 'mount' || a.state === 'dismount';
    a.skel = blending && a.from.skel ? blendSkeleton(a.from.skel, target, a.k * a.k * (3 - 2 * a.k)) : target;
    a.using = a.station ? a.station.uid : null;
    a.offsets = a.station && !a.seated && a.state === 'use' ? partOffsets(a.skel, a.station.ctx) : null;
  }

  return {
    actors,
    // people: [{ id, avatar, main }]; opts: { training, still (reduced motion), calm (build mode: everyone just stands) }.
    // Rebuilds navigation; actors standing in something get moved out.
    sync(room, layout, people, opts) {
      nav = buildNav(room, layout, modelOf); training = !!opts.training; still = !!opts.still; calm = !!opts.calm;
      for (let i = actors.length - 1; i >= 0; i--) if (!people.some((p) => p.id === actors[i].id)) actors.splice(i, 1);
      people.forEach((p, i) => {
        let a = actors.find((o) => o.id === p.id);
        if (!a) {
          a = { id: p.id, main: !!p.main, x: room.w * 0.62 + i * 0.9, y: room.d * 0.62 + (i % 2), yaw: i % 2 ? 4.2 : 5.3, look: 0, lookTo: 0, lookIn: 1 + rand() * 3, blinkIn: 1 + rand() * 3, t: 0, skel: null, fresh: true };
          actors.push(a);
        }
        a.avatar = p.avatar;
        if (a.station) {
          const st = nav.stations.find((o) => o.uid === a.station.uid);
          if (st && a.state === 'use' && !calm && (!a.seated || st.seat)) { a.station = st; a.x = st.x; a.y = st.y; a.yaw = a.seated ? st.seat.yaw : st.yaw; } else settle(a);
        }
        if (!a.station && (a.fresh || a.state === 'walk' || !free(nav, ...tileOf(a)))) settle(a);
        if ((a.fresh || still) && a.main && training && !calm && !a.station) { const first = pickStation(a); if (first) board(a, first, false, true); }
        if (still && a.main && !training && a.station) settle(a);
        a.fresh = false;
        pose(a);
      });
    },
    setTraining(on) { training = on; for (const a of actors) if (a.main && on && a.state === 'idle') a.timer = Math.min(a.timer, 0.3); },
    // Send an actor to a specific item now (tap-to-train).
    send(id, uid) {
      const a = actors.find((o) => o.id === id), st = nav && nav.stations.find((s) => s.uid === uid);
      if (!a || !st || taken(uid, a) || (a.station && a.station.uid === uid)) return false;
      if (a.station) settle(a);
      return headFor(a, st, false);
    },
    step(dt) { if (nav) for (const a of actors) stepActor(a, dt); },
  };
}
