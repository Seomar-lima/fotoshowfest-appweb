// Elementos DOM
const video = document.getElementById("camera");
const cameraContainer = document.getElementById("camera-container");
const cameraStatus = document.getElementById("camera-status");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");

// Estado da Câmera
let cameraStream = null;

// Inicialização da Câmera
async function initCamera() {
  try {
    // Mostra status enquanto carrega
    showCameraStatus("Inicializando câmera...");
    
    // Solicita permissão da câmera
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });
    
    // Configura o elemento de vídeo
    video.srcObject = cameraStream;
    
    // Espera o vídeo estar pronto
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
    
    // Esconde a mensagem de status
    clearCameraStatus();
    
  } catch (error) {
    console.error("Erro ao acessar câmera:", error);
    showCameraStatus("Erro ao acessar câmera", true);
    
    // Desativa os botões
    fotoBtn.disabled = true;
    bumerangueBtn.disabled = true;
    
    // Mostra mensagem de erro permanente
    const errorMsg = document.createElement('div');
    errorMsg.className = 'status-message error';
    errorMsg.textContent = "Câmera não disponível";
    cameraStatus.appendChild(errorMsg);
  }
}

// Funções auxiliares para status da câmera
function showCameraStatus(message, isError = false) {
  cameraStatus.innerHTML = '';
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message ${isError ? 'error' : ''}`;
  statusDiv.textContent = message;
  cameraStatus.appendChild(statusDiv);
}

function clearCameraStatus() {
  cameraStatus.innerHTML = '';
}

// Função para capturar foto
async function capturarFoto() {
  try {
    // Cria canvas temporário
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Captura frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Adiciona moldura se disponível
    if (moldura.complete) {
      ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
    }
    
    // Converte para imagem
    const imageData = canvas.toDataURL('image/jpeg');
    
    // Aqui você pode adicionar o código para salvar/compartilhar
    console.log("Foto capturada:", imageData);
    
    showCameraStatus("Foto capturada!", false);
    
  } catch (error) {
    console.error("Erro ao capturar foto:", error);
    showCameraStatus("Erro ao capturar foto", true);
  }
}

// Event Listeners
fotoBtn.addEventListener('click', () => {
  // Contagem regressiva antes de capturar
  let count = 3;
  contador.textContent = count;
  contador.style.display = 'block';
  
  const countdown = setInterval(() => {
    count--;
    contador.textContent = count;
    beep.play();
    
    if (count <= 0) {
      clearInterval(countdown);
      contador.style.display = 'none';
      capturarFoto();
    }
  }, 1000);
});

// Inicializa a câmera quando a página carrega
window.addEventListener('DOMContentLoaded', initCamera);
