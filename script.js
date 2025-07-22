// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.getElementById("qrDownload");
const qrContainer = document.getElementById("qrCode");
const moldura = document.getElementById("moldura");
const processing = document.getElementById("processing");
const processingText = document.getElementById("processing-text");
const gallerySection = document.getElementById("gallerySection");

// Variáveis globais
let stream;
let qrGenerated = false;
const MAX_PHOTOS = 15;

// Inicializar a câmera na vertical (9:16)
function iniciarCamera() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: "user",
      width: { ideal: 720 },
      height: { ideal: 1280 }
    }, 
    audio: false 
  })
  .then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
  })
  .catch(err => {
    console.error("Erro ao acessar a câmera:", err);
    alert("Não foi possível acessar a câmera. Verifique as permissões.");
  });
}

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) {
    qrDiv.style.display = "none";
    gallerySection.style.display = "none";
    qrGenerated = false;
  }
  
  let count = 3;
  contador.innerText = count;
  contador.classList.add('visible');
  
  playBeep();
  
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    playBeep();
    
    if (count === 0) {
      clearInterval(interval);
      contador.classList.remove('visible');
      capturePhoto();
    }
  }, 1000);
}

// Capturar foto
function capturePhoto() {
  // Ajustar canvas para proporção 9:16
  const targetHeight = video.videoWidth * (16/9);
  canvas.width = video.videoWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext("2d");
  
  // Cortar a imagem para manter 9:16
  const sourceY = (video.videoHeight - targetHeight) / 2;
  ctx.drawImage(video, 0, sourceY, canvas.width, targetHeight, 0, 0, canvas.width, canvas.height);
  
  // Aplicar moldura
  if (moldura.complete) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  // Processar foto
  setTimeout(() => {
    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    addPhotoToGallery(imgData);
    generateQRCode(imgData);
  }, 300);
}

// Adicionar foto à galeria
function addPhotoToGallery(imgData) {
  const img = document.createElement('img');
  img.src = imgData;
  img.classList.add('gallery-item');
  
  // Adicionar no início e limitar a 15 fotos
  galeria.insertBefore(img, galeria.firstChild);
  if (galeria.children.length > MAX_PHOTOS) {
    galeria.removeChild(galeria.lastChild);
  }
}

// Gerar QR Code localmente (rápido)
function generateQRCode(imgData) {
  showProcessing("Gerando QR Code...");
  
  setTimeout(() => {
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: imgData,
      width: 250,
      height: 250,
      colorDark: "#ff6b6b",
      colorLight: "#ffffff",
      margin: 4
    });
    
    hideProcessing();
    
    // Mostrar QR code e galeria
    qrDiv.style.display = "block";
    gallerySection.style.display = "block";
    qrGenerated = true;
    
    // Rolagem automática para o QR code
    qrDiv.scrollIntoView({ behavior: 'smooth' });
  }, 500);
}

// Funções auxiliares
function playBeep() {
  beep.currentTime = 0;
  beep.play().catch(e => console.log("Erro no áudio:", e));
}

function showProcessing(text) {
  processingText.textContent = text;
  processing.style.display = "flex";
}

function hideProcessing() {
  processing.style.display = "none";
}

// Event Listeners
fotoBtn.addEventListener("click", takePhoto);

// Iniciar a câmera quando a página carregar
document.addEventListener('DOMContentLoaded', iniciarCamera);

// Verificar carregamento da moldura
moldura.onerror = () => {
  console.log("Moldura não carregada");
  moldura.style.display = "none";
};
