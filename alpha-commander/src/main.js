// ── Alpha Commander — Frontend Logic ────────────────────────────
const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { convertFileSrc } = window.__TAURI__.core;

// ── i18n ────────────────────────────────────────────────────────
const i18n = {
  es: {
    appTitle: "Alpha Commander",
    appSubtitle: "PNG → WebM con transparencia real",
    tabConvert: "🎬 Convertir",
    tabPreview: "🔍 Verificar Alpha",
    inputFolderTitle: "Carpeta de entrada",
    inputFolderPh: "Seleccioná la carpeta con los PNG...",
    outputFolderTitle: "Carpeta de salida",
    outputFolderPh: "Seleccioná dónde guardar el WebM...",
    btnBrowse: "Buscar",
    configTitle: "Configuración",
    outputNameLabel: "Nombre del WebM",
    loopBoomerang: "Loop ida y vuelta (boomerang)",
    loopHint: "El video va del frame 0 → N → 0 para un loop continuo",
    ffmpegCustom: "⚙ Ruta personalizada de FFmpeg (opcional)",
    ffmpegPh: "Ej: C:\\ffmpeg\\bin\\ffmpeg.exe",
    btnVerify: "Verificar",
    btnConvertStart: "🚀 Convertir a WebM",
    progressTitle: "Progreso",
    logTitle: "Log",
    previewTitle: "Verificar transparencia Alpha",
    previewDesc: "Cargá un archivo <strong>.webm</strong> y verificá que tenga transparencia real. El video se reproduce sobre un fondo que podés cambiar para confirmar el canal alpha.",
    previewFilePh: "Seleccioná un archivo .webm...",
    btnPickWebm: "Buscar WebM",
    previewBoxTitle: "Preview",
    bgLabel: "Fondo:",
    createdBy: "Creado por",
    
    // JS Dynamic
    ffCheck: "Verificando FFmpeg...",
    ffFound: "FFmpeg detectado:",
    ffNotFound: "FFmpeg no detectado — instalalo o configurá la ruta abajo",
    ffError: "Error verificando FFmpeg",
    pngNone: "No se encontraron archivos PNG en esta carpeta",
    pngFound: "PNG encontrados:",
    pngAndMore: "... y {n} más",
    missingName: "Falta el nombre del archivo de salida",
    toastMissingName: "Escribí un nombre para el WebM",
    btnConverting: "⏳ Convirtiendo...",
    progStart: "Iniciando...",
    modeBoomerang: "Boomerang (ida y vuelta)",
    modeNormal: "Normal",
    progComplete: "¡Completado!",
    toastDone: "✓ WebM generado — podés verificarlo en la pestaña \"Verificar Alpha\"",
    progError: "Error en la conversión",
    toastError: "Error en la conversión",
    previewLoading: "⏳ Cargando video...",
    previewNoVideo: "❌ No se pudo cargar el video. Asegurate de que sea un archivo WebM válido.",
    alphaDetected: "✅ <strong>¡Transparencia detectada!</strong><br>Píxeles transparentes: {t}% · Semi-transparentes: {s}%<br><span style='font-size:11px;opacity:0.8'>Cambiá el fondo para verificar visualmente</span>",
    noAlphaDetected: "⚠️ <strong>No se detectó transparencia</strong> en el primer frame.<br><span style='font-size:11px;opacity:0.8'>El video podría no tener canal alpha, o la transparencia puede estar en otros frames.</span>",
    alphaError: "🔍 No se pudo analizar el alpha automáticamente. Verificá visualmente con los fondos.",
    play: "▶ Play",
    pause: "⏸ Pause",
    loopOn: "🔁 Loop: ON",
    loopOff: "🔁 Loop: OFF",
  },
  en: {
    appTitle: "Alpha Commander",
    appSubtitle: "PNG → WebM with real transparency",
    tabConvert: "🎬 Convert",
    tabPreview: "🔍 Verify Alpha",
    inputFolderTitle: "Input folder",
    inputFolderPh: "Select the folder containing PNGs...",
    outputFolderTitle: "Output folder",
    outputFolderPh: "Select where to save the WebM...",
    btnBrowse: "Browse",
    configTitle: "Configuration",
    outputNameLabel: "WebM Name",
    loopBoomerang: "Back and forth loop (boomerang)",
    loopHint: "The video plays from frame 0 → N → 0 for a seamless loop",
    ffmpegCustom: "⚙ Custom FFmpeg path (optional)",
    ffmpegPh: "Ex: C:\\ffmpeg\\bin\\ffmpeg.exe",
    btnVerify: "Verify",
    btnConvertStart: "🚀 Convert to WebM",
    progressTitle: "Progress",
    logTitle: "Log",
    previewTitle: "Verify Alpha Transparency",
    previewDesc: "Load a <strong>.webm</strong> file and verify it has real transparency. The video plays over a background that you can change to confirm the alpha channel.",
    previewFilePh: "Select a .webm file...",
    btnPickWebm: "Browse WebM",
    previewBoxTitle: "Preview",
    bgLabel: "Background:",
    createdBy: "Created by",
    
    // JS Dynamic
    ffCheck: "Checking FFmpeg...",
    ffFound: "FFmpeg detected:",
    ffNotFound: "FFmpeg not detected — install it or set the path below",
    ffError: "Error checking FFmpeg",
    pngNone: "No PNG files found in this folder",
    pngFound: "PNGs found:",
    pngAndMore: "... and {n} more",
    missingName: "Missing output file name",
    toastMissingName: "Enter a name for the WebM",
    btnConverting: "⏳ Converting...",
    progStart: "Starting...",
    modeBoomerang: "Boomerang (back and forth)",
    modeNormal: "Normal",
    progComplete: "Completed!",
    toastDone: "✓ WebM generated — you can verify it in the \"Verify Alpha\" tab",
    progError: "Conversion error",
    toastError: "Conversion error",
    previewLoading: "⏳ Loading video...",
    previewNoVideo: "❌ Could not load video. Make sure it's a valid WebM file.",
    alphaDetected: "✅ <strong>Transparency detected!</strong><br>Transparent pixels: {t}% · Semi-transparent: {s}%<br><span style='font-size:11px;opacity:0.8'>Change the background to verify visually</span>",
    noAlphaDetected: "⚠️ <strong>No transparency detected</strong> on the first frame.<br><span style='font-size:11px;opacity:0.8'>The video might not have an alpha channel, or transparency might be on other frames.</span>",
    alphaError: "🔍 Could not analyze alpha automatically. Verify visually with the backgrounds.",
    play: "▶ Play",
    pause: "⏸ Pause",
    loopOn: "🔁 Loop: ON",
    loopOff: "🔁 Loop: OFF",
  }
};

