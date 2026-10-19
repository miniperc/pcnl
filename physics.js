// ============================================================================
// FILE 1/3: physics.js — CORE 3D ANATOMY, SLOPED 12TH RIB & INPUT ENGINE
// ============================================================================
const lihCanvas = document.createElement('canvas');
const lihCtx = lihCanvas.getContext('2d');
const fluoroCanvas = document.getElementById('fluoroCanvas');
const skinCanvas = document.getElementById('skinCanvas');
const benchCanvas = document.getElementById('benchCanvas');
const fCtx = fluoroCanvas.getContext('2d');
const sCtx = skinCanvas.getContext('2d');
const bCtx = benchCanvas.getContext('2d');

fluoroCanvas.style.touchAction = 'none';
skinCanvas.style.touchAction = 'none';

state.assistedSnapped = false;
state.punctureAttempts = 0;
state.fasciaAnchored = false;
state.fasciaEntryPitch = 22.0;
state.fasciaEntryCor = 0.0;
state.pivotedDeep = false;

function getTargetCalyxBase() {
  return CASES[state.caseIdx].calyces[state.targetKey];
}

function getRespShift() {
  if (state.respMode === 'insp') return -8;
  if (state.respMode === 'exp') return +6;
  return Math.sin(state.tidalPhase) * 7;
}

function getPlannedRespShift() {
  const cal = getTargetCalyxBase();
  if (state.respMode === 'insp') return -8;
  if (state.respMode === 'exp') return +6;
  return cal.supracostal ? +6 : -8;
}

// Exact Y-coordinate of the sloped rib at lateral position X (matches renderer.js rib curve)
function getRibCenterYAtX(x, ribBaseY) {
  return ribBaseY + 4 - 0.205 * (x - 74);
}

function getExactCoaxialCArm(pitchDeg, corDeg) {
  const pRad = pitchDeg * Math.PI / 180;
  const cRad = corDeg * Math.PI / 180;
  const dx = -Math.sin(pRad) * Math.cos(cRad);
  const dy = Math.sin(pRad) * Math.sin(cRad);
  const dz = Math.cos(pRad);

  const aRad = Math.atan2(-dx, dz);
  const z1 = -dx * Math.sin(aRad) + dz * Math.cos(aRad);
  const bRad = Math.atan2(-dy, z1);

  return {
    ax: Math.round(aRad * 180 / Math.PI),
    ob: Math.round(bRad * 180 / Math.PI)
  };
}

function getTrueCalyxAngles(cal) {
  return { trueCorDeg: cal.coronalDeg, trueAxDeg: cal.axialDeg };
}

function getInfundibularUnitVector(cal) {
  const axRad = cal.axialDeg * Math.PI / 180;
  const corRad = cal.coronalDeg * Math.PI / 180;
  const vx = -Math.sin(axRad) * Math.cos(corRad);
  const vy = Math.sin(axRad) * Math.sin(corRad);
  const vz = Math.cos(axRad);
  const len = Math.hypot(vx, vy, vz) || 1;
  return { x: vx / len, y: vy / len, z: vz / len };
}

