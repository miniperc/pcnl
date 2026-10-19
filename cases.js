// ============================================================================
// FILE: cases.js — 10-CASE PCNL CURRICULUM WITH PER-CALYX CLINICAL COMMENTARY
// +X = Lateral toward flank | +Y = Cephalad toward head | +Z = Anterior depth from skin
// ============================================================================
const CASES = [
  {
    name: "Case 1: Standard Pelvic + Lower-Pole Stone (Hydronephrotic)",
    clinicalBrief: "2.2 cm renal pelvic stone + 1.1 cm lower-pole calculus in a standard Brödel-type kidney with moderate hydronephrosis.",
    casePearl: "The Lower-Lateral Posterior calyx (30° axial, +22° coronal) is the textbook gateway here: it offers a wide 10 mm infundibulum, subcostal safety on Inspiration, and a gentle angle into the renal pelvis.",
    pelvis: { x: 60, y: 0, z: 84 },
    calyces: {
      lower_lat: {
        label: "Lower-Lateral Post. (Primary)", x: 80, y: -12, z: 68, axialDeg: 30, coronalDeg: 22, neckW: 10, cupR: 8.0, reachPct: 92,
        calyxNote: "GOLD STANDARD TARGET: Wide 10 mm infundibulum and gentle +22° coronal slope allow a single subcostal tract to clear both the lower-pole and pelvic stones with minimal torque."
      },
      lower_med: {
        label: "Lower-Medial Sub-Apical", x: 69, y: -22, z: 71, axialDeg: 20, coronalDeg: 48, neckW: 6.5, cupR: 6.5, reachPct: 64,
        calyxNote: "SUBOPTIMAL TRAP: Sits too medially near the paraspinal muscle with a narrow 6.5 mm neck and steep 48° angle into the pelvis—forcing high scope torque (only 64% reach)."
      },
      middle: {
        label: "Middle Posterior", x: 79, y: 11, z: 69, axialDeg: 28, coronalDeg: 4, neckW: 9.0, cupR: 7.5, reachPct: 88,
        calyxNote: "GOOD ALTERNATIVE: Enters the renal pelvis dead-on (4° coronal), great for the pelvic stone, though reaching back down into an acute lower-pole calyx with a rigid scope can be tight."
      },
      upper: {
        label: "Upper-Pole Compound", x: 74, y: 32, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 11, cupR: 8.5, reachPct: 95,
        calyxNote: "UNNECESSARY SUPRACOSTAL RISK: While it gives 95% reach down the kidney, a supracostal puncture is unnecessary when a safe subcostal lower-lateral tract clears 92% of the system."
      }
    },
    antCalyx: { x: 88, y: -10, z: 95 },
    rib12Y: 22, pleuraY: 38, stoneType: "pelvic_and_lower", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 2: Branched Staghorn (Steep 52° Lower Neck — Dog-Leg Trap)",
    clinicalBrief: "Complete branched staghorn calculus filling the pelvis and calyces. The lower-pole infundibulum is long, narrow (5.5 mm), and acutely angled (52°).",
    casePearl: "Beware the 'Pure Bull's Eye Dog-Leg Trap'! Puncturing the lower calyx at 0° coronal creates a 52° kink where wires buckle against the impacted staghorn. Either triangulate from caudally (CC = -2.8 cm) OR use the Upper-Pole Compound calyx (96% reach) to work straight down the renal axis.",
    pelvis: { x: 58, y: 4, z: 86 },
    calyces: {
      lower_lat: {
        label: "Lower-Lateral Post. (52° Neck)", x: 82, y: -16, z: 68, axialDeg: 36, coronalDeg: 52, neckW: 5.5, cupR: 6.5, reachPct: 78,
        calyxNote: "DOG-LEG TRAP: Because the infundibulum slopes at 52°, a horizontal puncture hits the roof of the calyx at a 52° kink. You MUST drop Point B caudally and aim +52° cephalad!"
      },
      lower_med: {
        label: "Lower-Medial Sub-Apical", x: 68, y: -24, z: 72, axialDeg: 22, coronalDeg: 60, neckW: 5.0, cupR: 6.0, reachPct: 52,
        calyxNote: "CONTRAINDICATED FOR STAGHORN: 60° hairpin angle and 5 mm stenotic neck will trap your rigid nephroscope and risk tearing interlobar vessels."
      },
      middle: {
        label: "Middle Posterior", x: 78, y: 13, z: 70, axialDeg: 32, coronalDeg: 8, neckW: 8.0, cupR: 7.0, reachPct: 84,
        calyxNote: "SECONDARY TRACT: Good for debulking the central pelvis, but cannot reach both the upper- and lower-pole staghorn branches without a second tract."
      },
      upper: {
        label: "Upper-Pole Compound", x: 72, y: 35, z: 66, axialDeg: 24, coronalDeg: -8, neckW: 11.5, cupR: 8.5, reachPct: 96,
        calyxNote: "HIGH-REACH STAGHORN GATEWAY: Wide 11.5 mm compound neck aligned straight down the long axis of the staghorn (96% reach), provided you hug the upper border of the 12th rib in Exp Hold."
      }
    },
    antCalyx: { x: 89, y: -12, z: 96 },
    rib12Y: 24, pleuraY: 40, stoneType: "staghorn", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 3: High Calyx Under 12th Rib (Subcostal Cephalad Triangulation)",
    clinicalBrief: "High-riding kidney where the target posterior calyx sits directly underneath the 12th rib shadow.",
    casePearl: "A direct coaxial Bull's Eye trajectory will strike the 12th rib periosteum or lacerate the subcostal neurovascular bundle. Lock Full Inspiration (Insp Hold), place Point B 2 cm caudally below the rib (CC = -2.0 cm), and triangulate +26° cephalad.",
    pelvis: { x: 60, y: 12, z: 84 },
    calyces: {
      lower_lat: {
        label: "High Post. Calyx (Under 12th Rib)", x: 80, y: 18, z: 68, axialDeg: 26, coronalDeg: 26, neckW: 9.0, cupR: 7.5, reachPct: 90, forceSubcostal: true,
        calyxNote: "CLASSIC TRIANGULATION TARGET: Sits directly under the 12th rib at rest. Requires Insp Hold + caudal skin entry (CC = -2.0 cm) + cephalad angulation to slip underneath the rib."
      },
      lower_med: {
        label: "Inferior Sub-Apical", x: 72, y: -8, z: 72, axialDeg: 18, coronalDeg: 42, neckW: 6.5, cupR: 6.5, reachPct: 68,
        calyxNote: "EASIER ENTRY BUT POOR REACH: Below the rib, but its 42° steep medial neck limits rigid scope access to the upper stone burden."
      },
      middle: {
        label: "Middle Posterior (Rib-Shielded)", x: 80, y: 18, z: 68, axialDeg: 28, coronalDeg: 26, neckW: 9.0, cupR: 7.5, reachPct: 90, forceSubcostal: true,
        calyxNote: "RIB-BLOCKED COAXIAL PATH: Cannot be punctured with a 0° coronal Bull's Eye without hitting the 12th rib; use Biplanar Triangulation."
      },
      upper: {
        label: "Upper-Pole Compound (Supracostal)", x: 74, y: 38, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 10.5, cupR: 8.0, reachPct: 92, supracostal: true,
        calyxNote: "SUPRACOSTAL OPTION: Requires intercostal puncture at the upper border of the 12th rib on Exp Hold."
      }
    },
    antCalyx: { x: 88, y: 18, z: 93 },
    rib12Y: 18, pleuraY: 36, stoneType: "calyceal_high", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 4: Supracostal Upper-Pole Staghorn (11th–12th ICS Pleural Trap)",
    clinicalBrief: "Large upper-pole compound staghorn extending into the renal pelvis and proximal ureter (UPJ).",
    casePearl: "This is the textbook indication for Supracostal 11th–12th ICS access. Lock Full Expiration (Exp Hold) so the lung retracts, and place Point B directly on the UPPER border of the 12th rib to avoid the 11th subcostal artery above while looking straight down the UPJ (98% reach).",
    pelvis: { x: 58, y: 2, z: 82 },
    calyces: {
      lower_lat: {
        label: "Lower-Lateral Post.", x: 80, y: -14, z: 69, axialDeg: 28, coronalDeg: 38, neckW: 7.0, cupR: 7.0, reachPct: 62,
        calyxNote: "POOR REACH FOR UPPER STAGHORN: From the lower pole, a rigid scope cannot navigate the acute angle into the upper-pole compound calyces or proximal ureter (only 62% reach)."
      },
      lower_med: {
        label: "Lower-Medial Post.", x: 70, y: -22, z: 72, axialDeg: 20, coronalDeg: 50, neckW: 6.0, cupR: 6.0, reachPct: 50,
        calyxNote: "WRONG POLE: Narrow 6 mm neck far from the upper-pole stone burden."
      },
      middle: {
        label: "Middle Posterior", x: 78, y: 10, z: 68, axialDeg: 26, coronalDeg: 6, neckW: 8.5, cupR: 7.5, reachPct: 76,
        calyxNote: "CLEARS PELVIS ONLY: Reaches the pelvic portion of the stone, but leaves residual fragments in the upper compound calyces."
      },
      upper: {
        label: "Upper-Pole Compound (11-12 ICS)", x: 74, y: 24, z: 64, axialDeg: 24, coronalDeg: -8, neckW: 11.5, cupR: 8.5, reachPct: 98, supracostal: true,
        calyxNote: "GOLD STANDARD (98% REACH): Enters straight down the long axis of the kidney, pelvis, and proximal ureter. Must be performed in Exp Hold at the upper border of the 12th rib!"
      }
    },
    antCalyx: { x: 84, y: -8, z: 92 },
    rib12Y: 18, pleuraY: 35, stoneType: "upper_staghorn", defaultCalyx: "upper"
  },
  {
    name: "Case 5: Morbid Obesity (10.4cm Depth) + Ant/Post Calyx Overlap",
    clinicalBrief: "BMI 44 patient with a 10.4 cm deep posterior calyx and an anterior calyx (12.8 cm deep) that overlaps on the 0° AP view.",
    casePearl: "Two traps here: (1) At 115+ mm tract length, a tiny 3° pitch error misses the papilla by >6 mm, and pivoting deep in the fat bends the needle. (2) Use 5mL Air Bolus (air rises to the posterior calyx!) and rotate the C-arm 35°–40° ipsilateral to separate the posterior papilla from the anterior calyx.",
    pelvis: { x: 60, y: 0, z: 120 },
    calyces: {
      lower_lat: {
        label: "Lower-Lateral Post. (10.4cm Deep)", x: 80, y: -10, z: 104, axialDeg: 40, coronalDeg: 22, neckW: 9.0, cupR: 8.0, reachPct: 88,
        calyxNote: "PRIMARY DEEP TARGET (104 mm): Requires precise 40° ipsilateral C-arm rotation to view end-on and avoid overshooting into the overlapping anterior calyx (128 mm)."
      },
      lower_med: {
        label: "Lower-Medial Post.", x: 70, y: -20, z: 107, axialDeg: 24, coronalDeg: 45, neckW: 6.5, cupR: 6.5, reachPct: 60,
        calyxNote: "DEEP & NARROW: 107 mm depth with a 45° coronal dog-leg makes sheath placement difficult in an obese pannus."
      },
      middle: {
        label: "Middle Posterior", x: 78, y: 14, z: 105, axialDeg: 34, coronalDeg: 5, neckW: 8.5, cupR: 7.5, reachPct: 85,
        calyxNote: "SOLID ALTERNATIVE: 105 mm depth with a nearly horizontal 5° coronal entry into the renal pelvis."
      },
      upper: {
        label: "Upper-Pole Compound", x: 72, y: 32, z: 102, axialDeg: 24, coronalDeg: -8, neckW: 10.5, cupR: 8.0, reachPct: 92, supracostal: true,
        calyxNote: "HIGH ATELECTASIS / PLEURAL RISK IN OBESITY: Supracostal access in morbid obesity carries higher basal atelectasis and hydrothorax risk; prefer subcostal lower-lateral access."
      }
    },
    antCalyx: { x: 83, y: -9, z: 128 },
    rib12Y: 22, pleuraY: 38, stoneType: "pelvic_and_lower", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 6: Horseshoe / Malrotated Kidney (Posteromedial Calyces)",
    clinicalBrief: "Horseshoe kidney with midline parenchymal isthmus. Failed embryonic rotation leaves the renal pelvis anterior and the calyces pointing posteromedially.",
    casePearl: "In a horseshoe kidney, the lower poles are fused medially and tethered anteriorly (deep, steep, and close to paraspinal vessels), whereas the entire kidney sits low—making the Upper Posterolateral Calyx SUBCOSTAL, superficial (62 mm), and the gold-standard access point (97% reach)!",
    pelvis: { x: 52, y: -6, z: 92 },
    calyces: {
      lower_lat: {
        label: "Lower-Pole Isthmus Calyx (Medial)", x: 62, y: -22, z: 74, axialDeg: 16, coronalDeg: 40, neckW: 7.0, cupR: 6.5, reachPct: 65,
        calyxNote: "ISTHMUS TRAP: Tethered medially toward the spine (x=62 mm) and deep (74 mm); rigid scopes cannot easily reach across the high-insertion UPJ."
      },
      lower_med: {
        label: "Deep Isthmus Calyx", x: 56, y: -26, z: 78, axialDeg: 12, coronalDeg: 52, neckW: 6.0, cupR: 6.0, reachPct: 55,
        calyxNote: "DANGEROUSLY MEDIAL: Sits at x=56 mm right next to the erector spinae and lumbar veins with a 52° kink."
      },
      middle: {
        label: "Middle Posteromedial Calyx", x: 68, y: 0, z: 66, axialDeg: 14, coronalDeg: 12, neckW: 9.0, cupR: 7.5, reachPct: 88,
        calyxNote: "GOOD SECONDARY ACCESS: Shallow 14° axial angle due to malrotation; requires a more medial Point B (L = 2.0 cm)."
      },
      upper: {
        label: "Upper Posterolateral (Subcostal!)", x: 70, y: 16, z: 62, axialDeg: 18, coronalDeg: -8, neckW: 11.5, cupR: 8.5, reachPct: 97, supracostal: false,
        calyxNote: "GOLD STANDARD FOR HORSESHOE KIDNEY: Because horseshoe kidneys fail to ascend, the upper pole is SUBCOSTAL (below the 12th rib!), superficial (62 mm), and gives 97% reach down to the isthmus!"
      }
    },
    antCalyx: { x: 78, y: -8, z: 96 },
    rib12Y: 28, pleuraY: 42, stoneType: "pelvic_and_lower", defaultCalyx: "upper"
  },
  {
    name: "Case 7: Calyceal Diverticulum / Nondilated Micro-Calyx (5mm Target)",
    clinicalBrief: "1.4 cm stone impacted inside a posterior middle calyceal diverticulum with a pinhole 3.5 mm neck and tiny 5.0 mm lumen.",
    casePearl: "Zero margin for error! Because the diverticular neck is obliterated (3.5 mm), a guidewire will NOT pass into the renal pelvis—you must puncture dead-center into the 5 mm diverticular cavity (<5 mm error) using exact biplanar parallax so you can coil a wire inside the diverticulum itself.",
    pelvis: { x: 58, y: 0, z: 82 },
    calyces: {
      lower_lat: {
        label: "Normal Lower-Lateral Post.", x: 78, y: -14, z: 68, axialDeg: 30, coronalDeg: 24, neckW: 9.0, cupR: 7.5, reachPct: 40,
        calyxNote: "WRONG TARGET: Puncturing the normal lower calyx cannot reach the stone because the middle calyceal diverticulum has a stenotic 3.5 mm neck that blocks flexible/rigid scopes from inside!"
      },
      lower_med: {
        label: "Lower-Medial Post.", x: 68, y: -22, z: 72, axialDeg: 20, coronalDeg: 46, neckW: 6.0, cupR: 6.0, reachPct: 35,
        calyxNote: "WRONG TARGET: Cannot access the isolated middle-pole diverticulum."
      },
      middle: {
        label: "Posterior Calyceal Diverticulum (5mm Cup!)", x: 81, y: 9, z: 64, axialDeg: 28, coronalDeg: 6, neckW: 3.5, cupR: 5.0, reachPct: 99,
        calyxNote: "MANDATORY DIRECT TARGET: You must puncture directly into this 5.0 mm diverticular cup! Use 0° AP and +30° Ceph parallax carefully—even a 4 mm depth error will result in a dry tap."
      },
      upper: {
        label: "Upper-Pole Compound", x: 74, y: 30, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 10.0, cupR: 8.0, reachPct: 45, supracostal: true,
        calyxNote: "WRONG TARGET: Cannot retrograde-cannulate the stenotic middle diverticular neck."
      }
    },
    antCalyx: { x: 88, y: 8, z: 92 },
    rib12Y: 22, pleuraY: 38, stoneType: "calyceal_high", defaultCalyx: "middle"
  },
  {
    name: "Case 8: Emaciated Patient (4.8cm Shallow Depth) + Retrorenal Colon Trap",
    clinicalBrief: "BMI 17 thin female with minimal perinephric fat (papilla depth only 48 mm!) and a posterolaterally wrapped retrorenal colon.",
    casePearl: "In very thin patients with minimal retroperitoneal fat, the colon falls posteromedially behind the lateral kidney margin, and the kidney is only 4.8 cm deep! Do NOT use a wide 4–5 cm lateral skin offset—keep Point B medial (L = 1.6–2.2 cm) and use a steeper pitch (~22°) to avoid colon perforation and anterior overshoot.",
    pelvis: { x: 58, y: 0, z: 62 },
    calyces: {
      lower_lat: {
        label: "Shallow Lower-Lateral Post. (4.8cm Deep)", x: 78, y: -12, z: 48, axialDeg: 26, coronalDeg: 20, neckW: 9.5, cupR: 7.5, reachPct: 92,
        calyxNote: "SHALLOW 48 MM TARGET: Because Z is only 48 mm, the optimal lateral skin offset is much smaller (L = 2.2 cm, Tract = 53 mm). Entering >3.0 cm laterally risks hitting the retrorenal colon!"
      },
      lower_med: {
        label: "Lower-Medial Post.", x: 68, y: -20, z: 52, axialDeg: 18, coronalDeg: 44, neckW: 6.5, cupR: 6.5, reachPct: 66,
        calyxNote: "SAFE FROM COLON BUT STEEP NECK: Avoids the lateral colon, but the 44° coronal angle creates moderate torque."
      },
      middle: {
        label: "Middle Posterior (4.9cm Deep)", x: 77, y: 10, z: 49, axialDeg: 28, coronalDeg: 5, neckW: 9.0, cupR: 7.5, reachPct: 89,
        calyxNote: "EXCELLENT SHALLOW TARGET: 49 mm deep; advance slowly past the lumbodorsal fascia (28 mm) because the renal capsule is only 15 mm beyond the fascia!"
      },
      upper: {
        label: "Upper-Pole Compound", x: 73, y: 30, z: 47, axialDeg: 22, coronalDeg: -8, neckW: 10.5, cupR: 8.0, reachPct: 94, supracostal: true,
        calyxNote: "VERY SHALLOW SUPRACOSTAL (47 mm): High risk of overshooting anteriorly if pitch is not controlled."
      }
    },
    antCalyx: { x: 86, y: -10, z: 72 },
    rib12Y: 22, pleuraY: 38, stoneType: "pelvic_and_lower", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 9: Complete Bifid / Duplex Renal Pelvis (Moiety Isolation Trap)",
    clinicalBrief: "Duplex kidney with a bifid renal pelvis and calculi in both the central confluence and upper moiety.",
    casePearl: "In a bifid pelvis, the lower-pole infundibulum joins the ureter low at an acute hairpin angle—meaning a lower-pole puncture CANNOT reach the upper moiety (only 48% reach)! You must target the Middle Posterior calyx (aiming into the central bifid confluence) or the Upper-Pole calyx.",
    pelvis: { x: 56, y: 2, z: 84 },
    calyces: {
      lower_lat: {
        label: "Lower-Moiety Post. (Isolated!)", x: 80, y: -18, z: 69, axialDeg: 30, coronalDeg: 46, neckW: 6.5, cupR: 7.0, reachPct: 48,
        calyxNote: "BIFID MOIETY TRAP (48% REACH): Drains into the lower bifid limb at a 46° angle; a rigid scope cannot cross the narrow bifid carina into the upper moiety!"
      },
      lower_med: {
        label: "Lower-Medial Sub-Apical", x: 69, y: -25, z: 72, axialDeg: 20, coronalDeg: 55, neckW: 5.5, cupR: 6.0, reachPct: 40,
        calyxNote: "ISOLATED LOWER LIMB: Completely unable to reach the main pelvic confluence or upper pole."
      },
      middle: {
        label: "Middle Posterior (Central Confluence)", x: 79, y: 6, z: 67, axialDeg: 28, coronalDeg: 3, neckW: 10.0, cupR: 8.0, reachPct: 91,
        calyxNote: "PRIMARY SUBCOSTAL TARGET (91% REACH): Aims straight into the central bifid pelvic confluence at a 3° coronal angle, allowing access to both moieties without supracostal risk!"
      },
      upper: {
        label: "Upper-Moiety Compound (Supracostal)", x: 74, y: 30, z: 64, axialDeg: 22, coronalDeg: -8, neckW: 11.0, cupR: 8.5, reachPct: 95, supracostal: true,
        calyxNote: "SUPRACOSTAL STRAIGHT-LINE ACCESS: Enters the upper moiety and looks straight down the common UPJ (95% reach); use Exp Hold at the upper border of the 12th rib."
      }
    },
    antCalyx: { x: 88, y: 4, z: 94 },
    rib12Y: 22, pleuraY: 38, stoneType: "staghorn", defaultCalyx: "middle"
  },
  {
    name: "Case 10: Solitary Kidney + Narrow Infundibula (Zero-Torque Precision Test)",
    clinicalBrief: "Anatomically solitary right kidney with a 2.0 cm pelvic stone and narrow 6.5 mm calyceal necks—any infundibular tear or arterial injury risks anephric dialysis.",
    casePearl: "In a solitary kidney, safety and zero-torque coaxiality are paramount: (1) Never pivot the needle after crossing the lumbodorsal fascia, (2) Enter dead-center through the avascular papillary tip (<3 mm from center), and (3) Keep your dog-leg angle <12° so the sheath never torques the narrow 6.5 mm infundibular neck.",
    pelvis: { x: 59, y: 0, z: 85 },
    calyces: {
      lower_lat: {
        label: "Lower-Lateral Post. (6.5mm Narrow Neck)", x: 80, y: -11, z: 68, axialDeg: 30, coronalDeg: 20, neckW: 6.5, cupR: 6.5, reachPct: 90,
        calyxNote: "PRECISION TARGET: Because the infundibular neck is only 6.5 mm wide in this solitary kidney, your coronal aim (+20°) and pitch (30°) must be strictly coaxial (<12° dog-leg) to prevent neck laceration."
      },
      lower_med: {
        label: "Lower-Medial Post.", x: 69, y: -21, z: 72, axialDeg: 20, coronalDeg: 48, neckW: 5.0, cupR: 5.5, reachPct: 58,
        calyxNote: "HIGH HEMORRHAGE RISK: 5 mm neck and 48° angle carry unacceptable infundibular tear risk in a solitary kidney."
      },
      middle: {
        label: "Middle Posterior (6.5mm Neck)", x: 79, y: 10, z: 68, axialDeg: 28, coronalDeg: 4, neckW: 6.5, cupR: 6.5, reachPct: 88,
        calyxNote: "EXCELLENT COAXIAL ALTERNATIVE: Straight 4° coronal entry into the renal pelvis with minimal torque on the parenchyma."
      },
      upper: {
        label: "Upper-Pole Compound", x: 74, y: 31, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 8.5, cupR: 7.5, reachPct: 93, supracostal: true,
        calyxNote: "AVOID UNNECESSARY SUPRACOSTAL IN SOLITARY KIDNEY: Subcostal lower-lateral or middle calyx access is preferred to avoid pleural complications."
      }
    },
    antCalyx: { x: 88, y: -9, z: 95 },
    rib12Y: 22, pleuraY: 38, stoneType: "pelvic_and_lower", defaultCalyx: "lower_lat"
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
// === END OF FILE cases.js ===
