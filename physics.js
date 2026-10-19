// ============================================================================
// PCNL PUNCTURE SIMULATOR v6.5 — PURE PUNCTURE PHYSICS & AUTO-REVIEW ENGINE
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
    { lower_lat: 30, lower_med: 20, middle: 28, upper: 16 },
    { lower_lat: 38, lower_med: 22, middle: 32, upper: 18 },
    { lower_lat: 26, lower_med: 18, middle: 28, upper: 15 },
    { lower_lat: 28, lower_med: 20, middle: 26, upper: 16 },
    { lower_lat: 40, lower_med: 24, middle: 34, upper: 18 },
    { lower_lat: 16, lower_med: 12, middle: 14, upper: 12 }
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

  const pedalBtn = document.getElementById('pedalBtn');
  if (pedalBtn) {
    pedalBtn.style.touchAction = 'none';
    pedalBtn.addEventListener('pointerdown', e => { e.preventDefault(); startPedal(); });
    pedalBtn.addEventListener('pointerup', e => { e.preventDefault(); stopPedal(); });
    pedalBtn.addEventListener('pointercancel', () => stopPedal());
  }

  const autoBtn = document.getElementById('autoPlayBtn');
  if (autoBtn && !document.getElementById('errorScenarioSelect')) {
    const sel = document.createElement('select');
    sel.id = 'errorScenarioSelect';
    sel.style.borderColor = '#f59e0b';
    sel.style.color = '#fde047';
    sel.style.fontWeight = '600';
    sel.innerHTML = `
      <option value="auto_smart">Auto-Solve: Smart (Fixes Your Position or Ideal)</option>
      <option value="ideal">Auto-Solve: Ideal Textbook Puncture</option>
      <option value="err_shallow">Demo Fix 1: Too Shallow / Posterior Pass</option>
      <option value="err_deep">Demo Fix 2: Too Deep / Anterior Overshoot</option>
      <option value="err_coronal">Demo Fix 3: Out-of-Plane Coronal Dog-Leg</option>
      <option value="err_bullseye">Demo Fix 4: Bull's Eye Coaxial Drift Fix</option>
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
    respMode, latCm, ccCm, corDeg, pitchDeg,
    trueAxDeg: coaxCArm.ax, trueObDeg: coaxCArm.ob,
    calyxAxDeg: cal.axialDeg, trueCorDeg,
    tractDistMm, fasciaDepthMm, dogLegDeg
  };
}

function initCase(idx, keepCalyx = false) {
  stopAutoSolve(true);
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
  updateDiagnosticsAndCoach();
}

function resetCase() { initCase(state.caseIdx, true); }

function buildAutoSolutionSteps() {
  const cal = getTargetCalyxBase();
  const tech = state.coachMode;
  const opt = computeOptimalGeometryForTechnique(tech);
  const modeSel = document.getElementById('errorScenarioSelect');
  const scenarioMode = modeSel ? modeSel.value : 'auto_smart';

  const techTitle = tech === 'hybrid' ? `HYBRID (0° LINE + ${opt.calyxAxDeg}° COAXIAL)` :
                    (tech === 'triangulation' ? 'CLASSIC BIPLANAR TRIANGULATION' : `PURE ${opt.calyxAxDeg}° BULL'S EYE`);

  const steps = [];
  const pitchErr = state.pitchDeg - opt.pitchDeg;
  const corErr = state.corDeg - opt.corDeg;
  const latErr = Math.abs(state.latCm - opt.latCm) + Math.abs(state.ccCm - opt.ccCm);
  const userHasError = (Math.abs(pitchErr) >= 2.5 || Math.abs(corErr) >= 4.0 || latErr >= 0.4 || !state.clampOn) && state.depthMm > 5;

  const getDepthAtCalyxX = (pDeg, cDeg, latMm) => {
    const pRad = pDeg * Math.PI / 180;
    const cRad = cDeg * Math.PI / 180;
    const dxUnit = Math.sin(pRad) * Math.cos(cRad);
    return Math.min(125, Math.max(35, Math.round(latMm / Math.max(0.2, dxUnit))));
  };

  if (scenarioMode === 'auto_smart' && userHasError) {
    const isCoronalBad = Math.abs(corErr) >= 4.0 || latErr >= 0.4;
    const isPitchBad = Math.abs(pitchErr) >= 2.5;

    steps.push({
      title: `DIAGNOSING YOUR TRAJECTORY ERROR`,
      techLabel: `LIVE ERROR DIAGNOSIS`,
      duration: 3.4,
      target: { cArmAx: 0, cArmOb: isPitchBad && !isCoronalBad ? 30 : 0 },
      narration: `${isCoronalBad ? `<b>Plane 1 Coronal Drift (${state.corDeg.toFixed(1)}° vs ideal ${opt.corDeg.toFixed(1)}°):</b> Off the infundibular axis on 0° AP view, creating a ${computeDiagnostics().dogLegDeg.toFixed(0)}° dog-leg. ` : ''}` +
        `${isPitchBad ? (pitchErr > 0
          ? `<b>Plane 2 Depth Error (Pitch ${state.pitchDeg.toFixed(1)}° Too Shallow):</b> Passing posteriorly behind the calyx (shifts UPWARD on +30° Ceph tilt).`
          : `<b>Plane 2 Depth Error (Pitch ${state.pitchDeg.toFixed(1)}° Too Steep):</b> Plunging anteriorly in front of the calyx (shifts DOWNWARD on +30° Ceph tilt).`) : ''}`
    });

    if (state.depthMm > 26) {
      steps.push({
        title: `RETRACT TO SUBCUTANEOUS FAT BEFORE PIVOTING`,
        techLabel: `PARENCHYMAL PROTECTION`,
        duration: 2.6,
        target: { clampOn: true, depthMm: 18 },
        narration: `<b>Critical OR Rule:</b> Retracting needle back to <b>18 mm (Subcutaneous Fat)</b> before changing angle so the shaft doesn't shear the lumbodorsal fascia or renal parenchyma.`
      });
    }

    steps.push({
      title: `REALIGN PLANE 1 (0° AP) & PLANE 2 (PITCH)`,
      techLabel: `BIPLANAR CORRECTION`,
      duration: 3.2,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 30, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4 },
      narration: `<b>Locking Ideal Geometry:</b> Point B set to <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b>, Coronal Aim <b>${opt.corDeg}°</b>, and Pitch <b>${opt.pitchDeg}°</b>.`
    });
  } else if (scenarioMode === 'err_shallow') {
    const shallowPitch = Math.min(55, opt.pitchDeg + 12);
    const apparentDepth = getDepthAtCalyxX(shallowPitch, opt.corDeg, opt.latCm * 10);
    steps.push({
      title: `DEMO 1: TOO SHALLOW / POSTERIOR PASS ON 0° AP`,
      techLabel: `DEPTH ILLUSION`,
      duration: 3.0,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: shallowPitch, depthMm: apparentDepth },
      narration: `On <b>0° AP</b>, the tip looks centered over the calyx, but Pitch (<b>${shallowPitch.toFixed(1)}°</b>) is too flat—passing superficially behind the kidney!`
    });
    steps.push({
      title: `DEMO 1: +30° CEPHALAD PARALLAX REVEALS SHALLOW PASS`,
      techLabel: `+30° CEPH PARALLAX`,
      duration: 3.2,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: shallowPitch, depthMm: apparentDepth },
      narration: `Tilting C-arm to <b>+30° Cephalad</b> exposes the truth: the superficial needle shifts <b>UPWARD (cephalad)</b> relative to the calyx!`
    });
    steps.push({
      title: `DEMO 1: RETRACT TO 18MM FAT & STEEPEN PITCH`,
      techLabel: `SAFE PIVOT FIX`,
      duration: 3.0,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: opt.pitchDeg, depthMm: 18 },
      narration: `Retracting to <b>18 mm</b> and steepening Pitch from <b>${shallowPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>.`
    });
  } else if (scenarioMode === 'err_deep') {
    const deepPitch = Math.max(12, opt.pitchDeg - 9.5);
    const apparentDepth = getDepthAtCalyxX(deepPitch, opt.corDeg, opt.latCm * 10);
    steps.push({
      title: `DEMO 2: TOO DEEP / ANTERIOR OVERSHOOT`,
      techLabel: `ANTERIOR TRAP`,
      duration: 3.0,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: deepPitch, depthMm: apparentDepth },
      narration: `Held too vertical (Pitch <b>${deepPitch.toFixed(1)}°</b> vs ideal <b>${opt.pitchDeg.toFixed(1)}°</b>), plunging deep (anterior) to the posterior calyx!`
    });
    steps.push({
      title: `DEMO 2: +30° CEPHALAD PARALLAX REVEALS DEEP PASS`,
      techLabel: `+30° CEPH PARALLAX`,
      duration: 3.2,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: deepPitch, depthMm: apparentDepth },
      narration: `On <b>+30° Cephalad</b> tilt, a needle deeper/anterior than the calyx shifts <b>DOWNWARD (caudally)</b> below the target cup!`
    });
    steps.push({
      title: `DEMO 2: RETRACT TO 18MM FAT & FLATTEN PITCH`,
      techLabel: `SAFE PIVOT FIX`,
      duration: 3.0,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: opt.pitchDeg, depthMm: 18 },
      narration: `Retracting to <b>18 mm</b> and flattening Pitch from <b>${deepPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>.`
    });
  } else if (scenarioMode === 'err_coronal') {
    const badCor = Math.max(-55, opt.corDeg - 26);
    steps.push({
      title: `DEMO 3: CORONAL DOG-LEG DRIFT (OFF 0° LINE)`,
      techLabel: `PLANE 1 ERROR`,
      duration: 3.2,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: 0.0, corDeg: badCor, pitchDeg: opt.pitchDeg, depthMm: 45 },
      narration: `Entering off the infundibular axis (Coronal <b>${badCor.toFixed(1)}°</b> vs <b>${opt.corDeg.toFixed(1)}°</b>) creates a severe dog-leg kink!`
    });
    steps.push({
      title: `DEMO 3: RETRACT & LOCK ONTO 0° INFUNDIBULAR LINE`,
      techLabel: `PLANE 1 FIX`,
      duration: 3.0,
      target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 12 },
      narration: `Retracting to fat and aligning Point B (<b>CC=${opt.ccCm}cm</b>) and Coronal Aim (<b>${opt.corDeg}°</b>) with the infundibulum.`
    });
  } else if (scenarioMode === 'err_bullseye') {
    steps.push({
      title: `DEMO 4: BULL'S EYE COAXIAL LOSS (SHAFT LINE)`,
      techLabel: `${opt.trueAxDeg}° OBLIQUE DRIFT`,
      duration: 3.2,
      target: { respMode: opt.respMode, cArmAx: opt.trueAxDeg, cArmOb: opt.trueObDeg, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg + 14, pitchDeg: opt.pitchDeg - 9, depthMm: 22 },
      narration: `At the coaxial C-arm angle (<b>${opt.trueAxDeg}° Axial</b>), hub drift turns the Bull's Eye dot into an elongated line.`
    });
    steps.push({
      title: `DEMO 4: PIVOT HUB OVER TIP TO RESTORE DOT`,
      techLabel: `COAXIAL LOCK`,
      duration: 3.0,
      target: { cArmAx: opt.trueAxDeg, cArmOb: opt.trueObDeg, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4 },
      narration: `Tilting the hub directly over the tip collapses the shaft into a single coaxial dot (<b>◎</b>).`
    });
  }

  if (steps.length === 0) {
    steps.push({
      title: `RESPIRATORY LOCK & C-ARM SETUP`,
      techLabel: techTitle,
      duration: 2.5,
      target: { respMode: opt.respMode, cArmAx: tech === 'bullseye' ? opt.trueAxDeg : 0, cArmOb: tech === 'bullseye' ? opt.trueObDeg : 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 0 },
      narration: cal.supracostal
        ? `<b>Supracostal (${cal.label}):</b> Locking <b>Exp Hold</b> so the pleura retracts cephalad.`
        : `<b>Subcostal (${cal.label}):</b> Locking <b>Insp Hold</b> to push the kidney below the 12th rib.`
    });
    steps.push({
      title: `POINT B & SKIN DERMIS PUNCTURE (3 MM)`,
      techLabel: techTitle,
      duration: 2.6,
      target: { cArmAx: tech === 'bullseye' ? opt.trueAxDeg : 0, cArmOb: tech === 'bullseye' ? opt.trueObDeg : 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 3 },
      narration: `Point B set at <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b> along the <b>${opt.corDeg}°</b> coronal axis. Piercing skin dermis (3 mm).`
    });
    steps.push({
      title: `LUMBODORSAL FASCIA PUNCTURE [1ST POP]`,
      techLabel: techTitle,
      duration: 3.0,
      target: { cArmAx: tech === 'triangulation' ? 0 : opt.trueAxDeg, cArmOb: tech === 'triangulation' ? 0 : opt.trueObDeg, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4 },
      narration: `Punching through the <b>Lumbodorsal Fascia at ${opt.fasciaDepthMm} mm [1st Tactile Pop: 6.8 N]</b>.`
    });
    steps.push({
      title: `BIPLANAR DEPTH & PARALLAX CHECK`,
      techLabel: techTitle,
      duration: 2.8,
      target: { cArmAx: 0, cArmOb: tech === 'triangulation' ? 30 : 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm - 10 },
      narration: `Verifying trajectory across Gerota's fat (<b>${opt.tractDistMm - 10} mm</b>) before entering the renal capsule.`
    });
  }

  steps.push({
    title: `CAPSULAR DIMPLE & TRANSPAPILLARY ENTRY [2ND POP]`,
    techLabel: techTitle,
    duration: 3.0,
    target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
    onArrive: () => { pullStylet(true); },
    narration: `<b>2nd Tactile Pop (${opt.tractDistMm} mm):</b> Watch the calyceal cup dimple and pop dead-center through the avascular papilla (Dog-leg: <b>${opt.dogLegDeg.toFixed(1)}°</b>)!`
  });

  steps.forEach((s, idx) => { s.title = `STEP ${idx + 1}/${steps.length}: ${s.title}`; });
  return steps;
}