(function calibrateAnatomicalCases() {
  const axialProfileByCase = [
    { lower_lat: 30, lower_med: 20, middle: 28, upper: 22 },
    { lower_lat: 38, lower_med: 22, middle: 32, upper: 24 },
    { lower_lat: 26, lower_med: 18, middle: 28, upper: 22 },
    { lower_lat: 28, lower_med: 20, middle: 26, upper: 24 },
    { lower_lat: 40, lower_med: 24, middle: 34, upper: 24 },
    { lower_lat: 16, lower_med: 12, middle: 14, upper: 18 }
  ];

  CASES.forEach((c, idx) => {
    const pel = c.pelvis;
    const axMap = axialProfileByCase[idx] || axialProfileByCase[0];

    Object.keys(c.calyces).forEach(k => {
      const cal = c.calyces[k];
      if (axMap[k] !== undefined) cal.axialDeg = axMap[k];

      if (k === 'upper') {
        if (idx !== 5) {
          // Calibrated so on Exp Hold (+6mm), the calyx sits at rib12Y + 5mm
          // and Point B sits right on the UPPER BORDER of the 12th rib!
          cal.x = pel.x + 20;
          cal.y = c.rib12Y - 1;
          cal.coronalDeg = -8;
          cal.supracostal = true;
        } else {
          cal.supracostal = false;
          cal.coronalDeg = -8;
        }
      } else {
        const dx = cal.x - pel.x;
        const dy = pel.y - cal.y;
        cal.coronalDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI * 2) / 2;
      }
    });
    c.pleuraY = c.rib12Y + 18;
  });

  const pedalBtn = document.getElementById('pedalBtn');
  if (pedalBtn) {
    pedalBtn.style.touchAction = 'none';
    pedalBtn.addEventListener('pointerdown', e => { e.preventDefault(); startPedal(); });
    pedalBtn.addEventListener('pointerup', e => { e.preventDefault(); stopPedal(); });
    pedalBtn.addEventListener('pointercancel', () => stopPedal());
  }
})();

function initCase(idx, keepCalyx = false) {
  if (typeof stopAutoSolve === 'function') stopAutoSolve(true);
  state.caseIdx = idx;
  const c = CASES[idx];
  if (!keepCalyx) {
    state.targetKey = c.defaultCalyx;
    document.getElementById('calyxSelect').value = state.targetKey;
  }

  state.assistedSnapped = false;
  state.pointAMarked = false;
  state.respMode = 'tidal';
  const respLabels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
  document.getElementById('btnResp').textContent = respLabels[state.respMode];

  state.cArmAx = 0;
  state.cArmOb = 0;
  state.latCm = 3.5;
  state.ccCm = -1.0;
  state.corDeg = 0.0;
  state.pitchDeg = 22.0;
  state.depthMm = 0;

  state.punctureAttempts = 0;
  state.fasciaAnchored = false;
  state.pivotedDeep = false;
  state.wireAdvMm = 0;
  state.rodDepthMm = 0;
  state.sheathDepthMm = 0;

  state.visited0AP = true;
  state.visited30Ax = false;
  state.visited30Ob = false;

  state.blushClouds = [];
  document.getElementById('clearBlushBtn').style.display = 'none';
  state.styletPulled = false;
  state.blindRevealed = false;
  state.lihDirty = true;

  document.getElementById('narrationBanner').classList.remove('visible');
  const revModal = document.getElementById('punctureReviewModal');
  if (revModal) revModal.style.display = 'none';

  syncAllUI();
  if (typeof updateDiagnosticsAndCoach === 'function') updateDiagnosticsAndCoach();
}

function resetCase() { initCase(state.caseIdx, true); }

function syncAllUI() {
  const cal = getTargetCalyxBase();
  document.getElementById('sAx').value = state.cArmAx;
  document.getElementById('vAx').textContent = (state.cArmAx >= 0 ? '+' : '') + Math.round(state.cArmAx) + '°';
  document.getElementById('sOb').value = state.cArmOb;
  document.getElementById('vOb').textContent = (state.cArmOb >= 0 ? '+' : '') + Math.round(state.cArmOb) + '°';

  const showHints = state.assistedSnapped || state.autoPlaying;
  document.getElementById('cArmReadout').textContent = showHints
    ? `Axial: ${state.cArmAx >= 0 ? '+' : ''}${Math.round(state.cArmAx)}° (Calyx: +${cal.axialDeg}°) | Tilt: ${state.cArmOb >= 0 ? '+' : ''}${Math.round(state.cArmOb)}°`
    : `Axial: ${state.cArmAx >= 0 ? '+' : ''}${Math.round(state.cArmAx)}° | Tilt: ${state.cArmOb >= 0 ? '+' : ''}${Math.round(state.cArmOb)}°`;

  document.getElementById('sLat').value = state.latCm.toFixed(1);
  document.getElementById('vLat').textContent = state.latCm.toFixed(1) + ' cm';
  document.getElementById('sCC').value = state.ccCm.toFixed(1);
  document.getElementById('vCC').textContent = (state.ccCm >= 0 ? '+' : '') + state.ccCm.toFixed(1) + ' cm';
  document.getElementById('sCor').value = state.corDeg;
  document.getElementById('vCor').textContent = state.corDeg.toFixed(1) + '°';
  document.getElementById('sPitch').value = state.pitchDeg;
  document.getElementById('vPitch').textContent = state.pitchDeg.toFixed(1) + '°';
  document.getElementById('sDepth').value = state.depthMm;

  const dRound = Math.round(state.depthMm);
  document.getElementById('vDepth').textContent = dRound === 0 ? '0 mm (On Skin)' : `${dRound} mm`;

  const surfMm = Math.hypot(state.latCm * 10, state.ccCm * 10);
  const idealP = Math.atan2(surfMm, cal.z) * 180 / Math.PI;
  const tractMm = Math.round(Math.hypot(surfMm, cal.z));
  document.getElementById('trigHint').textContent = showHints
    ? `Tract:${tractMm}mm | Ideal Pitch:${idealP.toFixed(1)}°`
    : `Manual OR Mode (Use C-Arm Parallax)`;
}

