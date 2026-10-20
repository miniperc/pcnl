// ============================================================================
// FILE: physics.js — v7.8 AUDITED ENGINE WITH DYNAMIC PER-CALYX/TECHNIQUE GUIDE
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

state.soundOn = false;
state.contFluoro = true;
state.assistedSnapped = false;
state.punctureAttempts = 0;
state.fasciaAnchored = false;
state.fasciaEntryPitch = 22.0;
state.fasciaEntryCor = 0.0;
state.pivotedDeep = false;
state.autoStartVals = {};

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
  return { ax: Math.round(aRad * 180 / Math.PI), ob: Math.round(bRad * 180 / Math.PI) };
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
  const oldPb = document.getElementById('profPlaybookCard');
  if (oldPb) oldPb.remove();

  const caseSel = document.getElementById('caseSelect');
  if (caseSel && CASES.length > 0) {
    caseSel.innerHTML = CASES.map((c, idx) => `<option value="${idx}">${c.name}</option>`).join('');
  }

  // Ensure Case 2 lower_lat has true 52° visual and mathematical slope
  if (CASES[1] && CASES[1].calyces && CASES[1].calyces.lower_lat) {
    CASES[1].calyces.lower_lat.x = 78;
    CASES[1].calyces.lower_lat.y = -22;
  }

  CASES.forEach((c, idx) => {
    const pel = c.pelvis;
    Object.keys(c.calyces).forEach(k => {
      const cal = c.calyces[k];
      if (k === 'upper') {
        if (idx !== 5) {
          cal.x = pel.x + 20;
          cal.y = c.rib12Y - 1;
          cal.coronalDeg = -8;
          cal.supracostal = true;
        } else {
          cal.supracostal = false;
          cal.coronalDeg = -8;
        }
      } else if (!cal.isDiverticulum) {
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
    corDeg = 0; ccCm = 0;
    latCm = Math.round((surfDistMm / 10) * 10) / 10;
  } else {
    latCm = Math.round(((surfDistMm * Math.cos(radCor)) / 10) * 10) / 10;
    latCm = Math.max(1.2, Math.min(5.5, latCm));
    ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
    ccCm = Math.max(-5.5, Math.min(4.2, ccCm));
    corDeg = trueCorDeg;
  }

  if (cal.supracostal && techMode !== 'bullseye') {
    const skinX = cal.x + latCm * 10;
    const rib12TopBorderY = getRibCenterYAtX(skinX, c.rib12Y) + 4.8;
    const calLiveY = cal.y + 6;
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
  const nDir = { x: -Math.sin(pRad) * Math.cos(cRad), y: Math.sin(pRad) * Math.sin(cRad), z: Math.cos(pRad) };
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
  document.getElementById('btnResp').textContent = 'Resp: Tidal';
  state.cArmAx = 0; state.cArmOb = 0;
  state.latCm = 3.5; state.ccCm = -1.0; state.corDeg = 0.0; state.pitchDeg = 22.0; state.depthMm = 0;
  state.punctureAttempts = 0; state.fasciaAnchored = false; state.pivotedDeep = false;
  state.wireAdvMm = 0; state.rodDepthMm = 0; state.sheathDepthMm = 0;
  state.visited0AP = true; state.visited30Ax = false; state.visited30Ob = false;
  state.blushClouds = [];
  document.getElementById('clearBlushBtn').style.display = 'none';
  state.styletPulled = false; state.blindRevealed = false;
  state.lihDirty = true;
  document.getElementById('narrationBanner').classList.remove('visible');
  const revModal = document.getElementById('punctureReviewModal');
  if (revModal) revModal.style.display = 'none';
  syncAllUI();
  updateDiagnosticsAndCoach();
}

function resetCase() { initCase(state.caseIdx, true); }

// ============================================================================
// DYNAMIC C-ARM AUTO-SOLVE & 5-STAGE WITHDRAW-REDIRECT-REINSERT DEMO ENGINE
// ============================================================================
function buildAutoSolutionSteps() {
  const cal = getTargetCalyxBase();
  const tech = state.coachMode;
  const opt = computeOptimalGeometryForTechnique(tech);
  const modeSel = document.getElementById('errorScenarioSelect');
  const scenarioMode = modeSel ? modeSel.value : 'auto_smart';
  const techTitle = tech === 'hybrid'
    ? `HYBRID (0° LINE → ${opt.calyxAxDeg}° IPSILATERAL → 0° AP DEPTH)`
    : (tech === 'triangulation' ? 'BIPLANAR TRIANGULATION (0° AP + 30° CEPH)' : `PURE ${opt.calyxAxDeg}° BULL'S EYE`);
  const steps = [];

  const getDepthAtCalyxX = (pDeg, cDeg, latMm) => {
    const dxUnit = Math.sin(pDeg * Math.PI / 180) * Math.cos(cDeg * Math.PI / 180);
    return Math.min(125, Math.max(45, Math.round(latMm / Math.max(0.2, dxUnit))));
  };

  const finishSteps = () => {
    steps.forEach((s, idx) => { s.title = `STEP ${idx + 1}/${steps.length}: ${s.title}`; });
    return steps;
  };

  if (scenarioMode === 'err_shallow') {
    const shallowPitch = Math.min(55, opt.pitchDeg + 12);
    const apD = getDepthAtCalyxX(shallowPitch, opt.corDeg, opt.latCm * 10);
    steps.push({
      title: `ADVANCE DEEP WITH SHALLOW PITCH (${shallowPitch.toFixed(1)}°)`, techLabel: `DEMO 1: SHALLOW ERROR`, duration: 4.5,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: shallowPitch, depthMm: apD },
      narration: `<b>Phase 1 (The 0° AP Illusion):</b> Advancing to <b>${apD} mm</b> with a Pitch that is too flat (<b>${shallowPitch.toFixed(1)}°</b> vs ideal <b>${opt.pitchDeg.toFixed(1)}°</b>). On 0° AP, the tip looks centered over the calyx, but it is actually passing superficially behind the kidney!`
    });
    steps.push({
      title: `TILT C-ARM TO +30° CEPHALAD TO EXPOSE PARALLAX`, techLabel: `DEMO 1: PARALLAX DIAGNOSIS`, duration: 4.5,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: shallowPitch, depthMm: apD },
      narration: `<b>Phase 2 (Exposing the Error):</b> Tilting C-arm to <b>+30° Cephalad</b> elongates the needle and shows the superficial tip projecting <b>downward (caudally)</b> below the target calyx!`
    });
    steps.push({
      title: `WITHDRAW NEEDLE STRAIGHT BACK TO 18 MM (KEEP ANGLE!)`, techLabel: `DEMO 1: SAFE WITHDRAWAL`, duration: 4.0,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: shallowPitch, depthMm: 18 },
      narration: `<b>Phase 3 (Withdraw Before Pivoting):</b> Pulling the needle straight back from <b>${apD} mm → 18 mm (Subcutaneous Fat)</b> while keeping Pitch constant (${shallowPitch.toFixed(1)}°) so we don't slice the kidney or bend the shaft at the fascia!`
    });
    steps.push({
      title: `REDIRECT (STEEPEN PITCH) WHILE IN SUBCUTANEOUS FAT`, techLabel: `DEMO 1: SAFE REDIRECTION`, duration: 3.8,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: opt.pitchDeg, depthMm: 18 },
      narration: `<b>Phase 4 (Redirect at 18 mm):</b> Now that the tip is above the lumbodorsal fascia, we safely raise the hub to steepen Pitch from <b>${shallowPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>.`
    });
    steps.push({
      title: `RE-INSERT COAXIALLY INTO PAPILLA (${opt.tractDistMm} MM)`, techLabel: `DEMO 1: RE-INSERTION`, duration: 4.8,
      target: { cArmAx: 0, cArmOb: 0, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
      onArrive: () => { pullStylet(true); },
      narration: `<b>Phase 5 (Re-Insert &amp; Pop):</b> Advancing along the corrected <b>${opt.pitchDeg.toFixed(1)}°</b> trajectory through a fresh fascial track straight into the center of the papilla (<b>${opt.tractDistMm} mm</b>)!`
    });
    return finishSteps();
  }

  if (scenarioMode === 'err_deep') {
    const deepPitch = Math.max(12, opt.pitchDeg - 9.5);
    const apD = getDepthAtCalyxX(deepPitch, opt.corDeg, opt.latCm * 10);
    steps.push({
      title: `ADVANCE DEEP WITH STEEP PITCH (${deepPitch.toFixed(1)}°)`, techLabel: `DEMO 2: DEEP OVERSHOOT`, duration: 4.5,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: deepPitch, depthMm: apD },
      narration: `<b>Phase 1 (The 0° AP Illusion):</b> Advancing to <b>${apD} mm</b> with a Pitch that is too vertical/steep (<b>${deepPitch.toFixed(1)}°</b> vs ideal <b>${opt.pitchDeg.toFixed(1)}°</b>). On 0° AP it looks centered, but it has plunged deep (anterior) to the posterior calyx!`
    });
    steps.push({
      title: `TILT C-ARM TO +30° CEPHALAD TO EXPOSE PARALLAX`, techLabel: `DEMO 2: PARALLAX DIAGNOSIS`, duration: 4.5,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: deepPitch, depthMm: apD },
      narration: `<b>Phase 2 (Exposing the Error):</b> On <b>+30° Cephalad</b> tilt, the overly deep (anterior) needle tip projects <b>upward (cephalad)</b> above the target calyceal cup!`
    });
    steps.push({
      title: `WITHDRAW NEEDLE STRAIGHT BACK TO 18 MM (KEEP ANGLE!)`, techLabel: `DEMO 2: SAFE WITHDRAWAL`, duration: 4.0,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: deepPitch, depthMm: 18 },
      narration: `<b>Phase 3 (Withdraw Before Pivoting):</b> Pulling straight back from <b>${apD} mm → 18 mm (Subcutaneous Fat)</b> before changing angle so the beveled tip doesn't lacerate the cortex.`
    });
    steps.push({
      title: `REDIRECT (FLATTEN PITCH) WHILE IN SUBCUTANEOUS FAT`, techLabel: `DEMO 2: SAFE REDIRECTION`, duration: 3.8,
      target: { cArmAx: 0, cArmOb: 30, pitchDeg: opt.pitchDeg, depthMm: 18 },
      narration: `<b>Phase 4 (Redirect at 18 mm):</b> Lowering the hub in subcutaneous fat to flatten Pitch from <b>${deepPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>.`
    });
    steps.push({
      title: `RE-INSERT COAXIALLY INTO PAPILLA (${opt.tractDistMm} MM)`, techLabel: `DEMO 2: RE-INSERTION`, duration: 4.8,
      target: { cArmAx: 0, cArmOb: 0, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
      onArrive: () => { pullStylet(true); },
      narration: `<b>Phase 5 (Re-Insert &amp; Pop):</b> Advancing from <b>18 mm → ${opt.tractDistMm} mm</b> along the corrected vector dead-center into the posterior papilla!`
    });
    return finishSteps();
  }

  if (scenarioMode === 'err_coronal') {
    const badCor = Math.max(-55, opt.corDeg - 26);
    steps.push({
      title: `ADVANCE DEEP OFF-AXIS (CORONAL DOG-LEG KINK)`, techLabel: `DEMO 3: PLANE 1 DRIFT`, duration: 4.5,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: 0.0, corDeg: badCor, pitchDeg: opt.pitchDeg, depthMm: 62 },
      narration: `<b>Phase 1 (Off-Line Advancement):</b> Entering at <b>CC=0.0cm</b> and aiming at <b>${badCor.toFixed(1)}°</b> instead of along the <b>${opt.corDeg.toFixed(1)}°</b> infundibular axis creates a severe dog-leg kink!`
    });
    steps.push({
      title: `WITHDRAW NEEDLE STRAIGHT BACK TO 15 MM`, techLabel: `DEMO 3: SAFE WITHDRAWAL`, duration: 3.8,
      target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: 0.0, corDeg: badCor, pitchDeg: opt.pitchDeg, depthMm: 15 },
      narration: `<b>Phase 2 (Withdraw Above Fascia):</b> Retracting straight back from <b>62 mm → 15 mm</b> to unthread the lumbodorsal fascia before changing our coronal plane.`
    });
    steps.push({
      title: `REALIGN POINT B & CORONAL AIM ON 0° INFUNDIBULAR LINE`, techLabel: `DEMO 3: PLANE 1 LOCK`, duration: 4.0,
      target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 15 },
      narration: `<b>Phase 3 (Realign Plane 1):</b> Moving Point B onto the infundibular line (<b>CC=${opt.ccCm}cm</b>) and rotating Coronal Aim to <b>${opt.corDeg.toFixed(1)}°</b>.`
    });
    steps.push({
      title: `RE-INSERT COAXIALLY DOWN INFUNDIBULAR AXIS (${opt.tractDistMm} MM)`, techLabel: `DEMO 3: RE-INSERTION`, duration: 4.8,
      target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
      onArrive: () => { pullStylet(true); },
      narration: `<b>Phase 4 (Coaxial Entry):</b> Re-advancing to <b>${opt.tractDistMm} mm</b> with a <b>${opt.dogLegDeg.toFixed(1)}°</b> coaxial alignment!`
    });
    return finishSteps();
  }

  if (scenarioMode === 'err_bullseye') {
    const offPitch = Math.max(12, opt.pitchDeg - 10);
    const offCor = opt.corDeg + 15;
    steps.push({
      title: `ADVANCE WITH HUB DRIFT (BULL'S EYE TURNS INTO A LINE)`, techLabel: `DEMO 4: COAXIAL DRIFT`, duration: 4.5,
      target: { respMode: opt.respMode, cArmAx: opt.calyxAxDeg, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: offCor, pitchDeg: offPitch, depthMm: 52 },
      narration: `<b>Phase 1 (Loss of Coaxial Dot):</b> On the <b>+${opt.calyxAxDeg}° Ipsilateral</b> view, advancing while the hub has drifted off-axis shows an elongated needle shaft line that misses the calyx!`
    });
    steps.push({
      title: `WITHDRAW BACK TO SUBCUTANEOUS FAT (18 MM)`, techLabel: `DEMO 4: SAFE WITHDRAWAL`, duration: 3.8,
      target: { cArmAx: opt.calyxAxDeg, cArmOb: 0, corDeg: offCor, pitchDeg: offPitch, depthMm: 18 },
      narration: `<b>Phase 2 (Withdraw Above Fascia):</b> Pulling straight back from <b>52 mm → 18 mm</b> before pivoting the hub.`
    });
    steps.push({
      title: `PIVOT HUB DIRECTLY OVER TIP (RESTORE BULL'S EYE DOT ◎)`, techLabel: `DEMO 4: COAXIAL DOT LOCK`, duration: 4.0,
      target: { cArmAx: opt.calyxAxDeg, cArmOb: 0, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 28 },
      narration: `<b>Phase 3 (Lock Coaxial Dot):</b> Pivoting the hub directly over the tip until the shaft collapses into a single Bull's Eye dot (<b>◎</b>), then punching into the fascia (28 mm).`
    });
    steps.push({
      title: `SWING TO 0° AP & ADVANCE INTO PAPILLA (${opt.tractDistMm} MM)`, techLabel: `DEMO 4: DEPTH & POP`, duration: 4.8,
      target: { cArmAx: 0, cArmOb: 0, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
      onArrive: () => { pullStylet(true); },
      narration: `<b>Phase 4 (0° AP Depth Confirmation):</b> Swinging C-arm back to <b>0° AP</b> and advancing to <b>${opt.tractDistMm} mm</b> into the center of the papilla!`
    });
    return finishSteps();
  }

  const userHasDeepError = scenarioMode === 'auto_smart' && state.depthMm > 28 &&
    (Math.abs(state.pitchDeg - opt.pitchDeg) > 2.5 || Math.abs(state.corDeg - opt.corDeg) > 4.5 || Math.hypot(state.latCm - opt.latCm, state.ccCm - opt.ccCm) > 0.5);

  if (userHasDeepError) {
    steps.push({
      title: `WITHDRAW YOUR NEEDLE BACK TO SUBCUTANEOUS FAT (18 MM)`, techLabel: `SMART RECOVERY: WITHDRAW`, duration: 4.0,
      target: { cArmAx: state.cArmAx, cArmOb: state.cArmOb, latCm: state.latCm, ccCm: state.ccCm, corDeg: state.corDeg, pitchDeg: state.pitchDeg, depthMm: 18 },
      narration: `<b>Step 1 (Safe Withdrawal):</b> Your needle was at <b>${Math.round(state.depthMm)} mm</b> off-target. Pulling straight back to <b>18 mm (Subcutaneous Fat)</b> before changing angle!`
    });
    steps.push({
      title: `REDIRECT TO OPTIMAL ANGLE WHILE AT 18 MM`, techLabel: `SMART RECOVERY: REDIRECT`, duration: 4.2,
      target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 18 },
      narration: `<b>Step 2 (Redirect Above Fascia):</b> Adjusting Point B to <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b>, Coronal Aim to <b>${opt.corDeg}°</b>, and Pitch to <b>${opt.pitchDeg}°</b>.`
    });
  }

  if (tech === 'hybrid') {
    if (!userHasDeepError) {
      steps.push({
        title: `0° AP VIEW: MARK INFUNDIBULAR LINE & POINT B`, techLabel: techTitle, duration: 4.5,
        target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: 3 },
        narration: `<b>0° AP View:</b> Locking <b>${opt.respMode === 'exp' ? 'Exp Hold' : 'Insp Hold'}</b> and aligning Point B (<b>L=${opt.latCm}cm, CC=${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm}cm</b>) along the <b>${opt.corDeg}°</b> infundibular axis.`
      });
    }
    steps.push({
      title: `ROTATE C-ARM TO +${opt.calyxAxDeg}° IPSILATERAL (BULL'S EYE)`, techLabel: techTitle, duration: 4.8,
      target: { cArmAx: opt.calyxAxDeg, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 6 },
      narration: `<b>+${opt.calyxAxDeg}° Ipsilateral Oblique (0° Tilt):</b> Looking end-on into the posterior calyx, locking Needle Pitch at <b>${opt.pitchDeg}°</b>, and punching through the <b>Lumbodorsal Fascia (${opt.fasciaDepthMm} mm) [1st Pop]</b>.`
    });
    steps.push({
      title: `RETURN TO 0° AP VIEW: ADVANCE & WATCH CALYCEAL DIMPLE`, techLabel: techTitle, duration: 4.8,
      target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
      onArrive: () => { pullStylet(true); },
      narration: `<b>Back to 0° AP View:</b> Advancing along the infundibular line to <b>${opt.tractDistMm} mm</b>, watching the contrast cup dimple, and popping dead-center into the papilla (Dog-leg: <b>${opt.dogLegDeg.toFixed(1)}°</b>)!`
    });
  } else if (tech === 'triangulation') {
    if (!userHasDeepError) {
      steps.push({
        title: `PLANE 1 (0° AP VIEW): LOCK CORONAL LINE & CROSS FASCIA`, techLabel: techTitle, duration: 4.5,
        target: { respMode: opt.respMode, cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4 },
        narration: `<b>Plane 1 (0° AP):</b> Aligning Point B (<b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b>) and Coronal Aim (<b>${opt.corDeg}°</b>) with the infundibulum, then crossing the fascia (${opt.fasciaDepthMm} mm).`
      });
    }
    steps.push({
      title: `PLANE 2 (+30° CEPHALAD TILT): PARALLAX DEPTH CHECK`, techLabel: techTitle, duration: 4.8,
      target: { cArmAx: 0, cArmOb: 30, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm - 8 },
      narration: `<b>Plane 2 (+30° Cephalad Tilt):</b> Tilting C-arm cephalad elongates the needle in profile to verify our <b>${opt.pitchDeg}° Pitch</b> aims directly at the calyx depth.`
    });
    steps.push({
      title: `ENTER PAPILLA [2ND POP] & VERIFY ON 0° AP`, techLabel: techTitle, duration: 4.5,
      target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
      onArrive: () => { pullStylet(true); },
      narration: `<b>Popping into Papilla (${opt.tractDistMm} mm):</b> Confirmed on both 0° AP and +30° Ceph views!`
    });
  } else {
    steps.push({
      title: `+${opt.calyxAxDeg}° IPSILATERAL BULL'S EYE: HUB-OVER-TIP DOT`, techLabel: techTitle, duration: 4.8,
      target: { respMode: opt.respMode, cArmAx: opt.calyxAxDeg, cArmOb: 0, latCm: opt.latCm, ccCm: 0, corDeg: 0, pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 8 },
      narration: `<b>+${opt.calyxAxDeg}° Ipsilateral Coaxial View:</b> Superimposing the needle hub directly over the tip (<b>◎</b> dot) and advancing through the fascia (${opt.fasciaDepthMm} mm).`
    });
    steps.push({
      title: `SWING TO 0° AP VIEW: JUDGE DEPTH & ENTER PAPILLA`, techLabel: techTitle, duration: 4.8,
      target: { cArmAx: 0, cArmOb: 0, latCm: opt.latCm, ccCm: 0, corDeg: 0, pitchDeg: opt.pitchDeg, depthMm: opt.tractDistMm },
      onArrive: () => { pullStylet(true); },
      narration: `<b>0° AP Depth View:</b> Advancing to <b>${opt.tractDistMm} mm</b> until the calyceal cup dimples and pops (Note: Pure Bull's Eye at 0° coronal leaves a <b>${opt.dogLegDeg.toFixed(1)}°</b> coronal dog-leg).`
    });
  }

  return finishSteps();
}