function toggleAutoSolve() {
  if (state.autoPlaying) { stopAutoSolve(false); return; }
  const isFinished = state.autoSteps.length > 0 && state.autoStepIdx >= state.autoSteps.length - 1 && state.autoStepTimer >= state.autoSteps[state.autoStepIdx].duration;
  if (!state.autoSteps || state.autoSteps.length === 0 || isFinished) {
    state.autoSteps = buildAutoSolutionSteps();
    state.autoStepIdx = 0;
    state.autoStepTimer = 0;
  }
  state.autoPlaying = true;
  const btn = document.getElementById('autoPlayBtn');
  btn.textContent = `⏸ Pause (${state.autoStepIdx + 1}/${state.autoSteps.length})`;
  btn.classList.add('playing');
  applyAutoStepStart(state.autoStepIdx);
}

function stopAutoSolve(resetProgress = false) {
  state.autoPlaying = false;
  if (resetProgress) { state.autoSteps = []; state.autoStepIdx = 0; state.autoStepTimer = 0; }
  const btn = document.getElementById('autoPlayBtn');
  if (!btn) return;
  btn.classList.remove('playing');
  btn.textContent = '▶ Auto-Solve';
}

function stepAutoSolve(dir) {
  stopAutoSolve(false);
  if (!state.autoSteps || state.autoSteps.length === 0) {
    state.autoSteps = buildAutoSolutionSteps();
    state.autoStepIdx = 0;
  } else {
    state.autoStepIdx = Math.max(0, Math.min(state.autoSteps.length - 1, state.autoStepIdx + dir));
  }
  state.autoStepTimer = 0;
  applyAutoStepInstant(state.autoStepIdx);
  stopAutoSolve(false);
}