document.getElementById('caseSelect').addEventListener('change', e => initCase(parseInt(e.target.value, 10), false));
document.getElementById('calyxSelect').addEventListener('change', e => {
  state.targetKey = e.target.value;
  initCase(state.caseIdx, true);
});
document.getElementById('coachModeSelect').addEventListener('change', e => {
  state.coachMode = e.target.value;
  if (typeof stopAutoSolve === 'function') stopAutoSolve(true);
  updateDiagnosticsAndCoach();
});

const bindSlider = (id, fn) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', e => {
    if (typeof stopAutoSolve === 'function') stopAutoSolve(false);
    fn(parseFloat(e.target.value));
    state.lihDirty = true;
    syncAllUI();
    updateDiagnosticsAndCoach();
  });
};

bindSlider('sAx', v => { state.cArmAx = v; markCArmVisited(); });
bindSlider('sOb', v => { state.cArmOb = v; markCArmVisited(); });
bindSlider('sLat', v => { state.latCm = v; });
bindSlider('sCC', v => { state.ccCm = v; });
bindSlider('sCor', v => { state.corDeg = v; checkDeepPivot(); });
bindSlider('sPitch', v => { state.pitchDeg = v; checkDeepPivot(); });
bindSlider('sDepth', v => { updateDepthWithTracking(v); state.styletPulled = false; });

function updateDepthWithTracking(newD) {
  const d = Math.max(0, Math.min(135, newD));
  if (state.depthMm <= 1 && d > 2) state.punctureAttempts++;
  state.depthMm = d;
  const ng = getNeedle3D();
  if (ng.tip.z >= 26 && !state.fasciaAnchored) {
    state.fasciaAnchored = true;
    state.fasciaEntryPitch = state.pitchDeg;
    state.fasciaEntryCor = state.corDeg;
  } else if (ng.tip.z < 24) {
    state.fasciaAnchored = false;
  }
}

function checkDeepPivot() {
  if (!state.autoPlaying && state.fasciaAnchored && state.depthMm > 42) {
    if (Math.abs(state.pitchDeg - state.fasciaEntryPitch) > 5 || Math.abs(state.corDeg - state.fasciaEntryCor) > 6) {
      state.pivotedDeep = true;
    }
  }
}

function markCArmVisited() {
  const cal = getTargetCalyxBase();
  if (Math.abs(state.cArmAx) <= 2 && Math.abs(state.cArmOb) <= 2) state.visited0AP = true;
  if (Math.abs(state.cArmAx - cal.axialDeg) <= 8 || Math.abs(state.cArmAx - 30) <= 6) state.visited30Ax = true;
  if (Math.abs(state.cArmOb) >= 20) state.visited30Ob = true;
}

function setCArm(ax, ob) {
  if (typeof stopAutoSolve === 'function') stopAutoSolve(false);
  state.cArmAx = ax; state.cArmOb = ob;
  state.lihDirty = true;
  markCArmVisited(); syncAllUI(); updateDiagnosticsAndCoach();
}

