<script>
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const qrCodeDiv = document.getElementById("qrcode");
const statusMsg = document.getElementById("status");

let mediaRecorder;
let recordedChunks = [];

navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true })
  .then(stream => {
    video.srcObject = stream;
    window.localStream = stream;
  });

function downloadFileFromURL(url, filename = "video.mp4") {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function gerarQRCode(link) {
  qrCodeDiv.innerHTML = "";
  new QRCode(qrCodeDiv, {
    text: link,
    width: 160,
    height: 160,
    correctLevel: QRCode.CorrectLevel.H
  });
}

async function uploadParaGoFile(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("https://store1.gofile.io/uploadFile", {
    method: "POST",
    body: form
  });
  const result = await response.json();
  return result.data.downloadPage;
}

function resetUI() {
  statusMsg.textContent = "";
  qrCodeDiv.innerHTML = "";
  preview.style.display = "none";
}

async function iniciarBumerangue() {
  resetUI();
  statusMsg.textContent = "Gravando Bumerangue...";
  recordedChunks = [];

  const options = { mimeType: "video/webm;codecs=vp9" };
  mediaRecorder = new MediaRecorder(window.localStream, options);

  mediaRecorder.ondataavailable = function (e) {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = async function () {
    statusMsg.textContent = "Processando vídeo...";
    const blobOriginal = new Blob(recordedChunks, { type: "video/webm" });

    // Ler o vídeo como array buffer e duplicar para bumerangue (reverso básico)
    const buffer = await blobOriginal.arrayBuffer();
    const blobCopy = new Blob([buffer], { type: "video/webm" });

    // Combinar ida e volta (duplicado para efeito boomerangue simples)
    const finalBlob = new Blob([blobOriginal, blobCopy], { type: "video/webm" });

    // Mostrar preview
    const url = URL.createObjectURL(finalBlob);
    preview.src = url;
    preview.loop = true;
    preview.play();
    preview.style.display = "block";

    statusMsg.textContent = "Enviando...";

    const linkDownload = await uploadParaGoFile(finalBlob);
    gerarQRCode(linkDownload);
    statusMsg.textContent = "Pronto! Escaneie para baixar";

    // Download automático (inclusive iOS)
    downloadFileFromURL(linkDownload, "bumerangue.mp4");
  };

  mediaRecorder.start();

  setTimeout(() => {
    mediaRecorder.stop();
  }, 3000); // grava 3 segundos
}

bumerangueBtn.addEventListener("click", iniciarBumerangue);
</script>
