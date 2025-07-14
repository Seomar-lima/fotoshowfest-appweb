// Substitua a função generateQRCode por esta versão corrigida
function generateQRCode(mediaData) {
  try {
    // Limpar container do QR Code
    DOM.qrContainer.innerHTML = '';
    
    // Criar um Blob a partir dos dados da mídia
    const byteString = atob(mediaData.split(',')[1]);
    const mimeString = mediaData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    
    // Criar um URL temporário para o arquivo
    const fileUrl = URL.createObjectURL(blob);
    
    // Gerar QR Code com o URL temporário
    new QRCode(DOM.qrContainer, {
      text: fileUrl,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#FFFFFF",
      correctLevel: QRCode.CorrectLevel.H
    });
    
    // Mostrar container do QR Code
    DOM.qrContainer.style.display = 'block';
    
    // Adicionar botão de download
    addDownloadButton(mediaData, mimeString.includes('image') ? 'foto' : 'video');
    
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    alert('Erro ao gerar QR Code. Tente novamente.');
  }
}

// Função para adicionar botão de download
function addDownloadButton(data, type) {
  // Remover botão anterior se existir
  const oldButton = document.getElementById('download-btn');
  if (oldButton) oldButton.remove();
  
  // Criar novo botão
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'download-btn';
  downloadBtn.textContent = `Baixar ${type}`;
  downloadBtn.style.display = 'block';
  downloadBtn.style.margin = '10px auto';
  downloadBtn.style.padding = '8px 16px';
  downloadBtn.style.backgroundColor = '#4CAF50';
  downloadBtn.style.color = 'white';
  downloadBtn.style.border = 'none';
  downloadBtn.style.borderRadius = '4px';
  downloadBtn.style.cursor = 'pointer';
  
  // Adicionar evento de clique
  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = data;
    link.download = `foto-show-fest-${new Date().getTime()}.${type === 'foto' ? 'jpg' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  
  // Adicionar botão ao container do QR Code
  DOM.qrContainer.appendChild(downloadBtn);
}

// Modifique a função takePhoto para garantir que chame a versão correta
function takePhoto() {
  try {
    // ... (código existente de captura)
    
    const imageData = DOM.canvas.toDataURL('image/jpeg', 0.9); // Qualidade de 90%
    saveToGallery(imageData, 'photo');
    generateQRCode(imageData); // Chamada corrigida
    
  } catch (error) {
    // ... (tratamento de erro existente)
  }
}

// Modifique a função processBoomerang para garantir que chame a versão correta
async function processBoomerang() {
  try {
    // ... (código existente de processamento)
    
    const videoUrl = await createSimpleVideo(boomerangFrames);
    saveToGallery(videoUrl, 'video');
    
    // Converter o vídeo para Data URL para o QR Code
    const videoData = await getVideoDataUrl(videoUrl);
    generateQRCode(videoData);
    
  } catch (error) {
    // ... (tratamento de erro existente)
  }
}

// Função auxiliar para converter vídeo URL para Data URL
function getVideoDataUrl(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Capturar frame do vídeo para o QR Code
      video.currentTime = 0.1;
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg');
        resolve(thumbnail);
      };
    };
  });
}