function setWorkbench(wb) {
  state.workbench = wb;
  document.getElementById('wbTab1').classList.toggle('active', wb === 'anatomy');
  document.getElementById('wbTab5').classList.toggle('active', wb === 'compare');
  document.getElementById('wbTab2').classList.toggle('active', wb === 'ultrasound');
}

function toggleBlind() {
  state.blindMode = !state.blindMode;
  state.blindRevealed = false;
  const b = document.getElementById('blindBtn');
  b.textContent = `OR Blind: ${state.blindMode ? 'ON' : 'OFF'}`;
  b.classList.toggle('active', state.blindMode);
}

function toggleContFluoro() {
  state.contFluoro = !state.contFluoro;
  const b = document.getElementById('contFluoroBtn');
  b.textContent = `Live Fluoro: ${state.contFluoro ? 'ON' : 'OFF (LIH)'}`;
  b.classList.toggle('active', state.contFluoro);
}

function startPedal() { state.pedalDown = true; state.lihDirty = true; document.getElementById('pedalBtn').classList.add('firing'); }
function stopPedal() { state.pedalDown = false; document.getElementById('pedalBtn').classList.remove('firing'); }

function toggleClamp() {
  state.clampOn = !state.clampOn;
  state.lihDirty = true;
  const b = document.getElementById('clampBtn');
  b.textContent = `Radiolucent Clamp: ${state.clampOn ? 'ON' : 'OFF (Gravity Sag!)'}`;
  b.className = state.clampOn ? 'active' : 'warn-active';
  updateDiagnosticsAndCoach();
}

function toggleAir() { state.airBolus = !state.airBolus; state.lihDirty = true; document.getElementById('btnAir').classList.toggle('active', state.airBolus); }
function toggleHydro() { state.hydro = !state.hydro; state.lihDirty = true; document.getElementById('btnHydro').classList.toggle('active', state.hydro); }

function cycleResp() {
  const order = ['insp', 'exp', 'tidal'];
  const labels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
  state.respMode = order[(order.indexOf(state.respMode) + 1) % 3];
  state.lihDirty = true;
  document.getElementById('btnResp').textContent = labels[state.respMode];
  updateDiagnosticsAndCoach();
}

function setExactDepth(d) {
  if (typeof stopAutoSolve === 'function') stopAutoSolve(false);
  updateDepthWithTracking(d);
  state.styletPulled = false;
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
}

function jumpToFascia() {
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  setExactDepth(opt.fasciaDepthMm);
}

function stepDepth(d) { setExactDepth(state.depthMm + d); }
function markPointA() { setCArm(0, 0); state.pointAMarked = true; }

function autoTrigPointB() {
  if (typeof stopAutoSolve === 'function') stopAutoSolve(false);
  state.assistedSnapped = true;
  state.pointAMarked = true;
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  state.respMode = opt.respMode;
  const labels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
  document.getElementById('btnResp').textContent = labels[state.respMode];

  state.latCm = opt.latCm;
  state.ccCm = opt.ccCm;
  state.corDeg = opt.corDeg;
  state.pitchDeg = opt.pitchDeg;
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
}

let draggingFluoroHub = false, draggingDepthScrubber = false, lastPointer = { x: 0, y: 0 };
fluoroCanvas.addEventListener('pointerdown', e => {
  if (e.target.tagName === 'BUTTON') return;
  if (typeof stopAutoSolve === 'function') stopAutoSolve(false);
  const rect = fluoroCanvas.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  if (px > rect.width - 44) {
    draggingDepthScrubber = true;
    setExactDepth(Math.round(Math.max(0, Math.min(1, (py - 40) / (rect.height - 80))) * 125));
    return;
  }
  draggingFluoroHub = true;
  lastPointer = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', e => {
  if (draggingDepthScrubber) {
    const rect = fluoroCanvas.getBoundingClientRect();
    setExactDepth(Math.round(Math.max(0, Math.min(1, (e.clientY - rect.top - 40) / (rect.height - 80))) * 125 * 2) / 2);
    return;
  }
  if (!draggingFluoroHub) return;
  state.pitchDeg = Math.max(10, Math.min(60, state.pitchDeg + (e.clientX - lastPointer.x) * 0.12));
  state.corDeg = Math.max(-75, Math.min(75, state.corDeg + (e.clientY - lastPointer.y) * 0.15));
  lastPointer = { x: e.clientX, y: e.clientY };
  checkDeepPivot(); state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach();
});
window.addEventListener('pointerup', () => { draggingFluoroHub = false; draggingDepthScrubber = false; });
fluoroCanvas.addEventListener('wheel', e => { e.preventDefault(); stepDepth(e.deltaY < 0 ? 2 : -2); }, { passive: false });

