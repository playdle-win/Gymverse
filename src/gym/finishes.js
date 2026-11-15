// Floor and wall finishes, keyed by catalog id. Each one paints a single tile or wall panel through a
// plane painter P (see roomlayer.js): P.fill(pts, colour, k), P.rect, P.line(pts, colour, width, k), P.dot, P.blob,
// plus P.rnd() (stable per tile) and P.style. Floor coordinates are [0,1] x [0,1] inside the tile; wall coordinates
// are u in [0,1] across the panel and h in [0, WALL_H] up the wall.
import { WALL_H } from './iso.js';

const pick = (P, list) => list[Math.floor(P.rnd() * list.length)];

function crack(P, u, v, len, c, w) {
  const pts = [[u, v]];
  let a = P.rnd() * Math.PI * 2;
  for (let i = 0; i < 5; i++) {
    a += (P.rnd() - 0.5) * 1.4;
    u = Math.min(1, Math.max(0, u + Math.cos(a) * len)); v = Math.min(1, Math.max(0, v + Math.sin(a) * len));
    pts.push([u, v]);
    if (i === 2 && P.rnd() < 0.6) P.line([[u, v], [Math.min(1, u + Math.cos(a + 1.1) * len), Math.max(0, v + Math.sin(a + 1.1) * len)]], c, w * 0.8);
  }
  P.line(pts, c, w);
}

export const FLOORS = {
  'floor-concrete': {
    edge: '#8f8d86',
    tile(P, tx, ty) {
      P.rect(0, 0, 1, 1, '#a9a79f', 1 + (P.rnd() - 0.5) * 0.06);
      if (P.rnd() < 0.55) P.blob(P.rnd(), P.rnd(), 0.18 + P.rnd() * 0.25, '#6d6a63', 0.16 + P.rnd() * 0.14);
      if (P.rnd() < 0.3) P.blob(P.rnd(), P.rnd(), 0.2 + P.rnd() * 0.2, '#c9c7be', 0.3);
      if (P.rnd() < 0.2 && P.style === 'studio') P.blob(0.3 + P.rnd() * 0.4, 0.3 + P.rnd() * 0.4, 0.12, '#4f4a43', 0.3);
      if (tx % 2 === 0) P.line([[0, 0], [0, 1]], '#85837c', 0.022);
      if (ty % 2 === 0) P.line([[0, 0], [1, 0]], '#85837c', 0.022);
      if (P.rnd() < 0.34) crack(P, P.rnd(), P.rnd(), 0.2, '#66635d', 0.016);
      if (P.style !== 'varsity') for (let i = 0; i < 4; i++) P.dot(P.rnd(), P.rnd(), P.rnd() < 0.5 ? '#8e8c85' : '#bab8b0', 0.02);
    },
  },
  'floor-rubber': {
    edge: '#25272c',
    tile(P) {
      P.rect(0, 0, 1, 1, '#3a3d45', 1 + (P.rnd() - 0.5) * 0.08);
      P.line([[0, 0], [0, 1]], '#24262b', 0.02); P.line([[0, 0], [1, 0]], '#24262b', 0.02);
      P.line([[0.03, 0.03], [0.03, 0.97]], '#4a4e58', 0.012); P.line([[0.03, 0.03], [0.97, 0.03]], '#4a4e58', 0.012);
      for (let i = 0; i < 7; i++) P.dot(0.08 + P.rnd() * 0.84, 0.08 + P.rnd() * 0.84, pick(P, ['$accent', '#7d828c', '#5b606b', '#9da2ab']), 0.022);
    },
  },
  'floor-wood': {
    edge: '#b08f60',
    tile(P, tx, ty) {
      for (let j = 0; j < 4; j++) {
        const row = ty * 4 + j, h = Math.abs(Math.sin(row * 12.9898 + 4.1)) * 43758.5453, t = h - Math.floor(h);
        P.rect(0, j / 4, 1, (j + 1) / 4, '#dcbd8f', 0.93 + t * 0.14);
        P.line([[0, j / 4], [1, j / 4]], '#b3905f', 0.012);
        if ((tx + Math.floor(t * 7)) % 3 === 0) { const u = 0.15 + ((t * 13) % 1) * 0.7; P.line([[u, j / 4], [u, (j + 1) / 4]], '#b3905f', 0.012); }
        if (P.style !== 'varsity' && P.rnd() < 0.7) { const u = P.rnd() * 0.6, v = (j + 0.3 + P.rnd() * 0.4) / 4; P.line([[u, v], [u + 0.25, v]], P.rnd() < 0.5 ? '#c9a777' : '#e8cfa6', 0.008); }
      }
    },
  },
  'floor-checker': {
    edge: '#aaa493',
    tile(P) {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) P.rect(i / 2, j / 2, (i + 1) / 2, (j + 1) / 2, (i + j) % 2 ? '#3c414d' : '#ece6d7', 1 + (P.rnd() - 0.5) * 0.04);
      for (const t of [0, 0.5]) { P.line([[t, 0], [t, 1]], '#b9b2a2', 0.012); P.line([[0, t], [1, t]], '#b9b2a2', 0.012); }
    },
  },
};

const BRICKS = ['#a5553b', '#b0624a', '#9a4c36', '#b86e52', '#a95e44'];

