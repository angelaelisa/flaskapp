console.log("✅ viewer.js loaded");

async function refreshViewer(container) {
    container.innerHTML = "<p>Loading viewer...</p>";

    try {
        const res = await fetch("/render_inline_viewer");
        const data = await res.json();
        container.innerHTML = data.html;
    } catch (err) {
        container.innerHTML = "<p style='color:red;'>❌ Failed to load viewer.</p>";
    }
}

document.getElementById("rotate-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const axis = form.rotate_axis.value;

    try {
        const res = await fetch("/rotate_blockgraph", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ axis: axis })
        });

        const data = await res.json();
        if (res.ok) {
            const container = document.getElementById("viewer-container");
            refreshViewer(container);
        } else {
            alert(data.error || "❌ Failed to rotate.");
        }
    } catch (err) {
        alert("❌ Error rotating: " + err.message);
    }
});

async function loadCubeList() {
    console.log("📦 Fetching cube list...");
    const res = await fetch("/get_blockgraph_cubes");
    const data = await res.json();
    const cubeOutput = document.getElementById("cube-output");

    if (!data.cubes.length) {
        cubeOutput.innerHTML = "<p>No cubes found.</p>";
        return;
    }

    cubeOutput.innerHTML = data.cubes.map(cube =>
        `<p><strong>${cube.kind}</strong> @ ${cube.position} — <em>${cube.label}</em></p>`
    ).join("");
    const container = document.getElementById("viewer-container");
    refreshViewer(container);
}

async function loadPipeList() {
    console.log("🧵 Fetching pipe list...");
    const res = await fetch("/get_blockgraph_pipes");
    const data = await res.json();
    const pipeOutput = document.getElementById("pipe-output");

    if (!data.pipes.length) {
        pipeOutput.innerHTML = "<p>No pipes found.</p>";
        return;
    }

    const container = document.getElementById("viewer-container");
    refreshViewer(container);

    pipeOutput.innerHTML = data.pipes.map(pipe =>
        `<p><strong>${pipe.kind}</strong>: ${pipe.source} → ${pipe.target}</p>`
    ).join("");
}

async function loadCorrelationSurfaces() {
    console.log("Finding correlation surfaces...");
    const res = await fetch("/get_correlation_surfaces");
    const data = await res.json();
    const output = document.getElementById("surface-output");

    if (data.error) {
        output.innerHTML = `<p style="color: red;">${data.error}</p>`;
        return;
    }

    if (!data.surfaces.length) {
        output.innerHTML = "<p>No correlation surfaces found.</p>";
        return;
    }

    output.innerHTML = "<ul>" + data.surfaces.map(s =>
        `<li>
            <strong>Surface ${s.index}</strong><br>
            Edges: ${s.num_edges}<br>
            Example: <code>${s.example_edge}</code>
        </li>`
    ).join("") + "</ul>";

    // populate the dropdown
    const surfaceSelect = document.getElementById("surface-index");
    surfaceSelect.innerHTML = ""; // Clear previous

    data.surfaces.forEach(s => {
        const option = document.createElement("option");
        option.value = s.index;
        option.textContent = `Surface ${s.index} — Edges: ${s.num_edges}`;
        surfaceSelect.appendChild(option);
    });
}

async function refreshDetectorList() {
    const res = await fetch("/list_detector_files");
    const data = await res.json();
    const select = document.getElementById("existing-detector");

    select.innerHTML = '<option value="">-- None --</option>';
    data.files.forEach(file => {
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = file;
        select.appendChild(opt);
    });
}

document.getElementById("show-pop-viewer").addEventListener("click", async () => {
    const direction = document.getElementById("pop-direction").value;
    const surfaceIndex = document.getElementById("surface-index").value;

    const res = await fetch("/pop_faces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, surface_index: parseInt(surfaceIndex) })
    });

    const data = await res.json();
    const container = document.getElementById("pop-viewer-container");
    container.innerHTML = data.html || `<p style="color:red;">❌ Failed to render pop view.</p>`;
});

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');

        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(tab).classList.add('active');
        const container = document.getElementById("viewer-container");
        refreshViewer(container);
    });
});