let draggingSkinPointB = false;
skinCanvas.addEventListener('pointerdown', e => {
  if (typeof stopAutoSolve === 'function') stopAutoSolve(false);
  const rect = skinCanvas.getBoundingClientRect();
  const scale = rect.width / 180;
  const wx = (e.clientX - rect.left - 20 * scale) / scale;
  const wy = (rect.height * 0.52 - (e.clientY - rect.top)) / scale;
  const dyResp = getRespShift();
  const c = CASES[state.caseIdx];
  for (const key of Object.keys(c.calyces)) {
    const cal = c.calyces[key];
    if (Math.hypot(wx - cal.x, wy - (cal.y + dyResp)) < 7.5) {
      state.targetKey = key;
      document.getElementById('calyxSelect').value = key;
      initCase(state.caseIdx, true);
      return;
    }
  }
  draggingSkinPointB = true;
  movePointBOnSkin(wx, wy);
});
window.addEventListener('pointermove', e => {
  if (!draggingSkinPointB) return;
  const rect = skinCanvas.getBoundingClientRect();
  const scale = rect.width / 180;
  movePointBOnSkin((e.clientX - rect.left - 20 * scale) / scale, (rect.height * 0.52 - (e.clientY - rect.top)) / scale);
});
window.addEventListener('pointerup', () => { draggingSkinPointB = false; });

function movePointBOnSkin(wx, wy) {
  const cal = getTargetCalyxBase();
  state.latCm = Math.round(Math.max(0.5, Math.min(8.0, (wx - cal.x) / 10)) * 10) / 10;
  state.ccCm = Math.round(Math.max(-6.0, Math.min(5.0, (wy - (cal.y + getPlannedRespShift())) / 10)) * 10) / 10;
  state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach();
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); startPedal(); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); stepDepth(1); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); stepDepth(-1); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); state.pitchDeg = Math.min(60, state.pitchDeg + 0.5); state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach(); }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); state.pitchDeg = Math.max(10, state.pitchDeg - 0.5); state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach(); }
  else if (e.code === 'KeyQ') setCArm(0, 0);
  else if (e.code === 'KeyE') setCArm(30, 0);
});
window.addEventListener('keyup', e => { if (e.code === 'Space') stopPedal(); });

function getEffectiveNeedleAngles() {
  let sagPitch = 0, sagCor = 0;
  if (!state.clampOn && state.depthMm > 0 && state.depthMm < 28) {
    const factor = (28 - state.depthMm) / 28;
    sagPitch = 8.5 * factor; sagCor = -7.0 * factor;
  }
  let respPendulumCor = 0, isPendulumSwinging = false;
  if (state.respMode === 'tidal' && state.depthMm > 48) {
    const excursion = getRespShift() - getPlannedRespShift();
    respPendulumCor = excursion * 0.65;
    isPendulumSwinging = Math.abs(excursion) > 2.0;
  }
  return {
    effPitch: state.pitchDeg + sagPitch,
    effCor: state.corDeg + sagCor + respPendulumCor,
    isSagging: (!state.clampOn && state.depthMm > 0 && state.depthMm < 28),
    isPendulumSwinging
  };
}

