// ============================================================================
// PCNL 2-DEVICE WIRELESS 3D PHONE CONTROLLER v4.0
// Full-Width Gyro Button + 3-in-1 Physical Push Engine + Auto-Reconnect
// ============================================================================
(function initWirelessControllerModule() {
  const urlParams = new URLSearchParams(window.location.search);
  const padCode = urlParams.get('pad');

  function angleDiff(a, b) {
    return ((a - b + 540) % 360) - 180;
  }

  function getPhoneShaftVector3D(alphaDeg, betaDeg, gammaDeg) {
    const a = (alphaDeg || 0) * Math.PI / 180;
    const b = (betaDeg || 0) * Math.PI / 180;
    const g = (gammaDeg || 0) * Math.PI / 180;

    const cA = Math.cos(a), sA = Math.sin(a);
    const cB = Math.cos(b), sB = Math.sin(b);
    const cG = Math.cos(g), sG = Math.sin(g);

    const vx = -sA * cB;
    const vy = cA * cB;
    const vz = sB;

    const bx = -(cA * sG + sA * sB * cG);
    const by = -(sA * sG - cA * sB * cG);

    const horizLen = Math.hypot(vx, vy);
    const hx = horizLen > 0.15 ? vx : bx;
    const hy = horizLen > 0.15 ? vy : by;
    const headingDeg = (Math.atan2(hx, hy) * 180 / Math.PI + 360) % 360;

    const elevFromDeskDeg = Math.asin(Math.max(-1, Math.min(1, Math.abs(vz)))) * 180 / Math.PI;
    const pitchFromVerticalDeg = 90 - elevFromDeskDeg;

    return { headingDeg, pitchFromVerticalDeg };
  }

  const PEER_CDNS = [
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js',
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
  ];

  function loadPeerJS(idx, onReady, onFail) {
    if (window.Peer) { onReady(); return; }
    if (idx >= PEER_CDNS.length) { if (onFail) onFail(); return; }
    const s = document.createElement('script');
    s.src = PEER_CDNS[idx];
    s.onload = () => { if (window.Peer) onReady(); else loadPeerJS(idx + 1, onReady, onFail); };
    s.onerror = () => loadPeerJS(idx + 1, onReady, onFail);
    document.head.appendChild(s);
  }

  if (padCode) {
    bootPhoneControllerUI(padCode.trim());
  } else {
    bootPCHostBridge();
    // If opened on a mobile phone without ?pad=XXXX, show a quick-switch banner
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      const mobBanner = document.createElement('div');
      mobBanner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#15803d;color:#fff;padding:10px;text-align:center;z-index:9999;font-weight:800;font-size:13px;cursor:pointer;';
      mobBanner.textContent = '📱 ON A PHONE? TAP HERE TO OPEN 3D NEEDLE CONTROLLER';
      mobBanner.onclick = () => {
        const code = prompt('Enter the 4-digit Room Code shown on your PC:', '');
        if (code) window.location.search = '?pad=' + code.trim();
      };
      document.body.appendChild(mobBanner);
    }
  }

  // ==========================================================================
  // MODE A: PC HOST BRIDGE
  // ==========================================================================
  function bootPCHostBridge() {
    let roomCode = sessionStorage.getItem('pcnl_room_code');
    if (!roomCode) {
      roomCode = String(Math.floor(1000 + Math.random() * 9000));
      sessionStorage.setItem('pcnl_room_code', roomCode);
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const phoneUrl = `${baseUrl}?pad=${roomCode}`;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(phoneUrl)}`;

    const qrEl = document.getElementById('phoneQrImg');
    const codeEl = document.getElementById('phoneRoomCodeDisplay');
    const urlEl = document.getElementById('phoneUrlDisplay');
    const pairBtn = document.getElementById('pairPhoneBtn');

    if (qrEl) qrEl.src = qrImgUrl;
    if (codeEl) codeEl.textContent = 'ROOM CODE: ' + roomCode;
    if (urlEl) urlEl.textContent = phoneUrl;

    loadPeerJS(0, () => {
      const stEl = document.getElementById('pcPairStatus');
      let peer = null;
      let activeConn = null;
      let lastSentLayer = '';
      let lastSentPop = 'none';

      function initHostPeer() {
        if (peer && !peer.destroyed) {
          if (peer.disconnected) peer.reconnect();
          return;
        }
        peer = new Peer('pcnl-or-' + roomCode);

        peer.on('open', () => {
          if (stEl && (!activeConn || !activeConn.open)) {
            stEl.textContent = 'Ready! Scan QR code with your phone camera.';
          }
        });

        peer.on('disconnected', () => {
          if (peer && !peer.destroyed) peer.reconnect();
        });

        peer.on('connection', conn => {
          activeConn = conn;
          if (pairBtn) {
            pairBtn.textContent = '📱 Phone Connected (Live 3D)';
            pairBtn.style.background = '#15803d';
            pairBtn.style.borderColor = '#22c55e';
          }
          if (stEl) {
            stEl.style.color = '#4ade80';
            stEl.textContent = '✓ Phone Connected! Close this window & aim with your phone.';
          }

          conn.on('open', () => {
            conn.send({
              type: 'sync_from_pc',
              pitchDeg: state.pitchDeg,
              corDeg: state.corDeg,
              depthMm: state.depthMm
            });
          });

          conn.on('data', msg => {
            if (msg.type === 'ping') {
              conn.send({ type: 'pong' });
              return;
            }
            if (msg.type === 'needle_update') {
              stopAutoSolve(false);
              if (typeof msg.pitchDeg === 'number') {
                state.pitchDeg = Math.max(10, Math.min(60, Math.round(msg.pitchDeg * 10) / 10));
                if (state.stage === 3) state.dilPitchDeg = state.pitchDeg;
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
                  ribHit: d.ribHit
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
        });
      }

      initHostPeer();
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) initHostPeer();
      });
      window.addEventListener('focus', initHostPeer);
    });
  }

  // ==========================================================================
  // MODE B: PHONE HANDHELD 3D CHIBA NEEDLE CONTROLLER UI
  // ==========================================================================
  function bootPhoneControllerUI(code) {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100dvh;max-height:100vh;width:100vw;background:#050811;color:#f1f5f9;font-family:sans-serif;overflow:hidden;touch-action:none;user-select:none;box-sizing:border-box;">
        <!-- Unmissable Full-Width Gyro Activation Banner -->
        <button id="enableSensorsBtn" style="width:100%;background:#16a34a;color:#fff;border:none;border-bottom:2px solid #4ade80;padding:12px 10px;font-weight:900;font-size:14px;text-align:center;cursor:pointer;flex-shrink:0;">
          🟢 1. TAP HERE TO ENABLE 3D GYRO SENSORS
        </button>

        <div style="padding:4px 10px;background:#0a101d;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;flex-shrink:0;">
          <span id="phoneConnStatus" style="color:#fbbf24;font-weight:700;">Connecting to PC Room ${code}...</span>
          <span id="pTissueBanner" style="color:#7dd3fc;font-weight:700;">0mm: Skin Surface</span>
        </div>

        <!-- Live 3D Readout -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding:6px;background:#080d18;border-bottom:1px solid #1e293b;text-align:center;flex-shrink:0;">
          <div style="background:#0f172a;padding:4px;border-radius:4px;border:1px solid #1e293b;">
            <div style="font-size:9px;color:#94a3b8;">PITCH (10°=Vert)</div>
            <div id="pPitchVal" style="font-size:16px;font-weight:800;color:#38bdf8;font-family:monospace;">30.0°</div>
          </div>
          <div style="background:#0f172a;padding:4px;border-radius:4px;border:1px solid #1e293b;">
            <div style="font-size:9px;color:#94a3b8;">CORONAL (0°=Left)</div>
            <div id="pCorVal" style="font-size:16px;font-weight:800;color:#4ade80;font-family:monospace;">+22.0°</div>
          </div>
          <div style="background:#0f172a;padding:4px;border-radius:4px;border:1px solid #1e293b;">
            <div style="font-size:9px;color:#94a3b8;">NEEDLE DEPTH</div>
            <div id="pDepthVal" style="font-size:16px;font-weight:800;color:#fde047;font-family:monospace;">0 mm</div>
          </div>
        </div>

        <!-- Main Workspace -->
        <div style="flex:1;display:grid;grid-template-columns:1.15fr 1fr;min-height:0;overflow:hidden;">
          <!-- Left Column: Calibration & OR Controls -->
          <div style="padding:7px;display:flex;flex-direction:column;gap:5px;border-right:1px solid #1e293b;overflow-y:auto;">
            <button id="calMonitorBtn" style="background:#0284c7;color:#fff;border:1px solid #38bdf8;padding:9px 6px;border-radius:5px;font-weight:800;font-size:10.5px;line-height:1.2;">
              🎯 2. POINT AT PC SCREEN (12 O'CLOCK) &amp; TAP TO CALIBRATE
            </button>

            <button id="clutchBtn" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;padding:8px 6px;border-radius:5px;font-weight:700;font-size:10.5px;">
              🔓 3D Gyro: LIVE (Tap to Freeze)
            </button>

            <canvas id="compassCanvas" width="150" height="72" style="width:100%;height:64px;background:#090f1c;border:1px solid #1e293b;border-radius:4px;flex-shrink:0;"></canvas>

            <button id="pPedalBtn" style="background:#b45309;color:#fff;border:1px solid #f59e0b;padding:10px 6px;border-radius:5px;font-weight:800;font-size:12px;">
              ☢ HOLD FLUORO PEDAL
            </button>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;">
              <button id="c0Btn" style="padding:6px 2px;font-size:9.5px;font-weight:700;">0° AP</button>
              <button id="c30AxBtn" style="padding:6px 2px;font-size:9.5px;font-weight:700;">30° Eye</button>
              <button id="c30ObBtn" style="padding:6px 2px;font-size:9.5px;font-weight:700;">30° Ceph</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:auto;">
              <button id="pStyletBtn" style="background:#1d4ed8;color:#fff;padding:7px 3px;border-radius:4px;font-weight:700;font-size:10px;">Pull Stylet</button>
              <button id="pContrastBtn" style="background:#0f766e;color:#fff;padding:7px 3px;border-radius:4px;font-weight:700;font-size:10px;">Contrast</button>
            </div>
            <button id="retractZeroBtn" style="background:#334155;color:#e2e8f0;padding:5px;border-radius:4px;font-size:9.5px;">
              Reset Depth to 0mm (Skin)
            </button>
          </div>

          <!-- Right Column: 3-in-1 Depth Push Track -->
          <div style="display:flex;flex-direction:column;height:100%;background:#091326;user-select:none;">
            <button id="holdPushInBtn" style="background:#15803d;color:#fff;border:none;border-bottom:1px solid #22c55e;padding:12px 4px;font-weight:800;font-size:11px;flex-shrink:0;">
              ▲ HOLD TO PUSH IN (+MM)
            </button>

            <div id="stabilizerTrack" style="flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;top:6px;left:4px;right:4px;text-align:center;font-size:9.5px;color:#7dd3fc;font-weight:700;pointer-events:none;line-height:1.2;z-index:2;">
                ⚓ HOLD ANCHOR &amp; PUSH PHONE<br>
                <span style="color:#cbd5e1;font-weight:400;">(Or slide finger up/down ruler)</span>
              </div>
              <canvas id="rulerCanvas" style="width:100%;height:100%;display:block;"></canvas>
            </div>

            <button id="holdPullBackBtn" style="background:#991b1b;color:#fff;border:none;border-top:1px solid #f87171;padding:12px 4px;font-weight:800;font-size:11px;flex-shrink:0;">
              ▼ HOLD TO PULL BACK (-MM)
            </button>
          </div>
        </div>
      </div>
    `;

    let peer = null, conn = null, lastPong = performance.now();
    let rawAlpha = 0, rawBeta = 30, rawGamma = 0;
    let medialRefHeading = 270;
    let smoothPitch = 30.0, smoothCor = 22.0, curDepthMm = 0;
    let gyroFrozen = false, sensorsActive = false;
    let isAnchorHeld = false, driveRateMmPerSec = 0;
    let forwardVelMm = 0, lastGravityY = 0;

    loadPeerJS(0, () => {
      function connectToPC() {
        if (!peer || peer.destroyed) {
          peer = new Peer();
          peer.on('open', openDataChannel);
          peer.on('disconnected', () => peer.reconnect());
        } else if (peer.disconnected) {
          peer.reconnect();
        } else if (!conn || !conn.open) {
          openDataChannel();
        }
      }

      function openDataChannel() {
        if (conn && conn.open) return;
        conn = peer.connect('pcnl-or-' + code, { reliable: true });
        conn.on('open', () => {
          lastPong = performance.now();
          const st = document.getElementById('phoneConnStatus');
          if (st) { st.textContent = '✓ Connected to PC!'; st.style.color = '#4ade80'; }
          sendNeedleUpdate();
        });
        conn.on('data', msg => {
          lastPong = performance.now();
          if (msg.type === 'pong') return;
          if (msg.type === 'sync_from_pc' && curDepthMm === 0) {
            curDepthMm = msg.depthMm || 0;
            drawRuler();
          } else if (msg.type === 'haptic_feedback') {
            const banner = document.getElementById('pTissueBanner');
            if (banner) banner.textContent = `${msg.layer.split('[')[0]} (${msg.force.toFixed(1)}N)`;
            if (msg.pop === 'skin' && navigator.vibrate) navigator.vibrate(35);
            else if (msg.pop === 'fascia' && navigator.vibrate) navigator.vibrate([75, 30, 75]);
            else if (msg.pop === 'papilla' && navigator.vibrate) navigator.vibrate([130]);
            else if (msg.ribHit && navigator.vibrate) navigator.vibrate([180, 40, 180]);
          }
        });
      }

      connectToPC();
      setInterval(() => {
        if (conn && conn.open) {
          conn.send({ type: 'ping' });
          if (performance.now() - lastPong > 4500) { conn.close(); connectToPC(); }
        } else {
          connectToPC();
        }
      }, 1500);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) connectToPC(); });
      window.addEventListener('focus', connectToPC);
    });

    function drawCompassPreview() {
      const c = document.getElementById('compassCanvas');
      if (!c) return;
      const ctx = c.getContext('2d');
      const w = c.width, h = c.height, tx = 40, ty = h * 0.55;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(tx, ty, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 8.5px sans-serif';
      ctx.fillText('← MEDIAL (0°)', 4, 11);
      ctx.fillText('SCREEN ↑', w * 0.55, 11);

      const rad = smoothCor * Math.PI / 180;
      const hx = tx + Math.cos(rad) * 55, hy = ty + Math.sin(rad) * 55;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty);
      ctx.lineWidth = 3; ctx.strokeStyle = '#4ade80'; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b'; ctx.fill();
    }

    function sendNeedleUpdate() {
      document.getElementById('pPitchVal').textContent = smoothPitch.toFixed(1) + '°';
      document.getElementById('pCorVal').textContent = (smoothCor >= 0 ? '+' : '') + smoothCor.toFixed(1) + '°';
      document.getElementById('pDepthVal').textContent = Math.round(curDepthMm) + ' mm';
      drawRuler();
      drawCompassPreview();
      if (conn && conn.open) {
        conn.send({ type: 'needle_update', pitchDeg: smoothPitch, corDeg: smoothCor, depthMm: curDepthMm });
      }
    }

    function handleOrientation(e) {
      if (e.alpha === null && e.beta === null) return;
      if (!sensorsActive) {
        sensorsActive = true;
        const btn = document.getElementById('enableSensorsBtn');
        if (btn) {
          btn.textContent = '✓ 3D GYRO ACTIVE — TILT & ROTATE PHONE';
          btn.style.background = '#0284c7';
        }
      }
      rawAlpha = e.alpha || 0; rawBeta = e.beta || 0; rawGamma = e.gamma || 0;
      if (gyroFrozen) return;

      const vec = getPhoneShaftVector3D(rawAlpha, rawBeta, rawGamma);
      const targetPitch = Math.max(10, Math.min(60, vec.pitchFromVerticalDeg));
      const targetCor = Math.max(-75, Math.min(75, angleDiff(vec.headingDeg, medialRefHeading)));

      smoothPitch = smoothPitch * 0.72 + targetPitch * 0.28;
      smoothCor = smoothCor * 0.72 + targetCor * 0.28;
      sendNeedleUpdate();
    }

    // Physical Forward Push Accelerometer Engine (Active while holding Skin Anchor)
    function handleMotion(e) {
      if (!isAnchorHeld) { forwardVelMm = 0; return; }
      let ay = 0;
      if (e.acceleration && e.acceleration.y !== null) {
        ay = e.acceleration.y;
      } else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.y !== null) {
        const gy = e.accelerationIncludingGravity.y;
        ay = gy - lastGravityY;
        lastGravityY = lastGravityY * 0.8 + gy * 0.2;
      }
      // Deadband filter + ZUPT damping so forward hand push advances needle smoothly
      if (Math.abs(ay) > 0.35) {
        forwardVelMm = forwardVelMm * 0.85 + Math.abs(ay) * 4.5;
        curDepthMm = Math.max(0, Math.min(135, curDepthMm + forwardVelMm * 0.04));
        sendNeedleUpdate();
      } else {
        forwardVelMm *= 0.6;
      }
    }

    async function activateSensors() {
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
      const btn = document.getElementById('enableSensorsBtn');
      if (btn) {
        btn.textContent = '✓ 3D GYRO ACTIVE — TILT & ROTATE PHONE';
        btn.style.background = '#0284c7';
      }
    }

    // Try auto-starting on load (works on Android) + bind to big top button (for iPhone iOS)
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
    document.getElementById('enableSensorsBtn').onclick = activateSensors;

    document.getElementById('calMonitorBtn').onclick = () => {
      const vec = getPhoneShaftVector3D(rawAlpha, rawBeta, rawGamma);
      medialRefHeading = (vec.headingDeg - 90 + 360) % 360;
      if (navigator.vibrate) navigator.vibrate(45);
      sendNeedleUpdate();
    };

    document.getElementById('clutchBtn').onclick = function () {
      gyroFrozen = !gyroFrozen;
      this.textContent = gyroFrozen ? '🔒 3D Angle FROZEN' : '🔓 3D Gyro: LIVE (Tap to Freeze)';
      this.style.background = gyroFrozen ? '#b45309' : '#1e293b';
    };

    // Continuous Hold-to-Push / Hold-to-Retract Loop (60 FPS)
    setInterval(() => {
      if (driveRateMmPerSec !== 0) {
        curDepthMm = Math.max(0, Math.min(135, curDepthMm + driveRateMmPerSec * 0.05));
        sendNeedleUpdate();
      }
    }, 50);

    const pushInBtn = document.getElementById('holdPushInBtn');
    const pullBackBtn = document.getElementById('holdPullBackBtn');
    pushInBtn.addEventListener('pointerdown', e => { e.preventDefault(); driveRateMmPerSec = 12; });
    pushInBtn.addEventListener('pointerup', () => { driveRateMmPerSec = 0; });
    pushInBtn.addEventListener('pointercancel', () => { driveRateMmPerSec = 0; });

    pullBackBtn.addEventListener('pointerdown', e => { e.preventDefault(); driveRateMmPerSec = -12; });
    pullBackBtn.addEventListener('pointerup', () => { driveRateMmPerSec = 0; });
    pullBackBtn.addEventListener('pointercancel', () => { driveRateMmPerSec = 0; });

    // Skin Anchor Pad: Supports BOTH Physical Forward Push AND 1:1 Finger Sliding
    const track = document.getElementById('stabilizerTrack');
    const rCanvas = document.getElementById('rulerCanvas');
    let touchStartY = null, startDepthMm = 0;
    const PX_PER_MM = 3.2;

    track.addEventListener('pointerdown', e => {
      isAnchorHeld = true;
      touchStartY = e.clientY;
      startDepthMm = curDepthMm;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', e => {
      if (touchStartY === null) return;
      const dyPx = touchStartY - e.clientY;
      if (Math.abs(dyPx) > 3) {
        curDepthMm = Math.max(0, Math.min(135, startDepthMm + dyPx / PX_PER_MM));
        touchStartY = e.clientY;
        startDepthMm = curDepthMm;
        sendNeedleUpdate();
      }
    });
    track.addEventListener('pointerup', () => { isAnchorHeld = false; touchStartY = null; });
    track.addEventListener('pointercancel', () => { isAnchorHeld = false; touchStartY = null; });

    function drawRuler() {
      const rect = rCanvas.getBoundingClientRect();
      if (rCanvas.width !== rect.width || rCanvas.height !== rect.height) {
        rCanvas.width = rect.width; rCanvas.height = rect.height;
      }
      const ctx = rCanvas.getContext('2d');
      const w = rCanvas.width, h = rCanvas.height, centerY = h * 0.55;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#38bdf8'; ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10.5px monospace';
      for (let mm = 0; mm <= 130; mm += 2) {
        const y = centerY - (mm - curDepthMm) * PX_PER_MM;
        if (y < 36 || y > h - 8) continue;
        const isCm = mm % 10 === 0;
        ctx.beginPath(); ctx.moveTo(w - (isCm ? 32 : 14), y); ctx.lineTo(w, y);
        ctx.lineWidth = isCm ? 2 : 1; ctx.stroke();
        if (isCm) ctx.fillText(`${mm}mm`, w - 70, y + 4);
      }
      ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
      ctx.lineWidth = 3; ctx.strokeStyle = isAnchorHeld ? '#4ade80' : '#f59e0b'; ctx.stroke();
      ctx.fillStyle = isAnchorHeld ? '#4ade80' : '#fde047';
      ctx.fillText(isAnchorHeld ? '⚓ ANCHOR HELD (PUSH!)' : '▶ SKIN ANCHOR', 6, centerY - 6);
    }
    setTimeout(() => { drawRuler(); drawCompassPreview(); }, 100);

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
