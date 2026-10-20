// ============================================================================
// FILE: renderer.js — PATHOLOGY-SPECIFIC C-ARM RENDERER & PROFESSOR PLAYBOOK UI
// ============================================================================
(function injectProfessorPlaybookUI() {
  const sidebar = document.querySelector('.sidebar');
  const coachCard = document.querySelector('.coach-card');
  if (!sidebar || !coachCard || document.getElementById('profPlaybookCard')) return;

  const pb = document.createElement('div');
  pb.id = 'profPlaybookCard';
  pb.style.cssText = 'background:#071324;border:1px solid #0284c7;border-radius:5px;padding:7px 9px;font-size:10.6px;line-height:1.35;color:#e2e8f0;';
  pb.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="const b=document.getElementById('profPlaybookBody');b.style.display=b.style.display==='none'?'block':'none';">
      <span style="font-weight:800;color:#38bdf8;font-size:11px;">👨‍🏫 PROFESSOR'S OR PLAYBOOK &amp; TRICK</span>
      <span style="font-size:9.5px;color:#7dd3fc;">[Tap to Toggle]</span>
    </div>
    <div id="profPlaybookBody" style="margin-top:5px;display:block;"></div>
  `;
  sidebar.insertBefore(pb, coachCard.nextSibling);
})();

let lastPlaybookKey = '';
function updateProfessorPlaybookPanel() {
  const body = document.getElementById('profPlaybookBody');
  if (!body) return;
  const key = `${state.caseIdx}_${state.targetKey}`;
  if (key === lastPlaybookKey) return;
  lastPlaybookKey = key;

  const c = CASES[state.caseIdx];
  const cal = c.calyces[state.targetKey];
  const pb = c.profPlaybook;
  if (!pb) return;

  body.innerHTML = `
    <div style="color:#fca5a5;margin-bottom:4px;"><b>⚠️ The Trap:</b> ${pb.trap}</div>
    <div style="color:#fde047;margin-bottom:5px;background:rgba(234,179,8,0.1);padding:4px 6px;border-radius:4px;border-left:2px solid #eab308;">
      <b>💡 ${pb.trick}</b>
    </div>
    <div style="color:#86efac;margin-bottom:4px;"><b>🎯 Selected Calyx (${cal.label}):</b> ${cal.calyxNote || ''}</div>
    <div style="color:#cbd5e1;font-size:10.2px;border-top:1px solid #1e293b;padding-top:4px;">
      <b>Step-by-Step Guide to Beat This Case:</b>
      <div style="margin-top:2px;display:flex;flex-direction:column;gap:2px;">
        ${pb.steps.map(s => `<div>${s}</div>`).join('')}
      </div>
    </div>
  `;
}

// Enhance Case 10 (Hypermobile Kidney) tenting if Saline Distend (hydro) is OFF
const _origGetLiveAnatomy = window.getLiveAnatomy;
if (typeof _origGetLiveAnatomy === 'function') {
  window.getLiveAnatomy = function () {
    const live = _origGetLiveAnatomy();
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

  updateProfessorPlaybookPanel();
  if (state.autoPlaying) tickAutoSolve(dt);
  if (state.respMode === 'tidal') { state.tidalPhase += dt * 1.8; if (state.contFluoro) state.lihDirty = true; }

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
// 1. FLUOROSCOPY SCENE RENDERER (WITH CASE-SPECIFIC PATHOLOGY VISUALS)
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

  for (let vy = -44; vy <= 44; vy += 28) {
    const vc = proj({ x: 10, y: vy, z: 75 });
    ctx.fillStyle = 'rgba(92, 105, 122, 0.42)';
    ctx.fillRect(vc.x - 16 * scale, vc.y - 10 * scale, 30 * scale, 20 * scale);
    const tp = proj({ x: 34, y: vy, z: 70 });
    ctx.fillRect(vc.x + 14 * scale, tp.y - 3.5 * scale, 16 * scale, 7 * scale);
  }

  // Case 6: Horseshoe Kidney Midline Parenchymal Isthmus Shadow
  if (c.stoneType === 'horseshoe') {
    const isth1 = proj({ x: 12, y: -24, z: 82 });
    const isth2 = proj({ x: 66, y: -18, z: 76 });
    ctx.beginPath();
    ctx.moveTo(isth1.x, isth1.y);
    ctx.lineTo(isth2.x, isth2.y);
    ctx.lineWidth = 22 * scale;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const drawRib = (ry, lbl) => {
    const r1 = proj({ x: 26, y: ry + 14, z: 18 });
    const r2 = proj({ x: 74, y: ry + 4, z: 18 });
    const r3 = proj({ x: 118, y: ry - 5, z: 22 });
    ctx.beginPath();
    ctx.moveTo(r1.x, r1.y);
    ctx.quadraticCurveTo(r2.x, r2.y, r3.x, r3.y);
    ctx.lineWidth = 8.5 * scale;
    ctx.strokeStyle = 'rgba(82, 94, 110, 0.54)';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.font = `bold ${Math.max(10, Math.round(scale * 3.8))}px sans-serif`;
    ctx.fillText(lbl, r3.x - 16 * scale, r3.y - 6 * scale);
  };
  drawRib(c.rib12Y, '12th Rib');
  drawRib(c.rib12Y + 28, '11th Rib');

  const u1 = proj({ x: c.pelvis.x - 12, y: -72, z: c.pelvis.z });
  const u2 = proj(c.pelvis);
  ctx.beginPath();
  ctx.moveTo(u1.x, u1.y);
  ctx.quadraticCurveTo(u1.x + (c.stoneType === 'horseshoe' ? 18 : 7) * scale, (u1.y + u2.y) / 2, u2.x, u2.y);
  ctx.lineWidth = 2.2 * scale;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  const pPel = proj(c.pelvis);
  const drawCalyx = (cal, isPost, isSelectedTarget) => {
    const pCal = proj(cal);
    const nw = (cal.neckW || 8) * scale;
    const cr = (cal.cupR || 7.5) * scale;

    // Case 7: Calyceal Diverticulum has an obliterated neck—no retrograde contrast enters until punctured & injected antegrade!
    if (cal.isDiverticulum && !state.hydro) {
      ctx.beginPath();
      ctx.moveTo(pPel.x, pPel.y);
      ctx.lineTo(pCal.x, pCal.y);
      ctx.lineWidth = 1.0 * scale;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

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
    ctx.scale(1 - dimple * 0.22, 1 + dimple * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, cr, -Math.PI * 0.78, Math.PI * 0.78);
    ctx.lineWidth = cr * 0.85;
    ctx.strokeStyle = isPost ? 'rgba(18, 26, 40, 0.90)' : 'rgba(51, 65, 85, 0.55)';
    ctx.stroke();
    ctx.restore();

    // 5mL Air Bolus floats ONLY to POSTERIOR calyces in a prone patient!
    if (state.airBolus && isPost) {
      ctx.beginPath();
      ctx.arc(pCal.x, pCal.y, cr * 0.68, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();
    }

    if (isSelectedTarget) {
      ctx.beginPath();
      ctx.arc(pCal.x, pCal.y, cr + 2.5 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = dimple > 0.1 ? '#f59e0b' : 'rgba(2, 132, 199, 0.55)';
      ctx.lineWidth = dimple > 0.1 ? 2.2 : 1.3;
      ctx.stroke();
    }
  };

  ctx.beginPath();
  ctx.arc(pPel.x, pPel.y, (c.stoneType === 'bifid' ? 8.5 : 11.5) * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(22, 32, 48, 0.86)';
  ctx.fill();

  drawCalyx(c.antCalyx, false, false);
  for (const k of Object.keys(c.calyces)) {
    drawCalyx(c.calyces[k], true, k === state.targetKey);
  }

  // Draw Pathology-Specific Stones (Branched Staghorns vs Isolated Calculi)
  const drawStone = (pt, r) => {
    const s = proj(pt);
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 15, 24, 0.95)';
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();
  };

  if (c.stoneType === 'staghorn' || c.stoneType === 'upper_staghorn') {
    const keys = c.stoneType === 'staghorn' ? ['lower_lat', 'middle', 'upper'] : ['upper', 'middle'];
    keys.forEach(k => {
      if (!c.calyces[k]) return;
      const pC = proj(c.calyces[k]);
      ctx.beginPath();
      ctx.moveTo(pPel.x, pPel.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.lineWidth = 7.2 * scale;
      ctx.strokeStyle = 'rgba(10, 15, 24, 0.94)';
      ctx.lineCap = 'round';
      ctx.stroke();
      drawStone(c.calyces[k], 5.8);
    });
    drawStone(c.pelvis, 9.5);
  } else if (c.stoneType === 'diverticulum') {
    drawStone(c.calyces.middle, 4.8);
  } else {
    drawStone(c.pelvis, 8.2);
    drawStone(c.targetCalyx, 5.6);
  }

  state.blushClouds.forEach(bl => {
    const pb = proj(bl);
    const g = ctx.createRadialGradient(pb.x, pb.y, 2, pb.x, pb.y, bl.r * scale);
    g.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
    g.addColorStop(0.6, 'rgba(30, 41, 59, 0.65)');
    g.addColorStop(1, 'rgba(30, 41, 59, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pb.x, pb.y, bl.r * scale, 0, Math.PI * 2);
    ctx.fill();
  });

  const ng = getNeedle3D();
  const pTip = proj(ng.tip);
  const pHub = proj(ng.hub);
  const shaftLen = Math.hypot(pHub.x - pTip.x, pHub.y - pTip.y);

  ctx.beginPath();
  ctx.moveTo(pHub.x, pHub.y);
  ctx.lineTo(pTip.x, pTip.y);
  ctx.lineWidth = 2.3 * scale;
  ctx.strokeStyle = '#090d14';
  ctx.stroke();

  const isCoaxial = shaftLen < 6.5 * scale;
  ctx.beginPath();
  ctx.arc(pHub.x, pHub.y, 5.5 * scale, 0, Math.PI * 2);
  ctx.lineWidth = 2.2 * scale;
  ctx.strokeStyle = isCoaxial ? '#0284c7' : '#0f172a';
  ctx.stroke();

  ctx.restore();
}

function drawFluoroHUD(ctx, w, h) {
  const cx = w / 2, cy = h * 0.48, rad = Math.min(w, h) * 0.44;
  ctx.save();
  ctx.font = `bold ${Math.max(10.5, Math.round(rad * 0.05))}px monospace`;
  const d = computeDiagnostics();
  if (d.dimpleFactor > 0.15 && !d.inTarget) {
    ctx.fillStyle = '#d97706';
    ctx.fillText('◐ CALYCEAL DIMPLE SIGN (CAPSULE TENTING) — PUSH +4MM TO POP!', cx - rad * 0.80, cy + rad * 0.84);
  } else if (d.coaxialErr < 7.5) {
    ctx.fillStyle = '#0369a1';
    ctx.fillText('◎ BULL\'S EYE COAXIAL LOCK (<8mm)', cx - rad * 0.55, cy + rad * 0.84);
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// 2. FLANK SKIN LANDMARK MAP
// ----------------------------------------------------------------------------
function drawSkinSurface(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1b1817';
  ctx.fillRect(0, 0, w, h);

  const scale = w / 180, ox = 20 * scale, oy = h * 0.52;
  const toSkin = (x, y) => ({ x: ox + x * scale, y: oy - y * scale });

  const c = getLiveAnatomy(), ng = getNeedle3D(), dyResp = getRespShift();

  const pPara = toSkin(55, 0);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
  ctx.fillRect(0, 0, pPara.x, h);
  ctx.beginPath(); ctx.moveTo(pPara.x, 0); ctx.lineTo(pPara.x, h);
  ctx.strokeStyle = '#f59e0b'; ctx.stroke();

  // Case 8 (Retrorenal Colon) shifts the red colon hazard line medially to x = 104mm!
  const colonX = c.stoneType === 'retrorenal_colon' ? 104 : 128;
  const pPAL = toSkin(colonX, 0);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
  ctx.fillRect(pPAL.x, 0, w - pPAL.x, h);
  ctx.beginPath(); ctx.moveTo(pPAL.x, 0); ctx.lineTo(pPAL.x, h);
  ctx.strokeStyle = '#ef4444'; ctx.stroke();
  if (c.stoneType === 'retrorenal_colon') {
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillText('RETRORENAL COLON!', pPAL.x + 4, 14);
  }

  const drawSkinRib = (ry, label) => {
    const r1 = toSkin(35, ry + 12), r2 = toSkin(118, ry - 5);
    ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y);
    ctx.lineWidth = 6.5 * scale;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.30)';
    ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(203, 213, 225, 0.55)';
    ctx.font = `${Math.max(8.5, Math.round(scale * 3.0))}px sans-serif`;
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
    ctx.beginPath();
    ctx.arc(pC.x, pC.y, (isSel ? 5.2 : 3.6) * scale, 0, Math.PI * 2);
    ctx.fillStyle = isSel ? '#38bdf8' : '#64748b';
    ctx.fill();
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
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.lineWidth = 1.8; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);

  const pB = toSkin(ng.skinEntry.x, ng.skinEntry.y);
  const pTip = toSkin(ng.tip.x, ng.tip.y);
  ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(pTip.x, pTip.y);
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.8; ctx.stroke();

  ctx.beginPath();
  ctx.arc(pB.x, pB.y, 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke();
  ctx.fillStyle = '#fde047';
  ctx.fillText(`Point B (L=${state.latCm.toFixed(1)}, CC=${state.ccCm >= 0 ? '+' : ''}${state.ccCm.toFixed(1)}cm)`, pB.x + 8 * scale, Math.max(12, pB.y + 4));

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3A. WORKBENCH TAB 1: AXIAL & CORONAL ANATOMY + DOG-LEG
// ----------------------------------------------------------------------------
function drawAnatomyBench(ctx, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (state.blindMode && !state.blindRevealed) {
    ctx.fillStyle = '#070b12'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('OR BLIND MODE — PULL STYLET TO REVEAL ANATOMY', w / 2, h / 2);
    ctx.restore(); return;
  }

  const c = getLiveAnatomy(), ng = getNeedle3D(), d = computeDiagnostics();
  const scale = Math.min(w / 175, h / 145), ox = 14 * scale, oy = 16 * scale;
  const toAx = (x, z) => ({ x: ox + x * scale, y: oy + z * scale });

  const pS1 = toAx(0, 0), pS2 = toAx(152, 26);
  ctx.fillStyle = 'rgba(234, 179, 8, 0.11)';
  ctx.fillRect(pS1.x, pS1.y, pS2.x - pS1.x, pS2.y - pS1.y);
  ctx.beginPath(); ctx.moveTo(pS1.x, pS1.y); ctx.lineTo(pS2.x, pS1.y);
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.stroke();

  ctx.beginPath(); ctx.moveTo(pS1.x, pS2.y); ctx.lineTo(pS2.x, pS2.y);
  ctx.strokeStyle = '#38bdf8'; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.max(8.5, Math.round(scale * 2.9))}px sans-serif`;
  ctx.fillText('Skin Surface (0mm)', pS1.x + 4, pS1.y + 10 * scale);
  ctx.fillText('Lumbodorsal Fascia [1st Pop ~26mm]', pS1.x + 4, pS2.y - 3 * scale);

  const pCol = toAx(c.stoneType === 'retrorenal_colon' ? 105 : 138, c.stoneType === 'retrorenal_colon' ? 38 : 56);
  ctx.beginPath(); ctx.arc(pCol.x, pCol.y, 13 * scale, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.28)'; ctx.fill();
  ctx.strokeStyle = '#ef4444'; ctx.stroke();
  ctx.fillStyle = '#fca5a5'; ctx.fillText('Colon', pCol.x - 10 * scale, pCol.y + 3 * scale);

  const pKid = toAx(76, c.pelvis.z - 4);
  ctx.save();
  ctx.translate(pKid.x, pKid.y);
  ctx.rotate((c.stoneType === 'horseshoe' ? -14 : -28) * Math.PI / 180);
  ctx.beginPath(); ctx.ellipse(0, 0, 32 * scale, 22 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(153, 27, 27, 0.45)'; ctx.fill();
  ctx.strokeStyle = '#f87171'; ctx.stroke();
  ctx.restore();

  const pPel = toAx(c.pelvis.x, c.pelvis.z);
  const pPost = toAx(c.targetCalyx.x, c.targetCalyx.z);
  const pAnt = toAx(c.antCalyx.x, c.antCalyx.z);

  ctx.beginPath();
  ctx.moveTo(pPel.x, pPel.y);
  ctx.lineTo(pPost.x + (pPost.x - pPel.x) * 2.3, pPost.y + (pPost.y - pPel.y) * 2.3);
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
  ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(pPel.x, pPel.y); ctx.lineTo(pPost.x, pPost.y);
  ctx.moveTo(pPel.x, pPel.y); ctx.lineTo(pAnt.x, pAnt.y);
  ctx.lineWidth = c.targetCalyx.neckW * scale;
  ctx.strokeStyle = '#38bdf8'; ctx.lineCap = 'round'; ctx.stroke();

  ctx.beginPath();
  ctx.arc(pPost.x, pPost.y, c.targetCalyx.cupR * scale, 0, Math.PI * 2);
  ctx.fillStyle = d.inTarget ? '#22c55e' : '#0284c7';
  ctx.fill();

  const pEntry = toAx(ng.skinEntry.x, ng.skinEntry.z);
  const pTip = toAx(ng.tip.x, ng.tip.z);
  ctx.beginPath(); ctx.moveTo(pEntry.x, pEntry.y); ctx.lineTo(pTip.x, pTip.y);
  ctx.lineWidth = 3.0;
  ctx.strokeStyle = d.isSagging ? '#ef4444' : (d.inTarget ? '#4ade80' : '#facc15');
  ctx.stroke();

  const inW = 104 * scale, inH = h - 20 * scale, inX = w - inW - 8 * scale, inY = 10 * scale;
  ctx.fillStyle = 'rgba(10, 16, 26, 0.94)';
  ctx.strokeStyle = '#2a3c58';
  ctx.fillRect(inX, inY, inW, inH); ctx.strokeRect(inX, inY, inW, inH);

  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${Math.max(9, Math.round(scale * 3.2))}px sans-serif`;
  ctx.fillText('CORONAL DOG-LEG', inX + 6 * scale, inY + 13 * scale);

  const icx = inX + inW * 0.46, icy = inY + inH * 0.54;
  const infRad = c.targetCalyx.coronalDeg * Math.PI / 180, needRad = ng.effCor * Math.PI / 180;

  ctx.beginPath();
  ctx.moveTo(icx - Math.cos(infRad) * 26 * scale, icy - Math.sin(infRad) * 26 * scale);
  ctx.lineTo(icx, icy);
  ctx.lineWidth = 7 * scale; ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)'; ctx.lineCap = 'round'; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(icx + Math.cos(needRad) * 32 * scale, icy + Math.sin(needRad) * 32 * scale);
  ctx.lineTo(icx, icy);
  ctx.lineWidth = 2.6; ctx.strokeStyle = d.dogLegDeg <= 20 ? '#22c55e' : '#ef4444'; ctx.stroke();

  ctx.fillStyle = d.dogLegDeg <= 20 ? '#4ade80' : '#f87171';
  ctx.font = `bold ${Math.max(10, Math.round(scale * 3.8))}px monospace`;
  ctx.fillText(`Kink: ${d.dogLegDeg.toFixed(1)}°`, inX + 8 * scale, inY + inH - 8 * scale);

  ctx.restore();
}

// ----------------------------------------------------------------------------
// 3B. WORKBENCH TAB 2: LIVE TECHNIQUE IMPACT COMPARATOR
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
