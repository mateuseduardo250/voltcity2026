'use strict';

// =================== POLES ===================
function renderPolesGrid(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const isDetail = containerId === 'poles-detail';
  c.innerHTML = state.poles.map(p => `
    <div class="pole-card${p.locked ? ' locked' : ''}${!p.online ? ' offline' : ''}${state.selectedPoles.has(p.id) ? ' selected' : ''}"
         id="${containerId}-pole-${p.id}"
         onclick="${isDetail ? `selectPole(${p.id})` : `showPage('postes'); selectPole(${p.id})`}">
      <span class="pole-lock-icon">🔒</span>
      <div class="pole-visual" style="background:${p.online ? p.color : '#333'};box-shadow:0 0 15px ${p.color}88"></div>
      <div class="pole-name">${p.name}</div>
      <div class="pole-status">${p.online ? '● Online' : '○ Offline'} · ${p.brightness}%</div>
    </div>
  `).join('');
  document.getElementById('stat-online').textContent = state.poles.filter(p => p.online).length;
  document.getElementById('stat-offline').textContent = state.poles.filter(p => !p.online).length;
}

function selectPole(id) {
  const isDetail = document.getElementById('page-postes').classList.contains('active');
  if (!isDetail) return;
  const pole = state.poles.find(p => p.id === id);
  if (!pole) return;
  if (state.selectedPoles.has(id)) state.selectedPoles.delete(id);
  else state.selectedPoles.add(id);

  state.currentPole = pole;
  renderPolesGrid('poles-detail');
  updateBatchBar();
  showPolePanel(pole);
}

function selectAll() {
  if (state.selectedPoles.size === state.poles.length) state.selectedPoles.clear();
  else state.poles.forEach(p => state.selectedPoles.add(p.id));
  renderPolesGrid('poles-detail');
  updateBatchBar();
}

function clearSelection() {
  state.selectedPoles.clear();
  renderPolesGrid('poles-detail');
  updateBatchBar();
  document.getElementById('pole-panel').classList.remove('active');
}

function updateBatchBar() {
  const bar = document.getElementById('batch-bar');
  const n = state.selectedPoles.size;
  if (n > 1) {
    bar.classList.add('active');
    document.getElementById('batch-label').textContent = n + ' postes selecionados';
  } else {
    bar.classList.remove('active');
  }
}

