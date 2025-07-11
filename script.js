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
  mediaRecorder: null
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
  ctx: document.getElementById('canvas').getContext('2d')
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
  const canvas = document.createElement('canvas');
  canvas.width = DOM.camera.videoWidth;
  canvas.height = DOM.camera.videoHeight;
  const ctx = canvas.getContext('2d');
  
  const frames = [];
  const frameCount = CONFIG.boomerang.duration * CONFIG.boomerang.fps;
  
  let framesCaptured = 0;
  const captureInterval = setInterval(() => {
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
    
    frames.push(canvas.toDataURL('image/jpeg'));
    framesCaptured++;
    
    if (framesCaptured >= frameCount) {
      clearInterval(captureInterval);
      processBoomerang(frames);
    }
  }, 1000 / CONFIG.boomerang.fps);
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
  });
});
