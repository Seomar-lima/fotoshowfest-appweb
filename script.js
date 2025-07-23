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
    const backWarning = document.getElementById('back-warning');
    
    // Configurações
    const IMGBB_API_KEY = '586fe56b6fe8223c90078eae64e1d678';
    const MAX_PHOTOS = 10;
    let stream = null;
    let showingResult = false;
    let backButtonCount = 0;
    let backWarningTimeout;
    
    // Atualiza o relógio
    function updateClock() {
        const now = new Date();
        const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        currentTimeDisplay.textContent = timeString;
    }
    
    // Inicialização
    function initApp() {
        // Atualiza o relógio a cada minuto
        setInterval(updateClock, 60000);
        updateClock();
        
        // Carrega a galeria
        loadGallery();
        
        // Inicia a câmera
        startCamera();
        
        // Configura eventos
        setupEventListeners();
        
        // Configura navegação
        setupNavigationControls();
        
        // Registra o Service Worker
        registerServiceWorker();
    }
    
    // Configura eventos
    function setupEventListeners() {
        captureBtn.addEventListener('click', takePhoto);
        clearGalleryBtn.addEventListener('click', clearGallery);
        
        // Botão de voltar personalizado
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
    }
    
    // Registra o Service Worker
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => {
                    console.log('Service Worker registrado com sucesso!', reg);
                    
                    // Verifica atualizações periodicamente
                    setInterval(() => reg.update(), 60 * 60 * 1000);
                    
                    // Atualização quando novo service worker estiver pronto
                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('Nova versão disponível!');
                                if (confirm('Uma nova versão do app está disponível. Atualizar agora?')) {
                                    window.location.reload();
                                }
                            }
                        });
                    });
                })
                .catch(err => {
                    console.error('Erro ao registrar Service Worker:', err);
                });
        }
    }
    
    // Controle de navegação
    function setupNavigationControls() {
        // Tratamento do botão voltar do navegador
        window.addEventListener('popstate', function(event) {
            if (showingResult) {
                hideResult();
            } else {
                handleBackNavigation();
            }
        });
        
        // Tratamento do botão voltar físico (Android)
        document.addEventListener('backbutton', function(e) {
            e.preventDefault();
            if (showingResult) {
                hideResult();
            } else {
                handleBackNavigation();
            }
        }, false);
        
        // Prevenir gesto de voltar (swipe)
        let touchStartX = 0;
        
        document.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        document.addEventListener('touchend', function(e) {
            const touchEndX = e.changedTouches[0].screenX;
            const diffX = touchEndX - touchStartX;
            
            // Detecta gesto de voltar (swipe da direita para esquerda)
            if (diffX < -100) {
                e.preventDefault();
                showBackWarning();
            }
        }, false);
    }
    
    // Mostra aviso de navegação
    function showBackWarning() {
        backWarning.style.display = 'flex';
        
        // Oculta após 3 segundos
        clearTimeout(backWarningTimeout);
        backWarningTimeout = setTimeout(() => {
            backWarning.style.display = 'none';
        }, 3000);
    }
    
    // Trata navegação para trás
    function handleBackNavigation() {
        backButtonCount++;
        
        if (backButtonCount === 1) {
            showBackWarning();
            setTimeout(() => { backButtonCount = 0; }, 2000);
        } else if (backButtonCount >= 2) {
            if (confirm('Deseja realmente sair do app?')) {
                // Tenta fechar o app
                if (typeof navigator.app !== 'undefined' && navigator.app.exitApp) {
                    navigator.app.exitApp();
                } else if (window.close) {
                    window.close();
                }
            } else {
                backButtonCount = 0;
            }
        }
    }
    
    // Inicia a câmera
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
    
    // Tira foto
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
    
    // Captura a imagem
    async function captureImage() {
        loadingScreen.style.display = 'flex';
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Desenha a moldura
        const moldura = document.getElementById('moldura');
        if (moldura.complete) {
            ctx.drawImage(moldura, 0, 0, canvas.width, canvas.height);
        }
        
        try {
            // Salva localmente no dispositivo
            await saveToDeviceGallery(canvas);
            
            // Envia para o ImgBB
            const imgbbUrl = await uploadToImgBB(canvas);
            
            // Salva na galeria interna
            savePhotoLocally(imgbbUrl, canvas);
            
            // Gera QR Code
            generateQRCode(imgbbUrl);
            
            // Mostra resultado
            showResult();
        } catch (error) {
            console.error('Erro ao processar imagem:', error);
            alert('Ocorreu um erro ao processar sua foto. Por favor, tente novamente.');
        } finally {
            loadingScreen.style.display = 'none';
        }
    }
    
    // Salva no dispositivo
    async function saveToDeviceGallery(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fotoshowfest_${Date.now()}.jpg`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                resolve(url);
            }, 'image/jpeg', 0.9);
        });
    }
    
    // Envia para o ImgBB
    async function uploadToImgBB(canvas) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        const formData = new FormData();
        formData.append('image', blob);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error('Falha ao enviar para o ImgBB');
        }
    }
    
    // Salva localmente
    function savePhotoLocally(imageUrl, canvas) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        let photos = JSON.parse(localStorage.getItem('photos') || '[]');
        photos.unshift({
            url: dataUrl,
            timestamp: Date.now()
        });
        
        if (photos.length > MAX_PHOTOS) {
            photos = photos.slice(0, MAX_PHOTOS);
        }
        
        localStorage.setItem('photos', JSON.stringify(photos));
        loadGallery();
    }
    
    // Gera QR Code
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
    
    // Mostra resultado
    function showResult() {
        showingResult = true;
        resultContainer.style.display = 'block';
        
        const header = document.querySelector('.header');
        const headerHeight = header.offsetHeight;
        const scrollPosition = Math.min(
            captureBtn.getBoundingClientRect().top + window.scrollY - headerHeight,
            resultContainer.getBoundingClientRect().top + window.scrollY - headerHeight
        );
        
        window.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
    }
    
    // Oculta resultado
    function hideResult() {
        showingResult = false;
        resultContainer.style.display = 'none';
        backButtonCount = 0;
    }
    
    // Carrega galeria
    function loadGallery() {
        const photos = JSON.parse(localStorage.getItem('photos') || '[]');
        gallery.innerHTML = '';
        
        photos.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = 'Foto da galeria';
            img.onclick = () => window.open(photo.url, '_blank');
            gallery.appendChild(img);
        });
    }
    
    // Limpa galeria
    function clearGallery() {
        if (confirm('Tem certeza que deseja limpar toda a galeria?')) {
            localStorage.removeItem('photos');
            gallery.innerHTML = '';
        }
    }
    
    // Inicializa o app
    initApp();
});
