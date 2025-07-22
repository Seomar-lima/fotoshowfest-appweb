// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const voltarBtn = document.getElementById("voltar");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const qrDiv = document.getElementById("qrDownload");
const qrContainer = document.getElementById("qrCode");
const moldura = document.getElementById("moldura");
const processing = document.getElementById("processing");
const processingText = document.getElementById("processing-text");

// Variáveis globais
let stream;
let qrGenerated = false;

// 1. Configuração Inicial da Câmera (Sem Zoom)
async function iniciarCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 720 }, // Resolução mais baixa para melhor performance
        height: { ideal: 1280 }
      },
      audio: false
    });
    
    video.srcObject = stream;
    video.play();
    
    // Ajustar moldura após a câmera carregar
    video.onloadedmetadata = () => {
      console.log("Câmera pronta - Resolução:", video.videoWidth, "x", video.videoHeight);
    };
    
  } catch (err) {
    console.error("Erro na câmera:", err);
    alert("Não foi possível acessar a câmera. Por favor, verifique as permissões.");
  }
}

// 2. Função para Tirar Foto (Rápida)
function takePhoto() {
  if (qrGenerated) {
    qrDiv.style.display = "none";
    qrGenerated = false;
  }
  
  // Contagem regressiva visual
  let count = 3;
  contador.innerText = count;
  contador.classList.add('visible');
  
  // Áudio de contagem
  playBeep();
  
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    playBeep();
    
    if (count === 0) {
      clearInterval(interval);
      contador.classList.remove('visible');
      capturePhoto();
    }
  }, 1000);
}

// 3. Captura Rápida da Foto
function capturePhoto() {
  // Configurar canvas com proporção correta
  const aspectRatio = 9/16;
  canvas.width = video.videoWidth;
  canvas.height = video.videoWidth / aspectRatio;
  
  const ctx = canvas.getContext("2d");
  
  // Cortar a imagem para manter a proporção 9:16
  const sourceY = (video.videoHeight - canvas.height) / 2;
  ctx.drawImage(video, 0, sourceY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  
  // Aplicar moldura (com object-fit: contain)
  if (moldura.complete) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  // Gerar QR Code localmente (rápido)
  setTimeout(() => {
    const imgData = canvas.toDataURL("image/jpeg", 0.85); // Qualidade reduzida para performance
    generateLocalQRCode(imgData);
  }, 100);
}

// 4. Geração Rápida do QR Code (Local)
function generateLocalQRCode(imgData) {
  showProcessing("Gerando QR Code...");
  
  // Simulação de processamento rápido (remova o setTimeout se quiser instantâneo)
  setTimeout(() => {
    qrContainer.innerHTML = "";
    
    // Usando a biblioteca QRCode (já incluída)
    new QRCode(qrContainer, {
      text: imgData, // Usando a imagem local diretamente
      width: 250,
      height: 250,
      colorDark: "#ff6b6b",
      colorLight: "#ffffff",
      margin: 4
    });
    
    hideProcessing();
    qrDiv.style.display = "flex";
    qrGenerated = true;
  }, 500); // Tempo reduzido para 0.5s
}

// Funções auxiliares
function playBeep() {
  beep.currentTime = 0;
  beep.play().catch(e => console.log("Erro no áudio:", e));
}

function showProcessing(text) {
  processingText.textContent = text;
  processing.style.display = "flex";
}

function hideProcessing() {
  processing.style.display = "none";
}

// Event Listeners
fotoBtn.addEventListener("click", takePhoto);
voltarBtn.addEventListener("click", () => {
  qrDiv.style.display = "none";
});

// Iniciar a câmera quando a página carregar
document.addEventListener('DOMContentLoaded', iniciarCamera);

// Garantir que a moldura carregou
moldura.onload = () => {
  console.log("Moldura carregada com sucesso");
};
moldura.onerror = () => {
  console.log("Erro ao carregar moldura");
  moldura.src = ""; // Remove a moldura se não carregar
};
