// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrContainer = document.getElementById("qrCode");
const moldura = document.getElementById("moldura");
const processing = document.getElementById("processing");
const processingText = document.getElementById("processing-text");
const galleryBtn = document.getElementById("galeriaBtn");
const qrBtn = document.getElementById("qrBtn");

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
      width: { ideal: 1280 },
      height: { ideal: 720 }
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
    alert("Erro ao acessar a câmera. Verifique as permissões do navegador.");
  });
}

// Botão de foto
fotoBtn.addEventListener("click", () => {
  takePhoto();
});

// Botão da galeria
galleryBtn.addEventListener("click", mostrarGaleria);

// Botão do QR
qrBtn.addEventListener("click", mostrarQR);

// Função para mostrar a galeria
function mostrarGaleria() {
  document.getElementById('gallerySection').style.display = 'block';
}

// Função para mostrar o QR
function mostrarQR() {
  if(galeria.children.length > 0) {
    const ultimaFoto = galeria.lastChild;
    gerarQRCode(ultimaFoto.src);
    document.getElementById('qrDownload').style.display = 'block';
  } else {
    alert("Nenhuma foto disponível para compartilhar");
  }
}

// Função para fechar a galeria
function fecharGaleria() {
  document.getElementById('gallerySection').style.display = 'none';
}

// Função para fechar o QR
function fecharQR() {
  document.getElementById('qrDownload').style.display = 'none';
}

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) return;
  
  let count = 3;
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
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  
  // Desenhar a imagem da câmera
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Aplicar moldura se estiver carregada
  if (moldura.complete && moldura.naturalHeight !== 0) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  // Processar após um pequeno delay
  setTimeout(() => {
    const imgData = canvas.toDataURL("image/png");
    
    // Adicionar à galeria
    const img = new Image();
    img.src = imgData;
    img.classList.add("gallery-item");
    galeria.appendChild(img);
    
    // Enviar para o servidor
    enviarParaImgbb(imgData);
  }, 300);
}

// Enviar foto para ImgBB
function enviarParaImgbb(imgData) {
  showProcessing("Salvando sua foto...");
  
  // Extrair a parte base64 da imagem
  const base64Data = imgData.split(',')[1];
  
  // Criar FormData para enviar
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Data);
  formData.append('name', `foto_15anos_${Date.now()}`);
  
  // Fazer upload para ImgBB
  fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.data && data.data.url) {
      // Download automático
      const link = document.createElement('a');
      link.href = data.data.url;
      link.download = `foto_15anos_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
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
  qrContainer.innerHTML = "";
  
  // Gerar QR code
  new QRCode(qrContainer, {
    text: url,
    width: 250,
    height: 250,
    colorDark: "#ff6b6b",
    colorLight: "#ffffff",
    margin: 4
  });
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

// Inicializar a moldura
moldura.onerror = function() {
  this.src = "moldura.png";
};

// Iniciar a câmera quando o script carregar
document.addEventListener('DOMContentLoaded', iniciarCamera);
