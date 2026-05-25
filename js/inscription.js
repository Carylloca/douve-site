// Initialisation PocketBase
const pb = new PocketBase("https://pocketbase-site-douve.onrender.com");

// Vérifier que le compagnon est connecté
if (!pb.authStore.model) {
    alert("Veuillez vous connecter.");
    window.location.href = "login.html";
}

// Récupération des infos du compagnon connecté
const user = pb.authStore.model;
const initiales = user.initiales;   // Ton champ existant dans companions
const nomCompagnon = user.nom;
const prenomCompagnon = user.prenom;

// Fonction appelée lors de la soumission du formulaire
async function inscrirePersonne(event) {
    event.preventDefault();

    // Récupération des valeurs du formulaire
    const nom = document.getElementById("nom").value.trim();
    const prenom = document.getElementById("prenom").value.trim();
    const jourId = document.getElementById("jour").value;
    const creneauId = document.getElementById("creneau").value;
    const posteId = document.getElementById("poste").value || null;
    const commentaire = document.getElementById("commentaire").value || "";

    // Détection automatique : compagnon ou adjuteur
    const estCompagnon =
        nom.toLowerCase() === nomCompagnon.toLowerCase() &&
        prenom.toLowerCase() === prenomCompagnon.toLowerCase();

    // Construction de l'objet à envoyer
    const data = {
        planning_event: eventId,          // récupéré depuis l’URL ou la page
        planning_jour: jourId,
        planning_creneau: creneauId,
        nom_personne: nom,
        prenom_personne: prenom,
        inscrit_par: initiales,
        compagnon: estCompagnon ? user.id : null,
        poste_souhaite: posteId,
        commentaire: commentaire
    };

    try {
        await pb.collection("planning_disponibilites").create(data);
        alert("Inscription enregistrée avec succès !");
        window.location.reload();
    } catch (err) {
        console.error("Erreur PocketBase :", err);
        alert("Erreur lors de l'inscription.");
    }
}
