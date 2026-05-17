// ===============================
//  CONFIGURATION POCKETBASE
// ===============================
const pb = new PocketBase("https://pocketbase-site-douve.onrender.com");

// ===============================
//  LOGIN UNIFIÉ (users → companions)
// ===============================
async function login(email, password) {

    // 1) ESSAYER DE CONNECTER COMME USER (COMITÉ)
    try {
        const authUser = await pb.collection("users").authWithPassword(email, password);

        console.log("Connecté comme USER :", authUser);

        // Redirection admin
        window.location.href = "admin/admin-menu.html";
        return true;

    } catch (e) {
        console.log("Pas un user, on tente companion…");
    }

    // 2) ESSAYER DE CONNECTER COMME COMPANION
    try {
        const authComp = await pb.collection("companions").authWithPassword(email, password);

        console.log("Connecté comme COMPANION :", authComp);

        // Redirection compagnon
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

    // ⭐ Redirection universelle vers l'accueil
    // Fonctionne depuis /admin/, /compagnon/, /, etc.
    window.location.href = "/douve-site/index.html";
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
        window.location.href = "/douve-site/login.html";
    }
}

// ===============================
//  VÉRIFIER SI COMITÉ (users uniquement)
// ===============================
function requireComite() {
    if (!pb.authStore.isValid) {
        window.location.href = "/douve-site/login.html";
        return;
    }

    if (pb.authStore.model.collectionName !== "users") {
        alert("Accès réservé au comité.");
        window.location.href = "/douve-site/index.html";
    }
}

// ===============================
//  VÉRIFIER SI COMPANION (autorise aussi les users)
// ===============================
function requireCompanion() {
    if (!pb.authStore.isValid) {
        window.location.href = "/douve-site/login.html";
        return;
    }

    const user = pb.authStore.model;

    // Companion → OK
    if (user.collectionName === "companions") return;

    // User (comité) → OK
    if (user.collectionName === "users") return;

    // Autre cas improbable
    window.location.href = "/douve-site/login.html";
}

// ===============================
//  AUTO-CONNEXION VIA COOKIE
// ===============================
pb.authStore.loadFromCookie(document.cookie);

pb.authStore.onChange(() => {
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
});
