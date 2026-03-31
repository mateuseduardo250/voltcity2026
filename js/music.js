'use strict';

// =================== PARADA MUSICAL ===================
const musicState = {
  playlist: [],      // [{name, bpm, style, file, url}]
  current: -1,
  playing: false,
  bpmInterval: null,
  beat: 0,
};

const MUSIC_COLORS = ['#f04040','#f0c040','#39d353','#4090f0','#c060f0','#ffffff','#00e5ff'];

const audio = new Audio();
audio.addEventListener('timeupdate', updateMusicProgress);
audio.addEventListener('ended', musicNext);

// ---- Carrega arquivos de audio ----
function loadMusicFiles(files) {
  Array.from(files).forEach(file => {
    const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/_/g,' ');
    // Verifica se já existe na playlist (por nome de arquivo)
    const exists = musicState.playlist.find(s => s.fileName === file.name);
    if (exists) {
      exists.file = file;
      exists.url  = URL.createObjectURL(file);
    } else {
      musicState.playlist.push({
        fileName: file.name,
        name:     cleanName,
        bpm:      120,
        style:    'flash',
        file:     file,
        url:      URL.createObjectURL(file),
      });
    }
  });
  saveMusicMeta();
  renderPlaylist();
  showToast('🎵 ' + files.length + ' música(s) carregada(s)!');
}

// ---- Salva metadados no localStorage ----
function saveMusicMeta() {
  const meta = musicState.playlist.map(s => ({
    fileName: s.fileName,
    name:     s.name,
    bpm:      s.bpm,
    style:    s.style,
  }));
  try { localStorage.setItem('voltcity_playlist', JSON.stringify(meta)); } catch(e){}
}

// ---- Carrega metadados salvos ----
function loadMusicMeta() {
  try {
    const raw = localStorage.getItem('voltcity_playlist');
    if (!raw) return;
    const meta = JSON.parse(raw);
    meta.forEach(m => {
      musicState.playlist.push({ ...m, file: null, url: null });
    });
    renderPlaylist();
  } catch(e){}
}

