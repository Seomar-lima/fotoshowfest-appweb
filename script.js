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

// Inicializar a câmera
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

// Botão de foto
fotoBtn.addEventListener("click", takePhoto);

// Botão de bumerangue
bumerangueBtn.addEventListener("click", startBoomerang);

// Função para tirar foto
function takePhoto() {
  if (qrGenerated) return;
  
  // Role para a câmera
  document.querySelector('.camera-container').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center'
  });
  
  let count = 5;
  contador.innerText = count;
  contador.style.display = "flex"; // Mostrar contador
  contador.classList.add("mostrar");
  
  beep.play().catch(err => console.log("Erro no áudio:", err));
  
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
      contador.innerText = "";
      contador.style.display = "none"; // Ocultar contador
      contador.classList.remove("mostrar");
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
    
    // Simular envio e gerar QR code
    simulateUpload(imgData, "foto");
  }, 300);
}

// Iniciar bumerangue
function startBoomerang() {
  if (qrGenerated || isRecording) return;
  
  // Role para a câmera
  document.querySelector('.camera-container').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center'
  });
  
  let count = 3;
  contador.innerText = count;
  contador.style.display = "flex"; // Mostrar contador
  contador.classList.add("mostrar");
  
  beep.play().catch(err => console.log("Erro no áudio:", err));
  
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
      contador.innerText = "";
      contador.style.display = "none"; // Ocultar contador
      contador.classList.remove("mostrar");
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
    mediaRecorder.stop();
    isRecording = false;
  }, 2000);
}

// Processar bumerangue
async function processBoomerang() {
  showProcessing("Processando bumerangue...");
  
  try {
    // Criar um blob do vídeo gravado
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    // Simular processamento (na prática, você faria o efeito de reversão aqui)
    setTimeout(() => {
      hideProcessing();
      
      // Simular um resultado (imagem estática neste exemplo)
      const resultImage = canvas.toDataURL("image/jpeg");
      
      // Adicionar à galeria
      const img = new Image();
      img.src = resultImage;
      img.classList.add("gallery-item");
      galeria.appendChild(img);
      
      // Simular upload
      simulateUpload(resultImage, "bumerangue");
    }, 3000);
    
  } catch (error) {
    console.error("Erro ao processar bumerangue:", error);
    hideProcessing();
    alert("Erro ao processar bumerangue. Tente novamente.");
  }
}

// Simular upload e gerar QR code
function simulateUpload(data, type) {
  showProcessing("Enviando para o servidor...");
  
  // Simular tempo de upload
  setTimeout(() => {
    hideProcessing();
    
    // Exibir seção do QR code
    qrDiv.style.display = "block";
    qrContainer.innerHTML = "";
    
    // Gerar URL fictícia
    const url = `https://fotoshowfest.com/${type}/${Date.now()}`;
    
    // Gerar QR code
    new QRCode(qrContainer, {
      text: url,
      width: 200,
      height: 200,
      colorDark: "#ff6b6b",
      colorLight: "#ffffff",
      margin: 4
    });
    
    // Role para o QR code
    qrDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Download automático
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = data;
      link.download = `${type}_showfest_${Date.now()}.${type === 'foto' ? 'png' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1500);
    
    qrGenerated = true;
  }, 2000);
}

// Mostrar tela de processamento
function showProcessing(text) {
  processingText.textContent = text;
  processing.style.display = "flex";
  processing.classList.add("mostrar");
}

// Esconder tela de processamento
function hideProcessing() {
  processing.style.display = "none";
  processing.classList.remove("mostrar");
}

// Inicializar a moldura com imagem SVG (substitua pelo seu arquivo)
moldura.onerror = function() {
  this.src = "dat
