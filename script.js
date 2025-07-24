document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const captureBtn = document.getElementById('capture-btn');
    const countdown = document.getElementById('countdown');
    const loadingScreen = document.getElementById('loading');
    const resultContainer = document.getElementById('result');
    const qrcodeContainer = document.getElementById('qrcode');
    const gallery = document.getElementById('gallery');
    const clearGalleryBtn = document.getElementById('clear-gallery');
    const currentTimeDisplay = document.getElementById('current-time');
    const backToCameraBtn = document.getElementById('back-to-camera');
    const header = document.querySelector('.header');
    
    const IMGBB_API_KEY = '586fe56b6fe8223c90078eae64e1d678';
    const MAX_PHOTOS = 10;
    let stream = null;
    let isCameraAtTop = true;
    
    // Atualiza o relógio
    function updateClock() {
        const now = new Date();
        const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        currentTimeDisplay.textContent = timeString;
    }
    
    setInterval(updateClock, 1000);
    updateClock();
    
    // Carrega a galeria do localStorage
    loadGallery();
    
    // Inicia a câmera
    startCamera();
    
    captureBtn.addEventListener('click', takePhoto);
    clearGalleryBtn.addEventListener('click', clearGallery);
    backToCameraBtn.addEventListener('click', backToCamera);
    
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
        const cameraContainer = document.querySelector('.camera-container');
        const cameraRect = cameraContainer.getBoundingClientRect();
        const headerHeight = header.offsetHeight;
        
        // Calcula a posição ideal da câmera (logo abaixo do cabeçalho)
        const cameraTopPosition = headerHeight + 10;
        
        // Verifica se a câmera está na posição correta (com margem de 10px)
        isCameraAtTop = Math.abs(cameraRect.top - cameraTopPosition) < 10;
        
        // Se não estiver na posição correta, apenas rola para a posição ideal
        if (!isCameraAtTop) {
            // Calcula a posição absoluta para rolar
            const scrollPosition = cameraContainer.offsetTop - headerHeight;
            
            window.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
            
            // Atualiza o estado após a rolagem
            setTimeout(() => {
                isCameraAtTop = true;
            }, 1000);
            return;
        }
        
        // Se já estiver na posição correta, inicia a contagem
        startCountdown();
    }
    
    function startCountdown() {
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
    
    async function captureImage() {
        loadingScreen.style.display = 'flex';
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const moldura = document.getElementById('moldura');
        ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
        
        // Obter a imagem em dois formatos
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        
        try {
            // 1. Salvar localmente no dispositivo
            await saveToDeviceGallery(imageDataUrl);
            
            // 2. Enviar para o ImgBB
            const formData = new FormData();
            formData.append('image', blob);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 3. Salvar na galeria interna do app
                savePhotoLocally(data.data.url, canvas);
                
                // 4. Gerar QR Code
                generateQRCode(data.data.url);
                
                // Mostrar resultado
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
    }
    
    async function saveToDeviceGallery(imageData) {
        try {
            const blob = dataURLtoBlob(imageData);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fotoshowfest_${new Date().getTime()}.jpg`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            return url;
        } catch (error) {
            console.error('Erro ao fazer download:', error);
        }
        return null;
    }
    
    function dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
    
    function savePhotoLocally(imageUrl, canvas) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        let photos = JSON.parse(localStorage.getItem('photos') || '[]');
        photos.unshift({
            url: dataUrl,
            timestamp: new Date().getTime()
        });
        
        if (photos.length > MAX_PHOTOS) {
            photos = photos.slice(0, MAX_PHOTOS);
        }
        
        localStorage.setItem('photos', JSON.stringify(photos));
        loadGallery();
    }
    
    function generateQRCode(url) {
        qrcodeContainer.innerHTML = '';
        new QRCode(qrcodeContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#FFA500",
            colorLight: "#000000",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
    
    function showResult() {
        resultContainer.style.display = 'block';
        
        const headerHeight = header.offsetHeight;
        const resultPosition = resultContainer.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        
        window.scrollTo({
            top: resultPosition,
            behavior: 'smooth'
        });
        
        detectQRCodeRead();
    }
    
    function detectQRCodeRead() {
        const qrElement = document.getElementById('qrcode');
        qrElement.addEventListener('mouseover', () => {
            setTimeout(() => {
                backToCamera();
            }, 3000); // Volta após 3 segundos
        });
    }
    
    function backToCamera() {
        resultContainer.style.display = 'none';
        
        const cameraContainer = document.querySelector('.camera-container');
        const headerHeight = header.offsetHeight;
        const scrollPosition = cameraContainer.offsetTop - headerHeight;
        
        window.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
        
        isCameraAtTop = true;
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
