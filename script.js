// (manter todas as definições anteriores...)

recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'video/webm' });

  // Salva como arquivo temporário para envio
  const formData = new FormData();
  formData.append("file", blob, "bumerangue.webm");

  contador.innerText = "Convertendo vídeo para MP4...";
  qrDiv.innerHTML = "";

  try {
    // Envia o vídeo para conversão via CloudConvert
    const cloudResponse = await fetch("https://api.cloudconvert.com/v2/import/upload", {
      method: "POST",
      headers: {
        "Authorization": "Bearer SEU_TOKEN_AQUI",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "filename": "bumerangue.webm"
      })
    });

    const cloudData = await cloudResponse.json();
    const uploadUrl = cloudData.data.url;

    // Envia o arquivo para o endpoint de upload
    await fetch(uploadUrl, {
      method: "PUT",
      body: blob
    });

    // Cria o job de conversão para MP4
    const jobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        "Authorization": "Bearer SEU_TOKEN_AQUI",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "tasks": {
          "import-my-file": {
            "operation": "import/upload"
          },
          "convert-my-file": {
            "operation": "convert",
            "input": "import-my-file",
            "output_format": "mp4"
          },
          "export-my-file": {
            "operation": "export/url",
            "input": "convert-my-file"
          }
        }
      })
    });

    const jobData = await jobResponse.json();
    const jobId = jobData.data.id;

    // Aguarda a finalização do job
    let exportUrl = "";
    let jobDone = false;
    while (!jobDone) {
      const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { "Authorization": "Bearer SEU_TOKEN_AQUI" }
      });
      const statusData = await statusRes.json();
      const exportTask = statusData.data.tasks.find(task => task.name === "export-my-file" && task.status === "finished");
      if (exportTask) {
        exportUrl = exportTask.result.files[0].url;
        jobDone = true;
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    contador.innerText = "";
    gerarQRCode(exportUrl);

  } catch (error) {
    console.error("Erro na conversão:", error);
    contador.innerText = "Erro na conversão";
    qrDiv.innerText = "Falha ao converter vídeo para MP4.";
  }
};