function getNeedle3D() {
  const cal = getTargetCalyxBase();
  const pointA = { x: cal.x, y: cal.y + getRespShift(), z: 0 };
  const skinEntry = { x: cal.x + state.latCm * 10, y: (cal.y + getPlannedRespShift()) + state.ccCm * 10, z: 0 };
  const { effPitch, effCor, isSagging, isPendulumSwinging } = getEffectiveNeedleAngles();
  const pRad = effPitch * Math.PI / 180, cRad = effCor * Math.PI / 180;
  const dir = { x: -Math.sin(pRad) * Math.cos(cRad), y: Math.sin(pRad) * Math.sin(cRad), z: Math.cos(pRad) };
  const tip = { x: skinEntry.x + dir.x * state.depthMm, y: skinEntry.y + dir.y * state.depthMm, z: skinEntry.z + dir.z * state.depthMm };
  const hub = { x: tip.x - dir.x * 135, y: tip.y - dir.y * 135, z: tip.z - dir.z * 135 };
  return { pointA, skinEntry, dir, tip, hub, isSagging, isPendulumSwinging, effPitch, effCor };
}

function getLiveAnatomy() {
  const base = CASES[state.caseIdx];
  const dy = getRespShift();
  const ng = getNeedle3D();
  const targetBase = base.calyces[state.targetKey];
  let pushX = 0, pushY = 0;
  if (state.depthMm > 48) {
    const distPast = state.depthMm - (targetBase.z - 2);
    const tentMm = distPast < 0 ? (state.depthMm - 48) * 0.08 : Math.max(0, 1.4 - distPast * 0.25);
    pushX = ng.dir.x * tentMm; pushY = ng.dir.y * tentMm;
  }
  const shiftedCalyces = {};
  for (const k of Object.keys(base.calyces)) {
    const c = base.calyces[k];
    shiftedCalyces[k] = { ...c, x: c.x + pushX, y: c.y + dy + pushY, cupR: c.cupR + (state.hydro ? 2.2 : 0) };
  }
  return {
    ...base,
    pelvis: { x: base.pelvis.x + pushX, y: base.pelvis.y + dy + pushY, z: base.pelvis.z },
    calyces: shiftedCalyces,
    targetCalyx: shiftedCalyces[state.targetKey],
    antCalyx: { x: base.antCalyx.x + pushX, y: base.antCalyx.y + dy + pushY, z: base.antCalyx.z }
  };
}

function project3D(pt, iso) {
  const dx = pt.x - iso.x, dy = pt.y - iso.y, dz = pt.z - iso.z;
  const a = state.cArmAx * Math.PI / 180, b = state.cArmOb * Math.PI / 180;
  const x1 = dx * Math.cos(a) + dz * Math.sin(a);
  const z1 = -dx * Math.sin(a) + dz * Math.cos(a);
  const y2 = dy * Math.cos(b) + z1 * Math.sin(b);
  return { u: x1, v: y2 };
}

function injectNeedleContrast() {
  const diag = computeDiagnostics();
  const ng = getNeedle3D();
  state.lihDirty = true;
  if (diag.inTarget) {
    state.hydro = true;
    document.getElementById('btnHydro').classList.add('active');
  } else {
    state.blushClouds.push({ x: ng.tip.x, y: ng.tip.y, z: ng.tip.z, r: 14 });
    document.getElementById('clearBlushBtn').style.display = 'inline-block';
  }
}

function clearBlush() {
  state.blushClouds = [];
  state.lihDirty = true;
  document.getElementById('clearBlushBtn').style.display = 'none';
}

