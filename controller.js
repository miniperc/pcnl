// ============================================================================
// PCNL 2-DEVICE WIRELESS 3D PHONE CONTROLLER & 1:1 PHYSICAL PUSH ENGINE v2.1
// ============================================================================
(function initWirelessControllerModule() {
  const urlParams = new URLSearchParams(window.location.search);
  const padCode = urlParams.get('pad');

  function angleDiff(a, b) {
    return ((a - b + 540) % 360) - 180;
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
      const peer = new Peer('pcnl-or-' + roomCode);
      let lastSentLayer = '';
      let lastSentPop = 'none';

      peer.on('open', () => {
        if (stEl) stEl.textContent = 'Ready! Scan QR code with your phone camera.';
      });

      peer.on('connection', conn => {
        if (pairBtn) {
          pairBtn.textContent = '📱 Phone Connected (Live 3D)';
          pairBtn.style.background = '#15803d';
          pairBtn.style.borderColor = '#22c55e';
        }
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
    });
  }

  function bootPhoneControllerUI(code) {
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100vh;width:100vw;background:#050811;color:#f1f5f9;font-family:sans-serif;overflow:hidden;touch-action:none;user-select:none;">
        <div style="padding:8px 12px;background:#0a101d;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:800;font-size:13px;color:#38bdf8;">CHIBA 18G 3D CONTROLLER</div>
            <div id="phoneConnStatus" style="font-size:10.5px;color:#fbbf24;">Connecting to PC Room ${code}...</div>
          </div>
          <button id="enableSensorsBtn" style="background:#15803d;color:#fff;border:1px solid #22c55e;padding:6px 10px;border-radius:5px;font-weight:800;font-size:11px;">
            1. TAP TO START 3D SENSORS
          </button>
        </div>
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
        <div style="flex:1;display:grid;grid-template-columns:1.15fr 1fr;min-height:0;">
          <div style="padding:10px;display:flex;flex-direction:column;gap:8px;border-right:1px solid #1e293b;overflow-y:auto;">
            <button id="calZeroBtn" style="background:#0284c7;color:#fff;border:1px solid #38bdf8;padding:12px 8px;border-radius:6px;font-weight:800;font-size:12px;">
              🎯 ZERO / CALIBRATE HAND ANGLE
            </button>
            <button id="clutchBtn" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;padding:10px 8px;border-radius:6px;font-weight:700;font-size:11.5px;">
              🔓 3D Gyro: LIVE (Tap to Freeze)
            </button>
            <button id="pushModeBtn" style="background:#172234;color:#cbd5e1;border:1px solid #334155;padding:8px;border-radius:6px;font-size:10.5px;font-weight:700;">
              Push Mode: 1:1 Stabilizer
            </button>
            <button id="invertPushBtn" style="background:#172234;color:#94a3b8;border:1px solid #334155;padding:6px;border-radius:6px;font-size:10px;">
              ⇄ Invert Push Direction
            </button>
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
              Retract to 0mm (Skin)
            </button>
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

    let conn = null;
    loadPeerJS(0, () => {
      const peer = new Peer();
      peer.on('open', () => {
        conn = peer.connect('pcnl-or-' + code, { reliable: true });
        conn.on('open', () => {
          const st = document.getElementById('phoneConnStatus');
          st.textContent = '✓ Paired Live to PC Monitor!';
          st.style.color = '#4ade80';
        });
        conn.on('data', msg => {
          if (msg.type === 'haptic_feedback') {
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
      });
    });

    let rawAlpha = 0, rawBeta = 0, rawGamma = 0;
    let calAlpha = 0, calBeta = 45, calGamma = 0;
    let basePitch = 30.0, baseCor = 22.0;
    let smoothPitch = 30.0, smoothCor = 22.0;
    let curDepthMm = 0;
    let gyroFrozen = false;
    let pushMode = 'stabilizer';
    let invertPush = false;

    function sendNeedleUpdate() {
      document.getElementById('pPitchVal').textContent = smoothPitch.toFixed(1) + '°';
      document.getElementById('pCorVal').textContent = smoothCor.toFixed(1) + '°';
      document.getElementById('pDepthVal').textContent = Math.round(curDepthMm) + ' mm';
      drawRuler();
      if (conn && conn.open) {
        conn.send({ type: 'needle_update', pitchDeg: smoothPitch, corDeg: smoothCor, depthMm: curDepthMm });
      }
    }

    function handleOrientation(e) {
      if (e.alpha === null) return;
      rawAlpha = e.alpha; rawBeta = e.beta; rawGamma = e.gamma;
      if (gyroFrozen) return;
      const dBeta = rawBeta - calBeta;
      const dAlpha = angleDiff(rawAlpha, calAlpha);
      const targetPitch = Math.max(10, Math.min(60, basePitch + dBeta * 0.85));
      const targetCor = Math.max(-75, Math.min(75, baseCor - dAlpha * 0.85));
      smoothPitch = smoothPitch * 0.75 + targetPitch * 0.25;
      smoothCor = smoothCor * 0.75 + targetCor * 0.25;
      sendNeedleUpdate();
    }

    let lastThrustTime = 0;
    function handleMotion(e) {
      if (pushMode !== 'zupt' || !e.acceleration) return;
      const now = performance.now();
      if (now - lastThrustTime < 220) return;
      const ay = e.acceleration.y || 0;
      if (Math.abs(ay) > 1.85) {
        const step = Math.sign(ay) * (invertPush ? -1 : 1) * Math.min(6, Math.round(Math.abs(ay) * 1.4));
        curDepthMm = Math.max(0, Math.min(135, curDepthMm + step));
        lastThrustTime = now;
        if (navigator.vibrate) navigator.vibrate(15);
        sendNeedleUpdate();
      }
    }

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

    document.getElementById('calZeroBtn').onclick = () => {
      calAlpha = rawAlpha; calBeta = rawBeta; calGamma = rawGamma;
      basePitch = 30.0; baseCor = 22.0; smoothPitch = 30.0; smoothCor = 22.0;
      if (navigator.vibrate) navigator.vibrate(40);
      sendNeedleUpdate();
    };

    document.getElementById('clutchBtn').onclick = function () {
      gyroFrozen = !gyroFrozen;
      if (!gyroFrozen) { calAlpha = rawAlpha; calBeta = rawBeta; basePitch = smoothPitch; baseCor = smoothCor; }
      this.textContent = gyroFrozen ? '🔒 3D Angle FROZEN' : '🔓 3D Gyro: LIVE (Tap to Freeze)';
      this.style.background = gyroFrozen ? '#b45309' : '#1e293b';
    };

    document.getElementById('pushModeBtn').onclick = function () {
      pushMode = pushMode === 'stabilizer' ? 'zupt' : 'stabilizer';
      this.textContent = pushMode === 'stabilizer' ? 'Push Mode: 1:1 Stabilizer' : 'Push Mode: Micro-Thrusts';
    };

    document.getElementById('invertPushBtn').onclick = function () {
      invertPush = !invertPush;
      this.textContent = `⇄ Invert Push (${invertPush ? 'Inverted' : 'Normal'})`;
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
    setTimeout(drawRuler, 100);

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
