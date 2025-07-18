const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const statusUpload = document.getElementById("statusUpload");
const previewVideo = document.getElementById("previewVideo");

let mediaStream;
let mediaRecorder;
let recordedChunks = [];

function exibirMensagem(texto) {
  statusUpload.innerText = texto;
  statusUpload.style.display = "block";
}

function ocultarMensagem() {
  statusUpload.style.display = "none";
}

function tocarBeep() {
  const beep = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
  beep.play();
}

async function iniciarCamera() {
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: true
  });
  video.srcObject = mediaStream;
  video.play();
}

function tirarFoto() {
  const context = canvas.getContext("2d");
  canvas.width = video.videoHeight;
  canvas.height = video.videoWidth;

  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1); // Corrige a inversão da câmera frontal
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  context.restore();

  const dataURL = canvas.toDataURL("image/png");
  enviarParaImgbb(dataURL);
}

async function enviarParaImgbb(imgData) {
  exibirMensagem("Criando QR Code");
  const base64 = imgData.replace(/^data:image\/png;base64,/, "");
  const formData = new FormData();
  formData.append("key", "586fe56b6fe8223c90078eae64e1d678");
  formData.append("image", base64);
  formData.append("name", "foto_showfest_" + Date.now());

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData
  });
  const result = await response.json();
  const url = result.data.url;
  gerarQRCode(url);
  exibirMensagem("Pronto!");
}

async function gravarBumerangue() {
  await contarRegressiva(3);
  exibirMensagem("Gravando");

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });

  mediaRecorder.ondataavailable = function (event) {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    exibirMensagem("Processando");

    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const file = new File([blob], "video.webm", { type: "video/webm" });

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("https://api.gofile.io/uploadFile", {
      method: "POST",
      body: formData
    });

    const uploadResult = await uploadRes.json();
    const url = uploadResult.data.downloadPage;

    exibirMensagem("Financiando...");

    gerarQRCode(url);
    salvarVideoLocal(blob);
    exibirMensagem("Pronto!");

    const videoURL = URL.createObjectURL(blob);
    previewVideo.src = videoURL;
    previewVideo.loop = true;
    previewVideo.play();
    previewVideo.style.display = "block";
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 3000);
}

async function contarRegressiva(segundos) {
  for (let i = segundos; i > 0; i--) {
    exibirMensagem(i);
    tocarBeep();
    await new Promise(r => setTimeout(r, 1000));
  }
}

function gerarQRCode(url) {
  const qr = new QRCode(statusUpload, {
    text: url,
    width: 256,
    height: 256,
    colorDark: "#ffffff",
    colorLight: "#000000",
    correctLevel: QRCode.CorrectLevel.H
  });
}

function salvarVideoLocal(blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bumerangue.mp4";
  a.click();
}

// Eventos
fotoBtn.onclick = () => {
  contarRegressiva(5).then(tirarFoto);
};

bumerangueBtn.onclick = gravarBumerangue;

// Iniciar câmera ao abrir
iniciarCamera();
