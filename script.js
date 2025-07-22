// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const limparBtn = document.getElementById("limpar");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.querySelector(".qr-section");
const qrContainer = document.getElementById("qrCode");
const moldura = document.getElementById("moldura");
const processing = document.getElementById("processing");
const processingText = document.getElementById("processing-text");
const scrollableContent = document.querySelector(".scrollable-content");

// Variáveis globais
let stream;
let qrGenerated = false;

// Chave de API do ImgBB
const IMGBB_API_KEY = "586fe56b6fe8223c90078eae64e1d678";

// Inicializar a câmera
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
    alert("Erro ao acessar a câmera. Verifique as permissões.");
  });
}

// Centralizar a câmera
function centerCamera() {
  scrollableContent.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) {
    qrDiv.style.display = "none";
    qrGenerated = false;
  }
  
  let count = 3; // Contagem regressiva reduzida para 3 segundos
  contador.innerText = count;
  contador.classList.add('visible');
  
  try {
    beep.play();
  } catch (err) {
    console.log("Erro no áudio:", err);
  }
  
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    
    try {
      beep.play();
    } catch (err) {
      console.warn("Erro ao tocar beep:", err);
    }
    
    if (count === 0) {
      clearInterval(interval);
      contador.classList.remove('visible');
      capturePhoto();
    }
  }, 1000);
}

// Capturar foto
function capturePhoto() {
  const targetHeight = video.videoWidth * (16/9);
  canvas.width = video.videoWidth;
  canvas.height = targetHeight;
  
  const ctx = canvas.getContext("2d");
  const sourceY = (video.videoHeight - targetHeight) / 2;
  
  ctx.drawImage(video, 0, sourceY, canvas.width, targetHeight, 0, 0, canvas.width, canvas.height);
  
  if (moldura.complete && moldura.naturalHeight !== 0) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  setTimeout(() => {
    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    addPhotoToGallery(imgData);
    enviarParaImgbb(imgData);
  }, 300);
}

// Adicionar foto à galeria
function addPhotoToGallery(imgData) {
  const img = document.createElement('img');
  img.src = imgData;
  img.classList.add('gallery-item');
  
  galeria.insertBefore(img, galeria.firstChild);
  
  if (galeria.children.length > 15) {
    galeria.removeChild(galeria.lastChild);
  }
  
  saveLocalFile(imgData, `foto_15anos_${Date.now()}.jpg`);
}

// Salvar arquivo localmente
function saveLocalFile(data, filename) {
  const link = document.createElement('a');
  link.href = data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Enviar foto para ImgBB
function enviarParaImgbb(imgData) {
  showProcessing("Salvando sua foto...");
  
  const base64Data = imgData.split(',')[1];
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Data);
  formData.append('name', `foto_15anos_${Date.now()}`);
  
  fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.data?.url) {
      gerarQRCode(data.data.url);
      hideProcessing();
    } else {
      throw new Error('Erro no upload da imagem');
    }
  })
  .catch(error => {
    console.error("Erro no upload:", error);
    hideProcessing();
    alert("Erro ao enviar foto. Tente novamente.");
  });
}

// Gerar QR code
function gerarQRCode(url) {
  qrDiv.style.display = "block";
  qrContainer.innerHTML = "";
  
  new QRCode(qrContainer, {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#ff6b6b",
    colorLight: "#ffffff",
    margin: 4,
    correctLevel: QRCode.CorrectLevel.L
  });
  
  setTimeout(() => {
    const qrPosition = qrDiv.offsetTop;
    const btnHeight = document.querySelector('.btn-container').offsetHeight;
    const scrollPosition = qrPosition - btnHeight - 20;
    
    scrollableContent.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
  }, 100);
  
  qrGenerated = true;
}

// Mostrar tela de processamento
function showProcessing(text) {
  processingText.textContent = text;
  processing.style.display = "flex";
}

// Esconder tela de processamento
function hideProcessing() {
  processing.style.display = "none";
}

// Event listeners
fotoBtn.addEventListener("click", takePhoto);
limparBtn.addEventListener("click", () => {
  galeria.innerHTML = "";
});

// Inicializar
moldura.onerror = () => moldura.src = "moldura.png";
document.addEventListener('DOMContentLoaded', iniciarCamera);
