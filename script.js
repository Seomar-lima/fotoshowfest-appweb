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
async function converterParaMP4(blob) {
  const apiKey = "SUA_CLOUDCONVERT_API_KEY_AQUI";
  const reader = new FileReader();

  reader.readAsDataURL(blob);

  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1];
    statusUpload.innerText = "Convertendo para MP4...";
    statusUpload.style.display = "block";
    contador.innerText = "";

    try {
      // 1. Upload base64
      const importRes = await fetch("https://api.cloudconvert.com/v2/import/base64", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file: base64Data,
          filename: `bumerangue_${Date.now()}.webm`
        })
      });
      const importTask = await importRes.json();

      // 2. Conversão
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

      // 3. Exportar para link público
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

      // 4. Aguardar status "finished"
      let mp4Url = null;
      for (let i = 0; i < 10; i++) {
        const statusRes = await fetch(`https://api.cloudconvert.com/v2/tasks/${exportTaskId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        });
        const statusJson = await statusRes.json();
        if (statusJson.data.status === "finished" && statusJson.data.result?.files?.[0]?.url) {
          mp4Url = statusJson.data.result.files[0].url;
          break;
        }
        await new Promise(r => setTimeout(r, 2000)); // espera 2 segundos
      }

      if (!mp4Url) throw new Error("Conversão não completada a tempo.");

      // 5. Baixar o arquivo convertido com nome único
      const a = document.createElement("a");
      a.href = mp4Url;
      a.download = `bumerangue_showfest_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 6. Gerar QR code
      gerarQRCode(mp4Url);
      contador.innerText = "Pronto!";
      statusUpload.style.display = "none";

    } catch (err) {
      console.error("Erro ao converter vídeo:", err);
      statusUpload.innerText = "Erro ao converter vídeo.";
      contador.innerText = "Erro ao finalizar";
      qrDiv.innerHTML = "<p style='color:red'>Erro ao converter o vídeo. Tente novamente.</p>";
    }
  };
}