let currentLang = 'es';

function t(key) {
  return i18n[currentLang][key] || key;
}

function updateDOMTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  
  if (els.btnConvert && !state.converting) {
    els.btnConvert.innerHTML = `🚀 ${t('btnConvertStart')}`;
  } else if (els.btnConvert && state.converting) {
    els.btnConvert.textContent = t('btnConverting');
  }

  if (els.btnPlayPause) {
    els.btnPlayPause.textContent = previewState.playing ? t('pause') : t('play');
  }
  if (els.btnLoop) {
    els.btnLoop.textContent = previewState.looping ? t('loopOn') : t('loopOff');
  }
}

// ── State ───────────────────────────────────────────────────────
let state = {
  inputFolder: '',
  outputFolder: '',
  pngCount: 0,
  ffmpegOk: false,
  ffmpegPath: '',
  converting: false,
  lastOutputPath: '',
};

// ── DOM refs ────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  inputFolder: $('inputFolder'),
  outputFolder: $('outputFolder'),
  outputName: $('outputName'),
  fps: $('fps'),
  boomerang: $('boomerang'),
  ffmpegPath: $('ffmpegPath'),
  btnInputFolder: $('btnInputFolder'),
  btnOutputFolder: $('btnOutputFolder'),
  btnConvert: $('btnConvert'),
  btnRecheck: $('btnRecheck'),
  pngInfo: $('pngInfo'),
  ffDot: $('ffDot'),
  ffStatus: $('ffStatus'),
  ffmpegBar: $('ffmpegBar'),
  progressCard: $('progressCard'),
  progressBar: $('progressBar'),
  progressText: $('progressText'),
  logCard: $('logCard'),
  logBox: $('logBox'),
  // Preview tab
  previewFilePath: $('previewFilePath'),
  btnPickWebm: $('btnPickWebm'),
  previewCard: $('previewCard'),
  previewVideo: $('previewVideo'),
  previewBg: $('previewBg'),
  previewViewport: $('previewViewport'),
  btnPlayPause: $('btnPlayPause'),
  btnLoop: $('btnLoop'),
  previewInfo: $('previewInfo'),
  alphaVerdict: $('alphaVerdict'),
};

