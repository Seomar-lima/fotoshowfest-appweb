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
  const apiKey ="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiZjNjZGY1MmRlZTUwZTgwNjk3NDI4ZmM1OGQwYWU0YzgzMjM2MWRiNjU3ZDYyMTdiZmJkMzNhZjlmMmY2M2I4MWYxNWZhMWMxMDEzZTMwMDgiLCJpYXQiOjE3NTIyNTMxNzQuMzk1NjUzLCJuYmYiOjE3NTIyNTMxNzQuMzk1NjU1LCJleHAiOjQ5MDc5MjY3NzQuMzg5NzU1LCJzdWIiOiI3MjIwODAyMyIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwid2ViaG9vay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.qF8t3vTkWuo3RNdsh2Sz2ULv-UJ3p0_iaOcafk5zEBg778IpEJ-WN7TDu8XVuo4ZnHy4IQ9u-2u1hv3giT_vN8QrUrZvJGK8MxrUC5zUzyO0mKFdOjDp9j4qvR-OrLZI3UIBbcXVMs2NExnDtmubR2cfKwkGmDs6jJ3rh-MBlVPlTu30BvocQAwe9C-n-Nr9I7E1fHo11M_Dz7mSj0m_deqJDjpk4r-Iu_6hwmzXacKi550j-f7fUJ3oZdGBH6dr-24WcEP3CiLTR0utLx5HtFDwcJhbBjhbTE0kycH_xIMuKUC2b8DLwZs_X07xsLcT6N1iAWSNbieyw1AcN7iLDn1-Lwqyxp4QlnvDNxN04rlcgkynd_2fQCA_isex0gie0f1wBJWm3X2I5cieUdXqPPzlv-uLz3SisBnhiMZpTQTTMro84mBMeucxjXIFGWHINp4ooMFXWzcUxoDml7l07ISJGC5Zyu_vOvwJKAVFUJ62oBudjOGq_tS5XItXqbm9_aTMiXBHru9D6GK7lO6x70KEaUvMQu2wI5Dhee3I0S7shknALcjB2tCbCjRnpJ1DRL3BV7amIkdLB5jSUbM1XTZ4BZwl5j9Vp0iO1sfL0zbLDYRh1IFgEFYlyUvQuw4wSmXiFvzMsL-tX1aFESRYc_VA75J1CrXTo40nwKSefW4";

  const reader = new FileReader();
  reader.readAsDataURL(blob);

  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1];
    statusUpload.innerText = "Convertendo para MP4...";
    statusUpload.style.display = "block";
    contador.innerText = "";

    let taskId = null; // vamos manter isso acessível ao catch
    try {
      // Importar arquivo
      const importRes = await fetch("https://api.cloudconvert.com/v2/import/base64", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64Data, filename: `bumerangue_${Date.now()}.webm` })
      });
      const importTask = await importRes.json();
      if (!importTask?.data?.id) throw new Error("Erro ao importar");

      // Converter para MP4
      const convertRes = await fetch("https://api.cloudconvert.com/v2/convert", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: importTask.data.id, output_format: "mp4" })
      });
      const convertTask = await convertRes.json();
      if (!convertTask?.data?.id) throw new Error("Erro ao converter");

      // Exportar
      const exportRes = await fetch("https://api.cloudconvert.com/v2/export/url", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: convertTask.data.id })
      });
      const exportTask = await exportRes.json();
      taskId = exportTask.data.id; // Guardamos o taskId aqui para deletar se falhar

      let mp4Url = null;
      for (let i = 0; i < 10; i++) {
        const st = await (await fetch(`https://api.cloudconvert.com/v2/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        })).json();
        if (st.data.status === "finished" && st.data.result?.files?.[0]?.url) {
          mp4Url = st.data.result.files[0].url;
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (!mp4Url) throw new Error("Conversão não finalizada");

      // Download
      const finalBlob = await fetch(mp4Url).then(r => r.blob());
      const blobUrl = URL.createObjectURL(finalBlob);
      const uniqueName = `bumerangue_showfest_${Date.now()}_${Math.floor(Math.random()*10000)}.mp4`;
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = uniqueName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      // Link curto
      let link = mp4Url;
      try {
        const s = await fetch("https://cleanuri.com/api/v1/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ url: mp4Url })
        });
        const d = await s.json();
        link = d.result_url || mp4Url;
      } catch {}

      const viewerURL = `https://fotoshowfest.vercel.app/viewer.html?file=${encodeURIComponent(link)}`;
      gerarQRCode(viewerURL);
      contador.innerText = "Pronto!";
      statusUpload.style.display = "none";
    } catch (err) {
      console.error("Erro ao converter vídeo:", err);
      contador.innerText = "Erro ao finalizar";
      statusUpload.innerText = "Erro ao converter vídeo.";
      qrDiv.innerHTML = "<p style='color:red'>Erro ao converter o vídeo. Tente novamente.</p>";
      // Se souber o taskId, tentamos deletar
      if (taskId) await deletarTarefaCloudConvert(taskId, apiKey);
    }
  };
}

// === Função para limpar o arquivo no CloudConvert ===
async function deletarTarefaCloudConvert(taskId, apiKey) {
  try {
    const res = await fetch(`https://api.cloudconvert.com/v2/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (res.ok) {
      console.log("🧹 Arquivo deletado do CloudConvert.");
    } else {
      console.warn("⚠️ Não foi possível deletar o arquivo.");
    }
  } catch (e) {
    console.error("Erro ao tentar deletar tarefa:", e);
  }
}
