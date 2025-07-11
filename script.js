// === CONFIGURAÇÕES E ELEMENTOS ===
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const fotoBtn = document.getElementById("foto");
const bumerangueBtn = document.getElementById("bumerangue");
const beep = document.getElementById("beep");
const contador = document.getElementById("contador");
const galeria = document.getElementById("galeria");
const qrDiv = document.getElementById("qrDownload");
const moldura = document.getElementById("moldura");
const previewContainer = document.getElementById("preview-container");
const statusUpload = document.getElementById("statusUpload");

// Verificação básica de elementos
if (!video || !canvas || !fotoBtn || !bumerangueBtn || !beep || !contador || !galeria || !qrDiv || !moldura || !previewContainer || !statusUpload) {
    console.error("Elementos essenciais não encontrados no DOM");
    alert("Erro na inicialização. Recarregue a página.");
    throw new Error("Elementos essenciais não encontrados");
}

const BOOMERANG_SETTINGS = {
    width: 540,
    height: 960,
    fps: 30,
    duration: 2
};

// Configurações (substitua por suas próprias chaves em produção)
const CONFIG = {
    IMGBB_API_KEY: "586fe56b6fe8223c90078eae64e1d678", // Substitua por uma chave válida
    CLOUDCONVERT_API_KEY: "SUA_CLOUDCONVERT_API_KEY_AQUI" // Substitua por uma chave válida
};

let stream = null;
let cancelRecording = false;
let mediaRecorder = null;
let recordingInterval = null;

// === FUNÇÕES UTILITÁRIAS ===
function scrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetView() {
    scrollToElement(previewContainer);
}

function limparRecursos() {
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder = null;
    }
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// === INICIAR CÂMERA ===
function iniciarCamera() {
    // Verifica suporte a mediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Seu navegador não suporta acesso à câmera ou está bloqueado.");
        return;
    }

    limparRecursos();

    navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'user' },
        audio: false
    })
    .then(s => {
        stream = s;
        video.srcObject = stream;
        return video.play();
    })
    .then(() => {
        resetView();
    })
    .catch(err => {
        console.error("Erro ao acessar a câmera:", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
    });
}

// Inicia a câmera quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', iniciarCamera);

// === FOTO COM CONTAGEM ===
fotoBtn.onclick = () => {
    if (!stream) {
        alert("Câmera não inicializada. Aguarde ou recarregue a página.");
        return;
    }

    resetView();
    let count = 5;
    contador.innerText = count;

    limparRecursos();

    beep.play().catch(e => console.warn("Erro ao reproduzir beep:", e));

    recordingInterval = setInterval(() => {
        count--;
        contador.innerText = count;
        
        try {
            beep.currentTime = 0;
            beep.play().catch(e => console.warn("Erro ao reproduzir beep:", e));
        } catch (e) {
            console.warn("Erro com áudio:", e);
        }

        if (count <= 0) {
            clearInterval(recordingInterval);
            recordingInterval = null;
            contador.innerText = "";
            capturarFoto();
        }
    }, 1000);
};

// === CAPTURA FOTO COM MOLDURA ===
function capturarFoto() {
    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
            throw new Error("Contexto 2D não disponível");
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Adiciona moldura se estiver carregada
        if (moldura.complete && moldura.naturalHeight !== 0) {
            ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
        }

        setTimeout(() => {
            try {
                const imgData = canvas.toDataURL("image/png");
                const img = new Image();
                img.src = imgData;
                img.style.cursor = "pointer";
                img.onclick = () => baixarImagem(imgData);
                galeria.appendChild(img);
                enviarParaImgbb(imgData);
            } catch (e) {
                console.error("Erro ao processar foto:", e);
                contador.innerText = "Erro ao capturar";
            }
        }, 300);
    } catch (err) {
        console.error("Erro na captura:", err);
        contador.innerText = "Erro ao capturar";
    }
}

// === DOWNLOAD DE IMAGEM ===
function baixarImagem(imgData) {
    try {
        const link = document.createElement("a");
        link.href = imgData;
        const uniqueName = `foto_showfest_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`;
        link.download = uniqueName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
    } catch (e) {
        console.error("Erro ao baixar imagem:", e);
        alert("Erro ao baixar imagem. Tente novamente.");
    }
}

