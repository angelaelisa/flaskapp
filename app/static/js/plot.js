document.getElementById("plot-detail-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const form = document.getElementById("plot-detail-form");
    const formData = new FormData(form);

    const output = document.getElementById("detailed-plots-output");
    output.innerHTML = "<p>⏳ Generating detailed plots...</p>";

    try {
        const response = await fetch("/plot_detailed_surfaces", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.images) {
            output.innerHTML = data.images.map(src =>
                `<img src="${src}" style="max-width: 100%; margin-bottom: 1rem;">`
            ).join("");
        } else {
            output.innerHTML = `<p style="color:red;">❌ ${data.error}</p>`;
        }
    } catch (err) {
        output.innerHTML = "<p style='color:red;'>❌ Unexpected error</p>";
        console.error(err);
    }
});