function applyAutoStepStart(idx) {
  const st = state.autoSteps[idx];
  if (!st) return;
  if (st.target.respMode) {
    state.respMode = st.target.respMode;
    const labels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
    document.getElementById('btnResp').textContent = labels[state.respMode];
  }
  const banner = document.getElementById('narrationBanner');
  banner.classList.add('visible');
  document.getElementById('narrationStepTitle').textContent = st.title;
  document.getElementById('narrationTechLabel').textContent = st.techLabel;
  document.getElementById('narrationBody').innerHTML = st.narration;
}

function applyAutoStepInstant(idx) {
  applyAutoStepStart(idx);
  const st = state.autoSteps[idx];
  const t = st.target;
  if (t.cArmAx !== undefined) state.cArmAx = t.cArmAx;
  if (t.cArmOb !== undefined) state.cArmOb = t.cArmOb;
  if (t.latCm !== undefined) state.latCm = t.latCm;
  if (t.ccCm !== undefined) state.ccCm = t.ccCm;
  if (t.corDeg !== undefined) state.corDeg = t.corDeg;
  if (t.pitchDeg !== undefined) state.pitchDeg = t.pitchDeg;
  if (t.depthMm !== undefined) state.depthMm = t.depthMm;
  if (st.onArrive) st.onArrive();
  markCArmVisited();
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
}

