const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const qrcodeDiv = document.getElementById("qrcode");
const galeria = document.getElementById("galeria");
const statusUpload = document.getElementById("status-upload");

navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(stream => video.srcObject = stream);

fotoBtn.onclick = async () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);

  const moldura = new Image();
  moldura.src = "moldura.png";
  await moldura.decode();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg"));
  const formData = new FormData();
  formData.append("image", blob);

  statusUpload.textContent = "Enviando imagem...";
  const res = await fetch("https://api.imgbb.com/1/upload?key=SUA_API_KEY_IMGBB", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  const link = data.data.url;

  galeria.innerHTML += `<img src="${link}" alt="foto" />`;
  qrcodeDiv.innerHTML = "";
  QRCode.toCanvas(document.createElement("canvas"), link, (err, canvas) => {
    if (!err) qrcodeDiv.appendChild(canvas);
  });
  statusUpload.textContent = "Foto enviada com sucesso!";
};

bumerangueBtn.onclick = async () => {
  statusUpload.textContent = "Gravando bumerangue...";
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const file = new File([blob], "original.webm");

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("https://store1.gofile.io/uploadFile", {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadRes.json();
    const fileUrl = uploadData.data.downloadPage;

    qrcodeDiv.innerHTML = "";
    QRCode.toCanvas(document.createElement("canvas"), fileUrl, (err, canvas) => {
      if (!err) qrcodeDiv.appendChild(canvas);
    });
    statusUpload.textContent = "Bumerangue enviado com sucesso!";
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 3000);
};
