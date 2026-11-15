// Vector rasteriser (studio and varsity): paints a display list with Canvas 2D paths.
import { rgba } from './color.js';

function fillOf(ctx, f) {
  if (typeof f === 'string') return f;
  const g = f.lin ? ctx.createLinearGradient(f.lin[0], f.lin[1], f.lin[2], f.lin[3]) : ctx.createRadialGradient(f.rad[0], f.rad[1], f.rad[2], f.rad[3], f.rad[4], f.rad[5]);
  g.addColorStop(0, f.a); g.addColorStop(1, f.b);
  return g;
}

function trace(ctx, p) {
  ctx.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.closePath();
}

function blob(ctx, o, hard) {
  ctx.save();
  ctx.transform(o.m[0], o.m[1], o.m[2], o.m[3], o.m[4], o.m[5]);
  if (hard) { ctx.fillStyle = rgba(o.f, Math.min(1, o.al * 0.55)); } else {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, o.r);
    g.addColorStop(0, rgba(o.f, o.al)); g.addColorStop(0.55, rgba(o.f, o.al * 0.6)); g.addColorStop(1, rgba(o.f, 0));
    ctx.fillStyle = g;
  }
  ctx.beginPath();
  const k = hard ? 0.8 : 1;
  if (o.q) { ctx.moveTo(o.q[0][0] * k, o.q[0][1] * k); for (let i = 1; i < o.q.length; i++) ctx.lineTo(o.q[i][0] * k, o.q[i][1] * k); ctx.closePath(); } else ctx.arc(0, 0, o.r * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// st: { ink, outW, inW, seam, hardBlobs } with widths in screen units (0 disables that pass).
// S is pixels per unit, (ox, oy) the pixel position of the display list origin.
export function paintGroups(ctx, groups, S, ox, oy, st) {
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(S, S);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (st.outW) {
    ctx.beginPath();
    for (const g of groups) if (g.ink) for (const o of g.ops) if (o.t === 0 && !o.d) trace(ctx, o.p);
    ctx.strokeStyle = st.ink; ctx.lineWidth = st.outW * 2; ctx.stroke();
  }
  const seamW = 0.7 / S;
  for (const g of groups) {
    if (st.inW && g.ink === true) {
      ctx.beginPath();
      for (const o of g.ops) if (o.t === 0 && !o.d) trace(ctx, o.p);
      ctx.strokeStyle = st.ink; ctx.lineWidth = st.inW * 2; ctx.stroke();
    }
    for (const o of g.ops) {
      if (o.t === 2) { blob(ctx, o, st.hardBlobs); continue; }
      if (o.t !== 0) continue;
      const fs = fillOf(ctx, o.f);
      ctx.beginPath(); trace(ctx, o.p);
      if (o.al != null) ctx.globalAlpha = o.al;
      ctx.fillStyle = fs; ctx.fill();
      if (o.al != null) ctx.globalAlpha = 1;
      else if (st.seam || !o.h) { ctx.strokeStyle = fs; ctx.lineWidth = seamW; ctx.stroke(); }
    }
    if (st.inW && g.ink === true) {
      ctx.beginPath();
      for (const o of g.ops) if (o.t === 0 && o.h && !o.d) trace(ctx, o.p);
      ctx.strokeStyle = st.ink; ctx.lineWidth = st.inW; ctx.stroke();
    }
    for (const o of g.ops) {
      if (o.t !== 1) continue;
      ctx.beginPath(); ctx.moveTo(o.p[0], o.p[1]);
      for (let i = 2; i < o.p.length; i += 2) ctx.lineTo(o.p[i], o.p[i + 1]);
      if (o.al != null) ctx.globalAlpha = o.al;
      ctx.strokeStyle = fillOf(ctx, o.f); ctx.lineWidth = Math.max(o.w, 0.9 / S); ctx.stroke();
      if (o.al != null) ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
