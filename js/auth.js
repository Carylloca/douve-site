// ===============================
//  LOGIN (uniquement companions)
// ===============================
async function login(email, password) {
    try {
        const auth = await pb.collection("companions").authWithPassword(email, password);

        console.log("Connecté :", auth);

        // Redirection universelle
        window.location.href = "index.html";
        return true;

    } catch (error) {
        console.error("Erreur de connexion :", error);
        return false;
    }
}

// ===============================
//  LOGOUT (DÉCONNEXION UNIVERSELLE)
// ===============================
function logout() {
    pb.authStore.clear();
    document.cookie = "";

    // Redirection universelle
    window.location.href = "index.html";
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
function isLoggedIn() {
    return pb.authStore.isValid;
}

function requireLogin() {
    if (!pb.authStore.isValid) {
        window.location.href = "login.html";
    }
}

// ===============================
//  VÉRIFIER SI COMPANION
// ===============================
function requireCompanion() {
    if (!pb.authStore.isValid) {
        window.location.href = "login.html";
        return;
    }

    const user = pb.authStore.model;

    if (user.collectionName !== "companions") {
        alert("Accès réservé aux compagnons.");
        window.location.href = "index.html";
    }
}

// ===============================
//  AUTO-CONNEXION VIA COOKIE
// ===============================
pb.authStore.loadFromCookie(document.cookie);

pb.authStore.onChange(() => {
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
});
