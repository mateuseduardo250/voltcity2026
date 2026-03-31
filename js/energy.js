'use strict';

// =================== ENERGY ===================
function setEnergy(val) {
  if (state.frozen) { showToast('❄️ Energia congelada! Descongele primeiro.'); return; }
  const old = state.energy;
  state.energy = Math.max(0, Math.min(100, val));
  updateEnergyUI();
  updatePolesColors();
  if (val !== old) addLog('operador', 'Energia', `Energia ajustada de ${old}% para ${state.energy}%`, state.energy);
}

function addEnergy(delta) { setEnergy(state.energy + delta); }

function toggleFix100() {
  state.fixed100 = !state.fixed100;
  const btn = document.getElementById('btn-fix100');
  if (state.fixed100) {
    state.frozen = true;
    state.energy = 100;
    btn.classList.add('active-btn');
    btn.innerHTML = '<span class="qa-icon">🔓</span>Desfixar 100%';
    document.getElementById('btn-freeze').classList.add('active-btn');
    document.getElementById('btn-freeze').innerHTML = '<span class="qa-icon">❄️</span>Descongelar';
    updateEnergyUI();
    updatePolesColors();
    updateAlerts();
    showToast('🔋 Energia fixada em 100%!');
    addLog('operador', 'Energia', 'Energia fixada em 100%', 100);
  } else {
    state.frozen = false;
    btn.classList.remove('active-btn');
    btn.innerHTML = '<span class="qa-icon">🔋</span>Fixar 100%';
    document.getElementById('btn-freeze').classList.remove('active-btn');
    document.getElementById('btn-freeze').innerHTML = '<span class="qa-icon">❄️</span>Congelar';
    updateAlerts();
    showToast('✅ Energia liberada!');
    addLog('operador', 'Energia', 'Energia desfixada', state.energy);
  }
}

function toggleFreeze() {
  state.frozen = !state.frozen;
  const btn = document.getElementById('btn-freeze');
  if (state.frozen) {
    btn.classList.add('active-btn');
    btn.innerHTML = '<span class="qa-icon">❄️</span>Descongelar';
    showToast('❄️ Energia congelada!');
    addLog('operador', 'Energia', 'Energia congelada', state.energy);
  } else {
    btn.classList.remove('active-btn');
    btn.innerHTML = '<span class="qa-icon">❄️</span>Congelar';
    showToast('✅ Energia descongelada!');
    addLog('operador', 'Energia', 'Energia descongelada', state.energy);
  }
  updateAlerts();
}

function toggleBlockRed() {
  state.blockRed = !state.blockRed;
  const btn = document.getElementById('btn-block-red');
  const tog = document.getElementById('tog-red');
  if (state.blockRed) {
    btn?.classList.add('active-btn');
    tog?.classList.add('on');
    showToast('🛡️ Vermelho bloqueado!');
    addLog('operador', 'Segurança', 'Bloqueio do vermelho ativado', state.energy);
  } else {
    btn?.classList.remove('active-btn');
    tog?.classList.remove('on');
    showToast('⚠️ Bloqueio do vermelho removido');
    addLog('operador', 'Segurança', 'Bloqueio do vermelho desativado', state.energy);
  }
  updatePolesColors();
  updateAlerts();
}

function toggleSetting(el, key) {
  el.classList.toggle('on');
}

function getEnergyColor(pct) {
  if (state.blockRed && pct <= 10) return '#39d353';
  if (pct <= 10) return '#f04040';
  if (pct <= 30) return '#f08040';
  if (pct <= 60) return '#f0c040';
  return '#39d353';
}

function updateEnergyUI() {
  const pct = state.energy;
  const color = getEnergyColor(pct);
  document.getElementById('energy-display').textContent = pct + '%';
  document.getElementById('energy-display').style.color = color;
  document.getElementById('energy-bar').style.width = pct + '%';
  document.getElementById('energy-bar').style.background = `linear-gradient(90deg, ${color}99, ${color})`;
  document.getElementById('stat-energy').textContent = pct + '%';
  if (pct === 100) {
    document.getElementById('energy-display').classList.add('anim-celebrate');
    setTimeout(() => document.getElementById('energy-display').classList.remove('anim-celebrate'), 3000);
    activateEffect('festa');
    showToast('🎉 Energia máxima! FESTA!');
  }
}

function updateAlerts() {
  const area = document.getElementById('alerts-area');
  area.innerHTML = '';
  if (state.frozen) area.innerHTML += `<div class="alert yellow">❄️ Energia congelada — os postes não mudam automaticamente.</div>`;
  if (state.blockRed) area.innerHTML += `<div class="alert green">🛡️ Bloqueio do vermelho ativo — postes nunca ficarão vermelhos.</div>`;
  if (state.energy <= 10 && !state.blockRed) area.innerHTML += `<div class="alert red">⚠️ Energia crítica! Os postes estão vermelhos.</div>`;
}

function startAutoDecay() {
  setInterval(() => {
    const tog = document.getElementById('tog-queda');
    const rate = parseInt(document.getElementById('queda-rate')?.value || 1);
    const minE = parseInt(document.getElementById('min-energy')?.value || 5);
    if (tog?.classList.contains('on') && !state.frozen && state.mode === 'energia') {
      if (state.energy > minE) {
        state.energy = Math.max(minE, state.energy - rate);
        updateEnergyUI();
        updatePolesColors();
        updateAlerts();
        const onm = document.getElementById('stat-mode');
        if (onm) onm.textContent = getModeLabel();
      }
    }
  }, 60000);
}

function setMode(mode) {
  state.mode = mode;
  const labels = { energia: 'ENERGIA', manual: 'MANUAL', show: 'SHOW' };
  const el = document.getElementById('mode-badge');
  if (el) el.textContent = labels[mode] || mode.toUpperCase();
  document.getElementById('stat-mode').textContent = getModeLabel();
  addLog('operador', 'Modo', 'Modo alterado para ' + getModeLabel(), state.energy);
}

function getModeLabel() {
  return { energia: 'Energia', manual: 'Manual', show: 'Show' }[state.mode] || state.mode;
}

window.setEnergy = setEnergy;
window.addEnergy = addEnergy;
window.toggleFix100 = toggleFix100;
window.toggleFreeze = toggleFreeze;
window.toggleBlockRed = toggleBlockRed;
window.toggleSetting = toggleSetting;
window.getEnergyColor = getEnergyColor;
window.updateEnergyUI = updateEnergyUI;
window.updateAlerts = updateAlerts;
window.startAutoDecay = startAutoDecay;
window.setMode = setMode;
window.getModeLabel = getModeLabel;
