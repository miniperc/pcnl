// ============================================================================
// FILE 3/3: review.js — CHECKLIST COACH, PUNCTURE REVIEW & FLUORO HUD
// ============================================================================
function updateDiagnosticsAndCoach() {
  const d = computeDiagnostics();
  const cal = getTargetCalyxBase();
  document.getElementById('tissueBadge').textContent = d.layer;
  document.getElementById('hapticLayerText').textContent = `HAPTIC: ${d.layer}`;
  document.getElementById('hapticForceVal').textContent = `${d.resistanceN.toFixed(1)} N`;
  document.getElementById('hapticFill').style.width = `${Math.min(100, (d.resistanceN / 7.5) * 100)}%`;

  const steps = cal.supracostal ? [
    { done: state.respMode === 'exp', text: "1. Supracostal Rule: Lock Exp Hold (lung retracts cephalad)." },
    { done: state.visited0AP && d.coronalMismatch <= 10, text: "2. 0° AP: Place Point B on upper border of 12th rib." },
    { done: state.depthMm >= 28 && !d.ribHit && !d.pleuraHit, text: "3. Skate over top edge of 12th rib through Fascia [1st Pop]." },
    { done: (state.visited30Ax || state.visited30Ob), text: "4. 30° Oblique / Ceph View: Verify coaxial depth & pitch." },
    { done: d.inTarget && state.styletPulled, text: "5. Enter Upper Papilla [2nd Pop] & Pull Stylet for Review." }
  ] : [
    { done: state.respMode === 'insp', text: "1. Subcostal Rule: Lock Insp Hold (pushes kidney below 12th rib)." },
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
      badge.className = 'badge-pill b-err'; badge.textContent = 'RIB PERIOSTEAL STRIKE';
      txt.innerHTML = 'Needle struck the rib! Hug the superior (upper) border of the 12th rib for supracostal access, or move below it for subcostal.';
    } else if (d.intercostalHit) {
      badge.className = 'badge-pill b-err'; badge.textContent = 'SUBCOSTAL ARTERY / NERVE LACERATION RISK!';
      txt.innerHTML = 'You passed along the inferior margin of the rib where the intercostal neurovascular bundle runs! Always hug the <b>upper border of the 12th rib</b>.';
    } else if (d.pleuraHit) {
      badge.className = 'badge-pill b-err'; badge.textContent = 'PLEURAL TRANGRESSION (HYDROTHORAX RISK)';
      txt.innerHTML = 'Supracostal needle crossed the pleura! Switch to <b>Resp: Exp Hold</b> and stay down on the upper border of the 12th rib.';
    } else {
      badge.className = d.inTarget ? 'badge-pill b-ok' : 'badge-pill b-info';
      badge.textContent = `DOG-LEG: ${d.dogLegDeg.toFixed(1)}° | DEPTH: ${Math.round(state.depthMm)} MM | FORCE: ${d.resistanceN.toFixed(1)} N`;
      txt.innerHTML = `<b>${d.layer}</b> — Target: <b>${cal.label}</b> (Dist to papilla: <b>${d.distToCalyx.toFixed(1)} mm</b>).`;
    }
  }
}

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

  const usedSubcostalForSupracostal = cal.supracostal && d.skinY < d.rib12SurfaceY;
  const dzErr = d.tipZ - d.calZ;

  if (usedSubcostalForSupracostal) {
    score -= 18;
    howToImprove.push(`<b>Subcostal-to-Upper-Pole Approach Detected:</b> You punctured this supracostal upper-pole calyx from <b>below the 12th rib</b> (Coronal <b>+${state.corDeg.toFixed(1)}° upward</b>). While this avoids the pleura, it creates a <b>${d.dogLegDeg.toFixed(1)}° Dog-Leg Hairpin Kink</b> against the caudally draining upper infundibulum (${cal.coronalDeg}°). To get a straight coaxial tract down into the pelvis, enter at the <b>upper border of the 12th rib</b> on <b>Exp Hold</b>.`);
  }

  if (!d.inTarget) {
    score -= 40;
    if (d.inInfundibulumWall) {
      howToImprove.push(`<b>Direct Infundibular Neck Puncture (Venous Hemorrhage):</b> You entered medial to the papillary cup directly into the infundibular wall, bypassing Brödel's avascular plane. Aim <b>8–10 mm more laterally</b> into the center of the calyceal cup.`);
    } else if (d.inAnt) {
      howToImprove.push(`<b>Anterior Calyx Trap:</b> You overshot the posterior calyx (${d.calZ} mm) and punctured the overlapping anterior calyx (${c.antCalyx.z} mm).`);
    } else {
      if (Math.abs(dzErr) > 4) {
        if (dzErr < 0) {
          howToImprove.push(`<b>Passed Too Shallow / Posterior (by ${Math.abs(dzErr).toFixed(0)} mm):</b> Your needle pitch (<b>${state.pitchDeg.toFixed(1)}°</b>) was too flat or stopped short. On a <b>+30° Cephalad</b> tilt, a superficial tip projects <i>downward (caudally)</i> relative to the calyx—steepen pitch toward <b>${opt.pitchDeg.toFixed(1)}°</b>.`);
        } else {
          howToImprove.push(`<b>Passed Too Deep / Anterior (by ${dzErr.toFixed(0)} mm):</b> Your needle pitch (<b>${state.pitchDeg.toFixed(1)}°</b>) was too vertical/steep compared to ideal (<b>${opt.pitchDeg.toFixed(1)}°</b>). On a <b>+30° Cephalad</b> tilt, a deep tip projects <i>upward (cephalad)</i> relative to the calyx.`);
        }
      }
      if (d.coronalMismatch > 7 && !usedSubcostalForSupracostal) {
        howToImprove.push(`<b>Plane 1 Coronal Drift (${state.corDeg.toFixed(1)}° vs ideal ${opt.corDeg.toFixed(1)}°):</b> Align Point B and Coronal Aim with the infundibulum on the 0° AP view.`);
      }
    }
  } else {
    howToImprove.push(`<b>Successful Transpapillary Entry:</b> Entered <b>${cal.label}</b> (${d.distToCalyx.toFixed(1)} mm from papillary center).`);
  }

  if (d.dogLegDeg <= 15) {
    howToImprove.push(`<b>Excellent Coaxial Alignment (Dog-Leg ${d.dogLegDeg.toFixed(1)}°):</b> Guidewire will glide straight into the pelvis/ureter with minimal parenchymal torque.`);
  } else if (!usedSubcostalForSupracostal) {
    score -= (d.dogLegDeg > 28 ? 25 : 12);
    howToImprove.push(`<b>Dog-Leg Angle (${d.dogLegDeg.toFixed(1)}°):</b> Move Point B toward <b>L=${opt.latCm}cm, CC=${opt.ccCm}cm</b> and aim at <b>${opt.corDeg}°</b>.`);
  }

  if (cal.supracostal && !usedSubcostalForSupracostal && state.respMode !== 'exp') {
    score -= 20;
    howToImprove.push(`<b>Supracostal Respiratory Error:</b> Always use <b>Full Expiration (Exp Hold)</b> when puncturing above the 12th rib so the lung retracts cephalad.`);
  }
  if (state.pivotedDeep) {
    score -= 18;
    howToImprove.push(`<b>Parenchymal Shear Warning:</b> Retract to subcutaneous fat (<22 mm) before changing needle angle!`);
  }
  if (d.ribHit || d.intercostalHit) {
    score -= 25;
    howToImprove.push(`<b>Costal / Subcostal Vessel Hazard:</b> Always skate directly over the <b>upper (superior) border of the 12th rib</b> to avoid the subcostal neurovascular bundle under the 11th rib.`);
  }
  if (d.pleuraHit) {
    score -= 30;
    howToImprove.push(`<b>Pleural Transgression:</b> Stay on the upper border of the 12th rib in <b>Exp Hold</b>.`);
  }

  if (cal.supracostal) {
    patientNotes.push(`<b>How to Puncture at the Upper Border of the 12th Rib:</b> On <b>Exp Hold</b>, place Point B at <b>L=${opt.latCm}cm, CC=${opt.ccCm >= 0 ? '+' : ''}${opt.ccCm}cm</b>. Because the 12th rib slopes inferolaterally, this spot sits right on the <b>superior edge of the 12th rib</b>—avoiding the 11th subcostal artery above while giving a coaxial <b>${opt.corDeg}°</b> tract straight down the kidney (${cal.reachPct}% reach).`);
  } else {
    patientNotes.push(`<b>Calyx Anatomy (${cal.label}):</b> Stone Reach: <b>${cal.reachPct}%</b> | Infundibular Neck: <b>${cal.neckW} mm</b> | True Axial Angle: <b>${cal.axialDeg}°</b>.`);
  }

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
      <td>${usedSubcostalForSupracostal ? '<span style="color:#fbbf24">Subcostal Entry to Upper Pole</span>' : '<span style="color:#4ade80">Upper Border of 12th Rib / Optimal</span>'}</td>
    </tr>
    <tr>
      <td><b>Coronal Aim (Plane 1)</b></td>
      <td>${state.corDeg.toFixed(1)}°</td>
      <td>${opt.corDeg.toFixed(1)}°</td>
      <td>Dog-Leg Kink: <b>${d.dogLegDeg.toFixed(1)}°</b></td>
    </tr>
    <tr>
      <td><b>Needle Pitch (Plane 2)</b></td>
      <td>${state.pitchDeg.toFixed(1)}°</td>
      <td>${opt.pitchDeg.toFixed(1)}°</td>
      <td>${Math.abs(state.pitchDeg - opt.pitchDeg) <= 2.5 ? '<span style="color:#4ade80">Exact Depth Vector</span>' : (dzErr < 0 ? '<span style="color:#fbbf24">Too Flat (Shallow)</span>' : '<span style="color:#f87171">Too Steep (Deep)</span>')}</td>
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
// === END OF FILE review.js ===
