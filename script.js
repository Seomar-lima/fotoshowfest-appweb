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
  width: 640,      // Reduzido de 1920 para 640px
  height: 480,     // Reduzido de 1080 para 480px
  fps: 30,         // Reduzido de 60 para 30fps
  duration: 2      // 2 segundos de gravação
};

let stream;

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

// ... (mantenha as funções fotoBtn.onclick, capturarFoto, enviarParaImgbb e gerarQRCode como estão) ...

bumerangueBtn.onclick = async () => {
  if (!stream) return alert("Câmera não inicializada.");
  
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
    
    // Define a resolução reduzida
    canvasVideo.width = BOOMERANG_SETTINGS.width;
    canvasVideo.height = BOOMERANG_SETTINGS.height;
    
    const totalFrames = BOOMERANG_SETTINGS.fps * BOOMERANG_SETTINGS.duration;
    const frames = [];
    
    // 1. Captura os frames (resolução reduzida)
    for (let i = 0; i < totalFrames; i++) {
      ctx.drawImage(video, 0, 0, BOOMERANG_SETTINGS.width, BOOMERANG_SETTINGS.height);
      
      if (moldura.complete && moldura.naturalHeight !== 0) {
        ctx.drawImage(moldura, 0, 0, BOOMERANG_SETTINGS.width, BOOMERANG_SETTINGS.height);
      }
      
      const frame = ctx.getImageData(0, 0, BOOMERANG_SETTINGS.width, BOOMERANG_SETTINGS.height);
      frames.push(frame);
      await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
    }
    
    contador.innerText = "Processando...";
    
    // 2. Cria o efeito boomerang (ida e volta)
    const finalFrames = [...frames, ...frames.slice().reverse()];
    
    // 3. Cria o vídeo diretamente em WebM (mais leve)
    const streamOut = canvasVideo.captureStream(BOOMERANG_SETTINGS.fps);
    const recorder = new MediaRecorder(streamOut, { 
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 // 2.5 Mbps - qualidade balanceada
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
