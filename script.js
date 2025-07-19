// ===== CONFIGURAÇÕES GERAIS ===== const video = document.getElementById("camera"); const canvas = document.getElementById("canvas"); const fotoBtn = document.getElementById("foto"); const statusUpload = document.getElementById("status-upload"); const qrCodeContainer = document.getElementById("qrcode-container"); const galeria = document.getElementById("galeria"); const moldura = document.getElementById("moldura");

// Iniciar câmera navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }) .then(stream => { video.srcObject = stream; video.play(); }) .catch(err => { console.error("Erro ao acessar a câmera:", err); });

// Contagem regressiva function iniciarContagem(callback) { let contagem = 5; const contagemElemento = document.createElement("div"); contagemElemento.id = "contagem"; contagemElemento.innerText = contagem; document.body.appendChild(contagemElemento);

const intervalo = setInterval(() => { contagem--; if (contagem === 0) { clearInterval(intervalo); document.body.removeChild(contagemElemento); callback(); } else { contagemElemento.innerText = contagem; } }, 1000); }

// Tirar foto fotoBtn.addEventListener("click", () => { iniciarContagem(() => { const largura = 1080; const altura = 1920; canvas.width = largura; canvas.height = altura;

const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0, largura, altura);

// Sobrepor moldura
ctx.drawImage(moldura, 0, 0, largura, altura);

// Mostrar status de upload
statusUpload.innerText = "Enviando...";
statusUpload.style.display = "block";

// Converter imagem para blob e enviar para o imgbb
canvas.toBlob(blob => {
  const formData = new FormData();
  formData.append("image", blob);

  fetch("https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY", {
    method: "POST",
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      const imageUrl = data.data.url;

      // Gerar QR code apontando para o link de download
      qrCodeContainer.innerHTML = "";
      new QRCode(qrCodeContainer, {
        text: imageUrl,
        width: 200,
        height: 200
      });

      // Adicionar miniatura à galeria
      const imgPreview = document.createElement("img");
      imgPreview.src = imageUrl;
      imgPreview.classList.add("miniatura");
      galeria.appendChild(imgPreview);

      statusUpload.innerText = "Enviado com sucesso!";
      setTimeout(() => statusUpload.style.display = "none", 3000);

      // Salvar localmente
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = "foto_show_fest.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      statusUpload.innerText = "Erro ao enviar imagem.";
    }
  })
  .catch(err => {
    console.error("Erro:", err);
    statusUpload.innerText = "Erro ao enviar.";
  });
}, "image/jpeg");

}); });