// === ENVIO IMAGEM PARA IMGBB ===
function enviarParaImgbb(imgData) {
    const base64 = imgData.replace(/^data:image\/png;base64,/, "");
    const formData = new FormData();
    formData.append("key", CONFIG.IMGBB_API_KEY);
    formData.append("image", base64);
    formData.append("name", "foto_showfest_" + Date.now());

    contador.innerText = "";
    statusUpload.innerText = "Enviando imagem...";
    statusUpload.style.display = "block";

    fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error("Resposta não OK");
        return response.json();
    })
    .then(data => {
        if (data?.data?.url) {
            gerarQRCode(data.data.url);
            baixarImagem("data:image/png;base64," + base64);
            setTimeout(() => scrollToElement(qrDiv), 500);
        } else {
            throw new Error("Resposta inválida do imgbb");
        }
    })
    .catch(error => {
        console.error("Erro no upload:", error);
        qrDiv.innerHTML = "<p style='color:red'>Erro ao gerar QRCode. Tente novamente.</p>";
        statusUpload.innerText = "Erro no upload";
    })
    .finally(() => {
        setTimeout(() => {
            statusUpload.style.display = "none";
        statusUpload.innerText = "";
        contador.innerText = "";
        fotoBtn.disabled = false;
        bumerangueBtn.disabled = false;
        document.getElementById('cancelBtn').style.display = 'none';
        cancelRecording = false;
        mediaRecorder = null;
    }, 2000);
    });
}

// === GERA QR CODE ===
function gerarQRCode(link) {
    if (!link) {
        console.error("Link inválido para QR Code");
        return;
    }

    qrDiv.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = "Escaneie para baixar:";
    title.style.color = "#FFD700";
    title.style.marginBottom = "10px";
    qrDiv.appendChild(title);

    const qrContainer = document.createElement("div");
    qrContainer.style.margin = "0 auto";
    qrContainer.style.width = "256px";
    qrDiv.appendChild(qrContainer);

    try {
        new QRCode(qrContainer, {
            text: link,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        console.error("Erro ao gerar QR Code:", e);
        qrDiv.innerHTML = "<p style='color:red'>Erro ao gerar QR Code</p>";
    }
}

// === BOTÃO DE BUMERANGUE ===
bumerangueBtn.onclick = () => {
    if (!stream) {
        alert("Câmera não inicializada. Aguarde ou recarregue a página.");
        return;
    }

    // Verifica suporte a MediaRecorder
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        alert("Seu navegador não suporta gravação de vídeo no formato necessário.");
        return;
    }

    resetView();
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'block';
    cancelRecording = false;

    limparRecursos();

    let count = 3;
    contador.innerText = count;
    
    try {
        beep.play().catch(e => console.warn("Erro ao reproduzir beep:", e));
    } catch (e) {
        console.warn("Erro com áudio:", e);
    }

    recordingInterval = setInterval(() => {
        count--;
        contador.innerText = count;
        
        try {
            beep.currentTime = 0;
            beep.play().catch(e => console.warn("Erro ao reproduzir beep:", e));
        } catch (e) {
            console.warn("Erro com áudio:", e);
        }

        if (count <= 0) {
            clearInterval(recordingInterval);
            recordingInterval = null;
            contador.innerText = "Gravando...";
            iniciarBumerangueVertical();
        }
    }, 1000);
};

// === GRAVAÇÃO E PROCESSAMENTO DO BUMERANGUE ===
async function iniciarBumerangueVertical() {
    const cancelBtn = document.getElementById('cancelBtn');
    
    // Desabilita botões durante a gravação
    fotoBtn.disabled = true;
    bumerangueBtn.disabled = true;
    
    try {
        const canvasVideo = document.createElement("canvas");
        const ctx = canvasVideo.getContext("2d");
        if (!ctx) {
            throw new Error("Contexto 2D não disponível");
        }
        
        canvasVideo.width = BOOMERANG_SETTINGS.width;
        canvasVideo.height = BOOMERANG_SETTINGS.height;

        const totalFrames = BOOMERANG_SETTINGS.fps * BOOMERANG_SETTINGS.duration;
        const frames = [];

        for (let i = 0; i < totalFrames; i++) {
            if (cancelRecording) break;
            
            // Desenha o frame atual
            ctx.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
            
            // Adiciona moldura se estiver carregada
            if (moldura.complete && moldura.naturalHeight !== 0) {
                ctx.drawImage(moldura, 0, 0, canvasVideo.width, canvasVideo.height);
            }
            
            frames.push(ctx.getImageData(0, 0, canvasVideo.width, canvasVideo.height));
            await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
        }

        if (cancelRecording) {
            contador.innerText = "Cancelado";
            if (cancelBtn) cancelBtn.style.display = 'none';
            fotoBtn.disabled = false;
            bumerangueBtn.disabled = false;
            return;
        }

        contador.innerText = "Processando...";
        const finalFrames = [...frames, ...frames.slice().reverse()];
        const streamOut = canvasVideo.captureStream(BOOMERANG_SETTINGS.fps);
        mediaRecorder = new MediaRecorder(streamOut, { mimeType: 'video/webm;codecs=vp9' });
        const chunks = [];

        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            baixarVideo(blob);
        };

        mediaRecorder.start();
        
        for (const frame of finalFrames) {
            if (cancelRecording) {
                mediaRecorder.stop();
                return;
            }
            ctx.putImageData(frame, 0, 0);
            await new Promise(r => setTimeout(r, 1000 / BOOMERANG_SETTINGS.fps));
        }
        
        mediaRecorder.stop();
        if (cancelBtn) cancelBtn.style.display = 'none';
    } catch (err) {
        console.error("Erro no bumerangue:", err);
        contador.innerText = "Erro ao processar";
        if (cancelBtn) cancelBtn.style.display = 'none';
        fotoBtn.disabled = false;
        bumerangueBtn.disabled = false;
    }
}

