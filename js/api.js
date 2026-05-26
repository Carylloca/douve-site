// =====================================
//  MANIFESTATIONS – ADMIN
// =====================================

// Charger les manifestations pour la page admin
async function loadAdminManifestations() {
    const container = document.getElementById("manifestations");
    container.innerHTML = "<p>Chargement...</p>";

    try {
        const records = await pb.collection("manifestations").getFullList({
            sort: "-date"
        });

        if (records.length === 0) {
            container.innerHTML = "<p>Aucune manifestation.</p>";
            return;
        }

        container.innerHTML = "";

        records.forEach(m => {
            const div = document.createElement("div");
            div.className = "manifest-card";

            div.innerHTML = `
                <strong>${m.title}</strong><br>
                Date : ${m.date}<br>
                Places max : ${m.places_max || "—"}<br>
                Date limite : ${m.date_limite || "—"}<br><br>

                <button onclick="deleteManifestation('${m.id}')">Supprimer</button>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        container.innerHTML = "<p>Erreur lors du chargement.</p>";
        console.error(err);
    }
}


// Créer une manifestation
async function createManifestation() {
    const data = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        date: document.getElementById("date").value,
        places_max: document.getElementById("places_max").value || null,
        date_limite: document.getElementById("date_limite").value || null,
        created_by: pb.authStore.model?.id || null
    };

    try {
        await pb.collection("manifestations").create(data);
        alert("Manifestation créée !");
        loadAdminManifestations();
    } catch (err) {
        alert("Erreur lors de la création.");
        console.error(err);
    }
}


// Supprimer une manifestation
async function deleteManifestation(id) {
    if (!confirm("Supprimer cette manifestation ?")) return;

    try {
        await pb.collection("manifestations").delete(id);
        loadAdminManifestations();
    } catch (err) {
        alert("Erreur lors de la suppression.");
        console.error(err);
    }
}



// =====================================
//  MANIFESTATIONS – PUBLIC / COMPAGNON
// =====================================

async function loadManifestations() {
    const container = document.getElementById("manifestations");
    container.innerHTML = "<p>Chargement...</p>";

    try {
        const records = await pb.collection("manifestations").getFullList({
            sort: "-date"
        });

        container.innerHTML = "";

        const now = new Date();

        records.forEach(m => {
            const limite = m.date_limite ? new Date(m.date_limite) : null;
            const inscriptionsCloses = limite && now > limite;

            const div = document.createElement("div");
            div.className = "manifest-card";

            div.innerHTML = `
                <h3>${m.title}</h3>
                <p>${m.description || ""}</p>
                <p>Date : ${m.date}</p>
                <p>Date limite d'inscription : ${m.date_limite || "—"}</p>
            `;

            if (inscriptionsCloses) {
                div.innerHTML += `
                    <p style="color:red;"><strong>Inscriptions closes</strong></p>
                `;
            } else {
                div.innerHTML += `
                    <a class="btn" href="inscription.html?id=${m.id}">S'inscrire</a>
                `;
            }

            container.appendChild(div);
        });

    } catch (err) {
        container.innerHTML = "<p>Erreur lors du chargement.</p>";
        console.error(err);
    }
}



// =====================================
//  INSCRIPTION – COMPAGNON
// =====================================

function initInscription() {
    const url = new URL(window.location.href);
    const manifestationId = url.searchParams.get("id");

    if (!manifestationId) {
        document.body.innerHTML = "<p>Manifestation inconnue.</p>";
        return;
    }

    document.getElementById("inscriptionForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
            manifestation: manifestationId,
            nom: document.getElementById("nom").value,
            prenom: document.getElementById("prenom").value,
            email: document.getElementById("email").value,
            telephone: document.getElementById("telephone").value,
            commentaire: document.getElementById("commentaire").value,
            user: pb.authStore.model?.id || null
        };

        try {
            await pb.collection("inscriptions").create(data);
            alert("Inscription enregistrée !");
        } catch (err) {
            alert("Erreur lors de l'inscription.");
            console.error(err);
        }
    });
}



// =====================================
//  INSCRITS – COMITÉ
// =====================================

async function loadInscrits() {
    const container = document.getElementById("inscrits");
    container.innerHTML = "<p>Chargement...</p>";

    try {
        const records = await pb.collection("inscriptions").getFullList({
            expand: "manifestation,user",
            sort: "-created"
        });

        container.innerHTML = "";

        records.forEach(i => {
            const div = document.createElement("div");
            div.className = "manifest-card";

            div.innerHTML = `
                <strong>${i.nom} ${i.prenom}</strong><br>
                Manifestation : ${i.expand.manifestation?.title}<br>
                Email : ${i.email || "—"}<br>
                Téléphone : ${i.telephone || "—"}<br>
                Commentaire : ${i.commentaire || "—"}<br>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        container.innerHTML = "<p>Erreur lors du chargement.</p>";
        console.error(err);
    }
}
