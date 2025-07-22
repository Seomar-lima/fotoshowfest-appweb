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
let isCameraCentered = true;

// Chave de API do ImgBB
const IMGBB_API_KEY = "586fe56b6fe8223c90078eae64e1d678";

// Inicializar a câmera
function iniciarCamera() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: "user",
      width: { ideal: 1920 },
      height: { ideal: 1080 }
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

// Centralizar a câmera
function centerCamera() {
  scrollableContent.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  isCameraCentered = true;
}

// Botão de foto
fotoBtn.addEventListener("click", function() {
  if (!isCameraCentered) {
    centerCamera();
    setTimeout(takePhoto, 500); // Espera a animação de scroll terminar
  } else {
    takePhoto();
  }
});

// Botão limpar galeria
limparBtn.addEventListener("click", () => {
  galeria.innerHTML = "";
});

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) {
    qrDiv.style.display = "none";
    qrGenerated = false;
  }
  
  let count = 5; // Contagem regressiva de 5 segundos
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
    
    // Limitar a 30 fotos na galeria
    if (galeria.children.length >= 30) {
      galeria.removeChild(galeria.firstChild);
    }
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
    if (data.data && data.data.url) {
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
    margin: 4
  });
  
  // Rolar para o QR code
  setTimeout(() => {
    const qrPosition = qrDiv.offsetTop;
    const controlsHeight = document.querySelector('.controls').offsetHeight;
    const scrollPosition = qrPosition - controlsHeight - 20;
    
    scrollableContent.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
    
    isCameraCentered = false;
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

// Inicializar a moldura
moldura.onerror = function() {
  this.src = "moldura.png";
};

// Iniciar a câmera quando o script carregar
document.addEventListener('DOMContentLoaded', iniciarCamera);
