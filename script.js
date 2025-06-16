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

// Iniciar câmera
navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: false })
  .then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
  })
  .catch(err => {
    console.error("Erro ao acessar a câmera:", err);
  });

// Tirar foto
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

// Gravar Bumerangue
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

    const cloudConvertAPI = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiZmJkNmQ0Mzc2MGZjNGMxMzMyY2IxMDA5NTcwMTBiMGYzMmQ4NTFlZTFmOWY0NGY5NmRkZGE1ODJiOGUxZGRkYTg5MDk2MTQ1M2E3M2ZjOWQiLCJpYXQiOjE3NTAwOTcwODUuODMzNjY4LCJuYmYiOjE3NTAwOTcwODUuODMzNjcsImV4cCI6NDkwNTc3MDY4NS44Mjg3MzYsInN1YiI6IjcyMjA4MDIzIiwic2NvcGVzIjpbInVzZXIucmVhZCIsInVzZXIud3JpdGUiLCJ0YXNrLnJlYWQiLCJ0YXNrLndyaXRlIiwid2ViaG9vay5yZWFkIiwid2ViaG9vay53cml0ZSIsInByZXNldC5yZWFkIiwicHJlc2V0LndyaXRlIl19.lafmDPVGmFEeadkw56A2aPS7xzM2CD75kXLfn4xkYp0IWc0NSnrcF_4YUOemX-K3u_YcmZFESlFizGCy9u9Sp6yKw9CmlIEUR3SCHmStTnS1h05CeDL0AFSOx7cASS48DvP33XT4GW0bOrqXD6nLZ1lrFZNLSRWMuj2mZz3angQKD6gKbl1IEPFd-PDHsKEtBBYGO6zB4cXkKQf5y1NGiDr-MiPax3JuID7AR_KE78F_TCD6S28UAb8UMc5hGTkjLrkQjMJ3Nx85VGzQu3v4mhA2G0h53hGdPHi43_utOZJLjE7LmdRmPgrc-Bvd8nOZmRBdeIHXx2OgHRtuNMju9ak_julQXKB_X9Fu4SEGXS21FmdrZlfsBvl6mC4sAo6EjkzxMK2WRotqdMjeQokl8Rt4-BL02m3MiBsLoGVjGFp93r6A24Vc95b-DwBwRqC6VqHSjj0PhL1cC4b6yhi7s7gWD3J98D19oXyFES2FcWOE2YiWIj55h6FcZj1JBXMADHnufwgfRCYj_HfyyQfGnrpqM1tKKH7-tz2gHaPyLeuQoczKsDwjHCF3UjmF9Imp5SzZO2lLcRRlr2bHzrht62oEyYSmaiByPliYnkUXQA_Obglqglqfd1DJY3ElkDzUfOGrYvLYE7uFqH5hWwebzbPdf-UAasKsO0R1IOpWj74"; // 👈 Substitua aqui

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

    const exportTask = jobRes.data.tasks.find(t => t.name === "export_url");
    const downloadURL = exportTask?.result?.files?.[0]?.url;

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

// Limpar cache PWA (botão opcional)
const limparBtn = document.getElementById("limpar-cache");
if (limparBtn) {
  limparBtn.onclick = async () => {
    const confirmacao = confirm("Deseja limpar o cache?");
    if (!confirmacao) return;
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    alert("Cache limpo. Atualize a página.");
  };
}