function toggleAutoSolve() {
  if (state.autoPlaying) { stopAutoSolve(false); return; }
  const isFinished = state.autoSteps.length > 0 && state.autoStepIdx >= state.autoSteps.length - 1 && state.autoStepTimer >= state.autoSteps[state.autoStepIdx].duration;
  if (!state.autoSteps || state.autoSteps.length === 0 || isFinished) {
    state.autoSteps = buildAutoSolutionSteps(); state.autoStepIdx = 0; state.autoStepTimer = 0;
  }
  state.autoPlaying = true;
  const btn = document.getElementById('autoPlayBtn');
  btn.textContent = `⏸ Pause`; btn.classList.add('playing');
  applyAutoStepStart(state.autoStepIdx);
}

function stopAutoSolve(resetProgress = false) {
  state.autoPlaying = false;
  if (resetProgress) { state.autoSteps = []; state.autoStepIdx = 0; state.autoStepTimer = 0; }
  const btn = document.getElementById('autoPlayBtn');
  if (btn) { btn.classList.remove('playing'); btn.textContent = '▶ Auto-Solve'; }
}

function stepAutoSolve(dir) {
  stopAutoSolve(false);
  if (!state.autoSteps || state.autoSteps.length === 0) { state.autoSteps = buildAutoSolutionSteps(); state.autoStepIdx = 0; }
  else { state.autoStepIdx = Math.max(0, Math.min(state.autoSteps.length - 1, state.autoStepIdx + dir)); }
  state.autoStepTimer = 0; applyAutoStepInstant(state.autoStepIdx); stopAutoSolve(false);
}

