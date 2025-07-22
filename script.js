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
    const mainContainer = document.getElementById('main-container');
    
    // Variáveis de controle
    const IMGBB_API_KEY = '586fe56b6fe8223c90078eae64e1d678';
    const MAX_PHOTOS = 10;
    let stream = null;
    let isUserScrolling = false;
    let scrollTimeout;

    // Inicialização
    updateClock();
    setInterval(updateClock, 1000);
    loadGallery();
    startCamera();
    
    // Event Listeners
    captureBtn.addEventListener('click', takePhoto);
    clearGalleryBtn.addEventListener('click', clearGallery);
    mainContainer.addEventListener('scroll', handleScroll);

    // Funções
    function updateClock() {
        const now = new Date();
        currentTimeDisplay.textContent = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    }

    function handleScroll() {
        isUserScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => isUserScrolling = false, 100);
    }

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 720 },
                    height: { ideal: 1280 }
                },
                audio: false
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Erro ao acessar a câmera:", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    }

    function takePhoto() {
        resetToInitialPosition();
        startCountdown();
    }

    function resetToInitialPosition() {
        mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
        video.style.objectPosition = 'center center';
        video.style.transform = 'none';
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
        if (moldura.complete && moldura.naturalHeight !== 0) {
            ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
        }
        
        try {
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            await saveToDeviceGallery(imageDataUrl);
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            const imgbbUrl = await uploadToImgBB(blob);
            
            savePhotoLocally(imgbbUrl, canvas);
            generateQRCode(imgbbUrl);
            showResult();
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro. Tente novamente.');
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
            a.download = `fotoshowfest_${Date.now()}.jpg`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('Erro ao salvar:', error);
        }
    }

    async function uploadToImgBB(blob) {
        const formData = new FormData();
        formData.append('image', blob);
        formData.append('key', IMGBB_API_KEY);
        
        const response = await fetch(`https://api.imgbb.com/1/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.success) throw new Error('Upload failed');
        return data.data.url;
    }

    function savePhotoLocally(imageUrl, canvas) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        let photos = JSON.parse(localStorage.getItem('photos') || '[]');
        
        photos.unshift({ url: dataUrl, timestamp: Date.now() });
        if (photos.length > MAX_PHOTOS) photos = photos.slice(0, MAX_PHOTOS);
        
        localStorage.setItem('photos', JSON.stringify(photos));
        loadGallery();
    }

    function generateQRCode(url) {
        qrcodeContainer.innerHTML = '';
        new QRCode(qrcodeContainer, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#ff6b6b",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        if (!isUserScrolling) {
            setTimeout(() => {
                const qrPos = resultContainer.offsetTop;
                const btnHeight = captureBtn.offsetHeight;
                mainContainer.scrollTo({
                    top: qrPos - btnHeight - 20,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }

    function showResult() {
        resultContainer.style.display = 'block';
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

    function dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }
        return new Blob([u8arr], { type: mime });
    }
});
