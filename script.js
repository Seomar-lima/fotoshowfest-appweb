document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const captureBtn = document.getElementById('capture-btn');
    const countdown = document.getElementById('countdown');
    const loadingScreen = document.getElementById('loading');
    const resultContainer = document.getElementById('result');
    const qrcodeContainer = document.getElementById('qrcode');
    const gallery = document.getElementById('gallery');
    const clearGalleryBtn = document.getElementById('clear-gallery');
    
    const IMGBB_API_KEY = '586fe56b6fe8223c90078eae64e1d678';
    const MAX_PHOTOS = 10;
    let stream = null;
    
    // Carrega a galeria do localStorage
    loadGallery();
    
    // Inicia a câmera
    startCamera();
    
    captureBtn.addEventListener('click', takePhoto);
    clearGalleryBtn.addEventListener('click', clearGallery);
    
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Erro ao acessar a câmera:", err);
            alert("Não foi possível acessar a câmera. Por favor, conceda as permissões necessárias.");
        }
    }
    
    function takePhoto() {
        // Reinicia a posição da câmera se necessário
        resetCameraPosition();
        
        // Contagem regressiva
        let counter = 3;
        countdown.textContent = counter;
        countdown.style.display = 'flex';
        
        const countdownInterval = setInterval(() => {
            counter--;
            countdown.textContent = counter;
            
            if (counter <= 0) {
                clearInterval(countdownInterval);
                countdown.style.display = 'none';
                captureImage();
            }
        }, 1000);
    }
    
    function resetCameraPosition() {
        // Implementação para redefinir a posição da câmera se necessário
        // Esta é uma função placeholder - a implementação real dependeria
        // de como você quer controlar a posição da câmera
    }
    
    async function captureImage() {
        loadingScreen.style.display = 'flex';
        
        // Cria um canvas para capturar a imagem com a moldura
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Desenha o vídeo e a moldura
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Carrega a moldura como imagem para desenhar sobre o vídeo
        const moldura = document.getElementById('moldura');
        ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
        
        // Converte para blob
        canvas.toBlob(async (blob) => {
            try {
                // Envia para o ImgBB
                const formData = new FormData();
                formData.append('image', blob);
                
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Salva localmente
                    savePhotoLocally(data.data.url, canvas);
                    
                    // Gera QR Code
                    generateQRCode(data.data.url);
                    
                    // Mostra o resultado
                    showResult();
                } else {
                    throw new Error('Falha ao enviar para o ImgBB');
                }
            } catch (error) {
                console.error('Erro ao processar imagem:', error);
                alert('Ocorreu um erro ao processar sua foto. Por favor, tente novamente.');
            } finally {
                loadingScreen.style.display = 'none';
            }
        }, 'image/jpeg', 0.9);
    }
    
    function savePhotoLocally(imageUrl, canvas) {
        // Converte canvas para data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Obtém fotos existentes ou cria array vazio
        let photos = JSON.parse(localStorage.getItem('photos') || '[]');
        
        // Adiciona nova foto no início do array
        photos.unshift({
            url: dataUrl,
            timestamp: new Date().getTime()
        });
        
        // Limita ao número máximo de fotos
        if (photos.length > MAX_PHOTOS) {
            photos = photos.slice(0, MAX_PHOTOS);
        }
        
        // Salva no localStorage
        localStorage.setItem('photos', JSON.stringify(photos));
        
        // Atualiza a galeria
        loadGallery();
    }
    
    function generateQRCode(url) {
        qrcodeContainer.innerHTML = '';
        new QRCode(qrcodeContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#ff00ff",
            colorLight: "#000000",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    
    function showResult() {
        resultContainer.style.display = 'block';
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    function loadGallery() {
        const photos = JSON.parse(localStorage.getItem('photos') || '[]');
        gallery.innerHTML = '';
        
        photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = 'Foto da galeria';
            gallery.appendChild(img);
        });
    }
    
    function clearGallery() {
        if (confirm('Tem certeza que deseja limpar toda a galeria?')) {
            localStorage.removeItem('photos');
            gallery.innerHTML = '';
        }
    }
});
