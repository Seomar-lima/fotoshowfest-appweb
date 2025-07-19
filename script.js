// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
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
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;
let qrGenerated = false;
let goFileToken = "";
let goFileServer = "";

// Chaves de API
const IMGBB_API_KEY = "586fe56b6fe8223c90078eae64e1d678";
const GOFILE_API_KEY = "YOUR_GOFILE_API_KEY"; // Obtenha em gofile.io/api

// Inicializar a câmera
function iniciarCamera() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: "user",
      width: { ideal: 1920  },
      height: { ideal: 1080 }
    }, 
    audio: false 
  })
  .then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
    getGoFileToken(); // Obter token do GoFile
  })
  .catch(err => {
    console.error("Erro ao acessar a câmera:", err);
    alert("Erro ao acessar a câmera. Verifique as permissões do navegador.");
  });
}

// Obter token do GoFile
async function getGoFileToken() {
  try {
    const response = await fetch('https://api.gofile.io/createAccount');
    const data = await response.json();
    if (data.status === 'ok') {
      goFileToken = data.data.token;
      getGoFileServer();
    }
  } catch (error) {
    console.error('Erro ao obter token do GoFile:', error);
  }
}

// Obter servidor do GoFile
async function getGoFileServer() {
  try {
    const response = await fetch('https://api.gofile.io/getServer');
    const data = await response.json();
    if (data.status === 'ok') {
      goFileServer = data.data.server;
    }
  } catch (error) {
    console.error('Erro ao obter servidor do GoFile:', error);
  }
}

// Botão de foto
fotoBtn.addEventListener("click", takePhoto);

// Botão de bumerangue
bumerangueBtn.addEventListener("click", startBoomerang);

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

// Iniciar bumerangue
function startBoomerang() {
  if (qrGenerated) {
    qrDiv.style.display = "none";
    qrGenerated = false;
  }
  
  if (isRecording) return;
  
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

// Processar bumerangue (com efeito vai e volta)
function processBoomerang() {
  showProcessing("Criando bumerangue...");
  
  try {
    // Criar um blob do vídeo gravado
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    // Criar URL para o vídeo
    const videoUrl = URL.createObjectURL(blob);
    
    // Criar elemento de vídeo para processamento
    const tempVideo = document.createElement('video');
    tempVideo.src = videoUrl;
    
    tempVideo.onloadedmetadata = () => {
      // Criar canvas para processar frames
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = tempVideo.videoWidth;
      tempCanvas.height = tempVideo.videoHeight;
      
      // Array para armazenar os frames
      const frames = [];
      let frameCount = 0;
      
      // Função para capturar frames
      function captureFrame() {
        tempCtx.drawImage(tempVideo, 0, 0, tempCanvas.width, tempCanvas.height);
        frames.push(tempCanvas.toDataURL('image/png'));
        frameCount++;
        
        if (frameCount < 30) { // Capturar 30 frames (1 segundo)
          requestAnimationFrame(captureFrame);
        } else {
          createBoomerangVideo(frames);
        }
      }
      
      // Iniciar captura de frames
      tempVideo.currentTime = 0;
      tempVideo.play();
      setTimeout(() => {
        captureFrame();
      }, 100);
    };
  } catch (error) {
    console.error("Erro ao processar bumerangue:", error);
    hideProcessing();
    alert("Erro ao processar bumerangue. Tente novamente.");
  }
}

// Criar vídeo bumerangue com efeito vai e volta
function createBoomerangVideo(frames) {
  // Criar frames invertidos (efeito de volta)
  const reverseFrames = [...frames].reverse();
  
  // Combinar frames originais + invertidos
  const boomerangFrames = [...frames, ...reverseFrames];
  
  // Criar canvas para gerar o vídeo
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = video.videoWidth;
  outputCanvas.height = video.videoHeight;
  const outputCtx = outputCanvas.getContext('2d');
  
  // Criar elemento de vídeo final
  const finalVideo = document.createElement('video');
  finalVideo.controls = true;
  finalVideo.classList.add("gallery-item");
  
  // Criar stream para gravar o vídeo
  const stream = outputCanvas.captureStream(15);
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    
    // Salvar localmente como backup
    saveLocalFile(URL.createObjectURL(blob), `bumerangue_${Date.now()}.webm`);
    
    // Adicionar à galeria
    finalVideo.src = URL.createObjectURL(blob);
    galeria.appendChild(finalVideo);
    
    // Enviar para o GoFile
    if (goFileServer) {
      uploadToGoFile(blob);
    } else {
      gerarQRCode(URL.createObjectURL(blob));
      hideProcessing();
    }
  };
  
  mediaRecorder.start();
  
  // Renderizar frames no canvas
  let frameIndex = 0;
  
  function renderFrame() {
    if (frameIndex >= boomerangFrames.length) {
      mediaRecorder.stop();
      return;
    }
    
    const img = new Image();
    img.src = boomerangFrames[frameIndex];
    
    img.onload = () => {
      outputCtx.drawImage(img, 0, 0, outputCanvas.width, outputCanvas.height);
      frameIndex++;
      setTimeout(renderFrame, 100); // 10 FPS
    };
  }
  
  renderFrame();
}

// Enviar para o GoFile
async function uploadToGoFile(blob) {
  try {
    const formData = new FormData();
    formData.append('file', blob, `bumerangue_${Date.now()}.webm`);
    formData.append('token', goFileToken);
    
    const response = await fetch(`https://${goFileServer}.gofile.io/uploadFile`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (data.status === 'ok') {
      gerarQRCode(data.data.downloadPage);
    } else {
      throw new Error('Erro no upload para GoFile');
    }
  } catch (error) {
    console.error('Erro no upload para GoFile:', error);
    gerarQRCode(URL.createObjectURL(blob));
  }
  
  hideProcessing();
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
