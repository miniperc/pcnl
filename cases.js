// ============================================================================
// FILE: cases.js — 10 DISTINCT PATHOLOGIES & PROFESSOR'S OR PLAYBOOKS
// ============================================================================
const CASES = [
  {
    name: "Case 1: Standard Pelvic + Lower-Pole Stone (Hydronephrotic)",
    clinicalBrief: "2.2 cm pelvic stone + 1.1 cm lower-pole stone in a hydronephrotic Brödel-type kidney.",
    casePearl: "Use the Hybrid Technique: lock Plane 1 on the 0° AP view along the +22° infundibular line, then swing to 30° Bull's Eye to dial in your 30° pitch.",
    profPlaybook: {
      trap: "Entering the Lower-Medial (sub-apical) calyx by mistake—its narrow 6.5mm neck and 48° angle cause high scope torque.",
      trick: "PROFESSOR'S TRICK — The 'Saline Ballooning' Sign: Click [Saline Distend] via the ureteral catheter before puncturing; distending the lower-lateral cup from 8mm to 10.2mm makes transpapillary entry effortless.",
      steps: [
        "1. Click [Resp] until locked in Insp Hold, and click [Saline Distend].",
        "2. At [0° AP], align Point B along the +22° lower-lateral infundibular axis (L=3.6cm, CC=-1.5cm).",
        "3. Rotate C-arm to [30° Bull's Eye], align the hub ring over the tip (Pitch ~30.5°), and punch through the fascia (30mm).",
        "4. Return to [0° AP], watch the calyceal cup dimple at ~72mm, pop into the lumen (79mm), and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 60, y: 0, z: 84 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post. (Primary)", x: 80, y: -12, z: 68, axialDeg: 30, coronalDeg: 22, neckW: 10, cupR: 8.0, reachPct: 92, calyxNote: "GOLD STANDARD: Wide 10mm neck and gentle +22° slope clear both pelvis and lower pole." },
      lower_med: { label: "Lower-Medial Sub-Apical", x: 69, y: -22, z: 71, axialDeg: 20, coronalDeg: 48, neckW: 6.5, cupR: 6.5, reachPct: 64, calyxNote: "TRAP: Steep 48° angle and narrow 6.5mm neck near paraspinal muscle." },
      middle:    { label: "Middle Posterior", x: 79, y: 11, z: 69, axialDeg: 28, coronalDeg: 4, neckW: 9.0, cupR: 7.5, reachPct: 88, calyxNote: "GOOD ALTERNATIVE: Straight 4° entry into pelvis, but tight angle to reach lower pole." },
      upper:     { label: "Upper-Pole Compound", x: 74, y: 32, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 11, cupR: 8.5, reachPct: 95, calyxNote: "UNNECESSARY SUPRACOSTAL: Subcostal lower-lateral access already clears 92%." }
    },
    antCalyx: { x: 88, y: -10, z: 95 },
    rib12Y: 22, pleuraY: 38, stoneType: "pelvic_and_lower", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 2: Complete Branched Staghorn (52° Steep Neck — Dog-Leg Trap)",
    clinicalBrief: "Complete radio-opaque staghorn cast filling the pelvis and calyceal infundibula; lower neck is steep (52°) and narrow (5.5mm).",
    casePearl: "Never use a 0° horizontal Bull's Eye on a 52° lower-pole staghorn—it creates a 52° roof-entry dog-leg where guidewires bounce off the impacted stone!",
    profPlaybook: {
      trap: "The 'Pure Bull's Eye Roof-Entry Trap': entering at CC=0cm / Coronal=0° hits the side wall of the 52° lower infundibulum at a sharp angle, making wire passage past the staghorn impossible.",
      trick: "PROFESSOR'S TRICK — Caudal-Offset Triangulation OR Upper-Pole Gateway: Either drop Point B far caudally (CC = -3.7cm) and aim +52° cephalad straight up the neck, OR switch target to the Upper-Pole Compound Calyx (96% reach straight down the staghorn axis!).",
      steps: [
        "1. Lock [Resp: Insp Hold] and click [Saline Distend] to open a fluid space around the impacted staghorn cast.",
        "2. At [0° AP], drop Point B caudally to L=2.9cm, CC=-3.7cm and set Coronal Aim to +52° (matching the steep neck!).",
        "3. Tilt C-arm to [30° Ceph] to see the needle elongated in profile and set Pitch to ~34.5°.",
        "4. Advance coaxially to 83mm into the papillary tip around the staghorn cast and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 58, y: 4, z: 86 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post. (52° Neck)", x: 82, y: -16, z: 68, axialDeg: 36, coronalDeg: 52, neckW: 5.5, cupR: 6.5, reachPct: 78, calyxNote: "DOG-LEG TRAP: Requires caudal Point B (CC=-3.7cm) and +52° cephalad aim!" },
      lower_med: { label: "Lower-Medial Sub-Apical", x: 68, y: -24, z: 72, axialDeg: 22, coronalDeg: 60, neckW: 5.0, cupR: 6.0, reachPct: 52, calyxNote: "CONTRAINDICATED: 60° kink and 5mm stenotic neck plugged by stone." },
      middle:    { label: "Middle Posterior", x: 78, y: 13, z: 70, axialDeg: 32, coronalDeg: 8, neckW: 8.0, cupR: 7.0, reachPct: 84, calyxNote: "SECONDARY TRACT: Debulks central pelvis only." },
      upper:     { label: "Upper-Pole Compound", x: 72, y: 35, z: 66, axialDeg: 24, coronalDeg: -8, neckW: 11.5, cupR: 8.5, reachPct: 96, calyxNote: "MASTER GATEWAY (96% REACH): Looks straight down the entire staghorn axis!" }
    },
    antCalyx: { x: 89, y: -12, z: 96 },
    rib12Y: 24, pleuraY: 40, stoneType: "staghorn", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 3: High Calyx Under 12th Rib (Subcostal Cephalad Triangulation)",
    clinicalBrief: "High-lying kidney where the target posterior papilla sits directly underneath the 12th rib at rest.",
    casePearl: "You cannot use a straight coaxial Bull's Eye when the 12th rib sits directly in the beam path—you must triangulate from below the rib!",
    profPlaybook: {
      trap: "Attempting a direct 30° Bull's Eye at CC=0cm strikes the 12th rib periosteum or lacerates the subcostal artery running in the inferior groove of the 12th rib.",
      trick: "PROFESSOR'S TRICK — Subcostal Cephalad Triangulation: Use Full Inspiration (Insp Hold) to push the calyx down 8mm, place Point B 2.0cm caudal to the rib (CC = -2.0cm), and angle +32° cephalad to slip underneath the 12th rib.",
      steps: [
        "1. Lock [Resp: Insp Hold] so the diaphragm pushes the kidney 8mm caudally below the 12th rib.",
        "2. Place Point B subcostally at L=3.1cm, CC=-2.0cm and lock Coronal Aim at +32.5° on the [0° AP] view.",
        "3. Click [30° Ceph] to elongate the needle in profile and adjust Pitch to ~28.5°.",
        "4. Advance to 77mm (skating safely below the 12th rib) into the papilla and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 60, y: 12, z: 84 },
    calyces: {
      lower_lat: { label: "High Post. Calyx (Under 12th Rib)", x: 80, y: 18, z: 68, axialDeg: 26, coronalDeg: 26, neckW: 9.0, cupR: 7.5, reachPct: 90, forceSubcostal: true, calyxNote: "TRIANGULATION TARGET: Sits under 12th rib; enter at CC=-2.0cm on Insp Hold and angle cephalad." },
      lower_med: { label: "Inferior Sub-Apical", x: 72, y: -8, z: 72, axialDeg: 18, coronalDeg: 42, neckW: 6.5, cupR: 6.5, reachPct: 68, calyxNote: "LOW REACH: Below the rib, but steep 42° neck limits scope access." },
      middle:    { label: "Middle Posterior (Rib-Shielded)", x: 80, y: 18, z: 68, axialDeg: 28, coronalDeg: 26, neckW: 9.0, cupR: 7.5, reachPct: 90, forceSubcostal: true, calyxNote: "RIB-SHIELDED: Requires subcostal cephalad triangulation." },
      upper:     { label: "Upper-Pole Compound", x: 74, y: 38, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 10.5, cupR: 8.0, reachPct: 92, supracostal: true, calyxNote: "SUPRACOSTAL: Requires 11-12 ICS entry on Exp Hold." }
    },
    antCalyx: { x: 88, y: 18, z: 93 },
    rib12Y: 18, pleuraY: 36, stoneType: "calyceal_high", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 4: Supracostal Upper-Pole Staghorn (11th–12th ICS Pleural Trap)",
    clinicalBrief: "Upper-pole compound staghorn extending down the renal pelvis into the UPJ/proximal ureter.",
    casePearl: "Always hug the SUPERIOR (upper) border of the 12th rib in Full Expiration—never the inferior border of the 11th rib where the subcostal artery and pleura sit!",
    profPlaybook: {
      trap: "Puncturing on Inspiration (which pulls the lung down into the costophrenic sulcus -> hydrothorax!) OR puncturing from below the 12th rib (which creates a 45° upward hairpin kink against the downward-draining upper infundibulum).",
      trick: "PROFESSOR'S TRICK — 'Skate the Top Edge of the 12th Rib in Expiration': Lock [Exp Hold] so the lung retracts cephalad, and place Point B right on the upper border of the 12th rib (L=2.8cm, CC=-0.1cm) aiming -2° to -8° caudally straight down the ureter!",
      steps: [
        "1. Lock [Resp: Exp Hold] (CRITICAL: retracts the parietal/visceral pleura above the lower 11-12 ICS).",
        "2. Click [2. Snap Optimal Point B] (or set L=2.8cm, CC=-0.1cm, Coronal=2°) to sit directly on the upper border of the 12th rib.",
        "3. Rotate to [30° Bull's Eye] (+24° Axial), set Pitch to ~23.5°, and skate over the top edge of the 12th rib.",
        "4. Advance to 70mm into the upper compound papilla (98% reach down the ureter!) and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 58, y: 2, z: 82 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post.", x: 80, y: -14, z: 69, axialDeg: 28, coronalDeg: 38, neckW: 7.0, cupR: 7.0, reachPct: 62, calyxNote: "POOR REACH (62%): Cannot reach the upper compound calyces or UPJ extension." },
      lower_med: { label: "Lower-Medial Post.", x: 70, y: -22, z: 72, axialDeg: 20, coronalDeg: 50, neckW: 6.0, cupR: 6.0, reachPct: 50, calyxNote: "WRONG POLE: Narrow neck far from upper staghorn." },
      middle:    { label: "Middle Posterior", x: 78, y: 10, z: 68, axialDeg: 26, coronalDeg: 6, neckW: 8.5, cupR: 7.5, reachPct: 76, calyxNote: "PARTIAL REACH: Clears pelvis but misses upper calyceal branches." },
      upper:     { label: "Upper-Pole Compound (11-12 ICS)", x: 74, y: 24, z: 64, axialDeg: 24, coronalDeg: -8, neckW: 11.5, cupR: 8.5, reachPct: 98, supracostal: true, calyxNote: "GOLD STANDARD (98% REACH): Straight-line coaxial access down upper pole, pelvis, and UPJ!" }
    },
    antCalyx: { x: 84, y: -8, z: 92 },
    rib12Y: 18, pleuraY: 35, stoneType: "upper_staghorn", defaultCalyx: "upper"
  },
  {
    name: "Case 5: Morbid Obesity (10.4cm Depth) + Ant/Post Calyx Overlap",
    clinicalBrief: "BMI 44 patient (104 mm calyceal depth!) where the anterior (128 mm) and posterior (104 mm) lower calyces overlap on 0° AP.",
    casePearl: "In a prone patient, heavy iodinated contrast sinks to the ANTERIOR calyces, while injected AIR floats up to the POSTERIOR calyces!",
    profPlaybook: {
      trap: "Mistaking the dark, contrast-filled anterior calyx (128mm deep) for the posterior calyx on 0° AP—AND pivoting the needle deep in the 10cm fat pannus, which bows the thin 18G shaft.",
      trick: "PROFESSOR'S TRICK — The '5mL Air-Pyelogram' & 40° Lateral Eye: Click [5mL Air Bolus]! Because the patient is prone, the bright air bubble rises into the POSTERIOR calyx only. Then rotate the C-arm to +40° Axial to separate the posterior cup from the anterior calyx!",
      steps: [
        "1. Click [5mL Air Bolus] to float a bright air bubble into the true posterior calyx, and lock [Resp: Insp Hold].",
        "2. Rotate C-arm to +40° Axial (notice the green ◎ CALYX END-ON PROFILE badge at 40° in this obese patient!).",
        "3. Set Point B at L=8.0cm, CC=-3.2cm, Coronal=+22°, and Pitch=39.5° (or click Snap Optimal Point B).",
        "4. Advance straight to 135mm without deep pivoting (if redirecting, retract <24mm first!) and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 60, y: 0, z: 120 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post. (10.4cm Deep)", x: 80, y: -10, z: 104, axialDeg: 40, coronalDeg: 22, neckW: 9.0, cupR: 8.0, reachPct: 88, calyxNote: "DEEP 104MM TARGET: Use [5mL Air Bolus] + 40° Axial C-arm rotation to separate from anterior calyx." },
      lower_med: { label: "Lower-Medial Post.", x: 70, y: -20, z: 107, axialDeg: 24, coronalDeg: 45, neckW: 6.5, cupR: 6.5, reachPct: 60, calyxNote: "107MM DEEP + 45° KINK: High risk of sheath kinking in thick pannus." },
      middle:    { label: "Middle Posterior", x: 78, y: 14, z: 105, axialDeg: 34, coronalDeg: 5, neckW: 8.5, cupR: 7.5, reachPct: 85, calyxNote: "GOOD ALTERNATIVE: 34° axial profile, 105mm depth." },
      upper:     { label: "Upper-Pole Compound", x: 72, y: 32, z: 102, axialDeg: 24, coronalDeg: -8, neckW: 10.5, cupR: 8.0, reachPct: 92, supracostal: true, calyxNote: "HIGH PLEURAL RISK IN OBESITY: Prefer subcostal access in BMI >40." }
    },
    antCalyx: { x: 83, y: -9, z: 128 },
    rib12Y: 22, pleuraY: 38, stoneType: "pelvic_and_lower", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 6: Horseshoe / Malrotated Kidney (Posteromedial Calyces)",
    clinicalBrief: "Horseshoe kidney with midline isthmus; failed rotation leaves the pelvis anterior and calyces pointing posteromedially (12°–18° axial).",
    casePearl: "Never puncture the lower pole of a horseshoe kidney—it is fused to the midline isthmus over the great vessels! The Upper Posterolateral Calyx is SUBCOSTAL, superficial (62mm), and gives 97% reach!",
    profPlaybook: {
      trap: "Targeting the lower pole (which sits deep at 74–78mm and medially at x=56–62mm next to the spine/erector spinae) or using a standard 35° lateral puncture (which misses the 18° posteromedial calyx).",
      trick: "PROFESSOR'S TRICK — The Subcostal Upper-Pole Horseshoe Gateway: Because the isthmus tethers the kidney caudally during embryology, the Upper-Pole Calyx sits BELOW the 12th rib (Subcostal!) and only 62mm deep! Use a steep, medial 18° pitch on Insp Hold.",
      steps: [
        "1. Select Target: Upper Posterolateral (Subcostal!) and lock [Resp: Insp Hold].",
        "2. Because the kidney is malrotated (18° axial), keep Point B medial: L=2.0cm, CC=+0.3cm, Coronal=-8°.",
        "3. Use a steep Pitch of ~18.0° (check +18° Axial C-arm view for the end-on Bull's Eye!).",
        "4. Advance only 65mm (superficial upper pole!) into the papilla and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 52, y: -6, z: 92 },
    calyces: {
      lower_lat: { label: "Lower Isthmus Calyx (Medial Trap)", x: 62, y: -22, z: 74, axialDeg: 16, coronalDeg: 40, neckW: 7.0, cupR: 6.5, reachPct: 65, calyxNote: "ISTHMUS TRAP: Tethered medially over the great vessels with poor pelvic reach." },
      lower_med: { label: "Deep Isthmus Calyx", x: 56, y: -26, z: 78, axialDeg: 12, coronalDeg: 52, neckW: 6.0, cupR: 6.0, reachPct: 55, calyxNote: "DANGEROUSLY MEDIAL: Sits at x=56mm in the paraspinal zone." },
      middle:    { label: "Middle Posteromedial Calyx", x: 68, y: 0, z: 66, axialDeg: 14, coronalDeg: 12, neckW: 9.0, cupR: 7.5, reachPct: 88, calyxNote: "ACCEPTABLE: Requires steep 14° posteromedial trajectory." },
      upper:     { label: "Upper Posterolateral (Subcostal!)", x: 70, y: 16, z: 62, axialDeg: 18, coronalDeg: -8, neckW: 11.5, cupR: 8.5, reachPct: 97, supracostal: false, calyxNote: "GOLD STANDARD IN HORSESHOE: Subcostal, superficial (62mm), and 97% reach!" }
    },
    antCalyx: { x: 78, y: -8, z: 96 },
    rib12Y: 28, pleuraY: 42, stoneType: "horseshoe", defaultCalyx: "upper"
  },
  {
    name: "Case 7: Calyceal Diverticulum (Obliterated Neck — Stone-Guided Puncture)",
    clinicalBrief: "1.4 cm stone inside a middle posterior calyceal diverticulum with a completely obliterated neck—retrograde contrast CANNOT enter the diverticulum!",
    casePearl: "Notice on the C-arm that the middle diverticular calyx has NO contrast—only the radio-opaque stone is visible! You must aim directly at the stone (or use Tab 3: Ultrasound) and inject contrast ANTEGRADE once inside!",
    profPlaybook: {
      trap: "Waiting for retrograde pyelogram contrast or air to fill the diverticulum (it never will because the neck is sealed!), or missing the tiny 5.0mm cavity by >4mm.",
      trick: "PROFESSOR'S TRICK — Direct Stone-Guided Puncture & Antegrade Opacification: Aim directly at the isolated stone on 0° AP and 30° Ceph (or Tab 3: B-Mode Ultrasound). Once your tip hits the stone at 71mm, click [Inject Contrast] to opacify the diverticulum directly through your needle!",
      steps: [
        "1. Observe the C-arm: the middle diverticulum shows a solitary stone with NO retrograde contrast cup.",
        "2. Lock [Resp: Insp Hold], set Point B at L=3.4cm, CC=+0.1cm, and aim Coronal=-1.5° straight at the stone on [0° AP].",
        "3. Switch to [30° Ceph] (or Tab 3: B-Mode Ultrasound), set Pitch to ~28.0°, and advance to 72mm until you hit the stone.",
        "4. Click [Inject Contrast] to watch the diverticulum light up antegrade, then click [Pull Stylet]!"
      ]
    },
    pelvis: { x: 58, y: 0, z: 82 },
    calyces: {
      lower_lat: { label: "Normal Lower-Lateral Post.", x: 78, y: -14, z: 68, axialDeg: 30, coronalDeg: 24, neckW: 9.0, cupR: 7.5, reachPct: 40, calyxNote: "WRONG TARGET: Cannot reach the stone because the middle diverticular neck is sealed shut!" },
      lower_med: { label: "Lower-Medial Post.", x: 68, y: -22, z: 72, axialDeg: 20, coronalDeg: 46, neckW: 6.0, cupR: 6.0, reachPct: 35, calyxNote: "WRONG TARGET: No access to the middle diverticulum." },
      middle:    { label: "Calyceal Diverticulum (Stone-Only!)", x: 81, y: 9, z: 64, axialDeg: 28, coronalDeg: -1.5, neckW: 2.0, cupR: 5.0, reachPct: 99, isDiverticulum: true, calyxNote: "DIRECT STONE TARGET (5mm Cup): Unopacified on retrograde pyelogram! Aim directly at the stone and click [Inject Contrast] once inside." },
      upper:     { label: "Upper-Pole Compound", x: 74, y: 30, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 10.0, cupR: 8.0, reachPct: 45, supracostal: true, calyxNote: "WRONG TARGET: Cannot cross the obliterated diverticular neck." }
    },
    antCalyx: { x: 88, y: 8, z: 92 },
    rib12Y: 22, pleuraY: 38, stoneType: "diverticulum", defaultCalyx: "middle"
  },
  {
    name: "Case 8: Emaciated Patient (4.8cm Shallow Depth) + Retrorenal Colon Trap",
    clinicalBrief: "BMI 17 patient with minimal retroperitoneal fat (papilla is only 48mm deep!) and a retrorenal colon wrapped behind the lateral flank (x > 102mm).",
    casePearl: "Look at the Prone Flank Map and Tab 1 (Axial Anatomy): the red Colon hazard zone encroaches medially to x = 102mm! A standard L=4.0cm skin offset will perforate the colon!",
    profPlaybook: {
      trap: "Using a standard 4cm lateral skin offset (which goes straight through the retrorenal colon!) or advancing to 75mm depth out of habit (which skewers the anterior renal wall at 48mm depth!).",
      trick: "PROFESSOR'S TRICK — Steep Medial-Window Puncture: Check Tab 1 (Axial Anatomy) to see the encroaching colon. Keep Point B medial (L = 2.2cm, inside the safe window), use a steeper 25° pitch, and stop at 53mm!",
      steps: [
        "1. Check Tab 1 (Axial Anatomy) & the Flank Map: notice the red Retrorenal Colon encroaching to x=102mm!",
        "2. Lock [Resp: Insp Hold] and keep Point B medial at L=2.2cm, CC=-0.9cm (Coronal=+22.5°).",
        "3. Set Pitch to ~26.5° on [30° Ceph] and advance slowly—the fascia pops at 29mm and the papilla is only at 54mm!",
        "4. Stop at 54mm inside the shallow papilla and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 58, y: 0, z: 62 },
    calyces: {
      lower_lat: { label: "Shallow Lower-Lateral (48mm Deep)", x: 78, y: -12, z: 48, axialDeg: 26, coronalDeg: 22.5, neckW: 9.5, cupR: 7.5, reachPct: 92, calyxNote: "SHALLOW 48MM TARGET: Keep L <= 2.4cm (medial to retrorenal colon!) and stop at 54mm depth." },
      lower_med: { label: "Lower-Medial Post.", x: 68, y: -20, z: 52, axialDeg: 18, coronalDeg: 44, neckW: 6.5, cupR: 6.5, reachPct: 66, calyxNote: "SAFE FROM COLON BUT STEEP 44° NECK." },
      middle:    { label: "Middle Posterior (49mm Deep)", x: 77, y: 10, z: 49, axialDeg: 28, coronalDeg: 5, neckW: 9.0, cupR: 7.5, reachPct: 89, calyxNote: "SHALLOW ALTERNATIVE: Keep L <= 2.5cm to clear the lateral colon." },
      upper:     { label: "Upper-Pole Compound", x: 73, y: 30, z: 47, axialDeg: 22, coronalDeg: -8, neckW: 10.5, cupR: 8.0, reachPct: 94, supracostal: true, calyxNote: "VERY SHALLOW (47mm): Unnecessary supracostal risk." }
    },
    antCalyx: { x: 86, y: -10, z: 72 },
    rib12Y: 22, pleuraY: 38, stoneType: "retrorenal_colon", defaultCalyx: "lower_lat"
  },
  {
    name: "Case 9: Complete Bifid / Duplex Renal Pelvis (Moiety Isolation Trap)",
    clinicalBrief: "Duplex kidney with a Y-shaped bifid pelvis split into upper and lower moieties with stones in the central confluence and upper pelvis.",
    casePearl: "Look at the Y-shaped bifid pelvis on the C-arm: puncturing the lower pole traps you in the lower moiety (48% reach) because a rigid scope cannot make the U-turn across the bifid carina!",
    profPlaybook: {
      trap: "Habitually choosing the lower-pole calyx—in a bifid system, the lower infundibulum joins the ureter below the pelvic carina at a 46° angle, isolating you from the upper moiety.",
      trick: "PROFESSOR'S TRICK — The Central Confluence Middle-Calyx Shot: Target the Middle Posterior Calyx (Coronal +4°), which aims straight into the Y-junction confluence of both moieties (91% reach) while staying 100% subcostal!",
      steps: [
        "1. Select Target: Middle Posterior (Central Confluence) and lock [Resp: Insp Hold].",
        "2. At [0° AP], place Point B at L=3.6cm, CC=-0.3cm with a nearly horizontal Coronal Aim of +4.5°.",
        "3. Rotate to [30° Bull's Eye] (+28° Axial), set Pitch to ~28.0°, and advance to 76mm.",
        "4. Pop into the middle papilla aiming straight into the bifid confluence and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 56, y: 2, z: 84 },
    calyces: {
      lower_lat: { label: "Lower-Moiety Post. (Isolated!)", x: 80, y: -18, z: 69, axialDeg: 30, coronalDeg: 46, neckW: 6.5, cupR: 7.0, reachPct: 48, calyxNote: "BIFID TRAP (48% REACH): Isolated in lower moiety; cannot cross the bifid carina into the upper pelvis!" },
      lower_med: { label: "Lower-Medial Sub-Apical", x: 69, y: -25, z: 72, axialDeg: 20, coronalDeg: 55, neckW: 5.5, cupR: 6.0, reachPct: 40, calyxNote: "ISOLATED LOWER LIMB (40% REACH)." },
      middle:    { label: "Middle Posterior (Central Confluence)", x: 79, y: 6, z: 67, axialDeg: 28, coronalDeg: 4.5, neckW: 10.0, cupR: 8.0, reachPct: 91, calyxNote: "GOLD STANDARD FOR BIFID PELVIS (91% REACH): Aims straight into the Y-confluence of both moieties!" },
      upper:     { label: "Upper-Moiety Compound", x: 74, y: 30, z: 64, axialDeg: 22, coronalDeg: -8, neckW: 11.0, cupR: 8.5, reachPct: 95, supracostal: true, calyxNote: "SUPRACOSTAL OPTION: Reaches upper moiety and common UPJ." }
    },
    antCalyx: { x: 88, y: 4, z: 94 },
    rib12Y: 22, pleuraY: 38, stoneType: "bifid", defaultCalyx: "middle"
  },
  {
    name: "Case 10: Solitary Hypermobile 'Floating' Kidney (Zero-Torque & Tenting Trap)",
    clinicalBrief: "Anatomically solitary kidney with loose perinephric fat (hypermobile—pushes away by 6mm when touched!) and narrow 6.0mm infundibular necks.",
    casePearl: "Watch the C-arm when your needle reaches 55mm: because this solitary kidney is hypermobile, it pushes away ('tents') from your needle unless you stiffen it with [Saline Distend]!",
    profPlaybook: {
      trap: "Advancing without [Saline Distend] (the hypermobile kidney slides medially away from the needle tip!), pivoting deep past 42mm (slicing the solitary kidney!), or having a >12° dog-leg.",
      trick: "PROFESSOR'S TRICK — Hydro-Stiffening & Zero-Torque Coaxial Lock: Click [Saline Distend] to turgidly pressurize the collecting system (reducing capsular tenting by 70%!), lock Insp Hold, and hit within 3mm of papillary center with <10° dog-leg.",
      steps: [
        "1. MUST click [Saline Distend] to stiffen the hypermobile kidney and lock [Resp: Insp Hold].",
        "2. At [0° AP], set Point B at L=3.4cm, CC=-1.2cm and lock Coronal Aim at +19.5° (matching the narrow 6mm neck).",
        "3. Check [30° Bull's Eye], set Pitch to ~28.0° (never pivot once deeper than 42mm!), and advance to 76mm.",
        "4. Pop cleanly through the center of the papilla (<3mm error) and click [Pull Stylet]."
      ]
    },
    pelvis: { x: 59, y: 0, z: 85 },
    calyces: {
      lower_lat: { label: "Lower-Lateral Post. (6mm Narrow Neck)", x: 80, y: -11, z: 68, axialDeg: 30, coronalDeg: 19.5, neckW: 6.0, cupR: 6.5, reachPct: 90, calyxNote: "SOLITARY KIDNEY TARGET: Click [Saline Distend] to stop kidney displacement and keep Dog-Leg <12°!" },
      lower_med: { label: "Lower-Medial Post.", x: 69, y: -21, z: 72, axialDeg: 20, coronalDeg: 48, neckW: 5.0, cupR: 5.5, reachPct: 58, calyxNote: "HIGH BLEED RISK: 48° torque in a solitary kidney." },
      middle:    { label: "Middle Posterior (6mm Neck)", x: 79, y: 10, z: 68, axialDeg: 28, coronalDeg: 4, neckW: 6.0, cupR: 6.5, reachPct: 88, calyxNote: "SAFE COAXIAL ALTERNATIVE: Requires [Saline Distend] to prevent kidney push-away." },
      upper:     { label: "Upper-Pole Compound", x: 74, y: 31, z: 65, axialDeg: 22, coronalDeg: -8, neckW: 8.5, cupR: 7.5, reachPct: 93, supracostal: true, calyxNote: "AVOID SUPRACOSTAL IN SOLITARY KIDNEY." }
    },
    antCalyx: { x: 88, y: -9, z: 95 },
    rib12Y: 22, pleuraY: 38, stoneType: "hypermobile", defaultCalyx: "lower_lat"
  }
];

const state = {
  caseIdx: 0, targetKey: 'lower_lat', coachMode: 'hybrid', stage: 1, workbench: 'anatomy',
  soundOn: true, lastPopZone: 'none', blindMode: false, blindRevealed: false,
  contFluoro: true, pedalDown: false, lihDirty: true, fluoroSec: 0,
  cArmAx: 0, cArmOb: 0, airBolus: false, hydro: false, respMode: 'insp', tidalPhase: 0,
  clampOn: true, pointAMarked: true, latCm: 4.0, ccCm: -1.6, corDeg: 22.0, pitchDeg: 32.0, depthMm: 0,
  blushClouds: [], styletPulled: false, terumoTorqueDeg: 180, wireAdvMm: 0, wireInPelvis: false,
  kumpeAdvanced: false, stiffWireExchanged: false, dilPitchDeg: 32.0, rodDepthMm: 0, sheathDepthMm: 0,
  wireKinked: false, scopeSweepDeg: 0, visited0AP: true, visited30Ax: false, visited30Ob: false,
  autoPlaying: false, autoSteps: [], autoStepIdx: 0, autoStepTimer: 0, autoSpeed: 1.0
};

let audioCtx = null;
function playTactilePop(type) {
  if (!state.soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'skin') { osc.frequency.setValueAtTime(240, now); osc.frequency.exponentialRampToValueAtTime(90, now + 0.045); gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045); osc.start(now); osc.stop(now + 0.05); }
    else if (type === 'fascia') { osc.type = 'triangle'; osc.frequency.setValueAtTime(170, now); osc.frequency.exponentialRampToValueAtTime(55, now + 0.075); gain.gain.setValueAtTime(0.35, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075); osc.start(now); osc.stop(now + 0.08); }
    else if (type === 'papilla') { osc.type = 'sine'; osc.frequency.setValueAtTime(320, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.09); gain.gain.setValueAtTime(0.30, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09); osc.start(now); osc.stop(now + 0.095); }
  } catch (e) {}
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  const b = document.getElementById('soundBtn');
  b.textContent = `Audio Pops: ${state.soundOn ? 'ON' : 'OFF'}`;
  b.classList.toggle('active', state.soundOn);
}
// === END OF FILE cases.js ===
