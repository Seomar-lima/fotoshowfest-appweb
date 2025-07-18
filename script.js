const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const previewDiv = document.getElementById("preview");
const previewImg = document.getElementById("preview-img");
const previewVideo = document.getElementById("preview-video");
const qrDiv = document.getElementById("qrcode");

// Ativar câmera
navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true })
  .then(stream => {
    video.srcObject = stream;
  });

// Tirar foto com moldura
fotoBtn.onclick = async () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const moldura = document.getElementById("moldura");
  ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);

  const imgData = canvas.toDataURL("image/png");

  previewImg.src = imgData;
  previewImg.style.display = "block";
  previewVideo.style.display = "none";
  previewDiv.style.display = "block";

  const link = await enviarParaGoFile(imgData);
  gerarQRCode(link);
  baixarImagemLocal(imgData);
};

// Gravar bumerangue com moldura
bumerangueBtn.onclick = async () => {
  const stream = video.srcObject;
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = async () => {
    const original = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(original);

    const videoEl = document.createElement("video");
    videoEl.src = url;
    videoEl.muted = true;
    await videoEl.play();

    // Criar canvas para capturar frames
    const vCanvas = document.createElement("canvas");
    vCanvas.width = videoEl.videoWidth;
    vCanvas.height = videoEl.videoHeight;
    const ctx = vCanvas.getContext("2d");

    const frameRate = 30;
    const frames = [];
    const duration = videoEl.duration;

    // Capturar frames
    for (let t = 0; t < duration; t += 1 / frameRate) {
      videoEl.currentTime = t;
      await new Promise(resolve => setTimeout(resolve, 30));
      ctx.drawImage(videoEl, 0, 0, vCanvas.width, vCanvas.height);

      // Aplicar moldura
      const img = new Image();
      img.src = document.getElementById("moldura").src;
      await new Promise(res => img.onload = res);
      ctx.drawImage(img, 0, 0, vCanvas.width, vCanvas.height);

      frames.push(vCanvas.toDataURL("image/webp"));
    }

    // Reverso
    const reversed = [...frames].reverse();
    const allFrames = [...frames, ...reversed];

    // Criar WebM final
    const stream = vCanvas.captureStream(frameRate);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const recordedChunks = [];

    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const finalBlob = new Blob(recordedChunks, { type: "video/webm" });
      const finalURL = URL.createObjectURL(finalBlob);

      previewVideo.src = finalURL;
      previewVideo.style.display = "block";
      previewImg.style.display = "none";
      previewDiv.style.display = "block";

      const file = new File([finalBlob], "bumerangue.webm", { type: "video/webm" });
      const link = await enviarArquivoParaGoFile(file);
      gerarQRCode(link);
      baixarVideoLocal(finalBlob);
    };

    mediaRecorder.start();

    // Desenhar cada frame com delay
    for (let frame of allFrames) {
      const img = new Image();
      img.src = frame;
      await new Promise(r => img.onload = r);
      ctx.drawImage(img, 0, 0, vCanvas.width, vCanvas.height);
      await new Promise(r => setTimeout(r, 1000 / frameRate));
    }

    mediaRecorder.stop();
  };

  recorder.start();
  await new Promise(r => setTimeout(r, 3000));
  recorder.stop();
};

// Upload imagem ou vídeo para GoFile
async function enviarArquivoParaGoFile(file) {
  const res = await fetch("https://api.gofile.io/getServer");
  const { data } = await res.json();
  const server = data.server;

  const form = new FormData();
  form.append("file", file);

  const upload = await fetch(`https://${server}.gofile.io/uploadFile`, {
    method: "POST",
    body: form
  });

  const result = await upload.json();
  return result.data.downloadPage;
}

// Gerar QR Code
function gerarQRCode(link) {
  qrDiv.innerHTML = "";
  QRCode.toCanvas(document.createElement("canvas"), link, (err, canvas) => {
    if (!err) qrDiv.appendChild(canvas);
  });
}

// Baixar imagem local
function baixarImagemLocal(dataUrl) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "foto_showfest.png";
  a.click();
}

// Baixar vídeo local
function baixarVideoLocal(blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bumerangue_showfest.webm";
  a.click();
}

// Voltar à câmera
function voltarParaCamera() {
  previewDiv.style.display = "none";
}