// ══════════════════════════════════════════════════════════════════
// TAB SYSTEM
// ══════════════════════════════════════════════════════════════════

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ══════════════════════════════════════════════════════════════════
// CONVERTER TAB
// ══════════════════════════════════════════════════════════════════

// ── Logging ─────────────────────────────────────────────────────
function log(msg, type = '') {
  els.logCard.style.display = 'block';
  const line = document.createElement('div');
  if (type) line.className = `log-${type}`;
  const ts = new Date().toLocaleTimeString();
  line.textContent = `[${ts}] ${msg}`;
  els.logBox.appendChild(line);
  els.logBox.scrollTop = els.logBox.scrollHeight;
}

// ── FFmpeg detection ────────────────────────────────────────────
async function checkFfmpeg(customPath) {
  try {
    els.ffStatus.textContent = t('ffCheck');
    const result = await invoke('detect_ffmpeg', { customPath: customPath || null });
    state.ffmpegOk = result.detected;
    state.ffmpegPath = result.path;
    if (result.detected) {
      els.ffDot.className = 'dot dd';
      els.ffStatus.textContent = `${t('ffFound')} ${result.version}`;
      els.ffmpegBar.className = 'status-bar ok';
      log(`FFmpeg: ${result.path}`, 'ok');
    } else {
      els.ffDot.className = 'dot de';
      els.ffStatus.textContent = t('ffNotFound');
      els.ffmpegBar.className = 'status-bar err';
      log('FFmpeg not found', 'err');
    }
    updateConvertButton();
  } catch (e) {
    els.ffDot.className = 'dot de';
    els.ffStatus.textContent = t('ffError');
    els.ffmpegBar.className = 'status-bar err';
    log(`FFmpeg error: ${e}`, 'err');
  }
}

// ── Folder picking ──────────────────────────────────────────────
async function pickInputFolder() {
  try {
    const folder = await invoke('pick_folder');
    if (!folder) return;
    state.inputFolder = folder;
    els.inputFolder.value = folder;
    log(`Carpeta de entrada: ${folder}`, 'info');
    await scanPngs(folder);
  } catch (e) {
    log(`Error seleccionando carpeta: ${e}`, 'err');
  }
}

async function pickOutputFolder() {
  try {
    const folder = await invoke('pick_folder');
    if (!folder) return;
    state.outputFolder = folder;
    els.outputFolder.value = folder;
    log(`Carpeta de salida: ${folder}`, 'info');
    updateConvertButton();
  } catch (e) {
    log(`Error seleccionando carpeta: ${e}`, 'err');
  }
}

// ── PNG scanning ────────────────────────────────────────────────
async function scanPngs(folder) {
  try {
    const result = await invoke('list_pngs', { folder });
    state.pngCount = result.count;
    if (result.count === 0) {
      els.pngInfo.innerHTML = `<span style="color:var(--err)">${t('pngNone')}</span>`;
      log('No PNGs found', 'warn');
    } else {
      const previewHtml = result.preview.map((f) => `<span class="files">${esc(f)}</span>`).join(', ');
      const moreText = result.count > 6 ? `<span style="color:var(--muted)"> ${t('pngAndMore').replace('{n}', result.count - 6)}</span>` : '';
      els.pngInfo.innerHTML = `<span class="count">${t('pngFound')} ${result.count}</span><br>${previewHtml}${moreText}`;
      log(`${result.count} PNGs detected`, 'ok');
    }
    updateConvertButton();
  } catch (e) {
    els.pngInfo.innerHTML = `<span style="color:var(--err)">${esc(String(e))}</span>`;
    state.pngCount = 0;
    updateConvertButton();
    log(`Error escaneando PNGs: ${e}`, 'err');
  }
}

