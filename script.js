// Elementos DOM
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.getElementById("qrDownload");
const moldura = document.getElementById("moldura");
const previewContainer = document.getElementById("preview-container");

// Configurações
const BOOMERANG_SETTINGS = {
  width: 540,
  height: 960,
  fps: 30,
  duration: 2
};

// FFmpeg setup
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ 
  log: true,
  corePath: 'https://unpkg.com/@ffmpeg/core@0.10.1/dist/ffmpeg-core.js'
});
let ffmpegLoaded = false;

// Estado do aplicativo
let stream;
let cancelRecording = false;
let mediaRecorder = null;
let recordingInterval = null;
let savedItems = JSON.parse(localStorage.getItem('savedItems')) || [];

// Funções auxiliares
function scrollToElement(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetView() {
  scrollToElement(previewContainer);
}

function showStatus(message, isError = false) {
  const statusDiv = document.createElement('div');
  statusDiv.className = `status-message ${isError ? 'error' : 'success'}`;
  statusDiv.textContent = message;
  document.body.appendChild(statusDiv);
  setTimeout(() => statusDiv.remove(), 3000);
}

function adicionarNaGaleria(url) {
  const imgElement = document.createElement('img');
  imgElement.src = url;
  imgElement.style.maxWidth = '150px';
  imgElement.style.margin = '5px';
  imgElement.style.borderRadius = '5px';
  imgElement.style.border = '2px solid #FFD700';
  galeria.appendChild(imgElement);
  scrollToElement(imgElement);
}

// Inicialização da câmera
async function initCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'user'
      },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    resetView();
  } catch (err) {
    console.error("Erro na câmera:", err);
    showStatus("Erro ao acessar a câmera", true);
  }
}

// Função para salvar na galeria
async function saveToGallery(blob, fileName, type) {
  try {
    if (navigator.share) {
      await navigator.share({
        files: [new File([blob], fileName, { type })],
        title: 'Foto Show Fest'
      });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);
    }
    
    const itemUrl = URL.createObjectURL(blob);
    savedItems.push({ 
      url: itemUrl,
      fileName,
      type,
      timestamp: Date.now()
    });
    localStorage.setItem('savedItems', JSON.stringify(savedItems));
    
    return itemUrl;
  } catch (error) {
    console.error("Erro ao salvar:", error);
    return null;
  }
}

// Função para converter WebM para MP4
async function convertToMP4(webmBlob) {
  if (!ffmpegLoaded) {
    showStatus("Carregando conversor...", false);
    await ffmpeg.load();
    ffmpegLoaded = true;
  }

  try {
    showStatus("Convertendo para MP4...", false);
    ffmpeg.FS('writeFile', 'input.webm', await fetchFile(webmBlob));
    await ffmpeg.run(
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '28',
      '-movflags', '+faststart',
      '-an',
      'output.mp4'
    );
    const data = ffmpeg.FS('readFile', 'output.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  } catch (error) {
    console.error("Erro na conversão:", error);
    showStatus("Erro na conversão", true);
    return null;
  }
}

// Função do bumerangue
async function iniciarBumerangue() {
  if (!stream) {
    showStatus("Câmera não inicializada", true);
    return;
  }
  
  resetView();
  cancelRecording = false;
  
  try {
    let count = 3;
    contador.innerText = count;
    document.getElementById('cancelBtn').style.display = 'block';
    
    recordingInterval = setInterval(() => {
      count--;
      contador.innerText = count;
      beep.play();
      
      if (count === 0) {
        clearInterval(recordingInterval);
        contador.innerText = "Gravando...";
        gravarBumerangue();
      }
    }, 1000);
  } catch (error) {
    console.error("Erro:", error);
    showStatus("Erro ao iniciar gravação", true);
  }
}

async function gravarBumerangue() {
  const canvasVideo = document.createElement("canvas");
  const ctx = canvasVideo.getContext("2d");
  canvasVideo.width = BOOMERANG_SETTINGS.width;
  canvasVideo.height = BOOMERANG_SETTINGS.height;
  
  const frames = [];
  const totalFrames = BOOMERANG_SETTINGS.fps * BOOMERANG_SETTINGS.duration;
  
  // Captura os frames
  for (let i = 0; i < totalFrames; i++) {
    if (cancelRecording) break;
    
    ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
    if (moldura.complete) {
      ctx.drawImage(moldura, 0, 0, canvasVideo.width, canvasVideo.height);
    }
    
    frames.push(ctx.getImageData(0, 0, canvasVideo.width, canvasVideo.height));
    await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
  }
  
  if (cancelRecording) {
    contador.innerText = "";
    document.getElementById('cancelBtn').style.display = 'none';
    return;
  }
  
  contador.innerText = "Processando...";
  const finalFrames = [...frames, ...frames.slice().reverse()];
  
  // Cria o vídeo
  const streamOut = canvasVideo.captureStream(BOOMERANG_SETTINGS.fps);
  mediaRecorder = new MediaRecorder(streamOut, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 2500000
  });
  
  const chunks = [];
  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.onstop = () => processarVideo(chunks);
  mediaRecorder.start();
  
  // Renderiza os frames
  for (const frame of finalFrames) {
    if (cancelRecording) {
      mediaRecorder.stop();
      return;
    }
    ctx.putImageData(frame, 0, 0);
    await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
  }
  
  mediaRecorder.stop();
}

