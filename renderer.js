// ============================================================================
// FILE: renderer.js — UNCOVERED TARGET PAPILLA & TRUE SALINE DISTENSION
// ============================================================================
const _origGetLiveAnatomy = window.getLiveAnatomy;
if (typeof _origGetLiveAnatomy === 'function') {
  window.getLiveAnatomy = function () {
    const live = _origGetLiveAnatomy();
    // Case 10: Hypermobile kidney tents away if Saline Distend (hydro) is OFF
    if (state.caseIdx === 9 && state.depthMm > 45 && !state.hydro) {
      const ng = getNeedle3D();
      const extraPush = Math.min(7.5, (state.depthMm - 45) * 0.35);
      const sx = ng.dir.x * extraPush, sy = ng.dir.y * extraPush;
      live.pelvis.x += sx; live.pelvis.y += sy;
      Object.keys(live.calyces).forEach(k => { live.calyces[k].x += sx; live.calyces[k].y += sy; });
      live.targetCalyx = live.calyces[state.targetKey];
    }
    return live;
  };
}

function resizeAll() {
  [fluoroCanvas, skinCanvas, benchCanvas].forEach(c => {
    const r = c.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(r.width * dpr), h = Math.floor(r.height * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; state.lihDirty = true; }
  });
  if (lihCanvas.width !== fluoroCanvas.width || lihCanvas.height !== fluoroCanvas.height) {
    lihCanvas.width = fluoroCanvas.width; lihCanvas.height = fluoroCanvas.height; state.lihDirty = true;
  }
}

let lastT = performance.now();
function loop(now) {
  const dt = (now - lastT) / 1000;
  lastT = now;

  if (state.autoPlaying) tickAutoSolve(dt);
  if (state.respMode === 'tidal') {
    state.tidalPhase += dt * 1.8;
    if (state.contFluoro || state.pedalDown) state.lihDirty = true;
  }

  const liveFluoro = state.contFluoro || state.pedalDown || state.autoPlaying;
  resizeAll();

  if (liveFluoro || state.lihDirty) {
    drawFluoroBuffer(lihCtx, lihCanvas.width, lihCanvas.height);
    state.lihDirty = false;
  }

  fCtx.clearRect(0, 0, fluoroCanvas.width, fluoroCanvas.height);
  fCtx.drawImage(lihCanvas, 0, 0);
  drawFluoroHUD(fCtx, fluoroCanvas.width, fluoroCanvas.height, liveFluoro);
  drawSkinSurface(sCtx, skinCanvas.width, skinCanvas.height);

  if (state.workbench === 'anatomy') drawAnatomyBench(bCtx, benchCanvas.width, benchCanvas.height);
  else if (state.workbench === 'compare') drawTechniqueCompareBench(bCtx, benchCanvas.width, benchCanvas.height);
  else drawUltrasoundBench(bCtx, benchCanvas.width, benchCanvas.height);

  requestAnimationFrame(loop);
}

