<script src="https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.8/dist/ffmpeg.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
<script>
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const gravarBtn = document.getElementById("gravar");
const statusUpload = document.getElementById("statusUpload");
const qrCodeDiv = document.getElementById("qrcode");
const moldura = document.getElementById("moldura");

let mediaRecorder;
let recordedChunks = [];

navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
  });

gravarBtn.addEventListener("click", async () => {
  recordedChunks = [];
  statusUpload.textContent = "⏳ Gravando...";

  const stream = canvas.captureStream();
  mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

  mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const webmBlob = new Blob(recordedChunks, { type: "video/webm" });
    statusUpload.textContent = "Convertendo para MP4...";

    const mp4Blob = await converterWebMparaMP4(webmBlob);

    const mp4File = new File([mp4Blob], "bumerangue.mp4", { type: "video/mp4" });

    statusUpload.textContent = "Enviando ao GoFile...";

    uploadGoFile(mp4File);
  };

  mediaRecorder.start();

  // Para gravar 3 segundos:
  setTimeout(() => {
    mediaRecorder.stop();
  }, 3000);
});

function desenharMolduraLoop() {
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  function desenhar() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (moldura.complete) {
      ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(desenhar);
  }
  desenhar();
}
video.addEventListener("loadedmetadata", desenharMolduraLoop);

async function converterWebMparaMP4(webmBlob) {
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: false });

  if (!ffmpeg.isLoaded()) await ffmpeg.load();

  const webmData = await fetchFile(webmBlob);
  ffmpeg.FS('writeFile', 'input.webm', webmData);

  await ffmpeg.run('-i', 'input.webm', '-c:v', 'libx264', '-preset', 'ultrafast', 'output.mp4');

  const mp4Data = ffmpeg.FS('readFile', 'output.mp4');
  return new Blob([mp4Data.buffer], { type: 'video/mp4' });
}

function uploadGoFile(file) {
  const form = new FormData();
  form.append("file", file);

  fetch("https://store1.gofile.io/uploadFile", {
    method: "POST",
    body: form,
  })
    .then((res) => res.json())
    .then((data) => {
      const link = data.data.downloadPage;
      statusUpload.textContent = "✅ Pronto! Escaneie o QR Code para baixar:";
      gerarQRCode(link);

      // Salvar localmente
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = "bumerangue.mp4";
      a.click();
    })
    .catch(() => {
      statusUpload.textContent = "Erro no upload 😢";
    });
}

function gerarQRCode(link) {
  qrCodeDiv.innerHTML = "";
  QRCode.toCanvas(link, { width: 200 }, (err, canvas) => {
    if (!err) qrCodeDiv.appendChild(canvas);
  });
}
</script>
