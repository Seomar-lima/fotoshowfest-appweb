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

// Inicializa câmera
navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: false })
  .then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
  })
  .catch(err => {
    console.error("Erro ao acessar a câmera:", err);
  });

// Botão Tirar Foto
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
      if (data && data.data && data.data.url) {
        gerarQRCode(data.data.url);
      } else {
        throw new Error("Resposta inválida do imgbb");
      }
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

// Botão Gravar Bumerangue
bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");

  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
  const chunks = [];

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const formData = new FormData();
    formData.append("file", blob, "bumerangue.webm");

    qrDiv.innerHTML = "Enviando vídeo...";

    try {
      const response = await fetch("https://store1.gofile.io/uploadFile", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.status === "ok") {
        const link = result.data.downloadPage;
        const qrContainer = document.createElement("div");
        qrContainer.style.margin = "10px auto";
        qrDiv.innerHTML = "";
        qrDiv.appendChild(qrContainer);

        new QRCode(qrContainer, {
          text: link,
          width: 256,
          height: 256,
          margin: 4
        });

        const a = document.createElement("a");
        a.href = link;
        a.innerText = "📥 Baixar Vídeo";
        a.download = "bumerangue.webm";
        a.style.display = "block";
        a.style.textAlign = "center";
        a.style.marginTop = "10px";
        a.style.fontWeight = "bold";
        qrDiv.appendChild(a);
      } else {
        throw new Error("Erro no retorno da API do GoFile");
      }

    } catch (err) {
      console.error("Erro ao enviar vídeo:", err);
      qrDiv.innerText = "Erro ao enviar vídeo";
    }
  };

  recorder.start();
  setTimeout(() => recorder.stop(), 4000); // grava 2 segundos
};
