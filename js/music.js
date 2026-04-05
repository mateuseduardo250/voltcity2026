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

// =================== INDEXEDDB — ÁUDIO PERSISTENTE ===================
const IDB_NAME    = 'voltcity_audio';
const IDB_VERSION = 1;
const IDB_STORE   = 'audio_files';

function openAudioDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE))
        db.createObjectStore(IDB_STORE, { keyPath: 'fileName' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function saveAudioToDB(fileName, arrayBuffer) {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ fileName, data: arrayBuffer });
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

async function loadAudioFromDB(fileName) {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(fileName);
    req.onsuccess = e => resolve(e.target.result ? e.target.result.data : null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function removeAudioFromDB(fileName) {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(fileName);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

async function clearAudioDB() {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

// ---- Carrega arquivos de audio ----
async function loadMusicFiles(files) {
  const arr = Array.from(files);
  let count = 0;
  for (const file of arr) {
    try {
      const cleanName  = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      const arrayBuffer = await file.arrayBuffer();
      await saveAudioToDB(file.name, arrayBuffer);
      const blob = new Blob([arrayBuffer], { type: file.type || 'audio/*' });
      const url  = URL.createObjectURL(blob);

      const exists = musicState.playlist.find(s => s.fileName === file.name);
      if (exists) {
        exists.url = url;
      } else {
        musicState.playlist.push({
          fileName: file.name,
          name:     cleanName,
          bpm:      120,
          style:    'flash',
          url,
        });
      }
      count++;
    } catch (e) {
      console.warn('Erro ao carregar:', file.name, e);
    }
  }
  saveMusicMeta();
  renderPlaylist();
  showToast('🎵 ' + count + ' música(s) salva(s) no app!');
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

// ---- Carrega metadados + restaura áudio do IndexedDB ----
async function loadMusicMeta() {
  try {
    const raw = localStorage.getItem('voltcity_playlist');
    if (!raw) return;
    const meta = JSON.parse(raw);

    for (const m of meta) {
      const entry = { ...m, url: null };
      musicState.playlist.push(entry);

      // Tenta restaurar o áudio salvo
      const buf = await loadAudioFromDB(m.fileName).catch(() => null);
      if (buf) {
        const blob  = new Blob([buf], { type: 'audio/*' });
        entry.url   = URL.createObjectURL(blob);
      }
    }
    renderPlaylist();
    if (musicState.playlist.some(s => s.url))
      showToast('🎵 Playlist restaurada automaticamente!');
  } catch(e) {
    console.warn('Erro ao restaurar playlist:', e);
  }
}

// ---- Render da playlist ----
function renderPlaylist() {
  const container = document.getElementById('music-playlist');
  if (!container) return;
  if (musicState.playlist.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:14px;">Clique em <b>+ Adicionar Músicas</b> para carregar seus arquivos de áudio.<br><span style="font-size:12px;opacity:.7;">As músicas ficam salvas automaticamente no app.</span></div>';
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
  return {flash:'Flash',sequencia:'Sequência',alternado:'Alternado',arcoiris:'Arco-íris',carga:'Carga'}[s] || s;
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

  // Não inicia efeitos visuais automaticamente ao tocar música.
  // A reação das luzes fica sob controle do VU Meter / modos explícitos.
  stopMusicBPM();
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
    if (vuState.active) stopVUMeter();
    stopMusicBPM();
    document.getElementById('btn-play-pause').textContent = '▶';
    document.getElementById('music-bpm-live').textContent = 'pausado';
  } else {
    audio.play();
    musicState.playing = true;
    const song = musicState.playlist[musicState.current];
    // Não inicia efeitos visuais automaticamente ao tocar música.
  // A reação das luzes fica sob controle do VU Meter / modos explícitos.
  stopMusicBPM();
    document.getElementById('btn-play-pause').textContent = '⏸';
  }
  renderPlaylist();
}

function musicStop() {
  if (vuState.active) stopVUMeter();
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
  bars.forEach(b => {
    const h = Math.random() * 20 + 6;
    b.style.height  = h + 'px';
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
    // Não inicia efeitos visuais automaticamente ao tocar música.
  // A reação das luzes fica sob controle do VU Meter / modos explícitos.
  stopMusicBPM();
    updatePlayerUI(song);
  }
  showToast('✅ Música atualizada!');
}

function closeEditMusic() {
  document.getElementById('music-edit-modal').style.display = 'none';
}

function removeTrack(idx) {
  if (idx === musicState.current) musicStop();
  const song = musicState.playlist[idx];
  removeAudioFromDB(song.fileName).catch(() => {});
  musicState.playlist.splice(idx, 1);
  if (musicState.current > idx) musicState.current--;
  saveMusicMeta();
  renderPlaylist();
}

function clearPlaylist() {
  musicStop();
  musicState.playlist = [];
  saveMusicMeta();
  clearAudioDB().catch(() => {});
  renderPlaylist();
  showToast('🗑 Playlist limpa');
}

// =================== VU METER (lê o áudio da música em tempo real) ===================
// O VU Meter conecta diretamente no player de música e analisa o volume real,
// mandando o nível das barras dos postes para cima e para baixo com a batida.
const vuState = {
  active:        false,
  ctx:           null,
  analyser:      null,
  source:        null,
  frame:         null,
  currentNivel:  0,
  lastSentNivel: -1,
  lastSendTime:  0,
  // Beat detection para flash de cor
  energyHistory: new Array(30).fill(0),
  lastBeat:      0,
  beatCount:     0,
  cooldown:      250,    // ms mínimo entre flashes de cor
};

function setupVUAnalyser() {
  // Só configura uma vez — não pode criar duas vezes na mesma música
  if (vuState.ctx) return;
  vuState.ctx      = new (window.AudioContext || window.webkitAudioContext)();
  vuState.analyser = vuState.ctx.createAnalyser();
  vuState.analyser.fftSize = 1024;                   // Precisão da análise de frequência
  vuState.analyser.smoothingTimeConstant = 0.7;      // Suaviza as variações bruscas
  vuState.source   = vuState.ctx.createMediaElementSource(audio); // Conecta ao player
  vuState.source.connect(vuState.analyser);
  vuState.analyser.connect(vuState.ctx.destination); // Mantém o som saindo pelos alto-falantes
}

function toggleVUMeter() {
  if (vuState.active) stopVUMeter();
  else startVUMeter();
}

function applyVUNivel(nivel, syncHardware = true) {
  const safeNivel = Math.max(0, Math.min(100, nivel));
  state.poles.forEach(p => { p.brightness = safeNivel; });
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
  if (syncHardware) sendToAllPoles({ nivel: safeNivel });
}

async function startVUMeter() {
  if (!musicState.playing) {
    showToast('⚠ Coloque uma música para tocar primeiro!');
    return;
  }
  // Evita conflito com qualquer efeito de BPM automático.
  stopMusicBPM();
  try {
    setupVUAnalyser();
  } catch(e) {
    showToast('⚠ VU Meter não disponível neste navegador');
    return;
  }
  // Retoma o AudioContext se estava suspenso (política do navegador)
  if (vuState.ctx.state === 'suspended') {
    try {
      await vuState.ctx.resume();
    } catch (e) {
      showToast('⚠ Não consegui ativar o áudio para o VU Meter');
      return;
    }
  }

  vuState.active        = true;
  vuState.currentNivel  = 0;
  vuState.lastSentNivel = -1;
  vuState.beatCount     = 0;
  vuState.lastBeat      = 0;
  vuState.energyHistory.fill(0);
  vuState.beatCount     = 0;
  vuState.lastBeat      = 0;
  vuState.energyHistory.fill(0);

  const dataArray = new Uint8Array(vuState.analyser.frequencyBinCount);

  function tick() {
    if (!vuState.active) return;
    vuState.frame = requestAnimationFrame(tick);

    // Lê os dados de frequência do áudio neste momento
    vuState.analyser.getByteFrequencyData(dataArray);

    // Foca nas frequências graves (30–300Hz) — onde fica o bumbo e o bass
    const binHz = vuState.ctx.sampleRate / vuState.analyser.fftSize;
    const lo = Math.max(0, Math.floor(30 / binHz));
    const hi = Math.min(dataArray.length - 1, Math.floor(300 / binHz));

    let energy = 0;
    for (let i = lo; i <= hi; i++) energy += dataArray[i];
    energy /= (hi - lo + 1);

    // Converte energia (0–255) para nível de barra (0–100)
    const targetNivel = Math.min(100, Math.round((energy / 180) * 100));

    // Sobe rápido, desce devagar — como um VU meter de verdade
    if (targetNivel > vuState.currentNivel) {
      vuState.currentNivel = vuState.currentNivel * 0.2 + targetNivel * 0.8;
    } else {
      vuState.currentNivel = vuState.currentNivel * 0.88 + targetNivel * 0.12;
    }

    // Arredonda de 5 em 5 para não mandar updates desnecessários
    const roundedNivel = Math.round(vuState.currentNivel / 5) * 5;
    const now = Date.now();

    // Manda nivel pro hardware no máximo a cada 120ms
    if (roundedNivel !== vuState.lastSentNivel && now - vuState.lastSendTime > 120) {
      sendToAllPoles({ nivel: roundedNivel });
      vuState.lastSentNivel = roundedNivel;
      vuState.lastSendTime  = now;
    }

    // Detecção de batida para flash de cor (VU + Flash)
    vuState.energyHistory.shift();
    vuState.energyHistory.push(energy);
    const avg = vuState.energyHistory.reduce((a, b) => a + b, 0) / vuState.energyHistory.length;

    if (energy > avg * 1.4 && energy > 20 && now - vuState.lastBeat > vuState.cooldown) {
      vuState.lastBeat = now;
      const cor = MUSIC_COLORS[vuState.beatCount % MUSIC_COLORS.length];
      sendToAllPoles({ color: cor });
      state.poles.forEach(p => { p.color = cor; });
      renderPolesGrid('poles-mini');
      renderPolesGrid('poles-detail');
      vuState.beatCount++;
    }
  }

  tick();

  const btn = document.getElementById('btn-vu-toggle');
  if (btn) { btn.textContent = '🔴 Parar VU Meter'; btn.style.background = '#c0253a'; }
  showToast('📊 VU Meter ativado! Barras dançam com a música.');
}

function stopVUMeter() {
  vuState.active = false;
  if (vuState.frame) cancelAnimationFrame(vuState.frame);
  vuState.frame         = null;
  vuState.currentNivel  = 0;
  vuState.lastSentNivel = -1;
  applyVUNivel(0, true);

  const btn = document.getElementById('btn-vu-toggle');
  if (btn) { btn.textContent = '📊 Ativar VU Meter'; btn.style.background = ''; }
  showToast('📊 VU Meter desativado');
}

// =================== MODO MICROFONE ===================
const micState = {
  active:        false,
  audioCtx:      null,
  analyser:      null,
  source:        null,
  stream:        null,
  animFrame:     null,
  beat:          0,
  lastBeat:      0,
  energyHistory: new Array(30).fill(0),
  freqBand:      'grave',
  style:         'flash',
  sensitivity:   1.4,
  cooldown:      300,
  // para estilo carga
  currentNivel:  0,
  lastSentNivel: -1,
  lastNivelSend: 0,
};

async function toggleMic() {
  if (micState.active) stopMic();
  else await startMic();
}

async function startMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    micState.analyser = micState.audioCtx.createAnalyser();
    micState.analyser.fftSize = 2048;
    micState.analyser.smoothingTimeConstant = 0.4;
    micState.source = micState.audioCtx.createMediaStreamSource(stream);
    micState.source.connect(micState.analyser);
    micState.stream = stream;
    micState.active = true;
    micState.beat = 0;
    micState.lastBeat = 0;
    micState.currentNivel = 0;
    micState.lastSentNivel = -1;
    micState.energyHistory.fill(0);

    const btn = document.getElementById('btn-mic-toggle');
    if (btn) { btn.textContent = '🔴 Parar Microfone'; btn.style.background = '#c0253a'; }
    const status = document.getElementById('mic-status');
    if (status) status.textContent = 'Ouvindo...';

    detectMicBeats();
    showToast('🎤 Microfone ativado!');
  } catch (e) {
    showToast('⚠ Permissão de microfone negada');
  }
}

function stopMic() {
  if (micState.animFrame) cancelAnimationFrame(micState.animFrame);
  if (micState.source)    micState.source.disconnect();
  if (micState.stream)    micState.stream.getTracks().forEach(t => t.stop());
  if (micState.audioCtx)  micState.audioCtx.close();
  micState.active    = false;
  micState.audioCtx  = null;
  micState.analyser  = null;
  micState.source    = null;
  micState.stream    = null;
  micState.animFrame = null;

  const btn = document.getElementById('btn-mic-toggle');
  if (btn) { btn.textContent = '🎤 Ativar Microfone'; btn.style.background = ''; }
  const status = document.getElementById('mic-status');
  if (status) status.textContent = 'Inativo';
  const bar = document.getElementById('mic-level-bar');
  if (bar) bar.style.width = '0%';
  showToast('🎤 Microfone desativado');
}

function getMicBinRange() {
  const sr    = micState.audioCtx.sampleRate;
  const fft   = micState.analyser.fftSize;
  const binHz = sr / fft;
  const max   = micState.analyser.frequencyBinCount - 1;
  const hz2bin = hz => Math.min(Math.round(hz / binHz), max);
  switch (micState.freqBand) {
    case 'grave': return [hz2bin(30),   hz2bin(200)];
    case 'medio': return [hz2bin(200),  hz2bin(2000)];
    case 'agudo': return [hz2bin(2000), hz2bin(8000)];
    default:      return [0,            hz2bin(5000)];
  }
}

function detectMicBeats() {
  const analyser  = micState.analyser;
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function tick() {
    if (!micState.active) return;
    micState.animFrame = requestAnimationFrame(tick);

    analyser.getByteFrequencyData(dataArray);
    const [lo, hi] = getMicBinRange();

    let energy = 0;
    for (let i = lo; i <= hi; i++) energy += dataArray[i];
    energy /= (hi - lo + 1);

    // Histórico para média dinâmica
    micState.energyHistory.shift();
    micState.energyHistory.push(energy);
    const avg = micState.energyHistory.reduce((a, b) => a + b, 0) / micState.energyHistory.length;

    // Barra de nível visual
    const bar = document.getElementById('mic-level-bar');
    if (bar) bar.style.width = Math.min((energy / 1.28), 100).toFixed(1) + '%';

    // Estilo CARGA: nível segue a energia continuamente (sem esperar batida)
    if (micState.style === 'carga') {
      const targetNivel = Math.min(100, Math.round((energy / 200) * 100));
      // Sobe rápido, desce devagar (efeito VU meter)
      if (targetNivel > micState.currentNivel) {
        micState.currentNivel = micState.currentNivel * 0.3 + targetNivel * 0.7;
      } else {
        micState.currentNivel = micState.currentNivel * 0.85 + targetNivel * 0.15;
      }
      const roundedNivel = Math.round(micState.currentNivel / 5) * 5;
      const now = Date.now();
      if (roundedNivel !== micState.lastSentNivel && now - micState.lastNivelSend > 120) {
        sendToAllPoles({ nivel: roundedNivel });
        micState.lastSentNivel = roundedNivel;
        micState.lastNivelSend = now;
      }
      return; // Não processa detecção de batida no modo carga
    }

    // Detecção de batida para os outros estilos
    const now = Date.now();
    if (energy > avg * micState.sensitivity && energy > 15 && now - micState.lastBeat > micState.cooldown) {
      micState.lastBeat = now;
      onMicBeat(energy);
    }
  }

  tick();
}

function onMicBeat(energy) {
  // Pisca indicador visual
  const dot = document.getElementById('mic-beat-dot');
  if (dot) {
    dot.style.background = '#f04040';
    dot.style.boxShadow  = '0 0 8px #f04040';
    setTimeout(() => {
      if (dot) { dot.style.background = ''; dot.style.boxShadow = ''; }
    }, 120);
  }

  const beat  = micState.beat;
  const poles = state.poles;
  const style = micState.style;

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

  micState.beat++;
  renderPolesGrid('poles-mini');
  renderPolesGrid('poles-detail');
}

function setMicBand(band) {
  micState.freqBand = band;
  document.querySelectorAll('.mic-band-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('mic-band-' + band);
  if (btn) btn.classList.add('active');
}

function setMicStyle(style) {
  micState.style = style;
  // Zera nível ao trocar estilo
  micState.currentNivel  = 0;
  micState.lastSentNivel = -1;
}

function setMicSensitivity(val) {
  micState.sensitivity = 1.9 - (val / 10) * 0.8;
  micState.cooldown    = Math.round(500 - val * 35);
}

// Parar mic ao mudar de aba
window.addEventListener('voltcity:pagechange', () => { if (micState.active) stopMic(); });

// Parar música ao sair da aba
const _origShowPage = window.showPage;
if (_origShowPage) {
  window.showPage = function(page) {
    _origShowPage(page);
  };
}

// Inicializa ao carregar
document.addEventListener('DOMContentLoaded', loadMusicMeta);

window.toggleVUMeter     = toggleVUMeter;
window.stopVUMeter       = stopVUMeter;
window.toggleMic         = toggleMic;
window.stopMic           = stopMic;
window.setMicBand        = setMicBand;
window.setMicStyle       = setMicStyle;
window.setMicSensitivity = setMicSensitivity;
window.loadMusicFiles    = loadMusicFiles;
window.musicPlay         = musicPlay;
window.togglePlayPause   = togglePlayPause;
window.musicStop         = musicStop;
window.musicNext         = musicNext;
window.musicPrev         = musicPrev;
window.openEditMusic     = openEditMusic;
window.saveEditMusic     = saveEditMusic;
window.closeEditMusic    = closeEditMusic;
window.removeTrack       = removeTrack;
window.clearPlaylist     = clearPlaylist;








