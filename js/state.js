'use strict';

// =================== STATE ===================
// Mantém o estado da aplicação em um único lugar.
window.state = {
  energy: 75,
  mode: 'energia',
  frozen: false,
  fixed100: false,
  blockRed: false,
  activeEffect: null,
  effectInterval: null,
  waveIndex: 0,
  selectedPoles: new Set(),
  currentPole: null,
  logs: [],
  poles: [
    { id: 1, name: 'Poste 1', color: '#39d353', brightness: 100, locked: false, online: true, effect: null },
    { id: 2, name: 'Poste 2', color: '#39d353', brightness: 100, locked: false, online: true, effect: null },
    { id: 3, name: 'Poste 3', color: '#39d353', brightness: 100, locked: false, online: true, effect: null },
    { id: 4, name: 'Poste 4', color: '#39d353', brightness: 100, locked: false, online: true, effect: null },
  ]
};
