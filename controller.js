// ============================================================================
// PCNL 2-DEVICE WIRELESS 3D PHONE CONTROLLER & 1:1 PHYSICAL PUSH ENGINE
// Pairs Phone IMU (Gyro + ZUPT Accelerometer + 1:1 Stabilizer Push) to PC Screen
// ============================================================================
(function initWirelessControllerModule() {
  const urlParams = new URLSearchParams(window.location.search);
  const padCode = urlParams.get('pad');

  // Dynamically load PeerJS (WebRTC P2P Bridge - no backend server required)
  const peerScript = document.createElement('script');
  peerScript.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  peerScript.onload = () => {
    if (padCode) {
      bootPhoneControllerUI(padCode.trim());
    } else {
      bootPCHostBridge();
    }
  };
  document.head.appendChild(peerScript);

  // Shortest angle difference (-180 to +180) so crossing 0°/360° North never jumps
  function angleDiff(a, b) {
    return ((a - b + 540) % 360) - 180;
  }

  // ==========================================================================
  // MODE A: PC HOST BRIDGE (DISPLAYS QR CODE & RECEIVES 60FPS 3D NEEDLE DATA)
  // ==========================================================================
  function bootPCHostBridge() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;

    const pairBtn = document.createElement('button');
    pairBtn.id = 'pairPhoneBtn';
    pairBtn.style.borderColor = '#38bdf8';
    pairBtn.style.color = '#7dd3fc';
    pairBtn.style.fontWeight = '700';
    pairBtn.textContent = '📱 Pair Phone Needle';
    topBar.insertBefore(pairBtn, topBar.firstChild);

    // Keep room code across refreshes
    let roomCode = sessionStorage.getItem('pcnl_room_code');
    if (!roomCode) {
      roomCode = String(Math.floor(1000 + Math.random() * 9000));
      sessionStorage.setItem('pcnl_room_code', roomCode);
    }

    const peerId = 'pcnl-or-' + roomCode;
    let peer = null;
    let activeConn = null;
    let lastSentLayer = '';
    let lastSentPop = 'none';

    // Create Pairing Modal on PC
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(4,8,15,0.86);z-index:999;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    const baseUrl = window.location.origin + window.location.pathname;
    const phoneUrl = `${baseUrl}?pad=${roomCode}`;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(phoneUrl)}`;

    modal.innerHTML = `
      <div style="background:#0e1726;border:1px solid #38bdf8;border-radius:8px;padding:18px;max-width:430px;width:92%;text-align:center;box-shadow:0 12px 32px rgba(0,0,0,0.8);">
        <h3 style="color:#38bdf8;font-size:15px;margin-bottom:6px;">📱 2-DEVICE OR MODE: PHONE AS 18G NEEDLE</h3>
        <p style="color:#cbd5e1;font-size:11.5px;line-height:1.4;margin-bottom:12px;">
          Scan this QR code with your phone camera. Hold your phone in mid-air like the Chiba needle while looking up at this PC monitor!
        </p>
        <div style="background:#fff;padding:10px;border-radius:6px;display:inline-block;margin-bottom:10px;">
          <img src="${qrImgUrl}" alt="Scan QR Code" style="width:180px;height:180px;display:block;">
        </div>
        <div style="font-family:monospace;font-size:18px;font-weight:800;color:#fde047;margin-bottom:6px;">
          ROOM CODE: ${roomCode}
        </div>
        <div style="font-size:10.5px;color:#94a3b8;word-break:break-all;margin-bottom:12px;">
          ${phoneUrl}
        </div>
        <div id="pcPairStatus" style="font-size:11.5px;color:#fbbf24;font-weight:700;margin-bottom:12px;">
          Waiting for phone to connect...
        </div>
        <button id="closePairModal" style="background:#0284c7;color:#fff;border:1px solid #38bdf8;padding:7px 16px;border-radius:4px;font-weight:700;cursor:pointer;">
          Close Window
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    pairBtn.onclick = () => { modal.style.display = 'flex'; };
    document.getElementById('closePairModal').onclick = () => { modal.style.display = 'none'; };

    peer = new Peer(peerId);
    peer.on('connection', conn => {
      activeConn = conn;
      pairBtn.textContent = '📱 Phone Connected (Live 3D)';
      pairBtn.style.background = '#15803d';
      pairBtn.style.borderColor = '#22c55e';
      pairBtn.style.color = '#fff';
      const stEl = document.getElementById('pcPairStatus');
      if (stEl) {
        stEl.style.color = '#4ade80';
        stEl.textContent = '✓ Phone Connected! Close this window & aim with your phone.';
      }

      conn.on('data', msg => {
        if (msg.type === 'needle_update') {
          stopAutoSolve(false);
          if (typeof msg.pitchDeg === 'number') {
            state.pitchDeg = Math.max(10, Math.min(60, Math.round(msg.pitchDeg * 10) / 10));
          }
          if (typeof msg.corDeg === 'number') {
            state.corDeg = Math.max(-75, Math.min(75, Math.round(msg.corDeg * 10) / 10));
          }
          if (typeof msg.depthMm === 'number') {
            state.depthMm = Math.max(0, Math.min(135, Math.round(msg.depthMm * 2) / 2));
          }
          state.lihDirty = true;
          syncAllUI();
          updateDiagnosticsAndCoach();

          // Send Haptic Tissue Telemetry back to the Phone
          const d = computeDiagnostics();
          if (state.lastPopZone !== lastSentPop || d.layer !== lastSentLayer) {
            lastSentPop = state.lastPopZone;
            lastSentLayer = d.layer;
            conn.send({
              type: 'haptic_feedback',
              pop: state.lastPopZone,
              layer: d.layer,
              force: d.resistanceN,
              inTarget: d.inTarget,
              ribHit: d.ribHit,
              dogLeg: d.dogLegDeg
            });
          }
        } else if (msg.type === 'cmd') {
          if (msg.action === 'pedal_down') startPedal();
          else if (msg.action === 'pedal_up') stopPedal();
          else if (msg.action === 'stylet') pullStylet();
          else if (msg.action === 'contrast') injectNeedleContrast();
          else if (msg.action === 'carm_0') setCArm(0, 0);
          else if (msg.action === 'carm_30ax') setCArm(30, 0);
          else if (msg.action === 'carm_30ob') setCArm(0, 30);
        }
      });

      conn.on('close', () => {
        pairBtn.textContent = '📱 Pair Phone Needle';
        pairBtn.style.background = '';
      });
    });
  }

  // ==========================================================================
  // MODE B: PHONE HANDHELD 3D CHIBA NEEDLE CONTROLLER UI
  // ==========================================================================
  function bootPhoneControllerUI(code) {
    // Replace desktop workspace with dedicated full-screen dark surgical controller
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100vh;width:100vw;background:#050811;color:#f1f5f9;font-family:sans-serif;overflow:hidden;touch-action:none;user-select:none;">
        <!-- Top Telemetry Bar -->
        <div style="padding:8px 12px;background:#0a101d;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:800;font-size:13px;color:#38bdf8;">CHIBA 18G 3D CONTROLLER</div>
            <div id="phoneConnStatus" style="font-size:10.5px;color:#fbbf24;">Connecting to PC Room ${code}...</div>
          </div>
          <button id="enableSensorsBtn" style="background:#15803d;color:#fff;border:1px solid #22c55e;padding:6px 10px;border-radius:5px;font-weight:800;font-size:11px;">
            1. TAP TO START 3D SENSORS
          </button>
        </div>

        <!-- Live Angle & Tissue Haptic Readout -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:8px;background:#080d18;border-bottom:1px solid #1e293b;text-align:center;">
          <div style="background:#0f172a;padding:6px;border-radius:5px;border:1px solid #1e293b;">
            <div style="font-size:9.5px;color:#94a3b8;">NEEDLE PITCH</div>
            <div id="pPitchVal" style="font-size:18px;font-weight:800;color:#38bdf8;font-family:monospace;">30.0°</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:5px;border:1px solid #1e293b;">
            <div style="font-size:9.5px;color:#94a3b8;">CORONAL AIM</div>
            <div id="pCorVal" style="font-size:18px;font-weight:800;color:#4ade80;font-family:monospace;">22.0°</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:5px;border:1px solid #1e293b;">
            <div style="font-size:9.5px;color:#94a3b8;">DEPTH (1:1 MM)</div>
            <div id="pDepthVal" style="font-size:18px;font-weight:800;color:#fde047;font-family:monospace;">0 mm</div>
          </div>
        </div>

        <div id="pTissueBanner" style="padding:5px 10px;background:#111a2e;color:#7dd3fc;font-size:11px;font-weight:700;text-align:center;border-bottom:1px solid #1e293b;">
          HAPTIC LAYER: 0mm On Skin Surface
        </div>

        <!-- Main Body: Left = Controls, Right = 1:1 Physical Stabilizer Push Track -->
        <div style="flex:1;display:grid;grid-template-columns:1.15fr 1fr;min-height:0;">
          <!-- Left Column: Calibration, C-Arm Remote & ZUPT Toggle -->
          <div style="padding:10px;display:flex;flex-direction:column;gap:8px;border-right:1px solid #1e293b;overflow-y:auto;">
            <button id="calZeroBtn" style="background:#0284c7;color:#fff;border:1px solid #38bdf8;padding:12px 8px;border-radius:6px;font-weight:800;font-size:12px;">
              🎯 ZERO / CALIBRATE HAND ANGLE HERE
            </button>

            <button id="clutchBtn" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;padding:10px 8px;border-radius:6px;font-weight:700;font-size:11.5px;">
              🔓 3D Gyro Tracking: LIVE (Tap to Freeze Angle)
            </button>

            <button id="pushModeBtn" style="background:#172234;color:#cbd5e1;border:1px solid #334155;padding:8px;border-radius:6px;font-size:10.5px;font-weight:700;">
              Push Mode: 1:1 Two-Handed Stabilizer
            </button>

            <button id="invertPushBtn" style="background:#172234;color:#94a3b8;border:1px solid #334155;padding:6px;border-radius:6px;font-size:10px;">
              ⇄ Invert Push Direction
            </button>

            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-top:2px;">OR Foot Pedal &amp; C-Arm</div>
            <button id="pPedalBtn" style="background:#b45309;color:#fff;border:1px solid #f59e0b;padding:14px 8px;border-radius:6px;font-weight:800;font-size:13px;">
              ☢ HOLD FLUORO PEDAL
            </button>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
              <button id="c0Btn" style="padding:8px 4px;font-size:10.5px;font-weight:700;">0° AP</button>
              <button id="c30AxBtn" style="padding:8px 4px;font-size:10.5px;font-weight:700;">30° Eye</button>
              <button id="c30ObBtn" style="padding:8px 4px;font-size:10.5px;font-weight:700;">30° Ceph</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:auto;">
              <button id="pStyletBtn" style="background:#1d4ed8;color:#fff;padding:10px 4px;border-radius:5px;font-weight:700;font-size:11px;">Pull Stylet</button>
              <button id="pContrastBtn" style="background:#0f766e;color:#fff;padding:10px 4px;border-radius:5px;font-weight:700;font-size:11px;">Contrast</button>
            </div>
            <button id="retractZeroBtn" style="background:#334155;color:#e2e8f0;padding:7px;border-radius:5px;font-size:10.5px;">
              Retract Needle to 0mm (Skin)
            </button>
          </div>

          <!-- Right Column: 1:1 Physical Millimeter Stabilizer Track -->
          <div id="stabilizerTrack" style="position:relative;background:linear-gradient(180deg,#091326 0%,#0f1f3d 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
            <div style="position:absolute;top:10px;left:8px;right:8px;text-align:center;font-size:10px;color:#7dd3fc;font-weight:700;pointer-events:none;line-height:1.3;">
              LEFT FINGER = SKIN ANCHOR<br>
              <span style="color:#cbd5e1;font-weight:400;">Hold left finger still on ruler &amp; physically push phone forward!</span>
            </div>
            <canvas id="rulerCanvas" style="width:100%;height:100%;display:block;"></canvas>
          </div>
        </div>
      </div>
    `;

    let conn = null;
    const peer = new Peer();
    peer.on('open', () => {
      conn = peer.connect('pcnl-or-' + code, { reliable: true });
      conn.on('open', () => {
        const st = document.getElementById('phoneConnStatus');
        st.textContent = '✓ Paired Live to PC C-Arm Monitor!';
        st.style.color = '#4ade80';
      });
      conn.on('data', msg => {
        if (msg.type === 'haptic_feedback') {
          const banner = document.getElementById('pTissueBanner');
          banner.textContent = `${msg.layer} (${msg.force.toFixed(1)} N)`;
          if (msg.pop === 'skin') {
            if (navigator.vibrate) navigator.vibrate(35);
          } else if (msg.pop === 'fascia') {
            if (navigator.vibrate) navigator.vibrate([75, 30, 75]);
            banner.style.background = '#7c2d12';
          } else if (msg.pop === 'papilla') {
            if (navigator.vibrate) navigator.vibrate([120]);
            banner.style.background = '#14532d';
          } else if (msg.ribHit) {
            if (navigator.vibrate) navigator.vibrate([180, 40, 180]);
            banner.style.background = '#7f1d1d';
          } else {
            banner.style.background = '#111a2e';
          }
        }
      });
    });

    // Controller State
    let rawAlpha = 0, rawBeta = 0, rawGamma = 0;
    let calAlpha = 0, calBeta = 45, calGamma = 0;
    let basePitch = 30.0, baseCor = 22.0;
    let smoothPitch = 30.0, smoothCor = 22.0;
    let curDepthMm = 0;
    let gyroFrozen = false;
    let pushMode = 'stabilizer'; // 'stabilizer' or 'zupt'
    let invertPush = false;

    function sendNeedleUpdate() {
      document.getElementById('pPitchVal').textContent = smoothPitch.toFixed(1) + '°';
      document.getElementById('pCorVal').textContent = smoothCor.toFixed(1) + '°';
      document.getElementById('pDepthVal').textContent = Math.round(curDepthMm) + ' mm';
      drawRuler();
      if (conn && conn.open) {
        conn.send({
          type: 'needle_update',
          pitchDeg: smoothPitch,
          corDeg: smoothCor,
          depthMm: curDepthMm
        });
      }
    }

    function handleOrientation(e) {
      if (e.alpha === null) return;
      rawAlpha = e.alpha;
      rawBeta = e.beta;
      rawGamma = e.gamma;
      if (gyroFrozen) return;

      // Relative 3D wrist angle from calibrated hand posture
      const dBeta = rawBeta - calBeta;
      const dAlpha = angleDiff(rawAlpha, calAlpha);
      const targetPitch = Math.max(10, Math.min(60, basePitch + dBeta * 0.85));
      const targetCor = Math.max(-75, Math.min(75, baseCor - dAlpha * 0.85));

      // EMA smoothing filter (eliminates sensor jitter while preserving hand tremor)
      smoothPitch = smoothPitch * 0.75 + targetPitch * 0.25;
      smoothCor = smoothCor * 0.75 + targetCor * 0.25;
      sendNeedleUpdate();
    }

    // ZUPT Impulse Accelerometer Mode (for optional micro-thrust advancement)
    let lastThrustTime = 0;
    function handleMotion(e) {
      if (pushMode !== 'zupt' || !e.acceleration) return;
      const now = performance.now();
      if (now - lastThrustTime < 220) return; // ZUPT cooldown gate prevents drift
      const ay = e.acceleration.y || 0;
      if (Math.abs(ay) > 1.85) {
        const step = Math.sign(ay) * (invertPush ? -1 : 1) * Math.min(6, Math.round(Math.abs(ay) * 1.4));
        curDepthMm = Math.max(0, Math.min(135, curDepthMm + step));
        lastThrustTime = now;
        if (navigator.vibrate) navigator.vibrate(15);
        sendNeedleUpdate();
      }
    }

    // iOS 13+ & Android Sensor Permission Trigger
    document.getElementById('enableSensorsBtn').onclick = async function () {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          await DeviceOrientationEvent.requestPermission();
        }
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
          await DeviceMotionEvent.requestPermission();
        }
      } catch (err) {}
      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('devicemotion', handleMotion);
      this.textContent = '✓ 3D GYRO ACTIVE';
      this.style.background = '#0284c7';
      calAlpha = rawAlpha; calBeta = rawBeta; calGamma = rawGamma;
    };

    // Calibrate / Zero Hand Angle
    document.getElementById('calZeroBtn').onclick = () => {
      calAlpha = rawAlpha;
      calBeta = rawBeta;
      calGamma = rawGamma;
      basePitch = 30.0;
      baseCor = 22.0;
      smoothPitch = 30.0;
      smoothCor = 22.0;
      if (navigator.vibrate) navigator.vibrate(40);
      sendNeedleUpdate();
    };

    document.getElementById('clutchBtn').onclick = function () {
      gyroFrozen = !gyroFrozen;
      if (!gyroFrozen) {
        calAlpha = rawAlpha; calBeta = rawBeta;
        basePitch = smoothPitch; baseCor = smoothCor;
      }
      this.textContent = gyroFrozen
        ? '🔒 3D Angle FROZEN (Tap to Unlock)'
        : '🔓 3D Gyro Tracking: LIVE (Tap to Freeze Angle)';
      this.style.background = gyroFrozen ? '#b45309' : '#1e293b';
    };

    document.getElementById('pushModeBtn').onclick = function () {
      pushMode = pushMode === 'stabilizer' ? 'zupt' : 'stabilizer';
      this.textContent = pushMode === 'stabilizer'
        ? 'Push Mode: 1:1 Two-Handed Stabilizer'
        : 'Push Mode: Accelerometer Micro-Thrusts + Touch';
    };

    document.getElementById('invertPushBtn').onclick = function () {
      invertPush = !invertPush;
      this.textContent = `⇄ Invert Push Direction (${invertPush ? 'Inverted' : 'Normal'})`;
    };

    // 1:1 Physical Millimeter Stabilizer Track (96 CSS px = 25.4 mm -> 3.78 px per mm)
    const track = document.getElementById('stabilizerTrack');
    const rCanvas = document.getElementById('rulerCanvas');
    let touchStartY = null;
    let startDepthMm = 0;
    const PX_PER_MM = 3.78;

    track.addEventListener('pointerdown', e => {
      touchStartY = e.clientY;
      startDepthMm = curDepthMm;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', e => {
      if (touchStartY === null) return;
      const dyPx = touchStartY - e.clientY; // When phone is pushed downward/forward past stationary finger, finger moves relatively upward
      const dirSign = invertPush ? -1 : 1;
      const deltaMm = (dyPx / PX_PER_MM) * dirSign;
      curDepthMm = Math.max(0, Math.min(135, startDepthMm + deltaMm));
      sendNeedleUpdate();
    });
    track.addEventListener('pointerup', () => { touchStartY = null; });
    track.addEventListener('pointercancel', () => { touchStartY = null; });

    function drawRuler() {
      const rect = rCanvas.getBoundingClientRect();
      if (rCanvas.width !== rect.width || rCanvas.height !== rect.height) {
        rCanvas.width = rect.width;
        rCanvas.height = rect.height;
      }
      const ctx = rCanvas.getContext('2d');
      const w = rCanvas.width, h = rCanvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw true-scale 1mm and 10mm ruler ticks that shift with curDepthMm
      const centerY = h * 0.55;
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px monospace';

      for (let mm = 0; mm <= 130; mm += 2) {
        const offsetPx = (mm - curDepthMm) * PX_PER_MM;
        const y = centerY - offsetPx;
        if (y < 45 || y > h - 10) continue;
        const isCm = mm % 10 === 0;
        ctx.beginPath();
        ctx.moveTo(w - (isCm ? 36 : 16), y);
        ctx.lineTo(w, y);
        ctx.lineWidth = isCm ? 2 : 1;
        ctx.stroke();
        if (isCm) ctx.fillText(`${mm}mm`, w - 76, y + 4);
      }

      // Stationary Skin Entry Reference Line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.fillText('▶ SKIN ANCHOR', 8, centerY - 6);
    }
    setTimeout(drawRuler, 100);

    // Remote Buttons
    const sendCmd = action => { if (conn && conn.open) conn.send({ type: 'cmd', action }); };
    const pPedal = document.getElementById('pPedalBtn');
    pPedal.addEventListener('pointerdown', e => { e.preventDefault(); sendCmd('pedal_down'); });
    pPedal.addEventListener('pointerup', () => sendCmd('pedal_up'));
    pPedal.addEventListener('pointercancel', () => sendCmd('pedal_up'));

    document.getElementById('c0Btn').onclick = () => sendCmd('carm_0');
    document.getElementById('c30AxBtn').onclick = () => sendCmd('carm_30ax');
    document.getElementById('c30ObBtn').onclick = () => sendCmd('carm_30ob');
    document.getElementById('pStyletBtn').onclick = () => sendCmd('stylet');
    document.getElementById('pContrastBtn').onclick = () => sendCmd('contrast');
    document.getElementById('retractZeroBtn').onclick = () => { curDepthMm = 0; sendNeedleUpdate(); };
  }
})();
