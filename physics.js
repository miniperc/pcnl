// ============================================================================
// EXACT GEOMETRIC SOLVER, AUTO-SOLUTION ENGINE & HAPTIC DIAGNOSTICS
// ============================================================================
const lihCanvas = document.createElement('canvas');
const lihCtx = lihCanvas.getContext('2d');
const fluoroCanvas = document.getElementById('fluoroCanvas');
const skinCanvas = document.getElementById('skinCanvas');
const benchCanvas = document.getElementById('benchCanvas');
const fCtx = fluoroCanvas.getContext('2d');
const sCtx = skinCanvas.getContext('2d');
const bCtx = benchCanvas.getContext('2d');

// Prevent mobile browser page-scrolling when dragging on canvases
fluoroCanvas.style.touchAction = 'none';
skinCanvas.style.touchAction = 'none';

function getTargetCalyxBase() {
  return CASES[state.caseIdx].calyces[state.targetKey];
}

function getRespShift() {
  if (state.respMode === 'insp') return -8;
  if (state.respMode === 'exp') return +8;
  return Math.sin(state.tidalPhase) * 8;
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

function computeOptimalGeometryForTechnique(techMode) {
  const cal = getTargetCalyxBase();
  const respMode = cal.supracostal ? 'exp' : 'insp';

  let latCm = Math.round((cal.z * Math.tan(cal.axialDeg * Math.PI / 180)) / 10 * 10) / 10;
  latCm = Math.max(2.6, Math.min(4.8, latCm));

  let corDeg = cal.coronalDeg;
  let ccCm = 0;

  if (techMode === 'bullseye') {
    corDeg = 0;
    ccCm = 0;
  } else {
    const radCor = cal.coronalDeg * Math.PI / 180;
    ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
    ccCm = Math.max(-5.5, Math.min(3.0, ccCm));
    corDeg = Math.round(Math.atan2(-ccCm, latCm) * 180 / Math.PI * 2) / 2;
  }

  if (cal.forceSubcostal) {
    ccCm = -2.2;
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

  return {
    respMode,
    latCm,
    ccCm,
    corDeg,
    pitchDeg,
    tractDistMm,
    fasciaDepthMm,
    dogLegDeg
  };
}

function initCase(idx, keepCalyx = false) {
  stopAutoSolve(true); // Full reset of auto-solve step progress on case/calyx change
  state.caseIdx = idx;
  const c = CASES[idx];
  if (!keepCalyx) {
    state.targetKey = c.defaultCalyx;
    document.getElementById('calyxSelect').value = state.targetKey;
  }
  const opt = computeOptimalGeometryForTechnique(state.coachMode);

  state.respMode = opt.respMode;
  const respLabels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
  document.getElementById('btnResp').textContent = respLabels[state.respMode];

  state.cArmAx = 0;
  state.cArmOb = 0;
  state.latCm = opt.latCm;
  state.ccCm = opt.ccCm;
  state.corDeg = idx === 1 ? 18 : opt.corDeg;
  state.pitchDeg = opt.pitchDeg;
  state.dilPitchDeg = opt.pitchDeg;
  state.depthMm = 0;

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

// ============================================================================
// INTERACTIVE SLOW STEP-BY-STEP AUTO-SOLUTION & ERROR RECOVERY ENGINE
// ============================================================================
(function injectErrorModeSelector() {
  const autoBtn = document.getElementById('autoPlayBtn');
  if (!autoBtn || document.getElementById('errorScenarioSelect')) return;

  const sel = document.createElement('select');
  sel.id = 'errorScenarioSelect';
  sel.title = 'Choose Textbook Run, Fix Your Current Needle Position, or Watch Classic Out-of-Plane Error Fixes';
  sel.style.borderColor = '#f59e0b';
  sel.style.color = '#fde047';
  sel.style.fontWeight = '600';
  sel.innerHTML = `
    <option value="auto_smart">Auto-Solve: Smart (Fixes Your Current Position or Ideal)</option>
    <option value="ideal">Auto-Solve: Ideal Textbook Trajectory</option>
    <option value="err_shallow">Demo Fix 1: Too Shallow / Posterior (Tip BELOW on 30° Ceph)</option>
    <option value="err_deep">Demo Fix 2: Too Deep / Anterior (Tip ABOVE on 30° Ceph)</option>
    <option value="err_coronal">Demo Fix 3: Out-of-Plane Coronal Drift (Off 0° Line / Dog-Leg)</option>
    <option value="err_bullseye">Demo Fix 4: Bull's Eye Coaxial Drift (Shaft Line → Dot Fix)</option>
  `;
  sel.addEventListener('change', () => {
    stopAutoSolve(true);
  });
  autoBtn.parentNode.insertBefore(sel, autoBtn);
})();

function buildAutoSolutionSteps() {
  const cal = getTargetCalyxBase();
  const tech = state.coachMode;
  const opt = computeOptimalGeometryForTechnique(tech);
  const modeSel = document.getElementById('errorScenarioSelect');
  const scenarioMode = modeSel ? modeSel.value : 'auto_smart';

  const techTitle = tech === 'hybrid' ? 'HYBRID (0° LINE + 30° BULL\'S EYE)' :
                    (tech === 'triangulation' ? 'CLASSIC BIPLANAR TRIANGULATION' : 'PURE 30° BULL\'S EYE');

  const steps = [];

  // NOTE ON PITCH ANGLE FROM VERTICAL AP:
  // pitchDeg > opt.pitchDeg = needle is flatter to skin -> passes SUPERFICIAL/POSTERIOR (z < cal.z) -> projects BELOW calyx on 30° Ceph!
  // pitchDeg < opt.pitchDeg = needle is steeper/vertical -> passes DEEP/ANTERIOR (z > cal.z) -> projects ABOVE calyx on 30° Ceph!
  const pitchErr = state.pitchDeg - opt.pitchDeg; // Positive = Too Shallow/Posterior; Negative = Too Deep/Anterior
  const corErr = state.corDeg - opt.corDeg;
  const latErr = Math.abs(state.latCm - opt.latCm) + Math.abs(state.ccCm - opt.ccCm);
  const userHasError = (Math.abs(pitchErr) >= 2.5 || Math.abs(corErr) >= 4.0 || latErr >= 0.4 || !state.clampOn) && state.depthMm > 5;

  // Compute depth where the needle reaches the X-coordinate of the target calyx
  // so at 0° AP the tip appears directly over the calyx!
  const getDepthAtCalyxX = (pDeg, cDeg, latMm) => {
    const pRad = pDeg * Math.PI / 180;
    const cRad = cDeg * Math.PI / 180;
    const dxUnit = Math.sin(pRad) * Math.cos(cRad);
    return Math.min(125, Math.max(35, Math.round(latMm / Math.max(0.2, dxUnit))));
  };

  // --------------------------------------------------------------------------
  // BRANCH A: LIVE RECOVERY OF USER'S CURRENT OUT-OF-PLANE NEEDLE POSITION
  // --------------------------------------------------------------------------
  if (scenarioMode === 'auto_smart' && userHasError) {
    const isCoronalBad = Math.abs(corErr) >= 4.0 || latErr >= 0.4;
    const isPitchBad = Math.abs(pitchErr) >= 2.5;

    steps.push({
      title: `RECOVERY STEP 1: DIAGNOSING YOUR OUT-OF-PLANE TRAJECTORY`,
      techLabel: `LIVE ERROR DIAGNOSIS`,
      duration: 3.4,
      target: {
        stage: 1,
        cArmAx: 0,
        cArmOb: isPitchBad && !isCoronalBad ? 30 : 0
      },
      narration: `${!state.clampOn ? '<b>1. Clamp Off (Gravity Sag):</b> Unclamped hub droops pitch (+8.5° flatter), making the needle pass superficially! ' : ''}` +
        `${isCoronalBad ? `<b>Plane 1 Coronal Drift (${state.corDeg.toFixed(1)}° vs ideal ${opt.corDeg.toFixed(1)}°):</b> On 0° AP view, your needle is off the infundibular axis, causing a${computeDiagnostics().dogLegDeg.toFixed(0)}° dog-leg kink. ` : ''}` +
        `${isPitchBad ? (pitchErr > 0
          ? `<b>Plane 2 Depth Error (Pitch ${state.pitchDeg.toFixed(1)}° is Too Flat / Shallow):</b> On 30° Cephalad view, your tip sits <b>BELOW (caudal to)</b> the calyx—passing superficially (posterior) to the kidney.`
          : `<b>Plane 2 Depth Error (Pitch ${state.pitchDeg.toFixed(1)}° is Too Steep / Deep):</b> On 30° Cephalad view, your tip sits <b>ABOVE (cephalad to)</b> the calyx—passing too deep (anterior) to the calyx.`) : ''}`
    });

    if (state.depthMm > 26) {
      steps.push({
        title: `RECOVERY STEP 2: RETRACT TO SUBCUTANEOUS FAT BEFORE PIVOTING!`,
        techLabel: `PARENCHYMAL PROTECTION RULE`,
        duration: 2.8,
        target: {
          stage: 1,
          clampOn: true,
          depthMm: 18
        },
        onArrive: () => {
          state.clampOn = true;
          document.getElementById('clampBtn').textContent = 'Radiolucent Clamp: ON';
          document.getElementById('clampBtn').className = 'active';
        },
        narration: `<b>Critical OR Rule:</b> Never torque an 18G needle while its tip is buried in the lumbodorsal fascia or renal cortex (${Math.round(state.depthMm)} mm)—it slices the parenchyma! Retracting back to <b>18 mm (Subcutaneous Fat)</b> to pivot safely.`
      });
    }

    if (isCoronalBad) {
      steps.push({
        title: `RECOVERY STEP 3: RE-LOCK PLANE 1 ON 0° AP INFUNDIBULAR LINE`,
        techLabel: `PLANE 1 CORRECTION (0° AP)`,
        duration: 3.0,
        target: {
          stage: 1,
          cArmAx: 0,
          cArmOb: 0,
          latCm: opt.latCm,
          ccCm: opt.ccCm,
          corDeg: opt.corDeg,
          depthMm: Math.min(state.depthMm, 22)
        },
        narration: `<b>Fixing Plane 1 at 0° AP:</b> Adjusting Point B to <b>L = ${opt.latCm.toFixed(1)} cm, CC = ${opt.ccCm.toFixed(1)} cm</b> and rotating Coronal Aim from <b>${state.corDeg.toFixed(1)}° → ${opt.corDeg.toFixed(1)}°</b> so the needle shaft overlays the center of the infundibular neck.`
      });
    }

    if (isPitchBad) {
      steps.push({
        title: `RECOVERY STEP 4: FIX PITCH VIA 30° CEPHALAD PARALLAX`,
        techLabel: `PLANE 2 DEPTH CORRECTION`,
        duration: 3.2,
        target: {
          stage: 1,
          cArmAx: 0,
          cArmOb: 30,
          pitchDeg: opt.pitchDeg,
          depthMm: opt.fasciaDepthMm + 4
        },
        narration: pitchErr > 0
          ? `<b>Fixing Superficial (Posterior) Trajectory at 30° Ceph:</b> Because the tip was <b>BELOW</b> the calyx (needle too flat), we <b>angle the needle steeper downward</b> (changing Pitch from <b>${state.pitchDeg.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) and advance through the fascia.`
          : `<b>Fixing Deep (Anterior) Trajectory at 30° Ceph:</b> Because the tip was <b>ABOVE</b> the calyx (needle too steep), we <b>flatten the needle angle</b> (changing Pitch from <b>${state.pitchDeg.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) and advance through the fascia.`
      });
    }
  }

  // --------------------------------------------------------------------------
  // BRANCH B: 4 DELIBERATE OUT-OF-PLANE ERROR & FIX TRAINING DEMOS
  // --------------------------------------------------------------------------
  else if (scenarioMode === 'err_shallow') {
    // TOO SHALLOW / POSTERIOR = Pitch from vertical is TOO LARGE (needle is too flat to the skin!)
    const shallowPitch = Math.min(55, opt.pitchDeg + 12);
    const apparentDepth = getDepthAtCalyxX(shallowPitch, opt.corDeg, opt.latCm * 10);

    steps.push({
      title: `ERROR DEMO 1: ADVANCING TOO SHALLOW / POSTERIOR`,
      techLabel: `OUT-OF-PLANE DEPTH ERROR`,
      duration: 3.0,
      target: {
        stage: 1, respMode: opt.respMode, cArmAx: 0, cArmOb: 0,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg,
        pitchDeg: shallowPitch, depthMm: apparentDepth
      },
      narration: `<b>The 0° AP Illusion:</b> Look at the <b>0° AP</b> monitor—the needle tip appears to sit right inside the target calyx! However, the needle was angled too flat/superficial (Pitch = <b>${shallowPitch.toFixed(1)}°</b> from vertical instead of <b>${opt.pitchDeg.toFixed(1)}°</b>), so its true depth is only Z = <b>${Math.round(apparentDepth * Math.cos(shallowPitch * Math.PI / 180))} mm</b> (passing <b>posteriorly behind</b> the ${cal.z} mm calyx)!`
    });
    steps.push({
      title: `ERROR DEMO 1: 30° CEPHALAD REVEALS TIP BELOW CALYX`,
      techLabel: `PARALLAX DIAGNOSIS (+30° CEPH)`,
      duration: 3.4,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: shallowPitch, depthMm: apparentDepth
      },
      narration: `<b>Parallax Exposed at +30° Cephalad:</b> Swinging the C-arm to <b>+30° Cephalad</b> tilts the X-ray beam upward toward the head. Because the needle tip is superficial/posterior to the kidney, it shifts <b>BELOW (caudal to)</b> the target calyceal cup! Rule: <b>Tip BELOW Calyx = Too Superficial (Posterior)</b>.`
    });
    steps.push({
      title: `ERROR DEMO 1: RETRACT TO FAT (18 MM) & ANGLE STEEPER`,
      techLabel: `SAFE PIVOT CORRECTION`,
      duration: 3.2,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: opt.pitchDeg, depthMm: 18
      },
      narration: `<b>The OR Fix:</b> Pull the needle back to <b>18 mm (Subcutaneous Fat)</b>, then angle the needle <b>steeper downward toward the kidney</b> (adjusting Pitch from <b>${shallowPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) while keeping Plane 1 locked!`
    });
  }

  else if (scenarioMode === 'err_deep') {
    // TOO DEEP / ANTERIOR = Pitch from vertical is TOO SMALL (needle is held too vertical/steep, plunging deep!)
    const deepPitch = Math.max(14, opt.pitchDeg - 9.5);
    const apparentDepth = getDepthAtCalyxX(deepPitch, opt.corDeg, opt.latCm * 10);

    steps.push({
      title: `ERROR DEMO 2: ADVANCING TOO DEEP / ANTERIOR`,
      techLabel: `ANTERIOR OVERSHOOT TRAP`,
      duration: 3.0,
      target: {
        stage: 1, respMode: opt.respMode, cArmAx: 0, cArmOb: 0,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg,
        pitchDeg: deepPitch, depthMm: apparentDepth
      },
      narration: `<b>The 0° AP Illusion:</b> On the <b>0° AP</b> monitor, the needle tip again appears directly over the target calyx! But because the needle was held too vertical/steep (Pitch = <b>${deepPitch.toFixed(1)}°</b> vs ideal <b>${opt.pitchDeg.toFixed(1)}°</b>), by the time it reaches the calyx X-plane it has plunged to Z = <b>${Math.round(apparentDepth * Math.cos(deepPitch * Math.PI / 180))} mm</b>—<b>deep (anterior)</b> to the ${cal.z} mm posterior calyx!`
    });
    steps.push({
      title: `ERROR DEMO 2: 30° CEPHALAD REVEALS TIP ABOVE CALYX`,
      techLabel: `PARALLAX DIAGNOSIS (+30° CEPH)`,
      duration: 3.4,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: deepPitch, depthMm: apparentDepth
      },
      narration: `<b>Parallax Exposed at +30° Cephalad:</b> Swinging the C-arm to <b>+30° Cephalad</b> projects the deep/anterior needle tip <b>ABOVE (cephalad to)</b> the calyceal cup! Rule: <b>Tip ABOVE Calyx = Too Deep (Anterior)</b>.`
    });
    steps.push({
      title: `ERROR DEMO 2: RETRACT TO FAT (18 MM) & FLATTEN ANGLE`,
      techLabel: `SAFE PIVOT CORRECTION`,
      duration: 3.2,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: opt.pitchDeg, depthMm: 18
      },
      narration: `<b>The OR Fix:</b> Retract the tip back to <b>18 mm (Subcutaneous Fat)</b>, then adjust the needle to a shallower angle (changing Pitch from <b>${deepPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) so it meets the posterior papilla cleanly.`
    });
  }

  else if (scenarioMode === 'err_coronal') {
    const badCor = Math.max(-35, opt.corDeg - 26);
    steps.push({
      title: `ERROR DEMO 3: OUT-OF-PLANE CORONAL DRIFT (ROOF ENTRY)`,
      techLabel: `PLANE 1 VIOLATION`,
      duration: 3.2,
      target: {
        stage: 1, respMode: opt.respMode, cArmAx: 0, cArmOb: 0,
        latCm: opt.latCm, ccCm: 0.0, corDeg: badCor,
        pitchDeg: opt.pitchDeg, depthMm: 45
      },
      narration: `<b>Plane 1 Drift:</b> Look at the <b>0° AP</b> screen and the <b>Coronal Dog-Leg inset</b>. Because Point B was dropped off-line (CC = 0.0 cm) and aimed at <b>${badCor.toFixed(1)}°</b> instead of along the <b>${opt.corDeg.toFixed(1)}°</b> infundibular axis, the needle approaches at a sharp dog-leg angle!`
    });
    steps.push({
      title: `ERROR DEMO 3: RETRACT & REALIGN POINT B ON 0° LINE`,
      techLabel: `PLANE 1 RESTORATION`,
      duration: 3.2,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 0,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg, depthMm: 10
      },
      narration: `<b>The OR Fix:</b> Return to <b>0° AP</b>, retract to subcutaneous fat (<b>10 mm</b>), move Point B onto the dashed blue infundibular line (<b>CC = ${opt.ccCm.toFixed(1)} cm</b>), and lock Coronal Aim to <b>${opt.corDeg.toFixed(1)}°</b>.`
    });
  }

  else if (scenarioMode === 'err_bullseye') {
    const offPitch = opt.pitchDeg - 9;
    const offCor = opt.corDeg + 14;
    steps.push({
      title: `ERROR DEMO 4: BULL'S EYE LOSS OF COAXIAL LOCK (SHAFT LINE)`,
      techLabel: `30° COAXIAL DRIFT`,
      duration: 3.2,
      target: {
        stage: 1, respMode: opt.respMode, cArmAx: cal.axialDeg, cArmOb: 0,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: offCor,
        pitchDeg: offPitch, depthMm: 22
      },
      narration: `<b>Why the Bull's Eye Turned Into a Line:</b> At <b>${cal.axialDeg}° Ipsilateral</b>, your needle should look like a single dot. Because the hub drifted (Pitch <b>${offPitch.toFixed(1)}°</b>, Coronal <b>${offCor.toFixed(1)}°</b>), you see the elongated needle shaft stretching away from the tip!`
    });
    steps.push({
      title: `ERROR DEMO 4: PIVOT HUB OVER TIP TO COLLAPSE LINE INTO DOT`,
      techLabel: `RESTORING COAXIAL DOT`,
      duration: 3.2,
      target: {
        stage: 1, cArmAx: cal.axialDeg, cArmOb: 0,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4
      },
      narration: `<b>The OR Fix:</b> Keep the needle tip anchored at Point B and <b>move the needle hub in the direction of the hub ring</b> until the ring slides directly on top of the tip (<b>◎ BULL'S EYE COAXIAL LOCK</b>), then punch through the fascia (<b>${opt.fasciaDepthMm + 4} mm</b>).`
    });
  }

  // --------------------------------------------------------------------------
  // BRANCH C: STANDARD IDEAL TEXTBOOK INITIALIZATION STEPS (IF NO PRIOR STEPS)
  // --------------------------------------------------------------------------
  if (steps.length === 0) {
    steps.push({
      title: `RESPIRATORY LOCK & INITIAL C-ARM VIEW`,
      techLabel: techTitle,
      duration: 2.6,
      target: {
        stage: 1,
        respMode: opt.respMode,
        cArmAx: tech === 'bullseye' ? cal.axialDeg : 0,
        cArmOb: 0,
        latCm: opt.latCm,
        ccCm: opt.ccCm,
        corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg,
        depthMm: 0
      },
      narration: cal.supracostal
        ? `<b>Supracostal Access (${cal.label}):</b> Locking ventilation in <b>Full Expiration (Exp Hold)</b> so the parietal pleura retracts cephalad out of the 11th–12th intercostal space. Setting C-arm to ${tech === 'bullseye' ? cal.axialDeg + '° Ipsilateral' : '0° AP'} to identify Point A.`
        : `<b>Subcostal Access (${cal.label}):</b> Locking ventilation in <b>Full Inspiration (Insp Hold)</b> to displace the kidney caudally below the 12th rib. Setting C-arm to ${tech === 'bullseye' ? cal.axialDeg + '° Ipsilateral' : '0° AP'} to map Point A.`
    });

    steps.push({
      title: `POINT B SELECTION & SKIN DERMIS PUNCTURE (0 → 3 MM)`,
      techLabel: techTitle,
      duration: 2.8,
      target: {
        stage: 1,
        cArmAx: tech === 'bullseye' ? cal.axialDeg : 0,
        cArmOb: 0,
        latCm: opt.latCm,
        ccCm: opt.ccCm,
        corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg,
        depthMm: 3
      },
      narration: `<b>Point B Coordinates:</b> Placed at <b>L = ${opt.latCm.toFixed(1)} cm</b> lateral and <b>CC = ${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm.toFixed(1)} cm</b> along the <b>${opt.corDeg.toFixed(1)}°</b> coronal axis (Total 3D Tract = <b>${opt.tractDistMm} mm</b>). Advancing from <b>0 mm → 3 mm</b> pierces the tough skin dermis (<b>Skin Pop: 3.2 N</b>).`
    });

    steps.push({
      title: `SUBCUTANEOUS FAT & LUMBODORSAL FASCIA [1ST POP]`,
      techLabel: techTitle,
      duration: 3.2,
      target: {
        stage: 1,
        cArmAx: tech === 'triangulation' ? 0 : cal.axialDeg,
        cArmOb: 0,
        latCm: opt.latCm,
        ccCm: opt.ccCm,
        corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg,
        depthMm: opt.fasciaDepthMm + 4
      },
      narration: tech === 'triangulation'
        ? `<b>Plane 1 Advancement (0° AP):</b> Gliding through low-resistance subcutaneous fat (3–24 mm) while keeping the needle strictly on the 0° infundibular line, then punching through the <b>Lumbodorsal Fascia at ${opt.fasciaDepthMm} mm [1st Tactile Pop: 6.8 N]</b>.`
        : `<b>30° Coaxial Lock (${cal.axialDeg}° Ipsilateral):</b> Rotating C-arm to look straight down the needle barrel (hub superimposed over tip as a single Bull's Eye dot) and advancing to <b>${opt.fasciaDepthMm + 4} mm</b> through the <b>Lumbodorsal Fascia [1st Pop]</b>.`
    });

    steps.push({
      title: `BIPLANAR DEPTH & PARALLAX VERIFICATION`,
      techLabel: techTitle,
      duration: 3.0,
      target: {
        stage: 1,
        cArmAx: 0,
        cArmOb: tech === 'triangulation' ? 30 : 0,
        latCm: opt.latCm,
        ccCm: opt.ccCm,
        corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg,
        depthMm: opt.tractDistMm - 10
      },
      narration: tech === 'triangulation'
        ? `<b>Plane 2 Parallax Check (30° Cephalad Oblique):</b> Tilting C-arm to +30° Cephalad to read needle depth relative to the calyx. Pitch is locked at <b>${opt.pitchDeg.toFixed(1)}°</b> so the needle tip points directly into the calyceal cup without drifting off Plane 1.`
        : `<b>0° AP Depth Verification:</b> Swinging C-arm back to <b>0° AP</b> to visualize depth along the infundibular axis as the needle tip crosses Gerota's perinephric space toward the renal capsule (<b>${opt.tractDistMm - 10} mm</b>).`
    });
  }

  // --------------------------------------------------------------------------
  // COMMON COMPLETION STEPS (PAPILLARY POP -> WIRE STEERING -> DILATION)
  // --------------------------------------------------------------------------
  steps.push({
    title: `CAPSULAR DIMPLE SIGN & PAPILLARY ENTRY [2ND POP]`,
    techLabel: techTitle,
    duration: 3.0,
    target: {
      stage: 1,
      cArmAx: 0,
      cArmOb: 0,
      latCm: opt.latCm,
      ccCm: opt.ccCm,
      corDeg: opt.corDeg,
      pitchDeg: opt.pitchDeg,
      depthMm: opt.tractDistMm
    },
    onArrive: () => { pullStylet(); },
    narration: `<b>2nd Tactile Pop (${opt.tractDistMm} mm):</b> Watch the contrast cup indent (<b>Fluoroscopic Dimple Sign</b>) as the tip tents the renal capsule and pops dead-center through the avascular papilla along Brödel's plane! Pulling stylet confirms <b>Clear Urine Efflux</b> (Dog-leg angle: <b>${opt.dogLegDeg.toFixed(1)}°</b>).`
  });

  const idealTorque = getOptimalTerumoTorqueForCor(opt.corDeg, cal.coronalDeg);
  steps.push({
    title: `STAGE 2 — ANGLED TERUMO WIRE STEERING INTO URETER`,
    techLabel: techTitle,
    duration: 2.8,
    target: {
      stage: 2,
      cArmAx: 0,
      cArmOb: 0,
      terumoTorqueDeg: idealTorque,
      wireAdvMm: 88
    },
    onArrive: () => { evaluateWireProgress(); },
    narration: `<b>Hydrophilic Guidewire Negotiation:</b> Rotating the angled 0.035" Terumo tip torque vise to the sweet spot (<b>${idealTorque}°</b>) so the bevel deflects past the impacted stone rim and glides down the infundibular neck into the renal pelvis and ureter.`
  });

  steps.push({
    title: `5Fr KUMPE CATHETER & SUPER STIFF WIRE EXCHANGE`,
    techLabel: techTitle,
    duration: 2.4,
    target: {
      stage: 2,
      kumpeAdvanced: true,
      stiffWireExchanged: true
    },
    onArrive: () => {
      state.kumpeAdvanced = true;
      state.stiffWireExchanged = true;
      document.getElementById('btnKumpe').classList.add('active');
      document.getElementById('btnStiff').classList.add('active');
      exchangeStiffWire();
    },
    narration: `<b>Securing the Working Tract:</b> Advancing a <b>5 Fr Kumpe (KMP)</b> angiographic catheter over the slippery Terumo wire into the pelvis, then exchanging for a high-tensile <b>0.035" Amplatz Super Stiff</b> wire to prevent fascial kinking during dilation.`
  });

  steps.push({
    title: `STAGE 3 — COAXIAL 24Fr AMPLATZ SHEATH DILATION`,
    techLabel: techTitle,
    duration: 3.0,
    target: {
      stage: 3,
      dilPitchDeg: opt.pitchDeg,
      rodDepthMm: opt.tractDistMm,
      sheathDepthMm: opt.tractDistMm
    },
    onArrive: () => { evaluateDilationPhysics(); },
    narration: `<b>Coaxial Tract Dilation (${opt.tractDistMm} mm):</b> Matching dilator pitch strictly to the needle pitch (<b>${opt.pitchDeg.toFixed(1)}°</b>) so the Alken guide rod and <b>24 Fr Amplatz sheath</b> park inside the calyceal cup without kinking the wire or perforating the medial pelvis!`
  });

  steps.forEach((s, idx) => {
    s.title = `STEP ${idx + 1}/${steps.length}: ${s.title}`;
  });

  return steps;
}

