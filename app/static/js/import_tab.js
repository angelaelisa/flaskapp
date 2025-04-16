document.addEventListener("DOMContentLoaded", () => {
    const dropArea = document.getElementById("drop-area");
    const fileElem = document.getElementById("fileElem");
    const fileSelect = document.getElementById("fileSelect");
    const uploadForm = document.getElementById("upload-form");
    const hiddenInput = document.getElementById("hidden-upload-input");

    if (!dropArea) return; // Only run if import tab is present

    fileSelect.addEventListener("click", () => fileElem.click());

    fileElem.addEventListener("change", (e) => {
        hiddenInput.files = e.target.files;
        uploadForm.submit();
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.classList.add("highlight");
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.classList.remove("highlight");
    });

    dropArea.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0 && files[0].name.endsWith(".dae")) {
            hiddenInput.files = files;
            uploadForm.submit();
        } else {
            alert("Please drop a valid .dae file.");
        }
    });
});
