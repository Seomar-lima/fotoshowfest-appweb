// Configurações globais
const ffmpeg = createFFmpeg({ log: true });
const GOFILE_TOKEN = "KPYdQuOsRhqo200r4zN0aJgJz4RCNCuc";
let goFileServer = "store1";

// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.querySelector(".qr-section");
const qrContainer = document.getElementById("qrCode");
const moldura = document.getElementById("moldura");
const processing = document.getElementById("processing");
const processingText = document.getElementById("processing-text");
const downloadLink = document.getElementById("downloadLink");

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  await initCamera();
  await ffmpeg.load();
});

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    alert("Erro ao acessar a câmera: " + err.message);
  }
}

// Controles
fotoBtn.addEventListener("click", takePhoto);
bumerangueBtn.addEventListener("click", startBoomerang);

async function takePhoto() {
  startCountdown(async () => {
    const imgData = await captureFrame();
    const imgBlob = dataURLtoBlob(imgData);
    
    addToGallery(imgData, "image");
    saveLocalFile(imgBlob, `foto_${Date.now()}.png`);
    
    try {
      const url = await uploadToGoFile(imgBlob, "image");
      generateQRCode(url);
    } catch {
      generateQRCode(URL.createObjectURL(imgBlob));
    }
  });
}

async function startBoomerang() {
  startCountdown(async () => {
    showProcessing("Gravando...");
    const webmBlob = await recordVideo();
    
    try {
      showProcessing("Convertendo...");
      const mp4Blob = await convertToMP4(webmBlob);
      
      showProcessing("Enviando...");
      const url = await uploadToGoFile(mp4Blob, "video");
      generateQRCode(url);
      
      addToGallery(url, "video");
    } catch (err) {
      console.error(err);
      const fallbackUrl = URL.createObjectURL(webmBlob);
      generateQRCode(fallbackUrl);
      addToGallery(fallbackUrl, "video");
      saveLocalFile(webmBlob, `bumerangue_${Date.now()}.webm`);
    }
  });
}

// Funções principais
function startCountdown(callback) {
  let count = 3;
  contador.textContent = count;
  contador.classList.add("visible");
  beep.play();
  
  const timer = setInterval(() => {
    count--;
    contador.textContent = count;
    beep.play();
    
    if (count <= 0) {
      clearInterval(timer);
      contador.classList.remove("visible");
      callback();
    }
  }, 1000);
}

async function captureFrame() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  
  ctx.drawImage(video, 0, 0);
  if (moldura.complete) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  return canvas.toDataURL("image/png");
}

async function recordVideo() {
  return new Promise((resolve) => {
    const chunks = [];
    const recorder = new MediaRecorder(video.srcObject, {
      mimeType: "video/webm"
    });
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.start();
    
    setTimeout(() => recorder.stop(), 2000);
  });
}

async function convertToMP4(webmBlob) {
  const inputName = "input.webm";
  const outputName = "output.mp4";
  
  ffmpeg.FS("writeFile", inputName, await fetchFile(webmBlob));
  await ffmpeg.run(
    "-i", inputName,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "23",
    outputName
  );
  
  const data = ffmpeg.FS("readFile", outputName);
  return new Blob([data.buffer], { type: "video/mp4" });
}

async function uploadToGoFile(fileBlob, type) {
  const formData = new FormData();
  const extension = type === "image" ? "png" : "mp4";
  formData.append("file", fileBlob, `file_${Date.now()}.${extension}`);
  formData.append("token", GOFILE_TOKEN);
  
  const response = await fetch(`https://${goFileServer}.gofile.io/uploadFile`, {
    method: "POST",
    body: formData
  });
  
  const data = await response.json();
  if (data.status === "ok") {
    return `https://gofile.io/d/${data.data.code}`;
  }
  throw new Error("Upload failed");
}

function generateQRCode(url) {
  qrContainer.innerHTML = "";
  new QRCode(qrContainer, {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#ff6b6b",
    colorLight: "#ffffff"
  });
  
  downloadLink.href = url;
  qrDiv.style.display = "block";
}

// Utilitários
function addToGallery(data, type) {
  const element = type === "image" ? document.createElement("img") : document.createElement("video");
  element.src = data;
  element.controls = type === "video";
  element.classList.add("gallery-item");
  galeria.appendChild(element);
}

function saveLocalFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

function showProcessing(text) {
  processingText.textContent = text;
  processing.style.display = "flex";
}

function hideProcessing() {
  processing.style.display = "none";
}