// ── Convert button state ────────────────────────────────────────
function updateConvertButton() {
  const ready = state.inputFolder && state.outputFolder && state.pngCount > 0 && state.ffmpegOk && !state.converting;
  els.btnConvert.disabled = !ready;
}

// ── Conversion ──────────────────────────────────────────────────
async function startConversion() {
  const name = els.outputName.value.trim();
  if (!name) {
    log(t('missingName'), 'err');
    toast(t('toastMissingName'));
    return;
  }

  state.converting = true;
  updateConvertButton();
  els.btnConvert.textContent = t('btnConverting');
  els.progressCard.style.display = 'block';
  els.progressBar.style.width = '0%';
  els.progressBar.style.background = '';
  els.progressText.textContent = t('progStart');

  log(`Start: ${name}.webm`, 'info');
  log(`Mode: ${els.boomerang.checked ? t('modeBoomerang') : t('modeNormal')} | FPS: ${els.fps.value}`, 'info');

  try {
    const result = await invoke('convert_to_webm', {
      inputFolder: state.inputFolder,
      outputFolder: state.outputFolder,
      outputName: name,
      fps: parseInt(els.fps.value),
      ffmpegPath: els.ffmpegPath.value.trim() || null,
      boomerang: els.boomerang.checked,
    });

    if (result.success) {
      els.progressBar.style.width = '100%';
      els.progressText.textContent = t('progComplete');
      log(result.message, 'ok');
      toast(t('toastDone'));
      state.lastOutputPath = result.output_path;
    }
  } catch (e) {
    els.progressBar.style.width = '0%';
    els.progressBar.style.background = 'var(--err)';
    els.progressText.textContent = t('progError');
    log(`Error: ${e}`, 'err');
    toast(t('toastError'));
  } finally {
    state.converting = false;
    els.btnConvert.innerHTML = `🚀 ${t('btnConvertStart')}`;
    updateConvertButton();
  }
}

// ── Progress listener ───────────────────────────────────────────
listen('conv-progress', (event) => {
  const d = event.payload;
  if (d.pct !== undefined) {
    els.progressBar.style.width = `${d.pct}%`;
    els.progressBar.style.background = '';
  }
  if (d.msg) {
    els.progressText.textContent = d.msg;
  }
});

// ══════════════════════════════════════════════════════════════════
// PREVIEW TAB — Alpha Verification
// ══════════════════════════════════════════════════════════════════

let previewState = {
  playing: false,
  looping: true,
};

// ── Pick WebM file ──────────────────────────────────────────────
async function pickWebmFile() {
  try {
    const filePath = await invoke('pick_file');
    if (!filePath) return;
    loadPreviewVideo(filePath);
  } catch (e) {
    toast(`Error: ${e}`);
  }
}

// ── Load video into preview ─────────────────────────────────────
function loadPreviewVideo(filePath) {
  els.previewFilePath.value = filePath;
  els.previewCard.style.display = 'block';

  // Convert local file path to Tauri asset URL
  const assetUrl = convertFileSrc(filePath);
  const video = els.previewVideo;

  video.src = assetUrl;
  video.loop = previewState.looping;
  video.muted = true;

  // Set initial background
  setPreviewBg('checker');

  // Show alpha verdict as checking
  els.alphaVerdict.className = 'alpha-verdict checking';
  els.alphaVerdict.textContent = t('previewLoading');

  video.onloadedmetadata = () => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    const dur = video.duration.toFixed(2);
    els.previewInfo.textContent = `${w}×${h} · ${dur}s`;

    // Try to detect alpha by rendering a frame to canvas
    checkAlphaChannel(video);
  };

  video.onerror = () => {
    els.alphaVerdict.className = 'alpha-verdict no-alpha';
    els.alphaVerdict.textContent = t('previewNoVideo');
  };

  video.load();
}

