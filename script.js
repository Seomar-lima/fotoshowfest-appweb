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

// Ativa a câmera
navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: false })
  .then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
  })
  .catch(err => {
    alert("Erro ao acessar a câmera. Verifique as permissões do navegador.");
    console.error("Erro ao acessar a câmera:", err);
  });

// Tirar foto com contagem regressiva
fotoBtn.onclick = () => {
  let count = 5;
  contador.innerText = count;
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    try { beep.play(); } catch (e) {}
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
      const win = window.open();
      win.document.write(`<img src="${imgData}" style="width: 100%">`);
    };
    galeria.appendChild(img);
    enviarParaImgbb(imgData);
  }, 300);
}

formData.append("key", "586fe56b6fe8223c90078eae64e1d678");
formData.append("image", base64);
formData.append("name", "foto_showfest_" + Date.now());

  qrDiv.innerHTML = "Enviando imagem...";

  fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData
  })
    .then(r => r.json())
    .then(data => {
      if (data?.data?.url) {
        gerarQRCode(data.data.url);
      } else {
        throw new Error("Erro na resposta do imgbb");
      }
    })
    .catch(error => {
      console.error(error);
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

// Botão do bumerangue
bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");

  let count = 5;
  contador.innerText = count;
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    try { beep.play(); } catch (e) {}
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
  const duration = 2; // segundos
  const totalFrames = fps * duration;
  const frames = [];

  canvasVideo.width = video.videoWidth;
  canvasVideo.height = video.videoHeight;

  for (let i = 0; i < totalFrames; i++) {
    ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
    if (moldura.complete && moldura.naturalHeight !== 0) {
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
    const blob = new Blob(chunks, { type: "video/webm" });

    contador.innerText = "Enviando vídeo...";

    const form = new FormData();
    form.append("file", blob, "bumerangue.webm");

    const uploadRes = await fetch("https://upload.gofile.io/uploadfile", {
      method: "POST",
      body: form
    }).then(r => r.json());

    const fileURL = uploadRes.data?.downloadPage;
    if (!fileURL) return qrDiv.innerText = "Erro ao enviar .webm";

    contador.innerText = "Convertendo para .mp4...";

    const cloudConvertAPI = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNmRjYmE4ZWJhZjk5..."; // sua chave completa

    const jobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
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
    }).then(r => r.json());

    const jobId = jobRes.data.id;

    let downloadURL = "";
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { Authorization: "Bearer " + cloudConvertAPI }
      }).then(r => r.json());

      const exportTask = statusRes.data.tasks.find(t => t.name === "export_url" && t.status === "finished");
      if (exportTask?.result?.files?.[0]?.url) {
        downloadURL = exportTask.result.files[0].url;
        break;
      }
    }

    contador.innerText = "";
    if (downloadURL) gerarQRCode(downloadURL);
    else {
      qrDiv.innerText = "Erro ao obter link convertido.";
      qrDiv.style.color = "red";
    }
  };

  recorder.start();

  for (const frame of finalFrames) {
    ctx.putImageData(frame, 0, 0);
    await new Promise(r => setTimeout(r, 1000 / (fps * 2)));
  }

  recorder.stop();
}
