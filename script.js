const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const countdownElement = document.getElementById("countdown");
const captureButton = document.getElementById("capture");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const gallery = document.getElementById("gallery");

const overlay = document.getElementById("overlay");

const apiKey = "586fe56b6fe8223c90078eae64e1d678";

// Iniciar câmera
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "user" } })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(error => {
    alert("Erro ao acessar a câmera: " + error.message);
  });

// Função de contagem regressiva
function startCountdown() {
  return new Promise(resolve => {
    let count = 3;
    countdownElement.textContent = count;
    countdownElement.classList.remove("hidden");

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownElement.textContent = count;
      } else {
        clearInterval(interval);
        countdownElement.classList.add("hidden");
        resolve();
      }
    }, 1000);
  });
}

// Captura a foto com a moldura
function takePhoto() {
  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Aplica a moldura
  const overlayImg = new Image();
  overlayImg.src = overlay.src;
  context.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

// Atualiza a galeria
function updateGallery(imageUrl) {
  const img = document.createElement("img");
  img.src = imageUrl;
  gallery.insertBefore(img, gallery.firstChild);

  while (gallery.children.length > 10) {
    gallery.removeChild(gallery.lastChild);
  }
}

// Botão de capturar
captureButton.onclick = async () => {
  await startCountdown();
  loading.classList.remove("hidden");

  const photo = takePhoto();

  try {
    const form = new FormData();
    form.append("image", photo.replace(/^data:image\/\w+;base64,/, ""));

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: form,
    });

    const data = await response.json();
    const imageUrl = data.data.url;

    // Gera o QR code
    await new Promise((resolve, reject) => {
      QRCode.toCanvas(document.getElementById("qrcode"), imageUrl, err => {
        if (err) reject(err);
        else resolve();
      });
    });

    updateGallery(imageUrl);

    loading.classList.add("hidden");
    result.classList.remove("hidden");
    result.scrollIntoView({ behavior: "smooth" });

  } catch (error) {
    alert("Erro ao enviar imagem: " + error.message);
    loading.classList.add("hidden");
  }
};