export const WALLS = {
  'wall-bare': {
    cap: '#e4dfd3', fixture: 'bulb',
    panel(P, i) {
      P.rect(0, 0, 1, WALL_H, '#d8d2c3', 1 + (P.rnd() - 0.5) * 0.04);
      P.blob(P.rnd(), 0.1, 0.5, '#8f8873', 0.3);
      if (P.rnd() < 0.7) P.blob(P.rnd(), 0.8 + P.rnd() * 1.4, 0.3 + P.rnd() * 0.3, '#b9ae93', 0.4);
      if (P.rnd() < 0.5) {
        const u = 0.15 + P.rnd() * 0.7, len = 0.5 + P.rnd() * 0.9;
        P.fill([[u - 0.05, WALL_H], [u + 0.06, WALL_H], [u + 0.02, WALL_H - len], [u - 0.01, WALL_H - len * 0.8]], '#b3a88c', 1, 0.55);
      }
      if (i % 4 === 2) {
        const u = 0.16 + P.rnd() * 0.3, h = 0.75 + P.rnd() * 0.9;
        const hole = [[u, h], [u + 0.14, h - 0.07], [u + 0.36, h - 0.03], [u + 0.44, h + 0.12], [u + 0.38, h + 0.36], [u + 0.2, h + 0.44], [u + 0.04, h + 0.34], [u - 0.04, h + 0.16]];
        P.fill(hole.map(([a, b]) => [a + 0.012, b - 0.02]), '#a69f8e');
        P.fill(hole, '#a9604a');
        P.line([[u - 0.02, h + 0.14], [u + 0.42, h + 0.14]], '#cbbfa9', 0.016);
        P.line([[u + 0.03, h + 0.29], [u + 0.39, h + 0.29]], '#cbbfa9', 0.016);
        P.line([[u + 0.2, h - 0.04], [u + 0.2, h + 0.14]], '#cbbfa9', 0.016);
        P.line([[u + 0.1, h + 0.14], [u + 0.1, h + 0.29]], '#cbbfa9', 0.016);
        P.line([[u + 0.3, h + 0.14], [u + 0.3, h + 0.29]], '#cbbfa9', 0.016);
        P.line([[u + 0.22, h + 0.29], [u + 0.22, h + 0.43]], '#cbbfa9', 0.016);
      }
      if (P.rnd() < 0.6) {
        let u = 0.1 + P.rnd() * 0.8, h = WALL_H - P.rnd() * 0.4;
        const pts = [[u, h]];
        for (let k = 0; k < 5; k++) { u = Math.min(0.98, Math.max(0.02, u + (P.rnd() - 0.5) * 0.24)); h -= 0.15 + P.rnd() * 0.25; pts.push([u, h]); }
        P.line(pts, '#8e8876', 0.016);
        P.line([pts[2], [Math.min(0.98, pts[2][0] + 0.16), pts[2][1] - 0.12]], '#8e8876', 0.012);
      }
      P.rect(0, 0, 1, 0.11, '#b5ae9d');
      P.line([[0, 0.11], [1, 0.11]], '#9b9483', 0.012);
    },
  },
  'wall-brick': {
    cap: '#c9b9a5', fixture: null,
    panel(P, i) {
      P.rect(0, 0, 1, WALL_H, '#bcad9a');
      const rows = 13, rh = WALL_H / rows;
      for (let r = 0; r < rows; r++) {
        const off = (r + i) % 2 ? 0 : -0.25;
        for (let b = 0; b < 3; b++) {
          const u0 = Math.max(0, off + b * 0.5 + 0.012), u1 = Math.min(1, off + (b + 1) * 0.5 - 0.012);
          if (u1 - u0 < 0.03) continue;
          P.rect(u0, r * rh + 0.016, u1, (r + 1) * rh - 0.016, pick(P, BRICKS), 0.94 + P.rnd() * 0.12);
        }
      }
      P.rect(0, 0, 1, 0.13, '#3b3d45');
      P.line([[0, 0.13], [1, 0.13]], '#565963', 0.014);
    },
  },
  'wall-paint': {
    cap: '#f5f0e6', fixture: null,
    panel(P) {
      P.rect(0, 0, 1, WALL_H, '#efe9dc');
      P.rect(0, 0, 1, 1.02, '#566270');
      P.rect(0, 1.02, 1, 1.2, '$accent');
      P.line([[0, 1.2], [1, 1.2]], '$accentPale', 0.012);
      P.rect(0, 0, 1, 0.13, '#2f3239');
      P.line([[0, 0.13], [1, 0.13]], '#454952', 0.014);
    },
  },
  'wall-panel': {
    cap: '#454953', fixture: null,
    panel(P) {
      P.rect(0, 0, 1, WALL_H, '#31343b');
      for (let s = 0; s < 4; s++) {
        P.rect(s / 4 + 0.012, 0.13, (s + 1) / 4 - 0.012, 2.12, '#3a3d46', 0.95 + P.rnd() * 0.1);
        P.rect(s / 4 + 0.012, 2.3, (s + 1) / 4 - 0.012, WALL_H - 0.04, '#3a3d46', 0.95 + P.rnd() * 0.1);
      }
      P.blob(0.5, 2.0, 0.42, '$accent', 0.16);
      P.rect(0, 2.17, 1, 2.25, '$accent', 1, null, true);
      P.rect(0, 0, 1, 0.13, '#1d1e23');
    },
  },
};

export const floorFinish = (id) => FLOORS[id] || FLOORS['floor-concrete'];
export const wallFinish = (id) => WALLS[id] || WALLS['wall-bare'];
