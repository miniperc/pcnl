// ============================================================================
// FILE 2/3: solver.js — OPTIMAL GEOMETRY & AUTO-SOLVE WALKTHROUGH ENGINE
// ============================================================================
(function initErrorScenarioDropdown() {
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
  const c = CASES[state.caseIdx];
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

  // For Supracostal Calyces: Place Point B right on the UPPER BORDER of the 12th rib!
  if (cal.supracostal && techMode !== 'bullseye') {
    const skinX = cal.x + latCm * 10;
    const rib12TopBorderY = getRibCenterYAtX(skinX, c.rib12Y) + 4.8; // +4.8mm = immediately above superior margin of 12th rib
    const calLiveY = cal.y + 6; // on Exp Hold (+6mm)
    ccCm = Math.round(((rib12TopBorderY - calLiveY) / 10) * 10) / 10;
    corDeg = Math.round(Math.atan2(-ccCm, latCm) * 180 / Math.PI * 2) / 2;
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
      duration: 3.2,
      target: { cArmAx: 0, cArmOb: isPitchBad && !isCoronalBad ? 30 : 0 },
      narration: `Correcting trajectory: aligning Point B to <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b>, Coronal <b>${opt.corDeg}°</b>, and Pitch <b>${opt.pitchDeg}°</b>.`
    });
    if (state.depthMm > 26) {
      steps.push({
        title: `RETRACT TO SUBCUTANEOUS FAT BEFORE PIVOTING`,
        techLabel: `SAFE PIVOT RULE`,
        duration: 2.5,
        target: { clampOn: true, depthMm: 18 },
        narration: `Retracting back to <b>18 mm (Subcutaneous Fat)</b> before pivoting so the shaft doesn't shear the renal cortex.`
      });
    }
    steps.push({
      title: `REALIGN PLANE 1 & PLANE 2`,
      techLabel: `BIPLANAR LOCK`,
      duration: 3.0,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 30, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4 },
      narration: `Trajectory locked at <b>Coronal ${opt.corDeg}°</b> and <b>Pitch ${opt.pitchDeg}°</b>.`
    });
  } else if (scenarioMode === 'err_shallow') {
    const shallowPitch = Math.min(55, opt.pitchDeg + 12);
    const apparentDepth = getDepthAtCalyxX(shallowPitch, opt.corDeg, opt.latCm * 10);
    steps.push({
      title: `DEMO 1: TOO SHALLOW / POSTERIOR PASS`,
      techLabel: `0° AP ILLUSION`,
      duration: 3.0,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: shallowPitch, depthMm: apparentDepth },
      narration: `Pitch (<b>${shallowPitch.toFixed(1)}°</b>) is too flat—passing superficially behind the calyx!`
    });
    steps.push({
      title: `DEMO 1: +30° CEPHALAD PARALLAX REVEALS SHALLOW PASS`,
      techLabel: `+30° CEPH PARALLAX`,
      duration: 3.2,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: shallowPitch, depthMm: apparentDepth },
      narration: `On <b>+30° Cephalad</b> tilt, the superficial needle projects <b>downward (caudally)</b> relative to the calyx. Retract to 18mm &amp; steepen pitch!`
    });
  } else if (scenarioMode === 'err_deep') {
    const deepPitch = Math.max(12, opt.pitchDeg - 9.5);
    const apparentDepth = getDepthAtCalyxX(deepPitch, opt.corDeg, opt.latCm * 10);
    steps.push({
      title: `DEMO 2: TOO DEEP / ANTERIOR OVERSHOOT`,
      techLabel: `ANTERIOR TRAP`,
      duration: 3.0,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: deepPitch, depthMm: apparentDepth },
      narration: `Pitch (<b>${deepPitch.toFixed(1)}°</b>) is too vertical—plunging deep (anterior) to the posterior calyx!`
    });
    steps.push({
      title: `DEMO 2: +30° CEPHALAD PARALLAX REVEALS DEEP PASS`,
      techLabel: `+30° CEPH PARALLAX`,
      duration: 3.2,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: deepPitch, depthMm: apparentDepth },
      narration: `On <b>+30° Cephalad</b> tilt, the deep needle projects <b>upward (cephalad)</b> above the calyx. Retract to 18mm &amp; flatten pitch!`
    });
  } else if (scenarioMode === 'err_coronal') {
    const badCor = Math.max(-55, opt.corDeg - 26);
    steps.push({
      title: `DEMO 3: CORONAL DOG-LEG DRIFT`,
      techLabel: `PLANE 1 ERROR`,
      duration: 3.0,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: 0.0, corDeg: badCor, pitchDeg: opt.pitchDeg, depthMm: 45 },
      narration: `Entering off the infundibular axis (<b>${badCor.toFixed(1)}°</b> vs <b>${opt.corDeg.toFixed(1)}°</b>) creates a dog-leg kink!`
    });
  } else if (scenarioMode === 'err_bullseye') {
    steps.push({
      title: `DEMO 4: BULL'S EYE COAXIAL LOSS (SHAFT LINE)`,
      techLabel: `${opt.trueAxDeg}° OBLIQUE DRIFT`,
      duration: 3.0,
      target: { respMode: opt.respMode, cArmAx: opt.trueAxDeg, cArmOb: opt.trueObDeg, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg + 14, pitchDeg: opt.pitchDeg - 9, depthMm: 22 },
      narration: `At the coaxial angle (<b>${opt.trueAxDeg}° Axial, ${opt.trueObDeg}° Tilt</b>), hub drift turns the Bull's Eye dot into a line.`
    });
  }

  if (steps.length === 0) {
    steps.push({
      title: `RESPIRATORY LOCK & C-ARM SETUP`,
      techLabel: techTitle,
      duration: 2.6,
      target: { respMode: opt.respMode, cArmAx: tech === 'bullseye' ? opt.trueAxDeg : 0, cArmOb: tech === 'bullseye' ? opt.trueObDeg : 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 0 },
      narration: cal.supracostal
        ? `<b>Supracostal Upper Border of 12th Rib (${cal.label}):</b> Locking <b>Exp Hold</b> and placing Point B immediately on the <b>superior border of the 12th rib</b> (L=${opt.latCm}cm, CC=${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm}cm) to avoid both the pleura and 11th subcostal artery.`
        : `<b>Subcostal Access (${cal.label}):</b> Locking <b>Insp Hold</b> to push the kidney below the 12th rib.`
    });
    steps.push({
      title: `SKIN DERMIS & FASCIA PUNCTURE [1ST POP]`,
      techLabel: techTitle,
      duration: 2.8,
      target: { cArmAx: tech === 'triangulation' ? 0 : opt.trueAxDeg, cArmOb: tech === 'triangulation' ? 0 : opt.trueObDeg, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4 },
      narration: `Skating over the upper border of the rib through the <b>Fascia at ${opt.fasciaDepthMm} mm [1st Tactile Pop]</b>.`
    });
    steps.push({
      title: `BIPLANAR DEPTH & PARALLAX CHECK`,
      techLabel: techTitle,
      duration: 2.8,
      target: { cArmAx: 0, cArmOb: tech === 'triangulation' ? 30 : 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm - 10 },
      narration: `Verifying depth across Gerota's fat (<b>${opt.tractDistMm - 10} mm</b>) before entering the capsule.`
    });
  }

  steps.push({
    title: `CAPSULAR DIMPLE & TRANSPAPILLARY ENTRY [2ND POP]`,
    techLabel: techTitle,
    duration: 3.0,
    target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
    onArrive: () => { pullStylet(true); },
    narration: `<b>2nd Tactile Pop (${opt.tractDistMm} mm):</b> Entering dead-center through the avascular papilla (Dog-leg: <b>${opt.dogLegDeg.toFixed(1)}°</b>)!`
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
// === END OF FILE solver.js ===
