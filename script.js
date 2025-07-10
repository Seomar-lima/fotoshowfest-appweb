// Elementos DOM
const elements = {
  video: document.getElementById("camera"),
  canvas: document.getElementById("canvas"),
  fotoBtn: document.getElementById("foto"),
  bumerangueBtn: document.getElementById("bumerangue"),
  beep: document.getElementById("beep"),
  contador: document.getElementById("contador"),
  galeria: document.getElementById("galeria"),
  qrDiv: document.getElementById("qrDownload"),
  moldura: document.getElementById("moldura"),
  statusOverlay: document.getElementById("status-overlay"),
  previewContainer: document.getElementById("preview-container")
};

// Configurações
const CONFIG = {
  boomerang: {
    width: 540,
    height: 960,
    fps: 30,
    duration: 2
  },
  ffmpeg: {
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.1/dist/ffmpeg-core.js'
  }
};

// Estado do aplicativo
const state = {
  stream: null,
  cancelRecording: false,
  mediaRecorder: null,
  recordingInterval: null,
  savedItems: JSON.parse(localStorage.getItem('savedItems')) || [],
  ffmpegLoaded: false
};

// Inicialização do FFmpeg
const ffmpeg = createFFmpeg({ 
  log: true,
  corePath: CONFIG.ffmpeg.corePath
});

// Funções Auxiliares
function showStatus(message, isError = false) {
  elements.statusOverlay.innerHTML = '';
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message ${isError ? 'error' : 'success'}`;
  statusDiv.textContent = message;
  elements.statusOverlay.appendChild(statusDiv);
  
  setTimeout(() => {
    statusDiv.classList.add('fade-out');
    setTimeout(() => elements.statusOverlay.removeChild(statusDiv), 500);
  }, 3000);
}

function resetView() {
  elements.contador.textContent = '';
  elements.statusOverlay.innerHTML = '';
}

async function initCamera() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'user'
      },
      audio: false
    });
    elements.video.srcObject = state.stream;
    await elements.video.play();
  } catch (err) {
    console.error("Erro na câmera:", err);
    showStatus("Erro ao acessar a câmera", true);
  }
}

// Função para Fotografar
async function capturarFoto() {
  try {
    elements.canvas.width = elements.video.videoWidth;
    elements.canvas.height = elements.video.videoHeight;
    const ctx = elements.canvas.getContext("2d");
    
    ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
    if (elements.moldura.complete) {
      ctx.drawImage(elements.moldura, 0, 0, elements.canvas.width, elements.canvas.height);
    }
    
    const imgData = elements.canvas.toDataURL("image/jpeg", 0.9);
    const blob = await (await fetch(imgData)).blob();
    
    const url = await saveToGallery(blob, `foto_${Date.now()}.jpg`, 'image/jpeg');
    
    if (url) {
      adicionarNaGaleria(url);
      gerarQRCode(url);
      showStatus("Foto salva com sucesso!", false);
    }
  } catch (error) {
    console.error("Erro na captura:", error);
    showStatus("Erro ao capturar foto", true);
  }
}

// Função do Bumerangue (completa no arquivo original)
// ... [Todo o restante do código JavaScript permanece igual ao anterior]
// (Incluindo todas as funções de bumerangue, galeria, etc.)

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await initCamera();
  
  // Carrega itens salvos
  state.savedItems.forEach(item => {
    adicionarNaGaleria(item.url, item.type.includes('video'));
  });

  // Event Listeners
  elements.fotoBtn.addEventListener('click', () => {
    let count = 5;
    elements.contador.textContent = count;
    
    state.recordingInterval = setInterval(() => {
      count--;
      elements.contador.textContent = count;
      elements.beep.play();
      
      if (count === 0) {
        clearInterval(state.recordingInterval);
        elements.contador.textContent = "";
        capturarFoto();
      }
    }, 1000);
  });

  elements.bumerangueBtn.addEventListener('click', iniciarBumerangue);
});
