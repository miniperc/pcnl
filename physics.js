// ============================================================================
// PCNL SURGICAL SIMULATOR v5.2 — CLEAN MANUAL-DEFAULT PHYSICS & SOLVER ENGINE
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

state.wireType = 'terumo';
state.assistedSnapped = false; // False = Manual OR Mode (Default); True only when user clicks "Snap Optimal Point B"

function getTargetCalyxBase() {
  return CASES[state.caseIdx].calyces[state.targetKey];
}

function getRespShift() {
  if (state.respMode === 'insp') return -8;
  if (state.respMode === 'exp') return +8;
  return Math.sin(state.tidalPhase) * 8;
}

function getPlannedRespShift() {
  const cal = getTargetCalyxBase();
  if (state.respMode === 'insp') return -8;
  if (state.respMode === 'exp') return +8;
  return cal.supracostal ? +8 : -8;
}

function getExactCoaxialCArm(pitchDeg, corDeg) {
  const pRad = pitchDeg * Math.PI / 180;
  const cRad = corDeg * Math.PI / 180;
  const dx = -Math.sin(pRad) * Math.cos(cRad);
  const dy = Math.sin(pRad) * Math.sin(cRad);
  const dz = Math.cos(pRad);

  const aRad = Math.atan2(-dx, dz);
  const z1 = -dx * Math.sin(aRad) + dz * Math.cos(aRad);
  const bRad = Math.atan2(dy, z1);

  return {
    ax: Math.round(aRad * 180 / Math.PI),
    ob: Math.round(bRad * 180 / Math.PI)
  };
}

function getTrueCalyxAngles(cal) {
  return {
    trueCorDeg: cal.coronalDeg,
    trueAxDeg: cal.axialDeg
  };
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

// ============================================================================
// ANATOMICAL CALIBRATION OF CASES (REALISTIC AXIAL & CORONAL DIVERSITY)
// ============================================================================
(function calibrateAnatomicalCases() {
  const sLat = document.getElementById('sLat');
  const sCC  = document.getElementById('sCC');
  const sCor = document.getElementById('sCor');
  if (sLat) { sLat.min = "0.5"; sLat.max = "8.0"; }
  if (sCC)  { sCC.min = "-6.0"; sCC.max = "5.0"; }
  if (sCor) { sCor.min = "-75";  sCor.max = "75"; }

  const axialProfileByCase = [
    { lower_lat: 30, lower_med: 20, middle: 28, upper: 16 }, // Case 1: Standard Brödel Kidney
    { lower_lat: 38, lower_med: 22, middle: 32, upper: 18 }, // Case 2: Hodson Branched Staghorn
    { lower_lat: 26, lower_med: 18, middle: 28, upper: 15 }, // Case 3: Subcostal Rib-Blocked
    { lower_lat: 28, lower_med: 20, middle: 26, upper: 16 }, // Case 4: Supracostal Upper-Pole
    { lower_lat: 40, lower_med: 24, middle: 34, upper: 18 }, // Case 5: Obese Deep Tract (108mm)
    { lower_lat: 16, lower_med: 12, middle: 14, upper: 12 }  // Case 6: Malrotated Horseshoe Kidney
  ];

  CASES.forEach((c, idx) => {
    if (c.calyces.upper && idx !== 5) {
      c.calyces.upper.x = c.pelvis.x + 25;
      c.calyces.upper.y = c.rib12Y + 6;
      c.calyces.upper.supracostal = true;
    }

    const pel = c.pelvis;
    const axMap = axialProfileByCase[idx] || axialProfileByCase[0];
    Object.keys(c.calyces).forEach(k => {
      const cal = c.calyces[k];
      if (axMap[k] !== undefined) cal.axialDeg = axMap[k];

      const dx = cal.x - pel.x;
      const dy = pel.y - cal.y;
      cal.coronalDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI * 2) / 2;
    });
  });

  // Make PEDAL button work smoothly on mobile touch-and-hold
  const pedalBtn = document.getElementById('pedalBtn');
  if (pedalBtn) {
    pedalBtn.style.touchAction = 'none';
    pedalBtn.addEventListener('pointerdown', e => { e.preventDefault(); startPedal(); });
    pedalBtn.addEventListener('pointerup', e => { e.preventDefault(); stopPedal(); });
    pedalBtn.addEventListener('pointercancel', () => stopPedal());
  }

  // Inject Error Scenario Selector next to Auto-Solve
  const autoBtn = document.getElementById('autoPlayBtn');
  if (autoBtn && !document.getElementById('errorScenarioSelect')) {
    const sel = document.createElement('select');
    sel.id = 'errorScenarioSelect';
    sel.style.borderColor = '#f59e0b';
    sel.style.color = '#fde047';
    sel.style.fontWeight = '600';
    sel.innerHTML = `
      <option value="auto_smart">Auto-Solve: Smart (Fixes Your Current Position or Ideal)</option>
      <option value="ideal">Auto-Solve: Ideal Textbook Trajectory</option>
      <option value="err_shallow">Demo Fix 1: Too Shallow / Posterior (Superficial Pass)</option>
      <option value="err_deep">Demo Fix 2: Too Deep / Anterior (Deep Overshoot Pass)</option>
      <option value="err_coronal">Demo Fix 3: Out-of-Plane Coronal Drift (Off 0° Line / Dog-Leg)</option>
      <option value="err_bullseye">Demo Fix 4: Bull's Eye Coaxial Drift (Shaft Line → Dot Fix)</option>
    `;
    sel.addEventListener('change', () => stopAutoSolve(true));
    autoBtn.parentNode.insertBefore(sel, autoBtn);
  }
})();

