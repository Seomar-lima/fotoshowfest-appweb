document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const video = document.getElementById('video');
    const captureBtn = document.getElementById('capture-btn');
    const countdown = document.getElementById('countdown');
    const loadingScreen = document.getElementById('loading');
    const resultContainer = document.getElementById('result');
    const qrcodeContainer = document.getElementById('qrcode');
    const gallery = document.getElementById('gallery');
    const clearGalleryBtn = document.getElementById('clear-gallery');
    const currentTimeDisplay = document.getElementById('current-time');
    
    // Configurações
    const IMGBB_API_KEY = '586fe56b6fe8223c90078eae64e1d678';
    const MAX_PHOTOS = 10;
    let stream = null;
    let backButtonCount = 0;
    
    // Controle de Navegação
    function setupNavigationControls() {
        // Tratamento do botão voltar
        document.addEventListener('backbutton', handleBackButton, false);
        
        // Impede fechar o app com gestos
        window.addEventListener('beforeunload', function(e) {
            if (!confirm('Deseja realmente sair do app?')) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
        
        // Força modo standalone
        if (window.navigator.standalone === false) {
            window.location.href = 'index.html';
        }
    }
    
    function handleBackButton(e) {
        e.preventDefault();
        
        // Se estiver mostrando o QR code, volta para a câmera
        if (resultContainer.style.display === 'block') {
            resultContainer.style.display = 'none';
            backButtonCount = 0;
            return;
        }
        
        // Se estiver na câmera, conta os cliques para sair
        backButtonCount++;
        
        if (backButtonCount === 1) {
            alert('Pressione Voltar novamente para sair');
            setTimeout(() => { backButtonCount = 0; }, 2000);
        } else if (backButtonCount >= 2) {
            if (confirm('Deseja realmente sair do app?')) {
                navigator.app.exitApp?.(); // Para Cordova/PhoneGap
                window.close?.(); // Para navegadores
            } else {
                backButtonCount = 0;
            }
        }
    }
    
    // Funções do App
    function updateClock() {
        const now = new Date();
        const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        currentTimeDisplay.textContent = timeString;
    }
    
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
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        
        try {
            await saveToDeviceGallery(imageDataUrl);
            
            const formData = new FormData();
            formData.append('image', blob);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                savePhotoLocally(data.data.url, canvas);
                generateQRCode(data.data.url);
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
        } catch (error) {
            console.error('Erro ao fazer download:', error);
        }
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
        
        const header = document.querySelector('.header');
        const headerHeight = header.offsetHeight;
        const captureBtn = document.getElementById('capture-btn');
        const btnPosition = captureBtn.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        
        const qrPosition = resultContainer.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        const scrollToPosition = Math.min(btnPosition, qrPosition);
        
        window.scrollTo({
            top: scrollToPosition,
            behavior: 'smooth'
        });
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
    
    // Inicialização
    setupNavigationControls();
    setInterval(updateClock, 1000);
    updateClock();
    loadGallery();
    startCamera();
    
    // Event Listeners
    captureBtn.addEventListener('click', takePhoto);
    clearGalleryBtn.addEventListener('click', clearGallery);
    
    captureBtn.addEventListener('click', function() {
        const cameraContainer = document.querySelector('.camera-container');
        const cameraRect = cameraContainer.getBoundingClientRect();
        const headerHeight = document.querySelector('.header').offsetHeight;
        
        if (cameraRect.top < headerHeight) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });
});
