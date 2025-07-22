const video = document.getElementById("camera");
const overlay = document.getElementById("overlay");
const captureButton = document.getElementById("capture-button");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const qrcode = document.getElementById("qrcode");
const countdown = document.getElementById("countdown");
const gallery = document.getElementById("gallery");
const clearGallery = document.getElementById("clear-gallery");

let photos = JSON.parse(localStorage.getItem("gallery")) || [];

navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(stream => video.srcObject = stream)
  .catch(err => alert("Erro ao acessar a câmera: " + err));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startCountdown() {
  countdown.style.display = "block";
  for (let i = 3; i > 0; i--) {
    countdown.textContent = i;
    await sleep(1000);
  }
  countdown.style.display = "none";
}

function takePhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (overlay.complete) {
    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL("image/jpeg");
}

function updateGallery(photoURL) {
  photos.unshift(photoURL);
  if (photos.length > 10) photos.pop();
  localStorage.setItem("gallery", JSON.stringify(photos));

  gallery.innerHTML = photos.map(url => `<img src="${url}" />`).join("");
}

clearGallery.onclick = () => {
  photos = [];
  localStorage.removeItem("gallery");
  gallery.innerHTML = "";
};

captureButton.onclick = async () => {
  await startCountdown();
  loading.classList.remove("hidden");

  const photo = takePhoto();

  const form = new FormData();
  form.append("image", photo.replace(/^data:image\/\w+;base64,/, ""));
  
  const apiKey = "586fe56b6fe8223c90078eae64e1d678";
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: form,
  });

  const data = await response.json();
  const imageUrl = data.data.url;

  QRCode.toCanvas(document.getElementById("qrcode"), imageUrl);

  updateGallery(imageUrl);

  loading.classList.add("hidden");
  result.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth" });
};

// Inicializar galeria
updateGallery();