// ── Alpha channel detection via canvas ──────────────────────────
function checkAlphaChannel(video) {
  video.currentTime = 0;

  video.onseeked = () => {
    try {
      const canvas = document.createElement('canvas');
      const w = Math.min(video.videoWidth, 320);
      const h = Math.round((w / video.videoWidth) * video.videoHeight);
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      let transparentPixels = 0;
      let semiTransparentPixels = 0;
      const totalPixels = w * h;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) transparentPixels++;
        else if (data[i] < 255) semiTransparentPixels++;
      }

      const transparentPct = ((transparentPixels / totalPixels) * 100).toFixed(1);
      const semiPct = ((semiTransparentPixels / totalPixels) * 100).toFixed(1);
      const hasAlpha = transparentPixels > 0 || semiTransparentPixels > 0;

      if (hasAlpha) {
        els.alphaVerdict.className = 'alpha-verdict has-alpha';
        els.alphaVerdict.innerHTML = t('alphaDetected')
          .replace('{t}', transparentPct)
          .replace('{s}', semiPct);
      } else {
        els.alphaVerdict.className = 'alpha-verdict no-alpha';
        els.alphaVerdict.innerHTML = t('noAlphaDetected');
      }

      // Auto-play
      video.currentTime = 0;
      video.play();
      previewState.playing = true;
      els.btnPlayPause.textContent = t('pause');
    } catch (e) {
      els.alphaVerdict.className = 'alpha-verdict checking';
      els.alphaVerdict.innerHTML = t('alphaError');
      video.play();
      previewState.playing = true;
      els.btnPlayPause.textContent = t('pause');
    }
  };
}

// ── Background switcher ─────────────────────────────────────────
function setPreviewBg(bgName) {
  els.previewBg.className = `preview-bg bg-${bgName}`;
  document.querySelectorAll('.bg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.bg === bgName);
  });
}

document.querySelectorAll('.bg-btn').forEach((btn) => {
  btn.addEventListener('click', () => setPreviewBg(btn.dataset.bg));
});

// ── Play/Pause ──────────────────────────────────────────────────
els.btnPlayPause.addEventListener('click', () => {
  const video = els.previewVideo;
  if (!video.src) return;
  if (video.paused) {
    video.play();
    previewState.playing = true;
    els.btnPlayPause.textContent = t('pause');
  } else {
    video.pause();
    previewState.playing = false;
    els.btnPlayPause.textContent = t('play');
  }
});

// ── Loop toggle ─────────────────────────────────────────────────
els.btnLoop.addEventListener('click', () => {
  previewState.looping = !previewState.looping;
  els.previewVideo.loop = previewState.looping;
  els.btnLoop.textContent = previewState.looping ? t('loopOn') : t('loopOff');
});

// ── Pick WebM button ────────────────────────────────────────────
els.btnPickWebm.addEventListener('click', pickWebmFile);

// ══════════════════════════════════════════════════════════════════
// COMMON
// ══════════════════════════════════════════════════════════════════

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Event bindings (converter) ──────────────────────────────────
els.btnInputFolder.addEventListener('click', pickInputFolder);
els.btnOutputFolder.addEventListener('click', pickOutputFolder);
els.btnConvert.addEventListener('click', startConversion);
els.btnRecheck.addEventListener('click', () => checkFfmpeg(els.ffmpegPath.value.trim()));

// ── Language Toggle ─────────────────────────────────────────────
const btnLang = document.getElementById('btnLang');
if (btnLang) {
  btnLang.addEventListener('click', () => {
    if (currentLang === 'es') {
      currentLang = 'en';
      btnLang.textContent = '🇪🇸 ES';
    } else {
      currentLang = 'es';
      btnLang.textContent = '🇺🇸 EN';
    }
    updateDOMTranslations();
    if (state.inputFolder) scanPngs(state.inputFolder);
  });
}

// ── Init ────────────────────────────────────────────────────────
updateDOMTranslations();
checkFfmpeg();
