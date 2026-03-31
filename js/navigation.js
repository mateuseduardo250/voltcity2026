'use strict';

// =================== NAVIGATION ===================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const tabs = ['dashboard','postes','show','regras','historico'];
  const idx = tabs.indexOf(page);
  document.querySelectorAll('.nav-tab')[idx]?.classList.add('active');
  if (page === 'postes') renderPolesGrid('poles-detail');
}

window.showPage = showPage;
