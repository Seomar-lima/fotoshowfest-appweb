/// ... parte anterior (frames capturados e mediaRecorder configurado)

mediaRecorder.onstop = async () => {
  try {
    const blob = new Blob(chunks, { type: 'video/webm' });

    // Prepara upload para GoFile
    contador.innerText = "Enviando vídeo...";

    // Passo 1: Pede o servidor de upload do GoFile
    const serverResp = await fetch("https://api.gofile.io/getServer");
    const serverData = await serverResp.json();
    const uploadServer = serverData.data.server;

    // Passo 2: Envia o vídeo para o servidor indicado
    const formData = new FormData();
    formData.append("file", blob, "bumerangue.webm");

    const uploadResp = await fetch(`https://${uploadServer}.gofile.io/uploadFile`, {
      method: "POST",
      body: formData
    });

    const uploadJson = await uploadResp.json();
    const link = uploadJson?.data?.downloadPage;

    if (!link) throw new Error("Erro no retorno da GoFile");

    // Exibe QR Code com link
    gerarQRCode(link);
    contador.innerText = "Pronto!";

    // Adiciona link direto para download
    const downloadLink = document.createElement("a");
    downloadLink.href = link;
    downloadLink.textContent = "📥 Baixar Vídeo";
    downloadLink.style.display = "block";
    downloadLink.style.marginTop = "10px";
    qrDiv.appendChild(downloadLink);

    // Centraliza QR
    setTimeout(() => scrollToElement(qrDiv), 500);

  } catch (error) {
    console.error("Erro no upload para GoFile:", error);
    qrDiv.innerHTML = `
      <p style="color:red">Erro ao gerar link.</p>
      <button onclick="location.reload()">Tentar novamente</button>
    `;
    contador.innerText = "Erro ao finalizar";
  } finally {
    cancelBtn.style.display = 'none';
  }
};/ Configurações
const CONFIG = {
  boomerang: {
    duration: 3,
    fps: 15
  }
};

// Estado do App
const AppState = {
  cameraStream: null,
  isProcessing: false,
  mediaRecorder: null,
  boomerangFrames: [],
  captureInterval: null,
  isPortraitMode: true // Forçar modo retrato
};

// Elementos DOM
const DOM = {
  camera: document.getElementById('camera'),
  frame: document.getElementById('moldura'),
  captureBtn: document.getElementById('capture-btn'),
  boomerangBtn: document.getElementById('boomerang-btn'),
  gallery: document.getElementById('gallery'),
  counter: document.getElementById('counter'),
  shutterSound: document.getElementById('shutter-sound'),
  qrContainer: document.getElementById('qr-container'),
  cancelBtn: document.getElementById('cancel-btn'),
  canvas: document.getElementById('canvas'),
  ctx: document.getElementById('canvas').getContext('2d'),
  processingIndicator: document.getElementById('processing-indicator'),
  cameraContainer: document.getElementById('camera-container')
};

// Inicialização da Câmera
async function initCamera() {
  try {
    // Verificar se é um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const constraints = {
      video: {
        width: { ideal: isMobile ? 720 : 1080 },
        height: { ideal: isMobile ? 1280 : 1920 },
        facingMode: 'user',
        resizeMode: 'crop-and-scale'
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    DOM.camera.srcObject = stream;
    AppState.cameraStream = stream;
    
    DOM.camera.onloadedmetadata = () => {
      forcePortraitMode();
      adjustFrameSize();
    };
    
  } catch (error) {
    console.error('Erro na câmera:', error);
    alert('Não foi possível acessar a câmera. Verifique as permissões.');
  }
}

// Forçar modo retrato
function forcePortraitMode() {
  // Aplicar transformações CSS para manter orientação vertical
  DOM.camera.style.transform = 'scaleX(-1)'; // Espelhar para câmera frontal
  DOM.camera.style.width = '100%';
  DOM.camera.style.height = 'auto';
  
  // Se estiver em um dispositivo móvel, tentar bloquear orientação
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {});
      }
    } catch (e) {
      console.log('Não foi possível bloquear orientação:', e);
    }
  }
}