function toggleAutoSolve() {
  if (state.autoPlaying) {
    stopAutoSolve(false); // Pause only — preserve current step & timer!
    return;
  }

  const isFinished = state.autoSteps.length > 0 &&
                     state.autoStepIdx >= state.autoSteps.length - 1 &&
                     state.autoStepTimer >= state.autoSteps[state.autoStepIdx].duration;

  if (!state.autoSteps || state.autoSteps.length === 0 || isFinished) {
    state.autoSteps = buildAutoSolutionSteps();
    state.autoStepIdx = 0;
    state.autoStepTimer = 0;
  }

  state.autoPlaying = true;
  const btn = document.getElementById('autoPlayBtn');
  btn.textContent = `⏸ Pause (Step ${state.autoStepIdx + 1}/${state.autoSteps.length})`;
  btn.classList.add('playing');
  applyAutoStepStart(state.autoStepIdx);
}

function stopAutoSolve(resetProgress = false) {
  state.autoPlaying = false;
  if (resetProgress) {
    state.autoSteps = [];
    state.autoStepIdx = 0;
    state.autoStepTimer = 0;
  }
  const btn = document.getElementById('autoPlayBtn');
  if (!btn) return;
  btn.classList.remove('playing');

  const hasPausedProgress = !resetProgress &&
                            state.autoSteps &&
                            state.autoSteps.length > 0 &&
                            (state.autoStepIdx < state.autoSteps.length - 1 ||
                             state.autoStepTimer < state.autoSteps[state.autoStepIdx].duration);

  if (hasPausedProgress) {
    btn.textContent = `▶ Resume (Step ${state.autoStepIdx + 1}/${state.autoSteps.length})`;
  } else {
    btn.textContent = '▶ Auto-Solve (Slow Step-by-Step)';
  }
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
  if (st.target.stage && st.target.stage !== state.stage) setStage(st.target.stage);
  if (st.target.respMode) {
    state.respMode = st.target.respMode;
    const labels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
    document.getElementById('btnResp').textContent = labels[state.respMode];
  }
  const btn = document.getElementById('autoPlayBtn');
  if (btn && state.autoPlaying) {
    btn.textContent = `⏸ Pause (Step ${idx + 1}/${state.autoSteps.length})`;
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
  if (t.terumoTorqueDeg !== undefined) state.terumoTorqueDeg = t.terumoTorqueDeg;
  if (t.wireAdvMm !== undefined) state.wireAdvMm = t.wireAdvMm;
  if (t.dilPitchDeg !== undefined) state.dilPitchDeg = t.dilPitchDeg;
  if (t.rodDepthMm !== undefined) state.rodDepthMm = t.rodDepthMm;
  if (t.sheathDepthMm !== undefined) state.sheathDepthMm = t.sheathDepthMm;
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
  if (t.terumoTorqueDeg !== undefined) state.terumoTorqueDeg = Math.round(lerp(state.terumoTorqueDeg, t.terumoTorqueDeg));
  if (t.wireAdvMm !== undefined) state.wireAdvMm = Math.round(lerp(state.wireAdvMm, t.wireAdvMm));
  if (t.dilPitchDeg !== undefined) state.dilPitchDeg = Math.round(lerp(state.dilPitchDeg, t.dilPitchDeg) * 10) / 10;
  if (t.rodDepthMm !== undefined) state.rodDepthMm = Math.round(lerp(state.rodDepthMm, t.rodDepthMm));
  if (t.sheathDepthMm !== undefined) state.sheathDepthMm = Math.round(lerp(state.sheathDepthMm, t.sheathDepthMm));

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

// ============================================================================
// UI SYNC & CONTROLS
// ============================================================================
function syncAllUI() {
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
  document.getElementById('vCor').textContent = state.corDeg.toFixed(1) + '°';
  document.getElementById('sPitch').value = state.pitchDeg;
  document.getElementById('vPitch').textContent = state.pitchDeg.toFixed(1) + '°';
  document.getElementById('sDepth').value = state.depthMm;

  const dRound = Math.round(state.depthMm);
  document.getElementById('vDepth').textContent = dRound === 0 ? '0 mm (On Skin)' : `${dRound} mm`;

  const cal = getTargetCalyxBase();
  const surfMm = Math.hypot(state.latCm * 10, state.ccCm * 10);
  const idealP = Math.atan2(surfMm, cal.z) * 180 / Math.PI;
  const tractMm = Math.round(Math.hypot(surfMm, cal.z));
  document.getElementById('trigHint').textContent = `Tract:${tractMm}mm | Ideal Pitch:${idealP.toFixed(1)}°`;

  document.getElementById('sTorque').value = state.terumoTorqueDeg;
  document.getElementById('vTorque').textContent = state.terumoTorqueDeg + '°';
  document.getElementById('sWireAdv').value = state.wireAdvMm;
  document.getElementById('vWireAdv').textContent = state.wireAdvMm + ' mm';

  document.getElementById('needlePitchRef').textContent = `Needle Pitch: ${state.pitchDeg.toFixed(1)}°`;
  document.getElementById('sDilPitch').value = state.dilPitchDeg;
  document.getElementById('vDilPitch').textContent = state.dilPitchDeg.toFixed(1) + '°';
  document.getElementById('sRod').value = state.rodDepthMm;
  document.getElementById('vRod').textContent = state.rodDepthMm + ' mm';
  document.getElementById('sSheath').value = state.sheathDepthMm;
  document.getElementById('vSheath').textContent = state.sheathDepthMm + ' mm';
  document.getElementById('sScopeSweep').value = state.scopeSweepDeg;
  document.getElementById('vScopeSweep').textContent = state.scopeSweepDeg + '°';
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
  document.getElementById(id).addEventListener('input', e => {
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
bindSlider('sCor', v => { state.corDeg = v; });
bindSlider('sPitch', v => { state.pitchDeg = v; });
bindSlider('sDepth', v => { state.depthMm = v; state.styletPulled = false; });

bindSlider('sTorque', v => { state.terumoTorqueDeg = v; evaluateWireProgress(); });
bindSlider('sWireAdv', v => { state.wireAdvMm = v; evaluateWireProgress(); });

bindSlider('sDilPitch', v => { state.dilPitchDeg = v; evaluateDilationPhysics(); });
bindSlider('sRod', v => {
  state.rodDepthMm = v;
  if (state.sheathDepthMm > v + 4) state.sheathDepthMm = v;
  evaluateDilationPhysics();
});
bindSlider('sSheath', v => {
  state.sheathDepthMm = Math.min(v, state.rodDepthMm + 4);
  evaluateDilationPhysics();
});
bindSlider('sScopeSweep', v => { state.scopeSweepDeg = v; evaluateDilationPhysics(); });

function markCArmVisited() {
  if (Math.abs(state.cArmAx) <= 2 && Math.abs(state.cArmOb) <= 2) state.visited0AP = true;
  if (Math.abs(state.cArmAx - 30) <= 6 && Math.abs(state.cArmOb) <= 5) state.visited30Ax = true;
  if (Math.abs(state.cArmOb) >= 20) state.visited30Ob = true;
}

function setCArm(ax, ob) {
  stopAutoSolve(false);
  state.cArmAx = ax;
  state.cArmOb = ob;
  state.lihDirty = true;
  markCArmVisited();
  syncAllUI();
  updateDiagnosticsAndCoach();
}

function setStage(st) {
  state.stage = st;
  document.getElementById('stBtn1').classList.toggle('active', st === 1);
  document.getElementById('stBtn2').classList.toggle('active', st === 2);
  document.getElementById('stBtn3').classList.toggle('active', st === 3);
  document.getElementById('stage1Panel').classList.toggle('visible', st === 1);
  document.getElementById('stage2Panel').classList.toggle('visible', st === 2);
  document.getElementById('stage3Panel').classList.toggle('visible', st === 3);

  if (st === 2) setWorkbench('wire');
  if (st === 3) setWorkbench('dilation');
}

function setWorkbench(wb) {
  state.workbench = wb;
  document.getElementById('wbTab1').classList.toggle('active', wb === 'anatomy');
  document.getElementById('wbTab5').classList.toggle('active', wb === 'compare');
  document.getElementById('wbTab2').classList.toggle('active', wb === 'ultrasound');
  document.getElementById('wbTab3').classList.toggle('active', wb === 'wire');
  document.getElementById('wbTab4').classList.toggle('active', wb === 'dilation');
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

function startPedal() {
  state.pedalDown = true;
  state.lihDirty = true;
  document.getElementById('pedalBtn').classList.add('firing');
}
function stopPedal() {
  state.pedalDown = false;
  document.getElementById('pedalBtn').classList.remove('firing');
}

function toggleClamp() {
  state.clampOn = !state.clampOn;
  state.lihDirty = true;
  const b = document.getElementById('clampBtn');
  b.textContent = `Radiolucent Clamp: ${state.clampOn ? 'ON' : 'OFF (Gravity Sag!)'}`;
  b.className = state.clampOn ? 'active' : 'warn-active';
  updateDiagnosticsAndCoach();
}

function toggleAir() {
  state.airBolus = !state.airBolus;
  state.lihDirty = true;
  document.getElementById('btnAir').classList.toggle('active', state.airBolus);
}

function toggleHydro() {
  state.hydro = !state.hydro;
  state.lihDirty = true;
  document.getElementById('btnHydro').classList.toggle('active', state.hydro);
}

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
  state.depthMm = Math.max(0, Math.min(135, d));
  state.styletPulled = false;
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
}

function jumpToFascia() {
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  setExactDepth(opt.fasciaDepthMm);
}

function stepDepth(d) {
  setExactDepth(state.depthMm + d);
}

function markPointA() {
  setCArm(0, 0);
  state.pointAMarked = true;
}

function autoTrigPointB() {
  stopAutoSolve(false);
  const opt = computeOptimalGeometryForTechnique(state.coachMode);
  state.respMode = opt.respMode;
  const labels = { insp: 'Resp: Insp Hold', exp: 'Resp: Exp Hold', tidal: 'Resp: Tidal' };
  document.getElementById('btnResp').textContent = labels[state.respMode];

  state.latCm = opt.latCm;
  state.ccCm = opt.ccCm;
  state.corDeg = opt.corDeg;
  state.pitchDeg = opt.pitchDeg;
  state.dilPitchDeg = opt.pitchDeg;
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
}

// ============================================================================
// MOUSE, TOUCH & KEYBOARD INTERACTION
// ============================================================================
let draggingFluoroHub = false;
let lastPointer = { x: 0, y: 0 };

fluoroCanvas.addEventListener('pointerdown', e => {
  if (e.target.tagName === 'BUTTON') return;
  stopAutoSolve(false);
  draggingFluoroHub = true;
  lastPointer = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', e => {
  if (!draggingFluoroHub) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer = { x: e.clientX, y: e.clientY };

  state.pitchDeg = Math.max(10, Math.min(60, state.pitchDeg + dx * 0.12));
  state.corDeg = Math.max(-45, Math.min(65, state.corDeg - dy * 0.15));
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
});
window.addEventListener('pointerup', () => { draggingFluoroHub = false; });

fluoroCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 2 : -2;
  stepDepth(delta);
}, { passive: false });

let draggingSkinPointB = false;
skinCanvas.addEventListener('pointerdown', e => {
  stopAutoSolve(false);
  const rect = skinCanvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const scale = rect.width / 180;
  const ox = 20 * scale;
  const oy = rect.height * 0.52;
  const wx = (px - ox) / scale;
  const wy = (oy - py) / scale;

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
  const wx = (e.clientX - rect.left - 20 * scale) / scale;
  const wy = (rect.height * 0.52 - (e.clientY - rect.top)) / scale;
  movePointBOnSkin(wx, wy);
});
window.addEventListener('pointerup', () => { draggingSkinPointB = false; });

function movePointBOnSkin(wx, wy) {
  const cal = getTargetCalyxBase();
  const refX = cal.x;
  const refY = cal.y + getRespShift();
  state.latCm = Math.max(1.5, Math.min(8.0, (wx - refX) / 10));
  state.ccCm = Math.max(-6.0, Math.min(3.5, (wy - refY) / 10));
  const dx = refX - (refX + state.latCm * 10);
  const dy = refY - (refY + state.ccCm * 10);
  state.corDeg = Math.round(Math.max(-45, Math.min(65, Math.atan2(dy, -dx) * 180 / Math.PI)) * 2) / 2;
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space' && document.activeElement.tagName !== 'BUTTON') {
    e.preventDefault(); startPedal();
  } else if (e.code === 'ArrowUp') {
    e.preventDefault(); stepDepth(1);
  } else if (e.code === 'ArrowDown') {
    e.preventDefault(); stepDepth(-1);
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    state.pitchDeg = Math.min(60, state.pitchDeg + 0.5);
    state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    state.pitchDeg = Math.max(10, state.pitchDeg - 0.5);
    state.lihDirty = true; syncAllUI(); updateDiagnosticsAndCoach();
  } else if (e.code === 'KeyQ') {
    setCArm(0, 0);
  } else if (e.code === 'KeyE') {
    setCArm(30, 0);
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') stopPedal();
});

// ============================================================================
// 3D GEOMETRY & HAPTIC LAYER ENGINE
// ============================================================================
function getEffectiveNeedleAngles() {
  let sagPitch = 0;
  let sagCor = 0;
  if (!state.clampOn && state.depthMm > 0 && state.depthMm < 28) {
    const factor = (28 - state.depthMm) / 28;
    sagPitch = 8.5 * factor;
    sagCor = -7.0 * factor;
  }
  return {
    effPitch: state.pitchDeg + sagPitch,
    effCor: state.corDeg + sagCor,
    isSagging: (!state.clampOn && state.depthMm > 0 && state.depthMm < 28)
  };
}

function getNeedle3D() {
  const cal = getTargetCalyxBase();
  const dyResp = getRespShift();
  const pointA = { x: cal.x, y: cal.y + dyResp, z: 0 };
  const skinEntry = {
    x: pointA.x + state.latCm * 10,
    y: pointA.y + state.ccCm * 10,
    z: 0
  };

  const { effPitch, effCor, isSagging } = getEffectiveNeedleAngles();
  const pRad = effPitch * Math.PI / 180;
  const cRad = effCor * Math.PI / 180;

  const dir = {
    x: -Math.sin(pRad) * Math.cos(cRad),
    y: Math.sin(pRad) * Math.sin(cRad),
    z: Math.cos(pRad)
  };

  const len = 135;
  const tip = {
    x: skinEntry.x + dir.x * state.depthMm,
    y: skinEntry.y + dir.y * state.depthMm,
    z: skinEntry.z + dir.z * state.depthMm
  };
  const hub = {
    x: tip.x - dir.x * len,
    y: tip.y - dir.y * len,
    z: tip.z - dir.z * len
  };

  return { pointA, skinEntry, dir, tip, hub, isSagging, effPitch, effCor };
}

function getLiveAnatomy() {
  const base = CASES[state.caseIdx];
  const dy = getRespShift();
  const ng = getNeedle3D();
  const targetBase = base.calyces[state.targetKey];

  let pushX = 0, pushY = 0;
  if (state.depthMm > 52 && state.depthMm < targetBase.z - 2) {
    const f = (state.depthMm - 52) * 0.10;
    pushX = ng.dir.x * f;
    pushY = ng.dir.y * f;
  }

  const shiftedCalyces = {};
  for (const k of Object.keys(base.calyces)) {
    const c = base.calyces[k];
    shiftedCalyces[k] = {
      ...c,
      x: c.x + pushX,
      y: c.y + dy + pushY,
      cupR: c.cupR + (state.hydro ? 2.2 : 0)
    };
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
  const dx = pt.x - iso.x;
  const dy = pt.y - iso.y;
  const dz = pt.z - iso.z;
  const a = state.cArmAx * Math.PI / 180;
  const b = state.cArmOb * Math.PI / 180;
  const x1 = dx * Math.cos(a) + dz * Math.sin(a);
  const z1 = -dx * Math.sin(a) + dz * Math.cos(a);
  const y2 = dy * Math.cos(b) - z1 * Math.sin(b);
  return { u: x1, v: y2 };
}

// ============================================================================
// CONTRAST, STYLET, ACTIVE WIRE STEERING & DILATION FUNCTIONS
// ============================================================================
function injectNeedleContrast() {
  const diag = computeDiagnostics();
  const ng = getNeedle3D();
  state.lihDirty = true;

  const badge = document.getElementById('statusBadge');
  const txt = document.getElementById('statusText');

  if (diag.inTarget) {
    state.hydro = true;
    document.getElementById('btnHydro').classList.add('active');
    badge.className = 'badge-pill b-ok';
    badge.textContent = 'INTRALUMINAL PYELOGRAM OPACIFICATION';
    txt.innerHTML = 'Contrast injected cleanly into the target calyx and renal pelvis, confirming intraluminal position.';
  } else {
    state.blushClouds.push({
      x: ng.tip.x,
      y: ng.tip.y,
      z: ng.tip.z,
      r: 13 + Math.random() * 5
    });
    document.getElementById('clearBlushBtn').style.display = 'inline-block';
    badge.className = 'badge-pill b-err';
    badge.textContent = 'CONTRAST EXTRAVASATION ("BLUSH" CLOUD)!';
    txt.innerHTML = `You injected contrast while the needle tip was in <b>${diag.layer}</b>! Extravasated contrast now obscures the calyx. Always verify urine efflux before injecting.`;
  }
}

function clearBlush() {
  state.blushClouds = [];
  state.lihDirty = true;
  document.getElementById('clearBlushBtn').style.display = 'none';
}

function pullStylet() {
  state.styletPulled = true;
  state.blindRevealed = true;
  state.lihDirty = true;
  const diag = computeDiagnostics();
  const badge = document.getElementById('statusBadge');
  const txt = document.getElementById('statusText');

  if (diag.inTarget) {
    badge.className = 'badge-pill b-ok';
    badge.textContent = 'CLEAR URINE / METHYLENE BLUE EFFLUX!';
    txt.innerHTML = `Transpapillary entry into <b>${getTargetCalyxBase().label}</b> confirmed! Infundibular dog-leg angle: <b>${diag.dogLegDeg.toFixed(1)}°</b>. Click <b>"2. Steer Guidewire →"</b>.`;
  } else if (diag.inAnt) {
    badge.className = 'badge-pill b-warn';
    badge.textContent = 'ANTERIOR CALYX TRAP (EXCESSIVE TORQUE)';
    txt.innerHTML = `Efflux present, but you entered an <b>Anterior Calyx</b>. Navigating to the pelvis requires a >90° hairpin turn.`;
  } else if (diag.inInfundibulumWall) {
    badge.className = 'badge-pill b-err';
    badge.textContent = 'VENOUS HEMORRHAGE — INFUNDIBULAR PUNCTURE';
    txt.innerHTML = `Direct infundibular neck puncture! You bypassed the avascular papilla (Brödel's plane) and lacerated interlobar vessels.`;
  } else {
    badge.className = 'badge-pill b-warn';
    badge.textContent = 'DRY TAP (NO EFFLUX)';
    txt.innerHTML = `Tip is in <b>${diag.layer}</b> (${diag.distToCalyx.toFixed(1)} mm from target papilla). Adjust depth/pitch using 0° AP and 30° Ceph views.`;
  }
  updateDiagnosticsAndCoach();
}

function goToWireStage() {
  const diag = computeDiagnostics();
  if (!diag.inTarget) {
    pullStylet();
    return;
  }
  setStage(2);
  evaluateWireProgress();
}

function getOptimalTerumoTorqueForCor(corDeg, calCorDeg) {
  const rawMismatch = corDeg - calCorDeg;
  return ((180 + Math.round(rawMismatch * 2.5)) % 360 + 360) % 360;
}

function getOptimalTerumoTorque() {
  const c = getLiveAnatomy();
  return getOptimalTerumoTorqueForCor(state.corDeg, c.targetCalyx.coronalDeg);
}

function autoSteerTerumo() {
  state.terumoTorqueDeg = getOptimalTerumoTorque();
  state.wireAdvMm = 88;
  syncAllUI();
  evaluateWireProgress();
}

function stepWire(delta) {
  state.wireAdvMm = Math.max(0, Math.min(100, state.wireAdvMm + delta));
  syncAllUI();
  evaluateWireProgress();
}

function evaluateWireProgress() {
  const diag = computeDiagnostics();
  const badge = document.getElementById('statusBadge');
  const txt = document.getElementById('statusText');
  const idealTorque = getOptimalTerumoTorque();
  document.getElementById('sweetSpotHint').textContent = `Sweet Spot: ~${idealTorque}°`;

  if (!diag.inTarget) {
    state.wireInPelvis = false;
    badge.className = 'badge-pill b-err';
    badge.textContent = 'NEEDLE NOT IN CALYX';
    txt.innerHTML = 'Return to Stage 1 and place the needle tip inside the calyceal cup before advancing the wire.';
    return;
  }

  const torqueDiff = Math.min(
    Math.abs(state.terumoTorqueDeg - idealTorque),
    360 - Math.abs(state.terumoTorqueDeg - idealTorque)
  );

  const needsPreciseTorque = diag.dogLegDeg > 16 || CASES[state.caseIdx].stoneType === 'staghorn';
  const torqueAligned = !needsPreciseTorque || torqueDiff <= 38;

  if (state.wireAdvMm >= 55 && torqueAligned && diag.dogLegDeg <= 32) {
    state.wireInPelvis = true;
    badge.className = 'badge-pill b-ok';
    badge.textContent = 'TERUMO WIRE NEGOTIATED INTO PELVIS & URETER!';
    txt.innerHTML = `Angled hydrophilic tip deflected past the stone edge and across the infundibular neck into the ureter. Now advance the <b>5Fr Kumpe Catheter</b> and swap for an <b>Amplatz Super Stiff Wire</b>.`;
  } else if (state.wireAdvMm >= 35) {
    state.wireInPelvis = false;
    badge.className = 'badge-pill b-warn';
    if (diag.dogLegDeg > 32) {
      badge.textContent = `SEVERE DOG-LEG (${diag.dogLegDeg.toFixed(0)}°) — WIRE BLOCKED`;
      txt.innerHTML = `Your needle entered at a <b>${diag.dogLegDeg.toFixed(1)}° angle</b> to the infundibulum (Pure Bull's Eye Roof-Entry Trap!). Return to Stage 1 (0° AP) and align Coronal Aim with the infundibulum.`;
    } else {
      badge.textContent = 'WIRE BOUNCING OFF STONE / NECK WALL';
      txt.innerHTML = `Rotate the <b>Terumo Tip Torque Vise</b> toward <b>~${idealTorque}°</b> (or click Auto-Torque Tip) so the bevel slips past the stone!`;
    }
  }
  updateDiagnosticsAndCoach();
}

function toggleKumpe() {
  if (!state.wireInPelvis) return;
  state.kumpeAdvanced = !state.kumpeAdvanced;
  state.lihDirty = true;
  document.getElementById('btnKumpe').classList.toggle('active', state.kumpeAdvanced);
  updateDiagnosticsAndCoach();
}

function exchangeStiffWire() {
  if (!state.wireInPelvis) return;
  state.stiffWireExchanged = true;
  state.lihDirty = true;
  document.getElementById('btnStiff').classList.add('active');
  const badge = document.getElementById('statusBadge');
  const txt = document.getElementById('statusText');
  badge.className = 'badge-pill b-ok';
  badge.textContent = '0.035" AMPLATZ SUPER STIFF WIRE SECURED!';
  txt.innerHTML = 'Working wire locked down the ureter. Proceed to <b>Stage 3: Tract Dilation</b>.';
  updateDiagnosticsAndCoach();
}

function matchDilatorAngle() {
  state.dilPitchDeg = state.pitchDeg;
  state.wireKinked = false;
  syncAllUI();
  evaluateDilationPhysics();
}

function evaluateDilationPhysics() {
  const pitchMismatch = Math.abs(state.dilPitchDeg - state.pitchDeg);
  const badge = document.getElementById('statusBadge');
  const txt = document.getElementById('statusText');
  const cal = getTargetCalyxBase();

  const kinkThreshold = state.stiffWireExchanged ? 6.5 : 3.5;
  state.wireKinked = state.rodDepthMm > 25 && pitchMismatch > kinkThreshold;

  if (state.wireKinked) {
    badge.className = 'badge-pill b-err';
    badge.textContent = `GUIDEWIRE KINKED AT FASCIA! (MISMATCH: ${pitchMismatch.toFixed(1)}°)`;
    txt.innerHTML = `Dilator pitch (<b>${state.dilPitchDeg.toFixed(1)}°</b>) deviates from the wire vector (<b>${state.pitchDeg.toFixed(1)}°</b>), kinking the wire at the lumbodorsal fascia!`;
  } else if (state.rodDepthMm > state.depthMm + 14) {
    badge.className = 'badge-pill b-err';
    badge.textContent = 'MEDIAL RENAL PELVIS PERFORATION!';
    txt.innerHTML = `Over-advancing the Alken guide rod past the calyceal cup (${state.rodDepthMm} mm vs target ${Math.round(state.depthMm)} mm) perforates the medial pelvic wall!`;
  } else if (Math.abs(state.sheathDepthMm - state.depthMm) <= 7 && state.rodDepthMm >= state.depthMm - 4) {
    badge.className = 'badge-pill b-ok';
    badge.textContent = '24 Fr AMPLATZ SHEATH PARKED IN CALYCEAL CUP!';
    txt.innerHTML = `Optimal coaxial tract dilation complete! Use the <b>Rigid Nephroscope Sweep</b> slider to inspect stone clearance reach and parenchymal torque.`;
  }

  const diag = computeDiagnostics();
  const effectiveTorqueStress = Math.round(diag.dogLegDeg * 0.9 + Math.abs(state.scopeSweepDeg) * 1.1);
  const torqueColor = effectiveTorqueStress < 28 ? '#4ade80' : (effectiveTorqueStress < 45 ? '#fbbf24' : '#f87171');
  document.getElementById('torqueScoreBox').innerHTML = `
    <div><b>Selected Calyx:</b> ${cal.label}</div>
    <div><b>Rigid Scope Stone Reach:</b> <span style="color:#38bdf8;font-weight:700;">${cal.reachPct}% of Pelvicalyceal System</span></div>
    <div><b>Infundibular Torque Stress:</b> <span style="color:${torqueColor};font-weight:700;">${effectiveTorqueStress} N·cm (${effectiveTorqueStress < 28 ? 'Safe Fulcrum' : (effectiveTorqueStress < 45 ? 'Moderate Torque' : 'DANGER: Infundibular Tear Risk!')})</span></div>
  `;
  updateDiagnosticsAndCoach();
}

function computeDiagnostics() {
  const c = getLiveAnatomy();
  const ng = getNeedle3D();
  const cal = c.targetCalyx;

  const distToCalyx = Math.hypot(ng.tip.x - cal.x, ng.tip.y - cal.y, ng.tip.z - cal.z);
  const distToAnt = Math.hypot(ng.tip.x - c.antCalyx.x, ng.tip.y - c.antCalyx.y, ng.tip.z - c.antCalyx.z);

  const infVec = getInfundibularUnitVector(cal);
  const dot = Math.max(-1, Math.min(1, ng.dir.x * infVec.x + ng.dir.y * infVec.y + ng.dir.z * infVec.z));
  const dogLegDeg = Math.acos(dot) * 180 / Math.PI;
  const coronalMismatch = Math.abs(ng.effCor - cal.coronalDeg);

  const colonRisk = ng.skinEntry.x > 126;
  const paraspinalRisk = ng.skinEntry.x < 54;

  const tRib = 18 / Math.max(0.15, ng.dir.z);
  const yAtRib = ng.skinEntry.y + ng.dir.y * tRib;
  const ribHit = state.depthMm >= tRib && Math.abs(yAtRib - c.rib12Y) < 4.2;
  const intercostalHit = state.depthMm >= tRib && (c.rib12Y - yAtRib > 0 && c.rib12Y - yAtRib < 6.0);

  const pleuraBorderY = c.pleuraY + (state.respMode === 'insp' ? -10 : 5);
  const pleuraHit = state.depthMm >= tRib && yAtRib > pleuraBorderY;

  let layer = "0mm: On Skin Surface (Point B)";
  let resistanceN = 0.0;
  let popZone = 'none';
  let dimpleFactor = 0.0;

  if (state.depthMm <= 0.5) {
    layer = "0mm: On Skin Surface (Point B)";
    resistanceN = 0.0;
  } else if (state.depthMm > 0.5 && state.depthMm <= 3.5) {
    layer = "Skin Dermis Puncture [Skin Pop]";
    resistanceN = 3.2;
    popZone = 'skin';
  } else if (ng.tip.z > 2.5 && ng.tip.z <= 23) {
    layer = "Subcutaneous Fat (Floating Zone)";
    resistanceN = 0.8;
  } else if (ng.tip.z > 23 && ng.tip.z <= 29) {
    layer = "Lumbodorsal Fascia [1st Tactile Pop!]";
    resistanceN = 6.8;
    popZone = 'fascia';
  } else if (ng.tip.z > 29 && distToCalyx > cal.cupR + 10) {
    layer = "Perinephric Space (Gerota's Fat)";
    resistanceN = 1.2;
  } else if (distToCalyx <= cal.cupR + 10 && distToCalyx > cal.cupR) {
    layer = "Renal Capsule / Papilla [Dimple → 2nd Pop]";
    resistanceN = 5.5;
    dimpleFactor = 1.0 - (distToCalyx - cal.cupR) / 10;
  } else if (distToCalyx <= cal.cupR) {
    layer = "Posterior Calyceal Lumen [Intraluminal]";
    resistanceN = 0.2;
    popZone = 'papilla';
  }
  if (ng.tip.z > cal.z + cal.cupR + 4) {
    layer = "Anterior Calyceal Wall Overshoot!";
    resistanceN = 4.2;
  }

  if (popZone !== 'none' && popZone !== state.lastPopZone) {
    playTactilePop(popZone);
  }
  state.lastPopZone = popZone;

  const inTarget = distToCalyx <= cal.cupR;
  const inInfundibulumWall = !inTarget && distToCalyx < 17 && ng.tip.x < cal.x - 5;
  const inAnt = distToAnt <= 8.5;

  const iso = { x: 74, y: 4, z: cal.z };
  const pTip = project3D(ng.tip, iso);
  const pHub = project3D(ng.hub, iso);
  const coaxialErr = Math.hypot(pTip.u - pHub.u, pTip.v - pHub.v);

  return {
    distToCalyx,
    dogLegDeg,
    coronalMismatch,
    colonRisk,
    paraspinalRisk,
    ribHit,
    intercostalHit,
    pleuraHit,
    layer,
    resistanceN,
    dimpleFactor,
    inTarget,
    inInfundibulumWall,
    inAnt,
    coaxialErr,
    isSagging: ng.isSagging
  };
}

function updateDiagnosticsAndCoach() {
  const d = computeDiagnostics();
  document.getElementById('tissueBadge').textContent = d.layer;

  document.getElementById('hapticLayerText').textContent = `HAPTIC: ${d.layer}`;
  document.getElementById('hapticForceVal').textContent = `${d.resistanceN.toFixed(1)} N`;
  document.getElementById('hapticFill').style.width = `${Math.min(100, (d.resistanceN / 7.5) * 100)}%`;

  const sheathDone = Math.abs(state.sheathDepthMm - state.depthMm) <= 7 && !state.wireKinked && state.sheathDepthMm > 30;
  let steps = [];
  if (state.coachMode === 'hybrid') {
    steps = [
      { done: state.visited0AP && d.coronalMismatch <= 6, text: "1. 0° AP: Align Point B & Coronal Aim along infundibulum." },
      { done: state.depthMm >= 3 && state.depthMm >= 28, text: "2. Skin (3mm) → Lumbodorsal Fascia [1st Pop] (~32mm)." },
      { done: state.visited30Ax && d.coaxialErr < 10 && state.depthMm >= 42, text: "3. 30° Bull's Eye: Coaxial hub-over-tip advancement." },
      { done: d.inTarget && state.styletPulled, text: "4. 0° AP Dimple & Pop [2nd Pop]: Enter papilla & check efflux." },
      { done: state.wireInPelvis && state.stiffWireExchanged, text: "5. Stage 2: Steer Terumo wire & swap to Super Stiff." },
      { done: sheathDone, text: "6. Stage 3: Coaxial dilation & park 24Fr Amplatz sheath." }
    ];
  } else if (state.coachMode === 'triangulation') {
    steps = [
      { done: state.visited0AP && d.coronalMismatch <= 5, text: "1. Plane 1 (0° AP): Lock Coronal Aim & pierce skin/fascia [1st Pop]." },
      { done: state.visited30Ob && d.inTarget && state.styletPulled, text: "2. Plane 2 (30° Ceph): Adjust pitch via parallax & pop into papilla." },
      { done: state.wireInPelvis && state.stiffWireExchanged, text: "3. Stage 2: Steer Terumo wire down ureter & swap to Super Stiff." },
      { done: sheathDone, text: "4. Stage 3: Coaxial Alken/Amplatz dilation into calyceal cup." }
    ];
  } else {
    steps = [
      { done: state.visited30Ax && d.coaxialErr < 8 && state.depthMm >= 35, text: "1. 30° Ipsilateral: Superimpose hub & tip (Bull's Eye dot) & punch fascia." },
      { done: d.inTarget && state.styletPulled, text: "2. 0° AP Check: Watch calyceal dimple, pop in, & pull stylet." },
      { done: state.wireInPelvis && state.stiffWireExchanged, text: "3. Stage 2: Torque Terumo wire across neck & swap to Super Stiff." },
      { done: sheathDone, text: "4. Stage 3: Dilate tract & park 24Fr Amplatz sheath." }
    ];
  }

  let curFound = false;
  document.getElementById('coachList').innerHTML = steps.map(s => {
    let cls = 'coach-item';
    let sym = '[ ]';
    if (s.done) { cls += ' done'; sym = '[✓]'; }
    else if (!curFound) { cls += ' active'; sym = '[→]'; curFound = true; }
    return `<li class="${cls}"><span style="font-family:monospace;font-weight:700;">${sym}</span><span>${s.text}</span></li>`;
  }).join('');

  if (state.stage === 1 && !state.styletPulled) {
    const badge = document.getElementById('statusBadge');
    const txt = document.getElementById('statusText');
    if (d.ribHit) {
      badge.className = 'badge-pill b-err';
      badge.textContent = '12TH RIB PERIOSTEAL STRIKE';
      txt.innerHTML = 'Needle struck the 12th rib! Move Point B caudally and angle cephalad.';
    } else if (d.colonRisk) {
      badge.className = 'badge-pill b-err';
      badge.textContent = 'COLON PERFORATION HAZARD (>PAL)';
      txt.innerHTML = 'Skin entry is lateral to the Posterior Axillary Line (>12.6 cm). Reduce Lateral Offset L.';
    } else if (d.pleuraHit) {
      badge.className = 'badge-pill b-err';
      badge.textContent = 'PLEURAL TRANGRESSION (HYDROTHORAX RISK)';
      txt.innerHTML = 'Supracostal needle crossed the pleura during inspiration. Switch to <b>Resp: Exp Hold</b>!';
    } else if (d.isSagging) {
      badge.className = 'badge-pill b-warn';
      badge.textContent = 'GRAVITY SAG ACTIVE (BEFORE FASCIA)';
      txt.innerHTML = 'Because the Radiolucent Clamp is OFF and the tip has not yet anchored in the lumbodorsal fascia, hub weight is drooping the needle downward by 8°!';
    } else {
      badge.className = d.inTarget ? 'badge-pill b-ok' : 'badge-pill b-info';
      badge.textContent = `DOG-LEG: ${d.dogLegDeg.toFixed(1)}° | DEPTH: ${Math.round(state.depthMm)} MM | FORCE: ${d.resistanceN.toFixed(1)} N`;
      txt.innerHTML = `<b>${d.layer}</b> — Target: <b>${getTargetCalyxBase().label}</b> (Dist to papilla: <b>${d.distToCalyx.toFixed(1)} mm</b>).`;
    }
  }
}
// ============================================================================
// v4.4 MATHEMATICAL AUDIT & CROSS-FILE SYNCHRONIZATION PATCH
// Paste at the very bottom of physics.js
// ============================================================================

// 1. Unify Calyx-to-Pelvis Vector & Infundibular Angles across physics.js & renderer.js
function getTrueCalyxAngles(cal) {
  // Use the clinical coronalDeg & axialDeg defined in CASES as the single source of truth
  // so Flank Map, Dog-Leg Inset, Wire Bench, and 3D Solver are 100% identical!
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

// 2. Make 30° Bull's Eye Coaxial Lock Mathematically Exact (0.0° Dog-Leg & <1mm Coaxial Dot)
function computeOptimalGeometryForTechnique(techMode) {
  const cal = getTargetCalyxBase();
  const respMode = cal.supracostal ? 'exp' : 'insp';
  const trueCorDeg = cal.coronalDeg;
  const trueAxDeg = cal.axialDeg;

  const radCor = trueCorDeg * Math.PI / 180;
  const radAx = trueAxDeg * Math.PI / 180;

  // Total surface distance from Point A to Point B so pitchDeg == trueAxDeg
  const surfDistMm = cal.z * Math.tan(radAx);

  let latCm, ccCm, corDeg;
  if (techMode === 'bullseye') {
    corDeg = 0;
    ccCm = 0;
    latCm = Math.round((surfDistMm / 10) * 10) / 10;
  } else {
    latCm = Math.round(((surfDistMm * Math.cos(radCor)) / 10) * 10) / 10;
    latCm = Math.max(2.2, Math.min(5.2, latCm));
    ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
    ccCm = Math.max(-5.5, Math.min(3.2, ccCm));
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

  return {
    respMode,
    latCm,
    ccCm,
    corDeg,
    pitchDeg,
    trueAxDeg,
    trueCorDeg,
    tractDistMm,
    fasciaDepthMm,
    dogLegDeg
  };
}

// 3. Smooth Renal Capsule Tenting (Eliminates the 66mm Visual Snap on Fluoroscopy)
function getLiveAnatomy() {
  const base = CASES[state.caseIdx];
  const dy = getRespShift();
  const ng = getNeedle3D();
  const targetBase = base.calyces[state.targetKey];

  let pushX = 0, pushY = 0;
  if (state.depthMm > 48) {
    // Bell-curve tenting: peaks right at capsule contact, smoothly relaxes to 0 after papillary entry
    const distPast = state.depthMm - (targetBase.z - 2);
    const tentMm = distPast < 0
      ? (state.depthMm - 48) * 0.08
      : Math.max(0, 1.4 - distPast * 0.25);
    pushX = ng.dir.x * tentMm;
    pushY = ng.dir.y * tentMm;
  }

  const shiftedCalyces = {};
  for (const k of Object.keys(base.calyces)) {
    const c = base.calyces[k];
    shiftedCalyces[k] = {
      ...c,
      x: c.x + pushX,
      y: c.y + dy + pushY,
      cupR: c.cupR + (state.hydro ? 2.2 : 0)
    };
  }

  return {
    ...base,
    pelvis: { x: base.pelvis.x + pushX, y: base.pelvis.y + dy + pushY, z: base.pelvis.z },
    calyces: shiftedCalyces,
    targetCalyx: shiftedCalyces[state.targetKey],
    antCalyx: { x: base.antCalyx.x + pushX, y: base.antCalyx.y + dy + pushY, z: base.antCalyx.z }
  };
}
// ============================================================================
// v4.5 DEEP AUDIT PATCH — CROSS-FILE GEOMETRY, FLUORO & ULTRASOUND SYNC
// Paste at the very bottom of physics.js (Replaces v4.4 patch if present)
// ============================================================================

// 1. Exact 3D Coaxial C-Arm Angles for any needle (pitchDeg, corDeg)
// Finds (cArmAx, cArmOb) so the X-ray beam looks 100% straight down the needle barrel (u=0, v=0)
function getExactCoaxialCArm(pitchDeg, corDeg) {
  const pRad = pitchDeg * Math.PI / 180;
  const cRad = corDeg * Math.PI / 180;
  const dx = -Math.sin(pRad) * Math.cos(cRad);
  const dy = Math.sin(pRad) * Math.sin(cRad);
  const dz = Math.cos(pRad);

  // For u = dx*cos(a) + dz*sin(a) == 0 -> tan(a) = -dx / dz
  const aRad = Math.atan2(-dx, dz);
  const z1 = -dx * Math.sin(aRad) + dz * Math.cos(aRad);
  // For v = dy*cos(b) - z1*sin(b) == 0 -> tan(b) = dy / z1
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
    latCm = Math.max(2.2, Math.min(5.2, latCm));
    ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
    ccCm = Math.max(-5.5, Math.min(3.2, ccCm));
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
    respMode,
    latCm,
    ccCm,
    corDeg,
    pitchDeg,
    trueAxDeg: coaxCArm.ax,
    trueObDeg: coaxCArm.ob,
    trueCorDeg,
    tractDistMm,
    fasciaDepthMm,
    dogLegDeg
  };
}

// Smooth Renal Capsule Tenting without abrupt snap
function getLiveAnatomy() {
  const base = CASES[state.caseIdx];
  const dy = getRespShift();
  const ng = getNeedle3D();
  const targetBase = base.calyces[state.targetKey];

  let pushX = 0, pushY = 0;
  if (state.depthMm > 48) {
    const distPast = state.depthMm - (targetBase.z - 2);
    const tentMm = distPast < 0
      ? (state.depthMm - 48) * 0.08
      : Math.max(0, 1.4 - distPast * 0.25);
    pushX = ng.dir.x * tentMm;
    pushY = ng.dir.y * tentMm;
  }

  const shiftedCalyces = {};
  for (const k of Object.keys(base.calyces)) {
    const c = base.calyces[k];
    shiftedCalyces[k] = {
      ...c,
      x: c.x + pushX,
      y: c.y + dy + pushY,
      cupR: c.cupR + (state.hydro ? 2.2 : 0)
    };
  }

  return {
    ...base,
    pelvis: { x: base.pelvis.x + pushX, y: base.pelvis.y + dy + pushY, z: base.pelvis.z },
    calyces: shiftedCalyces,
    targetCalyx: shiftedCalyces[state.targetKey],
    antCalyx: { x: base.antCalyx.x + pushX, y: base.antCalyx.y + dy + pushY, z: base.antCalyx.z }
  };
}

// Synchronize renderer.js functions once all scripts have loaded
window.addEventListener('load', () => {
  // Upgrade setCArm(30, 0) button so clicking "30° Bull's Eye" sets the true coaxial Bull's Eye view
  const origSetCArm = window.setCArm;
  window.setCArm = function(ax, ob) {
    if (ax === 30 && ob === 0) {
      const coax = getExactCoaxialCArm(state.pitchDeg, state.corDeg);
      return origSetCArm(coax.ax, coax.ob);
    }
    return origSetCArm(ax, ob);
  };

  // Override drawFluoroBuffer in renderer.js to fix:
  // 1) Isocenter locked to targetCalyx (matches computeDiagnostics!)
  // 2) Calyceal infundibular neck drawn along true coronalDeg
  // 3) Stage 3 Dilator & Sheath respond to dilPitchDeg & scopeSweepDeg!
  window.drawFluoroBuffer = function(ctx, w, h) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.48;
    const rad = Math.min(w, h) * 0.44;
    const scale = rad / 74;

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
    // FIXED: Isocenter is the target calyx itself!
    const iso = { x: c.targetCalyx.x, y: c.targetCalyx.y, z: c.targetCalyx.z };
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
    ctx.quadraticCurveTo(u1.x + 7 * scale, (u1.y + u2.y) / 2, u2.x, u2.y);
    ctx.lineWidth = 2.2 * scale;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    const pPel = proj(c.pelvis);
    const drawCalyx = (cal, isPost, isSelectedTarget) => {
      const pCal = proj(cal);
      const nw = (cal.neckW || 8) * scale;
      const cr = (cal.cupR || 7.5) * scale;

      // Draw curved infundibulum so its entry into the calyx matches cal.coronalDeg!
      const infVec = isPost ? getInfundibularUnitVector(cal) : { x: -0.7, y: 0, z: 0.7 };
      const neckJoint3D = {
        x: cal.x + infVec.x * 16,
        y: cal.y + infVec.y * 16,
        z: cal.z + infVec.z * 16
      };
      const pJoint = proj(neckJoint3D);

      ctx.beginPath();
      ctx.moveTo(pPel.x, pPel.y);
      ctx.quadraticCurveTo(pJoint.x, pJoint.y, pCal.x, pCal.y);
      ctx.lineWidth = nw;
      ctx.strokeStyle = isPost ? 'rgba(24, 34, 50, 0.82)' : 'rgba(55, 68, 86, 0.52)';
      ctx.lineCap = 'round';
      ctx.stroke();

      const ang = Math.atan2(pCal.y - pJoint.y, pCal.x - pJoint.x);
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

      if (state.airBolus && isPost) {
        ctx.beginPath();
        ctx.arc(pCal.x, pCal.y, cr * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#0f172a';
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
    ctx.arc(pPel.x, pPel.y, 11.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(22, 32, 48, 0.86)';
    ctx.fill();

    drawCalyx(c.antCalyx, false, false);
    for (const k of Object.keys(c.calyces)) {
      drawCalyx(c.calyces[k], true, k === state.targetKey);
    }

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
    drawStone(c.pelvis, 8.2);
    drawStone(c.targetCalyx, 5.6);

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
    if (state.wireAdvMm > 0) {
      const pTip = proj(ng.tip);
      ctx.beginPath();
      ctx.moveTo(pTip.x, pTip.y);
      if (state.wireInPelvis) {
        const pUr = proj({ x: c.pelvis.x - 10, y: -68, z: c.pelvis.z });
        ctx.quadraticCurveTo(pPel.x, pPel.y, pUr.x, pUr.y);
        ctx.strokeStyle = state.stiffWireExchanged ? '#f59e0b' : '#0284c7';
        ctx.lineWidth = (state.stiffWireExchanged ? 2.8 : 2.1) * scale;
      } else {
        const pCal = proj(c.targetCalyx);
        ctx.bezierCurveTo(
          pCal.x - 10 * scale, pCal.y + 8 * scale,
          pCal.x + 11 * scale, pCal.y - 10 * scale,
          pCal.x + 3 * scale, pCal.y + 4 * scale
        );
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.1 * scale;
      }
      ctx.stroke();
    }

    // FIXED: Stage 3 Dilator & Sheath use dilPitchDeg & scopeSweepDeg!
    if (state.rodDepthMm > 0 || state.sheathDepthMm > 0) {
      const dpRad = state.dilPitchDeg * Math.PI / 180;
      const dcRad = (state.corDeg + state.scopeSweepDeg * 0.5) * Math.PI / 180;
      const dDir = {
        x: -Math.sin(dpRad) * Math.cos(dcRad),
        y: Math.sin(dpRad) * Math.sin(dcRad),
        z: Math.cos(dpRad)
      };
      const pSkin = proj(ng.skinEntry);
      if (state.rodDepthMm > 0) {
        const pRod = proj({
          x: ng.skinEntry.x + dDir.x * state.rodDepthMm,
          y: ng.skinEntry.y + dDir.y * state.rodDepthMm,
          z: ng.skinEntry.z + dDir.z * state.rodDepthMm
        });
        ctx.beginPath();
        ctx.moveTo(pSkin.x, pSkin.y);
        ctx.lineTo(pRod.x, pRod.y);
        ctx.lineWidth = 4.2 * scale;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();
      }
      if (state.sheathDepthMm > 0) {
        const pSh = proj({
          x: ng.skinEntry.x + dDir.x * state.sheathDepthMm,
          y: ng.skinEntry.y + dDir.y * state.sheathDepthMm,
          z: ng.skinEntry.z + dDir.z * state.sheathDepthMm
        });
        ctx.beginPath();
        ctx.moveTo(pSkin.x, pSkin.y);
        ctx.lineTo(pSh.x, pSh.y);
        ctx.lineWidth = 8.5 * scale;
        ctx.strokeStyle = state.wireKinked ? '#dc2626' : 'rgba(15, 23, 42, 0.85)';
        ctx.stroke();
      }
    }

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
  };

  // Override drawUltrasoundBench so the B-Mode needle accurately hits the target calyx cup!
  window.drawUltrasoundBench = function(ctx, w, h) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const topY = 16;
    const maxR = Math.min(w * 0.72, h * 0.88);
    const scale = maxR / 130;

    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.arc(cx, topY, maxR, Math.PI * 0.26, Math.PI * 0.74);
    ctx.closePath();
    ctx.fillStyle = '#161d26';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();
    ctx.clip();

    const c = getLiveAnatomy();
    const ng = getNeedle3D();
    const d = computeDiagnostics();
    const calX = cx + 8 * scale;
    const calY = topY + c.targetCalyx.z * scale;
    const pelY = topY + c.pelvis.z * scale;

    ctx.beginPath();
    ctx.ellipse(cx, calY + 12 * scale, 48 * scale, 26 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#283240'; ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx - 12 * scale, pelY, 24 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8'; ctx.fill();

    ctx.beginPath();
    ctx.arc(calX, calY, c.targetCalyx.cupR * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#090d14'; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(calX - 6 * scale, calY);
    ctx.lineTo(calX + 6 * scale, calY);
    ctx.lineTo(calX + 14 * scale, topY + maxR);
    ctx.lineTo(calX - 14 * scale, topY + maxR);
    ctx.closePath();
    ctx.fillStyle = 'rgba(4, 6, 9, 0.75)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(calX, calY, 5.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc'; ctx.fill();

    // True in-plane ultrasound coordinates mapped relative to the calyx
    const surfDist = Math.hypot(ng.skinEntry.x - c.targetCalyx.x, ng.skinEntry.y - c.targetCalyx.y);
    const sx = calX + surfDist * scale;
    const sy = topY;
    const pRad = ng.effPitch * Math.PI / 180;
    const tx = sx - Math.sin(pRad) * state.depthMm * scale;
    const ty = sy + Math.cos(pRad) * state.depthMm * scale;

    const alpha = Math.max(0.22, 1 - d.coronalMismatch / 22);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty);
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = d.inTarget ? `rgba(74, 222, 128, ${alpha})` : `rgba(248, 250, 252, ${alpha})`;
    ctx.stroke();

    ctx.restore();
  };

  initCase(state.caseIdx, true);
});
// ============================================================================
// v4.6 TRUE ANATOMICAL AXIS CALIBRATION (SYNCS FLANK MAP & SOLVER TO FLUORO)
// Paste at the very bottom of physics.js
// ============================================================================
(function synchronizeAllCalyxAnglesWithFluoro() {
  CASES.forEach(c => {
    const pel = c.pelvis;
    Object.keys(c.calyces).forEach(k => {
      const cal = c.calyces[k];
      // Vector from Calyx (cal.x, cal.y) straight into Renal Pelvis (pel.x, pel.y)
      // In our needle convention:
      //   dir.x = -sin(p)*cos(cor), dir.y = sin(p)*sin(cor)
      // For the needle to point from Calyx (x,y) toward Pelvis (pel.x, pel.y):
      //   dx = cal.x - pel.x (>0)
      //   dy = pel.y - cal.y (if calyx is below pelvis, dy > 0 -> corDeg > 0;
      //                       if calyx is above pelvis, dy < 0 -> corDeg < 0)
      const dx = cal.x - pel.x;
      const dy = pel.y - cal.y;
      const exactFluoroCoronalDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI * 2) / 2;

      // Overwrite the hardcoded coronalDeg so Flank Map, Dog-Leg, Wire Bench & Fluoro are 100% identical!
      cal.coronalDeg = exactFluoroCoronalDeg;
    });
  });

  // Re-initialize current case so Point B and the dashed blue line snap to the true X-ray axis
  initCase(state.caseIdx, true);
})();
// ============================================================================
// v4.7 UPPER-POLE INTERCOSTAL GEOMETRY & MEDIAL SLIDER UNLOCK PATCH
// Replace the v4.6 block at the very bottom of physics.js with this block
// ============================================================================
(function applyV47UpperPoleAndSliderFix() {
  // 1. Expand HTML slider limits so Point B can move medially (down to 0.5 cm)
  //    and handle steep upper/lower coronal angles without hitting slider walls
  const sLat = document.getElementById('sLat');
  const sCC = document.getElementById('sCC');
  const sCor = document.getElementById('sCor');
  if (sLat) { sLat.min = "0.5"; sLat.max = "8.0"; }
  if (sCC)  { sCC.min = "-6.0"; sCC.max = "5.0"; }
  if (sCor) { sCor.min = "-75";  sCor.max = "75"; }

  // 2. Allow dragging Point B on the Flank Map as close as 0.5 cm medial/lateral to Point A
  window.movePointBOnSkin = function(wx, wy) {
    const cal = getTargetCalyxBase();
    const refX = cal.x;
    const refY = cal.y + getRespShift();
    state.latCm = Math.max(0.5, Math.min(8.0, (wx - refX) / 10));
    state.ccCm = Math.max(-6.0, Math.min(5.0, (wy - refY) / 10));
    const dx = refX - (refX + state.latCm * 10);
    const dy = refY - (refY + state.ccCm * 10);
    state.corDeg = Math.round(Math.max(-75, Math.min(75, Math.atan2(dy, -dx) * 180 / Math.PI)) * 2) / 2;
    state.lihDirty = true;
    syncAllUI();
    updateDiagnosticsAndCoach();
  };

  // 3. Calibrate calyx coronal angles:
  //    - Lower & Middle calyces align directly with the calyx-to-pelvis vector.
  //    - Upper-pole compound calyces enter through the 11th-12th intercostal space
  //      at a realistic caudomedial angle (-22° to -28°) so Point B stays in the ICS!
  CASES.forEach(c => {
    const pel = c.pelvis;
    Object.keys(c.calyces).forEach(k => {
      const cal = c.calyces[k];
      const dx = cal.x - pel.x;
      const dy = pel.y - cal.y;
      const rawDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI * 2) / 2;

      if (k === 'upper') {
        // Upper pole compound papilla faces posterolaterally & slightly cephalad (-22° to -26°),
        // keeping the skin puncture inside the 11th-12th intercostal space
        cal.coronalDeg = Math.max(-26, Math.min(-16, rawDeg));
        cal.supracostal = (cal.y > c.rib12Y);
      } else {
        cal.coronalDeg = rawDeg;
      }
    });
  });

  // 4. Allow smaller medial L offset (down to 1.4 cm) when computing optimal Point B
  const origComputeOpt = window.computeOptimalGeometryForTechnique;
  window.computeOptimalGeometryForTechnique = function(techMode) {
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
      latCm = Math.max(1.2, Math.min(5.2, latCm));
      ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
      ccCm = Math.max(-5.5, Math.min(4.5, ccCm));
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
      respMode,
      latCm,
      ccCm,
      corDeg,
      pitchDeg,
      trueAxDeg: coaxCArm.ax,
      trueObDeg: coaxCArm.ob,
      trueCorDeg,
      tractDistMm,
      fasciaDepthMm,
      dogLegDeg
    };
  };

  initCase(state.caseIdx, true);
})();
// ============================================================================
// v4.8 EXACT VISUAL-TO-MATH INFUNDIBULAR ALIGNMENT PATCH
// Replace the v4.7 block at the very bottom of physics.js with this block
// ============================================================================
(function applyV48ExactInfundibularSync() {
  // 1. Unlock sliders so you can freely move Point B medially (down to 0.5 cm)
  const sLat = document.getElementById('sLat');
  const sCC  = document.getElementById('sCC');
  const sCor = document.getElementById('sCor');
  if (sLat) { sLat.min = "0.5"; sLat.max = "8.0"; }
  if (sCC)  { sCC.min = "-6.0"; sCC.max = "5.0"; }
  if (sCor) { sCor.min = "-75";  sCor.max = "75"; }

  window.movePointBOnSkin = function(wx, wy) {
    const cal = getTargetCalyxBase();
    const refX = cal.x;
    const refY = cal.y + getRespShift();
    state.latCm = Math.max(0.5, Math.min(8.0, (wx - refX) / 10));
    state.ccCm = Math.max(-6.0, Math.min(5.0, (wy - refY) / 10));
    const dx = refX - (refX + state.latCm * 10);
    const dy = refY - (refY + state.ccCm * 10);
    state.corDeg = Math.round(Math.max(-75, Math.min(75, Math.atan2(dy, -dx) * 180 / Math.PI)) * 2) / 2;
    state.lihDirty = true;
    syncAllUI();
    updateDiagnosticsAndCoach();
  };

  // 2. Position Upper-Pole Calyx in the true posterolateral 11th-12th ICS
  //    and lock EVERY calyx's coronalDeg to the exact X-ray infundibulum vector!
  CASES.forEach((c, idx) => {
    if (c.calyces.upper && idx !== 5) {
      // Place upper-pole papilla posterolaterally in the 11th-12th ICS so its
      // infundibulum slopes at a realistic ~38-42° caudomedial angle into the pelvis
      c.calyces.upper.x = c.pelvis.x + 25;
      c.calyces.upper.y = c.rib12Y + 6;
      c.calyces.upper.supracostal = true;
    }

    const pel = c.pelvis;
    Object.keys(c.calyces).forEach(k => {
      const cal = c.calyces[k];
      const dx = cal.x - pel.x;
      const dy = pel.y - cal.y;
      // Exact angle of the infundibulum drawn on the 0° AP Fluoroscopy screen:
      cal.coronalDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI * 2) / 2;
    });
  });

  // 3. Compute optimal Point B strictly along the true X-ray infundibular line
  window.computeOptimalGeometryForTechnique = function(techMode) {
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
      latCm = Math.max(1.4, Math.min(5.2, latCm));
      ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
      ccCm = Math.max(-5.5, Math.min(4.2, ccCm));
      // Keep corDeg locked to trueCorDeg so there is 0.0° discrepancy
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
      trueCorDeg,
      tractDistMm,
      fasciaDepthMm,
      dogLegDeg
    };
  };

  initCase(state.caseIdx, true);
})();