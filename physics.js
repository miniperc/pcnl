// ============================================================================
// PCNL SURGICAL SIMULATOR v5.4 — HARD RIB BONE-BLOCK, ICS GEOMETRY & MOBILE UI
// Replace the ENTIRE physics.js file with this complete code block.
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
benchCanvas.style.touchAction = 'none';

state.wireType = 'terumo';

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

// Exact sloped Y-center of a rib (12th or 11th) at any medial-lateral X coordinate (mm)
// Matches the exact quadratic curve drawn on Fluoroscopy & Flank Map:
// x=26 -> ry+14, x=74 -> ry+4, x=118 -> ry-5
function getRibCenterYAtX(ribBaseY, xMm) {
  return ribBaseY + 14 - (xMm - 26) * (19 / 92);
}

// Compute if the current needle 3D ray strikes the 12th or 11th rib bone (at Z = 18 mm)
function computeRibBoneCollision(c, skinEntry, dir) {
  const tRib = 18 / Math.max(0.15, dir.z); // Needle depth (mm) where it reaches rib plane Z=18mm
  const xAtRib = skinEntry.x + dir.x * tRib;
  const yAtRib = skinEntry.y + dir.y * tRib;

  const rib12CenterY = getRibCenterYAtX(c.rib12Y, xAtRib);
  const rib11CenterY = getRibCenterYAtX(c.rib12Y + 28, xAtRib);

  const withinRibSpan = xAtRib >= 24 && xAtRib <= 120;
  const dist12 = Math.abs(yAtRib - rib12CenterY);
  const dist11 = Math.abs(yAtRib - rib11CenterY);

  const hit12 = withinRibSpan && dist12 < 4.5;
  const hit11 = withinRibSpan && dist11 < 4.5;

  // Subcostal neurovascular bundle runs along the INFERIOR margin of each rib (centerY - 4.5 to centerY - 7.5)
  const hitSubcostalVessels12 = withinRibSpan && !hit12 && (rib12CenterY - yAtRib >= 4.5 && rib12CenterY - yAtRib <= 7.5);
  const hitSubcostalVessels11 = withinRibSpan && !hit11 && (rib11CenterY - yAtRib >= 4.5 && rib11CenterY - yAtRib <= 7.5);

  return {
    tRibMm: Math.round(tRib * 10) / 10,
    xAtRib,
    yAtRib,
    rib12CenterY,
    rib11CenterY,
    hit12,
    hit11,
    anyRibHit: hit12 || hit11,
    whichRib: hit11 ? '11th Rib' : (hit12 ? '12th Rib' : null),
    intercostalArteryRisk: hitSubcostalVessels12 || hitSubcostalVessels11
  };
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
// MOBILE CSS, ANATOMICAL ICS CALIBRATION & TACTICAL BRIEFING INJECTION
// ============================================================================
(function initializeSimulatorUpgrades() {
  if (!document.getElementById('v54MobileStyles')) {
    const st = document.createElement('style');
    st.id = 'v54MobileStyles';
    st.textContent = `
      .col-right {
        overflow-y: auto !important;
        max-height: calc(100vh - 82px) !important;
        padding-right: 4px !important;
      }
      @media (max-width: 1024px) {
        body, html { overflow-y: auto !important; height: auto !important; }
        .main-grid {
          display: flex !important;
          flex-direction: column !important;
          height: auto !important;
          gap: 10px !important;
          padding: 8px !important;
        }
        .col-fluoro { min-height: 410px !important; height: 430px !important; }
        .col-mid { min-height: 540px !important; height: auto !important; gap: 10px !important; }
        .skin-card { min-height: 250px !important; height: 260px !important; }
        .bench-card { min-height: 290px !important; height: 300px !important; }
        .col-right { height: auto !important; max-height: none !important; overflow-y: visible !important; }
        .top-bar, .playback-bar { flex-wrap: wrap !important; gap: 6px !important; }
        input[type=range] { height: 24px !important; }
        button { min-height: 32px !important; touch-action: manipulation; }
      }
      .tactical-guide-box {
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid #0284c7;
        border-left: 3px solid #38bdf8;
        border-radius: 5px;
        padding: 5px 8px;
        margin-bottom: 5px;
        font-size: 0.68rem;
        line-height: 1.32;
        color: #e2e8f0;
      }
      .tactical-guide-title {
        color: #38bdf8;
        font-weight: 800;
        font-size: 0.69rem;
        text-transform: uppercase;
        margin-bottom: 2px;
        display: flex;
        justify-content: space-between;
      }
    `;
    document.head.appendChild(st);
  }

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
    // Calibrate Upper-Pole Calyx so that during EXPIRATION HOLD (+8mm shift),
    // BOTH Point A and Point B sit squarely inside the 11th-12th Intercostal Space
    // (between rib12 and rib11, never above the 11th rib or off the top of the Flank Map!)
    if (c.calyces.upper && idx !== 5) {
      c.calyces.upper.x = c.pelvis.x + 26;
      c.calyces.upper.y = c.rib12Y - 1; // At Exp Hold (+8mm), live Y = rib12Y + 7 (right above 12th rib!)
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

  const coachList = document.getElementById('coachList');
  if (coachList && !document.getElementById('tacticalGuideBox')) {
    const box = document.createElement('div');
    box.id = 'tacticalGuideBox';
    box.className = 'tactical-guide-box';
    coachList.parentNode.insertBefore(box, coachList);
  }
})();

function computeOptimalGeometryForTechnique(techMode) {
  const c = CASES[state.caseIdx];
  const cal = getTargetCalyxBase();
  const respMode = cal.supracostal ? 'exp' : 'insp';
  const dyPlanned = respMode === 'exp' ? +8 : -8;
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
    latCm = Math.max(1.4, Math.min(5.5, latCm));
    ccCm = Math.round((-latCm * Math.tan(radCor)) * 10) / 10;
    ccCm = Math.max(-5.5, Math.min(3.5, ccCm));
    corDeg = trueCorDeg;
  }

  if (cal.forceSubcostal) {
    ccCm = -2.0;
    corDeg = Math.round(Math.atan2(-ccCm, latCm) * 180 / Math.PI * 2) / 2;
  }

  // Ensure Upper-Pole Supracostal Point B sits cleanly inside the 11th-12th ICS
  // (just above the superior border of the 12th rib, and well below the 11th rib!)
  if (state.targetKey === 'upper' && cal.supracostal) {
    const xEntry = cal.x + latCm * 10;
    const rib12TopBorder = getRibCenterYAtX(c.rib12Y, xEntry) + 5.5;
    const rib11BotBorder = getRibCenterYAtX(c.rib12Y + 28, xEntry) - 7.5;
    const idealIcsY = (rib12TopBorder + rib11BotBorder) * 0.5;
    const calLiveY = cal.y + dyPlanned;
    let rawEntryY = calLiveY + ccCm * 10;
    if (rawEntryY < rib12TopBorder || rawEntryY > rib11BotBorder) {
      rawEntryY = Math.max(rib12TopBorder, Math.min(rib11BotBorder, idealIcsY));
      ccCm = Math.round(((rawEntryY - calLiveY) / 10) * 10) / 10;
      corDeg = Math.round(Math.atan2(-ccCm, latCm) * 180 / Math.PI * 2) / 2;
    }
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
// CASE INITIALIZATION — MANUAL OR DIFFICULTY + FULL GOD-VIEW TELEMETRY
// ============================================================================
function initCase(idx, keepCalyx = false) {
  stopAutoSolve(true);
  state.caseIdx = idx;
  const c = CASES[idx];
  if (!keepCalyx) {
    state.targetKey = c.defaultCalyx;
    document.getElementById('calyxSelect').value = state.targetKey;
  }

  state.pointAMarked = true;
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

function buildTacticalGuideHTML(opt, cal) {
  const respAdvice = cal.supracostal
    ? `<span style="color:#f87171;font-weight:700;">Exp Hold</span> (retracts pleura above 11th–12th ICS)`
    : `<span style="color:#4ade80;font-weight:700;">Insp Hold</span> (pushes kidney below 12th rib)`;

  let pointBWhy = '';
  if (state.targetKey === 'upper') {
    pointBWhy = `<b>Upper-Pole 11th–12th ICS Entry:</b> Lock <b>Exp Hold</b> first! Place Point B inside the 11th–12th intercostal space (<b>L = ${opt.latCm.toFixed(1)} cm, CC = +${opt.ccCm.toFixed(1)} cm</b>, just above the 12th rib superior border to avoid the subcostal artery) and aim caudomedially (<b>${opt.corDeg.toFixed(1)}°</b>, Pitch <b>${opt.pitchDeg.toFixed(1)}°</b>).`;
  } else if (state.targetKey === 'lower_med') {
    pointBWhy = `<b>Sub-Apical Medial Calyx:</b> Steep posterior axis (<b>${cal.axialDeg}°</b>). Place Point B medially at <b>L = ${opt.latCm.toFixed(1)} cm, CC = ${opt.ccCm.toFixed(1)} cm</b> with steep Pitch (<b>${opt.pitchDeg.toFixed(1)}°</b>).`;
  } else if (state.targetKey === 'middle') {
    pointBWhy = `<b>Middle Calyx (Cephalolateral Entry):</b> Infundibulum slopes caudomedially (<b>${opt.corDeg.toFixed(1)}°</b>) into the pelvis. Place Point B at <b>L = ${opt.latCm.toFixed(1)} cm, CC = +${opt.ccCm.toFixed(1)} cm</b>.`;
  } else if (cal.forceSubcostal) {
    pointBWhy = `<b>12th-Rib Blocked Calyx:</b> Direct line hits the 12th rib bone! Place Point B subcostally at <b>CC = ${opt.ccCm.toFixed(1)} cm, L = ${opt.latCm.toFixed(1)} cm</b> and angle cephalad (<b>+${opt.corDeg.toFixed(1)}°</b>) to duck under the rib.`;
  } else if (state.caseIdx === 4) {
    pointBWhy = `<b>Obese Deep Tract (${cal.z}mm depth):</b> Place Point B laterally at <b>L = ${opt.latCm.toFixed(1)} cm, CC = ${opt.ccCm.toFixed(1)} cm</b> (staying medial to the 12.6cm colon line!) at Pitch <b>${opt.pitchDeg.toFixed(1)}°</b>.`;
  } else if (state.caseIdx === 5) {
    pointBWhy = `<b>Malrotated Horseshoe Kidney:</b> Posterior calyces point nearly straight back (<b>${cal.axialDeg}°</b> axial). Place Point B parasagittally at <b>L = ${opt.latCm.toFixed(1)} cm, CC = ${opt.ccCm.toFixed(1)} cm</b> (Pitch <b>${opt.pitchDeg.toFixed(1)}°</b>).`;
  } else {
    pointBWhy = `<b>Lower-Lateral Classic Access:</b> Follow the dashed blue infundibular line caudolaterally to <b>L = ${opt.latCm.toFixed(1)} cm, CC = ${opt.ccCm.toFixed(1)} cm</b> and aim cephalomedially (<b>+${opt.corDeg.toFixed(1)}°</b>, Pitch <b>${opt.pitchDeg.toFixed(1)}°</b>).`;
  }

  let layerSwitchWhy = '';
  if (state.coachMode === 'triangulation') {
    layerSwitchWhy = `<b>View-Switch Layer (Triangulation):</b> At <b>0° AP</b>: Pierce Skin (<b>3mm</b>) $\\rightarrow$ punch <b>Fascia (${opt.fasciaDepthMm}mm, 1st Pop)</b>. <b>STOP at ${opt.fasciaDepthMm + 2}mm</b>, rotate to <b>+30° Ceph</b> to set Pitch, then pop Papilla at <b>${opt.tractDistMm}mm [2nd Pop]</b>!`;
  } else if (state.coachMode === 'bullseye') {
    layerSwitchWhy = `<b>View-Switch Layer (Bull's Eye):</b> At <b>+${opt.trueAxDeg}° Axial / ${opt.trueObDeg}° Tilt</b>: Superimpose hub-over-tip dot $\\rightarrow$ punch <b>Fascia (${opt.fasciaDepthMm}mm, 1st Pop)</b>. Switch to <b>0° AP</b> in Gerota's fat (<b>~52mm</b>) to watch the dimple & pop in at <b>${opt.tractDistMm}mm</b>!`;
  } else {
    layerSwitchWhy = `<b>View-Switch Layer (Hybrid):</b> 1) <b>0° AP</b>: Punch Skin (<b>3mm</b>) & <b>Fascia (${opt.fasciaDepthMm}mm, 1st Pop)</b>. 2) <b>At ${opt.fasciaDepthMm + 2}mm</b>: Rotate to <b>+${opt.trueAxDeg}° Axial</b> (or <b>+30° Ceph</b>) to lock Pitch. 3) <b>At ${opt.tractDistMm - 12}mm</b>: Return to <b>0° AP</b> for Papillary Pop (<b>${opt.tractDistMm}mm</b>)!`;
  }

  return `
    <div class="tactical-guide-title">
      <span>🎯 TACTICAL PLAN: ${cal.label.toUpperCase()}</span>
      <span>1. Hold: ${respAdvice}</span>
    </div>
    <div style="margin-bottom:2px;">${pointBWhy}</div>
    <div style="color:#cbd5e1;border-top:1px solid #1e293b;padding-top:2px;">${layerSwitchWhy}</div>
  `;
}

// ============================================================================
// INTERACTIVE SLOW STEP-BY-STEP AUTO-SOLUTION & ERROR RECOVERY ENGINE
// ============================================================================
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
      title: `RECOVERY STEP 1: DIAGNOSING YOUR OUT-OF-PLANE TRAJECTORY`,
      techLabel: `LIVE ERROR DIAGNOSIS`,
      duration: 3.4,
      target: {
        stage: 1,
        cArmAx: 0,
        cArmOb: isPitchBad && !isCoronalBad ? 30 : 0
      },
      narration: `${!state.clampOn ? '<b>1. Clamp Off (Gravity Sag):</b> Unclamped hub droops pitch (+8.5° flatter), making the needle pass superficially! ' : ''}` +
        `${isCoronalBad ? `<b>Plane 1 Coronal Drift (${state.corDeg.toFixed(1)}° vs ideal ${opt.corDeg.toFixed(1)}°):</b> On 0° AP view, your needle is off the infundibular axis, causing a ${computeDiagnostics().dogLegDeg.toFixed(0)}° dog-leg kink. ` : ''}` +
        `${isPitchBad ? (pitchErr > 0
          ? `<b>Plane 2 Depth Error (Pitch ${state.pitchDeg.toFixed(1)}° is Too Flat / Superficial):</b> Needle is passing posteriorly behind the calyx (shifts <b>UPWARD</b> with the superficial ribs on +30° Ceph camera tilt).`
          : `<b>Plane 2 Depth Error (Pitch ${state.pitchDeg.toFixed(1)}° is Too Steep / Deep):</b> Needle is plunging anteriorly in front of the calyx (shifts <b>DOWNWARD</b> on +30° Ceph camera tilt).`) : ''}`
    });

    if (state.depthMm > 26) {
      steps.push({
        title: `RECOVERY STEP 2: RETRACT TO SUBCUTANEOUS FAT BEFORE PIVOTING!`,
        techLabel: `PARENCHYMAL PROTECTION RULE`,
        duration: 2.8,
        target: {
          stage: 1,
          clampOn: true,
          depthMm: 15
        },
        onArrive: () => {
          state.clampOn = true;
          document.getElementById('clampBtn').textContent = 'Radiolucent Clamp: ON';
          document.getElementById('clampBtn').className = 'active';
        },
        narration: `<b>Critical OR Rule:</b> Never torque an 18G needle while its tip is buried in the lumbodorsal fascia or renal cortex (${Math.round(state.depthMm)} mm)—it slices the parenchyma! Retracting back to <b>15 mm (Subcutaneous Fat)</b> to pivot safely.`
      });
    }

    if (isCoronalBad) {
      steps.push({
        title: `RECOVERY STEP 3: RE-LOCK PLANE 1 ON 0° AP INFUNDIBULAR LINE`,
        techLabel: `PLANE 1 CORRECTION (0° AP)`,
        duration: 3.0,
        target: {
          stage: 1,
          respMode: opt.respMode,
          cArmAx: 0,
          cArmOb: 0,
          latCm: opt.latCm,
          ccCm: opt.ccCm,
          corDeg: opt.corDeg,
          depthMm: Math.min(state.depthMm, 16)
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
          respMode: opt.respMode,
          cArmAx: 0,
          cArmOb: 30,
          pitchDeg: opt.pitchDeg,
          depthMm: opt.fasciaDepthMm + 4
        },
        narration: pitchErr > 0
          ? `<b>Fixing Superficial (Posterior) Trajectory:</b> Angling the needle steeper downward into the back (changing Pitch from <b>${state.pitchDeg.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) so the tip drops down into the target calyx.`
          : `<b>Fixing Deep (Anterior) Trajectory:</b> Flattening the needle angle (changing Pitch from <b>${state.pitchDeg.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) so the tip rises into the posterior calyceal cup.`
      });
    }
  }

  else if (scenarioMode === 'err_shallow') {
    const shallowPitch = Math.min(55, opt.pitchDeg + 12);
    const apparentDepth = getDepthAtCalyxX(shallowPitch, opt.corDeg, opt.latCm * 10);
    const zActual = Math.round(apparentDepth * Math.cos(shallowPitch * Math.PI / 180));

    steps.push({
      title: `ERROR DEMO 1: ADVANCING TOO SHALLOW / POSTERIOR`,
      techLabel: `OUT-OF-PLANE DEPTH ERROR`,
      duration: 3.0,
      target: {
        stage: 1, respMode: opt.respMode, cArmAx: 0, cArmOb: 0,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg,
        pitchDeg: shallowPitch, depthMm: apparentDepth
      },
      narration: `<b>The 0° AP Illusion:</b> On the <b>0° AP</b> monitor, the needle tip appears right over the target calyx! However, the needle was held too flat against the flank (Pitch = <b>${shallowPitch.toFixed(1)}°</b> instead of <b>${opt.pitchDeg.toFixed(1)}°</b>), so its true depth is only Z = <b>${zActual} mm</b> (passing <b>superficially/posteriorly</b> behind the ${cal.z} mm calyx)!`
    });
    steps.push({
      title: `ERROR DEMO 1: +30° CEPHALAD TILT REVEALS SUPERFICIAL PARALLAX`,
      techLabel: `PARALLAX DIAGNOSIS (+30° CEPH)`,
      duration: 3.4,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: shallowPitch, depthMm: apparentDepth
      },
      narration: `<b>Parallax Exposed at +30° Cephalad:</b> As the C-arm camera tilts <b>+30° Cephalad</b>, the target calyx stays centered at the isocenter while superficial structures (the ribs and our superficial needle tip at Z=${zActual}mm) sweep <b>UPWARD (cephalad)</b> off the calyx!`
    });
    steps.push({
      title: `ERROR DEMO 1: RETRACT TO FAT (16 MM) & ANGLE STEEPER DOWNWARD`,
      techLabel: `SAFE PIVOT CORRECTION`,
      duration: 3.2,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: opt.pitchDeg, depthMm: 16
      },
      narration: `<b>The OR Fix:</b> Pull the needle back to <b>16 mm (Subcutaneous Fat)</b>, then raise the hub to angle the needle <b>steeper downward toward the kidney</b> (Pitch <b>${shallowPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) while keeping Plane 1 locked!`
    });
  }

  else if (scenarioMode === 'err_deep') {
    const deepPitch = Math.max(12, opt.pitchDeg - 9.5);
    const apparentDepth = getDepthAtCalyxX(deepPitch, opt.corDeg, opt.latCm * 10);
    const zActual = Math.round(apparentDepth * Math.cos(deepPitch * Math.PI / 180));

    steps.push({
      title: `ERROR DEMO 2: ADVANCING TOO DEEP / ANTERIOR`,
      techLabel: `ANTERIOR OVERSHOOT TRAP`,
      duration: 3.0,
      target: {
        stage: 1, respMode: opt.respMode, cArmAx: 0, cArmOb: 0,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg,
        pitchDeg: deepPitch, depthMm: apparentDepth
      },
      narration: `<b>The 0° AP Illusion:</b> On the <b>0° AP</b> monitor, the needle tip again looks centered over the calyx! But because the needle was held too vertical/steep (Pitch = <b>${deepPitch.toFixed(1)}°</b> vs ideal <b>${opt.pitchDeg.toFixed(1)}°</b>), it has plunged to Z = <b>${zActual} mm</b>—<b>deep (anterior)</b> to the ${cal.z} mm posterior calyx!`
    });
    steps.push({
      title: `ERROR DEMO 2: +30° CEPHALAD TILT REVEALS DEEP PARALLAX`,
      techLabel: `PARALLAX DIAGNOSIS (+30° CEPH)`,
      duration: 3.4,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: deepPitch, depthMm: apparentDepth
      },
      narration: `<b>Parallax Exposed at +30° Cephalad:</b> Tilting the C-arm camera to <b>+30° Cephalad</b> causes points deeper/anterior to the isocenter (Z=${zActual}mm vs ${cal.z}mm) to shift <b>DOWNWARD (caudally)</b> relative to the calyceal cup!`
    });
    steps.push({
      title: `ERROR DEMO 2: RETRACT TO FAT (16 MM) & FLATTEN ANGLE`,
      techLabel: `SAFE PIVOT CORRECTION`,
      duration: 3.2,
      target: {
        stage: 1, cArmAx: 0, cArmOb: 30,
        pitchDeg: opt.pitchDeg, depthMm: 16
      },
      narration: `<b>The OR Fix:</b> Retract the tip back to <b>16 mm (Subcutaneous Fat)</b>, then lower the hub to flatten the angle (changing Pitch from <b>${deepPitch.toFixed(1)}° → ${opt.pitchDeg.toFixed(1)}°</b>) so it meets the posterior papilla cleanly.`
    });
  }

  else if (scenarioMode === 'err_coronal') {
    const badCor = Math.max(-55, opt.corDeg - 26);
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
      techLabel: `${opt.trueAxDeg}° COAXIAL DRIFT`,
      duration: 3.2,
      target: {
        stage: 1, respMode: opt.respMode, cArmAx: opt.trueAxDeg, cArmOb: opt.trueObDeg,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: offCor,
        pitchDeg: offPitch, depthMm: 16
      },
      narration: `<b>Why the Bull's Eye Turned Into a Line:</b> At the calyx's true coaxial angle (<b>${opt.trueAxDeg}° Axial, ${opt.trueObDeg}° Tilt</b>), your needle should look like a single dot. Because the hub drifted, you see an elongated needle shaft!`
    });
    steps.push({
      title: `ERROR DEMO 4: PIVOT HUB OVER TIP TO COLLAPSE LINE INTO DOT`,
      techLabel: `RESTORING COAXIAL DOT`,
      duration: 3.2,
      target: {
        stage: 1, cArmAx: opt.trueAxDeg, cArmOb: opt.trueObDeg,
        latCm: opt.latCm, ccCm: opt.ccCm, corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg, depthMm: opt.fasciaDepthMm + 4
      },
      narration: `<b>The OR Fix:</b> Keep the needle tip anchored at Point B and <b>move the needle hub toward the tip</b> until the hub ring slides directly over the tip (<b>◎ BULL'S EYE COAXIAL LOCK</b>), then punch through the fascia (<b>${opt.fasciaDepthMm + 4} mm</b>).`
    });
  }

  if (steps.length === 0) {
    steps.push({
      title: `RESPIRATORY LOCK & INITIAL C-ARM VIEW`,
      techLabel: techTitle,
      duration: 2.6,
      target: {
        stage: 1,
        respMode: opt.respMode,
        cArmAx: tech === 'bullseye' ? opt.trueAxDeg : 0,
        cArmOb: tech === 'bullseye' ? opt.trueObDeg : 0,
        latCm: opt.latCm,
        ccCm: opt.ccCm,
        corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg,
        depthMm: 0
      },
      narration: cal.supracostal
        ? `<b>Supracostal Access (${cal.label}, True Axial = ${cal.axialDeg}°):</b> Locking ventilation in <b>Full Expiration (Exp Hold)</b> so the pleura retracts cephalad out of the 11th–12th ICS.`
        : `<b>Subcostal Access (${cal.label}, True Axial = ${cal.axialDeg}°):</b> Locking ventilation in <b>Full Inspiration (Insp Hold)</b> to displace the kidney caudally below the 12th rib.`
    });

    steps.push({
      title: `POINT B SELECTION & SKIN DERMIS PUNCTURE (0 → 3 MM)`,
      techLabel: techTitle,
      duration: 2.8,
      target: {
        stage: 1,
        cArmAx: tech === 'bullseye' ? opt.trueAxDeg : 0,
        cArmOb: tech === 'bullseye' ? opt.trueObDeg : 0,
        latCm: opt.latCm,
        ccCm: opt.ccCm,
        corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg,
        depthMm: 3
      },
      narration: `<b>Point B Coordinates:</b> Placed at <b>L = ${opt.latCm.toFixed(1)} cm</b> lateral and <b>CC = ${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm.toFixed(1)} cm</b> along the <b>${opt.corDeg.toFixed(1)}°</b> coronal axis (Total 3D Tract = <b>${opt.tractDistMm} mm</b>). Advancing <b>0 → 3 mm</b> pierces the tough skin dermis (<b>Skin Pop: 3.2 N</b>).`
    });

    steps.push({
      title: `SUBCUTANEOUS FAT & LUMBODORSAL FASCIA [1ST POP]`,
      techLabel: techTitle,
      duration: 3.2,
      target: {
        stage: 1,
        cArmAx: tech === 'triangulation' ? 0 : opt.trueAxDeg,
        cArmOb: tech === 'triangulation' ? 0 : opt.trueObDeg,
        latCm: opt.latCm,
        ccCm: opt.ccCm,
        corDeg: opt.corDeg,
        pitchDeg: opt.pitchDeg,
        depthMm: opt.fasciaDepthMm + 4
      },
      narration: tech === 'triangulation'
        ? `<b>Plane 1 Advancement (0° AP):</b> Gliding through subcutaneous fat (3–24 mm) along the 0° infundibular line, then punching through the <b>Lumbodorsal Fascia at ${opt.fasciaDepthMm} mm [1st Tactile Pop: 6.8 N]</b>.`
        : `<b>Patient-Specific Coaxial Lock (${opt.trueAxDeg}° Axial):</b> Rotating C-arm to this calyx's true end-on angle (${cal.axialDeg}°) right after the fascia pop (<b>${opt.fasciaDepthMm + 4} mm</b>).`
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
        ? `<b>Plane 2 Parallax Check (+30° Cephalad Oblique):</b> Tilting C-arm to +30° Cephalad at <b>${opt.fasciaDepthMm + 4} mm</b> (Fascia/Gerota's layer) to verify needle depth relative to the centered calyx.`
        : `<b>0° AP Depth Verification:</b> Swinging C-arm back to <b>0° AP</b> in Gerota's space (<b>${opt.tractDistMm - 10} mm</b>) before touching the renal capsule.`
    });
  }

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

  const idealTorque = getOptimalTerumoTorqueForCor(opt.corDeg, opt.trueCorDeg);
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
    narration: `<b>Hydrophilic Guidewire Negotiation:</b> Rotating the angled 0.035" Terumo torque vise to the sweet spot (<b>${idealTorque}°</b>) so the bevel deflects past the impacted stone rim and glides down the ureter.`
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
    narration: `<b>Securing the Working Tract:</b> Advancing a <b>5 Fr Kumpe (KMP)</b> angiographic catheter over the slippery Terumo wire into the pelvis, then exchanging for a high-tensile <b>0.035" Amplatz Super Stiff</b> wire.`
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
    narration: `<b>Coaxial Tract Dilation (${opt.tractDistMm} mm):</b> Matching dilator pitch strictly to the needle pitch (<b>${opt.pitchDeg.toFixed(1)}°</b>) so the Alken guide rod and <b>24 Fr Amplatz sheath</b> park inside the calyceal cup without stopping short in perinephric fat or perforating the medial pelvis!`
  });

  steps.forEach((s, idx) => {
    s.title = `STEP ${idx + 1}/${steps.length}: ${s.title}`;
  });

  return steps;
}

