// ============================================================================
// MULTI-CALYCEAL CLINICAL SCENARIOS (3D Coordinates in mm)
// +X = Lateral toward flank | +Y = Cephalad toward head | +Z = Anterior depth from skin
// ============================================================================
const CASES = [
  {
    name: "Case 1: Standard Pelvic + Lower-Pole Stone",
    pelvis: { x: 60, y: 0, z: 84 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post.", x: 80, y: -12, z: 68, axialDeg: 30, coronalDeg: 22, neckW: 10, cupR: 8.0, reachPct: 92 },
      lower_med: { label: "Lower-Medial Sub-Apical", x: 69, y: -22, z: 71, axialDeg: 22, coronalDeg: 48, neckW: 6.5, cupR: 6.5, reachPct: 64 },
      middle:    { label: "Middle Posterior", x: 79, y: 11, z: 69, axialDeg: 32, coronalDeg: 4, neckW: 9.0, cupR: 7.5, reachPct: 88 },
      upper:     { label: "Upper-Pole Compound", x: 74, y: 32, z: 65, axialDeg: 26, coronalDeg: -16, neckW: 11, cupR: 8.5, reachPct: 95 }
    },
    antCalyx: { x: 88, y: -10, z: 95 },
    rib12Y: 22,
    pleuraY: 38,
    stoneType: "pelvic_and_lower",
    defaultCalyx: "lower_lat"
  },
  {
    name: "Case 2: Branched Staghorn (Steep 52° Lower Neck)",
    pelvis: { x: 58, y: 4, z: 86 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post. (52° Neck)", x: 82, y: -16, z: 68, axialDeg: 36, coronalDeg: 52, neckW: 5.5, cupR: 6.5, reachPct: 78 },
      lower_med: { label: "Lower-Medial Sub-Apical", x: 68, y: -24, z: 72, axialDeg: 25, coronalDeg: 60, neckW: 5.0, cupR: 6.0, reachPct: 52 },
      middle:    { label: "Middle Posterior", x: 78, y: 13, z: 70, axialDeg: 34, coronalDeg: 8, neckW: 8.0, cupR: 7.0, reachPct: 84 },
      upper:     { label: "Upper-Pole Compound", x: 72, y: 35, z: 66, axialDeg: 26, coronalDeg: -15, neckW: 11.5, cupR: 8.5, reachPct: 96 }
    },
    antCalyx: { x: 89, y: -12, z: 96 },
    rib12Y: 24,
    pleuraY: 40,
    stoneType: "staghorn",
    defaultCalyx: "lower_lat"
  },
  {
    name: "Case 3: High Calyx Directly Under 12th Rib (Subcostal)",
    pelvis: { x: 60, y: 12, z: 84 },
    calyces: {
      lower_lat: { label: "High Mid/Lower Post. (Under 12th Rib)", x: 80, y: 18, z: 68, axialDeg: 30, coronalDeg: 26, neckW: 9.0, cupR: 7.5, reachPct: 90, forceSubcostal: true },
      lower_med: { label: "Inferior Sub-Apical", x: 72, y: -8, z: 72, axialDeg: 28, coronalDeg: 42, neckW: 6.5, cupR: 6.5, reachPct: 68 },
      middle:    { label: "Middle Posterior (Under Rib)", x: 80, y: 18, z: 68, axialDeg: 30, coronalDeg: 26, neckW: 9.0, cupR: 7.5, reachPct: 90, forceSubcostal: true },
      upper:     { label: "Upper-Pole Compound", x: 74, y: 38, z: 65, axialDeg: 25, coronalDeg: -14, neckW: 10.5, cupR: 8.0, reachPct: 92, supracostal: true }
    },
    antCalyx: { x: 88, y: 18, z: 93 },
    rib12Y: 18,
    pleuraY: 36,
    stoneType: "calyceal_high",
    defaultCalyx: "lower_lat"
  },
  {
    name: "Case 4: Supracostal Upper-Pole Staghorn (11th–12th ICS)",
    pelvis: { x: 58, y: 2, z: 82 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post.", x: 80, y: -14, z: 69, axialDeg: 32, coronalDeg: 38, neckW: 7.0, cupR: 7.0, reachPct: 62 },
      lower_med: { label: "Lower-Medial Post.", x: 70, y: -22, z: 72, axialDeg: 24, coronalDeg: 50, neckW: 6.0, cupR: 6.0, reachPct: 50 },
      middle:    { label: "Middle Posterior", x: 78, y: 10, z: 68, axialDeg: 30, coronalDeg: 6, neckW: 8.5, cupR: 7.5, reachPct: 76 },
      upper:     { label: "Upper-Pole Compound (11-12 ICS)", x: 74, y: 24, z: 64, axialDeg: 28, coronalDeg: -12, neckW: 11.5, cupR: 8.5, reachPct: 98, supracostal: true }
    },
    antCalyx: { x: 84, y: -8, z: 92 },
    rib12Y: 18,
    pleuraY: 35,
    stoneType: "upper_staghorn",
    defaultCalyx: "upper"
  },
  {
    name: "Case 5: Morbid Obesity (10.4cm Depth) + Ant/Post Overlap",
    pelvis: { x: 60, y: 0, z: 120 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post. (10.4cm Deep)", x: 80, y: -10, z: 104, axialDeg: 28, coronalDeg: 22, neckW: 9.0, cupR: 8.0, reachPct: 88 },
      lower_med: { label: "Lower-Medial Post.", x: 70, y: -20, z: 107, axialDeg: 22, coronalDeg: 45, neckW: 6.5, cupR: 6.5, reachPct: 60 },
      middle:    { label: "Middle Posterior", x: 78, y: 14, z: 105, axialDeg: 30, coronalDeg: 5, neckW: 8.5, cupR: 7.5, reachPct: 85 },
      upper:     { label: "Upper-Pole Compound", x: 72, y: 32, z: 102, axialDeg: 25, coronalDeg: -12, neckW: 10.5, cupR: 8.0, reachPct: 92 }
    },
    antCalyx: { x: 83, y: -9, z: 128 },
    rib12Y: 22,
    pleuraY: 38,
    stoneType: "pelvic_and_lower",
    defaultCalyx: "lower_lat"
  },
  {
    name: "Case 6: Horseshoe / Malrotated Kidney",
    pelvis: { x: 52, y: -6, z: 92 },
    calyces: {
      lower_lat: { label: "Lower-Pole Isthmus Calyx (Medial)", x: 62, y: -22, z: 74, axialDeg: 16, coronalDeg: 40, neckW: 7.0, cupR: 6.5, reachPct: 65 },
      lower_med: { label: "Isthmus Medial Calyx", x: 56, y: -26, z: 78, axialDeg: 12, coronalDeg: 52, neckW: 6.0, cupR: 6.0, reachPct: 55 },
      middle:    { label: "Middle Posteromedial Calyx", x: 68, y: 0, z: 66, axialDeg: 18, coronalDeg: 12, neckW: 9.0, cupR: 7.5, reachPct: 88 },
      upper:     { label: "Upper Posterolateral (Subcostal!)", x: 70, y: 16, z: 62, axialDeg: 20, coronalDeg: -8, neckW: 11.5, cupR: 8.5, reachPct: 97 }
    },
    antCalyx: { x: 78, y: -8, z: 96 },
    rib12Y: 28,
    pleuraY: 42,
    stoneType: "pelvic_and_lower",
    defaultCalyx: "upper"
  }
];