function applyAutoStepStart(idx) {
  const st = state.autoSteps[idx];
  if (!st) return;
  state.autoStartVals = {
    cArmAx: state.cArmAx,
    cArmOb: state.cArmOb,
    latCm: state.latCm,
    ccCm: state.ccCm,
    corDeg: state.corDeg,
    pitchDeg: state.pitchDeg,
    depthMm: state.depthMm
  };
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
  const st = state.autoSteps[idx], t = st.target;
  if (t.cArmAx !== undefined) state.cArmAx = t.cArmAx;
  if (t.cArmOb !== undefined) state.cArmOb = t.cArmOb;
  if (t.latCm !== undefined) state.latCm = t.latCm;
  if (t.ccCm !== undefined) state.ccCm = t.ccCm;
  if (t.corDeg !== undefined) state.corDeg = t.corDeg;
  if (t.pitchDeg !== undefined) state.pitchDeg = t.pitchDeg;
  if (t.depthMm !== undefined) state.depthMm = t.depthMm;
  if (st.onArrive) st.onArrive();
  markCArmVisited(); state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach();
}

function tickAutoSolve(dt) {
  if (!state.autoPlaying || !state.autoSteps.length) return;
  const speed = parseFloat(document.getElementById('autoSpeedSelect').value || '1.0');
  const st = state.autoSteps[state.autoStepIdx];
  state.autoStepTimer += dt * speed;

  const progress = Math.max(0, Math.min(1, state.autoStepTimer / st.duration));
  const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
  const s = state.autoStartVals;
  const t = st.target;
  const interp = (a, b) => a + (b - a) * ease;

  if (t.cArmAx !== undefined) state.cArmAx = Math.round(interp(s.cArmAx, t.cArmAx) * 10) / 10;
  if (t.cArmOb !== undefined) state.cArmOb = Math.round(interp(s.cArmOb, t.cArmOb) * 10) / 10;
  if (t.latCm !== undefined) state.latCm = Math.round(interp(s.latCm, t.latCm) * 100) / 100;
  if (t.ccCm !== undefined) state.ccCm = Math.round(interp(s.ccCm, t.ccCm) * 100) / 100;
  if (t.corDeg !== undefined) state.corDeg = Math.round(interp(s.corDeg, t.corDeg) * 10) / 10;
  if (t.pitchDeg !== undefined) state.pitchDeg = Math.round(interp(s.pitchDeg, t.pitchDeg) * 10) / 10;
  if (t.depthMm !== undefined) state.depthMm = interp(s.depthMm, t.depthMm);

  markCArmVisited(); state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach();

  if (state.autoStepTimer >= st.duration) {
    applyAutoStepInstant(state.autoStepIdx);
    if (state.autoStepIdx < state.autoSteps.length - 1) {
      state.autoStepIdx++; state.autoStepTimer = 0; applyAutoStepStart(state.autoStepIdx);
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

  document.getElementById('cArmReadout').textContent =
    `Axial: ${state.cArmAx >= 0 ? '+' : ''}${Math.round(state.cArmAx)}° | Tilt: ${state.cArmOb >= 0 ? '+' : ''}${Math.round(state.cArmOb)}°`;

  document.getElementById('sLat').value = state.latCm.toFixed(1);
  document.getElementById('vLat').textContent = state.latCm.toFixed(1) + ' cm';
  document.getElementById('sCC').value = state.ccCm.toFixed(1);
  document.getElementById('vCC').textContent = (state.ccCm >= 0 ? '+' : '') + state.ccCm.toFixed(1) + ' cm';
  document.getElementById('sCor').value = state.corDeg;
  document.getElementById('vCor').textContent = (state.corDeg >= 0 ? '+' : '') + state.corDeg.toFixed(1) + '°';
  document.getElementById('sPitch').value = state.pitchDeg;

  const pitchDesc = state.pitchDeg < 25 ? 'Steep/Deep' : (state.pitchDeg > 40 ? 'Shallow/Flat' : 'Medium');
  document.getElementById('vPitch').textContent = `${state.pitchDeg.toFixed(1)}° (${pitchDesc})`;

  document.getElementById('sDepth').value = state.depthMm;
  const dRound = Math.round(state.depthMm);
  document.getElementById('vDepth').textContent = dRound === 0 ? '0 mm (On Skin)' : `${dRound} mm`;
  document.getElementById('tissueBadge').textContent = `Needle Depth: ${dRound} mm`;

  const surfMm = Math.hypot(state.latCm * 10, state.ccCm * 10);
  const showHints = state.assistedSnapped || state.autoPlaying;
  document.getElementById('trigHint').textContent = showHints
    ? `Tract:${Math.round(Math.hypot(surfMm, cal.z))}mm | Ideal Pitch:${(Math.atan2(surfMm, cal.z) * 180 / Math.PI).toFixed(1)}°`
    : `Manual OR Mode`;
}

document.getElementById('caseSelect').addEventListener('change', e => initCase(parseInt(e.target.value, 10), false));
document.getElementById('calyxSelect').addEventListener('change', e => { state.targetKey = e.target.value; initCase(state.caseIdx, true); });
document.getElementById('coachModeSelect').addEventListener('change', e => { state.coachMode = e.target.value; stopAutoSolve(true); updateDiagnosticsAndCoach(); });

const bindSlider = (id, fn, redrawCarm = false) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', e => {
    stopAutoSolve(false);
    fn(parseFloat(e.target.value));
    if (redrawCarm || state.contFluoro || state.pedalDown) state.lihDirty = true;
    syncAllUI();
    updateDiagnosticsAndCoach();
  });
};
bindSlider('sAx', v => { state.cArmAx = v; markCArmVisited(); }, true);
bindSlider('sOb', v => { state.cArmOb = v; markCArmVisited(); }, true);
bindSlider('sLat', v => { state.latCm = v; }, false);
bindSlider('sCC', v => { state.ccCm = v; }, false);
bindSlider('sCor', v => { state.corDeg = v; checkDeepPivot(); }, false);
bindSlider('sPitch', v => { state.pitchDeg = v; checkDeepPivot(); }, false);
bindSlider('sDepth', v => { updateDepthWithTracking(v); state.styletPulled = false; }, false);