// Load cube options for the form
async function populateBaseCubeOptions() {
    const res = await fetch("/get_blockgraph_cubes");
    const data = await res.json();
    const baseSelect = document.getElementById("base-cube");
    if (!baseSelect) return;

    baseSelect.innerHTML = data.cubes.map(cube => {
        return `<option value="${cube.position}">${cube.position} (${cube.kind})</option>`;
    }).join("");
}

// Handle form submission
document.getElementById("add-cube-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
        base_cube: form.base_cube.value,
        direction: form.direction.value,
        kind: form.kind.value,
        label: form.label.value
    };

    const res = await fetch("/add_cube_directionally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    const status = document.getElementById("add-cube-status");
    status.textContent = result.message || result.error || "Something happened.";
    status.style.color = res.ok ? "green" : "red";

    if (res.ok) {
        loadCubeList();  // Refresh cube accordion
        loadPipeList();  // Refresh pipe accordion
        populateRemovableCubes();
        populateBaseCubeOptions();
        const container = document.getElementById("viewer-container");
        refreshViewer(container);
    }
});

async function populateRemovableCubes() {
    const res = await fetch("/get_blockgraph_cubes");
    const data = await res.json();
    const removeSelect = document.getElementById("remove-cube");
    if (!removeSelect) return;

    removeSelect.innerHTML = data.cubes.map(cube => {
        return `<option value="${cube.position}">${cube.position} (${cube.kind})</option>`;
    }).join("");
}

document.getElementById("remove-cube-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const cubePos = form.remove_cube.value;

    const res = await fetch("/remove_cube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: cubePos })
    });

    const result = await res.json();
    const status = document.getElementById("remove-cube-status");
    status.textContent = result.message || result.error || "Something happened.";
    status.style.color = res.ok ? "green" : "red";

    if (res.ok) {
        loadCubeList();
        loadPipeList();
        populateBaseCubeOptions();
        populateRemovableCubes();
        const container = document.getElementById("viewer-container");
        refreshViewer(container);
    }
});