// ----------------------------------------------------------------------------
// 1. C-ARM FLUOROSCOPY (UNCOVERED TARGET PAPILLA + COLONIC GAS)
// ----------------------------------------------------------------------------
function drawFluoroBuffer(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h * 0.48, rad = Math.min(w, h) * 0.44, scale = rad / 74;

  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = '#cfd6e0';
  ctx.fill();
  ctx.clip();

  const vig = ctx.createRadialGradient(cx, cy, rad * 0.35, cx, cy, rad);
  vig.addColorStop(0, 'rgba(235, 240, 246, 0.25)');
  vig.addColorStop(1, 'rgba(62, 73, 90, 0.74)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const c = getLiveAnatomy();
  const d = computeDiagnostics();
  const iso = { x: 74, y: 4, z: c.targetCalyx.z };
  const proj = pt => {
    const p = project3D(pt, iso);
    return { x: cx + p.u * scale, y: cy - p.v * scale };
  };

  // Spine Vertebral Bodies
  for (let vy = -44; vy <= 44; vy += 28) {
    const vc = proj({ x: 10, y: vy, z: 75 });
    ctx.fillStyle = 'rgba(92, 105, 122, 0.42)';
    ctx.fillRect(vc.x - 16 * scale, vc.y - 10 * scale, 30 * scale, 20 * scale);
    const tp = proj({ x: 34, y: vy, z: 70 });
    ctx.fillRect(vc.x + 14 * scale, tp.y - 3.5 * scale, 16 * scale, 7 * scale);
  }

  // Radiolucent Colonic Gas Bubbles (Haustra)
  const isRetroColon = c.stoneType === 'retrorenal_colon';
  const colX = isRetroColon ? 104 : 132;
  const colZ = isRetroColon ? 38 : 58;
  const haustra = [
    { dy: -38, rx: 11, ry: 8 },
    { dy: -24, rx: 13, ry: 9 },
    { dy: -9,  rx: 12, ry: 8.5 },
    { dy: 6,   rx: 11, ry: 8 },
    { dy: 20,  rx: 10, ry: 7 }
  ];
  ctx.save();
  haustra.forEach(hb => {
    const pc = proj({ x: colX + Math.sin(hb.dy) * 2, y: hb.dy, z: colZ });
    ctx.beginPath();
    ctx.ellipse(pc.x, pc.y, hb.rx * scale, hb.ry * scale, -0.1, 0, Math.PI * 2);
    ctx.fillStyle = isRetroColon ? 'rgba(248, 250, 252, 0.46)' : 'rgba(241, 245, 249, 0.30)';
    ctx.fill();
    ctx.lineWidth = 1.2 * scale;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.38)';
    ctx.stroke();
  });
  if (isRetroColon) {
    const pLbl = proj({ x: colX, y: -48, z: colZ });
    ctx.fillStyle = 'rgba(71, 85, 105, 0.75)';
    ctx.font = `bold ${Math.max(9, Math.round(scale * 3.1))}px sans-serif`;
    ctx.fillText('Colon Gas', pLbl.x - 16 * scale, pLbl.y);
  }
  ctx.restore();

  // Case 6: Horseshoe Kidney Midline Isthmus
  if (c.stoneType === 'horseshoe') {
    const isth1 = proj({ x: 12, y: -24, z: 82 });
    const isth2 = proj({ x: 66, y: -18, z: 76 });
    ctx.beginPath(); ctx.moveTo(isth1.x, isth1.y); ctx.lineTo(isth2.x, isth2.y);
    ctx.lineWidth = 22 * scale; ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)'; ctx.lineCap = 'round'; ctx.stroke();
  }

  const drawRib = (ry, lbl) => {
    const r1 = proj({ x: 26, y: ry + 14, z: 18 });
    const r2 = proj({ x: 74, y: ry + 4, z: 18 });
    const r3 = proj({ x: 118, y: ry - 5, z: 22 });
    ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.quadraticCurveTo(r2.x, r2.y, r3.x, r3.y);
    ctx.lineWidth = 8.5 * scale; ctx.strokeStyle = 'rgba(82, 94, 110, 0.54)'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.font = `bold ${Math.max(10, Math.round(scale * 3.8))}px sans-serif`;
    ctx.fillText(lbl, r3.x - 16 * scale, r3.y - 6 * scale);
  };
  drawRib(c.rib12Y, '12th Rib');
  drawRib(c.rib12Y + 28, '11th Rib');

  const u1 = proj({ x: c.pelvis.x - 12, y: -72, z: c.pelvis.z });
  const u2 = proj(c.pelvis);
  ctx.beginPath(); ctx.moveTo(u1.x, u1.y);
  ctx.quadraticCurveTo(u1.x + (c.stoneType === 'horseshoe' ? 18 : 7) * scale, (u1.y + u2.y) / 2, u2.x, u2.y);
  ctx.lineWidth = 2.2 * scale; ctx.strokeStyle = '#1e293b'; ctx.stroke();

  const pPel = proj(c.pelvis);
  const drawCalyx = (cal, isPost, isSelectedTarget) => {
    const pCal = proj(cal);
    const nw = ((cal.neckW || 8) + (state.hydro ? 1.0 : 0)) * scale;
    const cr = (cal.cupR || 7.5) * scale;

    if (cal.isDiverticulum && !state.hydro) return;

    ctx.beginPath();
    if (c.stoneType === 'bifid' && cal.y < 0) {
      const pLowJunction = proj({ x: c.pelvis.x - 4, y: -18, z: c.pelvis.z });
      ctx.moveTo(pLowJunction.x, pLowJunction.y);
    } else {
      ctx.moveTo(pPel.x, pPel.y);
    }
    ctx.lineTo(pCal.x, pCal.y);
    ctx.lineWidth = nw;
    ctx.strokeStyle = isPost ? 'rgba(24, 34, 50, 0.82)' : 'rgba(55, 68, 86, 0.52)';
    ctx.lineCap = 'round';
    ctx.stroke();

    const ang = Math.atan2(pCal.y - pPel.y, pCal.x - pPel.x);
    ctx.save();
    ctx.translate(pCal.x, pCal.y);
    ctx.rotate(ang);
    const dimple = isSelectedTarget ? d.dimpleFactor : 0;
    ctx.scale(1 - dimple * 0.25, 1 + dimple * 0.14);

    // Calyceal Cup & Papillary Fornix (Now 100% uncovered on the Target Calyx too!)
    ctx.beginPath();
    ctx.arc(0, 0, cr, -Math.PI * 0.78, Math.PI * 0.78);
    ctx.lineWidth = cr * 0.82;
    ctx.strokeStyle = isPost ? 'rgba(18, 26, 40, 0.90)' : 'rgba(51, 65, 85, 0.55)';
    ctx.stroke();

    if (isSelectedTarget) {
      ctx.beginPath();
      ctx.arc(0, 0, cr + 2.2 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();

    if (state.airBolus && isPost) {
      ctx.beginPath();
      ctx.arc(pCal.x, pCal.y, cr * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.90)';
      ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#334155'; ctx.stroke();
    }
  };

  ctx.beginPath();
  ctx.arc(pPel.x, pPel.y, ((c.stoneType === 'bifid' ? 8.5 : 11.5) + (state.hydro ? 1.5 : 0)) * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(22, 32, 48, 0.86)';
  ctx.fill();

  drawCalyx(c.antCalyx, false, false);
  for (const k of Object.keys(c.calyces)) {
    drawCalyx(c.calyces[k], true, k === state.targetKey);
  }

  // Draw Calculi: Keep stones in the renal pelvis / proximal infundibulum so they NEVER blot out the target papilla!
  const drawStone = (pt, r) => {
    const s = proj(pt);
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, r * scale, r * 0.82 * scale, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 14, 22, 0.94)';
    ctx.fill();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.stroke();
  };

  if (c.stoneType === 'staghorn' || c.stoneType === 'upper_staghorn') {
    const keys = c.stoneType === 'staghorn' ? ['lower_lat', 'middle', 'upper'] : ['upper', 'middle'];
    keys.forEach(k => {
      if (!c.calyces[k]) return;
      const cal = c.calyces[k];
      // Stop staghorn branch 45% along the infundibulum so the papillary cup & fornix remain visible!
      const branchEnd = {
        x: c.pelvis.x + (cal.x - c.pelvis.x) * 0.58,
        y: c.pelvis.y + (cal.y - c.pelvis.y) * 0.58,
        z: c.pelvis.z + (cal.z - c.pelvis.z) * 0.58
      };
      const pBEnd = proj(branchEnd);
      ctx.beginPath(); ctx.moveTo(pPel.x, pPel.y); ctx.lineTo(pBEnd.x, pBEnd.y);
      ctx.lineWidth = 6.2 * scale; ctx.strokeStyle = 'rgba(10, 15, 24, 0.94)'; ctx.lineCap = 'round'; ctx.stroke();
    });
    drawStone(c.pelvis, 8.8);
  } else if (c.stoneType === 'diverticulum') {
    // Only in Case 7 (Stone-guided diverticulum) is the stone sitting directly inside the unopacified diverticular cup
    drawStone(c.calyces.middle, 4.2);
  } else {
    drawStone(c.pelvis, 8.0);
  }

  state.blushClouds.forEach(bl => {
    const pb = proj(bl);
    const g = ctx.createRadialGradient(pb.x, pb.y, 2, pb.x, pb.y, bl.r * scale);
    g.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
    g.addColorStop(0.6, 'rgba(30, 41, 59, 0.65)');
    g.addColorStop(1, 'rgba(30, 41, 59, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(pb.x, pb.y, bl.r * scale, 0, Math.PI * 2); ctx.fill();
  });

  const ng = getNeedle3D();
  const pTip = proj(ng.tip), pHub = proj(ng.hub);

  ctx.beginPath(); ctx.moveTo(pHub.x, pHub.y); ctx.lineTo(pTip.x, pTip.y);
  ctx.lineWidth = 2.3 * scale; ctx.strokeStyle = '#090d14'; ctx.stroke();

  ctx.beginPath(); ctx.arc(pHub.x, pHub.y, 5.5 * scale, 0, Math.PI * 2);
  ctx.lineWidth = 2.2 * scale; ctx.strokeStyle = '#0f172a'; ctx.stroke();

  ctx.restore();
}

function drawFluoroHUD(ctx, w, h, isLive) {
  ctx.save();
  if (!isLive) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.fillRect(12, 12, 230, 24);
    ctx.strokeRect(12, 12, 230, 24);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10.5px monospace';
    ctx.fillText('⏸ LAST IMAGE HOLD (PRESS SPACE)', 20, 28);
  } else {
    ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
    ctx.fillRect(12, 12, 135, 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10.5px monospace';
    ctx.fillText('☢ LIVE X-RAY ON', 20, 27);
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 2. PRONE FLANK MAP
// ----------------------------------------------------------------------------
function drawSkinSurface(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1b1817'; ctx.fillRect(0, 0, w, h);

  const scale = w / 180, ox = 20 * scale, oy = h * 0.52;
  const toSkin = (x, y) => ({ x: ox + x * scale, y: oy - y * scale });
  const c = getLiveAnatomy(), ng = getNeedle3D(), dyResp = getRespShift();

  const pPara = toSkin(55, 0);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)'; ctx.fillRect(0, 0, pPara.x, h);
  ctx.beginPath(); ctx.moveTo(pPara.x, 0); ctx.lineTo(pPara.x, h); ctx.strokeStyle = '#f59e0b'; ctx.stroke();

  const colonX = c.stoneType === 'retrorenal_colon' ? 104 : 128;
  const pPAL = toSkin(colonX, 0);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)'; ctx.fillRect(pPAL.x, 0, w - pPAL.x, h);
  ctx.beginPath(); ctx.moveTo(pPAL.x, 0); ctx.lineTo(pPAL.x, h); ctx.strokeStyle = '#ef4444'; ctx.stroke();
  if (c.stoneType === 'retrorenal_colon') {
    ctx.fillStyle = '#f87171'; ctx.font = 'bold 9.5px sans-serif';
    ctx.fillText('RETRORENAL COLON!', pPAL.x + 4, 14);
  }

  const drawSkinRib = (ry, label) => {
    const r1 = toSkin(35, ry + 12), r2 = toSkin(118, ry - 5);
    ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y);
    ctx.lineWidth = 6.5 * scale; ctx.strokeStyle = 'rgba(148, 163, 184, 0.30)'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(203, 213, 225, 0.55)'; ctx.font = `${Math.max(8.5, Math.round(scale * 3.0))}px sans-serif`;
    ctx.fillText(label, r1.x + 2 * scale, r1.y - 5 * scale);
  };
  drawSkinRib(c.rib12Y, '12th Rib');
  drawSkinRib(c.rib12Y + 28, '11th Rib');

  ctx.font = `${Math.max(9.5, Math.round(scale * 3.4))}px sans-serif`;
  const rawCalyces = CASES[state.caseIdx].calyces;
  for (const k of Object.keys(rawCalyces)) {
    const cal = rawCalyces[k];
    const pC = toSkin(cal.x, cal.y + dyResp);
    const isSel = k === state.targetKey;
    ctx.beginPath(); ctx.arc(pC.x, pC.y, (isSel ? 5.2 : 3.6) * scale, 0, Math.PI * 2);
    ctx.fillStyle = isSel ? '#38bdf8' : '#64748b'; ctx.fill();
    if (isSel) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('Point A (' + cal.label.split(' ')[0] + ')', pC.x - 24 * scale, pC.y - 7 * scale);
    }
  }

  const radInf = getTargetCalyxBase().coronalDeg * Math.PI / 180;
  const pIn = toSkin(ng.pointA.x - 24 * Math.cos(radInf), ng.pointA.y + 24 * Math.sin(radInf));
  const pOut = toSkin(ng.pointA.x + 68 * Math.cos(radInf), ng.pointA.y - 68 * Math.sin(radInf));
  ctx.beginPath(); ctx.moveTo(pIn.x, pIn.y); ctx.lineTo(pOut.x, pOut.y);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)'; ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);

  const pB = toSkin(ng.skinEntry.x, ng.skinEntry.y);
  const pTip = toSkin(ng.tip.x, ng.tip.y);
  ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(pTip.x, pTip.y);
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.6; ctx.stroke();

  ctx.beginPath(); ctx.arc(pB.x, pB.y, 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = '#fde047';
  ctx.fillText(`Point B (L=${state.latCm.toFixed(1)}, CC=${state.ccCm >= 0 ? '+' : ''}${state.ccCm.toFixed(1)}cm)`, pB.x + 8 * scale, Math.max(12, pB.y + 4));

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3A. WORKBENCH TAB 1: CLEAN SPLIT AXIAL CT (63%) & CORONAL DOG-LEG (37%)
// ----------------------------------------------------------------------------
function drawAnatomyBench(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#060a10';
  ctx.fillRect(0, 0, w, h);

  const c = getLiveAnatomy(), ng = getNeedle3D(), d = computeDiagnostics();
  const splitX = Math.floor(w * 0.63);

  const maxZ = Math.max(115, c.pelvis.z + 25);
  const scaleX = (splitX - 24) / 148;
  const scaleZ = (h - 28) / maxZ;
  const scale = Math.min(scaleX, scaleZ);
  const ox = 16, oy = 18;
  const toAx = (x, z) => ({ x: ox + x * scale, y: oy + z * scale });

  const pS1 = toAx(0, 0), pS2 = toAx(142, 26);
  ctx.fillStyle = 'rgba(234, 179, 8, 0.09)';
  ctx.fillRect(pS1.x, pS1.y, pS2.x - pS1.x, pS2.y - pS1.y);
  ctx.beginPath(); ctx.moveTo(pS1.x, pS1.y); ctx.lineTo(pS2.x, pS1.y);
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();

  ctx.beginPath(); ctx.moveTo(pS1.x, pS2.y); ctx.lineTo(pS2.x, pS2.y);
  ctx.strokeStyle = '#38bdf8'; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

  ctx.fillStyle = '#94a3b8'; ctx.font = `${Math.max(8.5, Math.round(scale * 3.1))}px sans-serif`;
  ctx.fillText('Posterior Skin (0mm)', pS1.x + 4, pS1.y + 11);
  ctx.fillText('Lumbodorsal Fascia (26mm)', pS1.x + 4, pS2.y - 4);

  const pVert = toAx(18, 65), pErec = toAx(34, 38);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.beginPath(); ctx.arc(pVert.x, pVert.y, 14 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(185, 28, 28, 0.22)';
  ctx.beginPath(); ctx.ellipse(pErec.x, pErec.y, 16 * scale, 11 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#64748b'; ctx.fillText('Spine/Psoas', pVert.x - 12 * scale, pVert.y + 4);

  const isRetro = c.stoneType === 'retrorenal_colon';
  const pCol = toAx(isRetro ? 105 : 132, isRetro ? 38 : 56);
  ctx.beginPath(); ctx.arc(pCol.x, pCol.y, 12.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.28)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#ef4444'; ctx.stroke();
  ctx.fillStyle = '#fca5a5';
  ctx.font = `bold ${Math.max(8.5, Math.round(scale * 3.0))}px sans-serif`;
  ctx.fillText(isRetro ? 'RETRORENAL COLON' : 'Colon', pCol.x - (isRetro ? 28 : 12) * scale, pCol.y - 14 * scale);

  const pKid = toAx(76, c.pelvis.z - 4);
  ctx.save();
  ctx.translate(pKid.x, pKid.y);
  ctx.rotate((c.stoneType === 'horseshoe' ? -14 : -28) * Math.PI / 180);
  ctx.beginPath(); ctx.ellipse(0, 0, 31 * scale, 21 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(153, 27, 27, 0.42)'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#f87171'; ctx.stroke();
  ctx.restore();

  const pPel = toAx(c.pelvis.x, c.pelvis.z);
  const pPost = toAx(c.targetCalyx.x, c.targetCalyx.z);
  const pAnt = toAx(c.antCalyx.x, c.antCalyx.z);

  ctx.beginPath();
  ctx.moveTo(pPel.x, pPel.y);
  ctx.lineTo(pPost.x + (pPost.x - pPel.x) * 2.2, pPost.y + (pPost.y - pPel.y) * 2.2);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(pPel.x, pPel.y); ctx.lineTo(pPost.x, pPost.y);
  ctx.moveTo(pPel.x, pPel.y); ctx.lineTo(pAnt.x, pAnt.y);
  ctx.lineWidth = Math.max(3, c.targetCalyx.neckW * 0.75 * scale);
  ctx.strokeStyle = '#0284c7'; ctx.lineCap = 'round'; ctx.stroke();

  ctx.beginPath(); ctx.arc(pPel.x, pPel.y, (state.hydro ? 8.5 : 7) * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#0369a1'; ctx.fill();

  ctx.beginPath(); ctx.arc(pPost.x, pPost.y, c.targetCalyx.cupR * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#0284c7'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#7dd3fc'; ctx.stroke();

  const pEntry = toAx(ng.skinEntry.x, ng.skinEntry.z);
  const pProjEnd = toAx(ng.skinEntry.x + ng.dir.x * 115, ng.skinEntry.z + ng.dir.z * 115);
  ctx.beginPath(); ctx.moveTo(pEntry.x, pEntry.y); ctx.lineTo(pProjEnd.x, pProjEnd.y);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.28)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);

  const pTip = toAx(ng.tip.x, ng.tip.z);
  ctx.beginPath(); ctx.moveTo(pEntry.x, pEntry.y); ctx.lineTo(pTip.x, pTip.y);
  ctx.lineWidth = 2.8; ctx.strokeStyle = '#facc15'; ctx.stroke();

  ctx.beginPath(); ctx.arc(pEntry.x, pEntry.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b'; ctx.fill();

  ctx.fillStyle = '#09101b';
  ctx.fillRect(splitX, 0, w - splitX, h);
  ctx.beginPath(); ctx.moveTo(splitX, 0); ctx.lineTo(splitX, h);
  ctx.strokeStyle = '#1e2d42'; ctx.lineWidth = 1.5; ctx.stroke();

  const rcx = splitX + (w - splitX) * 0.45;
  const rcy = h * 0.54;
  const rScale = Math.min((w - splitX) / 95, h / 110);

  ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 10.5px sans-serif';
  ctx.fillText('CORONAL DOG-LEG ANGLE', splitX + 10, 18);
  ctx.fillStyle = '#94a3b8'; ctx.font = '9.5px sans-serif';
  ctx.fillText('Infundibulum vs. Needle Axis', splitX + 10, 31);

  const infRad = c.targetCalyx.coronalDeg * Math.PI / 180;
  const needRad = ng.effCor * Math.PI / 180;

  ctx.beginPath();
  ctx.moveTo(rcx - Math.cos(infRad) * 28 * rScale, rcy - Math.sin(infRad) * 28 * rScale);
  ctx.lineTo(rcx + Math.cos(infRad) * 28 * rScale, rcy + Math.sin(infRad) * 28 * rScale);
  ctx.lineWidth = 8 * rScale; ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)'; ctx.lineCap = 'round'; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rcx + Math.cos(needRad) * 34 * rScale, rcy + Math.sin(needRad) * 34 * rScale);
  ctx.lineTo(rcx, rcy);
  ctx.lineWidth = 2.6; ctx.strokeStyle = '#facc15'; ctx.stroke();

  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 11px monospace';
  ctx.fillText(`3D Kink: ${d.dogLegDeg.toFixed(1)}°`, splitX + 10, h - 24);
  ctx.fillStyle = '#94a3b8'; ctx.font = '9.5px monospace';
  ctx.fillText(`Calyx: ${c.targetCalyx.coronalDeg}° | Aim: ${state.corDeg.toFixed(1)}°`, splitX + 10, h - 10);

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3B. WORKBENCH TAB 2: TECHNIQUE IMPACT COMPARATOR
// ----------------------------------------------------------------------------
function drawTechniqueCompareBench(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070b12'; ctx.fillRect(0, 0, w, h);

  const cal = getTargetCalyxBase();
  const gHyb = computeOptimalGeometryForTechnique('hybrid');
  const gTri = computeOptimalGeometryForTechnique('triangulation');
  const gBul = computeOptimalGeometryForTechnique('bullseye');
  const dCur = computeDiagnostics();
  const curTract = Math.round(Math.hypot(state.latCm * 10, state.ccCm * 10, cal.z));

  ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 11.5px sans-serif';
  ctx.fillText(`TECHNIQUE IMPACT — TARGET: ${cal.label.toUpperCase()}`, 10, 18);

  const rows = [
    { name: "Your Current Setup", lat: `${state.latCm.toFixed(1)} cm`, cc: `${state.ccCm >= 0 ? '+' : ''}${state.ccCm.toFixed(1)} cm`, pitch: `${state.pitchDeg.toFixed(1)}°`, cor: `${state.corDeg.toFixed(1)}°`, dist: `${curTract} mm`, dog: `${dCur.dogLegDeg.toFixed(1)}°`, note: dCur.dogLegDeg <= 18 ? 'Coaxial' : 'Dog-Leg Risk!', col: '#fde047' },
    { name: "1. Hybrid (0° + 30°)", lat: `${gHyb.latCm.toFixed(1)} cm`, cc: `${gHyb.ccCm >= 0 ? '+' : ''}${gHyb.ccCm.toFixed(1)} cm`, pitch: `${gHyb.pitchDeg.toFixed(1)}°`, cor: `${gHyb.corDeg.toFixed(1)}°`, dist: `${gHyb.tractDistMm} mm`, dog: `${gHyb.dogLegDeg.toFixed(1)}°`, note: 'Best All-Around', col: '#4ade80' },
    { name: "2. Triangulation", lat: `${gTri.latCm.toFixed(1)} cm`, cc: `${gTri.ccCm >= 0 ? '+' : ''}${gTri.ccCm.toFixed(1)} cm`, pitch: `${gTri.pitchDeg.toFixed(1)}°`, cor: `${gTri.corDeg.toFixed(1)}°`, dist: `${gTri.tractDistMm} mm`, dog: `${gTri.dogLegDeg.toFixed(1)}°`, note: 'Best Under 12th Rib', col: '#38bdf8' },
    { name: "3. Pure Bull's Eye", lat: `${gBul.latCm.toFixed(1)} cm`, cc: `0.0 cm`, pitch: `${gBul.pitchDeg.toFixed(1)}°`, cor: `0.0°`, dist: `${gBul.tractDistMm} mm`, dog: `${gBul.dogLegDeg.toFixed(1)}°`, note: gBul.dogLegDeg > 20 ? 'Roof-Entry Trap!' : 'Short Tract', col: gBul.dogLegDeg > 20 ? '#f87171' : '#cbd5e1' }
  ];

  const cols = [{ lbl: "Technique", x: 10 }, { lbl: "Point B", x: w * 0.27 }, { lbl: "Pitch / Cor", x: w * 0.45 }, { lbl: "Tract", x: w * 0.60 }, { lbl: "Dog-Leg", x: w * 0.72 }, { lbl: "Effect", x: w * 0.82 }];
  ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px monospace';
  cols.forEach(c => ctx.fillText(c.lbl, c.x, 36));

  rows.forEach((r, idx) => {
    const y = 58 + idx * 24;
    ctx.fillStyle = r.col; ctx.font = 'bold 10.2px monospace';
    ctx.fillText(r.name, cols[0].x, y);
    ctx.fillText(`${r.lat}, ${r.cc}`, cols[1].x, y);
    ctx.fillText(`${r.pitch} / ${r.cor}`, cols[2].x, y);
    ctx.fillText(r.dist, cols[3].x, y);
    ctx.fillText(r.dog, cols[4].x, y);
    ctx.fillText(r.note, cols[5].x, y);
  });

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3C. WORKBENCH TAB 3: IN-PLANE B-MODE ULTRASOUND
// ----------------------------------------------------------------------------
function drawUltrasoundBench(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5, topY = 16, maxR = Math.min(w * 0.72, h * 0.88), scale = maxR / 130;
  ctx.beginPath(); ctx.moveTo(cx, topY); ctx.arc(cx, topY, maxR, Math.PI * 0.26, Math.PI * 0.74); ctx.closePath();
  ctx.fillStyle = '#161d26'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.stroke(); ctx.clip();

  const c = getLiveAnatomy(), d = computeDiagnostics();
  const calY = topY + c.targetCalyx.z * scale, pelY = topY + c.pelvis.z * scale;

  ctx.beginPath(); ctx.ellipse(cx, calY + 12 * scale, 48 * scale, 26 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#283240'; ctx.fill();

  ctx.beginPath(); ctx.ellipse(cx - 12 * scale, pelY, 24 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#94a3b8'; ctx.fill();

  ctx.beginPath(); ctx.arc(cx + 8 * scale, calY, c.targetCalyx.cupR * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#090d14'; ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 2 * scale, calY); ctx.lineTo(cx + 14 * scale, calY);
  ctx.lineTo(cx + 22 * scale, topY + maxR); ctx.lineTo(cx - 6 * scale, topY + maxR);
  ctx.closePath(); ctx.fillStyle = 'rgba(4, 6, 9, 0.75)'; ctx.fill();

  ctx.beginPath(); ctx.arc(cx + 8 * scale, calY, 5.5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc'; ctx.fill();

  const alpha = Math.max(0.18, 1 - d.coronalMismatch / 18);
  const sx = cx + 48 * scale, sy = topY + 8 * scale, ang = (90 - state.pitchDeg) * Math.PI / 180;
  const tx = sx - Math.cos(ang) * state.depthMm * scale * 0.85, ty = sy + Math.sin(ang) * state.depthMm * scale * 0.85;

  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty);
  ctx.lineWidth = 2.8; ctx.strokeStyle = `rgba(248, 250, 252, ${alpha})`; ctx.stroke();

  ctx.restore();
}

initCase(0, false);
requestAnimationFrame(loop);
// === END OF FILE renderer.js ===
