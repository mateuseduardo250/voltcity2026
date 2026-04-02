'use strict';

// =================== CONFIGURAÇÃO DOS RASPBERRY PI ===================
const RASPBERRY_IPS = {
  1: 'http://100.69.187.24:5000',   // raspberrypi
  2: 'http://100.86.192.123:5000',  // raspberrypi-1
  3: 'http://100.76.76.102:5000',   // poste03
  4: 'http://100.74.127.104:5000',  // atibaiaposte1
};

const COLOR_MAP = {
  '#39d353': 'verde',
  '#f04040': 'vermelho',
  '#4090f0': 'azul',
  '#f0c040': 'amarelo',
  '#c060f0': 'rosa',
  '#ffffff': 'branco',
  '#00e5ff': 'ciano',
  '#0a0a2a': 'desligado',
  '#333':    'desligado',
};

function hexToNomeCor(hex) {
  return COLOR_MAP[String(hex).toLowerCase()] || 'verde';
}

// ---- Fetch com timeout + retry automático ----
const REQUEST_TIMEOUT_MS = 8000;

function fetchTimed(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

async function fetchWithRetry(url, options, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchTimed(url, options);
    } catch (e) {
      if (i < retries) await new Promise(r => setTimeout(r, 400));
      else throw e;
    }
  }
}

// Envia um comando para UM poste específico
async function sendToHardware(poleId, cmd) {
  const ip = RASPBERRY_IPS[poleId];
  if (!ip || ip.includes('XXX')) {
    console.log('[Volt City] Poste ' + poleId + ': IP não configurado ainda.');
    return;
  }
  try {
    if (cmd.color) {
      const nomeCor = hexToNomeCor(cmd.color);
      await fetchWithRetry(`${ip}/cor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cor: nomeCor })
      });
      console.log('[Volt City] Poste ' + poleId + ' → cor: ' + nomeCor);
    }
    if (cmd.nivel !== undefined) {
      await fetchWithRetry(`${ip}/nivel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nivel: cmd.nivel })
      });
    }
    if (cmd.efeito) {
      await fetchWithRetry(`${ip}/efeito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ efeito: cmd.efeito })
      });
    }
    if (cmd.travado !== undefined) {
      await fetchWithRetry(`${ip}/travar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travado: cmd.travado })
      });
    }
  } catch (e) {
    console.warn('[Volt City] Poste ' + poleId + ': sem resposta (' + ip + ')');
  }
}

// Envia um comando para TODOS os postes — em paralelo (muito mais rápido!)
async function sendToAllPoles(cmd) {
  const entries = Object.entries(RASPBERRY_IPS).filter(([, ip]) => !ip.includes('XXX'));

  const tasks = entries.map(async ([poleId, ip]) => {
    try {
      if (cmd.efeito) {
        await fetchWithRetry(`${ip}/efeito`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ efeito: cmd.efeito })
        });
      }
      if (cmd.parar) {
        await fetchWithRetry(`${ip}/parar`, { method: 'POST' });
      }
      if (cmd.desligar) {
        await fetchWithRetry(`${ip}/desligar`, { method: 'POST' });
      }
      if (cmd.nivel !== undefined) {
        await fetchWithRetry(`${ip}/nivel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nivel: cmd.nivel })
        });
      }
      if (cmd.color) {
        const nomeCor = hexToNomeCor(cmd.color);
        await fetchWithRetry(`${ip}/cor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cor: nomeCor })
        });
      }
    } catch (e) {
      console.warn('[Volt City] Poste ' + poleId + ': sem resposta na ação em grupo');
    }
  });

  await Promise.allSettled(tasks);
}

window.sendToHardware = sendToHardware;
window.sendToAllPoles = sendToAllPoles;
