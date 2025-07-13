// === GERAR QR CODE PARA iOS ===
function gerarQRCodeParaIOS(videoUrl) {
  qrDiv.innerHTML = "";
  
  // Criar URL especial para iOS
  const iosDownloadUrl = `https://seusite.com/download.html?url=${encodeURIComponent(videoUrl)}`;
  
  // Encurtar URL (opcional)
  // ... código para encurtar a URL ...
  
  const title = document.createElement("h3");
  title.textContent = "Escaneie para baixar:";
  title.style.color = "#FFD700";
  title.style.marginBottom = "10px";
  qrDiv.appendChild(title);

  const qrContainer = document.createElement("div");
  qrContainer.style.margin = "0 auto";
  qrContainer.style.width = "256px";
  qrDiv.appendChild(qrContainer);

  new QRCode(qrContainer, {
    text: iosDownloadUrl,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

// === MODIFICAR A FUNÇÃO DE CONVERSÃO ===
async function converterParaMP4(blob) {
  // ... código existente de conversão ...
  
  // Após obter o mp4Url:
  if (isIOS()) {
    gerarQRCodeParaIOS(mp4Url);
  } else {
    gerarQRCode(mp4Url);
  }
  
  // ... resto do código ...
}

// Função para detectar iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
