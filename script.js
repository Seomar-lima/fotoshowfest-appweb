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
    enviarParaImgbb(imgData);
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

function enviarParaImgbb(imgData) {
  const base64 = imgData.replace(/^data:image\/png;base64,/, "");
  const formData = new FormData();
  formData.append("key", "586fe56b6fe8223c90078eae64e1d678");
  formData.append("image", base64);
  formData.append("name", "foto_showfest_" + Date.now());
  contador.innerText = "";
  statusUpload.innerText = "Enviando imagem...";
  statusUpload.style.display = "block";
  fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData
  })
  .then(r => r.json())
  .then(data => {
    if (data?.data?.url) {
      gerarQRCode(data.data.url);
      baixarImagem(imgData);
      setTimeout(() => scrollToElement(qrDiv), 500);
    } else {
      throw new Error("Resposta inválida do imgbb");
    }
  })
  .catch(err => {
    console.error("Erro no upload:", err);
    qrDiv.innerHTML = "<p style='color:red'>Erro ao gerar QRCode. Tente novamente.</p>";
  })
  .finally(() => statusUpload.style.display = "none");
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

  // Garante que o scroll execute depois do QR ser realmente renderizado no DOM
  setTimeout(() => {
    requestAnimationFrame(() => {
      scrollToElement(qrDiv);
    });
  }, 200); // Pequeno atraso para permitir que o DOM atualize
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
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      converterParaMP4(blob);
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

// === CONVERSÃO PARA MP4 E QR CODE ===
async function converterParaMP4(blob) {
  statusUpload.innerText = "Enviando para o servidor...";
  statusUpload.style.display = "block";
  contador.innerText = "";

  try {
    const formData = new FormData();
    const filename = `bumerangue_showfest_${Date.now()}_${Math.floor(Math.random() * 10000)}.webm`;
    formData.append("file", blob, filename);

    const uploadRes = await fetch("https://store1.gofile.io/uploadFile", {
      method: "POST",
      body: formData
    });

    const result = await uploadRes.json();
    if (!result || !result.data || !result.data.downloadPage) {
      throw new Error("Erro ao enviar para o GoFile");
    }

    const link = result.data.downloadPage;
    const viewerURL = `https://fotoshowfest.vercel.app/viewer.html?file=${encodeURIComponent(link)}`;
    gerarQRCode(viewerURL);
    contador.innerText = "Pronto!";
  } catch (err) {
    console.error("Erro ao enviar para o GoFile:", err);
    contador.innerText = "Erro ao finalizar";
    statusUpload.innerText = "Erro ao enviar vídeo.";
    qrDiv.innerHTML = "<p style='color:red'>Erro ao enviar o vídeo. Tente novamente.</p>";
  } finally {
    statusUpload.style.display = "none";
  }
}