function updateDepthWithTracking(newD) {
  const d = Math.max(0, Math.min(135, newD));
  if (state.depthMm <= 1 && d > 2) state.punctureAttempts++;
  state.depthMm = d;
  const ng = getNeedle3D();
  if (ng.tip.z >= 26 && !state.fasciaAnchored) { state.fasciaAnchored = true; state.fasciaEntryPitch = state.pitchDeg; state.fasciaEntryCor = state.corDeg; }
  else if (ng.tip.z < 24) { state.fasciaAnchored = false; }
}

function checkDeepPivot() {
  if (!state.autoPlaying && state.fasciaAnchored && state.depthMm > 42) {
    if (Math.abs(state.pitchDeg - state.fasciaEntryPitch) > 5 || Math.abs(state.corDeg - state.fasciaEntryCor) > 6) state.pivotedDeep = true;
  }
}

function markCArmVisited() {
  const cal = getTargetCalyxBase();
  if (Math.abs(state.cArmAx) <= 2 && Math.abs(state.cArmOb) <= 2) state.visited0AP = true;
  if (Math.abs(state.cArmAx - cal.axialDeg) <= 8 || Math.abs(state.cArmAx - 30) <= 6) state.visited30Ax = true;
  if (Math.abs(state.cArmOb) >= 20) state.visited30Ob = true;
}

