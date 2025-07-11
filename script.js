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
  link.download = "foto_showfest_" + Date.now() + ".png";
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

bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");

  resetView();
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

    const finalFrames = [...frames, ...frames.slice().reverse()];
    const streamOut = canvasVideo.captureStream(BOOMERANG_SETTINGS.fps);
    mediaRecorder = new MediaRecorder(streamOut, { mimeType: 'video/webm;codecs=vp9' });
    const chunks = [];

    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);

          gerarQRCode(videoUrl);
          baixarVideo(blob);
          contador.innerText = "Pronto!";
          cancelBtn.style.display = 'none';
          setTimeout(() => scrollToElement(qrDiv), 500);
        } catch (error) {
          console.error("Erro ao processar vídeo:", error);
          contador.innerText = "Erro ao finalizar";
          qrDiv.innerHTML = "<p style='color:red'>Erro ao processar o vídeo. Tente novamente.</p>";
          cancelBtn.style.display = 'none';
        }
      };

      mediaRecorder.start();

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
      cancelBtn.style.display = 'none';
    }, 2000);
  });

  document.body.appendChild(cancelBtn);
});

function baixarVideo(blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bumerangue_showfest_" + Date.now() + ".webm";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
