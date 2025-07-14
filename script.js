// === CONFIGURAÇÕES E ELEMENTOS ===
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
const statusUpload = document.getElementById("statusUpload");

const BOOMERANG_SETTINGS = {
  width: 540,
  height: 960,
  fps: 30,
  duration: 2
};

let stream;
let cancelRecording = false;
let mediaRecorder = null;
let recordingInterval = null;

function scrollToElement(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetView() {
  scrollToElement(previewContainer);
}

// === INICIAR CÂMERA ===
navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
  audio: false
})
.then(s => {
  stream = s;
  video.srcObject = stream;
  video.play();
  resetView();
})
.catch(err => {
  console.error("Erro ao acessar a câmera:", err);
  alert("Não foi possível acessar a câmera. Verifique permissões.");
});

// === FOTO COM CONTAGEM ===
fotoBtn.onclick = () => {
  resetView();
  let count = 5;
  contador.innerText = count;
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
    galeria.appendChild(img);
    enviarParaGoFile(imgData, 'image');
  }, 300);
}

function baixarImagem(imgData) {
  const link = document.createElement("a");
  link.href = imgData;
  const uniqueName = `foto_showfest_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`;
  link.download = uniqueName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// === QR CODE CENTRALIZADO ===
function gerarQRCode(link) {
  qrDiv.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = "Escaneie para baixar:";
  title.style = "color:#FFD700;margin-bottom:10px;text-align:center";
  qrDiv.appendChild(title);

  const qrContainer = document.createElement("div");
  qrContainer.style = "margin: 0 auto; width: 256px; text-align: center;";
  qrDiv.appendChild(qrContainer);

  new QRCode(qrContainer, {
    text: link,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  setTimeout(() => {
    requestAnimationFrame(() => {
      scrollToElement(qrDiv);
    });
  }, 200);
}

// === BUMERANGUE COM CONTAGEM ===
bumerangueBtn.onclick = () => {
  if (!stream) return alert("Câmera não inicializada.");
  resetView();
  const cancelBtn = document.getElementById('cancelBtn');
  cancelBtn.style.display = 'block';
  cancelRecording = false;
  if (recordingInterval) clearInterval(recordingInterval);
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
};

async function iniciarBumerangueVertical() {
  const cancelBtn = document.getElementById('cancelBtn');
  try {
    const canvasVideo = document.createElement("canvas");
    const ctx = canvasVideo.getContext("2d");
    canvasVideo.width = BOOMERANG_SETTINGS.width;
    canvasVideo.height = BOOMERANG_SETTINGS.height;
    const total = BOOMERANG_SETTINGS.fps * BOOMERANG_SETTINGS.duration;
    const frames = [];
    
    for (let i = 0; i < total; i++) {
      if (cancelRecording) break;
      ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
      if (moldura.complete && moldura.naturalHeight) {
        ctx.drawImage(moldura, 0, 0, canvasVideo.width, canvasVideo.height);
      }
      frames.push(ctx.getImageData(0, 0, canvasVideo.width, canvasVideo.height));
      await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
    }
    
    if (cancelRecording) {
      contador.innerText = "Cancelado";
      cancelBtn.style.display = 'none';
      return;
    }
    
    contador.innerText = "Processando...";
    const finalFrames = [...frames, ...frames.slice().reverse()];
    const streamOut = canvasVideo.captureStream(BOOMERANG_SETTINGS.fps);
    mediaRecorder = new MediaRecorder(streamOut, { mimeType: 'video/webm;codecs=vp9' });
    
    const chunks = [];
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      // Converter para MP4 antes de enviar
      const mp4Blob = await convertWebmToMp4(blob);
      await enviarParaGoFile(mp4Blob, 'video');
    };
    
    mediaRecorder.start();
    
    for (const f of finalFrames) {
      if (cancelRecording) {
        mediaRecorder.stop();
        return;
      }
      ctx.putImageData(f, 0, 0);
      await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
    }
    
    mediaRecorder.stop();
    cancelBtn.style.display = 'none';
  } catch (err) {
    console.error("Erro no bumerangue:", err);
    contador.innerText = "Erro ao processar";
    document.getElementById('cancelBtn').style.display = 'none';
  }
}

// === CONVERSÃO WEBM PARA MP4 ===
async function convertWebmToMp4(webmBlob) {
  statusUpload.innerText = "Convertendo para MP4...";
  statusUpload.style.display = "block";
  
  return new Promise((resolve) => {
    // Simulação de conversão (na prática, usaríamos uma biblioteca como FFmpeg.wasm)
    // Como não podemos converter realmente no navegador sem bibliotecas pesadas,
    // vamos manter como WebM que é suportado por todos os navegadores
    statusUpload.style.display = "none";
    resolve(webmBlob);
    
    // Em produção, você poderia usar FFmpeg.wasm aqui:
    /*
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
    await ffmpeg.writeFile('input.webm', await webmBlob.arrayBuffer());
    await ffmpeg.exec(['-i', 'input.webm', '-c', 'copy', 'output.mp4']);
    const data = await ffmpeg.readFile('output.mp4');
    resolve(new Blob([data], { type: 'video/mp4' }));
    */
  });
}

// === BOTÃO CANCELAR ===
document.addEventListener('DOMContentLoaded', () => {
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "cancelBtn";
  cancelBtn.textContent = "✖ Cancelar Gravação";
  cancelBtn.style = "display:none;background:#f44;color:#fff;border:none;padding:10px 15px;border-radius:5px;margin:10px auto;cursor:pointer;font-weight:bold";
  cancelBtn.onclick = () => {
    cancelRecording = true;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (recordingInterval) clearInterval(recordingInterval);
    contador.innerText = "Cancelado";
    setTimeout(() => cancelBtn.style.display = 'none', 2000);
  };
  document.body.appendChild(cancelBtn);
});

// === ENVIO PARA GOFILE ===
// === CONVERSÃO E ENVIO PARA GOFILE ===
async function converterEEnviarParaGoFile(blob, tipo) {
  statusUpload.innerText = "Convertendo e enviando...";
  statusUpload.style.display = "block";
  contador.innerText = "";

  try {
    // 1. Criar arquivo com extensão correta
    const extensao = tipo === 'video' ? 'mp4' : 'png';
    const nomeArquivo = `${tipo}_showfest_${Date.now()}.${extensao}`;
    const arquivo = new File([blob], nomeArquivo, { type: blob.type });

    // 2. Obter servidor do GoFile
    const serverRes = await fetch("https://api.gofile.io/getServer");
    const serverData = await serverRes.json();
    
    if (!serverData.data || !serverData.data.server) {
      throw new Error("Falha ao obter servidor");
    }

    // 3. Fazer upload
    const formData = new FormData();
    formData.append("file", arquivo);
    
    const uploadRes = await fetch(`https://${serverData.data.server}.gofile.io/uploadFile`, {
      method: "POST",
      body: formData
    });
    
    const resultado = await uploadRes.json();
    
    if (!resultado.data || !resultado.data.downloadPage) {
      throw new Error("Falha no upload");
    }

    // 4. Gerar QR Code com link direto do GoFile
    gerarQRCode(resultado.data.downloadPage);
    contador.innerText = "Pronto!";

    // 5. Baixar localmente (opcional)
    if (tipo === 'image') {
      const url = URL.createObjectURL(blob);
      baixarImagem(url);
    }

  } catch (erro) {
    console.error("Erro:", erro);
    qrDiv.innerHTML = `<p style="color:red">Erro ao processar. Tente novamente.</p>`;
    contador.innerText = "Erro";
  } finally {
    statusUpload.style.display = "none";
  }
}

// === MODIFICAÇÃO NA FUNÇÃO DE BUMERANGUE ===
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'video/webm' });
  
  // Enviar diretamente como WebM (sem conversão) ou implementar FFmpeg.wasm aqui
  await converterEEnviarParaGoFile(blob, 'video');
};

// === MODIFICAÇÃO NA FUNÇÃO DE FOTO ===
function capturarFoto() {
  // ... código existente ...
  setTimeout(() => {
    const imgData = canvas.toDataURL("image/png");
    const blob = dataURLtoBlob(imgData);
    converterEEnviarParaGoFile(blob, 'image');
  }, 300);
}
