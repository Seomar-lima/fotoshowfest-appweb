const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const statusUpload = document.getElementById("statusUpload");
const qrCodeContainer = document.getElementById("qrCodeContainer");
const galeria = document.getElementById("galeria");

// Ativa a câmera
navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(error => {
    console.error("Erro ao acessar a câmera:", error);
  });

fotoBtn.addEventListener("click", async () => {
  statusUpload.innerText = "Capturando foto em 3...";
  await new Promise(resolve => setTimeout(resolve, 1000));
  statusUpload.innerText = "2...";
  await new Promise(resolve => setTimeout(resolve, 1000));
  statusUpload.innerText = "1...";
  await new Promise(resolve => setTimeout(resolve, 1000));
  statusUpload.innerText = "Capturando...";

  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.translate(canvas.width, 0); // espelhar imagem
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const moldura = new Image();
  moldura.src = "moldura.png";
  await new Promise(resolve => {
    moldura.onload = () => {
      context.drawImage(moldura, 0, 0, canvas.width, canvas.height);
      resolve();
    };
  });

  const dataUrl = canvas.toDataURL("image/jpeg");

  // Mostra miniatura na galeria
  const img = document.createElement("img");
  img.src = dataUrl;
  galeria.innerHTML = "";
  galeria.appendChild(img);

  // Salva local
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "foto.jpg";
  a.click();

  // Envia ao imgbb
  statusUpload.innerText = "Enviando ao servidor...";
  const apiKey = "SUA_API_KEY_IMGBB";
  const formData = new FormData();
  formData.append("image", dataUrl.split(",")[1]);

  try {
    const response = await fetch("https://api.imgbb.com/1/upload?key=" + apiKey, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (result.success) {
      const linkDownload = result.data.url;
      qrCodeContainer.innerHTML = "";
      QRCode.toCanvas(document.createElement("canvas"), linkDownload, (err, canvas) => {
        if (!err) qrCodeContainer.appendChild(canvas);
      });
      statusUpload.innerText = "Foto enviada com sucesso!";
    } else {
      statusUpload.innerText = "Erro ao enviar imagem.";
    }
  } catch (err) {
    console.error(err);
    statusUpload.innerText = "Falha no envio.";
  }
});
