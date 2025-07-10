// Configurações
const CONFIG = {
  boomerang: {
    duration: 3,
    fps: 30
  }
};

// Estado do App
const AppState = {
  cameraStream: null,
  isProcessing: false,
  savedItems: JSON.parse(localStorage.getItem('photos')) || []
};

// Elementos DOM
const DOM = {
  camera: document.getElementById('camera'),
  frame: document.getElementById('frame'),
  captureBtn: document.getElementById('capture-btn'),
  boomerangBtn: document.getElementById('boomerang-btn'),
  gallery: document.getElementById('gallery-items'),
  counter: document.getElementById('counter'),
  status: document.getElementById('status'),
  shutterSound: document.getElementById('shutter-sound'),
  canvas: document.getElementById('canvas'),
  ctx: document.getElementById('canvas').getContext('2d')
};

// Inicialização da Câmera (Modo Retrato)
async function initCamera() {
  try {
    showStatus("Iniciando câmera...");
    
    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1080 },
        height: { ideal: 1920 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    DOM.camera.srcObject = stream;
    AppState.cameraStream = stream;
    
    // Ajusta a moldura após a câmera carregar
    DOM.camera.onloadedmetadata = () => {
      adjustFrameSize();
      hideStatus();
    };
    
  } catch (error) {
    console.error('Erro na câmera:', error);
    showStatus("Erro ao acessar a câmera", true);
    disableButtons();
  }
}

// Ajusta o tamanho da moldura
function adjustFrameSize() {
  const cameraRatio = DOM.camera.videoWidth / DOM.camera.videoHeight;
  const frameRatio = 9/16; // Proporção da moldura
  
  if (cameraRatio > frameRatio) {
    // Câmera mais larga que a moldura
    DOM.frame.style.width = '100%';
    DOM.frame.style.height = 'auto';
  } else {
    // Câmera mais estreita que a moldura
    DOM.frame.style.width = 'auto';
    DOM.frame.style.height = '100%';
  }
}

// Captura de Foto
function setupPhotoCapture() {
  DOM.captureBtn.addEventListener('click', async () => {
    if (AppState.isProcessing) return;
    
    AppState.isProcessing = true;
    let count = 3;
    
    showCounter(count);
    
    const countdown = setInterval(() => {
      count--;
      updateCounter(count);
      DOM.shutterSound.play();
      
      if (count <= 0) {
        clearInterval(countdown);
        hideCounter();
        takePhoto();
      }
    }, 1000);
  });
}

function takePhoto() {
  // Configura o canvas com a orientação correta
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
  
  const imageData = DOM.canvas.toDataURL('image/jpeg', 0.9);
  saveToGallery(imageData, 'photo');
  AppState.isProcessing = false;
}

// Bumerangue
function setupBoomerang() {
  DOM.boomerangBtn.addEventListener('click', async () => {
    if (AppState.isProcessing) return;
    
    AppState.isProcessing = true;
    let count = 3;
    
    showCounter(count);
    showStatus("Preparando bumerangue...");
    
    const countdown = setInterval(() => {
      count--;
      updateCounter(count);
      DOM.shutterSound.play();
      
      if (count <= 0) {
        clearInterval(countdown);
        hideCounter();
        recordBoomerang();
      }
    }, 1000);
  });
}

async function recordBoomerang() {
  showStatus("Gravando...");
  
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

function processBoomerang(frames) {
  showStatus("Processando...");
  
  // Simula processamento (substitua pelo FFmpeg real)
  setTimeout(() => {
    const reversedFrames = [...frames].reverse();
    const allFrames = [...frames, ...reversedFrames];
    
    // Cria um GIF simples (substitua por vídeo real)
    const gifUrl = allFrames[0]; // Apenas para demonstração
    saveToGallery(gifUrl, 'boomerang');
    
    hideStatus();
    AppState.isProcessing = false;
  }, 2000);
}

// Galeria
function saveToGallery(data, type) {
  const item = {
    id: Date.now(),
    type,
    data,
    date: new Date().toLocaleString()
  };
  
  AppState.savedItems.unshift(item);
  localStorage.setItem('photos', JSON.stringify(AppState.savedItems));
  updateGallery();
}

function updateGallery() {
  DOM.gallery.innerHTML = '';
  
  AppState.savedItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'gallery-item';
    
    if (item.type === 'photo') {
      const img = document.createElement('img');
      img.src = item.data;
      img.alt = 'Foto capturada';
      itemElement.appendChild(img);
    } else {
      const video = document.createElement('video');
      video.src = item.data;
      video.controls = true;
      video.loop = true;
      itemElement.appendChild(video);
    }
    
    DOM.gallery.appendChild(itemElement);
  });
}

// Helpers
function showStatus(message, isError = false) {
  DOM.status.textContent = message;
  DOM.status.style.display = 'block';
  DOM.status.style.background = isError ? 'rgba(255,0,0,0.7)' : 'rgba(0,0,0,0.7)';
}

function hideStatus() {
  DOM.status.style.display = 'none';
}

function showCounter(value) {
  DOM.counter.textContent = value;
  DOM.counter.style.display = 'block';
}

function updateCounter(value) {
  DOM.counter.textContent = value;
}

function hideCounter() {
  DOM.counter.style.display = 'none';
}

function disableButtons() {
  DOM.captureBtn.disabled = true;
  DOM.boomerangBtn.disabled = true;
}

// PWA Installation
function setupPWA() {
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
  });
  
  function showInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'install-prompt';
    prompt.innerHTML = `
      <p>Instalar App?</p>
      <button id="install-btn">Instalar</button>
      <button id="dismiss-btn">Depois</button>
    `;
    document.body.appendChild(prompt);
    
    document.getElementById('install-btn').addEventListener('click', installApp);
    document.getElementById('dismiss-btn').addEventListener('click', () => {
      prompt.remove();
    });
  }
  
  function installApp() {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou instalação');
      }
      deferredPrompt = null;
      document.getElementById('install-prompt').remove();
    });
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initCamera();
  setupPhotoCapture();
  setupBoomerang();
  updateGallery();
  setupPWA();
});
