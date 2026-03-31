'use strict';

// =================== LOGIN ===================
function doLogin() {
  const u = document.getElementById('login-user').value;
  const p = document.getElementById('login-pass').value;
  if (u === 'jotaadm' && p === 'taua123') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('user-badge').textContent = '👤 ' + u;
    addLog(u, 'Login', 'Operador entrou no sistema', state.energy);
    init();
  } else {
    showToast('❌ Usuário ou senha incorretos');
  }
}

function doLogout() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// Enter no campo de senha
(function bindLoginEnter(){
  const el = document.getElementById('login-pass');
  if (!el) return;
  el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
})();

window.doLogin = doLogin;
window.doLogout = doLogout;
