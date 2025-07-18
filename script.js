const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const statusUpload = document.getElementById("statusUpload");
const previewVideo = document.getElementById("previewVideo");

let mediaRecorder;
let recordedChunks = [];

// Acesso à câmera
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "user", width: 1080, height: 1920 },
  audio: true,
}).then((stream) => {
  video.srcObject = stream;
  video.onloadedmetadata = () => video.play();
}).catch((err) => {
  alert("Erro ao acessar câmera: " + err.message);
});

function mostrarStatus(mensagem) {
  statusUpload.textContent = mensagem;
  statusUpload.style.display = "flex";
}

function esconderStatus() {
  statusUpload.style.display = "none";
}

function contagemRegressiva(segundos, callback) {
  let tempo = segundos;
  mostrarStatus(tempo);
  const intervalo = setInterval(() => {
    tempo--;
    if (tempo <= 0) {
      clearInterval(intervalo);
      esconderStatus();
      callback();
    } else {
      mostrarStatus(tempo);
    }
  }, 1000);
}

function gerarQR(link) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(link)}&size=200x200`;
  const img = new Image();
  img.src = qr;
  img.style.position = "absolute";
  img.style.bottom = "20px";
  img.style.left = "50%";
  img.style.transform = "translateX(-50%)";
  img.style.zIndex = "999";
  document.body.appendChild(img);
  mostrarStatus("Pronto!");
}

function salvarBlobNoCelular(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

async function enviarParaGoFile(blob, nome) {
  mostrarStatus("Financiando...");

  const resp = await fetch("https://api.gofile.io/getServer");
  const { data } = await resp.json();
  const form = new FormData();
  form.append("file", blob, nome);

  const upload = await fetch(`https://${data.server}.gofile.io/uploadFile`, {
    method: "POST",
    body: form,
  });

  const resultado = await upload.json();
  const link = resultado.data.downloadPage;

  gerarQR(link);
  salvarBlobNoCelular(blob, nome);
}

fotoBtn.onclick = () => {
  contagemRegressiva(5, () => {
    mostrarStatus("Criando QR Code");

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.translate(canvas.width, 0); // desespelha horizontalmente
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const blob = atob(base64);
    const array = new Uint8Array(blob.length);
    for (let i = 0; i < blob.length; i++) {
      array[i] = blob.charCodeAt(i);
    }
    const finalBlob = new Blob([array], { type: "image/png" });

    enviarParaGoFile(finalBlob, "foto_showfest.png");
  });
};

bumerangueBtn.onclick = () => {
  contagemRegressiva(3, () => {
    mostrarStatus("Gravando");

    recordedChunks = [];
    const stream = video.srcObject;
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      mostrarStatus("Financiando...");

      const originalBlob = new Blob(recordedChunks, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(originalBlob);

      const videoTemp = document.createElement("video");
      videoTemp.src = videoUrl;
      await videoTemp.play();

      // Exibir no preview
      previewVideo.src = videoUrl;
      previewVideo.style.display = "block";
      video.style.display = "none";

      // Enviar para servidor GoFile
      enviarParaGoFile(originalBlob, "bumerangue_showfest.webm");
    };

    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
    }, 3000);
  });
};