function computeOptimalGeometryForTechnique(techMode) {
  const cal = getTargetCalyxBase();
  const respMode = cal.supracostal ? 'exp' : 'insp';
  const trueCorDeg = cal.coronalDeg;
  const trueAxDeg = cal.axialDeg;

  const radCor = trueCorDeg * Math.PI / 180;
  const radAx = trueAxDeg * Math.PI / 180;
  const surfDistMm = cal.z * Math.tan(radAx);

  let latCm, ccCm, corDeg;
  if (techMode === 'bullseye') {
    corDeg = 0;
    ccCm = 0;
    latCm = Math.round((surfDistMm / 10) * 10) / 10;
  } else {
    latCm = Math.round(((surfDistMm * Math.cos(radCor)) / 10) * 10) / 10;
    latCm = Math.max(1.2, Math.min(5.5, latCm));
    ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
    ccCm = Math.max(-5.5, Math.min(4.2, ccCm));
    corDeg = trueCorDeg;
  }

  if (cal.forceSubcostal) {
    ccCm = -2.0;
    corDeg = Math.round(Math.atan2(-ccCm, latCm) * 180 / Math.PI * 2) / 2;
  }

  const surfMm = Math.hypot(latCm * 10, ccCm * 10);
  const pitchDeg = Math.round(Math.atan2(surfMm, cal.z) * 180 / Math.PI * 2) / 2;
  const tractDistMm = Math.round(Math.hypot(surfMm, cal.z));
  const fasciaDepthMm = Math.round(26 / Math.cos(pitchDeg * Math.PI / 180));

  const pRad = pitchDeg * Math.PI / 180;
  const cRad = corDeg * Math.PI / 180;
  const nDir = {
    x: -Math.sin(pRad) * Math.cos(cRad),
    y: Math.sin(pRad) * Math.sin(cRad),
    z: Math.cos(pRad)
  };
  const infDir = getInfundibularUnitVector(cal);
  const dot = Math.max(-1, Math.min(1, nDir.x * infDir.x + nDir.y * infDir.y + nDir.z * infDir.z));
  const dogLegDeg = Math.acos(dot) * 180 / Math.PI;
  const coaxCArm = getExactCoaxialCArm(pitchDeg, corDeg);

  return {
    respMode,
    latCm,
    ccCm,
    corDeg,
    pitchDeg,
    trueAxDeg: coaxCArm.ax,
    trueObDeg: coaxCArm.ob,
    calyxAxDeg: cal.axialDeg,
    trueCorDeg,
    tractDistMm,
    fasciaDepthMm,
    dogLegDeg
  };
}

// ============================================================================
// CASE INITIALIZATION — STARTS IN UNASSISTED MANUAL MODE BY DEFAULT!
// ============================================================================
// ============================================================================
// CASE INITIALIZATION — MANUAL OR HAND-CONTROL + GOD-MODE TELEMETRY ON!
// Replace from `function initCase` to the end of physics.js with this block
// ============================================================================
function initCase(idx, keepCalyx = false) {
  stopAutoSolve(true);
  state.caseIdx = idx;
  const c = CASES[idx];
  if (!keepCalyx) {
    state.targetKey = c.defaultCalyx;
    document.getElementById('calyxSelect').value = state.targetKey;
  }

  // 1. OR-LEVEL MANUAL DIFFICULTY:
  // Needle starts unaligned at a neutral flank position in Tidal breathing.
  // You must manually lock respiration, place Point B, and aim Coronal & Pitch!
  state.pointAMarked = true; // Keep true infundibular axis line visible in God-View!
  state.respMode = 'tidal';
  const respLabels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
  document.getElementById('btnResp').textContent = respLabels[state.respMode];

  state.cArmAx = 0;
  state.cArmOb = 0;
  state.latCm = 3.5;
  state.ccCm = -1.0;
  state.corDeg = 0.0;
  state.pitchDeg = 22.0;
  state.dilPitchDeg = 22.0;
  state.depthMm = 0;

  state.visited0AP = true;
  state.visited30Ax = false;
  state.visited30Ob = false;

  state.blushClouds = [];
  document.getElementById('clearBlushBtn').style.display = 'none';

  state.styletPulled = false;
  state.terumoTorqueDeg = 180;
  state.wireAdvMm = 0;
  state.wireInPelvis = false;
  state.kumpeAdvanced = false;
  state.stiffWireExchanged = false;

  state.rodDepthMm = 0;
  state.sheathDepthMm = 0;
  state.wireKinked = false;
  state.scopeSweepDeg = 0;
  state.blindRevealed = false;
  state.lihDirty = true;

  document.getElementById('btnKumpe').classList.remove('active');
  document.getElementById('btnStiff').classList.remove('active');
  document.getElementById('narrationBanner').classList.remove('visible');

  setStage(1);
  syncAllUI();
  updateDiagnosticsAndCoach();
}

function resetCase() { initCase(state.caseIdx, true); }
