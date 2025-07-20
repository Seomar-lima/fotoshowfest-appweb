// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.querySelector(".qr-section");
const qrContainer = document.getElementById("qrCode");
const moldura = document.getElementById("moldura");
const processing = document.getElementById("processing");
const processingText = document.getElementById("processing-text");

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
fotoBtn.addEventListener("click", takePhoto);

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) {
    qrDiv.style.display = "none";
    qrGenerated = false;
  }
  
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
    
    // Salvar localmente como backup
    saveLocalFile(imgData, `foto_15anos_${Date.now()}.png`);
    
    // Enviar para o servidor e gerar QR code
    enviarParaImgbb(imgData);
  }, 300);
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

// Enviar foto para ImgBB e gerar QR code
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
      // Gerar QR code com URL real
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
  // Exibir seção do QR code
  qrDiv.style.display = "block";
  qrContainer.innerHTML = "";
  
  // Gerar QR code
  new QRCode(qrContainer, {
    text: url,
    width: 200,
    height: 200,
    colorDark: "#ff6b6b",
    colorLight: "#ffffff",
    margin: 4
  });
  
  // Rolar para o QR code
  qrDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  
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

// Inicializar a moldura
moldura.onerror = function() {
  this.src = "moldura.png";
};

// Iniciar a câmera quando o script carregar
document.addEventListener('DOMContentLoaded', iniciarCamera);
