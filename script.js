// Bumerangue
bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");

  // Contagem regressiva antes de gravar
  let count = 5;
  contador.innerText = count;
  const countdown = setInterval(() => {
    count--;
    contador.innerText = count;
    beep.play();
    if (count === 0) {
      clearInterval(countdown);
      contador.innerText = "";
      iniciarGravacaoBumerangue(); // só começa a gravação após a contagem
    }
  }, 1000);
};

async function iniciarGravacaoBumerangue() {
  const canvasVideo = document.createElement("canvas");
  const ctx = canvasVideo.getContext("2d");

  const fps = 60; // taxa de quadros mais alta para acelerar
  const duration = 2; // duração da captura em segundos
  const totalFrames = fps * duration;
  const frames = [];

  canvasVideo.width = video.videoWidth;
  canvasVideo.height = video.videoHeight;

  // Captura frames com moldura
  for (let i = 0; i < totalFrames; i++) {
    ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
    if (moldura.complete) {
      ctx.drawImage(moldura, 0, 0, canvasVideo.width, canvasVideo.height);
    }
    const frame = ctx.getImageData(0, 0, canvasVideo.width, canvasVideo.height);
    frames.push(frame);
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  // Converte frames em bumerangue (original + reverso)
  const finalFrames = [...frames, ...frames.slice().reverse()];
  const streamOut = canvasVideo.captureStream(fps);
  const recorder = new MediaRecorder(streamOut);
  const chunks = [];

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

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
          throw new Error("Erro no envio");
        }
      })
      .catch(err => {
        console.error(err);
        qrDiv.innerText = "Erro ao enviar vídeo";
      });
  };

  recorder.start();

  for (const frame of finalFrames) {
    ctx.putImageData(frame, 0, 0);
    await new Promise(r => setTimeout(r, 1000 / (fps * 2))); // aceleração: 2x mais rápido
  }

  recorder.stop();
}