function setCArm(ax, ob) { stopAutoSolve(false); state.cArmAx = ax; state.cArmOb = ob; state.lihDirty = true; markCArmVisited(); syncAllUI(); updateDiagnosticsAndCoach(); }
function setWorkbench(wb) {
  state.workbench = wb;
  document.getElementById('wbTab1').classList.toggle('active', wb === 'anatomy');
  document.getElementById('wbTab5').classList.toggle('active', wb === 'compare');
  document.getElementById('wbTab2').classList.toggle('active', wb === 'ultrasound');
}
function toggleBlind() { state.blindMode = !state.blindMode; state.blindRevealed = false; }
function toggleContFluoro() {
  state.contFluoro = !state.contFluoro;
  if (state.contFluoro) state.lihDirty = true;
  const b = document.getElementById('contFluoroBtn');
  b.textContent = `Cont. Fluoro: ${state.contFluoro ? 'ON' : 'OFF (LIH)'}`;
  b.classList.toggle('active', state.contFluoro);
}
function startPedal() { state.pedalDown = true; state.lihDirty = true; document.getElementById('pedalBtn').classList.add('firing'); }
function stopPedal() { state.pedalDown = false; document.getElementById('pedalBtn').classList.remove('firing'); }
function toggleClamp() { state.clampOn = !state.clampOn; state.lihDirty = true; const b = document.getElementById('clampBtn'); b.textContent = `Radiolucent Clamp: ${state.clampOn ? 'ON' : 'OFF (Gravity Sag!)'}`; b.className = state.clampOn ? 'active' : 'warn-active'; updateDiagnosticsAndCoach(); }
function toggleAir() { state.airBolus = !state.airBolus; state.lihDirty = true; document.getElementById('btnAir').classList.toggle('active', state.airBolus); }
function toggleHydro() { state.hydro = !state.hydro; state.lihDirty = true; document.getElementById('btnHydro').classList.toggle('active', state.hydro); }
function cycleResp() { const order = ['insp', 'exp', 'tidal'], labels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' }; state.respMode = order[(order.indexOf(state.respMode) + 1) % 3]; state.lihDirty = true; document.getElementById('btnResp').textContent = labels[state.respMode]; updateDiagnosticsAndCoach(); }
function setExactDepth(d) { stopAutoSolve(false); updateDepthWithTracking(d); state.styletPulled = false; if (state.contFluoro || state.pedalDown) state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach(); }
function stepDepth(d) { setExactDepth(state.depthMm + d); }
function markPointA() { setCArm(0, 0); state.pointAMarked = true; }
function autoTrigPointB() {
  stopAutoSolve(false); state.assistedSnapped = true; state.pointAMarked = true;
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  state.respMode = opt.respMode;
  const labels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
  document.getElementById('btnResp').textContent = labels[state.respMode];
  state.latCm = opt.latCm; state.ccCm = opt.ccCm; state.corDeg = opt.corDeg; state.pitchDeg = opt.pitchDeg;
  state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach();
}

let draggingFluoroHub = false, draggingDepthScrubber = false, lastPointer = { x: 0, y: 0 };
fluoroCanvas.addEventListener('pointerdown', e => {
  if (e.target.tagName === 'BUTTON') return;
  stopAutoSolve(false);
  const rect = fluoroCanvas.getBoundingClientRect();
  if (e.clientX - rect.left > rect.width - 44) { draggingDepthScrubber = true; setExactDepth(Math.round(Math.max(0, Math.min(1, (e.clientY - rect.top - 40) / (rect.height - 80))) * 125)); return; }
  draggingFluoroHub = true; lastPointer = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', e => {
  if (draggingDepthScrubber) { const rect = fluoroCanvas.getBoundingClientRect(); setExactDepth(Math.round(Math.max(0, Math.min(1, (e.clientY - rect.top - 40) / (rect.height - 80))) * 125 * 2) / 2); return; }
  if (!draggingFluoroHub) return;
  state.pitchDeg = Math.max(10, Math.min(60, state.pitchDeg + (e.clientX - lastPointer.x) * 0.12));
  state.corDeg = Math.max(-75, Math.min(75, state.corDeg + (e.clientY - lastPointer.y) * 0.15));
  lastPointer = { x: e.clientX, y: e.clientY }; checkDeepPivot();
  if (state.contFluoro || state.pedalDown) state.lihDirty = true;
  syncAllUI(); updateDiagnosticsAndCoach();
});
window.addEventListener('pointerup', () => { draggingFluoroHub = false; draggingDepthScrubber = false; });
fluoroCanvas.addEventListener('wheel', e => { e.preventDefault(); stepDepth(e.deltaY < 0 ? 2 : -2); }, { passive: false });

let draggingSkinPointB = false;
skinCanvas.addEventListener('pointerdown', e => {
  stopAutoSolve(false);
  const rect = skinCanvas.getBoundingClientRect(), scale = rect.width / 180;
  const wx = (e.clientX - rect.left - 20 * scale) / scale, wy = (rect.height * 0.52 - (e.clientY - rect.top)) / scale;
  const dyResp = getRespShift(), c = CASES[state.caseIdx];
  for (const key of Object.keys(c.calyces)) {
    const cal = c.calyces[key];
    if (Math.hypot(wx - cal.x, wy - (cal.y + dyResp)) < 7.5) { state.targetKey = key; document.getElementById('calyxSelect').value = key; initCase(state.caseIdx, true); return; }
  }
  draggingSkinPointB = true; movePointBOnSkin(wx, wy);
});
window.addEventListener('pointermove', e => {
  if (!draggingSkinPointB) return;
  const rect = skinCanvas.getBoundingClientRect(), scale = rect.width / 180;
  movePointBOnSkin((e.clientX - rect.left - 20 * scale) / scale, (rect.height * 0.52 - (e.clientY - rect.top)) / scale);
});
window.addEventListener('pointerup', () => { draggingSkinPointB = false; });
function movePointBOnSkin(wx, wy) {
  const cal = getTargetCalyxBase();
  state.latCm = Math.round(Math.max(0.5, Math.min(8.0, (wx - cal.x) / 10)) * 10) / 10;
  state.ccCm = Math.round(Math.max(-6.0, Math.min(5.0, (wy - (cal.y + getPlannedRespShift())) / 10)) * 10) / 10;
  if (state.contFluoro || state.pedalDown) state.lihDirty = true;
  syncAllUI(); updateDiagnosticsAndCoach();
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); startPedal(); }
  else if (e.code === 'ArrowUp') { e.preventDefault(); stepDepth(1); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); stepDepth(-1); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); state.pitchDeg = Math.min(60, state.pitchDeg + 0.5); if (state.contFluoro || state.pedalDown) state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach(); }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); state.pitchDeg = Math.max(10, state.pitchDeg - 0.5); if (state.contFluoro || state.pedalDown) state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach(); }
  else if (e.code === 'KeyQ') setCArm(0, 0);
  else if (e.code === 'KeyE') setCArm(30, 0);
});
window.addEventListener('keyup', e => { if (e.code === 'Space') stopPedal(); });

