// ============================================================================
// PCNL 2-DEVICE WIRELESS 3D PHONE CONTROLLER v3.0
// True 3D Gravity Pitch + Gimbal-Free Medial Coronal Vector + Auto-Reconnect
// ============================================================================
(function initWirelessControllerModule() {
  const urlParams = new URLSearchParams(window.location.search);
  const padCode = urlParams.get('pad');

  function angleDiff(a, b) {
    return ((a - b + 540) % 360) - 180;
  }

  // Convert W3C DeviceOrientation (alpha, beta, gamma) into true 3D unit vector
  // of the phone's top axis (+Y_phone) in World Space (+X=East, +Y=North, +Z=Up)
  // Using the exact 3D vector eliminates Euler Gimbal Lock when tilting!
  function getPhoneShaftVector3D(alphaDeg, betaDeg, gammaDeg) {
    const a = (alphaDeg || 0) * Math.PI / 180;
    const b = (betaDeg || 0) * Math.PI / 180;
    const g = (gammaDeg || 0) * Math.PI / 180;

    const cA = Math.cos(a), sA = Math.sin(a);
    const cB = Math.cos(b), sB = Math.sin(b);
    const cG = Math.cos(g), sG = Math.sin(g);

    // Phone +Y axis (pointing out the top edge of the phone)
    const vx = -sA * cB;
    const vy = cA * cB;
    const vz = sB;

    // Also compute Phone -Z axis (out the back of the phone) in case phone is held upright
    const bx = -(cA * sG + sA * sB * cG);
    const by = -(sA * sG - cA * sB * cG);
    const bz = -cB * cG;

    // True horizontal compass heading of the phone's shaft (in degrees, 0..360)
    // Fallback to back-vector heading if phone is held nearly 90° vertical
    const horizLen = Math.hypot(vx, vy);
    const hx = horizLen > 0.15 ? vx : bx;
    const hy = horizLen > 0.15 ? vy : by;
    const headingDeg = (Math.atan2(hx, hy) * 180 / Math.PI + 360) % 360;

    // True Pitch from Vertical (0° = vertical straight down/up, 90° = flat horizontal on desk)
    // Using full 3D tilt from vertical so rolling the phone in your hand doesn't corrupt pitch
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
  }

  // ==========================================================================
  // MODE A: PC HOST BRIDGE (WITH AUTO-RECONNECT ON TAB SWITCH)
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
            // Send current PC state so phone doesn't overwrite on tab reconnect
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
      <div style="display:flex;flex-direction:column;height:100vh;width:100vw;background:#050811;color:#f1f5f9;font-family:sans-serif;overflow:hidden;touch-action:none;user-select:none;">
        <div style="padding:8px 12px;background:#0a101d;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:800;font-size:13px;color:#38bdf8;">CHIBA 18G 3D CONTROLLER v3.0</div>
            <div id="phoneConnStatus" style="font-size:10.5px;color:#fbbf24;">Connecting to PC Room ${code}...</div>
          </div>
          <button id="enableSensorsBtn" style="background:#15803d;color:#fff;border:1px solid #22c55e;padding:6px 10px;border-radius:5px;font-weight:800;font-size:11px;">
            1. TAP TO START 3D SENSORS
          </button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:8px;background:#080d18;border-bottom:1px solid #1e293b;text-align:center;">
          <div style="background:#0f172a;padding:6px;border-radius:5px;border:1px solid #1e293b;">
            <div style="font-size:9.5px;color:#94a3b8;">PITCH (10°=Vert)</div>
            <div id="pPitchVal" style="font-size:18px;font-weight:800;color:#38bdf8;font-family:monospace;">30.0°</div>
          </div>
          <div style="background:#0f172a;padding:6px;border-radius:5px;border:1px solid #1e293b;">
            <div style="font-size:9.5px;color:#94a3b8;">CORONAL (0°=Left)</div>
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

        <div style="flex:1;display:grid;grid-template-columns:1.18fr 1fr;min-height:0;">
          <div style="padding:8px;display:flex;flex-direction:column;gap:6px;border-right:1px solid #1e293b;overflow-y:auto;">
            <button id="calMonitorBtn" style="background:#0284c7;color:#fff;border:1px solid #38bdf8;padding:10px 6px;border-radius:6px;font-weight:800;font-size:11px;line-height:1.25;">
              🎯 2. POINT PHONE AT PC SCREEN (12 O'CLOCK) &amp; TAP TO CALIBRATE
            </button>

            <button id="calMedialBtn" style="background:#0f766e;color:#fff;border:1px solid #2dd4bf;padding:8px 6px;border-radius:6px;font-weight:700;font-size:10.5px;">
              🎯 Or Calibrate Pointing Left (Medial = 0°)
            </button>

            <button id="clutchBtn" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;padding:9px 6px;border-radius:6px;font-weight:700;font-size:11px;">
              🔓 3D Gyro: LIVE (Tap to Freeze)
            </button>

            <!-- Live 2D Needle Compass Preview (Matches PC Screen!) -->
            <canvas id="compassCanvas" width="160" height="90" style="width:100%;height:76px;background:#090f1c;border:1px solid #1e293b;border-radius:5px;"></canvas>

            <button id="pPedalBtn" style="background:#b45309;color:#fff;border:1px solid #f59e0b;padding:12px 6px;border-radius:6px;font-weight:800;font-size:12.5px;">
              ☢ HOLD FLUORO PEDAL
            </button>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
              <button id="c0Btn" style="padding:7px 3px;font-size:10px;font-weight:700;">0° AP</button>
              <button id="c30AxBtn" style="padding:7px 3px;font-size:10px;font-weight:700;">30° Eye</button>
              <button id="c30ObBtn" style="padding:7px 3px;font-size:10px;font-weight:700;">30° Ceph</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:auto;">
              <button id="pStyletBtn" style="background:#1d4ed8;color:#fff;padding:8px 4px;border-radius:5px;font-weight:700;font-size:10.5px;">Pull Stylet</button>
              <button id="pContrastBtn" style="background:#0f766e;color:#fff;padding:8px 4px;border-radius:5px;font-weight:700;font-size:10.5px;">Contrast</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
              <button id="invertPushBtn" style="background:#172234;color:#94a3b8;padding:6px;border-radius:5px;font-size:9.5px;">⇄ Invert Push</button>
              <button id="retractZeroBtn" style="background:#334155;color:#e2e8f0;padding:6px;border-radius:5px;font-size:9.5px;">0mm Skin</button>
            </div>
          </div>

          <div id="stabilizerTrack" style="position:relative;background:linear-gradient(180deg,#091326 0%,#0f1f3d 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
            <div style="position:absolute;top:10px;left:8px;right:8px;text-align:center;font-size:10px;color:#7dd3fc;font-weight:700;pointer-events:none;line-height:1.3;">
              LEFT FINGER = SKIN ANCHOR<br>
              <span style="color:#cbd5e1;font-weight:400;">Hold left finger still &amp; push phone forward!</span>
            </div>
            <canvas id="rulerCanvas" style="width:100%;height:100%;display:block;"></canvas>
          </div>
        </div>
      </div>
    `;

    let peer = null;
    let conn = null;
    let lastPong = performance.now();

    let rawAlpha = 0, rawBeta = 30, rawGamma = 0;
    // Reference heading for Medial (9 o'clock = Left on PC screen, where Coronal = 0°)
    let medialRefHeading = 270;
    let smoothPitch = 30.0, smoothCor = 22.0;
    let curDepthMm = 0;
    let gyroFrozen = false;
    let invertPush = false;

    // Auto-Reconnecting Phone PeerJS Client
    loadPeerJS(0, () => {
      function connectToPC() {
        const st = document.getElementById('phoneConnStatus');
        if (!peer || peer.destroyed) {
          peer = new Peer();
          peer.on('open', () => openDataChannel());
          peer.on('disconnected', () => peer.reconnect());
        } else if (peer.disconnected) {
          peer.reconnect();
        } else if (!conn || !conn.open) {
          openDataChannel();
        }
      }

      function openDataChannel() {
        if (conn && conn.open) return;
        const st = document.getElementById('phoneConnStatus');
        if (st) { st.textContent = `Reconnecting to PC ${code}...`; st.style.color = '#fbbf24'; }
        conn = peer.connect('pcnl-or-' + code, { reliable: true });
        conn.on('open', () => {
          lastPong = performance.now();
          if (st) { st.textContent = '✓ Paired Live to PC Monitor!'; st.style.color = '#4ade80'; }
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
            banner.textContent = `${msg.layer} (${msg.force.toFixed(1)} N)`;
            if (msg.pop === 'skin' && navigator.vibrate) navigator.vibrate(35);
            else if (msg.pop === 'fascia') {
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
      }

      connectToPC();

      // Heartbeat & Automatic Reconnect on Tab Switch / Wake
      setInterval(() => {
        if (conn && conn.open) {
          conn.send({ type: 'ping' });
          if (performance.now() - lastPong > 4500) {
            conn.close();
            connectToPC();
          }
        } else {
          connectToPC();
        }
      }, 1500);

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) connectToPC();
      });
      window.addEventListener('focus', connectToPC);
    });

    function drawCompassPreview() {
      const c = document.getElementById('compassCanvas');
      if (!c) return;
      const ctx = c.getContext('2d');
      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);

      // Draw kidney/pelvis target on the left (Medial) and needle shaft entering from right (Lateral)
      const tx = 44, ty = h * 0.55;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(tx, ty, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('SPINE/PELVIS', 6, 13);
      ctx.fillText('HEAD ↑', w * 0.45, 13);

      // Needle vector matching PC screen (0° = pointing straight left; +corDeg = pointing left & up)
      const rad = smoothCor * Math.PI / 180;
      const len = 62;
      const hx = tx + Math.cos(rad) * len;
      const hy = ty + Math.sin(rad) * len;

      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tx, ty);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#4ade80';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
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
      if (e.alpha === null) return;
      rawAlpha = e.alpha; rawBeta = e.beta; rawGamma = e.gamma;
      if (gyroFrozen) return;

      const vec = getPhoneShaftVector3D(rawAlpha, rawBeta, rawGamma);

      // 1. True Gravity Pitch: 10° = Vertical (steep), 60° = Flat (horizontal)
      const targetPitch = Math.max(10, Math.min(60, vec.pitchFromVerticalDeg));

      // 2. True Coronal Angle relative to Medial (9 o'clock = Left):
      // Turning phone clockwise from 9 o'clock toward 12 o'clock (PC Screen = Cephalad) gives +Coronal!
      const targetCor = Math.max(-75, Math.min(75, angleDiff(vec.headingDeg, medialRefHeading)));

      smoothPitch = smoothPitch * 0.72 + targetPitch * 0.28;
      smoothCor = smoothCor * 0.72 + targetCor * 0.28;
      sendNeedleUpdate();
    }

    document.getElementById('enableSensorsBtn').onclick = async function () {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          await DeviceOrientationEvent.requestPermission();
        }
      } catch (err) {}
      window.addEventListener('deviceorientation', handleOrientation);
      this.textContent = '✓ 3D GYRO ON';
      this.style.background = '#0284c7';
      // Default calibration assuming phone is pointed at monitor (12 o'clock)
      const vec = getPhoneShaftVector3D(rawAlpha, rawBeta, rawGamma);
      medialRefHeading = (vec.headingDeg - 90 + 360) % 360;
    };

    // Calibrate by pointing phone straight at PC Screen (12 o'clock = Cephalad = +90° from Medial)
    document.getElementById('calMonitorBtn').onclick = () => {
      const vec = getPhoneShaftVector3D(rawAlpha, rawBeta, rawGamma);
      // If current heading is 12 o'clock (Cephalad), then Medial (9 o'clock, Coronal=0°) is 90° counter-clockwise!
      medialRefHeading = (vec.headingDeg - 90 + 360) % 360;
      if (navigator.vibrate) navigator.vibrate(45);
      sendNeedleUpdate();
    };

    // Or calibrate while pointing phone straight Left (9 o'clock = Medial = 0° Coronal)
    document.getElementById('calMedialBtn').onclick = () => {
      const vec = getPhoneShaftVector3D(rawAlpha, rawBeta, rawGamma);
      medialRefHeading = vec.headingDeg;
      if (navigator.vibrate) navigator.vibrate(45);
      sendNeedleUpdate();
    };

    document.getElementById('clutchBtn').onclick = function () {
      gyroFrozen = !gyroFrozen;
      this.textContent = gyroFrozen ? '🔒 3D Angle FROZEN' : '🔓 3D Gyro: LIVE (Tap to Freeze)';
      this.style.background = gyroFrozen ? '#b45309' : '#1e293b';
    };

    document.getElementById('invertPushBtn').onclick = function () {
      invertPush = !invertPush;
      this.textContent = `⇄ Invert Push (${invertPush ? 'Inv' : 'Norm'})`;
    };

    const track = document.getElementById('stabilizerTrack');
    const rCanvas = document.getElementById('rulerCanvas');
    let touchStartY = null, startDepthMm = 0;
    const PX_PER_MM = 3.78;

    track.addEventListener('pointerdown', e => {
      touchStartY = e.clientY; startDepthMm = curDepthMm;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', e => {
      if (touchStartY === null) return;
      const dyPx = touchStartY - e.clientY;
      const deltaMm = (dyPx / PX_PER_MM) * (invertPush ? -1 : 1);
      curDepthMm = Math.max(0, Math.min(135, startDepthMm + deltaMm));
      sendNeedleUpdate();
    });
    track.addEventListener('pointerup', () => { touchStartY = null; });
    track.addEventListener('pointercancel', () => { touchStartY = null; });

    function drawRuler() {
      const rect = rCanvas.getBoundingClientRect();
      if (rCanvas.width !== rect.width || rCanvas.height !== rect.height) {
        rCanvas.width = rect.width; rCanvas.height = rect.height;
      }
      const ctx = rCanvas.getContext('2d');
      const w = rCanvas.width, h = rCanvas.height, centerY = h * 0.55;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#38bdf8'; ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 11px monospace';
      for (let mm = 0; mm <= 130; mm += 2) {
        const y = centerY - (mm - curDepthMm) * PX_PER_MM;
        if (y < 45 || y > h - 10) continue;
        const isCm = mm % 10 === 0;
        ctx.beginPath(); ctx.moveTo(w - (isCm ? 36 : 16), y); ctx.lineTo(w, y);
        ctx.lineWidth = isCm ? 2 : 1; ctx.stroke();
        if (isCm) ctx.fillText(`${mm}mm`, w - 76, y + 4);
      }
      ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
      ctx.lineWidth = 3; ctx.strokeStyle = '#f59e0b'; ctx.stroke();
      ctx.fillStyle = '#fde047'; ctx.fillText('▶ SKIN ANCHOR', 8, centerY - 6);
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
