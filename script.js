// Configurações
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
  boomerangFrames: []
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
  processingIndicator: document.getElementById('processing-indicator')
};

// Inicialização da Câmera
async function initCamera() {
  try {
    const constraints = {
      video: {
        width: { ideal: 1080 },
        height: { ideal: 1920 },
        facingMode: 'user'
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    DOM.camera.srcObject = stream;
    AppState.cameraStream = stream;
    
    // Ajusta a moldura quando a câmera carregar
    DOM.camera.onloadedmetadata = () => {
      adjustFrameSize();
    };
    
  } catch (error) {
    console.error('Erro na câmera:', error);
    alert('Não foi possível acessar a câmera. Verifique as permissões.');
  }
}

// Ajusta o tamanho da moldura
function adjustFrameSize() {
  const cameraRatio = DOM.camera.videoWidth / DOM.camera.videoHeight;
  const frameRatio = 9/16; // Proporção vertical
  
  if (cameraRatio > frameRatio) {
    DOM.frame.style.width = 'auto';
    DOM.frame.style.height = '100%';
  } else {
    DOM.frame.style.width = '100%';
    DOM.frame.style.height = 'auto';
  }
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
    // Configura o canvas
    DOM.canvas.width = DOM.camera.videoWidth;
    DOM.canvas.height = DOM.camera.videoHeight;
    
    // Espelha a imagem (para câmera frontal)
    DOM.ctx.save();
    DOM.ctx.translate(DOM.canvas.width, 0);
    DOM.ctx.scale(-1, 1);
    DOM.ctx.drawImage(DOM.camera, 0, 0, DOM.canvas.width, DOM.canvas.height);
    DOM.ctx.restore();
    
    // Adiciona moldura
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
    canvas.width = DOM.camera.videoWidth;
    canvas.height = DOM.camera.videoHeight;
    const ctx = canvas.getContext('2d');
    
    const frameCount = CONFIG.boomerang.duration * CONFIG.boomerang.fps;
    let framesCaptured = 0;
    
    // Mostra indicador de processamento
    if (DOM.processingIndicator) {
      DOM.processingIndicator.style.display = 'block';
      DOM.processingIndicator.textContent = 'Capturando...';
    }
    
    const captureInterval = setInterval(() => {
      try {
        // Captura frame
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(DOM.camera, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Adiciona moldura
        if (DOM.frame.complete) {
          ctx.drawImage(DOM.frame, 0, 0, canvas.width, canvas.height);
        }
        
        AppState.boomerangFrames.push(canvas.toDataURL('image/jpeg'));
        framesCaptured++;
        
        if (framesCaptured >= frameCount) {
          clearInterval(captureInterval);
          processBoomerang();
        }
      } catch (error) {
        clearInterval(captureInterval);
        console.error('Erro na captura de frames:', error);
        if (DOM.processingIndicator) {
          DOM.processingIndicator.style.display = 'none';
        }
        AppState.isProcessing = false;
      }
    }, 1000 / CONFIG.boomerang.fps);
    
  } catch (error) {
    console.error('Erro ao iniciar bumerangue:', error);
    AppState.isProcessing = false;
    if (DOM.processingIndicator) {
      DOM.processingIndicator.style.display = 'none';
    }
  }
}

async function processBoomerang() {
  try {
    if (DOM.processingIndicator) {
      DOM.processingIndicator.textContent = 'Processando...';
    }
    
    // Cria o efeito de bumerangue (frames normais + reverso)
    const boomerangFrames = [
      ...AppState.boomerangFrames,
      ...AppState.boomerangFrames.slice(0, -1).reverse()
    ];
    
    // Cria um vídeo simples (na prática, use uma biblioteca para GIF/MP4)
    const videoUrl = await createSimpleVideo(boomerangFrames);
    
    saveToGallery(videoUrl, 'video');
    generateQRCode(videoUrl);
    
  } catch (error) {
    console.error('Erro ao processar bumerangue:', error);
    alert('Erro ao criar o bumerangue. Tente novamente.');
  } finally {
    AppState.isProcessing = false;
    if (DOM.processingIndicator) {
      DOM.processingIndicator.style.display = 'none';
    }
  }
}

async function createSimpleVideo(frames) {
  return new Promise((resolve) => {
    // Esta é uma implementação simplificada que cria um vídeo básico
    // Para produção, considere usar MediaRecorder ou uma biblioteca como gif.js
    
    const canvas = document.createElement('canvas');
    canvas.width = DOM.camera.videoWidth;
    canvas.height = DOM.camera.videoHeight;
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initCamera();
  setupPhotoCapture();
  setupBoomerang();
  
  // Botão de cancelamento
  DOM.cancelBtn.addEventListener('click', () => {
    AppState.isProcessing = false;
    if (AppState.mediaRecorder) {
      AppState.mediaRecorder.stop();
    }
    DOM.counter.style.display = 'none';
    DOM.cancelBtn.style.display = 'none';
    if (DOM.processingIndicator) {
      DOM.processingIndicator.style.display = 'none';
    }
  });
});