const state = {
  caseIdx: 0,
  targetKey: 'lower_lat',
  coachMode: 'hybrid',
  stage: 1,
  workbench: 'anatomy',

  soundOn: true,
  lastPopZone: 'none',

  blindMode: false,
  blindRevealed: false,
  contFluoro: true,
  pedalDown: false,
  lihDirty: true,
  fluoroSec: 0,

  cArmAx: 0,
  cArmOb: 0,
  airBolus: false,
  hydro: false,
  respMode: 'insp',
  tidalPhase: 0,

  clampOn: true,
  pointAMarked: true,
  latCm: 4.0,
  ccCm: -1.6,
  corDeg: 22.0,
  pitchDeg: 32.0,
  depthMm: 0,

  blushClouds: [],

  styletPulled: false,
  terumoTorqueDeg: 180,
  wireAdvMm: 0,
  wireInPelvis: false,
  kumpeAdvanced: false,
  stiffWireExchanged: false,

  dilPitchDeg: 32.0,
  rodDepthMm: 0,
  sheathDepthMm: 0,
  wireKinked: false,
  scopeSweepDeg: 0,

  visited0AP: true,
  visited30Ax: false,
  visited30Ob: false,

  autoPlaying: false,
  autoSteps: [],
  autoStepIdx: 0,
  autoStepTimer: 0,
  autoSpeed: 1.0
};

let audioCtx = null;
function playTactilePop(type) {
  if (!state.soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'skin') {
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.045);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'fascia') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.075);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'papilla') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
      gain.gain.setValueAtTime(0.30, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now); osc.stop(now + 0.095);
    }
  } catch (e) {}
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  const b = document.getElementById('soundBtn');
  b.textContent = `Audio Pops: ${state.soundOn ? 'ON' : 'OFF'}`;
  b.classList.toggle('active', state.soundOn);
}