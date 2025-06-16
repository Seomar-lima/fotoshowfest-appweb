const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.getElementById("qrDownload");
const moldura = document.getElementById("moldura");

let stream;

navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: false })
  .then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
  })
  .catch(err => {
    console.error("Erro ao acessar a câmera:", err);
  });

fotoBtn.onclick = () => {
  let count = 5;
  contador.innerText = count;
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    beep.play();
    if (count === 0) {
      clearInterval(interval);
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
      novaJanela.document.write(`<img src="${imgData}" style="width: 100%">`);
    };
    galeria.appendChild(img);
    enviarParaImgbb(imgData);
  }, 300);
}

function enviarParaImgbb(imgData) {
  const base64 = imgData.replace(/^data:image\/png;base64,/, "");
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
      if (data?.data?.url) gerarQRCode(data.data.url);
      else throw new Error("Resposta inválida do imgbb");
    })
    .catch(error => {
      console.error("Erro no upload:", error);
      qrDiv.innerText = "Erro ao gerar QRCode.";
      qrDiv.style.color = "red";
    });
}

function gerarQRCode(link) {
  qrDiv.innerHTML = "";
  const qrContainer = document.createElement("div");
  qrContainer.style.margin = "10px auto";
  qrDiv.appendChild(qrContainer);

  new QRCode(qrContainer, {
    text: link,
    width: 256,
    height: 256,
    margin: 4
  });

  const a = document.createElement("a");
  a.href = link;
  a.innerText = "📥 Baixar";
  a.download = "";
  a.style.display = "block";
  a.style.textAlign = "center";
  a.style.marginTop = "10px";
  a.style.fontWeight = "bold";
  qrDiv.appendChild(a);
}

bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");

  let count = 5;
  contador.innerText = count;
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    beep.play();
    if (count === 0) {
      clearInterval(interval);
      contador.innerText = "Gravando...";
      iniciarBumerangue();
    }
  }, 1000);
};

async function iniciarBumerangue() {
  const canvasVideo = document.createElement("canvas");
  const ctx = canvasVideo.getContext("2d");

  const fps = 60;
  const duration = 2;
  const totalFrames = fps * duration;
  const frames = [];

  canvasVideo.width = video.videoWidth;
  canvasVideo.height = video.videoHeight;

  for (let i = 0; i < totalFrames; i++) {
    ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
    if (moldura.complete) {
      ctx.drawImage(moldura, 0, 0, canvasVideo.width, canvasVideo.height);
    }
    const frame = ctx.getImageData(0, 0, canvasVideo.width, canvasVideo.height);
    frames.push(frame);
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  contador.innerText = "Renderizando vídeo...";

  const finalFrames = [...frames, ...frames.slice().reverse()];
  const streamOut = canvasVideo.captureStream(fps);
  const recorder = new MediaRecorder(streamOut);
  const chunks = [];

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'video/webm' });

    // Upload do .webm para o CloudConvert
    const cloudConvertAPI = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNDY0NDVmZWFjNDgwNWUwMGZlMjZkMDY5YWUyZGUwNDA4Y2FmYmZhM2QwODc1YTA5MTEwNWIwNjU3NGRhY2VmZmE0ZTYxMzk4NmI1ZjlhZjEiLCJpYXQiOjE3NTAwMzg2NDUuNzMzMDcyLCJuYmYiOjE3NTAwMzg2NDUuNzMzMDc0LCJleHAiOjQ5MDU3MTIyNDUuNzI3NTI0LCJzdWIiOiI3MjIwODAyMyIsInNjb3BlcyI6W119.ogOvB5v5XPJtBtvIGSXgJYwo8EozOtkY_i2wRfKrr5DWrZhtPKVBm5VJ-WjE1qb1SyB2oDXA1CbqszQ4ns-T6_wGJIsu28BeI0UlfrmccOGyYldZNtx00Ux0AA5rQgpEn0NQ4Lj93alHzoRkrWsuC7ZuR8d8X6pP6LPfHdL5y7drItrGupaa27ruTRCrAHtbEL-29f7TCnnJwOdfM0IZk19tenLBVf-mwfdr_svljSdbGBc-BFkwFoQmfbwxFaRoJQNWS2b4oWnJufzIsOJE3r15nubRDB4mL5yrakSkyXZXymQBrauDYBiYtBAMv0xyYd6KwDnEC5OKBqZHAUteQXaiQkLzQrP3w9R_N1tPqhZmAUMYX8cOB43izFdjiUga017imitLUr00kh_cW0rA2I1emWEFLKGDHPdKRtnrfMu3f477P41DLzgTheloHVcuX4zSkM4eH9SFVf8alJL_9cSgALU8OKY2U8xkiepj9fs7sQGWru06SfM9_3Kvnh9pNCIanV8w5rKfwKVFQF74vdyX903YNnjPp0s8SQFnUjz8fYvvRiSSs28b9T_bueQAxDNfJ4HhbxZB4dhBxc_C3M2dYB0Asb8pVReHwYbi_bQaPZClSu2yH47-kzA3HMA9zSnnkZ7S8KPD1swc-1VxAxdZ7gKwCZSNIpi9A8sA2Kc";

    const uploadRes = await fetch("https://upload.gofile.io/uploadfile", {
      method: "POST",
      body: (() => {
        const form = new FormData();
        form.append("file", blob, "video.webm");
        return form;
      })()
    }).then(r => r.json());

    const fileURL = uploadRes.data.downloadPage;

    // Criação do job no CloudConvert
    const job = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + cloudConvertAPI,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tasks: {
          import_url: {
            operation: "import/url",
            url: fileURL
          },
          convert: {
            operation: "convert",
            input: "import_url",
            output_format: "mp4"
          },
          export_url: {
            operation: "export/url",
            input: "convert"
          }
        }
      })
    }).then(res => res.json());

    const exportTask = job.data.tasks.find(t => t.name === "export_url");
    const downloadURL = exportTask.result?.files?.[0]?.url;

    contador.innerText = "";
    if (downloadURL) gerarQRCode(downloadURL);
    else qrDiv.innerText = "Erro ao obter link convertido.";
  };

  recorder.start();

  for (const frame of finalFrames) {
    ctx.putImageData(frame, 0, 0);
    await new Promise(r => setTimeout(r, 1000 / (fps * 2)));
  }

  recorder.stop();
}

// Botão para limpar cache do PWA
const limparBtn = document.getElementById("limpar-cache");
if (limparBtn) {
  limparBtn.onclick = async () => {
    const confirmacao = confirm("Tem certeza que deseja limpar os arquivos em cache?");
    if (!confirmacao) return;

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    alert("Cache limpo com sucesso!\nVocê pode atualizar a página agora.");
  };
}