function getEffectiveNeedleAngles() {
  let sagPitch = 0, sagCor = 0;
  if (!state.clampOn && state.depthMm > 0 && state.depthMm < 28) { const f = (28 - state.depthMm) / 28; sagPitch = 8.5 * f; sagCor = -7.0 * f; }
  let respPendulumCor = 0, isPendulumSwinging = false;
  if (state.respMode === 'tidal' && state.depthMm > 48) { const ex = getRespShift() - getPlannedRespShift(); respPendulumCor = ex * 0.65; isPendulumSwinging = Math.abs(ex) > 2.0; }
  return { effPitch: state.pitchDeg + sagPitch, effCor: state.corDeg + sagCor + respPendulumCor, isSagging: (!state.clampOn && state.depthMm > 0 && state.depthMm < 28), isPendulumSwinging };
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
  const base = CASES[state.caseIdx], dy = getRespShift(), ng = getNeedle3D(), targetBase = base.calyces[state.targetKey];
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
  return { ...base, pelvis: { x: base.pelvis.x + pushX, y: base.pelvis.y + dy + pushY, z: base.pelvis.z }, calyces: shiftedCalyces, targetCalyx: shiftedCalyces[state.targetKey], antCalyx: { x: base.antCalyx.x + pushX, y: base.antCalyx.y + dy + pushY, z: base.antCalyx.z } };
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
  const diag = computeDiagnostics(), ng = getNeedle3D();
  state.lihDirty = true;
  if (diag.inTarget) { state.hydro = true; document.getElementById('btnHydro').classList.add('active'); }
  else { state.blushClouds.push({ x: ng.tip.x, y: ng.tip.y, z: ng.tip.z, r: 14 }); document.getElementById('clearBlushBtn').style.display = 'inline-block'; }
}
function clearBlush() { state.blushClouds = []; state.lihDirty = true; document.getElementById('clearBlushBtn').style.display = 'none'; }

function computeDiagnostics() {
  const c = getLiveAnatomy(), ng = getNeedle3D(), cal = c.targetCalyx;
  const { trueCorDeg } = getTrueCalyxAngles(cal);
  const distToCalyx = Math.hypot(ng.tip.x - cal.x, ng.tip.y - cal.y, ng.tip.z - cal.z);
  const distToAnt = Math.hypot(ng.tip.x - c.antCalyx.x, ng.tip.y - c.antCalyx.y, ng.tip.z - c.antCalyx.z);
  const infVec = getInfundibularUnitVector(cal);
  const dot = Math.max(-1, Math.min(1, ng.dir.x * infVec.x + ng.dir.y * infVec.y + ng.dir.z * infVec.z));
  const dogLegDeg = Math.acos(dot) * 180 / Math.PI;
  const coronalMismatch = Math.abs(ng.effCor - trueCorDeg);
  const colonRisk = ng.skinEntry.x > 126 || (state.caseIdx === 7 && ng.skinEntry.x > 104);
  const paraspinalRisk = ng.skinEntry.x < 54;
  const tRib = 18 / Math.max(0.15, ng.dir.z);
  const xAtRib = ng.skinEntry.x + ng.dir.x * tRib, yAtRib = ng.skinEntry.y + ng.dir.y * tRib;
  const rib12CenterY = getRibCenterYAtX(xAtRib, c.rib12Y), rib11CenterY = getRibCenterYAtX(xAtRib, c.rib12Y + 28);
  const ribHit = state.depthMm >= tRib && (Math.abs(yAtRib - rib12CenterY) < 3.4 || Math.abs(yAtRib - rib11CenterY) < 3.4);
  const intercostalHit = state.depthMm >= tRib && ((rib12CenterY - yAtRib > 3.4 && rib12CenterY - yAtRib < 7.2) || (rib11CenterY - yAtRib > 3.4 && rib11CenterY - yAtRib < 7.5));
  const pleuraBorderY = rib12CenterY + (state.respMode === 'insp' ? 5 : 16);
  const pleuraHit = state.depthMm >= tRib && yAtRib > pleuraBorderY;

  let tactileFeel = "Resting on Skin (0 mm)", resistanceN = 0.0, popZone = 'none', dimpleFactor = 0.0;
  if (state.depthMm <= 0.5) { tactileFeel = "Resting on Skin"; resistanceN = 0.0; }
  else if (state.depthMm <= 3.5) { tactileFeel = "Piercing Dermis [Skin Pop]"; resistanceN = 3.2; popZone = 'skin'; }
  else if (ng.tip.z <= 23) { tactileFeel = "Soft Tissue Give (Subcutaneous)"; resistanceN = 0.8; }
  else if (ng.tip.z <= 29) { tactileFeel = "Firm Fascial Resistance [1st Pop!]"; resistanceN = 6.8; popZone = 'fascia'; }
  else if (distToCalyx > cal.cupR + 10) { tactileFeel = "Low Resistance (Retroperitoneal Space)"; resistanceN = 1.2; }
  else if (distToCalyx > cal.cupR) { tactileFeel = "Elastic Capsular Resistance (Tenting)"; resistanceN = 5.5; dimpleFactor = 1.0 - (distToCalyx - cal.cupR) / 10; }
  else { tactileFeel = "Sudden Loss of Resistance [2nd Pop Felt]"; resistanceN = 0.4; popZone = 'papilla'; }

  if (ribHit) { tactileFeel = "Hard Bony Stop (Periosteum!)"; resistanceN = 9.5; }
  if (popZone !== 'none' && popZone !== state.lastPopZone) playTactilePop(popZone);
  state.lastPopZone = popZone;

  const inTarget = distToCalyx <= cal.cupR;
  const inInfundibulumWall = !inTarget && distToCalyx < 17 && ng.tip.x < cal.x - 5;
  const inAnt = distToAnt <= 8.5;
  const iso = { x: cal.x, y: cal.y, z: cal.z };
  const pTip = project3D(ng.tip, iso), pHub = project3D(ng.hub, iso);
  const coaxialErr = Math.hypot(pTip.u - pHub.u, pTip.v - pHub.v);

  return { distToCalyx, dogLegDeg, coronalMismatch, trueCorDeg, colonRisk, paraspinalRisk, ribHit, intercostalHit, pleuraHit, layer: tactileFeel, resistanceN, dimpleFactor, inTarget, inInfundibulumWall, inAnt, coaxialErr, isSagging: ng.isSagging, isPendulumSwinging: ng.isPendulumSwinging, tipZ: ng.tip.z, calZ: cal.z, skinY: ng.skinEntry.y, rib12SurfaceY: getRibCenterYAtX(ng.skinEntry.x, c.rib12Y) };
}