// Ajustar tamanho do frame
function adjustFrameSize() {
  // Forçar proporção 9:16 (vertical)
  const targetRatio = 9/16;
  const containerWidth = DOM.cameraContainer.clientWidth;
  const containerHeight = DOM.cameraContainer.clientHeight;
  
  // Ajustar moldura para manter proporção vertical
  DOM.frame.style.width = '100%';
  DOM.frame.style.height = 'auto';
  
  // Centralizar verticalmente
  DOM.camera.style.position = 'absolute';
  DOM.camera.style.left = '50%';
  DOM.camera.style.transform = 'translateX(-50%) scaleX(-1)';
}

// Captura de Foto
function setupPhotoCapture() {
  DOM.captureBtn.addEventListener('click', () => {
    if (AppState.isProcessing) return;
    
    startCountdown(() => {
      takePhoto();
    });
  });
}

function takePhoto() {
  try {
    // Definir tamanho do canvas com proporção vertical
    const targetHeight = Math.min(DOM.camera.videoHeight, DOM.camera.videoWidth * (16/9));
    const targetWidth = targetHeight * (9/16);
    
    DOM.canvas.width = targetWidth;
    DOM.canvas.height = targetHeight;
    
    // Calcular área de recorte para manter o retrato
    const sourceX = (DOM.camera.videoWidth - (DOM.camera.videoHeight * (9/16))) / 2;
    const sourceY = 0;
    const sourceWidth = DOM.camera.videoHeight * (9/16);
    const sourceHeight = DOM.camera.videoHeight;
    
    // Desenhar imagem no canvas (com espelhamento para câmera frontal)
    DOM.ctx.save();
    DOM.ctx.translate(DOM.canvas.width, 0);
    DOM.ctx.scale(-1, 1);
    DOM.ctx.drawImage(
      DOM.camera,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, DOM.canvas.width, DOM.canvas.height
    );
    DOM.ctx.restore();
    
    // Adicionar moldura
    if (DOM.frame.complete) {
      DOM.ctx.drawImage(DOM.frame, 0, 0, DOM.canvas.width, DOM.canvas.height);
    }
    
    const imageData = DOM.canvas.toDataURL('image/jpeg');
    saveToGallery(imageData, 'photo');
    generateQRCode(imageData);
  } catch (error) {
    console.error('Erro ao tirar foto:', error);
    alert('Erro ao capturar a foto. Tente novamente.');
  } finally {
    AppState.isProcessing = false;
  }
}

// Bumerangue
function setupBoomerang() {
  DOM.boomerangBtn.addEventListener('click', () => {
    if (AppState.isProcessing) return;
    
    startCountdown(() => {
      recordBoomerang();
    }, 3);
  });
}

function recordBoomerang() {
  try {
    AppState.boomerangFrames = [];
    const canvas = document.createElement('canvas');
    
    // Definir tamanho com proporção vertical
    const targetHeight = Math.min(DOM.camera.videoHeight, DOM.camera.videoWidth * (16/9));
    const targetWidth = targetHeight * (9/16);
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    const frameCount = CONFIG.boomerang.duration * CONFIG.boomerang.fps;
    let framesCaptured = 0;
    
    showProcessingIndicator('Capturando...');
    
    AppState.captureInterval = setInterval(() => {
      try {
        // Calcular área de recorte
        const sourceX = (DOM.camera.videoWidth - (DOM.camera.videoHeight * (9/16))) / 2;
        const sourceY = 0;
        const sourceWidth = DOM.camera.videoHeight * (9/16);
        const sourceHeight = DOM.camera.videoHeight;
        
        // Capturar frame
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          DOM.camera,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, canvas.width, canvas.height
        );
        ctx.restore();
        
        // Adicionar moldura
        if (DOM.frame.complete) {
          ctx.drawImage(DOM.frame, 0, 0, canvas.width, canvas.height);
        }
        
        AppState.boomerangFrames.push(canvas.toDataURL('image/jpeg'));
        framesCaptured++;
        
        if (framesCaptured >= frameCount) {
          clearInterval(AppState.captureInterval);
          processBoomerang();
        }
      } catch (error) {
        clearInterval(AppState.captureInterval);
        console.error('Erro na captura de frames:', error);
        hideProcessingIndicator();
        AppState.isProcessing = false;
      }
    }, 1000 / CONFIG.boomerang.fps);
    
  } catch (error) {
    console.error('Erro ao iniciar bumerangue:', error);
    AppState.isProcessing = false;
    hideProcessingIndicator();
  }
}

