document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("videoUploadForm");
    const statusDiv = document.getElementById("status");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const fileInput = document.getElementById("file");
      const file = fileInput.files[0];
      if (!file) {
        statusDiv.textContent = "❌ Please select a video file to upload.";
        return;
      }
  
      const formData = new FormData();
      formData.append("video", file);
  
      statusDiv.textContent = "⏳ Uploading...";
  
      try {
        const response = await fetch("/upload", {
          method: "POST",
          body: formData
        });
  
        const result = await response.json();
  
        if (response.ok) {
          statusDiv.innerHTML = `
            ✅ Upload successful!<br>
            <strong>Filename:</strong> ${result.video.filename}<br>
            <a href="${result.video.url}" target="_blank">Watch Video</a>
          `;
          form.reset();
        } else {
          throw new Error(result.error || "Upload failed.");
        }
      } catch (err) {
        statusDiv.innerHTML = `❌ Error: ${err.message}`;
      }
    });
  });
  