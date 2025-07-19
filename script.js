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
const GOFILE_API_KEY = "KPYdQuOsRhqo2QQr4zN0aJgJz4RCNcuc";
// Inicializar a câmera
async function iniciarCamera() {
  try {
    // Obter token e servidor do GoFile
    await getGoFileToken();
    
    // Iniciar câmera
    const s = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    });
    
    stream = s;
    video.srcObject = stream;
    video.play();
  } catch (err) {
    console.error("Erro ao acessar a câmera:", err);
    alert("Erro ao acessar a câmera. Verifique as permissões do navegador.");
  }
}

// Obter token do GoFile
async function getGoFileToken() {
  try {
    const response = await fetch('https://api.gofile.io/createAccount');
    const data = await response.json();
    if (data.status === 'ok') {
      goFileToken = data.data.token;
      await getGoFileServer();
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
  
  // Aplicar moldura
  if (moldura.complete && moldura.naturalHeight !== 0) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }
  
  // Processar após um pequeno delay
  setTimeout(() => {
    const imgData = canvas.toDataURL("image/png");
    
    // Adicionar à galeria
    addToGallery(imgData, 'image');
    
    // Salvar localmente como backup
    saveLocalFile(imgData, `foto_15anos_${Date.now()}.png`);
    
    // Enviar para o servidor e gerar QR code
    enviarParaImgbb(imgData);
  }, 300);
}

// Adicionar item à galeria
function addToGallery(data, type) {
  if (type === 'image') {
    const img = new Image();
    img.src = data;
    img.classList.add("gallery-item");
    galeria.appendChild(img);
  } 
  else if (type === 'video') {
    const video = document.createElement('video');
    video.src = data;
    video.controls = true;
    video.classList.add("gallery-item");
    galeria.appendChild(video);
  }
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
      const totalFrames = 15; // 15 frames (2 segundos a 7.5 fps)
      
      // Função para capturar frames
      function captureFrame() {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(tempVideo, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Aplicar moldura
        if (moldura.complete && moldura.naturalHeight !== 0) {
          tempCtx.drawImage(moldura, 0, 0, tempCanvas.width, tempCanvas.height);
        }
        
        frames.push(tempCanvas.toDataURL('image/png'));
        frameCount++;
        
        if (frameCount < totalFrames) {
          // Avançar o vídeo
          tempVideo.currentTime = (frameCount / totalFrames) * 2; // 2 segundos
          requestAnimationFrame(captureFrame);
        } else {
          createBoomerangVideo(frames);
        }
      }
      
      // Iniciar captura de frames
      tempVideo.currentTime = 0;
      tempVideo.play();
      setTimeout(() => {
        requestAnimationFrame(captureFrame);
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
  
  // Combinar frames originais + invertidos (remover o primeiro e último para evitar repetição)
  const boomerangFrames = [...frames, ...reverseFrames.slice(1, reverseFrames.length - 1)];
  
  // Criar canvas para gerar o vídeo
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = video.videoWidth;
  outputCanvas.height = video.videoHeight;
  const outputCtx = outputCanvas.getContext('2d');
  
  // Criar stream para gravar o vídeo
  const stream = outputCanvas.captureStream(15); // 15 FPS
  const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const webmBlob = new Blob(chunks, { type: 'video/webm' });
    
    // Converter para MP4 usando API
    try {
      const mp4Blob = await convertToMP4(webmBlob);
      const filename = `bumerangue_${Date.now()}.mp4`;
      const localUrl = URL.createObjectURL(mp4Blob);
      
      // Salvar localmente como backup
      saveLocalFile(localUrl, filename);
      
      // Adicionar à galeria
      addToGallery(localUrl, 'video');
      
      // Enviar para o GoFile
      if (goFileServer) {
        showProcessing("Enviando para a nuvem...");
        try {
          const downloadUrl = await uploadToGoFile(mp4Blob, filename);
          gerarQRCode(downloadUrl);
        } catch (error) {
          console.error("Erro ao enviar para GoFile:", error);
          gerarQRCode(localUrl);
        }
      } else {
        gerarQRCode(localUrl);
      }
    } catch (error) {
      console.error("Erro na conversão para MP4:", error);
      // Fallback: usar o WebM
      const localUrl = URL.createObjectURL(webmBlob);
      saveLocalFile(localUrl, `bumerangue_${Date.now()}.webm`);
      addToGallery(localUrl, 'video');
      gerarQRCode(localUrl);
    }
    
    hideProcessing();
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
      outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
      outputCtx.drawImage(img, 0, 0, outputCanvas.width, outputCanvas.height);
      frameIndex++;
      setTimeout(renderFrame, 66); // 15 FPS (1000/15 ≈ 66ms)
    };
  }
  
  renderFrame();
}

// Função para converter para MP4 usando API externa
async function convertToMP4(webmBlob) {
  showProcessing("Convertendo para MP4...");
  
  const formData = new FormData();
  formData.append('file', webmBlob, 'bumerangue.webm');
  
  try {
    const response = await fetch('https://api.pspdfkit.com/video/convert', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': 'Bearer YOUR_CONVERSION_API_KEY' // Obtenha uma chave de conversão
      }
    });
    
    if (!response.ok) throw new Error('Erro na conversão');
    
    const mp4Blob = await response.blob();
    return mp4Blob;
  } catch (error) {
    console.error("Erro na conversão:", error);
    throw error;
  }
}

// Função para enviar para GoFile
async function uploadToGoFile(blob, filename) {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('token', goFileToken);
  
  const response = await fetch(`https://${goFileServer}.gofile.io/uploadFile`, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  if (data.status === 'ok') {
    return data.data.downloadPage;
  } else {
    throw new Error(data.status);
  }
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