// ---- Render da playlist ----
function renderPlaylist() {
  const container = document.getElementById('music-playlist');
  if (!container) return;
  if (musicState.playlist.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:14px;">Clique em <b>+ Adicionar Músicas</b> para carregar seus arquivos de áudio.<br><span style="font-size:12px;opacity:.7;">Os nomes e BPMs ficam salvos automaticamente.</span></div>';
    return;
  }
  container.innerHTML = musicState.playlist.map((s, i) => {
    const isActive = i === musicState.current;
    const hasFile  = !!s.url;
    return `
    <div class="music-track ${isActive ? 'active' : ''} ${!hasFile ? 'no-file' : ''}" id="track-${i}">
      <div class="track-num">${isActive && musicState.playing ? '▶' : (i + 1)}</div>
      <div class="track-info">
        <div class="track-name">${s.name}</div>
        <div class="track-meta">
          <span class="track-bpm-badge">${s.bpm} BPM</span>
          <span class="track-style-badge">${styleLabel(s.style)}</span>
          ${!hasFile ? '<span style="color:#f04040;font-size:11px;">⚠ arquivo não carregado</span>' : ''}
        </div>
      </div>
      <div class="track-actions">
        <button onclick="musicPlay(${i})" title="Tocar" ${!hasFile?'disabled':''}>▶</button>
        <button onclick="openEditMusic(${i})" title="Editar">✏️</button>
        <button onclick="removeTrack(${i})" title="Remover">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function styleLabel(s) {
  return {flash:'Flash',sequencia:'Sequência',alternado:'Alternado',arcoiris:'Arco-íris'}[s] || s;
}

// ---- Controles de reprodução ----
function musicPlay(idx) {
  if (idx < 0 || idx >= musicState.playlist.length) return;
  const song = musicState.playlist[idx];
  if (!song.url) { showToast('⚠ Recarregue o arquivo desta música'); return; }

  musicState.current = idx;
  musicState.playing = true;

  audio.src = song.url;
  audio.play().catch(() => showToast('Erro ao reproduzir'));

  startMusicBPM(song.bpm, song.style);
  updatePlayerUI(song);
  renderPlaylist();
  addLog('operador', 'Música', 'Tocando: ' + song.name + ' (' + song.bpm + ' BPM)', state.energy);
}

function togglePlayPause() {
  if (musicState.current < 0) {
    if (musicState.playlist.length > 0) musicPlay(0);
    return;
  }
  if (musicState.playing) {
    audio.pause();
    musicState.playing = false;
    stopMusicBPM();
    document.getElementById('btn-play-pause').textContent = '▶';
    document.getElementById('music-bpm-live').textContent = 'pausado';
  } else {
    audio.play();
    musicState.playing = true;
    const song = musicState.playlist[musicState.current];
    startMusicBPM(song.bpm, song.style);
    document.getElementById('btn-play-pause').textContent = '⏸';
  }
  renderPlaylist();
}

function musicStop() {
  audio.pause();
  audio.currentTime = 0;
  musicState.playing = false;
  musicState.current = -1;
  stopMusicBPM();
  stopBPM && stopBPM();
  document.getElementById('btn-play-pause').textContent = '▶';
  document.getElementById('music-now-title').textContent = 'Nenhuma música selecionada';
  document.getElementById('music-now-bpm').textContent   = '— BPM';
  document.getElementById('music-progress-bar').style.width = '0%';
  document.getElementById('music-time-cur').textContent   = '0:00';
  document.getElementById('music-time-total').textContent = '0:00';
  document.getElementById('music-bpm-live').textContent   = 'parado';
  renderPlaylist();
  showToast('⏹ Parado');
}

function musicNext() {
  if (musicState.playlist.length === 0) return;
  let next = (musicState.current + 1) % musicState.playlist.length;
  musicPlay(next);
}

function musicPrev() {
  if (musicState.playlist.length === 0) return;
  let prev = musicState.current <= 0 ? musicState.playlist.length - 1 : musicState.current - 1;
  musicPlay(prev);
}

// ---- Atualiza UI do player ----
function updatePlayerUI(song) {
  document.getElementById('music-now-title').textContent = song.name;
  document.getElementById('music-now-bpm').textContent   = song.bpm + ' BPM · ' + styleLabel(song.style);
  document.getElementById('btn-play-pause').textContent  = '⏸';
  document.getElementById('music-album-art').textContent = albumEmoji(song.name);
}

function albumEmoji(name) {
  const n = name.toLowerCase();
  if (n.includes('funk') || n.includes('baile')) return '🔥';
  if (n.includes('samba') || n.includes('pagode')) return '🥁';
  if (n.includes('forr') || n.includes('forro')) return '🎸';
  if (n.includes('rock')) return '🎸';
  if (n.includes('pop')) return '🌟';
  if (n.includes('eletr') || n.includes('rave') || n.includes('house')) return '🎛';
  if (n.includes('natal') || n.includes('noel')) return '🎄';
  return '🎵';
}

function updateMusicProgress() {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  const bar = document.getElementById('music-progress-bar');
  if (bar) bar.style.width = pct + '%';
  const cur  = document.getElementById('music-time-cur');
  const tot  = document.getElementById('music-time-total');
  if (cur) cur.textContent  = fmtTime(audio.currentTime);
  if (tot) tot.textContent  = fmtTime(audio.duration);
}

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// ---- BPM sync com postes ----
function startMusicBPM(bpm, style) {
  stopMusicBPM();
  musicState.beat = 0;
  const ms = Math.round(60000 / bpm);
  animateBpmBars();

  musicState.bpmInterval = setInterval(() => {
    const beat  = musicState.beat;
    const poles = state.poles;

    if (style === 'flash') {
      const cor = MUSIC_COLORS[beat % MUSIC_COLORS.length];
      poles.forEach(p => { p.color = cor; });
      sendToAllPoles({ color: cor });

    } else if (style === 'sequencia') {
      const idx = beat % poles.length;
      const cor = MUSIC_COLORS[beat % MUSIC_COLORS.length];
      poles.forEach((p, i) => { p.color = i === idx ? cor : '#0a0a2a'; });
      Promise.allSettled(poles.map((p, i) =>
        sendToHardware(p.id, { color: i === idx ? cor : '#0a0a2a' })
      ));

    } else if (style === 'alternado') {
      const corA = MUSIC_COLORS[beat % MUSIC_COLORS.length];
      const corB = MUSIC_COLORS[(beat + 3) % MUSIC_COLORS.length];
      poles.forEach((p, i) => { p.color = i % 2 === beat % 2 ? corA : corB; });
      Promise.allSettled(poles.map((p, i) =>
        sendToHardware(p.id, { color: i % 2 === beat % 2 ? corA : corB })
      ));

    } else if (style === 'arcoiris') {
      poles.forEach((p, i) => { p.color = MUSIC_COLORS[(beat + i) % MUSIC_COLORS.length]; });
      Promise.allSettled(poles.map((p, i) =>
        sendToHardware(p.id, { color: MUSIC_COLORS[(beat + i) % MUSIC_COLORS.length] })
      ));
    }

    musicState.beat++;
    renderPolesGrid('poles-mini');
    renderPolesGrid('poles-detail');
    animateBpmBars();
    const live = document.getElementById('music-bpm-live');
    if (live) live.textContent = bpm + ' BPM ♪';
  }, ms);
}

function stopMusicBPM() {
  if (musicState.bpmInterval) { clearInterval(musicState.bpmInterval); musicState.bpmInterval = null; }
  musicState.beat = 0;
}

function animateBpmBars() {
  const bars = document.querySelectorAll('.bpm-bar');
  bars.forEach((b, i) => {
    const h = Math.random() * 20 + 6;
    b.style.height = h + 'px';
    b.style.opacity = (0.4 + Math.random() * 0.6).toFixed(2);
  });
}

// ---- Editar música ----
function openEditMusic(idx) {
  const s = musicState.playlist[idx];
  document.getElementById('edit-music-idx').value   = idx;
  document.getElementById('edit-music-name').value  = s.name;
  document.getElementById('edit-music-bpm').value   = s.bpm;
  document.getElementById('edit-music-style').value = s.style;
  document.getElementById('music-edit-modal').style.display = 'flex';
}

function saveEditMusic() {
  const idx   = parseInt(document.getElementById('edit-music-idx').value);
  const song  = musicState.playlist[idx];
  song.name   = document.getElementById('edit-music-name').value.trim() || song.name;
  song.bpm    = parseInt(document.getElementById('edit-music-bpm').value) || 120;
  song.style  = document.getElementById('edit-music-style').value;
  closeEditMusic();
  saveMusicMeta();
  renderPlaylist();
  if (idx === musicState.current && musicState.playing) {
    startMusicBPM(song.bpm, song.style);
    updatePlayerUI(song);
  }
  showToast('✅ Música atualizada!');
}

function closeEditMusic() {
  document.getElementById('music-edit-modal').style.display = 'none';
}

function removeTrack(idx) {
  if (idx === musicState.current) musicStop();
  musicState.playlist.splice(idx, 1);
  if (musicState.current > idx) musicState.current--;
  saveMusicMeta();
  renderPlaylist();
}

function clearPlaylist() {
  musicStop();
  musicState.playlist = [];
  saveMusicMeta();
  renderPlaylist();
  showToast('🗑 Playlist limpa');
}

// Parar música ao sair da aba
const _origShowPage = window.showPage;
if (_origShowPage) {
  window.showPage = function(page) {
    if (page !== 'musica' && musicState.playing) {
      // Música continua tocando ao sair da aba, apenas avisa
    }
    _origShowPage(page);
  };
}

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', loadMusicMeta);

window.loadMusicFiles  = loadMusicFiles;
window.musicPlay       = musicPlay;
window.togglePlayPause = togglePlayPause;
window.musicStop       = musicStop;
window.musicNext       = musicNext;
window.musicPrev       = musicPrev;
window.openEditMusic   = openEditMusic;
window.saveEditMusic   = saveEditMusic;
window.closeEditMusic  = closeEditMusic;
window.removeTrack     = removeTrack;
window.clearPlaylist   = clearPlaylist;
