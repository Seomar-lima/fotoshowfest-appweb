// === Seletores e Variáveis ===
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const statusUpload = document.getElementById("statusUpload");
const qrDiv = document.getElementById("qrDownload");
const moldura = document.getElementById("moldura");

let stream;
let mediaRecorder;
let chunks = [];
let cancelRecording = false;

const BOOMERANG_SETTINGS = {
  width: 540,
  height: 960,
  fps: 30,
  duration: 2
};

const { createFFmpeg } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
let ffmpegLoaded = false;

// === Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
  iniciarCamera();
  criarBotaoCancelar();
});

fotoBtn.onclick = () => processarFoto();
bumerangueBtn.onclick = () => iniciarGravacaoBumerangue();

function iniciarCamera() {
  navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
    audio: false
  }).then(s => {
    stream = s;
    video.srcObject = stream;
  }).catch(console.error);
}

function criarBotaoCancelar() {
  const btn = document.createElement('button');
  btn.id = 'cancelBtn';
  btn.textContent = '✖ Cancelar';
  btn.style.cssText = `
    display: none;
    background: #ff4444;
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 5px;
    margin: 10px auto;
    cursor: pointer;
  `;
  btn.onclick = () => {
    cancelRecording = true;
    if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
    document.getElementById('contador').innerText = '';
    btn.style.display = 'none';
  };
  document.body.appendChild(btn);
}

// === Foto ===
async function processarFoto() {
  const imgData = canvas.toDataURL('image/png');
  const blob = dataURLtoBlob(imgData);
  try {
    const gofileUrl = await uploadToGoFile(blob, 'image');
    gerarQRCode(gofileUrl);
    setTimeout(() => baixarImagemLocal(imgData), 1000);
  } catch {
    mostrarErro("Erro ao processar foto");
  }
}

// === Bumerangue ===
function iniciarGravacaoBumerangue() {
  chunks = [];
  const streamRec = video.captureStream(BOOMERANG_SETTINGS.fps);
  mediaRecorder = new MediaRecorder(streamRec, { mimeType: 'video/webm;codecs=vp9' });
  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.onstop = () => processBoomerang(chunks);
  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), BOOMERANG_SETTINGS.duration * 1000);
}

async function processBoomerang(chunks) {
  try {
    const webmBlob = new Blob(chunks, { type: 'video/webm' });
    const mp4Blob = await convertToMP4(webmBlob);
    const downloadUrl = await uploadToGoFile(mp4Blob, 'video');
    gerarQRCode(downloadUrl);
    const localURL = URL.createObjectURL(mp4Blob);
    setTimeout(() => baixarVideoLocal(localURL, 'bumerangue.mp4'), 1000);
  } catch (error) {
    mostrarErro("Erro ao processar vídeo");
  }
}

// === Upload ===
async function uploadToGoFile(blob, tipo) {
  statusUpload.innerText = `Enviando ${tipo}...`;
  statusUpload.style.display = "block";

  try {
    const extension = tipo === 'video' ? 'mp4' : 'png';
    const formData = new FormData();
    formData.append('file', blob, `showfest_${Date.now()}.${extension}`);

    const res = await fetch('https://api.gofile.io/getServer');
    const { data: { server } } = await res.json();
    const uploadRes = await fetch(`https://${server}.gofile.io/uploadFile`, {
      method: 'POST',
      body: formData
    });
    const { data } = await uploadRes.json();
    return data.downloadPage;
  } finally {
    statusUpload.style.display = "none";
  }
}

// === Conversão WebM para MP4 ===
async function convertToMP4(webmBlob) {
  if (!ffmpegLoaded) {
    await ffmpeg.load();
    ffmpegLoaded = true;
  }
  ffmpeg.FS('writeFile', 'input.webm', new Uint8Array(await webmBlob.arrayBuffer()));
  await ffmpeg.run('-i', 'input.webm', '-c:v', 'libx264', '-profile:v', 'baseline', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'output.mp4');
  const data = ffmpeg.FS('readFile', 'output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

// === Utilitários ===
function gerarQRCode(url) {
  qrDiv.innerHTML = `
    <h3 style="color:#FFD700;text-align:center">Escaneie para baixar</h3>
    <div id="qrcode" style="margin:0 auto"></div>
    <a href="${url}" target="_blank" style="color:#FFD700;display:block;margin-top:10px">Abrir link diretamente</a>
  `;
  new QRCode(document.getElementById("qrcode"), {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff"
  });
}

function baixarImagemLocal(dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `foto_showfest_${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function baixarVideoLocal(url, nome) {
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}

function mostrarErro(mensagem) {
  qrDiv.innerHTML = `<p style="color:red">${mensagem}</p>`;
  statusUpload.style.display = 'none';
}

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}
