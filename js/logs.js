'use strict';

// =================== LOGS ===================
function addLog(user, type, detail, energy) {
  const now = new Date();
  state.logs.unshift({
    time: now.toLocaleTimeString('pt-BR'),
    date: now.toLocaleDateString('pt-BR'),
    user, type, detail, energy
  });
  if (state.logs.length > 100) state.logs.pop();
  renderLogs();
}

function renderLogs() {
  const tb = document.getElementById('log-table-body');
  if (!tb) return;
  const typeClass = { 'Cor':'cor','Energia':'energia','Modo':'modo','Trava':'trava','Login':'modo','Segurança':'trava','Show':'modo' };
  tb.innerHTML = state.logs.slice(0, 50).map(l => `
    <tr>
      <td>${l.date} ${l.time}</td>
      <td>${l.user}</td>
      <td><span class="log-action ${typeClass[l.type]||'cor'}">${l.type}</span></td>
      <td>${l.detail}</td>
      <td>${l.energy}%</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:20px">Nenhum evento ainda</td></tr>';
}

window.addLog = addLog;
window.renderLogs = renderLogs;
