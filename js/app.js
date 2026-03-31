'use strict';

// =================== INIT ===================
function init() {
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  renderLogs();
  updateEnergyUI();
  updateAlerts();
  startAutoDecay();
}

window.init = init;