function tickAutoSolve(dt) {
  if (!state.autoPlaying || !state.autoSteps.length) return;
  const speed = parseFloat(document.getElementById('autoSpeedSelect').value || '1.0');
  const st = state.autoSteps[state.autoStepIdx];
  state.autoStepTimer += dt * speed;

  const t = st.target;
  const lerpRate = Math.min(1, dt * speed * 3.2);
  const lerp = (a, b) => a + (b - a) * lerpRate;

  if (t.cArmAx !== undefined) state.cArmAx = Math.round(lerp(state.cArmAx, t.cArmAx) * 10) / 10;
  if (t.cArmOb !== undefined) state.cArmOb = Math.round(lerp(state.cArmOb, t.cArmOb) * 10) / 10;
  if (t.latCm !== undefined) state.latCm = Math.round(lerp(state.latCm, t.latCm) * 100) / 100;
  if (t.ccCm !== undefined) state.ccCm = Math.round(lerp(state.ccCm, t.ccCm) * 100) / 100;
  if (t.corDeg !== undefined) state.corDeg = Math.round(lerp(state.corDeg, t.corDeg) * 10) / 10;
  if (t.pitchDeg !== undefined) state.pitchDeg = Math.round(lerp(state.pitchDeg, t.pitchDeg) * 10) / 10;
  if (t.depthMm !== undefined) state.depthMm = lerp(state.depthMm, t.depthMm);

  markCArmVisited();
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();

  if (state.autoStepTimer >= st.duration) {
    applyAutoStepInstant(state.autoStepIdx);
    if (state.autoStepIdx < state.autoSteps.length - 1) {
      state.autoStepIdx++;
      state.autoStepTimer = 0;
      applyAutoStepStart(state.autoStepIdx);
    } else {
      stopAutoSolve(false);
    }
  }
}

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
  stopAutoSolve(true);
  updateDiagnosticsAndCoach();
});

const bindSlider = (id, fn) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', e => {
    stopAutoSolve(false);
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
  stopAutoSolve(false);
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
  stopAutoSolve(false);
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
  stopAutoSolve(false);
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
  stopAutoSolve(false);
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
  stopAutoSolve(false);
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
  const y2 = dy * Math.cos(b) - z1 * Math.sin(b);
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
  const yAtRib = ng.skinEntry.y + ng.dir.y * tRib;
  const ribHit = state.depthMm >= tRib && Math.abs(yAtRib - c.rib12Y) < 4.2;
  const intercostalHit = state.depthMm >= tRib && (c.rib12Y - yAtRib > 0 && c.rib12Y - yAtRib < 6.0);
  const pleuraBorderY = c.pleuraY + (state.respMode === 'insp' ? -10 : 5);
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
    tipZ: ng.tip.z, calZ: cal.z
  };
}

