(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('programCanvas');
  const ctx = canvas.getContext('2d');
  const fileInput = $('fileInput');
  const playlist = $('playlist');
  const statusBox = $('status');
  const crossfader = $('crossfader');
  const crossValue = $('crossValue');
  const recordBtn = $('recordBtn');
  const fullscreenBtn = $('fullscreenBtn');
  const autoMixBtn = $('autoMixBtn');
  const mixLeadTime = $('mixLeadTime');
  const mixLeadTimeLabel = $('mixLeadTimeLabel');
  const installBtn = $('installBtn');

  const effects = [
    ['normal','Normal'], ['bw','B/N'], ['sepia','Sepia'], ['neon','Neón'], ['warm','Cálido'], ['cold','Frío'],
    ['blur','Blur'], ['contrast','Contraste'], ['brightness','Brillo'], ['invert','Invertir'], ['mirror','Espejo'],
    ['rotate','Rotar'], ['zoom','Zoom beat'], ['shake','Shake'], ['pixel','Pixel'], ['glitch','Glitch'], ['trail','Trail']
  ];

const state = {
  target: 'A',
  tracks: [],
  master: 'none',
  recording: false,
  recorder: null,
  chunks: [],
  autoMix: false,
  mixLeadTime: 10,

  transitioning: false,

  loops: { A: null, B: null },
  cue: { A: 0, B: 0 },
  audioReady: false,
  audio: null,
  decks: {}
};

  function log(msg){
    const line = `[${new Date().toLocaleTimeString('es-MX')}] ${msg}`;
    statusBox.textContent = line + '\n' + statusBox.textContent;
  }

  function makeDeck(name){
    const video = $('video'+name);
    return { name, video, title: $('title'+name), effect: 'normal', volume: 1, speed: 1, filterVal: 0, panVal: 0, source: null, gain: null, pan: null, biquad: null };
  }
  state.decks.A = makeDeck('A'); state.decks.B = makeDeck('B');

  function initAudio(){
    if(state.audioReady) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audio = new AudioContext();
    for(const name of ['A','B']){
      const d = state.decks[name];
      d.source = state.audio.createMediaElementSource(d.video);
      d.gain = state.audio.createGain();
      d.pan = state.audio.createStereoPanner ? state.audio.createStereoPanner() : state.audio.createGain();
      d.biquad = state.audio.createBiquadFilter();
      d.biquad.type = 'peaking'; d.biquad.frequency.value = 1000; d.biquad.gain.value = 0;
      d.source.connect(d.biquad); d.biquad.connect(d.pan); d.pan.connect(d.gain); d.gain.connect(state.audio.destination);
      d.video.muted = false;
    }
    state.audioReady = true;
    updateAudioMix();
    log('Motor de audio activado.');
  }

  function updateAudioMix(){
    const x = Number(crossfader.value) / 100;
    const levels = { A: 1 - x, B: x };
    crossValue.textContent = `${Math.round((1-x)*100)} / ${Math.round(x*100)}`;
    for(const name of ['A','B']){
      const d = state.decks[name];
      d.video.playbackRate = d.speed;
      if(d.gain) d.gain.gain.value = d.volume * levels[name];
      if(d.pan && 'pan' in d.pan) d.pan.pan.value = d.panVal;
      if(d.biquad){
        const v = d.filterVal;
        d.biquad.type = v < 0 ? 'lowpass' : v > 0 ? 'highpass' : 'peaking';
        d.biquad.frequency.value = v === 0 ? 1000 : Math.max(80, Math.abs(v) * 70);
        d.biquad.gain.value = v === 0 ? 0 : 4;
      }
    }
  }

  function filterFor(effect){
    switch(effect){
      case 'bw': return 'grayscale(1)';
      case 'sepia': return 'sepia(1) saturate(1.4)';
      case 'neon': return 'saturate(2.5) contrast(1.6) hue-rotate(35deg)';
      case 'warm': return 'sepia(.25) saturate(1.7) hue-rotate(-12deg)';
      case 'cold': return 'saturate(1.35) hue-rotate(175deg)';
      case 'blur': return 'blur(4px)';
      case 'contrast': return 'contrast(1.9) saturate(1.4)';
      case 'brightness': return 'brightness(1.55)';
      case 'invert': return 'invert(1)';
      default: return 'none';
    }
  }

  function drawDeck(d, alpha){
    const v = d.video;
    if(v.readyState < 2 || !v.videoWidth) return;
    const w = canvas.width, h = canvas.height, t = performance.now()/1000;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = filterFor(d.effect);
    if(d.effect === 'trail') ctx.globalAlpha = alpha * .72;
    let dw = w, dh = h, dx = 0, dy = 0;
    const srcRatio = v.videoWidth / v.videoHeight, dstRatio = w / h;
    if(srcRatio > dstRatio){ dh = h; dw = h * srcRatio; dx = (w-dw)/2; }
    else { dw = w; dh = w / srcRatio; dy = (h-dh)/2; }
    if(d.effect === 'zoom'){ const z = 1 + .06 * Math.sin(t*8); dx -= dw*(z-1)/2; dy -= dh*(z-1)/2; dw *= z; dh *= z; }
    if(d.effect === 'shake'){ dx += Math.sin(t*34)*8; dy += Math.cos(t*29)*6; }
    if(d.effect === 'rotate') { ctx.translate(w/2,h/2); ctx.rotate(Math.sin(t)*.08); ctx.translate(-w/2,-h/2); }
    if(d.effect === 'mirror'){ ctx.translate(w,0); ctx.scale(-1,1); dx = w - dx - dw; }
    ctx.drawImage(v, dx, dy, dw, dh);
    if(d.effect === 'glitch'){
      ctx.globalAlpha = alpha*.45; ctx.filter = 'none';
      for(let i=0;i<6;i++){ const sy=Math.random()*h, sh=8+Math.random()*28, off=(Math.random()-.5)*42; ctx.drawImage(canvas,0,sy,w,sh,off,sy,w,sh); }
    }
    if(d.effect === 'pixel'){
      ctx.filter = 'none'; ctx.imageSmoothingEnabled = false;
      const scale = 0.08; ctx.drawImage(canvas,0,0,w*scale,h*scale); ctx.drawImage(canvas,0,0,w*scale,h*scale,0,0,w,h); ctx.imageSmoothingEnabled = true;
    }
    ctx.restore();
  }

  function render(){
    const x = Number(crossfader.value) / 100;
    if(state.master !== 'trail') ctx.clearRect(0,0,canvas.width,canvas.height);
    else { ctx.fillStyle='rgba(0,0,0,.09)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
    drawDeck(state.decks.A, 1-x);
    drawDeck(state.decks.B, x);
    applyMaster();
    handleLoops();
    if(state.autoMix) autoMixStep();
    requestAnimationFrame(render);
  }

  function applyMaster(){
    const w=canvas.width,h=canvas.height,t=performance.now()/1000;
    if(state.master==='flash' && Math.floor(t*4)%2===0){ ctx.fillStyle='rgba(255,255,255,.23)'; ctx.fillRect(0,0,w,h); }
    if(state.master==='strobe' && Math.floor(t*10)%2===0){ ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,w,h); }
    if(state.master==='invert') { ctx.globalCompositeOperation='difference'; ctx.fillStyle='white'; ctx.fillRect(0,0,w,h); ctx.globalCompositeOperation='source-over'; }
    if(state.master==='vignette') { const g=ctx.createRadialGradient(w/2,h/2,w*.18,w/2,h/2,w*.72); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.72)'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); }
  }

  function handleLoops(){
    for(const name of ['A','B']){
      const loop = state.loops[name];
      if(loop && state.decks[name].video.currentTime >= loop.end) state.decks[name].video.currentTime = loop.start;
    }
  }

function autoMixStep(){

  const a = state.decks.A.video;
  const b = state.decks.B.video;



  if(state.transitioning){
    return;
  }

if(
    a.src &&
    !a.paused &&
    a.duration &&
    (a.duration - a.currentTime)
    <
    state.mixLeadTime &&
    state.tracks.length > 1
)
  {
      startAutoTransition('A','B');
      return;
  }

if(
    b.src &&
    !b.paused &&
    b.duration &&
    (b.duration - b.currentTime)
    <
    state.mixLeadTime &&
    state.tracks.length > 1
)
  {
      startAutoTransition('B','A');
      return;
  }
}
function startAutoTransition(fromDeck, toDeck){

  if(state.transitioning) return;

log(`INICIANDO TRANSICION ${fromDeck} -> ${toDeck}`);



  state.transitioning = true;

  const fromVideo = state.decks[fromDeck].video;
  const toVideo = state.decks[toDeck].video;

  let currentIndex = currentTrackIndex(fromDeck);

  if(currentIndex < 0){
     currentIndex = 0;
  }

  const nextIndex =
    (currentIndex + 1) % state.tracks.length;

loadTrackToDeck(
  nextIndex,
  toDeck,
  true
);



toVideo.onloadeddata = async () => {

  try{

    await toVideo.play();



    log(
      `PLAY AUTOMATICO OK`
    );

    log(
      `Auto Mix: mezclando Deck ${fromDeck} hacia Deck ${toDeck}.`
    );

    const duration = 5000;

    const start = performance.now();

    function fade(now){

      const progress =
        Math.min(
          1,
          (now - start) / duration
        );

if(
  fromDeck === 'A' &&
  toDeck === 'B'
){

  const value =
    Math.round(progress * 100);

  crossfader.value = value;

  crossValue.textContent =
    `${100 - value} / ${value}`;
}

else{

  const value =
    Math.round(
      (1 - progress) * 100
    );

  crossfader.value = value;

  crossValue.textContent =
    `${value} / ${100 - value}`;
}

      updateAudioMix();

      if(progress < 1){

        requestAnimationFrame(fade);

      }
      else{

        fromVideo.pause();

        fromVideo.currentTime = 0;

        state.transitioning = false;

        log(
          `Auto Mix completado.`
        );
      }
    }

    requestAnimationFrame(fade);

    toVideo.onloadeddata = null;

  }
  catch(error){

    console.error(error);

    state.transitioning = false;

    log(
      `ERROR AUTOTRANSITION: ${error.message}`
    );
  }
};  

}

  function currentTrackIndex(deck){

  const index =
    Number(
      state.decks[deck]
      .video
      .dataset
      .index
    );

  return isNaN(index)
    ? -1
    : index;
}

  function loadTrackToDeck(index, deckName, autoplay=false){
    initAudio();
    const track = state.tracks[index]; if(!track) return;
    const d = state.decks[deckName];
    d.video.src = track.url; d.video.load(); d.title.textContent = track.name;
    d.video.dataset.index = String(index); state.cue[deckName] = 0; state.loops[deckName] = null;
    d.video.onloadedmetadata = () => log(`${track.name} cargado en Deck ${deckName} (${formatTime(d.video.duration)}).`);
    if(autoplay) d.video.play().catch(()=>log('El navegador bloqueó autoplay; presiona Play.'));
  }

  function renderPlaylist(){
    playlist.innerHTML = '';
    state.tracks.forEach((t,i)=>{
      const li = document.createElement('li'); li.className='track';
      li.innerHTML = `<span title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span><button data-load="A" data-i="${i}">A</button><button data-load="B" data-i="${i}">B</button>`;
      li.addEventListener('click', (e)=>{
        const btn = e.target.closest('button');
        const deck = btn ? btn.dataset.load : state.target;
        loadTrackToDeck(i, deck, false);
      });
      playlist.appendChild(li);
    });
  }

  function escapeHtml(str){ return str.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function formatTime(s){ if(!isFinite(s)) return '00:00'; const m=Math.floor(s/60), sec=Math.floor(s%60); return `${m}:${String(sec).padStart(2,'0')}`; }

  fileInput.addEventListener('change', () => {
    const files = [...fileInput.files];
    for(const file of files){ state.tracks.push({ name:file.name, url:URL.createObjectURL(file), file }); }
    renderPlaylist(); log(`${files.length} archivo(s) agregado(s). Da clic en A o B para cargar.`);
  });

  $('targetA').onclick = () => { state.target='A'; $('targetA').classList.add('selected'); $('targetB').classList.remove('selected'); log('Destino activo: Deck A'); };
  $('targetB').onclick = () => { state.target='B'; $('targetB').classList.add('selected'); $('targetA').classList.remove('selected'); log('Destino activo: Deck B'); };

  document.addEventListener('click', async (e)=>{
    const actionBtn = e.target.closest('[data-action]');
    if(actionBtn){
      initAudio();
      const d = state.decks[actionBtn.dataset.deck]; const v = d.video;
      if(!v.src){ log(`Deck ${d.name} no tiene video cargado.`); return; }
      const action = actionBtn.dataset.action;
      if(action==='play'){ if(v.paused) await v.play(); else v.pause(); }
      if(action==='stop'){ v.pause(); v.currentTime = 0; }
      if(action==='cue'){ state.cue[d.name] = v.currentTime; log(`Cue Deck ${d.name}: ${formatTime(v.currentTime)}`); }
      if(action==='loop'){ const start = v.currentTime; state.loops[d.name] = state.loops[d.name] ? null : {start, end:Math.min(start+8, v.duration||start+8)}; log(state.loops[d.name] ? `Loop Deck ${d.name} activado.` : `Loop Deck ${d.name} desactivado.`); }
    }
    const effectBtn = e.target.closest('[data-effect]');
    if(effectBtn){
      const d = state.decks[effectBtn.dataset.deck]; d.effect = effectBtn.dataset.effect;
      [...effectBtn.parentElement.children].forEach(b=>b.classList.toggle('active', b===effectBtn));
      log(`Deck ${d.name}: efecto ${effectBtn.textContent}.`);
    }
    const masterBtn = e.target.closest('[data-master]');
    if(masterBtn){ state.master = masterBtn.dataset.master; log(`Master FX: ${masterBtn.textContent}.`); }
  });

  for(const name of ['A','B']){
    const bank = $('effects'+name);
    effects.forEach(([key,label])=>{
      const b = document.createElement('button'); b.textContent = label; b.dataset.effect = key; b.dataset.deck = name;
      if(key==='normal') b.classList.add('active'); bank.appendChild(b);
    });
    $('volume'+name).oninput = (e)=>{ state.decks[name].volume = Number(e.target.value); updateAudioMix(); };
    $('speed'+name).oninput = (e)=>{ state.decks[name].speed = Number(e.target.value); updateAudioMix(); };
    $('filter'+name).oninput = (e)=>{ state.decks[name].filterVal = Number(e.target.value); updateAudioMix(); };
    $('pan'+name).oninput = (e)=>{ state.decks[name].panVal = Number(e.target.value); updateAudioMix(); };
  }
crossfader.oninput = updateAudioMix;

if(mixLeadTime && mixLeadTimeLabel){

  // Mostrar valor inicial al cargar
  mixLeadTimeLabel.textContent =
    `${state.mixLeadTime} seg`;

  mixLeadTime.oninput = () => {

    state.mixLeadTime =
      Number(mixLeadTime.value);

    if(state.mixLeadTime >= 60){

      mixLeadTimeLabel.textContent =
        `${(state.mixLeadTime / 60).toFixed(1)} min`;

    }else{

      mixLeadTimeLabel.textContent =
        `${state.mixLeadTime} seg`;

    }

  };

}


  fullscreenBtn.onclick = () => { if(canvas.requestFullscreen) canvas.requestFullscreen(); };
  autoMixBtn.onclick = async () => {
  initAudio();

  if(state.tracks.length < 2){
    log('Auto Mix requiere al menos 2 videos en la playlist.');
    return;
  }

  state.autoMix = !state.autoMix;
  autoMixBtn.classList.toggle('selected', state.autoMix);

  if(state.autoMix){
    log('Auto Mix activado.');

    const a = state.decks.A.video;
    const b = state.decks.B.video;

if(!a.src && !b.src){
  loadTrackToDeck(0, 'A', true);

      setTimeout(async () => {
        try {
          crossfader.value = 0;
          updateAudioMix();
          await state.decks.A.video.play();
          log('Auto Mix inició con el primer video en Deck A.');
        } catch {
          log('El navegador bloqueó la reproducción automática. Presiona Play en Deck A.');
        }
      }, 300);
    } else {
      if(a.src && a.paused && !b.src){
        crossfader.value = 0;
        updateAudioMix();

        try {
          await a.play();
          log('Auto Mix continuó reproduciendo Deck A.');
        } catch {
          log('Presiona Play en Deck A para iniciar.');
        }
      }

      if(b.src && b.paused && !a.src){
        crossfader.value = 100;
        updateAudioMix();

        try {
          await b.play();
          log('Auto Mix continuó reproduciendo Deck B.');
        } catch {
          log('Presiona Play en Deck B para iniciar.');
        }
      }
    }
  } else {
    log('Auto Mix desactivado.');
  }
};

  recordBtn.onclick = () => {
    if(!canvas.captureStream || !window.MediaRecorder){ log('Tu navegador no soporta grabación de canvas.'); return; }
    if(!state.recording){
      const stream = canvas.captureStream(30);
      state.chunks = []; state.recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      state.recorder.ondataavailable = e => { if(e.data.size) state.chunks.push(e.data); };
      state.recorder.onstop = () => {
        const blob = new Blob(state.chunks, {type:'video/webm'}); const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `dj-mix-${Date.now()}.webm`; a.click();
      };
      state.recorder.start(); state.recording = true; recordBtn.textContent = 'Detener grabación'; log('Grabando salida principal en WEBM.');
    } else { state.recorder.stop(); state.recording = false; recordBtn.textContent = 'Grabar salida'; log('Grabación finalizada.'); }
  };

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
  installBtn.onclick = async ()=>{ if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; installBtn.hidden = true; }};
  if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});

  render(); updateAudioMix();
})();
