// Elementos DOM
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

// Variáveis globais
let stream;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
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

// Função para rolar até a câmera
function scrollToCamera() {
  const cameraContainer = document.querySelector('.camera-container');
  cameraContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Botão de foto
fotoBtn.addEventListener("click", () => {
  scrollToCamera();
  takePhoto();
});

// Botão de bumerangue
bumerangueBtn.addEventListener("click", () => {
  scrollToCamera();
  startBoomerang();
});

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) return;
  
  let count = 5;
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
    
    // Enviar para o servidor e gerar QR code
    enviarParaImgbb(imgData);
  }, 300);
}

// Enviar foto para ImgBB e gerar QR code
function enviarParaImgbb(imgData) {
  showProcessing("Enviando para o servidor...");
  
  // Extrair a parte base64 da imagem
  const base64Data = imgData.split(',')[1];
  
  // Criar FormData para enviar
  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', base64Data);
  formData.append('name', `foto_showfest_${Date.now()}`);
  
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
      
      // Download automático
      const link = document.createElement('a');
      link.href = data.data.url;
      link.download = `foto_showfest_${Date.now()}.png`;
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

// Iniciar bumerangue
function startBoomerang() {
  if (qrGenerated || isRecording) return;
  
  let count = 3;
  contador.innerText = count;
  contador.classList.add('visible');
  
  try {
    beep.play();
  } catch (err) {
    console.log("Erro no áudio:", err);
  }
  
  const countdown = setInterval(() => {
    count--;
    contador.innerText = count;
    
    try {
      beep.play();
    } catch (err) {
      console.warn("Erro ao tocar beep:", err);
    }
    
    if (count === 0) {
      clearInterval(countdown);
      contador.classList.remove('visible');
      startBoomerangRecording();
    }
  }, 1000);
}

// Iniciar gravação do bumerangue
function startBoomerangRecording() {
  isRecording = true;
  recordedChunks = [];
  
  // Configurar MediaRecorder
  const options = { mimeType: 'video/webm;codecs=vp9' };
  mediaRecorder = new MediaRecorder(stream, options);
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = processBoomerang;
  mediaRecorder.start();
  
  // Parar após 2 segundos
  setTimeout(() => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    isRecording = false;
  }, 2000);
}

// Processar bumerangue
function processBoomerang() {
  showProcessing("Processando bumerangue...");
  
  try {
    // Criar um blob do vídeo gravado
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    // Criar URL para o vídeo
    const videoUrl = URL.createObjectURL(blob);
    
    // Adicionar à galeria
    const videoElement = document.createElement('video');
    videoElement.src = videoUrl;
    videoElement.controls = true;
    videoElement.classList.add("gallery-item");
    galeria.appendChild(videoElement);
    
    // Simular upload (em produção, usar GoFile ou similar)
    gerarQRCode(videoUrl);
    
    // Download automático
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `bumerangue_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    hideProcessing();
  } catch (error) {
    console.error("Erro ao processar bumerangue:", error);
    hideProcessing();
    alert("Erro ao processar bumerangue. Tente novamente.");
  }
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
  
  // Centralizar o QR code na tela
  qrDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
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
