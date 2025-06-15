bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");

  const canvasB = document.createElement("canvas");
  const ctx = canvasB.getContext("2d");

  canvasB.width = video.videoWidth;
  canvasB.height = video.videoHeight;

  const fps = 40;
  const duration = 2;
  const totalFrames = fps * duration;
  const frames = [];

  // Captura frames com moldura
  for (let i = 0; i < totalFrames; i++) {
    ctx.drawImage(video, 0, 0, canvasB.width, canvasB.height);
    if (moldura.complete && moldura.naturalHeight !== 0) {
      ctx.drawImage(moldura, 0, 0, canvasB.width, canvasB.height);
    }
    const frame = ctx.getImageData(0, 0, canvasB.width, canvasB.height);
    frames.push(frame);
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  // Inverte para bumerangue
  const finalFrames = [...frames, ...frames.slice().reverse()];

  // Stream para gravação
  const playbackCanvas = document.createElement("canvas");
  const playbackCtx = playbackCanvas.getContext("2d");
  playbackCanvas.width = canvasB.width;
  playbackCanvas.height = canvasB.height;

  const streamOut = playbackCanvas.captureStream(fps);
  const recorder = new MediaRecorder(streamOut);
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append("file", blob, "bumerangue.webm");

    qrDiv.innerHTML = "Enviando vídeo...";

    fetch("https://upload.gofile.io/uploadfile", {
      method: "POST",
      body: formData
    })
      .then(r => r.json())
      .then(data => {
        if (data.status === "ok") {
          gerarQRCode(data.data.downloadPage);
        } else {
          throw new Error("Erro ao enviar vídeo");
        }
      })
      .catch(err => {
        console.error(err);
        qrDiv.innerText = "Erro ao enviar vídeo";
      });
  };

  recorder.start();

  for (const frame of finalFrames) {
    playbackCtx.putImageData(frame, 0, 0);
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
};