async function processBoomerang() {
  try {
    showProcessingIndicator('Processando...');
    
    if (AppState.boomerangFrames.length === 0) {
      throw new Error('Nenhum frame capturado');
    }
    
    const boomerangFrames = [
      ...AppState.boomerangFrames,
      ...AppState.boomerangFrames.slice(0, -1).reverse()
    ];
    
    const videoUrl = await createSimpleVideo(boomerangFrames);
    
    saveToGallery(videoUrl, 'video');
    generateQRCode(videoUrl);
    
  } catch (error) {
    console.error('Erro ao processar bumerangue:', error);
    alert('Erro ao criar o bumerangue. Tente novamente.');
  } finally {
    AppState.isProcessing = false;
    hideProcessingIndicator();
  }
}

async function createSimpleVideo(frames) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const targetHeight = Math.min(DOM.camera.videoHeight, DOM.camera.videoWidth * (16/9));
    const targetWidth = targetHeight * (9/16);
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    const video = document.createElement('video');
    video.width = canvas.width;
    video.height = canvas.height;
    video.controls = true;
    
    const mediaStream = canvas.captureStream(10);
    const mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/webm'
    });
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      resolve(videoUrl);
    };
    
    mediaRecorder.start();
    
    let currentFrame = 0;
    const playInterval = setInterval(() => {
      if (currentFrame >= frames.length) {
        clearInterval(playInterval);
        mediaRecorder.stop();
        return;
      }
      
      const img = new Image();
      img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        currentFrame++;
      };
      img.src = frames[currentFrame];
    }, 1000 / CONFIG.boomerang.fps);
  });
}

// Funções Auxiliares
function startCountdown(callback, seconds = 3) {
  AppState.isProcessing = true;
  let count = seconds;
  
  DOM.counter.textContent = count;
  DOM.counter.style.display = 'block';
  DOM.shutterSound.play();
  
  const countdown = setInterval(() => {
    count--;
    DOM.counter.textContent = count;
    DOM.shutterSound.play();
    
    if (count <= 0) {
      clearInterval(countdown);
      DOM.counter.style.display = 'none';
      callback();
    }
  }, 1000);
}

function saveToGallery(data, type) {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  
  const media = type === 'photo' 
    ? document.createElement('img') 
    : document.createElement('video');
  
  media.src = data;
  if (type !== 'photo') {
    media.controls = true;
    media.autoplay = true;
    media.loop = true;
  }
  
  item.appendChild(media);
  DOM.gallery.prepend(item);
}

function generateQRCode(data) {
  DOM.qrContainer.innerHTML = '';
  new QRCode(DOM.qrContainer, {
    text: data,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.H
  });
  DOM.qrContainer.style.display = 'block';
}

function showProcessingIndicator(message) {
  if (DOM.processingIndicator) {
    DOM.processingIndicator.textContent = message;
    DOM.processingIndicator.style.display = 'block';
  }
}

function hideProcessingIndicator() {
  if (DOM.processingIndicator) {
    DOM.processingIndicator.style.display = 'none';
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  // Verificar orientação inicial
  const checkOrientation = () => {
    if (window.innerHeight > window.innerWidth) {
      AppState.isPortraitMode = true;
    } else {
      AppState.isPortraitMode = false;
      alert('Por favor, use o dispositivo no modo retrato (vertical) para a melhor experiência');
    }
  };
  
  window.addEventListener('resize', checkOrientation);
  checkOrientation();
  
  initCamera();
  setupPhotoCapture();
  setupBoomerang();
  
  DOM.cancelBtn.addEventListener('click', () => {
    AppState.isProcessing = false;
    if (AppState.mediaRecorder) {
      AppState.mediaRecorder.stop();
    }
    if (AppState.captureInterval) {
      clearInterval(AppState.captureInterval);
    }
    DOM.counter.style.display = 'none';
    DOM.cancelBtn.style.display = 'none';
    hideProcessingIndicator();
  });
});
