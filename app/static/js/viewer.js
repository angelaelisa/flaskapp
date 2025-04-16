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

    // Fill ports checkbox
    document.getElementById("fill-selected-ports-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const kind = document.getElementById("kind-for-selection").value;
        const status = document.getElementById("fill-selected-status");
        const checkboxes = document.querySelectorAll('input[name="port"]:checked');

        if (checkboxes.length === 0) {
            status.textContent = "⚠️ Please select at least one port.";
            status.style.color = "red";
            return;
        }

        // Build mapping
        const fill = {};
        checkboxes.forEach(cb => {
            fill[cb.value] = kind;
        });

        try {
            const res = await fetch("/fill_ports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fill })
            });

            const data = await res.json();
            if (res.ok) {
                status.textContent = data.message || "✅ Ports filled.";
                status.style.color = "green";
                refreshViewer(document.getElementById("viewer-container"));
                loadSelectablePorts();  // reload the list
            } else {
                status.textContent = data.error || "❌ Failed.";
                status.style.color = "red";
            }
        } catch (err) {
            console.error(err);
            status.textContent = "❌ Unexpected error.";
        }
    });

});
