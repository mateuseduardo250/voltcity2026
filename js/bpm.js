'use strict';

// =================== MODO MUSICAL BPM ===================
const bpmState = {
  running: false,
  interval: null,
  beat: 0,
  tapTimes: [],
  pulseAnim: null,
};

const BPM_COLORS = ['#f04040','#f0c040','#39d353','#4090f0','#c060f0','#ffffff','#00e5ff'];

function startBPM() {
  const bpm = parseInt(document.getElementById('bpm-input').value) || 120;
  const style = document.getElementById('bpm-style').value;
  if (bpm < 20 || bpm > 300) { showToast('⚠️ BPM deve ser entre 20 e 300'); return; }

  stopBPM(true); // para qualquer coisa rodando sem limpar UI
  stopEffect();  // para efeitos do show de luz

  bpmState.running = true;
  bpmState.beat = 0;
  document.getElementById('btn-bpm-start').style.display = 'none';
  document.getElementById('btn-bpm-stop').style.display  = '';
  document.getElementById('bpm-pulse-bar').style.display = '';
  document.getElementById('bpm-status').textContent = '🎵 Rodando — ' + bpm + ' BPM';

  const ms = Math.round(60000 / bpm); // milissegundos por beat

  bpmState.interval = setInterval(() => {
    const beat = bpmState.beat;
    const poles = state.poles;

    if (style === 'flash') {
      // Todos piscam juntos trocando de cor a cada beat
      const cor = BPM_COLORS[beat % BPM_COLORS.length];
      poles.forEach(p => { p.color = cor; });
      sendToAllPoles({ color: cor });

    } else if (style === 'sequencia') {
      // Acende um poste por vez em sequência
      const idx = beat % poles.length;
      const cor = BPM_COLORS[beat % BPM_COLORS.length];
      poles.forEach((p, i) => { p.color = i === idx ? cor : '#0a0a2a'; });
      poles.forEach((p, i) => {
        const c = i === idx ? cor : 'desligado';
        sendToHardware(p.id, { color: i === idx ? cor : '#0a0a2a' });
      });

    } else if (style === 'alternado') {
      // Par e ímpar trocam de cor alternadamente
      const corA = BPM_COLORS[beat % BPM_COLORS.length];
      const corB = BPM_COLORS[(beat + 3) % BPM_COLORS.length];
      poles.forEach((p, i) => { p.color = i % 2 === beat % 2 ? corA : corB; });
      Promise.allSettled(poles.map((p, i) =>
        sendToHardware(p.id, { color: i % 2 === beat % 2 ? corA : corB })
      ));

    } else if (style === 'arcoiris') {
      // Cada poste tem uma cor diferente, todas giram no beat
      poles.forEach((p, i) => { p.color = BPM_COLORS[(beat + i) % BPM_COLORS.length]; });
      Promise.allSettled(poles.map((p, i) =>
        sendToHardware(p.id, { color: BPM_COLORS[(beat + i) % BPM_COLORS.length] })
      ));
    }

    bpmState.beat++;
    renderPolesGrid('poles-mini');
    renderPolesGrid('poles-detail');
    animatePulse(ms);
  }, ms);

  showToast('🎵 BPM ' + bpm + ' iniciado!');
}

function stopBPM(silent) {
  if (bpmState.interval) { clearInterval(bpmState.interval); bpmState.interval = null; }
  if (bpmState.pulseAnim) { clearTimeout(bpmState.pulseAnim); bpmState.pulseAnim = null; }
  bpmState.running = false;
  bpmState.beat = 0;
  const fill = document.getElementById('bpm-pulse-fill');
  if (fill) fill.style.width = '0%';
  if (!silent) {
    document.getElementById('btn-bpm-start').style.display = '';
    document.getElementById('btn-bpm-stop').style.display  = 'none';
    document.getElementById('bpm-pulse-bar').style.display = 'none';
    document.getElementById('bpm-status').textContent = '⏸ Parado';
    showToast('⏹ BPM parado');
  }
}

// Animação da barra de pulso (preenche no tempo do beat)
function animatePulse(ms) {
  const fill = document.getElementById('bpm-pulse-fill');
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '100%';
  setTimeout(() => {
    fill.style.transition = 'width ' + ms + 'ms linear';
    fill.style.width = '0%';
  }, 30);
}

// ---- TAP BPM ----
function tapBPM() {
  const now = Date.now();
  const taps = bpmState.tapTimes;
  // Descarta taps muito antigos (> 3s)
  while (taps.length && now - taps[0] > 3000) taps.shift();
  taps.push(now);

  if (taps.length < 2) {
    document.getElementById('bpm-tap-hint').textContent = 'Continue batendo...';
    return;
  }
  // Calcula BPM médio dos intervalos
  let totalMs = 0;
  for (let i = 1; i < taps.length; i++) totalMs += taps[i] - taps[i-1];
  const avgMs = totalMs / (taps.length - 1);
  const bpm = Math.round(60000 / avgMs);

  document.getElementById('bpm-input').value = bpm;
  document.getElementById('bpm-tap-hint').textContent =
    taps.length < 4 ? 'Continue batendo... (' + bpm + ' BPM)' : '✅ ' + bpm + ' BPM detectado!';
}

// Parar BPM ao ativar um efeito normal (evita conflito)
const _origActivateEffect = window.activateEffect;
window.activateEffect = function(name) {
  stopBPM(true);
  document.getElementById('btn-bpm-start').style.display = '';
  document.getElementById('btn-bpm-stop').style.display  = 'none';
  document.getElementById('bpm-status').textContent = '⏸ Parado';
  _origActivateEffect(name);
};

window.startBPM = startBPM;
window.stopBPM  = stopBPM;
window.tapBPM   = tapBPM;
