document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("simulation-form");
    const statusMsg = document.getElementById("simulation-status");
    const gallery = document.getElementById("plot-gallery");

    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        statusMsg.textContent = "Running simulation... ⏳";
        gallery.innerHTML = "";

        const formData = new FormData(form);

        fetch("/simulate-and-plot", {
            method: "POST",
            body: formData,
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                statusMsg.textContent = "✅ " + data.message;

                // Replace with actual number of runs/observables if known
                const maxRuns = 3;
                const maxObs = 2;

                for (let run = 0; run < maxRuns; run++) {
                    for (let obs = 0; obs < maxObs; obs++) {
                        const img = document.createElement("img");
                        img.src = `/static/assets/steane_volume12_encoding_result_simulation_run_${run}_observable_${obs}.png`;
                        img.alt = `Run ${run} Obs ${obs}`;
                        img.style = "width: 300px; border: 1px solid #ccc;";
                        gallery.appendChild(img);
                    }
                }
            } else {
                statusMsg.textContent = "❌ Error: " + data.message;
            }
        })
        .catch(err => {
            statusMsg.textContent = "❌ Failed to run simulation: " + err.message;
        });
    });
});
