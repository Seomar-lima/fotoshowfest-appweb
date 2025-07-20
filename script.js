// Elementos DOM
const video = document.getElementById('camera');
const btnFoto = document.getElementById('btnFoto');
const contador = document.getElementById('contador');
const beep = document.getElementById('beep');
const qrSection = document.getElementById('qrSection');
const qrCode = document.getElementById('qrCode');
const downloadLink = document.getElementById('downloadLink');
const photoGallery = document.getElementById('photoGallery');
const moldura = document.getElementById('moldura');

// Variáveis
let stream;

// Inicialização
async function initCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    alert('Erro ao acessar a câmera: ' + err.message);
  }
}

// Tirar Foto
btnFoto.addEventListener('click', () => {
  startCountdown(async () => {
    const photoData = await takePhoto();
    
    // Adiciona à galeria
    addToGallery(photoData);
    
    // Gera QR Code
    generateQRCode(photoData);
    
    // Download automático
    downloadPhoto(photoData);
  });
});

// Função para tirar foto
async function takePhoto() {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  
  // Captura o frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Aplica moldura se carregada
  if (moldura.complete) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  return canvas.toDataURL('image/jpeg', 0.9); // Qualidade 90%
}

// Contagem regressiva
function startCountdown(callback) {
  let count = 3;
  contador.textContent = count;
  contador.style.display = 'block';
  
  beep.play();
  
  const timer = setInterval(() => {
    count--;
    contador.textContent = count;
    beep.play();
    
    if (count <= 0) {
      clearInterval(timer);
      contador.style.display = 'none';
      callback();
    }
  }, 1000);
}

// Adiciona foto à galeria
function addToGallery(photoData) {
  const img = document.createElement('img');
  img.src = photoData;
  photoGallery.prepend(img);
}

// Gera QR Code
function generateQRCode(photoData) {
  qrCode.innerHTML = '';
  
  // Cria um ID único para a foto
  const photoId = 'foto_' + Date.now();
  
  // Simula um link de download (na prática, seria a URL do servidor)
  const downloadUrl = URL.createObjectURL(dataURLtoBlob(photoData));
  
  new QRCode(qrCode, {
    text: downloadUrl,
    width: 200,
    height: 200,
    colorDark: '#ff6b6b',
    colorLight: '#ffffff'
  });
  
  downloadLink.href = downloadUrl;
  downloadLink.download = `${photoId}.jpg`;
  qrSection.style.display = 'block';
}

// Download da foto
function downloadPhoto(photoData) {
  const link = document.createElement('a');
  link.href = photoData;
  link.download = `foto_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utilitário: Converte DataURL para Blob
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

// Inicializa a câmera quando a página carrega
window.addEventListener('DOMContentLoaded', initCamera);
