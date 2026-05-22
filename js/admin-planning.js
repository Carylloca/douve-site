// js/admin-planning.js

window.adminPlanning = (function () {
  const state = {
    manifestations: [],
    planningEvents: [],
    planningJours: [],
    planningCreneaux: [],
    planningDisponibilites: [],
    companions: [],
    currentManifestationId: null,
    currentPlanningEventId: null,
    currentCreneauId: null,
  };

  const calendar = window.adminPlanning.calendar;
  const pbClient = window.pb || window.PocketBase && new PocketBase("https://pocketbase-site-douve.onrender.com");

  // Raccourci : on utilise pb déjà créé dans le HTML
  const pb = window.pb || pbClient;

  // --- Helpers DOM ---
  function $(id) {
    return document.getElementById(id);
  }

  function setStatusBadge(etat) {
    const badge = $("planningStatusBadge");
    if (!badge) return;
    if (etat === "finalise") {
      badge.textContent = "Finalisé";
      badge.classList.remove("status-edition");
      badge.classList.add("status-finalise");
    } else {
      badge.textContent = "Édition";
      badge.classList.remove("status-finalise");
      badge.classList.add("status-edition");
    }
  }

  function formatHeure(h) {
    return h || "—";
  }

  function findById(list, id) {
    return list.find((x) => x.id === id) || null;
  }

  function getJourLabel(jourRecord) {
    if (!jourRecord) return "—";
    if (jourRecord.date) {
      try {
        const d = new Date(jourRecord.date);
        return d.toLocaleDateString("fr-CH", { weekday: "short", day: "2-digit", month: "2-digit" });
      } catch (e) {
        return jourRecord.date;
      }
    }
    return jourRecord.id;
  }

  function getPosteLabel(posteRecord) {
    if (!posteRecord) return "—";
    return posteRecord.nom || posteRecord.code || posteRecord.id;
  }

  function getCompagnonLabel(compagnonRecord) {
    if (!compagnonRecord) return "—";
    return compagnonRecord.prenom
      ? `${compagnonRecord.prenom} ${compagnonRecord.nom || ""}`.trim()
      : (compagnonRecord.nom || compagnonRecord.id);
  }

  // --- Chargement des données ---

  async function loadManifestations() {
    state.manifestations = await pb.collection("manifestations").getFullList({
      sort: "-annee,-created",
    });
    const select = $("selectManifestation");
    if (!select) return;
    select.innerHTML = "";
    state.manifestations.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.annee || ""} – ${m.nom || m.id}`;
      select.appendChild(opt);
    });
    if (state.manifestations.length > 0) {
      state.currentManifestationId = state.manifestations[0].id;
      select.value = state.currentManifestationId;
    }
  }

  async function loadPlanningEvents() {
    if (!state.currentManifestationId) return;
    state.planningEvents = await pb.collection("planning_events").getFullList({
      filter: `manifestation = "${state.currentManifestationId}"`,
      sort: "-annee,-created",
    });
    const select = $("selectPlanningEvent");
    if (!select) return;
    select.innerHTML = "";
    state.planningEvents.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.annee || ""} – ${p.titre || p.id}`;
      select.appendChild(opt);
    });
    if (state.planningEvents.length > 0) {
      state.currentPlanningEventId = state.planningEvents[0].id;
      select.value = state.currentPlanningEventId;
      const pe = findById(state.planningEvents, state.currentPlanningEventId);
      setStatusBadge(pe ? pe.etat : "edition");
    } else {
      state.currentPlanningEventId = null;
      setStatusBadge("edition");
    }
  }

  async function loadCompanions() {
    state.companions = await pb.collection("companions").getFullList({
      sort: "nom,prenom",
    });
  }

  async function loadPlanningStructure() {
    if (!state.currentPlanningEventId) return;

    // Jours
    state.planningJours = await pb.collection("planning_jours").getFullList({
      filter: `planning_event = "${state.currentPlanningEventId}"`,
      sort: "date,ordre",
    });

    // Créneaux
    state.planningCreneaux = await pb.collection("planning_creneaux").getFullList({
      filter: `planning_jour.planning_event = "${state.currentPlanningEventId}"`,
      expand: "planning_jour,poste,compagnon_assigne",
      sort: "planning_jour.date,heure_debut",
    });

    // Disponibilités
    state.planningDisponibilites = await pb.collection("planning_disponibilites").getFullList({
      filter: `planning_event = "${state.currentPlanningEventId}"`,
      expand: "compagnon,planning_creneau,planning_jour",
    });
  }

  // --- Rendu calendrier & tableau ---

  function refreshCalendar() {
    calendar.removeAllEvents();

    state.planningCreneaux.forEach((c) => {
      const jour = c.expand && c.expand.planning_jour;
      const poste = c.expand && c.expand.poste;
      const compagnon = c.expand && c.expand.compagnon_assigne;

      if (!jour || !jour.date) return;

      const dateStr = jour.date.substring(0, 10); // YYYY-MM-DD
      const start = `${dateStr}T${c.heure_debut || "00:00"}:00`;
      const end = `${dateStr}T${c.heure_fin || "00:00"}:00`;

      let title = "";
      if (poste) title += getPosteLabel(poste);
      if (compagnon) title += title ? " – " : "";
      if (compagnon) title += getCompagnonLabel(compagnon);
      if (!title) title = "Créneau";

      let backgroundColor = "#7A0010";
      if (poste && poste.code) {
        // On peut mapper certains codes à des couleurs si besoin
        const code = poste.code.toLowerCase();
        if (code.includes("vb")) backgroundColor = "#0078d4";
        else if (code.includes("c")) backgroundColor = "#107c10";
        else if (code.includes("g")) backgroundColor = "#ff8c00";
      }

      calendar.addEvent({
        title,
        start,
        end,
        backgroundColor,
        borderColor: backgroundColor,
        textColor: "#ffffff",
        creneauId: c.id,
      });
    });
  }

  function refreshTable() {
    const tbody = $("tableCreneaux").querySelector("tbody");
    tbody.innerHTML = "";

    state.planningCreneaux.forEach((c) => {
      const jour = c.expand && c.expand.planning_jour;
      const poste = c.expand && c.expand.poste;
      const compagnon = c.expand && c.expand.compagnon_assigne;

      const tr = document.createElement("tr");

      const tdJour = document.createElement("td");
      tdJour.textContent = getJourLabel(jour);
      tr.appendChild(tdJour);

      const tdDebut = document.createElement("td");
      tdDebut.textContent = formatHeure(c.heure_debut);
      tr.appendChild(tdDebut);

      const tdFin = document.createElement("td");
      tdFin.textContent = formatHeure(c.heure_fin);
      tr.appendChild(tdFin);

      const tdPoste = document.createElement("td");
      const badgePoste = document.createElement("span");
      badgePoste.className = "badge-poste";
      badgePoste.textContent = getPosteLabel(poste);
      tdPoste.appendChild(badgePoste);
      tr.appendChild(tdPoste);

      const tdCompagnon = document.createElement("td");
      const badgeComp = document.createElement("span");
      badgeComp.className = "badge-compagnon";
      badgeComp.textContent = getCompagnonLabel(compagnon);
      tdCompagnon.appendChild(badgeComp);
      tr.appendChild(tdCompagnon);

      const tdDispo = document.createElement("td");
      const nbDispo = state.planningDisponibilites.filter(
        (d) => d.planning_creneau === c.id
      ).length;
      const badgeDispo = document.createElement("span");
      badgeDispo.className = "badge-dispo";
      badgeDispo.textContent = `${nbDispo} dispo`;
      tdDispo.appendChild(badgeDispo);
      tr.appendChild(tdDispo);

      const tdEtat = document.createElement("td");
      tdEtat.textContent = c.etat || "—";
      tr.appendChild(tdEtat);

      const tdActions = document.createElement("td");
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "table-actions";

      const btnSelect = document.createElement("button");
      btnSelect.className = "btn-admin-secondary";
      btnSelect.textContent = "Voir";
      btnSelect.style.fontSize = "0.75rem";
      btnSelect.onclick = () => onCreneauSelected(c.id);

      actionsDiv.appendChild(btnSelect);
      tdActions.appendChild(actionsDiv);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  function refreshSidePanel(creneauId) {
    const c = findById(state.planningCreneaux, creneauId);
    state.currentCreneauId = creneauId;

    const jour = c && c.expand && c.expand.planning_jour;
    const poste = c && c.expand && c.expand.poste;
    const compagnon = c && c.expand && c.expand.compagnon_assigne;

    $("fieldJour").textContent = getJourLabel(jour);
    $("fieldHeure").textContent = c ? `${formatHeure(c.heure_debut)} – ${formatHeure(c.heure_fin)}` : "—";
    $("fieldPoste").textContent = getPosteLabel(poste);
    $("fieldCompagnonAssigne").textContent = getCompagnonLabel(compagnon);
    $("fieldCommentaire").textContent = c && c.commentaire ? c.commentaire : "—";

    // Disponibilités pour ce créneau
    const ulDispo = $("listDisponibilites");
    ulDispo.innerHTML = "";
    const dispoForCreneau = state.planningDisponibilites.filter(
      (d) => d.planning_creneau === creneauId
    );
    dispoForCreneau.forEach((d) => {
      const li = document.createElement("li");
      li.className = "side-list-item";
      const comp = d.expand && d.expand.compagnon;
      const span = document.createElement("span");
      span.textContent = getCompagnonLabel(comp);
      li.appendChild(span);

      const btn = document.createElement("button");
      btn.textContent = "Assigner";
      btn.onclick = () => assignCompagnonDirect(d.companion || d.companion_id || d.companionId, comp && comp.id);
      li.appendChild(btn);

      ulDispo.appendChild(li);
    });

    // Compagnons disponibles (simple : on liste tous les compagnons)
    const ulComp = $("listCompagnonsDisponibles");
    ulComp.innerHTML = "";
    state.companions.forEach((comp) => {
      const li = document.createElement("li");
      li.className = "side-list-item";
      const span = document.createElement("span");
      span.textContent = getCompagnonLabel(comp);
      li.appendChild(span);

      const btn = document.createElement("button");
      btn.textContent = "Assigner";
      btn.onclick = () => assignCompagnonToCurrent(comp.id);
      li.appendChild(btn);

      ulComp.appendChild(li);
    });

    // Select assignation rapide
    const selectAssign = $("selectCompagnonAssign");
    selectAssign.innerHTML = "";
    const optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = "Choisir un compagnon…";
    selectAssign.appendChild(optEmpty);
    state.companions.forEach((comp) => {
      const opt = document.createElement("option");
      opt.value = comp.id;
      opt.textContent = getCompagnonLabel(comp);
      selectAssign.appendChild(opt);
    });
  }

  // --- Actions ---

  async function onManifestationChange(manifestationId) {
    state.currentManifestationId = manifestationId || null;
    await loadPlanningEvents();
    await reloadPlanning();
  }

  async function onPlanningEventChange(planningEventId) {
    state.currentPlanningEventId = planningEventId || null;
    const pe = findById(state.planningEvents, state.currentPlanningEventId);
    setStatusBadge(pe ? pe.etat : "edition");
    await reloadPlanning();
  }

  async function reloadPlanning() {
    if (!state.currentPlanningEventId) {
      calendar.removeAllEvents();
      $("tableCreneaux").querySelector("tbody").innerHTML = "";
      return;
    }
    await loadPlanningStructure();
    refreshCalendar();
    refreshTable();
    if (state.planningCreneaux.length > 0) {
      onCreneauSelected(state.planningCreneaux[0].id);
    } else {
      state.currentCreneauId = null;
      $("fieldJour").textContent = "—";
      $("fieldHeure").textContent = "—";
      $("fieldPoste").textContent = "—";
      $("fieldCompagnonAssigne").textContent = "—";
      $("fieldCommentaire").textContent = "—";
      $("listDisponibilites").innerHTML = "";
      $("listCompagnonsDisponibles").innerHTML = "";
      $("selectCompagnonAssign").innerHTML = "";
    }
  }

  async function onCreneauSelected(creneauId) {
    refreshSidePanel(creneauId);
  }

  async function setPlanningFinalise() {
    if (!state.currentPlanningEventId) return;
    const pe = findById(state.planningEvents, state.currentPlanningEventId);
    if (!pe) return;
    if (!confirm("Finaliser ce planning ? Les compagnons ne pourront plus modifier leurs disponibilités.")) return;

    await pb.collection("planning_events").update(pe.id, { etat: "finalise" });
    pe.etat = "finalise";
    setStatusBadge("finalise");
    alert("Planning finalisé.");
  }

  async function setPlanningEdition() {
    if (!state.currentPlanningEventId) return;
    const pe = findById(state.planningEvents, state.currentPlanningEventId);
    if (!pe) return;
    if (!confirm("Repasser ce planning en mode Édition ?")) return;

    await pb.collection("planning_events").update(pe.id, { etat: "edition" });
    pe.etat = "edition";
    setStatusBadge("edition");
    alert("Planning repassé en mode Édition.");
  }

  async function addJour() {
    if (!state.currentPlanningEventId) {
      alert("Sélectionne d’abord un planning.");
      return;
    }
    const dateStr = prompt("Date du jour (YYYY-MM-DD) :");
    if (!dateStr) return;

    const record = await pb.collection("planning_jours").create({
      planning_event: state.currentPlanningEventId,
      date: dateStr,
    });

    state.planningJours.push(record);
    await reloadPlanning();
  }

  async function addCreneau() {
    if (!state.currentPlanningEventId) {
      alert("Sélectionne d’abord un planning.");
      return;
    }
    if (state.planningJours.length === 0) {
      alert("Aucun jour dans ce planning. Ajoute d’abord un jour.");
      return;
    }

    const jourOptions = state.planningJours
      .map((j, idx) => `${idx + 1}) ${getJourLabel(j)} [${j.id}]`)
      .join("\n");
    const choix = prompt("Choisir un jour (numéro) :\n" + jourOptions);
    if (!choix) return;
    const idx = parseInt(choix, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= state.planningJours.length) {
      alert("Choix invalide.");
      return;
    }
    const jour = state.planningJours[idx];

    const heureDebut = prompt("Heure de début (HH:MM) :", "18:00");
    if (!heureDebut) return;
    const heureFin = prompt("Heure de fin (HH:MM) :", "21:00");
    if (!heureFin) return;

    const record = await pb.collection("planning_creneaux").create({
      planning_jour: jour.id,
      heure_debut: heureDebut,
      heure_fin: heureFin,
    });

    // Recharger avec expand
    await reloadPlanning();
  }

  async function assignCompagnon() {
    if (!state.currentCreneauId) {
      alert("Sélectionne d’abord un créneau.");
      return;
    }
    const select = $("selectCompagnonAssign");
    const compId = select.value;
    if (!compId) {
      alert("Choisis un compagnon.");
      return;
    }
    await assignCompagnonToCurrent(compId);
  }

  async function assignCompagnonToCurrent(compId) {
    if (!state.currentCreneauId) return;
    await pb.collection("planning_creneaux").update(state.currentCreneauId, {
      compagnon_assigne: compId,
      etat: "attribue",
    });
    await reloadPlanning();
    onCreneauSelected(state.currentCreneauId);
  }

  async function assignCompagnonDirect(_unused, compId) {
    // compat simplifiée : on utilise compId
    if (!compId) return;
    await assignCompagnonToCurrent(compId);
  }

  async function clearCreneau() {
    if (!state.currentCreneauId) return;
    if (!confirm("Libérer ce créneau (retirer le compagnon assigné) ?")) return;
    await pb.collection("planning_creneaux").update(state.currentCreneauId, {
      compagnon_assigne: null,
      etat: "disponible",
    });
    await reloadPlanning();
    onCreneauSelected(state.currentCreneauId);
  }

  async function deleteCreneau() {
    if (!state.currentCreneauId) return;
    if (!confirm("Supprimer ce créneau ?")) return;
    await pb.collection("planning_creneaux").delete(state.currentCreneauId);
    await reloadPlanning();
  }

  async function editCreneau() {
    if (!state.currentCreneauId) {
      alert("Sélectionne d’abord un créneau.");
      return;
    }
    const c = findById(state.planningCreneaux, state.currentCreneauId);
    if (!c) return;

    const newDebut = prompt("Nouvelle heure de début (HH:MM) :", c.heure_debut || "18:00");
    if (!newDebut) return;
    const newFin = prompt("Nouvelle heure de fin (HH:MM) :", c.heure_fin || "21:00");
    if (!newFin) return;

    await pb.collection("planning_creneaux").update(c.id, {
      heure_debut: newDebut,
      heure_fin: newFin,
    });
    await reloadPlanning();
    onCreneauSelected(c.id);
  }

  // --- Init ---

  async function init() {
    try {
      await loadManifestations();
      await loadPlanningEvents();
      await loadCompanions();
      await reloadPlanning();
    } catch (e) {
      console.error("Erreur init admin-planning :", e);
      alert("Erreur lors du chargement du planning. Vérifie la console.");
    }
  }

  // Expose API
  return {
    init,
    onManifestationChange,
    onPlanningEventChange,
    onCreneauSelected,
    setPlanningFinalise,
    setPlanningEdition,
    addJour,
    addCreneau,
    assignCompagnon,
    clearCreneau,
    deleteCreneau,
    editCreneau,
    calendar,
  };
})();
