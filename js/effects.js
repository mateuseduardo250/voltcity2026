'use strict';

// =================== EFFECTS ===================
function activateEffect(name) {
  if (state.activeEffect === name) { stopEffect(); showToast('⏹ Efeito parado'); return; }
  stopEffect();
  state.activeEffect = name;
  setMode('show');
  document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('eff-' + name);
  if (card) card.classList.add('active');
  document.getElementById('active-effect-label').textContent = card ? card.querySelector('.effect-name').textContent : name;
  addLog('operador', 'Show', 'Efeito ativado: ' + name, state.energy);
  sendToAllPoles({ efeito: name });

  const poles = state.poles;
  const colors = ['#f04040','#f0c040','#39d353','#4090f0','#4040f0','#c060f0','#ffffff','#ff69b4'];

  if (name === 'arcoiris') {
    let i = 0;
    state.effectInterval = setInterval(() => {
      poles.forEach((p, idx) => { p.color = colors[(idx + i) % colors.length]; });
      i++;
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 600);
  } else if (name === 'onda') {
    let i = 0;
    state.effectInterval = setInterval(() => {
      const idx = i % poles.length;
      poles.forEach((p, pidx) => { p.color = pidx === idx ? '#4090f0' : '#0a0a2a'; });
      Promise.allSettled(poles.map((p, pidx) =>
        sendToHardware(p.id, { color: pidx === idx ? '#4090f0' : '#0a0a2a' })
      ));
      i++;
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 400);
  } else if (name === 'pulsacao') {
    let on = true;
    state.effectInterval = setInterval(() => {
      poles.forEach(p => { p.color = on ? '#39d353' : '#0a2a0a'; });
      on = !on;
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 700);
  } else if (name === 'alternancia') {
    let phase = 0;
    state.effectInterval = setInterval(() => {
      poles.forEach((p, idx) => { p.color = (idx % 2 === phase % 2) ? '#4090f0' : '#c060f0'; });
      phase++;
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 800);
  } else if (name === 'perseguicao') {
    let pos = 0;
    state.effectInterval = setInterval(() => {
      poles.forEach((p, idx) => {
        const dist = Math.abs(idx - pos);
        p.color = dist === 0 ? '#ffffff' : dist === 1 ? '#4090f0' : '#0a0a1a';
      });
      Promise.allSettled(poles.map((p, idx) => {
        const dist = Math.abs(idx - pos);
        return sendToHardware(p.id, { color: dist === 0 ? '#ffffff' : dist === 1 ? '#4090f0' : '#0a0a1a' });
      }));
      pos = (pos + 1) % poles.length;
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 300);
  } else if (name === 'contagem') {
    const seq = ['#39d353','#f0c040','#f04040','#c060f0'];
    let s = 0;
    state.effectInterval = setInterval(() => {
      const c = seq[s % seq.length];
      poles.forEach(p => p.color = c);
      s++;
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 1200);
  } else if (name === 'festa') {
    state.effectInterval = setInterval(() => {
      poles.forEach(p => { p.color = colors[Math.floor(Math.random() * colors.length)]; });
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 300);
  } else if (name === 'noturno') {
    poles.forEach(p => p.color = '#001a4d');
    renderPolesGrid('poles-mini');
    renderPolesGrid('poles-detail');
  } else if (name === 'manutencao') {
    let on = true;
    state.effectInterval = setInterval(() => {
      poles.forEach(p => p.color = on ? '#f0c040' : '#2a1a00');
      on = !on;
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 500);
  } else if (name === 'carga') {
    // Barras sobem de 0 a 100% mudando de cor: vermelho → rosa → amarelo → verde
    const nivelParaCor = n => n <= 10 ? '#f04040' : n <= 30 ? '#c060f0' : n <= 60 ? '#f0c040' : '#39d353';
    let nivel = 0;
    sendToAllPoles({ nivel: 0 }); // começa do zero
    state.effectInterval = setInterval(() => {
      nivel += 20;
      if (nivel > 100) { nivel = 0; }
      const cor = nivelParaCor(nivel);
      poles.forEach(p => { p.color = cor; });
      sendToAllPoles({ nivel });
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
    }, 900);
  }
  showToast('🎆 Efeito ativado!');
}

function stopEffect() {
  const foi = state.activeEffect;
  if (state.effectInterval) {
    clearInterval(state.effectInterval);
    state.effectInterval = null;
  }
  state.activeEffect = null;
  document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
  document.getElementById('active-effect-label').textContent = 'nenhum';
  if (foi === 'carga') {
    // Restaura barras cheias e cor verde
    sendToAllPoles({ nivel: 100 });
  } else {
    sendToAllPoles({ parar: true });
  }
}

window.activateEffect = activateEffect;
window.stopEffect = stopEffect;
