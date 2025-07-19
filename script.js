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
  
  let count = 5;
  contador.innerText = count;
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
  
  let count = 3;
  contador.innerText = count;
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
    if (mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      isRecording = false;
    }
  }, 2000);
}

// Processar bumerangue
async function processBoomerang() {
  showProcessing("Processando bumerangue...");
  
  try {
    // Criar um blob do vídeo gravado
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(blob);
    
    // Criar elemento de vídeo temporário
    const tempVideo = document.createElement('video');
    tempVideo.src = videoUrl;
    
    // Aguardar carregamento do vídeo
    await new Promise((resolve) => {
      tempVideo.onloadedmetadata = () => {
        tempVideo.currentTime = 0;
        resolve();
      };
    });
    
    // Criar canvas para processamento
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tempVideo.videoWidth;
    tempCanvas.height = tempVideo.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Calcular número de quadros (30 fps)
    const frameCount = Math.floor(tempVideo.duration * 30);
    const frames = [];
    
    // Capturar quadros do vídeo
    for (let i = 0; i < frameCount; i++) {
      tempVideo.currentTime = i / 30;
      await new Promise(r => tempVideo.onseeked = r);
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(tempVideo, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Aplicar moldura
      if (moldura.complete && moldura.naturalHeight !== 0) {
        tempCtx.drawImage(moldura, 0, 0, tempCanvas.width, tempCanvas.height);
      }
      
      frames.push(tempCanvas.toDataURL('image/jpeg'));
    }
    
    // Criar bumerangue: normal + reverso (excluindo o último quadro para evitar repetição)
    const bumerangueFrames = [...frames, ...frames.slice(0, -1).reverse()];
    
    // Para demonstração, vamos usar o primeiro quadro como preview
    const img = new Image();
    img.src = bumerangueFrames[0];
    img.classList.add("gallery-item");
    galeria.appendChild(img);
    
    // Simular upload
    simulateUpload(bumerangueFrames[0], "bumerangue");
    
    // Liberar memória
    URL.revokeObjectURL(videoUrl);
    
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
}

// Esconder tela de processamento
function hideProcessing() {
  processing.style.display = "none";
}

// Fallback para moldura
moldura.onerror = function() {
  console.log("Erro ao carregar moldura. Usando fallback.");
  // Pode definir uma imagem de fallback aqui se quiser
};
