// ====== ELEMENTOS DOM ======
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.getElementById("qrDownload");
const qrContainer = document.getElementById("qrCode");
const moldura = document.getElementById("moldura");
const processing = document.getElementById("processing");
const processingText = document.getElementById("processing-text");

// ====== VARIÁVEIS GLOBAIS ======
let stream;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let qrGenerated = false;

// ====== API KEY ======
const IMGBB_API_KEY = "586fe56b6fe8223c90078eae64e1d678";

// ====== INICIAR CÂMERA ======
function iniciarCamera() {
  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  }).then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
  }).catch(err => {
    console.error("Erro ao acessar a câmera:", err);
    alert("Erro ao acessar a câmera. Verifique as permissões.");
  });
}

// ====== SCROLL ATÉ CÂMERA ======
function scrollToCamera() {
  document.querySelector('.camera-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ====== BOTÕES ======
fotoBtn.addEventListener("click", () => {
  scrollToCamera();
  takePhoto();
});

bumerangueBtn.addEventListener("click", () => {
  scrollToCamera();
  startBoomerang();
});

// ====== TIRAR FOTO ======
function takePhoto() {
  if (qrGenerated) return;

  let count = 5;
  contador.innerText = count;
  contador.classList.add('visible');
  beep.play();

  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    beep.play();

    if (count === 0) {
      clearInterval(interval);
      contador.classList.remove('visible');
      capturePhoto();
    }
  }, 1000);
}

function capturePhoto() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (moldura.complete && moldura.naturalHeight !== 0) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }

  setTimeout(() => {
    const imgData = canvas.toDataURL("image/png");

    // Adicionar miniatura
    const img = new Image();
    img.src = imgData;
    img.alt = "Foto capturada";
    galeria.appendChild(img);

    enviarParaImgbb(imgData);
  }, 300);
}

// ====== ENVIAR PARA IMGBB ======
function enviarParaImgbb(imgData) {
  showProcessing("Enviando para o servidor...");

  const base64Data = imgData.split(',')[1];
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Data);
  formData.append('name', `foto_showfest_${Date.now()}`);

  fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.url) {
        gerarQRCode(data.data.url);

        const link = document.createElement('a');
        link.href = data.data.url;
        link.download = `foto_showfest_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        hideProcessing();
      } else {
        throw new Error("Erro no upload da imagem");
      }
    })
    .catch(err => {
      console.error("Erro:", err);
      hideProcessing();
      alert("Erro ao enviar foto.");
    });
}

// ====== BUMERANGUE ======
function startBoomerang() {
  if (qrGenerated || isRecording) return;

  let count = 3;
  contador.innerText = count;
  contador.classList.add('visible');
  beep.play();

  const countdown = setInterval(() => {
    count--;
    contador.innerText = count;
    beep.play();

    if (count === 0) {
      clearInterval(countdown);
      contador.classList.remove('visible');
      startBoomerangRecording();
    }
  }, 1000);
}

function startBoomerangRecording() {
  isRecording = true;
  recordedChunks = [];

  const options = { mimeType: 'video/webm;codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    processBoomerang(new Blob(recordedChunks, { type: 'video/webm' }));
    isRecording = false;
  };

  mediaRecorder.start();

  setTimeout(() => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }, 3000);
}

// ====== PROCESSAR BUMERANGUE ======
function processBoomerang(blob) {
  showProcessing("Processando e enviando bumerangue...");

  // Não exibe o vídeo no app — só QR code
  uploadToGofile(blob);
}

// ====== UPLOAD PARA GOFILE ======
function uploadToGofile(blob) {
  const formData = new FormData();
  formData.append("file", blob, `bumerangue_${Date.now()}.webm`);

  fetch("https://store1.gofile.io/uploadFile", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      const url = data.data.downloadPage;
      gerarQRCode(url);

      const link = document.createElement('a');
      link.href = url;
      link.download = `bumerangue_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      hideProcessing();
    })
    .catch(err => {
      console.error("Erro no upload para GoFile:", err);
      hideProcessing();
      alert("Erro ao enviar vídeo.");
    });
}

// ====== QR CODE ======
function gerarQRCode(url) {
  qrDiv.style.display = "block";
  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#ff6b6b",
    colorLight: "#ffffff",
    margin: 4
  });

  qrDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  qrGenerated = true;
}

// ====== LOADING UI ======
function showProcessing(text) {
  processingText.textContent = text;
  processing.style.display = "flex";
}

function hideProcessing() {
  processing.style.display = "none";
}

// ====== MOLDURA FALHA ======
moldura.onerror = function () {
  this.src = "moldura.png";
};

// ====== INICIAR CÂMERA ======
document.addEventListener("DOMContentLoaded", iniciarCamera);
