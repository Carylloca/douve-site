// js/admin-evenement-public-planning.js

(function () {
  // -----------------------------
  // SÉCURITÉ : CALENDRIER DISPONIBLE ?
  // -----------------------------
  if (!window.adminPlanning || !window.adminPlanning.calendar) {
    console.error("adminPlanning.calendar introuvable – vérifier l'ordre des scripts.");
    return;
  }

  const calendar = window.adminPlanning.calendar;

  // PocketBase
  const pbClient =
    window.pb || (window.PocketBase && new PocketBase("https://pocketbase-site-douve.onrender.com"));
  const pb = window.pb || pbClient;

  // -----------------------------
  // ÉTAT GLOBAL
  // -----------------------------
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

  // -----------------------------
  // HELPERS DOM
  // -----------------------------
  function $(id) {
    return document.getElementById(id);
  }

  function findById(list, id) {
    return list.find((x) => x.id === id) || null;
  }

  function formatHeure(h) {
    return h || "—";
  }

  function getJourLabel(jourRecord) {
    if (!jourRecord) return "—";
    if (jourRecord.date) {
      try {
        const d = new Date(jourRecord.date);
        return d.toLocaleDateString("fr-CH", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        });
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
    if (compagnonRecord.prenom || compagnonRecord.nom) {
      return `${compagnonRecord.prenom || ""} ${compagnonRecord.nom || ""}`.trim() || compagnonRecord.id;
    }
    return compagnonRecord.id;
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

  // -----------------------------
  // CHARGEMENT DES DONNÉES
  // -----------------------------
  async function loadManifestations() {
    state.manifestations = await pb.collection("manifestations").getFullList({
      sort: "date_debut,created",
    });

    const select = $("selectEvenementPublic");
    if (!select) return;
    select.innerHTML = "";

    state.manifestations.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      const labelDate =
        m.date_debut || m.date_fin
          ? `(${(m.date_debut || m.date_fin || "").substring(0, 10)}) `
          : "";
      opt.textContent = `${labelDate}${m.nom || m.id}`;
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
      sort: "date_debut,created",
    });

    const select = $("selectPlanningEvent");
    if (!select) return;
    select.innerHTML = "";

    state.planningEvents.forEach((p) => {
      const labelDate =
        p.date_debut || p.date_fin
          ? `(${(p.date_debut || p.date_fin || "").substring(0, 10)}) `
          : "";
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${labelDate}${p.titre || p.id}`;
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
    state.companions = await pb.collection("compagnons").getFullList({
      sort: "nom,prenom",
    });
  }

  async function loadPlanningStructure() {
    if (!state.currentPlanningEventId) return;

    state.planningJours = await pb.collection("planning_jours").getFullList({
      filter: `planning_event = "${state.currentPlanningEventId}"`,
      sort: "date,ordre",
    });

    state.planningCreneaux = await pb.collection("planning_creneaux").getFullList({
      filter: `planning_jour.planning_event = "${state.currentPlanningEventId}"`,
      expand: "planning_jour,poste,compagnon_assigne",
      sort: "planning_jour.date,heure_debut",
    });

    state.planningDisponibilites = await pb.collection("planning_disponibilites").getFullList({
      filter: `planning_event = "${state.currentPlanningEventId}"`,
      expand: "compagnon,planning_creneau,planning_jour",
    });
  }

  // -----------------------------
  // AFFICHAGE CALENDRIER
  // -----------------------------
  function refreshCalendar() {
    calendar.removeAllEvents();

    state.planningCreneaux.forEach((c) => {
      const jour = c.expand && c.expand.planning_jour;
      const poste = c.expand && c.expand.poste;
      const compagnon = c.expand && c.expand.compagnon_assigne;

      if (!jour || !jour.date) return;

      const dateStr = jour.date.substring(0, 10);
      const start = `${dateStr}T${c.heure_debut || "00:00"}:00`;
      const end = `${dateStr}T${c.heure_fin || "00:00"}:00`;

      let title = "";
      if (poste) title += getPosteLabel(poste);
      if (compagnon) title += title ? " – " : "";
      if (compagnon) title += getCompagnonLabel(compagnon);
      if (!title) title = "Créneau";

      let backgroundColor = "#7A0010";
      if (poste && poste.code) {
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

  // -----------------------------
  // TABLEAU RÉCAP
  // -----------------------------
  function refreshTable() {
    const table = $("tableCreneaux");
    if (!table) return;
    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    state.planningCreneaux.forEach((c) => {
      const jour = c.expand && c.expand.planning_jour;
      const poste = c.expand && c.expand.poste;
      const compagnon = c.expand && c.expand.compagnon_assigne;

      const tr = document.createElement("tr");

      const dispoCount = state.planningDisponibilites.filter(
        (d) => d.planning_creneau === c.id
      ).length;

      tr.innerHTML = `
        <td>${getJourLabel(jour)}</td>
        <td>${formatHeure(c.heure_debut)}</td>
        <td>${formatHeure(c.heure_fin)}</td>
        <td><span class="badge-poste">${getPosteLabel(poste)}</span></td>
        <td><span class="badge-compagnon">${getCompagnonLabel(compagnon)}</span></td>
        <td><span class="badge-dispo">${dispoCount} dispo</span></td>
        <td>${c.etat || "—"}</td>
        <td><button class="btn btn-small">Voir</button></td>
      `;

      tr.querySelector("button").onclick = () => onCreneauSelected(c.id);

      tbody.appendChild(tr);
    });
  }

  // -----------------------------
  // PANNEAU LATÉRAL
  // -----------------------------
  function refreshSidePanel(creneauId) {
    const c = findById(state.planningCreneaux, creneauId);
    if (!c) return;

    state.currentCreneauId = creneauId;

    const jour = c.expand && c.expand.planning_jour;
    const poste = c.expand && c.expand.poste;
    const compagnon = c.expand && c.expand.compagnon_assigne;

    $("fieldJour").textContent = getJourLabel(jour);
    $("fieldHeure").textContent = `${formatHeure(c.heure_debut)} – ${formatHeure(c.heure_fin)}`;
    $("fieldPoste").textContent = getPosteLabel(poste);
    $("fieldCompagnonAssigne").textContent = getCompagnonLabel(compagnon);
    $("fieldCommentaire").textContent = c.commentaire || "—";

    // Disponibilités
    const ulDispo = $("listDisponibilites");
    if (ulDispo) {
      ulDispo.innerHTML = "";

      const dispoForCreneau = state.planningDisponibilites.filter(
        (d) => d.planning_creneau === creneauId
      );

      dispoForCreneau
        .sort((a, b) => {
          const ca = a.expand && a.expand.compagnon;
          const cb = b.expand && b.expand.compagnon;
          return getCompagnonLabel(ca).localeCompare(getCompagnonLabel(cb));
        })
        .forEach((d) => {
          const comp = d.expand && d.expand.compagnon;

          const li = document.createElement("li");
          li.className = "side-list-item";

          const span = document.createElement("span");
          span.textContent = getCompagnonLabel(comp);
          li.appendChild(span);

          const btn = document.createElement("button");
          btn.textContent = "Assigner";
          btn.onclick = () => assignCompagnonToCurrent(comp.id);
          li.appendChild(btn);

          ulDispo.appendChild(li);
        });
    }

    // Compagnons disponibles
    const ulComp = $("listCompagnonsDisponibles");
    if (ulComp) {
      ulComp.innerHTML = "";

      state.companions
        .slice()
        .sort((a, b) => getCompagnonLabel(a).localeCompare(getCompagnonLabel(b)))
        .forEach((comp) => {
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
    }

    // Select assignation rapide
    const selectAssign = $("selectCompagnonAssign");
    if (selectAssign) {
      selectAssign.innerHTML = `<option value="">Choisir un compagnon…</option>`;

      state.companions
        .slice()
        .sort((a, b) => getCompagnonLabel(a).localeCompare(getCompagnonLabel(b)))
        .forEach((comp) => {
          const opt = document.createElement("option");
          opt.value = comp.id;
          opt.textContent = getCompagnonLabel(comp);
          selectAssign.appendChild(opt);
        });
    }
  }

  // -----------------------------
  // ACTIONS
  // -----------------------------
  async function onManifestationChange(manifestationId) {
    state.currentManifestationId = manifestationId;
    await loadPlanningEvents();
    await reloadPlanning();
  }

  async function onPlanningEventChange(planningEventId) {
    state.currentPlanningEventId = planningEventId;

    const pe = findById(state.planningEvents, planningEventId);
    setStatusBadge(pe ? pe.etat : "edition");

    await reloadPlanning();
  }

  async function reloadPlanning() {
    if (!state.currentPlanningEventId) {
      calendar.removeAllEvents();
      const table = $("tableCreneaux");
      if (table) {
        const tbody = table.querySelector("tbody");
        if (tbody) tbody.innerHTML = "";
      }
      state.currentCreneauId = null;
      return;
    }

    await loadPlanningStructure();
    refreshCalendar();
    refreshTable();

    if (state.planningCreneaux.length > 0) {
      onCreneauSelected(state.planningCreneaux[0].id);
    } else {
      state.currentCreneauId = null;
    }
  }

  async function onCreneauSelected(creneauId) {
    refreshSidePanel(creneauId);
  }

  async function setPlanningFinalise() {
    if (!state.currentPlanningEventId) return;

    if (!confirm("Finaliser ce planning ?")) return;

    await pb.collection("planning_events").update(state.currentPlanningEventId, {
      etat: "finalise",
    });

    const pe = findById(state.planningEvents, state.currentPlanningEventId);
    if (pe) pe.etat = "finalise";

    setStatusBadge("finalise");
    alert("Planning finalisé.");
  }

  async function setPlanningEdition() {
    if (!state.currentPlanningEventId) return;

    if (!confirm("Repasser en mode Édition ?")) return;

    await pb.collection("planning_events").update(state.currentPlanningEventId, {
      etat: "edition",
    });

    const pe = findById(state.planningEvents, state.currentPlanningEventId);
    if (pe) pe.etat = "edition";

    setStatusBadge("edition");
    alert("Planning repassé en édition.");
  }

  async function addJour() {
    if (!state.currentPlanningEventId) {
      alert("Sélectionne un planning.");
      return;
    }

    const dateStr = prompt("Date du jour (YYYY-MM-DD) :");
    if (!dateStr) return;

    await pb.collection("planning_jours").create({
      planning_event: state.currentPlanningEventId,
      date: dateStr,
    });

    await reloadPlanning();
  }

  async function addCreneau() {
    if (!state.currentPlanningEventId) {
      alert("Sélectionne un planning.");
      return;
    }

    if (state.planningJours.length === 0) {
      alert("Ajoute d'abord un jour.");
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

    const heureDebut = prompt("Heure début (HH:MM) :", "18:00");
    if (!heureDebut) return;

    const heureFin = prompt("Heure fin (HH:MM) :", "21:00");
    if (!heureFin) return;

    await pb.collection("planning_creneaux").create({
      planning_jour: jour.id,
      heure_debut: heureDebut,
      heure_fin: heureFin,
    });

    await reloadPlanning();
  }

  async function assignCompagnon() {
    if (!state.currentCreneauId) {
      alert("Sélectionne un créneau.");
      return;
    }

    const select = $("selectCompagnonAssign");
    if (!select) {
      alert("Sélecteur de compagnon introuvable.");
      return;
    }

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

  async function clearCreneau() {
    if (!state.currentCreneauId) return;

    if (!confirm("Libérer ce créneau ?")) return;

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
      alert("Sélectionne un créneau.");
      return;
    }

    const c = findById(state.planningCreneaux, state.currentCreneauId);
    if (!c) return;

    const newDebut = prompt("Nouvelle heure début (HH:MM) :", c.heure_debut || "18:00");
    if (!newDebut) return;

    const newFin = prompt("Nouvelle heure fin (HH:MM) :", c.heure_fin || "21:00");
    if (!newFin) return;

    await pb.collection("planning_creneaux").update(c.id, {
      heure_debut: newDebut,
      heure_fin: newFin,
    });

    await reloadPlanning();
    onCreneauSelected(c.id);
  }

  // -----------------------------
  // INIT
  // -----------------------------
  async function init() {
    try {
      await loadManifestations();
      await loadPlanningEvents();
      await loadCompanions();
      await reloadPlanning();
    } catch (e) {
      console.error("Erreur init admin-evenement-public-planning :", e);
      alert("Erreur lors du chargement du planning.");
    }
  }

  // -----------------------------
  // EXPORT API
  // -----------------------------
  window.adminPlanning = {
    ...window.adminPlanning,
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

  // Lancer l'init immédiatement (le DOM et le calendrier sont déjà prêts)
  init();
})();
