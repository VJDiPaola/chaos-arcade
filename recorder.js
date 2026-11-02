(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries(['mic','choose','start','stop','cancel','status','timer','result','preview','download','retake'].map(id => [id,$(id)]));
  const LIMIT_MS = 175000, TARGET_MS = 160000;
  let state = 'idle', screen = null, microphone = null, mixed = null, audioContext = null;
  let recorder = null, chunks = [], interval = null, deadline = null, began = 0, url = null, closing = false, endedHandler = null, stopReason = '';
  const elapsedText = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2,'0'); };
  function say(message) { ui.status.textContent = message; }
  function render() {
    ui.choose.disabled = state !== 'idle'; ui.mic.disabled = state !== 'idle';
    ui.start.disabled = state !== 'ready'; ui.stop.disabled = state !== 'recording';
    ui.cancel.hidden = state !== 'ready';
  }
  function releaseMedia() {
    clearInterval(interval); clearTimeout(deadline); interval = deadline = null;
    if (screen && endedHandler) screen.getVideoTracks().forEach(t => t.removeEventListener('ended',endedHandler));
    endedHandler = null;
    for (const stream of [screen,microphone,mixed]) if (stream) stream.getTracks().forEach(t => t.stop());
    screen = microphone = mixed = null;
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
  }
  function clearVideo() {
    ui.preview.pause(); ui.preview.removeAttribute('src'); ui.preview.load();
    ui.download.removeAttribute('href');
    if (url) URL.revokeObjectURL(url); url = null; ui.result.hidden = true;
  }
  function stop(reason) {
    if (state !== 'recording') return;
    stopReason = reason; state = 'stopping'; render(); say('Finishing your recording…');
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    releaseMedia();
  }
  ui.choose.addEventListener('click', async () => {
    state = 'choosing'; render(); say('Choose the game window or screen in the browser chooser.');
    try {
      if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) throw new Error('Screen recording is unavailable. Open this page in a current desktop browser on localhost or HTTPS.');
      screen = await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
      if (closing) { releaseMedia(); return; }
      if (ui.mic.checked) {
        say('Allow microphone access to include your narration.');
        microphone = await navigator.mediaDevices.getUserMedia({audio:true});
        if (closing) { releaseMedia(); return; }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error('This browser cannot mix microphone and screen audio.');
        audioContext = new AudioCtx();
        const destination = audioContext.createMediaStreamDestination();
        for (const sourceStream of [screen,microphone]) {
          const tracks = sourceStream.getAudioTracks();
          if (tracks.length) audioContext.createMediaStreamSource(new MediaStream(tracks)).connect(destination);
        }
        mixed = new MediaStream([...screen.getVideoTracks(),...destination.stream.getAudioTracks()]);
      }
      if (!screen.getVideoTracks().some(t => t.readyState === 'live')) throw new Error('Screen sharing ended. Choose a source again.');
      endedHandler = () => {
        if (state === 'recording') stop('Screen sharing ended.');
        else if (state === 'ready') { releaseMedia(); state = 'idle'; render(); say('Screen sharing ended. Choose a source again.'); }
      };
      screen.getVideoTracks().forEach(t => t.addEventListener('ended',endedHandler));
      state = 'ready'; render();
      say('Source selected. '+(screen.getAudioTracks().length ? 'Screen audio is available. ' : 'No screen audio was shared. ')+(microphone ? 'Microphone included. ' : 'Microphone off. ')+'Start when ready.');
    } catch (error) {
      releaseMedia(); state = 'idle'; render();
      say(error.name === 'NotAllowedError' || error.name === 'AbortError' ? 'Selection cancelled or permission denied. No recording was made. Choose again when ready.' : (error.message || 'Unable to select a recording source.'));
    }
  });
  ui.start.addEventListener('click', async () => {
    if (state !== 'ready') return;
    state = 'starting'; render();
    try {
      if (audioContext) await audioContext.resume();
      if (closing) return;
      const mime = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('WebM recording is not supported in this browser. Try a current Chrome or Edge browser.');
      recorder = new MediaRecorder(mixed || screen,{mimeType:mime}); chunks = [];
      recorder.addEventListener('dataavailable', event => { if (event.data.size) chunks.push(event.data); });
      recorder.addEventListener('error', event => { stopReason = 'Recording stopped because of a browser error. Preview any captured video before using it.'; if (state === 'recording') stop(stopReason); else releaseMedia(); });
      recorder.addEventListener('stop', () => {
        releaseMedia();
        if (closing) { chunks = []; return; }
        const blob = new Blob(chunks,{type:recorder.mimeType || mime}); chunks = []; recorder = null;
        if (!blob.size) { state = 'idle'; render(); say('No video data was captured. Choose a source and try again.'); return; }
        url = URL.createObjectURL(blob); ui.preview.src = url; ui.download.href = url;
        ui.download.download = 'chaos-arcade-demo-'+new Date().toISOString().replace(/[:.]/g,'-')+'.webm';
        ui.result.hidden = false; state = 'complete'; render(); say(stopReason+' Preview and download your video.');
      },{once:true});
      recorder.start(1000); began = performance.now(); stopReason = ''; state = 'recording'; render();
      const tick = () => { const ms = performance.now()-began; ui.timer.textContent = elapsedText(Math.min(ms,LIMIT_MS)); ui.timer.classList.toggle('warn',ms >= TARGET_MS); if (ms >= LIMIT_MS) stop('Automatically stopped at the 2:55 limit.'); };
      interval = setInterval(tick,200); deadline = setTimeout(() => stop('Automatically stopped at the 2:55 limit.'),LIMIT_MS);
      say('Recording. Aim to finish by 2:40. Use Stop here, or stop sharing in the browser.');
    } catch (error) { releaseMedia(); state = 'idle'; render(); say(error.message || 'Unable to start recording. Choose your source again.'); }
  });
  ui.stop.addEventListener('click', () => stop('Recording stopped.'));
  ui.cancel.addEventListener('click', () => { releaseMedia(); state = 'idle'; render(); say('Selection cancelled. No recording was made.'); });
  ui.retake.addEventListener('click', () => {
    if (!window.confirm('Discard this recording? Download it first if you want to keep it.')) return;
    clearVideo(); ui.timer.textContent = '0:00'; ui.timer.classList.remove('warn'); state = 'idle'; render(); say('Previous recording discarded. Choose a source for your retake.'); ui.choose.focus();
  });
  window.addEventListener('pagehide', () => { closing = true; if (recorder?.state === 'recording') recorder.stop(); releaseMedia(); clearVideo(); });
  render();
})();