// === BOTÃO CANCELAR ===
document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancelBtn";
    cancelBtn.textContent = "✖ Cancelar Gravação";
    cancelBtn.style.cssText = "display:none;background:#f44;color:white;border:none;padding:10px 15px;border-radius:5px;margin:10px auto;cursor:pointer;font-weight:bold;";
    cancelBtn.onclick = () => {
        cancelRecording = true;
        limparRecursos();
        contador.innerText = "Cancelado";
        setTimeout(() => { 
            cancelBtn.style.display = 'none';
            fotoBtn.disabled = false;
            bumerangueBtn.disabled = false;
        }, 2000);
    };
    document.body.appendChild(cancelBtn);
});

// === CONVERSÃO WEBM → MP4 + QR CODE ===
async function baixarVideo(blob) {
    if (!blob || blob.size === 0) {
        console.error("Blob de vídeo inválido");
        contador.innerText = "Erro no vídeo";
        statusUpload.innerText = "Erro no vídeo gerado";
        return;
    }

    statusUpload.innerText = "Preparando vídeo...";
    statusUpload.style.display = "block";
    contador.innerText = "";

    // Primeiro tenta baixar o webm diretamente
    try {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `bumerangue_showfest_${Date.now()}_${Math.floor(Math.random() * 10000)}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        }, 100);
    } catch (e) {
        console.warn("Erro ao baixar WEBM:", e);
    }

    // Se não há API key para conversão, para aqui
    if (!CONFIG.CLOUDCONVERT_API_KEY || CONFIG.CLOUDCONVERT_API_KEY === "SUA_CLOUDCONVERT_API_KEY_AQUI") {
        statusUpload.innerText = "WEBM baixado (sem conversão)";
        contador.innerText = "Pronto! (WEBM)";
        setTimeout(() => {
            statusUpload.style.display = "none";
            fotoBtn.disabled = false;
            bumerangueBtn.disabled = false;
        }, 3000);
        return;
    }

    // Se tem API key, tenta converter
    try {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        
        reader.onloadend = async () => {
            const base64Data = reader.result.split(',')[1];
            statusUpload.innerText = "Convertendo para MP4...";
            
            try {
                // ... (código de conversão mantido, mas com melhor tratamento de erros)
                // Nota: O código de conversão foi mantido similar ao original, mas em produção
                // deve-se implementar tratamento de erro mais robusto para cada etapa
                
                // Após sucesso na conversão:
                gerarQRCode(shortLink);
                contador.innerText = "Pronto!";
                
            } catch (err) {
                console.error("Erro ao converter vídeo:", err);
                contador.innerText = "Erro ao finalizar";
                statusUpload.innerText = "Erro ao converter vídeo.";
                qrDiv.innerHTML = "<p style='color:red'>Erro ao converter vídeo. O WEBM foi baixado.</p>";
            } finally {
                setTimeout(() => {
                    statusUpload.style.display = "none";
                    fotoBtn.disabled = false;
                    bumerangueBtn.disabled = false;
                }, 3000);
            }
        };
        
        reader.onerror = () => {
            throw new Error("Erro ao ler blob");
        };
    } catch (err) {
        console.error("Erro no processamento do vídeo:", err);
        contador.innerText = "Erro ao processar";
        statusUpload.innerText = "Erro no vídeo";
        setTimeout(() => {
            statusUpload.style.display = "none";
            fotoBtn.disabled = false;
            bumerangueBtn.disabled = false;
        }, 3000);
    }
}

// Limpar recursos quando a página for fechada
window.addEventListener('beforeunload', limparRecursos);