async function loadSelectablePorts() {
    const container = document.getElementById("select-port-list");
    container.innerHTML = "";

    const res = await fetch("/get_ports");
    const data = await res.json();

    if (!data.ports?.length) {
        container.innerHTML = "<p>No ports available.</p>";
        return;
    }

    const list = document.createElement("ul");
    data.ports.forEach(port => {
        const item = document.createElement("li");
        item.innerHTML = `
            <label>
                <input type="checkbox" name="port" value="${port.label}">
                ${port.label}
            </label>
        `;
        list.appendChild(item);
    });

    container.appendChild(list);
}

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("viewer-container");
    refreshViewer(container);
    refreshDetectorList();
    loadSelectablePorts();
    populateComposeDropdowns();

    // Generic accordion toggle
    const accordions = document.querySelectorAll(".accordion-button");
    accordions.forEach(button => {
        button.addEventListener("click", () => {
            const content = button.nextElementSibling;
            content?.classList.toggle("open");

            // Handle contextual logic based on the button ID
            switch (button.id) {
                case "load-cubes":
                    loadCubeList();
                    break;
                case "load-pipes":
                    loadPipeList();
                    break;
                case "add-cubesandpipes":
                    populateBaseCubeOptions();
                    break;
                case "remove-cubesandpipes":
                    populateRemovableCubes();
                    break;
                // Add more cases here if needed
            }
        });
    });

    // Refresh buttons
    document.getElementById("refresh-cubes")?.addEventListener("click", () => {
        loadCubeList();
        populateBaseCubeOptions();
        populateRemovableCubes();
    });

    document.getElementById("refresh-pipes")?.addEventListener("click", loadPipeList);

    // Label requirement toggle
    document.getElementById("kind")?.addEventListener("change", function () {
        const labelField = document.getElementById("label");
        if (this.value === "PORT") {
            labelField.required = true;
            labelField.placeholder = "e.g., Port7";
        } else {
            labelField.required = false;
            labelField.placeholder = "(Optional)";
        }
    });

    // Load 3D viewer
    document.getElementById("load-viewer")?.addEventListener("click", refreshViewer(container));

    // Load 3D viewer origin tab
    const containerData = document.getElementById("viewer-container-data");
    document.getElementById("load-viewer-data")?.addEventListener("click", refreshViewer(containerData));

    // Find correlation surfaces
    document.getElementById("find-surfaces")?.addEventListener("click", loadCorrelationSurfaces);

    // Stim circuit generation
    document.getElementById('generate-stim-btn')?.addEventListener('click', async (event) => {
        event.preventDefault();

        const stimOutput = document.getElementById('stim-output');
        const stimSection = document.getElementById('stim-section');
        const downloadBtn = document.getElementById('download-stim-btn');

        stimOutput.textContent = "⏳ Generating Stim circuit...";
        stimSection.style.display = 'block';
        downloadBtn.style.display = 'none';

        try {
            const form = document.getElementById("stim-form");
            const formData = new FormData(form);
            const response = await fetch('/compile_circuit_from_working', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                stimOutput.textContent = data.circuit;
                downloadBtn.href = data.download_url;
                downloadBtn.style.display = 'block';

                // ✅ Immediately update Crumble iframe with the new circuit
                const encodedCircuit = encodeURIComponent(data.circuit);
                const crumbleIframe = document.getElementById("crumble-iframe");
                if (crumbleIframe) {
                    crumbleIframe.src = "https://algassert.com/crumble#circuit=" + encodedCircuit;
                    document.getElementById("crumble-viewer-panel").style.display = "block";
                }

            } else {
                stimOutput.textContent = data.error || "❌ Failed to compile Stim circuit.";
                downloadBtn.style.display = 'none';
            }
        } catch (err) {
            stimOutput.textContent = "❌ An unexpected error occurred.";
            console.error(err);
        }
    });

    // Start from scratch
    document.getElementById("start-graph-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const form = e.target;
        const kind = form.kind.value;
        const position = form.position.value;
        const label = form.label.value;
        const status = document.getElementById("create-status");

        const res = await fetch("/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, position, label })
        });

        const data = await res.json();

        if (res.ok) {
            status.textContent = data.message || "✅ BlockGraph created!";
            status.style.color = "green";
            const container = document.getElementById("viewer-container");
            refreshViewer(container);
            populateBaseCubeOptions();
            populateRemovableCubes();
        } else {
            status.textContent = data.error || "❌ Failed to create BlockGraph.";
            status.style.color = "red";
        }
    });

    // Fill ports minimal
    document.getElementById("fill-minimal-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const index = parseInt(document.getElementById("minimal-index").value, 10);
        const statusMsg = document.getElementById("fill-minimal-status");

        try {
            const res = await fetch("/fill_minimal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ index }),
            });

            const data = await res.json();
            if (data.success) {
                statusMsg.innerHTML = `✅ ${data.message} (${data.num_options} total options)`;
                statusMsg.style.color = "green";
                const container = document.getElementById("viewer-container");
                refreshViewer(container);
            } else {
                statusMsg.innerHTML = `❌ ${data.error}`;
                statusMsg.style.color = "red";
            }
        } catch (err) {
            statusMsg.innerHTML = `❌ Error: ${err.message}`;
            statusMsg.style.color = "red";
        }
    });

    // --- subtabs for Stim vs Detector DB ---
    document.querySelectorAll('.subtab-btn').forEach(btn => {
        // 1) Compile-subtab logic:
        btn.addEventListener('click', () => {
            document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.subtab-content').forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });
            btn.classList.add('active');
            const panel = document.getElementById(btn.dataset.target);
            panel.style.display = 'block';
            panel.classList.add('active');

            // 2) Toggle the two viewer sub-panels
            const popPanel     = document.getElementById('pop-viewer-panel');
            const crumblePanel = document.getElementById('crumble-viewer-panel');

            if (btn.dataset.target === 'surfaces-tab') {
                // show Pop-Faces, hide Crumble
                popPanel.style.display     = 'block';
                crumblePanel.style.display = 'none';
            } else if (btn.dataset.target === 'stim-tab') {
                // hide Pop-Faces, show Crumble (and set its URL)
                popPanel.style.display = 'none';

                fetch("/get_stim_circuit")
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        alert("❌ Error loading Stim circuit: " + data.error);
                        return;
                    }

                    const encodedCircuit = encodeURIComponent(data.circuit);
                    document.getElementById("crumble-iframe").src =
                    "https://algassert.com/crumble#circuit=" + encodedCircuit;

                    crumblePanel.style.display = "block";
                })
                .catch(err => {
                    alert("❌ Failed to load Stim circuit.");
                    console.error(err);
                });
            } else {
                // detector-tab or any other: hide both
                popPanel.style.display     = 'none';
                crumblePanel.style.display = 'none';
            }
        });
    });
});

