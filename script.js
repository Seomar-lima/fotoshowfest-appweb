// Configurações
const CONFIG = {
  boomerang: {
    duration: 3, // segundos
    fps: 30
  }
};

// Estado do App
const state = {
  cameraStream: null,
  isProcessing: false,
  mediaRecorder: null,
  chunks: [],
  savedItems: JSON.parse(localStorage.getItem('photos')) || []
};

// Elementos DOM
const elements = {
  camera: document.getElementById('camera'),
  captureBtn: document.getElementById('capture-btn'),
  boomerangBtn: document.getElementById('boomerang-btn'),
  gallery: document.getElementById('gallery'),
  counter: document.getElementById('counter'),
  shutterSound: document.getElementById('shutter-sound'),
  canvas: document.getElementById('canvas'),
  ctx: document.getElementById('canvas').getContext('2d')
};

// Inicialização da Câmera
async function initCamera() {
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1080 },
        height: { ideal: 1920 }
      },
      audio: false
    });
    elements.camera.srcObject = state.cameraStream;
  } catch (error) {
    console.error('Erro na câmera:', error);
    alert('Não foi possível acessar a câmera. Verifique as permissões.');
  }
}

// Captura de Foto
function capturePhoto() {
  if (state.isProcessing) return;
  
  state.isProcessing = true;
  let count = 3;
  
  elements.counter.textContent = count;
  elements.counter.style.display = 'block';
  
  const countdown = setInterval(() => {
    count--;
    elements.counter.textContent = count;
    elements.shutterSound.play();
    
    if (count <= 0) {
      clearInterval(countdown);
      elements.counter.style.display = 'none';
      processCapture();
    }
  }, 1000);
}

function processCapture() {
  elements.canvas.width = elements.camera.videoWidth;
  elements.canvas.height = elements.camera.videoHeight;
  
  // Espelha a imagem para corresponder à visualização
  elements.ctx.translate(elements.canvas.width, 0);
  elements.ctx.scale(-1, 1);
  elements.ctx.drawImage(elements.camera, 0, 0, elements.canvas.width, elements.canvas.height);
  
  // Adiciona moldura se existir
  if (document.getElementById('moldura').complete) {
    elements.ctx.drawImage(
      document.getElementById('moldura'), 
      0, 0, 
      elements.canvas.width, 
      elements.canvas.height
    );
  }
  
  const imageData = elements.canvas.toDataURL('image/jpeg');
  saveToGallery(imageData, 'photo');
  state.isProcessing = false;
}

// Bumerangue
function startBoomerang() {
  if (state.isProcessing) return;
  
  state.isProcessing = true;
  state.chunks = [];
  let count = 3;
  
  elements.counter.textContent = count;
  elements.counter.style.display = 'block';
  
  const countdown = setInterval(() => {
    count--;
    elements.counter.textContent = count;
    elements.shutterSound.play();
    
    if (count <= 0) {
      clearInterval(countdown);
      elements.counter.style.display = 'none';
      recordBoomerang();
    }
  }, 1000);
}

function recordBoomerang() {
  const canvas = document.createElement('canvas');
  canvas.width = elements.camera.videoWidth;
  canvas.height = elements.camera.videoHeight;
  const ctx = canvas.getContext('2d');
  
  const frames = [];
  const frameCount = CONFIG.boomerang.duration * CONFIG.boomerang.fps;
  
  let framesCaptured = 0;
  const captureInterval = setInterval(() => {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(elements.camera, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    if (document.getElementById('moldura').complete) {
      ctx.drawImage(document.getElementById('moldura'), 0, 0, canvas.width, canvas.height);
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
  // Implementação do processamento do bumerangue
  // (código similar ao anterior, mas garantindo orientação vertical)
  
  state.isProcessing = false;
}

// Galeria
function saveToGallery(imageData, type) {
  const item = {
    id: Date.now(),
    type,
    data: imageData,
    date: new Date().toLocaleString()
  };
  
  state.savedItems.unshift(item);
  localStorage.setItem('photos', JSON.stringify(state.savedItems));
  updateGallery();
}

function updateGallery() {
  elements.gallery.innerHTML = '';
  
  state.savedItems.forEach(item => {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    
    if (item.type === 'photo') {
      const img = document.createElement('img');
      img.src = item.data;
      galleryItem.appendChild(img);
    } else {
      const video = document.createElement('video');
      video.src = item.data;
      video.controls = true;
      galleryItem.appendChild(video);
    }
    
    elements.gallery.appendChild(galleryItem);
  });
}

// Event Listeners
elements.captureBtn.addEventListener('click', capturePhoto);
elements.boomerangBtn.addEventListener('click', startBoomerang);

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initCamera();
  updateGallery();
});
