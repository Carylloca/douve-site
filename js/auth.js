// ===============================
//  LOGIN (users → companions)
// ===============================
async function login(email, password) {

    // 1️⃣ ESSAYER DE CONNECTER COMME ADMIN (collection users)
    try {
        const authUser = await pb.collection("users").authWithPassword(email, password);

        console.log("Connecté comme ADMIN :", authUser);

        // Redirection admin
        window.location.href = "index.html";
        return true;

    } catch (e) {
        console.log("Pas un admin, on tente companion…");
    }

    // 2️⃣ ESSAYER DE CONNECTER COMME COMPANION
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
//  LOGOUT
// ===============================
function logout() {
    pb.authStore.clear();
    document.cookie = "";
    window.location.href = "index.html";
}

// ===============================
//  UTILISATEUR CONNECTÉ
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
