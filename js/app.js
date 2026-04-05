'use strict';

// =================== INIT ===================
function removeManualModeUI() {
  document.querySelectorAll('button').forEach(btn => {
    const txt = (btn.textContent || '').toLowerCase();
    const oc  = (btn.getAttribute('onclick') || '').toLowerCase();
    if (txt.includes('modo manual') || oc.includes('manual')) btn.remove();
  });
}

function init() {
  removeManualModeUI();
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  renderLogs();
  updateEnergyUI();
  updateAlerts();
  startAutoDecay();
  // Garante que as barras dos postes começam 100% cheias ao abrir o app
  setTimeout(() => {
    sendToAllPoles({ nivel: 100 });
    state.poles.forEach(p => { p.brightness = 100; });
  }, 2000);
}

window.init = init;
window.removeManualModeUI = removeManualModeUI;
document.addEventListener('DOMContentLoaded', removeManualModeUI);
