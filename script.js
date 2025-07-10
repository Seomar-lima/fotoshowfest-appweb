async function processarVideo(chunks) {
  try {
    const webmBlob = new Blob(chunks, { type: 'video/webm' });
    const mp4Blob = await convertToMP4(webmBlob);
    
    if (!mp4Blob) throw new Error("Conversão falhou");
    
    const url = await saveToGallery(
      mp4Blob, 
      `bumerangue_${Date.now()}.mp4`, 
      'video/mp4'
    );
    
    if (!url) throw new Error("Falha ao salvar");
    
    // Prévia na galeria antes do QR Code
    adicionarNaGaleria(url);
    
    // Delay para melhor UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    gerarQRCode(url);
    showStatus("Bumerangue pronto!", false);
    
  } catch (error) {
    console.error("Erro:", error);
    showStatus("Erro ao processar vídeo", true);
  } finally {
    contador.innerText = "";
    document.getElementById('cancelBtn').style.display = 'none';
  }
}