function updateDiagnosticsAndCoach() {
  const d = computeDiagnostics();
  const cal = getTargetCalyxBase();
  document.getElementById('tissueBadge').textContent = d.layer;
  document.getElementById('hapticLayerText').textContent = `HAPTIC: ${d.layer}`;
  document.getElementById('hapticForceVal').textContent = `${d.resistanceN.toFixed(1)} N`;
  document.getElementById('hapticFill').style.width = `${Math.min(100, (d.resistanceN / 7.5) * 100)}%`;

  const steps = [
    { done: state.respMode !== 'tidal', text: `1. Lock Respiration (${cal.supracostal ? 'Exp Hold for Supracostal' : 'Insp Hold'}).` },
    { done: state.visited0AP && d.coronalMismatch <= 8, text: "2. 0° AP View: Align Point B & Coronal Aim with infundibulum." },
    { done: state.depthMm >= 28, text: "3. Advance through Skin (3mm) & Lumbodorsal Fascia [1st Pop]." },
    { done: (state.visited30Ax || state.visited30Ob), text: "4. 30° Oblique / Ceph View: Verify coaxial depth & pitch." },
    { done: d.inTarget && state.styletPulled, text: "5. Enter Papilla [2nd Pop] & Pull Stylet for Puncture Review." }
  ];

  let curFound = false;
  document.getElementById('coachList').innerHTML = steps.map(s => {
    let cls = 'coach-item', sym = '[ ]';
    if (s.done) { cls += ' done'; sym = '[✓]'; }
    else if (!curFound) { cls += ' active'; sym = '[→]'; curFound = true; }
    return `<li class="${cls}"><span style="font-family:monospace;font-weight:700;">${sym}</span><span>${s.text}</span></li>`;
  }).join('');

  if (!state.styletPulled) {
    const badge = document.getElementById('statusBadge');
    const txt = document.getElementById('statusText');
    if (d.ribHit) {
      badge.className = 'badge-pill b-err'; badge.textContent = '12TH RIB PERIOSTEAL STRIKE';
      txt.innerHTML = 'Needle struck the 12th rib! Move Point B caudally and angle cephalad.';
    } else if (d.pleuraHit) {
      badge.className = 'badge-pill b-err'; badge.textContent = 'PLEURAL TRANGRESSION (HYDROTHORAX RISK)';
      txt.innerHTML = 'Supracostal needle crossed the pleura during inspiration. Switch to <b>Resp: Exp Hold</b>!';
    } else {
      badge.className = d.inTarget ? 'badge-pill b-ok' : 'badge-pill b-info';
      badge.textContent = `DOG-LEG: ${d.dogLegDeg.toFixed(1)}° | DEPTH: ${Math.round(state.depthMm)} MM | FORCE: ${d.resistanceN.toFixed(1)} N`;
      txt.innerHTML = `<b>${d.layer}</b> — Target: <b>${cal.label}</b> (Dist to papilla: <b>${d.distToCalyx.toFixed(1)} mm</b>).`;
    }
  }
}

// ============================================================================
// AUTOMATIC PATIENT- & CALYX-SPECIFIC PUNCTURE REVIEW ENGINE
// ============================================================================
function pullStylet(fromAutoSolve = false) {
  state.styletPulled = true;
  state.blindRevealed = true;
  state.lihDirty = true;

  const d = computeDiagnostics();
  const c = CASES[state.caseIdx];
  const cal = getTargetCalyxBase();
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  const badge = document.getElementById('statusBadge');
  const txt = document.getElementById('statusText');

  if (d.inTarget) {
    badge.className = 'badge-pill b-ok';
    badge.textContent = 'CLEAR URINE EFFLUX — TRANSPAPILLARY ENTRY!';
    txt.innerHTML = `Entered <b>${cal.label}</b> with a <b>${d.dogLegDeg.toFixed(1)}°</b> dog-leg angle.`;
  } else {
    badge.className = 'badge-pill b-err';
    badge.textContent = d.inInfundibulumWall ? 'VENOUS BLEEDING (INFUNDIBULAR NECK)' : (d.inAnt ? 'ANTERIOR CALYX TRAP' : 'DRY TAP — MISSED CALYX');
    txt.innerHTML = `Tip is in <b>${d.layer}</b> (${d.distToCalyx.toFixed(1)} mm from papilla). Review the debrief window to see why.`;
  }

  updateDiagnosticsAndCoach();
  if (!fromAutoSolve) openAutomaticPunctureReview(d, c, cal, opt);
}

