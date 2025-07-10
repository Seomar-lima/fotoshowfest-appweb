const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.getElementById("qrDownload");
const moldura = document.getElementById("moldura");

// Configurações otimizadas para o Bumerangue
const BOOMERANG_SETTINGS = {
  width: 640,      // Reduzido para melhor performance
  height: 480,     // Reduzido para melhor performance
  fps: 30,         // Frame rate reduzido
  duration: 2      // 2 segundos de gravação
};

let stream;
let cancelRecording = false;

// Inicialização da câmera
navigator.mediaDevices.getUserMedia({ 
  video: { 
    width: { ideal: 1920 }, 
    height: { ideal: 1080 },
    facingMode: 'user' 
  }, 
  audio: false 
})
  .then(s => {
    stream = s;
    video.srcObject = stream;
    video.play();
  })
  .catch(err => {
    console.error("Erro ao acessar a câmera:", err);
    alert("Não foi possível acessar a câmera. Por favor, verifique as permissões.");
  });

// Função para tirar foto (mantida original)
fotoBtn.onclick = () => {
  let count = 5;
  contador.innerText = count;
  const interval = setInterval(() => {
    count--;
    contador.innerText = count;
    beep.play();
    if (count === 0) {
      clearInterval(interval);
      contador.innerText = "";
      capturarFoto();
    }
  }, 1000);
};

function capturarFoto() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (moldura.complete && moldura.naturalHeight !== 0) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }

  setTimeout(() => {
    const imgData = canvas.toDataURL("image/png");
    const img = new Image();
    img.src = imgData;
    img.style.cursor = "pointer";
    img.onclick = () => {
      const novaJanela = window.open();
      novaJanela.document.write(`<img src="${imgData}" style="width: 100%">`);
    };
    galeria.appendChild(img);
    enviarParaImgbb(imgData);
  }, 300);
}

function enviarParaImgbb(imgData) {
  const base64 = imgData.replace(/^data:image\/png;base64,/, "");
  const formData = new FormData();
  formData.append("key", "586fe56b6fe8223c90078eae64e1d678");
  formData.append("image", base64);
  formData.append("name", "foto_showfest_" + Date.now());

  qrDiv.innerHTML = "Enviando imagem...";

  fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      if (data?.data?.url) gerarQRCode(data.data.url);
      else throw new Error("Resposta inválida do imgbb");
    })
    .catch(error => {
      console.error("Erro no upload:", error);
      qrDiv.innerText = "Erro ao gerar QRCode.";
      qrDiv.style.color = "red";
    });
}

function gerarQRCode(link) {
  qrDiv.innerHTML = "";
  const qrContainer = document.createElement("div");
  qrContainer.style.margin = "10px auto";
  qrDiv.appendChild(qrContainer);

  new QRCode(qrContainer, {
    text: link,
    width: 256,
    height: 256,
    margin: 4
  });

  const a = document.createElement("a");
  a.href = link;
  a.innerText = "📥 Baixar";
  a.download = "";
  a.style.display = "block";
  a.style.textAlign = "center";
  a.style.marginTop = "10px";
  a.style.fontWeight = "bold";
  qrDiv.appendChild(a);
}

// Função do bumerangue otimizada
bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");
  
  cancelRecording = false;
  
  try {
    let count = 3; // Contagem regressiva mais curta
    contador.innerText = count;
    const interval = setInterval(() => {
      count--;
      contador.innerText = count;
      beep.play();
      if (count === 0) {
        clearInterval(interval);
        contador.innerText = "Gravando...";
        iniciarBumerangueOtimizado();
      }
    }, 1000);
  } catch (error) {
    console.error("Erro:", error);
    contador.innerText = "Erro ao iniciar";
  }
};

async function iniciarBumerangueOtimizado() {
  try {
    const canvasVideo = document.createElement("canvas");
    const ctx = canvasVideo.getContext("2d");
    
    // Define resolução reduzida para melhor performance
    canvasVideo.width = BOOMERANG_SETTINGS.width;
    canvasVideo.height = BOOMERANG_SETTINGS.height;
    
    const totalFrames = BOOMERANG_SETTINGS.fps * BOOMERANG_SETTINGS.duration;
    const frames = [];
    
    // 1. Captura os frames
    for (let i = 0; i < totalFrames; i++) {
      if (cancelRecording) break;
      
      ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
      
      if (moldura.complete && moldura.naturalHeight !== 0) {
        ctx.drawImage(moldura, 0, 0, canvasVideo.width, canvasVideo.height);
      }
      
      const frame = ctx.getImageData(0, 0, canvasVideo.width, canvasVideo.height);
      frames.push(frame);
      await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
    }
    
    if (cancelRecording) {
      contador.innerText = "Cancelado";
      return;
    }
    
    contador.innerText = "Processando...";
    
    // 2. Cria o efeito boomerang (ida e volta)
    const finalFrames = [...frames, ...frames.slice().reverse()];
    
    // 3. Cria o vídeo diretamente em WebM (mais eficiente)
    const streamOut = canvasVideo.captureStream(BOOMERANG_SETTINGS.fps);
    const recorder = new MediaRecorder(streamOut, { 
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 1500000 // Bitrate reduzido
    });
    
    const chunks = [];
    
    return new Promise((resolve) => {
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);
          
          // Gera QRCode com o vídeo WebM diretamente
          gerarQRCode(videoUrl);
          contador.innerText = "Pronto!";
          
          // Adiciona link de download
          const downloadLink = document.createElement("a");
          downloadLink.href = videoUrl;
          downloadLink.download = "bumerangue.webm";
          downloadLink.textContent = "📥 Baixar Vídeo";
          downloadLink.style.display = "block";
          downloadLink.style.marginTop = "10px";
          downloadLink.style.textAlign = "center";
          qrDiv.appendChild(downloadLink);
          
          resolve();
        } catch (error) {
          console.error("Erro ao processar vídeo:", error);
          contador.innerText = "Erro ao finalizar";
          qrDiv.innerHTML = "Erro ao processar o vídeo. Tente novamente.";
          qrDiv.style.color = "red";
        }
      };
      
      recorder.start();
      
      // Renderiza os frames
      (async () => {
        for (const frame of finalFrames) {
          if (cancelRecording) {
            recorder.stop();
            return;
          }
          ctx.putImageData(frame, 0, 0);
          await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
        }
        recorder.stop();
      })();
    });
    
  } catch (error) {
    console.error("Erro no bumerangue:", error);
    contador.innerText = "Erro no processamento";
    throw error;
  }
}

// Adicione este botão no seu HTML:
// <button id="cancelBtn" style="display:none;">Cancelar Gravação</button>
document.getElementById('cancelBtn')?.addEventListener('click', () => {
  cancelRecording = true;
});