function showPolePanel(pole) {
  const panel = document.getElementById('pole-panel');
  const content = document.getElementById('pole-ctrl-content');
  panel.classList.add('active');
  content.innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">🎨 Cor do poste</div>
      <div class="color-presets">
        ${[['#39d353','🟢'],['#4090f0','🔵'],['#c060f0','🟣'],['#f0c040','🟡'],['#f04040','🔴'],['#ffffff','⚪'],['#f08040','🟠'],['#00e5ff','🩵']].map(([c,e])=>`
          <div class="color-dot${pole.color===c?' selected':''}" style="background:${c}" title="${c}" onclick="setPoleColor(${pole.id},'${c}')"></div>
        `).join('')}
        <input type="color" value="${pole.color}" onchange="setPoleColor(${pole.id},this.value)" title="Cor personalizada">
      </div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">💡 Brilho: <span id="bright-${pole.id}">${pole.brightness}%</span></div>
      <input type="range" min="0" max="100" value="${pole.brightness}" oninput="setPoleValue(${pole.id},'brightness',this.value)">
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">⚙️ Ações</div>
      <button class="ctrl-btn ${pole.locked?'red':'green'}" onclick="togglePoleLock(${pole.id})">${pole.locked?'🔓 Destravar':'🔒 Travar Cor'}</button>
      <button class="ctrl-btn" onclick="togglePoleOnline(${pole.id})">${pole.online?'⬛ Desligar':'⬜ Ligar'}</button>
      <button class="ctrl-btn" onclick="resetPole(${pole.id})">🔄 Resetar</button>
    </div>
  `;
}

function setPoleColor(id, color) {
  const pole = state.poles.find(p => p.id === id);
  if (!pole || pole.locked) { showToast('🔒 Poste travado!'); return; }
  if (color === '#f04040' && state.blockRed) {
    showToast('🛡️ Vermelho bloqueado! Use outra cor.');
    return;
  }
  pole.color = color;
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  showPolePanel(pole);
  addLog('operador', 'Cor', `${pole.name} → ${color}`, state.energy);
  sendToHardware(id, { color });
}

function setPoleValue(id, key, val) {
  const pole = state.poles.find(p => p.id === id);
  if (!pole) return;
  const parsed = parseInt(val);
  pole[key] = parsed;
  const el = document.getElementById(`bright-${id}`);
  if (el) el.textContent = val + '%';
  // O firmware usa "nivel" para brilho.
  if (key === 'brightness') sendToHardware(id, { nivel: parsed });
  else sendToHardware(id, { [key]: parsed });
}

function togglePoleLock(id) {
  const pole = state.poles.find(p => p.id === id);
  if (!pole) return;
  pole.locked = !pole.locked;
  sendToHardware(id, { travado: pole.locked });
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  showPolePanel(pole);
  addLog('operador', 'Trava', `${pole.name} ${pole.locked?'travado':'destravado'}`, state.energy);
  showToast(pole.locked ? '🔒 Poste travado!' : '🔓 Poste destravado!');
}

function togglePoleOnline(id) {
  const pole = state.poles.find(p => p.id === id);
  if (!pole) return;
  pole.online = !pole.online;
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  showPolePanel(pole);
  showToast(pole.online ? '✅ Poste ligado' : '⬛ Poste desligado');
}

function resetPole(id) {
  const pole = state.poles.find(p => p.id === id);
  if (!pole) return;
  pole.color = getEnergyColor(state.energy);
  pole.brightness = 100;
  pole.locked = false;
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  showPolePanel(pole);
  showToast('🔄 Poste resetado');
}

function batchColor(color) {
  if (color === '#f04040' && state.blockRed) { showToast('🛡️ Vermelho bloqueado!'); return; }
  state.selectedPoles.forEach(id => {
    const pole = state.poles.find(p => p.id === id);
    if (pole && !pole.locked) {
      pole.color = color;
      sendToHardware(id, { color });
    }
  });
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  addLog('operador', 'Cor', `${state.selectedPoles.size} postes → ${color}`, state.energy);
  showToast(`✅ Cor aplicada a ${state.selectedPoles.size} postes`);
}

function allPolesColor(color) {
  if (color === '#f04040' && state.blockRed) { showToast('🛡️ Vermelho bloqueado!'); return; }
  const targets = state.poles.filter(p => !p.locked);
  targets.forEach(p => { p.color = color; });
  // Dispara todos os postes em paralelo (sem await no forEach = simultâneo)
  Promise.allSettled(targets.map(p => sendToHardware(p.id, { color })));

  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  addLog('operador', 'Cor', `Todos os postes → ${color}`, state.energy);
  showToast('✅ Todos os postes: cor aplicada');
}

function toggleAllPoles(on) {
  state.poles.forEach(p => { p.online = on !== false; });
  if (on === false) {
    sendToAllPoles({ desligar: true });
  } else {
    state.poles.forEach(p => { sendToHardware(p.id, { color: p.color }); });
  }
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  showToast(on === false ? '⬛ Todos desligados' : '✅ Todos ligados');
}

function updatePolesColors() {
  if (state.mode !== 'energia' || state.activeEffect) return;
  const color = getEnergyColor(state.energy);
  state.poles.forEach(p => { if (!p.locked) p.color = color; });
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  // Mantém as barras sempre 100% cheias (exceto quando VU Meter está ativo)
  const vuAtivo = typeof vuState !== 'undefined' && vuState.active;
  if (!vuAtivo) sendToAllPoles({ nivel: 100 });
}

window.renderPolesGrid = renderPolesGrid;
window.selectPole = selectPole;
window.selectAll = selectAll;
window.clearSelection = clearSelection;
window.batchColor = batchColor;
window.allPolesColor = allPolesColor;
window.toggleAllPoles = toggleAllPoles;
window.updatePolesColors = updatePolesColors;
window.setPoleColor = setPoleColor;
window.setPoleValue = setPoleValue;
window.togglePoleLock = togglePoleLock;
window.togglePoleOnline = togglePoleOnline;
window.resetPole = resetPole;
window.updateBatchBar = updateBatchBar;
window.showPolePanel = showPolePanel;