async function processarVideo(chunks) {
  try {
    const webmBlob = new Blob(chunks, { type: 'video/webm' });
    const mp4Blob = await convertToMP4(webmBlob);
    
    if (!mp4Blob) throw new Error("Conversão falhou");
    
    const url = await saveToGallery(
      mp4Blob, 
      `bumerangue_${Date.now()}.mp4`, 
      'video/mp4'
    );
    
    if (!url) throw new Error("Falha ao salvar");
    
    gerarQRCode(url);
    adicionarNaGaleria(url);
    contador.innerText = "";
    document.getElementById('cancelBtn').style.display = 'none';
    showStatus("Bumerangue salvo na galeria!", false);
  } catch (error) {
    console.error("Erro:", error);
    showStatus("Erro ao processar vídeo", true);
    contador.innerText = "";
    document.getElementById('cancelBtn').style.display = 'none';
  }
}

// Função para fotos
fotoBtn.addEventListener('click', () => {
  resetView();
  let count = 5;
  contador.innerText = count;
  
  recordingInterval = setInterval(() => {
    count--;
    contador.innerText = count;
    beep.play();
    
    if (count === 0) {
      clearInterval(recordingInterval);
      contador.innerText = "";
      capturarFoto();
    }
  }, 1000);
});

async function capturarFoto() {
  try {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (moldura.complete) {
      ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
    }
    
    const imgData = canvas.toDataURL("image/jpeg", 0.9);
    const blob = await (await fetch(imgData)).blob();
    
    const url = await saveToGallery(
      blob,
      `foto_${Date.now()}.jpg`,
      'image/jpeg'
    );
    
    if (url) {
      const shareUrl = await enviarParaImgbb(imgData);
      adicionarNaGaleria(shareUrl || url);
      showStatus("Foto salva na galeria!", false);
    }
  } catch (error) {
    console.error("Erro ao capturar foto:", error);
    showStatus("Erro ao capturar foto", true);
  }
}

async function enviarParaImgbb(imgData) {
  try {
    const base64 = imgData.split(',')[1];
    const formData = new FormData();
    formData.append('image', base64);
    
    const response = await fetch('https://api.imgbb.com/1/upload?key=586fe56b6fe8223c90078eae64e1d678', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (data.data?.url) {
      return data.data.url;
    }
    throw new Error('URL não recebida do ImgBB');
  } catch (error) {
    console.error("Upload falhou:", error);
    return null;
  }
}

function gerarQRCode(link) {
  qrDiv.innerHTML = '<h3 style="color:#FFD700">Escaneie para compartilhar</h3>';
  new QRCode(qrDiv, {
    text: link,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "rgba(255, 255, 255, 0.1)",
    correctLevel: QRCode.CorrectLevel.H
  });
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await initCamera();
  
  // Carrega itens salvos na galeria
  savedItems.forEach(item => {
    adicionarNaGaleria(item.url);
  });
  
  // Botão de cancelamento
  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.textContent = '✖ Cancelar';
  cancelBtn.style.display = 'none';
  cancelBtn.addEventListener('click', () => {
    cancelRecording = true;
    if (mediaRecorder?.state !== 'inactive') {
      mediaRecorder.stop();
    }
    clearInterval(recordingInterval);
    contador.innerText = "";
    cancelBtn.style.display = 'none';
  });
  document.body.appendChild(cancelBtn);
  
  bumerangueBtn.addEventListener('click', iniciarBumerangue);
});