function updateDiagnosticsAndCoach() {
  const d = computeDiagnostics(), c = CASES[state.caseIdx], cal = getTargetCalyxBase();
  const opt = computeOptimalGeometryForTechnique(state.coachMode);

  const calSel = document.getElementById('calyxSelect');
  if (calSel) {
    Array.from(calSel.options).forEach(o => {
      if (c.calyces[o.value]) {
        const isBest = o.value === c.defaultCalyx ? ' ★ Best' : '';
        o.textContent = `Target: ${c.calyces[o.value].label} (${c.calyces[o.value].reachPct}% reach${isBest})`;
      }
    });
  }

  const topStrip = document.getElementById('topBriefStrip');
  if (topStrip) {
    const isOptimalCalyx = state.targetKey === c.defaultCalyx;
    const calCol = isOptimalCalyx ? '#4ade80' : '#fbbf24';
    topStrip.innerHTML = `
      <div><b>Case Brief:</b> ${c.clinicalBrief || c.name}</div>
      <div style="color:${calCol};"><b>Calyx Choice (${cal.label} — ${cal.reachPct}% Reach, ${cal.neckW}mm Neck):</b> ${cal.calyxNote || ''}</div>
    `;
  }

  document.getElementById('hapticLayerText').textContent = `Tactile Feel: ${d.layer}`;
  document.getElementById('hapticForceVal').textContent = `${d.resistanceN.toFixed(1)} N`;

  const pbBox = document.getElementById('casePlaybookBox');
  if (pbBox && c.profPlaybook) {
    const cleanTrick = c.profPlaybook.trick.replace(/PROFESSOR'S TRICK\s*[—-]\s*/i, '');
    pbBox.innerHTML = `
      <div style="color:#fca5a5;margin-bottom:2px;"><b>⚠️ Trap:</b> ${c.profPlaybook.trap}</div>
      <div style="color:#fde047;background:rgba(234,179,8,0.1);padding:3px 6px;border-radius:3px;border-left:2px solid #eab308;">
        <b>💡 Trick:</b> ${cleanTrick}
      </div>
    `;
  }

  // DYNAMIC PER-CALYX & PER-TECHNIQUE STEP-BY-STEP GUIDE
  const respText = opt.respMode === 'exp' ? 'Exp Hold (Supracostal Safety)' : 'Insp Hold';
  const extraAction = state.caseIdx === 4 ? ' & click [5mL Air Bolus]' : (state.caseIdx === 9 ? ' & click [Saline Distend]' : '');
  const dynamicSteps = state.coachMode === 'hybrid' ? [
    `1. Lock [Resp: ${respText}]${extraAction}.`,
    `2. On [0° AP], set Point B at L=${opt.latCm.toFixed(1)}cm, CC=${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm.toFixed(1)}cm & Coronal Aim=${opt.corDeg.toFixed(1)}°.`,
    `3. Rotate C-arm to [+${opt.calyxAxDeg}° Bull's Eye], set Pitch=${opt.pitchDeg.toFixed(1)}°, and cross fascia (${opt.fasciaDepthMm}mm).`,
    `4. Return to [0° AP], advance to ${opt.tractDistMm}mm (watch cup dimple), and click [Pull Stylet].`
  ] : (state.coachMode === 'triangulation' ? [
    `1. Lock [Resp: ${respText}]${extraAction}.`,
    `2. Plane 1 [0° AP]: Set Point B at L=${opt.latCm.toFixed(1)}cm, CC=${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm.toFixed(1)}cm & Coronal=${opt.corDeg.toFixed(1)}°.`,
    `3. Plane 2 [+30° Ceph]: Tilt C-arm cephalad, set Pitch=${opt.pitchDeg.toFixed(1)}°, and advance past fascia (${opt.fasciaDepthMm}mm).`,
    `4. Advance to ${opt.tractDistMm}mm into the papilla and click [Pull Stylet].`
  ] : [
    `1. Lock [Resp: ${respText}] & rotate C-arm to [+${opt.calyxAxDeg}° Bull's Eye].`,
    `2. Set Point B at L=${opt.latCm.toFixed(1)}cm, CC=0.0cm (Coronal=0°) and superimpose hub over tip (Pitch=${opt.pitchDeg.toFixed(1)}°).`,
    `3. Advance coaxially through the lumbodorsal fascia (${opt.fasciaDepthMm}mm).`,
    `4. Swing C-arm to [0° AP], advance to ${opt.tractDistMm}mm, and click [Pull Stylet].`
  ]);

  const doneFlags = [
    state.respMode === opt.respMode,
    Math.hypot(state.latCm - opt.latCm, state.ccCm - opt.ccCm) <= 0.6 && Math.abs(state.corDeg - opt.corDeg) <= 8,
    state.depthMm >= 28 && Math.abs(state.pitchDeg - opt.pitchDeg) <= 3.5,
    state.styletPulled && d.inTarget
  ];
  let curFound = false;
  document.getElementById('coachList').innerHTML = dynamicSteps.map((txt, i) => {
    let cls = 'coach-item', sym = '[ ]';
    if (doneFlags[i]) { cls += ' done'; sym = '[✓]'; }
    else if (!curFound) { cls += ' active'; sym = '[→]'; curFound = true; }
    return `<li class="${cls}"><span style="font-family:monospace;font-weight:700;">${sym}</span><span>${txt}</span></li>`;
  }).join('');

  const hintEl = document.getElementById('liveHintBox');
  if (hintEl) {
    if (state.respMode !== opt.respMode) {
      hintEl.innerHTML = `<b>💡 Hint:</b> Click <b>[Resp]</b> until locked in <b>${respText}</b> before puncturing.`;
    } else if (state.depthMm < 5) {
      hintEl.innerHTML = `<b>💡 Hint (At Skin 0mm):</b> Align Point B and Coronal Aim on <b>[0° AP]</b> (or click <i>2. Snap Optimal Point B</i> on the Flank Map).`;
    } else if (state.depthMm >= 25 && state.depthMm <= 45 && Math.abs(state.cArmOb) < 10 && Math.abs(state.cArmAx) < 15) {
      hintEl.innerHTML = `<b>💡 Hint (~${Math.round(state.depthMm)}mm):</b> You've crossed the fascia! Switch C-arm to <b>${state.coachMode === 'triangulation' ? '[30° Ceph]' : '[30° Bull\'s Eye]'}</b> to check your depth Pitch.`;
    } else if (state.depthMm > 45 && !state.styletPulled) {
      hintEl.innerHTML = `<b>💡 Hint (${Math.round(state.depthMm)}mm):</b> Watch the contrast cup on <b>[0° AP]</b> for subtle dimpling. Retract &lt;35mm before redirecting! When ready, click <b>💧 Pull Stylet</b>.`;
    }
  }
}

function pullStylet(fromAutoSolve = false) {
  state.styletPulled = true; state.blindRevealed = true; state.lihDirty = true;
  const d = computeDiagnostics(), c = CASES[state.caseIdx], cal = getTargetCalyxBase(), opt = computeOptimalGeometryForTechnique(state.coachMode);
  updateDiagnosticsAndCoach();
  if (!fromAutoSolve) openAutomaticPunctureReview(d, c, cal, opt);
}

function openAutomaticPunctureReview(d, c, cal, opt) {
  let score = 100;
  const howToImprove = [], patientNotes = [];
  const usedSubcostalForSupracostal = cal.supracostal && d.skinY < d.rib12SurfaceY;
  const dzErr = d.tipZ - d.calZ;

  if (usedSubcostalForSupracostal) {
    score -= 18;
    howToImprove.push(`<b>Subcostal-to-Upper-Pole Approach Detected:</b> You punctured this supracostal upper-pole calyx from <b>below the 12th rib</b> (Coronal <b>+${state.corDeg.toFixed(1)}° upward</b>), creating a <b>${d.dogLegDeg.toFixed(1)}° Dog-Leg Hairpin Kink</b>. Enter at the <b>upper border of the 12th rib</b> on <b>Exp Hold</b> for coaxial access.`);
  }
  if (!d.inTarget) {
    score -= 40;
    if (d.inInfundibulumWall) howToImprove.push(`<b>Direct Infundibular Neck Puncture (Venous Hemorrhage):</b> Aim 8–10 mm more laterally into the avascular papillary cup.`);
    else if (d.inAnt) howToImprove.push(`<b>Anterior Calyx Trap:</b> You overshot the posterior calyx (${d.calZ} mm) into the anterior calyx (${c.antCalyx.z} mm).`);
    else if (Math.abs(dzErr) > 4) {
      howToImprove.push(dzErr < 0
        ? `<b>Passed Too Shallow / Posterior (by ${Math.abs(dzErr).toFixed(0)} mm):</b> Pitch (<b>${state.pitchDeg.toFixed(1)}°</b>) was too flat or stopped short. On <b>+30° Ceph</b> tilt, a superficial tip projects <i>downward (caudally)</i>—steepen pitch toward <b>${opt.pitchDeg.toFixed(1)}°</b>.`
        : `<b>Passed Too Deep / Anterior (by ${dzErr.toFixed(0)} mm):</b> Pitch (<b>${state.pitchDeg.toFixed(1)}°</b>) was too steep compared to ideal (<b>${opt.pitchDeg.toFixed(1)}°</b>). On <b>+30° Ceph</b> tilt, a deep tip projects <i>upward (cephalad)</i>.`);
    }
  } else {
    howToImprove.push(`<b>Successful Transpapillary Entry:</b> Entered <b>${cal.label}</b> (${d.distToCalyx.toFixed(1)} mm from papillary center; cup radius ${cal.cupR} mm).`);
  }

  if (d.dogLegDeg <= 15) howToImprove.push(`<b>Excellent Coaxial Alignment (Dog-Leg ${d.dogLegDeg.toFixed(1)}°):</b> Guidewire will glide straight into the pelvis/ureter with minimal torque.`);
  else if (!usedSubcostalForSupracostal) { score -= (d.dogLegDeg > 28 ? 25 : 12); howToImprove.push(`<b>Dog-Leg Angle (${d.dogLegDeg.toFixed(1)}°):</b> Move Point B toward <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b> and aim at <b>${opt.corDeg}°</b>.`); }

  if (cal.supracostal && !usedSubcostalForSupracostal && state.respMode !== 'exp') { score -= 20; howToImprove.push(`<b>Supracostal Respiratory Error:</b> Lock <b>Exp Hold</b> when puncturing above the 12th rib.`); }
  if (state.pivotedDeep) { score -= 18; howToImprove.push(`<b>Parenchymal Shear Warning:</b> Retract outside the renal cortex (&lt;35 mm) before changing needle angle!`); }
  if (d.ribHit || d.intercostalHit) { score -= 25; howToImprove.push(`<b>Costal / Subcostal Vessel Hazard:</b> Skate directly over the <b>upper border of the 12th rib</b>.`); }
  if (d.pleuraHit) { score -= 30; howToImprove.push(`<b>Pleural Transgression:</b> Stay on the upper border of the 12th rib in <b>Exp Hold</b>.`); }
  if (d.colonRisk) { score -= 30; howToImprove.push(`<b>Retrorenal Colon Perforation Risk:</b> Keep Lateral Offset L near <b>${opt.latCm} cm</b>.`); }
  if (cal.reachPct < 70) { score -= 15; const best = c.calyces[c.defaultCalyx]; howToImprove.push(`<b>Suboptimal Calyx (${cal.reachPct}% Reach):</b> Switch target to <b>${best.label} (${best.reachPct}% reach)</b>.`); }

  if (c.clinicalBrief) patientNotes.push(`<b>Patient Scenario:</b> ${c.clinicalBrief}`);
  if (cal.calyxNote) patientNotes.push(`<b>Selected Calyx Analysis (${cal.label}):</b> ${cal.calyxNote}`);
  if (state.targetKey !== c.defaultCalyx && c.calyces[c.defaultCalyx]) patientNotes.push(`<b>Why ${c.calyces[c.defaultCalyx].label} Is Preferred:</b> ${c.calyces[c.defaultCalyx].calyxNote}`);
  if (c.casePearl) patientNotes.push(`<b>Clinical Pearl:</b> ${c.casePearl}`);

  const grade = score >= 90 ? 'A' : (score >= 78 ? 'B' : (score >= 62 ? 'C' : (score >= 45 ? 'D' : 'F')));
  document.getElementById('revCaseTitle').textContent = `${c.name} — ${cal.label}`;
  document.getElementById('revVerdictSub').textContent = `${d.inTarget ? '✓ Intraluminal Entry' : '✗ Missed Lumen'} | Reach: ${cal.reachPct}% | Fluoro: ${state.fluoroSec.toFixed(1)}s | Attempts: ${Math.max(1, state.punctureAttempts)}`;
  const gBadge = document.getElementById('revGradeBadge');
  gBadge.textContent = grade; gBadge.style.color = { A: '#4ade80', B: '#facc15', C: '#fb923c', D: '#f87171', F: '#ef4444' }[grade];

  document.getElementById('revCompareBody').innerHTML = `
    <tr><td><b>Target Calyx</b></td><td>${cal.label} (${cal.reachPct}%)</td><td>${c.calyces[c.defaultCalyx].label} (${c.calyces[c.defaultCalyx].reachPct}%)</td><td>${cal.reachPct >= 85 ? '<span style="color:#4ade80">Optimal Reach</span>' : '<span style="color:#f87171">Low Reach</span>'}</td></tr>
    <tr><td><b>Skin Entry (Point B)</b></td><td>L=${state.latCm.toFixed(1)}cm, CC=${state.ccCm >= 0 ? '+' : ''}${state.ccCm.toFixed(1)}cm</td><td>L=${opt.latCm.toFixed(1)}cm, CC=${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm.toFixed(1)}cm</td><td>${usedSubcostalForSupracostal ? 'Subcostal to Upper' : 'Optimal Window'}</td></tr>
    <tr><td><b>Coronal &amp; Pitch</b></td><td>Cor ${state.corDeg.toFixed(1)}° / Pitch ${state.pitchDeg.toFixed(1)}°</td><td>Cor ${opt.corDeg.toFixed(1)}° / Pitch ${opt.pitchDeg.toFixed(1)}°</td><td>Dog-Leg: <b>${d.dogLegDeg.toFixed(1)}°</b></td></tr>
    <tr><td><b>Depth &amp; Result</b></td><td>${Math.round(state.depthMm)} mm (${d.distToCalyx.toFixed(1)}mm off)</td><td>${opt.tractDistMm} mm (Papilla Center)</td><td>${d.inTarget ? 'Intraluminal' : 'Extraluminal'}</td></tr>
  `;
  document.getElementById('revHowToImprove').innerHTML = howToImprove.map(i => `<li>${i}</li>`).join('');
  document.getElementById('revPatientCalyxNotes').innerHTML = patientNotes.map(i => `<li>${i}</li>`).join('');
  document.getElementById('punctureReviewModal').style.display = 'flex';
}

function applyIdealFixFromReview() {
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  autoTrigPointB(); setExactDepth(opt.tractDistMm);
  state.lihDirty = true;
  document.getElementById('punctureReviewModal').style.display = 'none';
  pullStylet(true);
}

(function hookRendererUpgrades() {
  let lastFrameTime = performance.now();
  function postRenderOverlay() {
    const now = performance.now(), dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    const isFiring = state.contFluoro || state.pedalDown || state.autoPlaying;
    if (isFiring) {
      state.fluoroSec += dt;
      const fdEl = document.getElementById('dosePill');
      if (fdEl) fdEl.textContent = `${state.fluoroSec.toFixed(1)}s | ${(state.fluoroSec * 0.14).toFixed(2)} mGy`;
    }
    const fw = fluoroCanvas.width, fh = fluoroCanvas.height;
    if (fw > 0 && fh > 0) {
      fCtx.save();
      const sx = fw - 26, syTop = 44, syBot = fh - 44, sHeight = syBot - syTop;
      fCtx.fillStyle = 'rgba(15, 23, 42, 0.78)'; fCtx.strokeStyle = '#334155'; fCtx.lineWidth = 1.2;
      fCtx.fillRect(sx - 10, syTop, 20, sHeight); fCtx.strokeRect(sx - 10, syTop, 20, sHeight);
      const yCur = syTop + Math.min(1, state.depthMm / 125) * sHeight;
      fCtx.fillStyle = '#38bdf8'; fCtx.beginPath(); fCtx.arc(sx, yCur, 7, 0, Math.PI * 2); fCtx.fill();
      fCtx.fillStyle = '#94a3b8'; fCtx.font = 'bold 9px monospace'; fCtx.textAlign = 'right';
      fCtx.fillText(`${Math.round(state.depthMm)}mm`, sx - 13, yCur + 3);
      fCtx.restore();
    }
    requestAnimationFrame(postRenderOverlay);
  }
  requestAnimationFrame(postRenderOverlay);
})();
// === END OF FILE physics.js ===
