// Animated posters: a live looping preview, and recording the loop to a video file (WebM, or MP4 in Safari).
const Animator = (() => {
  const PREVIEW_QUALITY = 0.6;
  const VIDEO_WIDTH = 1080;
  let playing = false, start = 0, busy = false;

  function animates(state) { return !!Styles.get(state.style).animated; }

  function notAnimated() { Toast.show('This style is still. Try Flow field, Op-art lines, or Topographic.'); }

  // Starts or stops the live preview.
  function toggle(state) {
    if (playing) { stop(); return; }
    if (!animates(state)) { notAnimated(); return; }
    playing = true;
    start = performance.now();
    document.body.classList.add('animating');
    Toast.show('Playing the loop. Press A to stop.');
    requestAnimationFrame(frame);
  }

  function stop() {
    if (!playing) return;
    playing = false;
    document.body.classList.remove('animating');
    App.set(App.get(), { noHistory: true, quiet: true });
  }

  // Draws the next preview frame from the current poster (settings can change while it plays).
  function frame(now) {
    if (!playing) return;
    const state = App.get();
    if (!animates(state)) { stop(); return; }
    if (!busy) {
      busy = true;
      const t = ((now - start) / 1000 / state.anim.seconds) % 1;
      try { Stage.show(Composer.build(state, { time: t, quality: PREVIEW_QUALITY })); } finally { busy = false; }
    }
    requestAnimationFrame(frame);
  }

  // Renders every frame to images first (so slow frames don't change the timing), then plays them into a recorder.
  async function record(state) {
    if (!animates(state)) { notAnimated(); return; }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { Toast.show('This browser can’t record video.'); return; }
    stop();
    const L = Pages.layout(state.page);
    const w = VIDEO_WIDTH, h = Math.round(w * L.sheet.h / L.sheet.w / 2) * 2;
    const total = Math.round(state.anim.seconds * state.anim.fps);
    let cancelled = false;
    const el = Overlay.open(`<header class="sheet-head"><h2>Export video</h2></header>
      <p class="hint" id="vidStatus">Drawing frame 1 of ${total}…</p><progress id="vidBar" max="${total * 2}" value="0" style="width:100%"></progress>
      <footer class="sheet-foot"><span class="spacer"></span><button class="ghost" data-close>Cancel</button></footer>`,
      { label: 'Export video', onClose: () => { cancelled = true; } });
    const status = el.querySelector('#vidStatus'), bar = el.querySelector('#vidBar');
    const frames = [];
    for (let i = 0; i < total && !cancelled; i++) {
      const svg = Composer.build(state, { time: i / total, exportSize: true }).svg;
      frames.push(await Exporter.rasterize(svg, w, h, 'image/jpeg', 0.92));
      bar.value = i + 1;
      status.textContent = `Drawing frame ${i + 1} of ${total}…`;
    }
    if (cancelled) return;
    status.textContent = 'Recording…';
    const file = await play(frames, w, h, state.anim.fps, i => { bar.value = total + i; });
    Overlay.close();
    if (!file) { Toast.show('Recording failed in this browser'); return; }
    Exporter.download(file.blob, Exporter.name(state, 'loop', file.ext));
    Toast.show(`Saved a ${state.anim.seconds}s ${file.ext.toUpperCase()} loop`);
  }

  // Plays frames into a canvas at fps while MediaRecorder captures it. Returns { blob, ext } or null.
  async function play(frames, w, h, fps, progress) {
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext('2d');
    const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType: type, videoBitsPerSecond: 8e6 });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { recorder.onstop = res; });
    g.drawImage(await createImageBitmap(frames[0]), 0, 0);
    recorder.start();
    const t0 = performance.now(), dt = 1000 / fps;
    for (let i = 0; i < frames.length; i++) {
      const bmp = await createImageBitmap(frames[i]);
      const wait = t0 + i * dt - performance.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      g.drawImage(bmp, 0, 0);
      bmp.close();
      progress(i + 1);
    }
    await new Promise(r => setTimeout(r, dt));
    recorder.stop();
    await done;
    return { blob: new Blob(chunks, { type: type.split(';')[0] }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
  }

  return { toggle, stop, record, isPlaying: () => playing };
})();