function computeDiagnostics() {
  const c = getLiveAnatomy();
  const ng = getNeedle3D();
  const cal = c.targetCalyx;
  const { trueCorDeg } = getTrueCalyxAngles(cal);

  const distToCalyx = Math.hypot(ng.tip.x - cal.x, ng.tip.y - cal.y, ng.tip.z - cal.z);
  const distToAnt = Math.hypot(ng.tip.x - c.antCalyx.x, ng.tip.y - c.antCalyx.y, ng.tip.z - c.antCalyx.z);

  const infVec = getInfundibularUnitVector(cal);
  const dot = Math.max(-1, Math.min(1, ng.dir.x * infVec.x + ng.dir.y * infVec.y + ng.dir.z * infVec.z));
  const dogLegDeg = Math.acos(dot) * 180 / Math.PI;
  const coronalMismatch = Math.abs(ng.effCor - trueCorDeg);

  const colonRisk = ng.skinEntry.x > 126;
  const paraspinalRisk = ng.skinEntry.x < 54;

  const tRib = 18 / Math.max(0.15, ng.dir.z);
  const xAtRib = ng.skinEntry.x + ng.dir.x * tRib;
  const yAtRib = ng.skinEntry.y + ng.dir.y * tRib;

  // Sloped 12th and 11th rib centers at the needle's X position
  const rib12CenterY = getRibCenterYAtX(xAtRib, c.rib12Y);
  const rib11CenterY = getRibCenterYAtX(xAtRib, c.rib12Y + 28);

  const ribHit = state.depthMm >= tRib && (Math.abs(yAtRib - rib12CenterY) < 3.4 || Math.abs(yAtRib - rib11CenterY) < 3.4);
  const intercostalHit = state.depthMm >= tRib && ((rib12CenterY - yAtRib > 3.4 && rib12CenterY - yAtRib < 7.2) || (rib11CenterY - yAtRib > 3.4 && rib11CenterY - yAtRib < 7.5));

  const pleuraBorderY = rib12CenterY + (state.respMode === 'insp' ? 5 : 16);
  const pleuraHit = state.depthMm >= tRib && yAtRib > pleuraBorderY;

  let layer = "0mm: On Skin Surface (Point B)", resistanceN = 0.0, popZone = 'none', dimpleFactor = 0.0;
  if (state.depthMm <= 0.5) { layer = "0mm: On Skin Surface (Point B)"; resistanceN = 0.0; }
  else if (state.depthMm <= 3.5) { layer = "Skin Dermis Puncture [Skin Pop]"; resistanceN = 3.2; popZone = 'skin'; }
  else if (ng.tip.z <= 23) { layer = "Subcutaneous Fat (Safe Pivot Zone)"; resistanceN = 0.8; }
  else if (ng.tip.z <= 29) { layer = "Lumbodorsal Fascia [1st Tactile Pop!]"; resistanceN = 6.8; popZone = 'fascia'; }
  else if (distToCalyx > cal.cupR + 10) { layer = "Perinephric Space (Gerota's Fat)"; resistanceN = 1.2; }
  else if (distToCalyx > cal.cupR) {
    layer = "Renal Capsule / Papilla [Dimple → 2nd Pop]";
    resistanceN = 5.5;
    dimpleFactor = 1.0 - (distToCalyx - cal.cupR) / 10;
  } else {
    layer = "Posterior Calyceal Lumen [Intraluminal]";
    resistanceN = 0.2;
    popZone = 'papilla';
  }
  if (ng.tip.z > cal.z + cal.cupR + 4) { layer = "Anterior Wall Overshoot!"; resistanceN = 4.2; }

  if (popZone !== 'none' && popZone !== state.lastPopZone) playTactilePop(popZone);
  state.lastPopZone = popZone;

  const inTarget = distToCalyx <= cal.cupR;
  const inInfundibulumWall = !inTarget && distToCalyx < 17 && ng.tip.x < cal.x - 5;
  const inAnt = distToAnt <= 8.5;

  const iso = { x: cal.x, y: cal.y, z: cal.z };
  const pTip = project3D(ng.tip, iso), pHub = project3D(ng.hub, iso);
  const coaxialErr = Math.hypot(pTip.u - pHub.u, pTip.v - pHub.v);

  return {
    distToCalyx, dogLegDeg, coronalMismatch, trueCorDeg,
    colonRisk, paraspinalRisk, ribHit, intercostalHit, pleuraHit,
    layer, resistanceN, dimpleFactor, inTarget, inInfundibulumWall, inAnt,
    coaxialErr, isSagging: ng.isSagging, isPendulumSwinging: ng.isPendulumSwinging,
    tipZ: ng.tip.z, calZ: cal.z, skinY: ng.skinEntry.y, rib12SurfaceY: getRibCenterYAtX(ng.skinEntry.x, c.rib12Y)
  };
}
// === END OF FILE physics.js ===
