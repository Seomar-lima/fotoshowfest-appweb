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

// Configurações otimizadas para o Bumerangue VERTICAL
const BOOMERANG_SETTINGS = {
width: 540,      // Largura reduzida mantendo proporção vertical
height: 960,     // Altura proporcional ao formato 9:16 (vertical)
fps: 30,         // Frame rate reduzido
duration: 2      // 2 segundos de gravação
};

let stream;
let cancelRecording = false;
let mediaRecorder = null;
let recordingInterval = null;

// Função para rolar até o elemento
function scrollToElement(element) {
element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Função para resetar a visualização
function resetView() {
scrollToElement(previewContainer);
}

// Inicialização da câmera
navigator.mediaDevices.getUserMedia({
video: {
width: { ideal: 1920 },
height: { ideal: 1080 },
facingMode: 'user'
},
audio: false
})
.then(s => {
stream = s;
video.srcObject = stream;
video.play();
// Centraliza a câmera ao carregar
resetView();
})
.catch(err => {
console.error("Erro ao acessar a câmera:", err);
alert("Não foi possível acessar a câmera. Por favor, verifique as permissões.");
});

// Função para tirar foto
fotoBtn.onclick = () => {
resetView(); // Centraliza a câmera antes de começar

let count = 5;
contador.innerText = count;

// Limpa qualquer intervalo anterior
if (recordingInterval) clearInterval(recordingInterval);

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
};

function capturarFoto() {
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

if (moldura.complete && moldura.naturalHeight !== 0) {
ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
}

setTimeout(() => {
const imgData = canvas.toDataURL("image/png");
const img = new Image();
img.src = imgData;
img.style.cursor = "pointer";
img.onclick = () => {
const novaJanela = window.open();
novaJanela.document.write(<img src="${imgData}" style="width: 100%">);
};
galeria.appendChild(img);
enviarParaImgbb(imgData);
}, 300);
}

function enviarParaImgbb(imgData) {
const base64 = imgData.replace(/^data:image/png;base64,/, "");
const formData = new FormData();
formData.append("key", "586fe56b6fe8223c90078eae64e1d678");
formData.append("image", base64);
formData.append("name", "foto_showfest_" + Date.now());

qrDiv.innerHTML = "Enviando imagem...";

fetch("https://api.imgbb.com/1/upload", {
method: "POST",
body: formData
})
.then(response => response.json())
.then(data => {
if (data?.data?.url) {
gerarQRCode(data.data.url);
// Centraliza o QR code quando estiver pronto
setTimeout(() => scrollToElement(qrDiv), 500);
} else {
throw new Error("Resposta inválida do imgbb");
}
})
.catch(error => {
console.error("Erro no upload:", error);
qrDiv.innerHTML = "<p style='color:red'>Erro ao gerar QRCode. Tente novamente.</p>";
});
}

function gerarQRCode(link) {
qrDiv.innerHTML = "";

// Adiciona título explicativo
const title = document.createElement("h3");
title.textContent = "Escaneie para baixar:";
title.style.color = "#FFD700";
title.style.marginBottom = "10px";
qrDiv.appendChild(title);

const qrContainer = document.createElement("div");
qrContainer.style.margin = "0 auto";
qrContainer.style.width = "256px";
qrDiv.appendChild(qrContainer);

new QRCode(qrContainer, {
text: link,
width: 256,
height: 256,
colorDark: "#000000",
colorLight: "#ffffff",
correctLevel: QRCode.CorrectLevel.H
});

const downloadLink = document.createElement("a");
downloadLink.href = link;
downloadLink.textContent = "📥 Clique aqui se não conseguir escanear";
downloadLink.download = "";
downloadLink.style.display = "block";
downloadLink.style.margin = "15px auto";
downloadLink.style.padding = "10px";
downloadLink.style.background = "#FFD700";
downloadLink.style.color = "#000";
downloadLink.style.borderRadius = "8px";
downloadLink.style.textAlign = "center";
downloadLink.style.textDecoration = "none";
downloadLink.style.fontWeight = "bold";
qrDiv.appendChild(downloadLink);
}

// Função do bumerangue vertical
bumerangueBtn.onclick = async () => {
if (!stream) return alert("Câmera não inicializada.");

resetView(); // Centraliza a câmera antes de começar

// Mostra botão de cancelamento
const cancelBtn = document.getElementById('cancelBtn');
cancelBtn.style.display = 'block';
cancelRecording = false;
if (mediaRecorder) mediaRecorder = null;
if (recordingInterval) clearInterval(recordingInterval);

try {
let count = 3;
contador.innerText = count;
recordingInterval = setInterval(() => {
count--;
contador.innerText = count;
beep.play();
if (count === 0) {
clearInterval(recordingInterval);
contador.innerText = "Gravando...";
iniciarBumerangueVertical();
}
}, 1000);
} catch (error) {
console.error("Erro:", error);
contador.innerText = "Erro ao iniciar";
cancelBtn.style.display = 'none';
}
};

async function iniciarBumerangueVertical() {
const cancelBtn = document.getElementById('cancelBtn');

try {
const canvasVideo = document.createElement("canvas");
const ctx = canvasVideo.getContext("2d");

// Define a resolução vertical (retrato)  
canvasVideo.width = BOOMERANG_SETTINGS.width;  
canvasVideo.height = BOOMERANG_SETTINGS.height;  
  
const totalFrames = BOOMERANG_SETTINGS.fps * BOOMERANG_SETTINGS.duration;  
const frames = [];  
  
// 1. Captura os frames no formato vertical  
for (let i = 0; i < totalFrames; i++) {  
  if (cancelRecording) break;  
    
  // Ajusta o desenho para manter proporção vertical  
  const aspectRatio = video.videoWidth / video.videoHeight;  
  let drawWidth, drawHeight, offsetX, offsetY;  
    
  if (aspectRatio > 1) {  
    // Se a câmera estiver em paisagem, cortamos para ficar vertical  
    drawHeight = video.videoHeight;  
    drawWidth = video.videoHeight * (9/16);  
    offsetX = (video.videoWidth - drawWidth) / 2;  
    offsetY = 0;  
  } else {  
    // Já está em retrato  
    drawWidth = video.videoWidth;  
    drawHeight = video.videoHeight;  
    offsetX = 0;  
    offsetY = 0;  
  }  
    
  // Desenha o frame cortado para formato vertical  
  ctx.drawImage(video,   
    offsetX, offsetY, drawWidth, drawHeight,  
    0, 0, canvasVideo.width, canvasVideo.height  
  );  
    
  if (moldura.complete && moldura.naturalHeight !== 0) {  
    ctx.drawImage(moldura, 0, 0, canvasVideo.width, canvasVideo.height);  
  }  
    
  const frame = ctx.getImageData(0, 0, canvasVideo.width, canvasVideo.height);  
  frames.push(frame);  
  await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));  
}  
  
if (cancelRecording) {  
  contador.innerText = "Cancelado";  
  cancelBtn.style.display = 'none';  
  return;  
}  
  
contador.innerText = "Processando...";  
  
// 2. Cria o efeito boomerang (ida e volta)  
const finalFrames = [...frames, ...frames.slice().reverse()];  
  
// 3. Cria o vídeo em WebM (formato mais leve)  
const streamOut = canvasVideo.captureStream(BOOMERANG_SETTINGS.fps);  
mediaRecorder = new MediaRecorder(streamOut, {   
  mimeType: 'video/webm;codecs=vp9',  
  videoBitsPerSecond: 2000000 // 2 Mbps para qualidade balanceada  
});  
  
const chunks = [];  
  
return new Promise((resolve) => {  
  mediaRecorder.ondataavailable = e => chunks.push(e.data);  
  mediaRecorder.onstop = async () => {  
    try {  
      const blob = new Blob(chunks, { type: 'video/webm' });  
        
      // 1. Cria um FormData para upload  
      const formData = new FormData();  
      formData.append('file', blob, 'bumerangue.webm');  
        
      // 2. Faz upload para um servidor temporário  
      contador.innerText = "Enviando vídeo...";  
      const uploadResponse = await fetch('https://file.io/?expires=1d', {  
        method: 'POST',  
        body: formData  
      });  
        
      const { link } = await uploadResponse.json();  
        
      if (!link) throw new Error("Falha no upload");  
        
      // 3. Gera QR code com link permanente  
      gerarQRCode(link);  
      contador.innerText = "Pronto!";  
        
      // 4. Adiciona link de fallback  
      const downloadLink = document.createElement("a");  
      downloadLink.href = link;  
      downloadLink.textContent = "📥 Baixar Vídeo";  
      downloadLink.style.display = "block";  
      downloadLink.style.marginTop = "10px";  
      qrDiv.appendChild(downloadLink);  

      // Centraliza o QR code na tela  
      setTimeout(() => scrollToElement(qrDiv), 500);  
        
      resolve();  
    } catch (error) {  
      console.error("Erro:", error);  
      qrDiv.innerHTML = `  
        <p style="color:red">Erro ao gerar link.</p>  
        <button onclick="location.reload()">Tentar novamente</button>  
      `;  
      contador.innerText = "Erro ao finalizar";  
    } finally {  
      cancelBtn.style.display = 'none';  
    }  
  };  
    
  mediaRecorder.start();  
    
  // Renderiza os frames  
  (async () => {  
    for (const frame of finalFrames) {  
      if (cancelRecording) {  
        mediaRecorder.stop();  
        return;  
      }  
      ctx.putImageData(frame, 0, 0);  
      await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));  
    }  
    mediaRecorder.stop();  
  })();  
});

} catch (error) {
console.error("Erro no bumerangue:", error);
contador.innerText = "Erro no processamento";
cancelBtn.style.display = 'none';
throw error;
}
}

// Configura o botão de cancelamento
document.addEventListener('DOMContentLoaded', () => {
const cancelBtn = document.createElement("button");
cancelBtn.id = "cancelBtn";
cancelBtn.textContent = "✖ Cancelar Gravação";
cancelBtn.style.display = "none";
cancelBtn.style.background = "#ff4444";
cancelBtn.style.color = "white";
cancelBtn.style.border = "none";
cancelBtn.style.padding = "10px 15px";
cancelBtn.style.borderRadius = "5px";
cancelBtn.style.margin = "10px auto";
cancelBtn.style.cursor = "pointer";
cancelBtn.style.fontWeight = "bold";

cancelBtn.addEventListener('click', () => {
cancelRecording = true;
if (mediaRecorder && mediaRecorder.state !== 'inactive') {
mediaRecorder.stop();
}
if (recordingInterval) clearInterval(recordingInterval);
contador.innerText = "Cancelado";
setTimeout(() => {
document.getElementById('cancelBtn').style.display = 'none';
}, 2000);
});

document.body.appendChild(cancelBtn);
});

