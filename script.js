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

// === CAPTURA FOTO COM MOLDURA ===
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

// === DOWNLOAD DE IMAGEM ===
function baixarImagem(imgData) {
  const link = document.createElement("a");
  link.href = imgData;
  const uniqueName = `foto_showfest_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`;
  link.download = uniqueName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// === ENVIO IMAGEM PARA IMGBB ===
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
  .then(response => response.json())
  .then(data => {
    if (data?.data?.url) {
      gerarQRCode(data.data.url);
      baixarImagem("data:image/png;base64," + base64);
      setTimeout(() => scrollToElement(qrDiv), 500);
    } else {
      throw new Error("Resposta inválida do imgbb");
    }
  })
  .catch(error => {
    console.error("Erro no upload:", error);
    qrDiv.innerHTML = "<p style='color:red'>Erro ao gerar QRCode. Tente novamente.</p>";
  })
  .finally(() => {
    statusUpload.style.display = "none";
  });
}

// === GERA QR CODE ===
function gerarQRCode(link) {
  qrDiv.innerHTML = "";
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
}

// === BOTÃO DE BUMERANGUE ===
bumerangueBtn.onclick = () => {
  if (!stream) return alert("Câmera não inicializada.");
  resetView();
  const cancelBtn = document.getElementById('cancelBtn');
  cancelBtn.style.display = 'block';
  cancelRecording = false;

  if (mediaRecorder) mediaRecorder = null;
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

// === GRAVAÇÃO E PROCESSAMENTO DO BUMERANGUE ===
async function iniciarBumerangueVertical() {
  const cancelBtn = document.getElementById('cancelBtn');
  try {
    const canvasVideo = document.createElement("canvas");
    const ctx = canvasVideo.getContext("2d");
    canvasVideo.width = BOOMERANG_SETTINGS.width;
    canvasVideo.height = BOOMERANG_SETTINGS.height;

    const totalFrames = BOOMERANG_SETTINGS.fps * BOOMERANG_SETTINGS.duration;
    const frames = [];

    for (let i = 0; i < totalFrames; i++) {
      if (cancelRecording) break;
      ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
      if (moldura.complete && moldura.naturalHeight !== 0) {
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
      baixarVideo(blob);
    };

    mediaRecorder.start();
    for (const frame of finalFrames) {
      if (cancelRecording) {
        mediaRecorder.stop();
        return;
      }
      ctx.putImageData(frame, 0, 0);
      await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
    }
    mediaRecorder.stop();
    cancelBtn.style.display = 'none';
  } catch (err) {
    console.error("Erro no bumerangue:", err);
    contador.innerText = "Erro ao processar";
    cancelBtn.style.display = 'none';
  }
}

// === BOTÃO CANCELAR ===
document.addEventListener('DOMContentLoaded', () => {
  const cancelBtn = document.createElement("button");
  cancelBtn.id = "cancelBtn";
  cancelBtn.textContent = "✖ Cancelar Gravação";
  cancelBtn.style = "display:none;background:#f44;color:white;border:none;padding:10px 15px;border-radius:5px;margin:10px auto;cursor:pointer;font-weight:bold;";
  cancelBtn.onclick = () => {
    cancelRecording = true;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (recordingInterval) clearInterval(recordingInterval);
    contador.innerText = "Cancelado";
    setTimeout(() => { cancelBtn.style.display = 'none'; }, 2000);
  };
  document.body.appendChild(cancelBtn);
});

// === CONVERSÃO WEBM → MP4 + QR CODE ===
function baixarVideo(blob) {
  const apiKey = "SUA_CLOUDCONVERT_API_KEY_AQUI";

  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1];
    statusUpload.innerText = "Convertendo para MP4...";
    statusUpload.style.display = "block";
    contador.innerText = "";

    try {
      const importRes = await fetch("https://api.cloudconvert.com/v2/import/base64", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file: base64Data,
          filename: "bumerangue.webm"
        })
      });
      const importTask = await importRes.json();

      const convertRes = await fetch("https://api.cloudconvert.com/v2/convert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: importTask.data.id,
          output_format: "mp4"
        })
      });
      const convertTask = await convertRes.json();

      const exportRes = await fetch("https://api.cloudconvert.com/v2/export/url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: convertTask.data.id
        })
      });
      const exportTask = await exportRes.json();
      const exportTaskId = exportTask.data.id;

      let mp4Url = null;
      for (let i = 0; i < 10; i++) {
        const statusRes = await fetch(`https://api.cloudconvert.com/v2/tasks/${exportTaskId}`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const statusJson = await statusRes.json();
        if (statusJson.data.status === "finished" && statusJson.data.result?.files?.[0]?.url) {
          mp4Url = statusJson.data.result.files[0].url;
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (!mp4Url) throw new Error("Conversão falhou.");

      // Baixar localmente com nome único
      const videoBlob = await fetch(mp4Url).then(r => r.blob());
      const blobUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `bumerangue_showfest_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      // Encurtar link
      let shortLink = mp4Url;
      try {
        const shortRes = await fetch("https://cleanuri.com/api/v1/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ url: mp4Url })
        });
        const shortData = await shortRes.json();
        shortLink = shortData.result_url || mp4Url;
      } catch (e) {
        console.warn("Erro ao encurtar link:", e);
      }

      gerarQRCode(shortLink);
      contador.innerText = "Pronto!";
      statusUpload.style.display = "none";

    } catch (err) {
      console.error("Erro ao converter vídeo:", err);
      contador.innerText = "Erro ao finalizar";
      statusUpload.innerText = "Erro ao converter vídeo.";
      qrDiv.innerHTML = "<p style='color:red'>Erro ao converter vídeo. Tente novamente.</p>";
    }
  };
}