function openAutomaticPunctureReview(d, c, cal, opt) {
  let score = 100;
  const howToImprove = [];
  const patientNotes = [];

  const dzErr = d.tipZ - d.calZ;
  if (!d.inTarget) {
    score -= 40;
    if (d.inInfundibulumWall) {
      howToImprove.push(`<b>Direct Infundibular Neck Puncture (Venous Hemorrhage):</b> You entered medial to the papillary cup directly into the infundibular wall, bypassing Brödel's avascular plane. Aim <b>8–10 mm more laterally</b> into the center of the calyceal cup.`);
    } else if (d.inAnt) {
      howToImprove.push(`<b>Anterior Calyx Trap:</b> You overshot the posterior calyx (${d.calZ} mm) and punctured the overlapping anterior calyx (${c.antCalyx.z} mm). Entering an anterior calyx forces a >90° hairpin turn into the renal pelvis.`);
    } else {
      if (Math.abs(dzErr) > 4) {
        if (dzErr < 0) {
          howToImprove.push(`<b>Passed Too Shallow / Posterior (by ${Math.abs(dzErr).toFixed(0)} mm):</b> Your needle pitch (<b>${state.pitchDeg.toFixed(1)}°</b>) was too flat relative to your skin entry, or you stopped short (${Math.round(state.depthMm)} mm vs ideal ${opt.tractDistMm} mm). On a <b>30° Cephalad</b> C-arm tilt, your needle tip shifts <i>upward</i> relative to the calyx—steepen your pitch toward <b>${opt.pitchDeg.toFixed(1)}°</b>.`);
        } else {
          howToImprove.push(`<b>Passed Too Deep / Anterior (by ${dzErr.toFixed(0)} mm):</b> Your needle pitch (<b>${state.pitchDeg.toFixed(1)}°</b>) was too vertical/steep compared to ideal (<b>${opt.pitchDeg.toFixed(1)}°</b>), plunging anteriorly past the posterior papilla. On a <b>30° Cephalad</b> tilt, your tip shifts <i>downward</i> below the calyx.`);
        }
      }
      if (d.coronalMismatch > 7) {
        howToImprove.push(`<b>Plane 1 Coronal Drift (${state.corDeg.toFixed(1)}° vs ideal ${opt.corDeg.toFixed(1)}°):</b> On the <b>0° AP view</b>, your needle trajectory was not aligned with the target calyx's infundibular axis.`);
      }
    }
  } else {
    howToImprove.push(`<b>Successful Transpapillary Entry:</b> You entered the lumen of <b>${cal.label}</b> (${d.distToCalyx.toFixed(1)} mm from the exact papillary center).`);
  }

  if (d.dogLegDeg <= 15) {
    howToImprove.push(`<b>Excellent Coaxial Alignment (Dog-Leg ${d.dogLegDeg.toFixed(1)}°):</b> Because your needle vector aligns within 15° of the infundibulum (Axial ${cal.axialDeg}°, Coronal ${cal.coronalDeg}°), a guidewire will glide straight into the renal pelvis and a 24Fr sheath will exert minimal parenchymal torque.`);
  } else if (d.dogLegDeg <= 28) {
    score -= 12;
    howToImprove.push(`<b>Moderate Dog-Leg Angle (${d.dogLegDeg.toFixed(1)}°):</b> Your coronal aim (${state.corDeg.toFixed(1)}°) or skin offset deviated from the ${cal.coronalDeg}° infundibular axis. To reduce torque, place Point B at <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b> and aim at <b>${opt.corDeg}°</b>.`);
  } else {
    score -= 25;
    howToImprove.push(`<b>Severe "Roof-Entry" Dog-Leg (${d.dogLegDeg.toFixed(1)}°):</b> Entering at a ${d.dogLegDeg.toFixed(0)}° angle to the infundibular neck causes guidewires to bounce off the opposite wall and risks tearing the infundibular neck during tract dilation! Move Point B caudally/laterally to <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b>.`);
  }

  if (cal.supracostal && state.respMode !== 'exp') {
    score -= 20;
    howToImprove.push(`<b>Supracostal Respiratory Error:</b> You punctured a supracostal calyx during <b>${state.respMode.toUpperCase()}</b>! Supracostal access must be performed in <b>Full Expiration (Exp Hold)</b> to keep the parietal pleura cephalad.`);
  } else if (!cal.supracostal && state.respMode === 'tidal') {
    score -= 8;
    howToImprove.push(`<b>Unlocked Tidal Respiration:</b> Puncturing during tidal breathing causes a "windshield-wiper" pendulum swing of the kidney. Lock <b>Insp Hold</b> before crossing the renal capsule.`);
  }
  if (state.pivotedDeep) {
    score -= 18;
    howToImprove.push(`<b>Parenchymal Shear Warning:</b> You pivoted the needle angle by >5° while the tip was buried deep past the lumbodorsal fascia (>42 mm). Always retract to subcutaneous fat (<22 mm) before redirecting!`);
  }
  if (d.ribHit || d.intercostalHit) {
    score -= 25;
    howToImprove.push(`<b>Costal / Subcostal Neurovascular Hazard:</b> Your tract struck the 12th rib or the subcostal neurovascular bundle running along its inferior margin. Shift Point B caudally (CC = ${opt.ccCm} cm) and triangulate cephalad.`);
  }
  if (d.colonRisk) {
    score -= 25;
    howToImprove.push(`<b>Retroperitoneal Colon Hazard:</b> Your skin entry (L=${state.latCm.toFixed(1)} cm) is too far lateral (beyond the Posterior Axillary Line). Keep L near <b>${opt.latCm} cm</b>.`);
  }

  if (state.targetKey !== c.defaultCalyx) {
    const bestCal = c.calyces[c.defaultCalyx];
    patientNotes.push(`<b>Calyx Selection Note (${cal.label} vs. ${bestCal.label}):</b> You targeted <b>${cal.label}</b> (Stone Reach: <b>${cal.reachPct}%</b>, Neck Width: <b>${cal.neckW} mm</b>). For <b>${c.name}</b>, the preferred primary target is <b>${bestCal.label}</b> (Reach: <b>${bestCal.reachPct}%</b>, Neck: <b>${bestCal.neckW} mm</b>).`);
  } else {
    patientNotes.push(`<b>Optimal Calyx Choice (${cal.label}):</b> You selected the primary target calyx for this patient (Stone Clearance Reach: <b>${cal.reachPct}%</b>, Infundibular Width: <b>${cal.neckW} mm</b>, True Axial Angle: <b>${cal.axialDeg}°</b>).`);
  }

  if (state.targetKey === 'lower_med') {
    patientNotes.push(`<b>Why Sub-Apical Medial Calyces Are Tricky:</b> This calyx has a narrow neck (<b>${cal.neckW} mm</b>), steep coronal angle (<b>${cal.coronalDeg}°</b>), and more medial position (${cal.x} mm), giving only <b>${cal.reachPct}%</b> rigid scope reach and higher paraspinal muscle resistance.`);
  }

  const casePearls = [
    `<b>Case 1 Pearl (Standard Brödel Kidney):</b> The lower-lateral posterior calyx sits at a classic <b>30° axial</b> and <b>22° coronal</b> angle. Using the Hybrid technique (0° AP line + 30° ipsilateral Bull's Eye) gives a straight 78 mm coaxial tract.`,
    `<b>Case 2 Pearl (52° Steep Staghorn Neck):</b> A pure 30° Bull's Eye at 0° coronal creates a <b>52° dog-leg</b> against the impacted staghorn! Either drop Point B caudally (<b>CC = ${opt.ccCm} cm</b>, aiming <b>+${opt.corDeg}° cephalad</b>) OR puncture the <b>Upper-Pole Compound calyx</b> (96% reach) straight down the renal axis.`,
    `<b>Case 3 Pearl (Calyx Directly Under 12th Rib):</b> Because the target papilla lies directly beneath the 12th rib (Y=18mm), a straight Bull's Eye strikes bone. You must use <b>Subcostal Cephalad Triangulation</b>: enter at <b>CC = -2.0 cm</b> below the rib in <b>Insp Hold</b> and angle <b>+26° cephalad</b>.`,
    `<b>Case 4 Pearl (Supracostal 11th–12th ICS Staghorn):</b> Puncturing the upper-pole compound calyx above the 12th rib in <b>Full Expiration</b> avoids the pleura and provides a straight caudal vector (<b>-12° coronal</b>) with <b>98% reach</b> down to the lower pole and ureter.`,
    `<b>Case 5 Pearl (Morbid Obesity — 10.4 cm Depth):</b> At <b>${opt.tractDistMm} mm</b> tract length, a 3° pitch error misses the papilla by >6 mm! Furthermore, the posterior (${cal.z} mm) and anterior (${c.antCalyx.z} mm) calyces overlap on 0° AP—rotate the C-arm to <b>${cal.axialDeg}° Ipsilateral</b> to separate them.`,
    `<b>Case 6 Pearl (Horseshoe / Malrotated Kidney):</b> Failed rotation leaves the calyces pointing posteromedially (<b>${cal.axialDeg}° axial</b>) and the lower pole tethered anteriorly. The <b>Upper Posterolateral Calyx</b> is subcostal, superficial (62 mm), and gives <b>97% reach</b>!`
  ];
  patientNotes.push(casePearls[state.caseIdx]);

  const grade = score >= 90 ? 'A' : (score >= 78 ? 'B' : (score >= 62 ? 'C' : (score >= 45 ? 'D' : 'F')));
  const gradeCol = { A: '#4ade80', B: '#facc15', C: '#fb923c', D: '#f87171', F: '#ef4444' }[grade];

  document.getElementById('revCaseTitle').textContent = `${c.name} — ${cal.label}`;
  document.getElementById('revVerdictSub').textContent = `${d.inTarget ? '✓ Intraluminal Papillary Entry' : '✗ Missed Target Lumen'} | Fluoro: ${state.fluoroSec.toFixed(1)}s | Attempts: ${Math.max(1, state.punctureAttempts)}`;
  const gBadge = document.getElementById('revGradeBadge');
  gBadge.textContent = grade;
  gBadge.style.color = gradeCol;

  document.getElementById('revCompareBody').innerHTML = `
    <tr>
      <td><b>Skin Entry (Point B)</b></td>
      <td>L=${state.latCm.toFixed(1)}cm, CC=${state.ccCm >= 0 ? '+' : ''}${state.ccCm.toFixed(1)}cm</td>
      <td>L=${opt.latCm.toFixed(1)}cm, CC=${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm.toFixed(1)}cm</td>
      <td>${Math.hypot(state.latCm - opt.latCm, state.ccCm - opt.ccCm) < 0.6 ? '<span style="color:#4ade80">Optimal Flank Window</span>' : '<span style="color:#fbbf24">Off Optimal Axis</span>'}</td>
    </tr>
    <tr>
      <td><b>Coronal Aim (Plane 1)</b></td>
      <td>${state.corDeg.toFixed(1)}°</td>
      <td>${opt.corDeg.toFixed(1)}°</td>
      <td>Dog-Leg Kink: <b>${d.dogLegDeg.toFixed(1)}°</b> (${d.dogLegDeg <= 18 ? 'Coaxial' : 'High Torque'})</td>
    </tr>
    <tr>
      <td><b>Needle Pitch (Plane 2)</b></td>
      <td>${state.pitchDeg.toFixed(1)}°</td>
      <td>${opt.pitchDeg.toFixed(1)}°</td>
      <td>${Math.abs(state.pitchDeg - opt.pitchDeg) <= 2.5 ? '<span style="color:#4ade80">Exact Depth Vector</span>' : (dzErr < 0 ? '<span style="color:#fbbf24">Too Flat (Shallow/Post.)</span>' : '<span style="color:#f87171">Too Steep (Deep/Ant.)</span>')}</td>
    </tr>
    <tr>
      <td><b>Tract Depth &amp; Tip</b></td>
      <td>${Math.round(state.depthMm)} mm (${d.distToCalyx.toFixed(1)}mm off)</td>
      <td>${opt.tractDistMm} mm (Papilla Center)</td>
      <td>${d.layer}</td>
    </tr>
  `;

  document.getElementById('revHowToImprove').innerHTML = howToImprove.map(i => `<li>${i}</li>`).join('');
  document.getElementById('revPatientCalyxNotes').innerHTML = patientNotes.map(i => `<li>${i}</li>`).join('');
  document.getElementById('punctureReviewModal').style.display = 'flex';
}