// Handle second BlockGraph upload
document.getElementById("compose-upload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith(".dae")) {
        alert("Please upload a valid .dae file.");
        return;
    }

    const formData = new FormData();
    formData.append("compose_dae", file);

    try {
        const res = await fetch("/upload_second_blockgraph", {
            method: "POST",
            body: formData
        });
        const data = await res.json();

        const status = document.getElementById("compose-status");
        if (res.ok) {
            status.textContent = "✅ Second BlockGraph uploaded and relabeled.";
            status.style.color = "green";
            populateComposeDropdowns();  // Load port lists
        } else {
            status.textContent = data.error || "❌ Failed to upload.";
            status.style.color = "red";
        }
    } catch (err) {
        alert("Upload error: " + err.message);
    }
});

// Populate port dropdowns with label + position
async function populateComposeDropdowns() {
    const mainSelect = document.getElementById("main-port");
    const secondSelect = document.getElementById("second-port");

    const [mainRes, secondRes] = await Promise.all([
        fetch("/get_blockgraph_ports"),
        fetch("/get_second_blockgraph_ports")
    ]);

    const mainData = await mainRes.json();
    const secondData = await secondRes.json();

    const formatOption = port =>
        `<option value="${port.label}">${port.label} (${port.position})</option>`;

    mainSelect.innerHTML = '<option value="">-- Select main port --</option>' +
        mainData.ports.map(formatOption).join("");

    secondSelect.innerHTML = '<option value="">-- Select second port --</option>' +
        secondData.ports.map(formatOption).join("");
}

// Compose form submission
document.getElementById("compose-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const mainPort = form.main_port.value;
    const secondPort = form.second_port.value;
    const status = document.getElementById("compose-status");

    try {
        const res = await fetch("/compose_blockgraphs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ main_port: mainPort, second_port: secondPort })
        });

        const data = await res.json();

        if (res.ok) {
            status.textContent = data.message || "✅ Successfully composed BlockGraphs.";
            status.style.color = "green";

            // Reload viewer and dropdowns
            refreshViewer(document.getElementById("viewer-container"));
            populateBaseCubeOptions();
            populateRemovableCubes();
        } else {
            status.textContent = data.error || "❌ Composition failed.";
            status.style.color = "red";
        }
    } catch (err) {
        status.textContent = "❌ Error: " + err.message;
        status.style.color = "red";
    }
});

// Export to JSON
document.getElementById("export-json-btn")?.addEventListener("click", async () => {
    try {
        const res = await fetch("/export_blockgraph_json");
        if (!res.ok) {
            const data = await res.json();
            document.getElementById("export-json-status").textContent = data.error || "❌ Failed to export.";
            return;
        }

        // Download the file
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "working_blockgraph.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        document.getElementById("export-json-status").textContent = "✅ JSON downloaded successfully.";
    } catch (err) {
        document.getElementById("export-json-status").textContent = "❌ Error: " + err.message;
    }
});
