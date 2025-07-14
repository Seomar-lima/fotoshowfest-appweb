// === CONFIGURAÇÕES ===
const { createFFmpeg } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });
let ffmpegLoaded = false;

// Elementos UI
const statusUpload = document.getElementById("statusUpload");
const qrDiv = document.getElementById("qrDownload");
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");

// Variáveis de estado
let mediaRecorder;
let chunks = [];
let stream;

// === FUNÇÕES PRINCIPAIS ===

// 1. Upload para GoFile (unificado para fotos e vídeos)
async function uploadParaGoFile(blob, tipo) {
  statusUpload.innerText = `Enviando ${tipo}...`;
  statusUpload.style.display = "block";

  try {
    // Obter servidor ativo
    const serverRes = await fetch("https://api.gofile.io/getServer");
    const { data: { server } } = await serverRes.json();
    
    if (!server) throw new Error("Nenhum servidor disponível");

    // Preparar upload
    const extensao = tipo === 'foto' ? 'png' : 'mp4';
    const formData = new FormData();
    formData.append('file', blob, `showfest_${Date.now()}.${extensao}`);

    // Fazer upload
    const uploadRes = await fetch(`https://${server}.gofile.io/uploadFile`, {
      method: 'POST',
      body: formData
    });
    const { data } = await uploadRes.json();

    if (!data?.downloadPage) throw new Error("Upload falhou");
    
    return data.downloadPage;

  } catch (erro) {
    console.error("Erro no upload:", erro);
    throw erro;
  } finally {
    statusUpload.style.display = "none";
  }
}

// 2. Função para fotos (100% GoFile)
async function processarFoto() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Adicionar moldura se existir
  if (moldura.complete) {
    ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
  }

  const imgData = canvas.toDataURL("image/png");
  const blob = dataURLtoBlob(imgData);

  try {
    const url = await uploadParaGoFile(blob, 'foto');
    gerarQRCode(url);
    baixarImagem(imgData); // Download local opcional
  } catch {
    qrDiv.innerHTML = `<p style="color:red">Falha no envio</p>`;
  }
}

// 3. Função para bumerangue (100% GoFile)
async function processarBumerangue() {
  try {
    const webmBlob = new Blob(chunks, { type: 'video/webm' });
    
    // Converter para MP4
    statusUpload.innerText = "Convertendo para MP4...";
    const mp4Blob = await converterParaMP4(webmBlob);
    
    // Upload para GoFile
    const url = await uploadParaGoFile(mp4Blob, 'video');
    gerarQRCode(url);

  } catch (erro) {
    console.error("Erro no bumerangue:", erro);
    qrDiv.innerHTML = `<p style="color:red">Erro no processamento</p>`;
  }
}

// 4. Conversão WebM → MP4
async function converterParaMP4(webmBlob) {
  if (!ffmpegLoaded) {
    statusUpload.innerText = "Carregando conversor...";
    await ffmpeg.load();
    ffmpegLoaded = true;
  }

  ffmpeg.FS('writeFile', 'input.webm', new Uint8Array(await webmBlob.arrayBuffer()));
  await ffmpeg.run(
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-profile:v', 'baseline',
    '-pix_fmt', 'yuv420p',
    'output.mp4'
  );
  
  const data = ffmpeg.FS('readFile', 'output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

// 5. Inicialização da gravação
function iniciarGravacao() {
  chunks = [];
  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 960;
  const stream = canvas.captureStream(30);
  
  mediaRecorder = new MediaRecorder(stream, { 
    mimeType: 'video/webm;codecs=vp9'
  });

  mediaRecorder.ondataavailable = e => chunks.push(e.data);
  mediaRecorder.onstop = processarBumerangue;
  mediaRecorder.start();
}

// === EVENT LISTENERS ===
fotoBtn.addEventListener('click', () => {
  // Lógica de contagem regressiva
  // ...
  // Ao final:
  processarFoto();
});

bumerangueBtn.addEventListener('click', () => {
  // Lógica de contagem regressiva
  // ...
  // Ao final:
  iniciarGravacao();
});

// === FUNÇÕES AUXILIARES ===
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

function gerarQRCode(url) {
  // Verificação de segurança
  if (url.includes('cloudconvert')) {
    console.error("ERRO: Link do CloudConvert detectado!");
    qrDiv.innerHTML = `<p style="color:red">Erro de configuração</p>`;
    return;
  }

  qrDiv.innerHTML = `
    <div id="qrcode-container" style="margin: 0 auto; width: 200px;"></div>
    <a href="${url}" target="_blank" style="color: #FFD700;">Abrir em nova aba</a>
  `;
  
  new QRCode(document.getElementById("qrcode-container"), {
    text: url,
    width: 200,
    height: 200
  });
}
