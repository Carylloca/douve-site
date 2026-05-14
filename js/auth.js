// ===============================
//  CONFIGURATION POCKETBASE
// ===============================
const pb = new PocketBase("https://pocketbase-site-douve.onrender.com");

// ===============================
//  LOGIN
// ===============================
async function login(email, password) {
    try {
        const authData = await pb.collection("users").authWithPassword(email, password);

        console.log("Connecté :", authData);

        // Redirection selon le rôle
        const role = authData.record.role;

        if (role === "comite") {
            window.location.href = "admin/admin-manifestations.html";
        } else {
            window.location.href = "index.html";
        }

    } catch (error) {
        console.error("Erreur de connexion :", error);
        document.getElementById("message").innerText = "Email ou mot de passe incorrect.";
    }
}

// ===============================
//  LOGOUT
// ===============================
function logout() {
    pb.authStore.clear();
    window.location.href = "../login.html";
}

// ===============================
//  OBTENIR L'UTILISATEUR CONNECTÉ
// ===============================
function getUser() {
    return pb.authStore.model;
}

// ===============================
//  VÉRIFIER SI CONNECTÉ
// ===============================
function requireLogin() {
    if (!pb.authStore.isValid) {
        window.location.href = "../login.html";
    }
}

// ===============================
//  VÉRIFIER SI COMITÉ
// ===============================
function requireComite() {
    if (!pb.authStore.isValid) {
        window.location.href = "../login.html";
        return;
    }

    const user = pb.authStore.model;

    if (!user || user.role !== "comite") {
        alert("Accès réservé au comité.");
        window.location.href = "../index.html";
    }
}

// ===============================
//  AUTO-CONNEXION SI TOKEN VALIDE
// ===============================
pb.authStore.loadFromCookie(document.cookie);

pb.authStore.onChange(() => {
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
});
