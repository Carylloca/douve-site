// ===============================
//  CLIENT POCKETBASE CENTRALISÉ
// ===============================

// URL de ton instance PocketBase (modifiable UNE SEULE FOIS)
window.PB_URL = "https://pocketbase-site-douve.onrender.com";

// Vérifie que PocketBase est chargé
if (typeof PocketBase === "undefined") {
    console.error("PocketBase n'est pas chargé. Vérifie pocketbase.umd.js");
} else {
    // Instance PocketBase globale
    window.pb = new PocketBase(window.PB_URL);
}