function toggleAutoSolve() {
  if (state.autoPlaying) {
    stopAutoSolve(false);
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
// UI SYNC & CONTROLS (FULL GOD-VIEW TELEMETRY ON UNLESS OR BLIND IS ON)
// ============================================================================
function syncAllUI() {
  const cal = getTargetCalyxBase();
  const opt = computeOptimalGeometryForTechnique(state.coachMode);

  document.getElementById('sAx').value = state.cArmAx;
  document.getElementById('vAx').textContent = (state.cArmAx >= 0 ? '+' : '') + Math.round(state.cArmAx) + '°';
  document.getElementById('sOb').value = state.cArmOb;
  document.getElementById('vOb').textContent = (state.cArmOb >= 0 ? '+' : '') + Math.round(state.cArmOb) + '°';

  document.getElementById('cArmReadout').textContent = !state.blindMode
    ? `Axial: ${state.cArmAx >= 0 ? '+' : ''}${Math.round(state.cArmAx)}° (True Calyx Axis: +${cal.axialDeg}°) | Tilt: ${state.cArmOb >= 0 ? '+' : ''}${Math.round(state.cArmOb)}°`
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
  document.getElementById('trigHint').textContent = !state.blindMode
    ? `Tract:${tractMm}mm | Ideal Pitch:${idealP.toFixed(1)}° | Ideal Cor:${opt.corDeg.toFixed(1)}°`
    : `OR Blind Mode Active`;

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
bindSlider('sLat', v => { state.latCm = v; setExactDepth(state.depthMm); });
bindSlider('sCC', v => { state.ccCm = v; setExactDepth(state.depthMm); });
bindSlider('sCor', v => { state.corDeg = v; setExactDepth(state.depthMm); });
bindSlider('sPitch', v => { state.pitchDeg = v; setExactDepth(state.depthMm); });
bindSlider('sDepth', v => { setExactDepth(v); });

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
  const cal = getTargetCalyxBase();
  if (Math.abs(state.cArmAx) <= 2 && Math.abs(state.cArmOb) <= 2) state.visited0AP = true;
  if (Math.abs(state.cArmAx - cal.axialDeg) <= 8 || Math.abs(state.cArmAx - 30) <= 6) state.visited30Ax = true;
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
  syncAllUI();
  updateDiagnosticsAndCoach();
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

// ============================================================================
// HARD PHYSICAL BONE BLOCK WHEN NEEDLE HITS 11TH OR 12TH RIB!
// ============================================================================
function setExactDepth(d) {
  stopAutoSolve(false);
  let targetD = Math.max(0, Math.min(135, d));

  // Check if current needle trajectory hits the 11th or 12th rib at Z=18mm
  const c = CASES[state.caseIdx];
  const ng = getNeedle3D();
  const ribCol = computeRibBoneCollision(c, ng.skinEntry, ng.dir);

  if (ribCol.anyRibHit && targetD >= ribCol.tRibMm) {
    // Hard physical bone stop! Needle cannot penetrate solid rib cortex!
    targetD = ribCol.tRibMm;
  }

  state.depthMm = targetD;
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
  state.pointAMarked = true;
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
// MOUSE, TOUCH (MANUAL POINT B DRAG + DEPTH SCRUBBER) & KEYBOARD INTERACTION
// ============================================================================
let draggingFluoroHub = false;
let draggingDepthScrubber = false;
let lastPointer = { x: 0, y: 0 };

fluoroCanvas.addEventListener('pointerdown', e => {
  if (e.target.tagName === 'BUTTON') return;
  stopAutoSolve(false);
  const rect = fluoroCanvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  if (px > rect.width - 50) {
    draggingDepthScrubber = true;
    const frac = Math.max(0, Math.min(1, (py - 40) / (rect.height - 80)));
    setExactDepth(Math.round(frac * 125));
    return;
  }

  draggingFluoroHub = true;
  lastPointer = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointermove', e => {
  if (draggingDepthScrubber) {
    const rect = fluoroCanvas.getBoundingClientRect();
    const py = e.clientY - rect.top;
    const frac = Math.max(0, Math.min(1, (py - 40) / (rect.height - 80)));
    setExactDepth(Math.round(frac * 125 * 2) / 2);
    return;
  }
  if (!draggingFluoroHub) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer = { x: e.clientX, y: e.clientY };

  state.pitchDeg = Math.max(10, Math.min(60, state.pitchDeg + dx * 0.12));
  state.corDeg = Math.max(-75, Math.min(75, state.corDeg + dy * 0.15));
  state.lihDirty = true;
  syncAllUI();
  updateDiagnosticsAndCoach();
});
window.addEventListener('pointerup', () => {
  draggingFluoroHub = false;
  draggingDepthScrubber = false;
});

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
    if (Math.hypot(wx - cal.x, wy - (cal.y + dyResp)) < 8.5) {
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
  const refY = cal.y + getPlannedRespShift();
  state.latCm = Math.round(Math.max(0.5, Math.min(8.0, (wx - refX) / 10)) * 10) / 10;
  state.ccCm = Math.round(Math.max(-6.0, Math.min(5.0, (wy - refY) / 10)) * 10) / 10;
  setExactDepth(state.depthMm);
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
// 3D GEOMETRY, RESPIRATORY PENDULUM & HAPTIC LAYER ENGINE
// ============================================================================
function getEffectiveNeedleAngles() {
  let sagPitch = 0;
  let sagCor = 0;
  if (!state.clampOn && state.depthMm > 0 && state.depthMm < 28) {
    const factor = (28 - state.depthMm) / 28;
    sagPitch = 8.5 * factor;
    sagCor = -7.0 * factor;
  }

  let respPendulumCor = 0;
  let isPendulumSwinging = false;
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
  const dyLive = getRespShift();
  const dyPlanned = getPlannedRespShift();

  const pointA = { x: cal.x, y: cal.y + dyLive, z: 0 };
  const skinEntry = {
    x: cal.x + state.latCm * 10,
    y: (cal.y + dyPlanned) + state.ccCm * 10,
    z: 0
  };

  const { effPitch, effCor, isSagging, isPendulumSwinging } = getEffectiveNeedleAngles();
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
  const { trueCorDeg } = getTrueCalyxAngles(c.targetCalyx, c.pelvis);
  return getOptimalTerumoTorqueForCor(state.corDeg, trueCorDeg);
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
  document.getElementById('sweetSpotHint').textContent = !state.blindMode
    ? `Sweet Spot: ~${idealTorque}°`
    : `Torque Vise (0°–360°)`;

  if (!diag.inTarget) {
    state.wireInPelvis = false;
    badge.className = 'badge-pill b-err';
    badge.textContent = 'NEEDLE NOT IN CALYX';
    txt.innerHTML = 'Return to Stage 1 and place the needle tip inside the calyceal cup before advancing the wire.';
    return;
  }

  const isImpactedStaghorn = CASES[state.caseIdx].stoneType === 'staghorn' || state.caseIdx === 4;
  const torqueDiff = Math.min(
    Math.abs(state.terumoTorqueDeg - idealTorque),
    360 - Math.abs(state.terumoTorqueDeg - idealTorque)
  );

  const needsPreciseTorque = diag.dogLegDeg > 16 || isImpactedStaghorn;
  const torqueAligned = !needsPreciseTorque || torqueDiff <= 38;

  if (state.wireAdvMm >= 55 && torqueAligned && diag.dogLegDeg <= 35) {
    state.wireInPelvis = true;
    badge.className = 'badge-pill b-ok';
    badge.textContent = 'TERUMO WIRE NEGOTIATED INTO PELVIS & URETER!';
    txt.innerHTML = `Angled hydrophilic tip deflected past the stone edge and across the infundibular neck into the ureter. Now advance the <b>5Fr Kumpe Catheter</b> and swap for an <b>Amplatz Super Stiff Wire</b>.`;
  } else if (state.wireAdvMm >= 35) {
    state.wireInPelvis = false;
    badge.className = 'badge-pill b-warn';
    if (diag.dogLegDeg > 35) {
      badge.textContent = `SEVERE DOG-LEG (${diag.dogLegDeg.toFixed(0)}°) — WIRE BLOCKED`;
      txt.innerHTML = `Your needle entered at a <b>${diag.dogLegDeg.toFixed(1)}° angle</b> to the infundibulum (Pure Bull's Eye Roof-Entry Trap!). Return to Stage 1 (0° AP) and align Coronal Aim with the infundibulum.`;
    } else {
      badge.textContent = 'WIRE BOUNCING OFF STONE / NECK WALL';
      txt.innerHTML = `Rotate the <b>Terumo Tip Torque Vise</b> toward <b>~${idealTorque}°</b> (or click Auto-Torque Tip) so the bevel slips past the stone rim!`;
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
  } else if (state.sheathDepthMm > 30 && state.sheathDepthMm < state.depthMm - 8) {
    badge.className = 'badge-pill b-warn';
    badge.textContent = 'UNDER-DILATION TRAP: SHEATH STOPPED IN PERINEPHRIC FAT!';
    txt.innerHTML = `24 Fr Amplatz sheath (${state.sheathDepthMm} mm) is parked short of the calyceal cup (${Math.round(state.depthMm)} mm)! Nephroscopy shows yellow perinephric fat ("white-out").`;
  } else if (Math.abs(state.sheathDepthMm - state.depthMm) <= 7 && state.rodDepthMm >= state.depthMm - 4) {
    badge.className = 'badge-pill b-ok';
    badge.textContent = '24 Fr AMPLATZ SHEATH PARKED IN CALYCEAL CUP!';
    txt.innerHTML = `Optimal coaxial tract dilation complete! Use the <b>Rigid Nephroscope Sweep</b> slider to inspect stone clearance reach and parenchymal torque.`;
  }

  const diag = computeDiagnostics();
  const effectiveTorqueStress = Math.round(diag.dogLegDeg * 0.9 + Math.abs(state.scopeSweepDeg) * 1.1);
  const torqueColor = effectiveTorqueStress < 28 ? '#4ade80' : (effectiveTorqueStress < 45 ? '#fbbf24' : '#f87171');
  document.getElementById('torqueScoreBox').innerHTML = `
    <div><b>Selected Calyx:</b> ${cal.label} (True Axial: ${cal.axialDeg}°)</div>
    <div><b>Rigid Scope Stone Reach:</b> <span style="color:#38bdf8;font-weight:700;">${cal.reachPct}% of Pelvicalyceal System</span></div>
    <div><b>Infundibular Torque Stress:</b> <span style="color:${torqueColor};font-weight:700;">${effectiveTorqueStress} N·cm (${effectiveTorqueStress < 28 ? 'Safe Fulcrum' : (effectiveTorqueStress < 45 ? 'Moderate Torque' : 'DANGER: Infundibular Tear Risk!')})</span></div>
  `;
  updateDiagnosticsAndCoach();
}

function computeDiagnostics() {
  const c = getLiveAnatomy();
  const ng = getNeedle3D();
  const cal = c.targetCalyx;
  const { trueCorDeg } = getTrueCalyxAngles(cal, c.pelvis);

  const distToCalyx = Math.hypot(ng.tip.x - cal.x, ng.tip.y - cal.y, ng.tip.z - cal.z);
  const distToAnt = Math.hypot(ng.tip.x - c.antCalyx.x, ng.tip.y - c.antCalyx.y, ng.tip.z - c.antCalyx.z);

  const infVec = getInfundibularUnitVector(cal);
  const dot = Math.max(-1, Math.min(1, ng.dir.x * infVec.x + ng.dir.y * infVec.y + ng.dir.z * infVec.z));
  const dogLegDeg = Math.acos(dot) * 180 / Math.PI;
  const coronalMismatch = Math.abs(ng.effCor - trueCorDeg);

  const colonRisk = ng.skinEntry.x > 126;
  const paraspinalRisk = ng.skinEntry.x < 54;

  // Accurate Sloped 11th & 12th Rib Collision + Subcostal Artery Check
  const ribCol = computeRibBoneCollision(c, ng.skinEntry, ng.dir);
  const ribHit = ribCol.anyRibHit && state.depthMm >= ribCol.tRibMm - 0.5;
  const intercostalHit = ribCol.intercostalArteryRisk && state.depthMm >= ribCol.tRibMm;

  const pleuraBorderY = c.pleuraY + (state.respMode === 'insp' ? -10 : 8);
  const pleuraHit = state.depthMm >= ribCol.tRibMm && ribCol.yAtRib > pleuraBorderY;

  let layer = "0mm: On Skin Surface (Point B)";
  let resistanceN = 0.0;
  let popZone = 'none';
  let dimpleFactor = 0.0;

  if (ribHit) {
    layer = `BONE BLOCK: ${ribCol.whichRib} Periosteum (${Math.round(ribCol.tRibMm)}mm) — CANNOT ADVANCE!`;
    resistanceN = 9.5;
    popZone = 'fascia';
  } else if (state.depthMm <= 0.5) {
    layer = "0mm: On Skin Surface (Point B)";
    resistanceN = 0.0;
  } else if (state.depthMm > 0.5 && state.depthMm <= 3.5) {
    layer = "Skin Dermis Puncture [Skin Pop]";
    resistanceN = 3.2;
    popZone = 'skin';
  } else if (ng.tip.z > 2.5 && ng.tip.z <= 23) {
    layer = "Subcutaneous Fat (Safe Pivot Zone)";
    resistanceN = 0.8;
  } else if (ng.tip.z > 23 && ng.tip.z <= 29) {
    layer = "Lumbodorsal Fascia [1st Pop -> Switch View!]";
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
  if (!ribHit && ng.tip.z > cal.z + cal.cupR + 4) {
    layer = "Anterior Calyceal Wall Overshoot!";
    resistanceN = 4.2;
  }

  if (popZone !== 'none' && popZone !== state.lastPopZone) {
    playTactilePop(popZone);
  }
  state.lastPopZone = popZone;

  const inTarget = !ribHit && distToCalyx <= cal.cupR;
  const inInfundibulumWall = !ribHit && !inTarget && distToCalyx < 17 && ng.tip.x < cal.x - 5;
  const inAnt = !ribHit && distToAnt <= 8.5;

  const iso = { x: cal.x, y: cal.y, z: cal.z };
  const pTip = project3D(ng.tip, iso);
  const pHub = project3D(ng.hub, iso);
  const coaxialErr = Math.hypot(pTip.u - pHub.u, pTip.v - pHub.v);

  return {
    distToCalyx,
    dogLegDeg,
    coronalMismatch,
    trueCorDeg,
    colonRisk,
    paraspinalRisk,
    ribHit,
    whichRib: ribCol.whichRib,
    ribBlockDepthMm: ribCol.tRibMm,
    onRibTrajectory: ribCol.anyRibHit,
    intercostalHit,
    pleuraHit,
    layer,
    resistanceN,
    dimpleFactor,
    inTarget,
    inInfundibulumWall,
    inAnt,
    coaxialErr,
    tipZ: ng.tip.z,
    calZ: cal.z,
    isSagging: ng.isSagging,
    isPendulumSwinging: ng.isPendulumSwinging
  };
}

function updateDiagnosticsAndCoach() {
  const d = computeDiagnostics();
  const cal = getTargetCalyxBase();
  const opt = computeOptimalGeometryForTechnique(state.coachMode);

  document.getElementById('tissueBadge').textContent = d.layer;
  document.getElementById('hapticLayerText').textContent = `HAPTIC: ${d.layer}`;
  document.getElementById('hapticForceVal').textContent = `${d.resistanceN.toFixed(1)} N`;
  document.getElementById('hapticFill').style.width = `${Math.min(100, (d.resistanceN / 9.5) * 100)}%`;

  const guideBox = document.getElementById('tacticalGuideBox');
  if (guideBox) {
    guideBox.style.display = state.blindMode ? 'none' : 'block';
    if (!state.blindMode) {
      guideBox.innerHTML = buildTacticalGuideHTML(opt, cal);
    }
  }

  const respLockedCorrectly = state.respMode === opt.respMode;
  const sheathDone = Math.abs(state.sheathDepthMm - state.depthMm) <= 7 && !state.wireKinked && state.sheathDepthMm > 30;
  let steps = [];
  if (state.coachMode === 'hybrid') {
    steps = [
      { done: respLockedCorrectly && state.visited0AP && d.coronalMismatch <= 6 && !d.onRibTrajectory, text: `1. 0° AP: Lock ${opt.respMode.toUpperCase()} Hold, set Point B (L=${opt.latCm.toFixed(1)}, CC=${opt.ccCm.toFixed(1)}) & Coronal (${opt.corDeg.toFixed(1)}°).` },
      { done: state.depthMm >= opt.fasciaDepthMm - 1 && !d.ribHit, text: `2. 0° AP: Pierce Skin (3mm) → Lumbodorsal Fascia [1st Pop at ${opt.fasciaDepthMm}mm].` },
      { done: state.visited30Ax && d.coaxialErr < 10 && state.depthMm >= opt.fasciaDepthMm, text: `3. Rotate C-Arm AT FASCIA (${opt.fasciaDepthMm}mm) to +${cal.axialDeg}° Axial: Lock Pitch (${opt.pitchDeg.toFixed(1)}°).` },
      { done: d.inTarget && state.styletPulled, text: `4. Return to 0° AP in Gerota's Fat (~${opt.tractDistMm - 12}mm) → Watch Dimple & Pop Papilla (${opt.tractDistMm}mm).` },
      { done: state.wireInPelvis && state.stiffWireExchanged, text: "5. Stage 2: Steer Terumo wire down ureter & swap to Super Stiff." },
      { done: sheathDone, text: "6. Stage 3: Coaxial dilation & park 24Fr Amplatz sheath." }
    ];
  } else if (state.coachMode === 'triangulation') {
    steps = [
      { done: respLockedCorrectly && state.visited0AP && d.coronalMismatch <= 6 && state.depthMm >= opt.fasciaDepthMm - 1 && !d.ribHit, text: `1. Plane 1 (0° AP): Lock ${opt.respMode.toUpperCase()}, align Coronal (${opt.corDeg.toFixed(1)}°) & punch Fascia [1st Pop at ${opt.fasciaDepthMm}mm].` },
      { done: state.visited30Ob && d.inTarget && state.styletPulled, text: `2. Plane 2 (+30° Ceph AT ${opt.fasciaDepthMm}mm Fascia): Read parallax, set Pitch (${opt.pitchDeg.toFixed(1)}°) & pop Papilla (${opt.tractDistMm}mm).` },
      { done: state.wireInPelvis && state.stiffWireExchanged, text: "3. Stage 2: Steer Terumo wire down ureter & swap to Super Stiff." },
      { done: sheathDone, text: "4. Stage 3: Coaxial Alken/Amplatz dilation into calyceal cup." }
    ];
  } else {
    steps = [
      { done: respLockedCorrectly && state.visited30Ax && d.coaxialErr < 8 && state.depthMm >= opt.fasciaDepthMm - 1 && !d.ribHit, text: `1. +${cal.axialDeg}° Oblique: Lock ${opt.respMode.toUpperCase()}, superimpose hub-over-tip dot & punch Fascia (${opt.fasciaDepthMm}mm).` },
      { done: d.inTarget && state.styletPulled, text: `2. Switch to 0° AP at ~${opt.tractDistMm - 12}mm (Gerota's Fat): Watch dimple, pop in (${opt.tractDistMm}mm) & pull stylet.` },
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
      badge.textContent = `HARD BONE BLOCK: ${d.whichRib.toUpperCase()} PERIOSTEAL STRIKE (${d.ribBlockDepthMm} MM)!`;
      txt.innerHTML = `Needle tip struck solid bone on the <b>${d.whichRib}</b> at <b>${d.ribBlockDepthMm} mm</b> and cannot advance deeper! Retract and move Point B off the rib into the intercostal/subcostal space.`;
    } else if (d.onRibTrajectory) {
      badge.className = 'badge-pill b-warn';
      badge.textContent = `WARNING: POINT B OVER ${d.whichRib.toUpperCase()} (WILL HIT BONE AT ${d.ribBlockDepthMm} MM)`;
      txt.innerHTML = `Your skin entry / trajectory is aimed directly into the <b>${d.whichRib}</b>! If you advance past ${d.ribBlockDepthMm} mm, you will hit solid bone. Move Point B into the intercostal or subcostal space.`;
    } else if (d.intercostalHit) {
      badge.className = 'badge-pill b-err';
      badge.textContent = 'SUBCOSTAL NEUROVASCULAR BUNDLE LACERATION!';
      txt.innerHTML = 'Needle hugged the inferior border of the rib, lacerating the intercostal artery! Always enter along the superior border of the lower rib.';
    } else if (d.colonRisk) {
      badge.className = 'badge-pill b-err';
      badge.textContent = 'COLON PERFORATION HAZARD (>PAL)';
      txt.innerHTML = 'Skin entry is lateral to the Posterior Axillary Line (>12.6 cm). Reduce Lateral Offset L.';
    } else if (d.pleuraHit) {
      badge.className = 'badge-pill b-err';
      badge.textContent = 'PLEURAL TRANGRESSION (HYDROTHORAX RISK)';
      txt.innerHTML = 'Supracostal needle crossed the pleura! Lock ventilation in <b>Resp: Exp Hold</b> and stay in the 11th–12th ICS.';
    } else if (d.isPendulumSwinging) {
      badge.className = 'badge-pill b-warn';
      badge.textContent = 'RESPIRATORY PENDULUM SIGN (WINDSHIELD-WIPER HUB)';
      txt.innerHTML = 'Kidney excursion during Tidal breathing is swinging the anchored needle! Lock ventilation (<b>Insp/Exp Hold</b>) before advancing or dilating.';
    } else if (d.isSagging) {
      badge.className = 'badge-pill b-warn';
      badge.textContent = 'GRAVITY SAG ACTIVE (BEFORE FASCIA)';
      txt.innerHTML = 'Because the Radiolucent Clamp is OFF and the tip has not yet anchored in the lumbodorsal fascia, hub weight is drooping the needle downward by 8°!';
    } else {
      badge.className = d.inTarget ? 'badge-pill b-ok' : 'badge-pill b-info';
      badge.textContent = `DOG-LEG: ${d.dogLegDeg.toFixed(1)}° | DEPTH: ${Math.round(state.depthMm)}/${opt.tractDistMm} MM | FORCE: ${d.resistanceN.toFixed(1)} N`;
      txt.innerHTML = `<b>${d.layer}</b> — Target: <b>${cal.label}</b> (Dist to papilla: <b>${d.distToCalyx.toFixed(1)} mm</b>).`;
    }
  }
}

// ============================================================================
// GOD-VIEW FLUORO TELEMETRY HUD, 11TH RIB FLANK OVERLAY & NEPHROSCOPE INSET
// ============================================================================
(function hookRendererUpgrades() {
  let lastFrameTime = performance.now();

  function postRenderOverlay() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    const isFiring = state.contFluoro || state.pedalDown || state.autoPlaying;
    if (isFiring) {
      const obFactor = (Math.abs(state.cArmAx) + Math.abs(state.cArmOb)) / 45;
      const obeseFactor = state.caseIdx === 4 ? 1.55 : 1.0;
      const extraMgy = dt * 0.042 * (obFactor * 0.8 + (obeseFactor - 1));
      if (extraMgy > 0) {
        state.fluoroDose += extraMgy;
        const fdEl = document.getElementById('fluoroDoseText');
        if (fdEl) fdEl.textContent = state.fluoroDose.toFixed(2) + ' mGy';
      }
    }

    const c = getLiveAnatomy();
    const cal = getTargetCalyxBase();
    const opt = computeOptimalGeometryForTechnique(state.coachMode);
    const d = computeDiagnostics();

    // 1. Draw the Missing 11th Rib & Bone-Block Warning on the Prone Flank Map (skinCanvas)
    const sw = skinCanvas.width;
    const sh = skinCanvas.height;
    if (sw > 0 && sh > 0) {
      const scale = sw / 180;
      const ox = 20 * scale;
      const oy = sh * 0.52;
      const toS = (wx, wy) => ({ x: ox + wx * scale, y: oy - wy * scale });

      sCtx.save();
      const r11a = toS(26, c.rib12Y + 28 + 14);
      const r11b = toS(74, c.rib12Y + 28 + 4);
      const r11c = toS(118, c.rib12Y + 28 - 5);
      sCtx.beginPath();
      sCtx.moveTo(r11a.x, r11a.y);
      sCtx.quadraticCurveTo(r11b.x, r11b.y, r11c.x, r11c.y);
      sCtx.lineWidth = 7.5 * scale;
      sCtx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      sCtx.lineCap = 'round';
      sCtx.stroke();
      sCtx.fillStyle = '#94a3b8';
      sCtx.font = '9px sans-serif';
      sCtx.fillText('11th Rib', r11a.x + 6, r11a.y - 5);

      if (d.onRibTrajectory) {
        sCtx.fillStyle = 'rgba(220, 38, 38, 0.88)';
        sCtx.fillRect(8, sh - 24, sw - 16, 18);
        sCtx.fillStyle = '#fff';
        sCtx.font = 'bold 9.5px monospace';
        sCtx.textAlign = 'center';
        sCtx.fillText(`⛔ ${d.whichRib.toUpperCase()} BONE BLOCK AT ${d.ribBlockDepthMm}MM — MOVE POINT B OFF RIB!`, sw / 2, sh - 11);
      }
      sCtx.restore();
    }

    // 2. Fluoro HUD & Scrubber
    const fw = fluoroCanvas.width;
    const fh = fluoroCanvas.height;
    if (fw > 0 && fh > 0) {
      const axDiff = Math.abs(state.cArmAx - cal.axialDeg);

      fCtx.save();

      if (!state.blindMode) {
        const dCor = state.corDeg - opt.corDeg;
        const dPitch = state.pitchDeg - opt.pitchDeg;
        const dZ = Math.round(d.tipZ - d.calZ);

        fCtx.fillStyle = 'rgba(9, 13, 20, 0.84)';
        fCtx.strokeStyle = d.ribHit ? '#ef4444' : (d.inTarget ? '#22c55e' : '#334155');
        fCtx.lineWidth = 1.2;
        fCtx.fillRect(10, fh - 68, 272, 58);
        fCtx.strokeRect(10, fh - 68, 272, 58);

        fCtx.font = 'bold 10px monospace';
        fCtx.fillStyle = d.ribHit ? '#f87171' : '#38bdf8';
        fCtx.fillText(d.ribHit ? `⛔ BLOCKED BY ${d.whichRib.toUpperCase()} (${d.ribBlockDepthMm}MM)` : `GOD-VIEW 3D TELEMETRY (${cal.label})`, 16, fh - 54);

        fCtx.fillStyle = Math.abs(dCor) <= 3 ? '#4ade80' : '#fbbf24';
        fCtx.fillText(`Coronal: ${state.corDeg.toFixed(1)}° (Ideal ${opt.corDeg.toFixed(1)}° | Δ${dCor >= 0 ? '+' : ''}${dCor.toFixed(1)}°)`, 16, fh - 40);

        fCtx.fillStyle = Math.abs(dPitch) <= 2.5 ? '#4ade80' : '#fbbf24';
        fCtx.fillText(`Pitch:   ${state.pitchDeg.toFixed(1)}° (Ideal ${opt.pitchDeg.toFixed(1)}° | Δ${dPitch >= 0 ? '+' : ''}${dPitch.toFixed(1)}°)`, 16, fh - 27);

        fCtx.fillStyle = d.inTarget ? '#4ade80' : '#e2e8f0';
        fCtx.fillText(`Depth Z: ${Math.round(d.tipZ)}mm / ${d.calZ}mm (${dZ < 0 ? Math.abs(dZ) + 'mm Superficial' : (dZ > 0 ? dZ + 'mm Deep' : 'ON DEPTH!')})`, 16, fh - 14);
      }

      if (axDiff <= 5 && (!state.blindMode || isFiring)) {
        fCtx.fillStyle = 'rgba(16, 185, 129, 0.18)';
        fCtx.strokeStyle = '#10b981';
        fCtx.lineWidth = 1.5;
        fCtx.fillRect(10, 10, 240, 24);
        fCtx.strokeRect(10, 10, 240, 24);
        fCtx.fillStyle = '#6ee7b7';
        fCtx.font = 'bold 10.5px monospace';
        fCtx.fillText(`◎ CALYX END-ON PROFILE (${cal.axialDeg}° AXIAL)`, 16, 26);
      }

      const sx = fw - 26;
      const syTop = 44;
      const syBot = fh - 44;
      const sHeight = syBot - syTop;

      fCtx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      fCtx.strokeStyle = '#334155';
      fCtx.lineWidth = 1.2;
      fCtx.fillRect(sx - 10, syTop, 20, sHeight);
      fCtx.strokeRect(sx - 10, syTop, 20, sHeight);

      if (!state.blindMode) {
        if (d.onRibTrajectory) {
          const yRib = syTop + (d.ribBlockDepthMm / 125) * sHeight;
          fCtx.strokeStyle = '#ef4444';
          fCtx.lineWidth = 2.5;
          fCtx.beginPath(); fCtx.moveTo(sx - 10, yRib); fCtx.lineTo(sx + 10, yRib); fCtx.stroke();
          fCtx.fillStyle = '#f87171';
          fCtx.font = 'bold 8px monospace';
          fCtx.textAlign = 'right';
          fCtx.fillText(`⛔${d.whichRib}(${d.ribBlockDepthMm})`, sx - 12, yRib + 3);
        }

        const yFascia = syTop + (opt.fasciaDepthMm / 125) * sHeight;
        const yCalyx  = syTop + (opt.tractDistMm / 125) * sHeight;

        fCtx.strokeStyle = '#f59e0b';
        fCtx.lineWidth = 2;
        fCtx.beginPath(); fCtx.moveTo(sx - 9, yFascia); fCtx.lineTo(sx + 9, yFascia); fCtx.stroke();
        fCtx.fillStyle = '#fbbf24';
        fCtx.font = '8px monospace';
        fCtx.textAlign = 'right';
        fCtx.fillText(`1stPop(${opt.fasciaDepthMm})`, sx - 12, yFascia + 3);

        fCtx.strokeStyle = '#22c55e';
        fCtx.lineWidth = 2;
        fCtx.beginPath(); fCtx.moveTo(sx - 9, yCalyx); fCtx.lineTo(sx + 9, yCalyx); fCtx.stroke();
        fCtx.fillStyle = '#4ade80';
        fCtx.fillText(`2ndPop(${opt.tractDistMm})`, sx - 12, yCalyx + 3);
      }

      const yCur = syTop + Math.min(1, state.depthMm / 125) * sHeight;
      fCtx.fillStyle = d.ribHit ? '#ef4444' : (d.inTarget ? '#22c55e' : '#38bdf8');
      fCtx.beginPath();
      fCtx.arc(sx, yCur, 7, 0, Math.PI * 2);
      fCtx.fill();
      fCtx.fillStyle = '#f8fafc';
      fCtx.font = 'bold 9px monospace';
      fCtx.textAlign = 'right';
      fCtx.fillText(`${Math.round(state.depthMm)}mm`, sx - 12, yCur + 3);
      fCtx.restore();
    }

    // 3. Live 24Fr Rigid Nephroscope Endoscopic View Inset in Tab 5 (Dilation & Torque)
    if (state.workbench === 'dilation' && benchCanvas.width > 0) {
      const bw = benchCanvas.width;
      const bh = benchCanvas.height;
      const r = Math.min(bw, bh) * 0.22;
      const ex = bw - r - 18;
      const ey = bh * 0.52;

      bCtx.save();
      bCtx.beginPath();
      bCtx.arc(ex, ey, r, 0, Math.PI * 2);
      bCtx.fillStyle = '#090d14';
      bCtx.fill();
      bCtx.lineWidth = 3;
      bCtx.strokeStyle = '#475569';
      bCtx.stroke();
      bCtx.clip();

      const isUnderDilated = state.sheathDepthMm > 20 && state.sheathDepthMm < state.depthMm - 8;
      const isOverDilated = state.rodDepthMm > state.depthMm + 14;
      const stress = Math.round(d.dogLegDeg * 0.9 + Math.abs(state.scopeSweepDeg) * 1.1);

      if (state.sheathDepthMm <= 20) {
        bCtx.fillStyle = '#0f172a';
        bCtx.fillRect(ex - r, ey - r, r * 2, r * 2);
        bCtx.fillStyle = '#64748b';
        bCtx.font = 'bold 10px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText('Advance 24Fr Sheath', ex, ey - 4);
        bCtx.fillText('for Nephroscopy View', ex, ey + 10);
      } else if (isUnderDilated) {
        bCtx.fillStyle = '#ca8a04';
        bCtx.fillRect(ex - r, ey - r, r * 2, r * 2);
        bCtx.fillStyle = '#713f12';
        bCtx.font = 'bold 10px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText('PERINEPHRIC FAT!', ex, ey + 4);
      } else if (isOverDilated || stress >= 48) {
        bCtx.fillStyle = '#991b1b';
        bCtx.fillRect(ex - r, ey - r, r * 2, r * 2);
        bCtx.fillStyle = '#fecaca';
        bCtx.font = 'bold 10px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText('RED-OUT HEMORRHAGE', ex, ey + 4);
      } else {
        const g = bCtx.createRadialGradient(ex, ey, r * 0.1, ex, ey, r);
        g.addColorStop(0, '#f43f5e');
        g.addColorStop(1, '#881337');
        bCtx.fillStyle = g;
        bCtx.fillRect(ex - r, ey - r, r * 2, r * 2);

        const stoneOffset = state.scopeSweepDeg * 0.9;
        bCtx.beginPath();
        bCtx.arc(ex - stoneOffset, ey, r * 0.48, 0, Math.PI * 2);
        bCtx.fillStyle = '#eab308';
        bCtx.fill();
        bCtx.lineWidth = 2;
        bCtx.strokeStyle = '#fef08a';
        bCtx.stroke();
      }
      bCtx.restore();

      bCtx.fillStyle = '#e2e8f0';
      bCtx.font = 'bold 10px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.fillText('24Fr NEPHROSCOPE VIEW', ex, ey - r - 6);
    }

    requestAnimationFrame(postRenderOverlay);
  }

  requestAnimationFrame(postRenderOverlay);
})();