function applyIdealFixFromReview() {
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  autoTrigPointB();
  setExactDepth(opt.tractDistMm);
  document.getElementById('punctureReviewModal').style.display = 'none';
  pullStylet(true);
}

// ============================================================================
// FLUORO DEPTH SCRUBBER & END-ON PROFILE HUD
// ============================================================================
(function hookRendererUpgrades() {
  let lastFrameTime = performance.now();
  function postRenderOverlay() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    const isFiring = state.contFluoro || state.pedalDown || state.autoPlaying;
    if (isFiring) {
      state.fluoroSec += dt * 0.25;
      const fdEl = document.getElementById('dosePill');
      if (fdEl) fdEl.textContent = `${state.fluoroSec.toFixed(1)}s | ${(state.fluoroSec * 0.14).toFixed(2)} mGy`;
    }

    const fw = fluoroCanvas.width, fh = fluoroCanvas.height;
    if (fw > 0 && fh > 0) {
      const cal = getTargetCalyxBase();
      fCtx.save();
      if (Math.abs(state.cArmAx - cal.axialDeg) <= 5 && (!state.blindMode || isFiring)) {
        fCtx.fillStyle = 'rgba(16, 185, 129, 0.18)';
        fCtx.strokeStyle = '#10b981';
        fCtx.lineWidth = 1.5;
        fCtx.fillRect(14, fh - 42, 245, 26);
        fCtx.strokeRect(14, fh - 42, 245, 26);
        fCtx.fillStyle = '#6ee7b7';
        fCtx.font = 'bold 11px monospace';
        fCtx.fillText(`◎ CALYX END-ON PROFILE (${cal.axialDeg}° AXIAL)`, 22, fh - 25);
      }

      const sx = fw - 26, syTop = 44, syBot = fh - 44, sHeight = syBot - syTop;
      fCtx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      fCtx.strokeStyle = '#334155';
      fCtx.lineWidth = 1.2;
      fCtx.fillRect(sx - 10, syTop, 20, sHeight);
      fCtx.strokeRect(sx - 10, syTop, 20, sHeight);

      const yCur = syTop + Math.min(1, state.depthMm / 125) * sHeight;
      fCtx.fillStyle = '#38bdf8';
      fCtx.beginPath(); fCtx.arc(sx, yCur, 7, 0, Math.PI * 2); fCtx.fill();
      fCtx.fillStyle = '#94a3b8';
      fCtx.font = 'bold 9px monospace';
      fCtx.textAlign = 'right';
      fCtx.fillText(`${Math.round(state.depthMm)}mm`, sx - 13, yCur + 3);
      fCtx.restore();
    }
    requestAnimationFrame(postRenderOverlay);
  }
  requestAnimationFrame(postRenderOverlay);
})();
// === END OF FILE physics.js ===
