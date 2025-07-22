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

// Inicializar a câmera
async function iniciarCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: "user",
        width: { ideal: 1080 },
        height: { ideal: 1920 }
      }, 
      audio: false 
    });
    video.srcObject = stream;
    video.play();
    console.log("Câmera iniciada com sucesso");
  } catch (err) {
    console.error("Erro ao acessar a câmera:", err);
    alert("Não foi possível acessar a câmera. Por favor, verifique as permissões.");
  }
}

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) {
    qrDiv.style.display = "none";
    qrGenerated = false;
  }
  
  let count = 3;
  contador.innerText = count;
  contador.classList.add('visible');
  
  // Tocar som
  beep.play().catch(e => console.log("Erro no áudio:", e));
  
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    
    // Tocar som a cada segundo
    beep.play().catch(e => console.log("Erro no áudio:", e));
    
    if (count === 0) {
      clearInterval(interval);
      contador.classList.remove('visible');
      capturePhoto();
    }
  }, 1000);
}

// Capturar foto
function capturePhoto() {
  // Ajustar canvas para proporção da câmera
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  
  // Capturar imagem
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Aplicar moldura
  if (moldura.complete && moldura.naturalHeight !== 0) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  // Processar foto
  setTimeout(() => {
    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    addPhotoToGallery(imgData);
    showQRCode(imgData);
  }, 300);
}

// Adicionar foto à galeria (mais recente primeiro)
function addPhotoToGallery(imgData) {
  const img = document.createElement('img');
  img.src = imgData;
  img.classList.add('gallery-item');
  
  // Adicionar no início
  galeria.insertBefore(img, galeria.firstChild);
  
  // Limitar número de fotos
  if (galeria.children.length > MAX_PHOTOS) {
    galeria.removeChild(galeria.lastChild);
  }
  
  // Mostrar galeria se estiver oculta
  if (gallerySection.style.display === "none") {
    gallerySection.style.display = "block";
  }
}

// Mostrar QR Code
function showQRCode(imgData) {
  showProcessing("Gerando seu QR Code...");
  
  // Simular processamento (substitua por upload real se necessário)
  setTimeout(() => {
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: imgData, // Usando a imagem local (substitua por URL se fizer upload)
      width: 250,
      height: 250,
      colorDark: "#ff6b6b",
      colorLight: "#ffffff",
      margin: 4
    });
    
    hideProcessing();
    qrDiv.style.display = "flex";
    qrGenerated = true;
  }, 1500);
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

// Event Listeners
fotoBtn.addEventListener("click", takePhoto);

// Fechar QR Code ao tocar fora
qrDiv.addEventListener("click", () => {
  qrDiv.style.display = "none";
});

// Fechar Galeria ao tocar fora
gallerySection.addEventListener("click", () => {
  gallerySection.style.display = "none";
});

// Evitar que toques nos elementos filhos fechem os modais
qrContainer.addEventListener("click", e => e.stopPropagation());
galeria.addEventListener("click", e => e.stopPropagation());

// Iniciar a câmera quando a página carregar
window.addEventListener('load', iniciarCamera);
