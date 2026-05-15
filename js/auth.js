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

        const role = authComp.record.role;

        if (role === "comite") {
            // Un compagnon avec rôle comité → accès admin
            window.location.href = "admin/admin-manifestations.html";
        } else {
            // Compagnon normal
            window.location.href = "index.html";
        }

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
    pb.authStore.clear();      // Efface la session PocketBase
    document.cookie = "";      // Efface le cookie de session
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
//  VÉRIFIER SI COMITÉ (users OU companions)
// ===============================
function requireComite() {
    if (!pb.authStore.isValid) {
        window.location.href = "login.html";
        return;
    }

    const user = pb.authStore.model;

    // Cas 1 : user (collection users)
    if (pb.authStore.model?.collectionName === "users") {
        return; // OK → accès admin
    }

    // Cas 2 : companion avec rôle comité
    if (user.role === "comite") {
        return; // OK → accès admin
    }

    // Sinon → accès refusé
    alert("Accès réservé au comité.");
    window.location.href = "index.html";
}

// ===============================
//  AUTO-CONNEXION VIA COOKIE
// ===============================
pb.authStore.loadFromCookie(document.cookie);

pb.authStore.onChange(() => {
    document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
});
