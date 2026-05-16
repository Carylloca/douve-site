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
        window.location.href = "admin/admin-manifestations.html";
        return true;

    } catch (e) {
        console.log("Pas un user, on tente companion…");
    }

    // 2) ESSAYER DE CONNECTER COMME COMPANION
    try {
        const authComp = await pb.collection("companions").authWithPassword(email, password);

        console.log("Connecté comme COMPANION :", authComp);

        // 🔥 Redirection correcte pour les compagnons
        window.location.href = "compagnons.html";
        return true;

    } catch (error) {
        console.error("Erreur de connexion :", error);
        return false;
    }
}

// ===============================
//  LOGOUT (DÉCONNEXION RÉELLE)
// ===============================
function logout() {
    pb.authStore.clear();
    document.cookie = "";
    window.location.href = "login.html";
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
//  VÉRIFIER SI COMITÉ (users uniquement)
// ===============================
function requireComite() {
    if (!pb.authStore.isValid) {
        window.location.href = "../login.html";
        return;
    }

    // 🔥 Seuls les "users" sont admins
    if (pb.authStore.model.collectionName !== "users") {
        alert("Accès réservé au comité.");
        window.location.href = "../index.html";
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

    // 🔥 Seuls les companions peuvent accéder aux pages compagnons
    if (pb.authStore.model.collectionName !== "companions") {
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
