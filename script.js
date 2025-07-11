function baixarVideo(blob) {
  const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiZjNjZGY1MmRlZTUwZTgwNjk3NDI4ZmM1OGQwYWU0YzgzMjM2MWRiNjU3ZDYyMTdiZmJkMzNhZjlmMmY2M2I4MWYxNWZhMWMxMDEzZTMwMDgiLCJpYXQiOjE3NTIyNTMxNzQuMzk1NjUzLCJuYmYiOjE3NTIyNTMxNzQuMzk1NjU1LCJleHAiOjQ5MDc5MjY3NzQuMzg5NzU1LCJzdWIiOiI3MjIwODAyMyIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwid2ViaG9vay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.qF8t3vTkWuo3RNdsh2Sz2ULv-UJ3p0_iaOcafk5zEBg778IpEJ-WN7TDu8XVuo4ZnHy4IQ9u-2u1hv3giT_vN8QrUrZvJGK8MxrUC5zUzyO0mKFdOjDp9j4qvR-OrLZI3UIBbcXVMs2NExnDtmubR2cfKwkGmDs6jJ3rh-MBlVPlTu30BvocQAwe9C-n-Nr9I7E1fHo11M_Dz7mSj0m_deqJDjpk4r-Iu_6hwmzXacKi550j-f7fUJ3oZdGBH6dr-24WcEP3CiLTR0utLx5HtFDwcJhbBjhbTE0kycH_xIMuKUC2b8DLwZs_X07xsLcT6N1iAWSNbieyw1AcN7iLDn1-Lwqyxp4QlnvDNxN04rlcgkynd_2fQCA_isex0gie0f1wBJWm3X2I5cieUdXqPPzlv-uLz3SisBnhiMZpTQTTMro84mBMeucxjXIFGWHINp4ooMFXWzcUxoDml7l07ISJGC5Zyu_vOvwJKAVFUJ62oBudjOGq_tS5XItXqbm9_aTMiXBHru9D6GK7lO6x70KEaUvMQu2wI5Dhee3I0S7shknALcjB2tCbCjRnpJ1DRL3BV7amIkdLB5jSUbM1XTZ4BZwl5j9Vp0iO1sfL0zbLDYRh1IFgEFYlyUvQuw4wSmXiFvzMsL-tX1aFESRYc_VA75J1CrXTo40nwKSefW4"; 

  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1];

    statusUpload.innerText = "Convertendo para MP4...";
    statusUpload.style.display = "block";
    contador.innerText = "";

    try {
      const importRes = await fetch("https://api.cloudconvert.com/v2/import/base64", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file: base64Data,
          filename: "bumerangue.webm"
        })
      });

      const importData = await importRes.json();
      const importTaskId = importData.data.id;

      const convertRes = await fetch("https://api.cloudconvert.com/v2/convert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: importTaskId,
          output_format: "mp4"
        })
      });

      const convertData = await convertRes.json();
      const convertTaskId = convertData.data.id;

      const exportRes = await fetch("https://api.cloudconvert.com/v2/export/url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: convertTaskId
        })
      });

      const exportData = await exportRes.json();
      const exportTaskId = exportData.data.id;

      // Aguarda exportar até que tenha a URL final
      let finalUrl = null;
      for (let i = 0; i < 10; i++) {
        const statusRes = await fetch(`https://api.cloudconvert.com/v2/tasks/${exportTaskId}`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const statusData = await statusRes.json();

        if (statusData?.data?.status === "finished") {
          finalUrl = statusData.data.result.files[0].url;
          break;
        }
        await new Promise(r => setTimeout(r, 2000)); // espera 2 segundos
      }

      if (!finalUrl) throw new Error("Arquivo MP4 não ficou pronto a tempo.");

      const link = document.createElement("a");
      link.href = finalUrl;
      link.download = "bumerangue_showfest_" + Date.now() + ".mp4";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      gerarQRCode(finalUrl);
      contador.innerText = "Pronto!";
      statusUpload.style.display = "none";

    } catch (error) {
      console.error("Erro ao converter vídeo:", error);
      statusUpload.innerText = "Erro ao converter vídeo.";
      contador.innerText = "Erro ao finalizar";
      qrDiv.innerHTML = "<p style='color:red'>Erro ao converter o vídeo. Tente novamente.</p>";
    }
  };
}
