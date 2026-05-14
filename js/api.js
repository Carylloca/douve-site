// =====================================
//  CONFIGURATION POCKETBASE
// =====================================
const pb = new PocketBase("http://127.0.0.1:8090");


// =====================================
//  MANIFESTATIONS
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
            div.innerHTML = `
                <strong>${m.title}</strong> – ${m.date}<br>
                Places max : ${m.places_max || "—"}<br>
                <button onclick="deleteManifestation('${m.id}')">Supprimer</button>
                <hr>
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
//  CHALET – RÉSERVATIONS
// =====================================

// Charger les réservations
async function loadChaletReservations() {
    const container = document.getElementById("reservations");
    container.innerHTML = "<p>Chargement...</p>";

    try {
        const records = await pb.collection("chalet_reservations").getFullList({
            sort: "start_date"
        });

        if (records.length === 0) {
            container.innerHTML = "<p>Aucune réservation.</p>";
            return;
        }

        container.innerHTML = "";

        records.forEach(r => {
            const div = document.createElement("div");
            div.innerHTML = `
                <strong>${r.title}</strong><br>
                Du ${r.start_date} au ${r.end_date}<br>
                <button onclick="deleteChaletReservation('${r.id}')">Supprimer</button>
                <hr>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        container.innerHTML = "<p>Erreur lors du chargement.</p>";
        console.error(err);
    }
}


// Créer une réservation
async function createChaletReservation() {
    const data = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        start_date: document.getElementById("start_date").value,
        end_date: document.getElementById("end_date").value,
        reserved_by: pb.authStore.model?.id || null
    };

    try {
        await pb.collection("chalet_reservations").create(data);
        alert("Réservation créée !");
        loadChaletReservations();
    } catch (err) {
        alert("Erreur lors de la création.");
        console.error(err);
    }
}


// Supprimer une réservation
async function deleteChaletReservation(id) {
    if (!confirm("Supprimer cette réservation ?")) return;

    try {
        await pb.collection("chalet_reservations").delete(id);
        loadChaletReservations();
    } catch (err) {
        alert("Erreur lors de la suppression.");
        console.error(err);
    }
}



// =====================================
//  INSCRIPTIONS (pour les pages publiques)
// =====================================

// Charger les manifestations publiques
async function loadManifestations() {
    const container = document.getElementById("manifestations");
    container.innerHTML = "<p>Chargement...</p>";

    try {
        const records = await pb.collection("manifestations").getFullList({
            sort: "-date"
        });

        container.innerHTML = "";

        records.forEach(m => {
            const div = document.createElement("div");
            div.innerHTML = `
                <h3>${m.title}</h3>
                <p>${m.description || ""}</p>
                <p>Date : ${m.date}</p>
                <a href="inscription.html?id=${m.id}">S'inscrire</a>
                <hr>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        container.innerHTML = "<p>Erreur lors du chargement.</p>";
        console.error(err);
    }
}


// Initialiser le formulaire d'inscription
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
//  INSCRITS (pour le comité)
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
            div.innerHTML = `
                <strong>${i.nom} ${i.prenom}</strong><br>
                Manifestation : ${i.expand.manifestation?.title}<br>
                Email : ${i.email || "—"}<br>
                Téléphone : ${i.telephone || "—"}<br>
                Commentaire : ${i.commentaire || "—"}<br>
                <hr>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        container.innerHTML = "<p>Erreur lors du chargement.</p>";
        console.error(err);
    }
}
