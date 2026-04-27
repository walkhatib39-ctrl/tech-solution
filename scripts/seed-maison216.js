const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const PROJECT_ID = "project-maison216";
const PROJECT_NAME = "Maison216";
const PROJECT_COLOR = "#6d5dfc";
const CREATED_BY = "Walid";

const SECTION_COLORS = [
  "#0f1e35",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#6d5dfc",
  "#0891b2",
  "#be123c",
  "#0f9f6e",
  "#92400e",
  "#1d4ed8",
  "#5a6a7e",
];

const SECTION_NAMES = [
  "Pilotage",
  "Architecture du site",
  "Conversion & devis",
  "Pages bois sur mesure",
  "Pages aluminium",
  "Pages fer & métal",
  "Réalisations",
  "Catalogue meubles",
  "SEO local",
  "Guides & contenus",
  "Google / Réseaux / Ads",
  "Suivi & amélioration",
];

const RAW_TASKS = `
Valider le positionnement Maison216 | Définir Maison216 comme atelier bois, aluminium, fer et aménagement sur mesure en Tunisie | Pilotage | 28/04/2026 | 28/04/2026 | Walid | Haute | À faire
Lister les services réels de l’atelier | Écrire la liste exacte des services réellement faisables aujourd’hui par l’atelier | Pilotage | 28/04/2026 | 29/04/2026 | Walid | Haute | À faire
Définir les zones géographiques prioritaires | Choisir les villes à cibler en premier : Tunis, Ariana, La Marsa, Ben Arous, Sousse, Sfax, Nabeul | Pilotage | 29/04/2026 | 29/04/2026 | Walid | Haute | À faire
Rassembler les photos disponibles | Collecter photos atelier, produits, chantiers, avant/après et installations terminées | Pilotage | 29/04/2026 | 01/05/2026 | Walid | Haute | À faire
Créer l’arborescence finale du site | Valider les grandes sections : Cuisine & Dressing, Aluminium, Ferronnerie, Meubles, Réalisations, Guides, Devis | Architecture du site | 30/04/2026 | 01/05/2026 | Walid | Haute | À faire
Créer le nouveau menu principal | Mettre en place le menu : Accueil, Cuisine & Dressing, Aluminium, Ferronnerie, Meubles, Réalisations, Conseils, Devis rapide | Architecture du site | 01/05/2026 | 02/05/2026 | Walid | Haute | À faire
Nettoyer les anciennes catégories | Supprimer ou masquer les catégories inutiles, vides, mal traduites ou non stratégiques | Architecture du site | 02/05/2026 | 04/05/2026 | Walid | Moyenne | À faire
Créer la page Devis rapide | Créer une page dédiée pour recevoir les demandes avec projet, ville, dimensions, photos et téléphone | Conversion & devis | 03/05/2026 | 05/05/2026 | Walid | Haute | À faire
Créer le formulaire de devis intelligent | Ajouter champs : type de projet, ville, dimensions, budget, délai, upload photos, téléphone WhatsApp | Conversion & devis | 04/05/2026 | 06/05/2026 | Walid | Haute | À faire
Ajouter le bouton WhatsApp global | Ajouter un bouton WhatsApp visible sur mobile et desktop avec message prérempli | Conversion & devis | 05/05/2026 | 06/05/2026 | Walid | Haute | À faire
Ajouter CTA devis sur les pages importantes | Ajouter boutons Demander un devis, Envoyer mes dimensions et Parler sur WhatsApp | Conversion & devis | 06/05/2026 | 08/05/2026 | Walid | Haute | À faire
Créer le message après demande de devis | Préparer un message de confirmation clair après envoi du formulaire | Conversion & devis | 07/05/2026 | 08/05/2026 | Walid | Moyenne | À faire
Refaire la structure de la homepage | Organiser la home autour de l’atelier, des services principaux, des réalisations et du devis | Architecture du site | 08/05/2026 | 10/05/2026 | Walid | Haute | À faire
Rédiger le hero de la homepage | Créer le texte principal : atelier bois, aluminium et fer en Tunisie avec CTA devis | Architecture du site | 09/05/2026 | 10/05/2026 | Walid | Haute | À faire
Créer le bloc services populaires | Ajouter cuisine, dressing, fenêtre aluminium, portail, pergola, meuble TV sur la homepage | Architecture du site | 10/05/2026 | 11/05/2026 | Walid | Haute | À faire
Créer page Cuisine sur mesure Tunisie | Page commerciale avec exemples, matériaux, styles, process, FAQ et CTA devis | Pages bois sur mesure | 11/05/2026 | 14/05/2026 | Walid | Haute | À faire
Créer page Dressing sur mesure Tunisie | Page ciblant dressing chambre, rangement, portes coulissantes, petit espace et devis | Pages bois sur mesure | 14/05/2026 | 17/05/2026 | Walid | Haute | À faire
Créer page Meuble TV sur mesure Tunisie | Page pour meuble TV mural, rangement salon, design moderne et dimensions personnalisées | Pages bois sur mesure | 17/05/2026 | 19/05/2026 | Walid | Haute | À faire
Créer page Placard sur mesure Tunisie | Page pour placards muraux, rangements chambre, entrée et petits espaces | Pages bois sur mesure | 19/05/2026 | 21/05/2026 | Walid | Moyenne | À faire
Créer page Bureau sur mesure Tunisie | Page pour bureaux maison, bureaux professionnels et rangements intégrés | Pages bois sur mesure | 21/05/2026 | 23/05/2026 | Walid | Moyenne | À faire
Créer page Fenêtre aluminium Tunisie | Page pour fenêtres alu, rénovation, dimensions, pose et demande de devis | Pages aluminium | 23/05/2026 | 26/05/2026 | Walid | Haute | À faire
Créer page Porte aluminium Tunisie | Page pour portes aluminium maison, commerce, porte vitrée et porte d’entrée | Pages aluminium | 26/05/2026 | 28/05/2026 | Walid | Haute | À faire
Créer page Vitrine aluminium magasin Tunisie | Page pour boutiques, cafés, restaurants, showrooms et locaux commerciaux | Pages aluminium | 28/05/2026 | 31/05/2026 | Walid | Haute | À faire
Créer page Verrière aluminium Tunisie | Page pour séparation intérieure, cuisine ouverte, bureau et style industriel | Pages aluminium | 31/05/2026 | 02/06/2026 | Walid | Moyenne | À faire
Créer page Cabine de douche aluminium Tunisie | Page pour cabines de douche, parois vitrées et salles de bain modernes | Pages aluminium | 02/06/2026 | 04/06/2026 | Walid | Moyenne | À faire
Créer page Portail fer forgé Tunisie | Page pour portails maison, villas, sécurité, modèles modernes et classiques | Pages fer & métal | 04/06/2026 | 07/06/2026 | Walid | Haute | À faire
Créer page Pergola métallique Tunisie | Page pour pergolas terrasse, jardin, maison, café et structure extérieure | Pages fer & métal | 07/06/2026 | 09/06/2026 | Walid | Haute | À faire
Créer page Garde-corps fer Tunisie | Page pour garde-corps escalier, balcon, terrasse, sécurité et design | Pages fer & métal | 09/06/2026 | 11/06/2026 | Walid | Moyenne | À faire
Créer page Grille de protection fer Tunisie | Page pour grilles de protection fenêtres, portes, maisons et commerces | Pages fer & métal | 11/06/2026 | 13/06/2026 | Walid | Moyenne | À faire
Créer page Escalier métallique Tunisie | Page pour escaliers métal intérieurs, extérieurs, mezzanines et locaux | Pages fer & métal | 13/06/2026 | 15/06/2026 | Walid | Basse | À faire
Créer la page principale Réalisations | Créer une page avec filtres : cuisine, dressing, aluminium, fer, meuble TV, commerces | Réalisations | 15/06/2026 | 17/06/2026 | Walid | Haute | À faire
Créer le modèle de page réalisation | Préparer une structure : ville, besoin client, solution, matériaux, photos, délai, CTA devis | Réalisations | 17/06/2026 | 18/06/2026 | Walid | Haute | À faire
Publier 3 réalisations bois | Ajouter 3 exemples réels : cuisine, dressing ou meuble TV avec photos et texte court | Réalisations | 18/06/2026 | 21/06/2026 | Walid | Haute | À faire
Publier 3 réalisations aluminium | Ajouter 3 exemples réels : fenêtre, porte ou vitrine aluminium | Réalisations | 21/06/2026 | 24/06/2026 | Walid | Haute | À faire
Publier 3 réalisations fer et métal | Ajouter 3 exemples réels : portail, pergola, garde-corps ou grille | Réalisations | 24/06/2026 | 27/06/2026 | Walid | Moyenne | À faire
Nettoyer les produits existants | Vérifier titres, photos, prix, catégories et descriptions des produits déjà en ligne | Catalogue meubles | 27/06/2026 | 30/06/2026 | Walid | Moyenne | À faire
Créer page catégorie Lits | Créer ou optimiser la page meubles/lits avec texte SEO, photos et produits propres | Catalogue meubles | 30/06/2026 | 01/07/2026 | Walid | Moyenne | À faire
Créer page catégorie Armoires | Créer ou optimiser la page meubles/armoires avec texte SEO, photos et produits propres | Catalogue meubles | 01/07/2026 | 02/07/2026 | Walid | Moyenne | À faire
Créer page catégorie Meubles TV | Créer ou optimiser la page meubles/meubles-tv avec texte SEO, photos et produits propres | Catalogue meubles | 02/07/2026 | 03/07/2026 | Walid | Moyenne | À faire
Créer page catégorie Tables | Créer ou optimiser la page meubles/tables avec texte SEO, photos et produits propres | Catalogue meubles | 03/07/2026 | 04/07/2026 | Walid | Basse | À faire
Créer page Cuisine sur mesure Tunis | Page locale pour cibler les recherches cuisine sur mesure à Tunis | SEO local | 04/07/2026 | 06/07/2026 | Walid | Haute | À faire
Créer page Dressing sur mesure Tunis | Page locale pour cibler les recherches dressing sur mesure à Tunis | SEO local | 06/07/2026 | 08/07/2026 | Walid | Haute | À faire
Créer page Fenêtre aluminium Tunis | Page locale pour cibler les recherches fenêtre aluminium à Tunis | SEO local | 08/07/2026 | 10/07/2026 | Walid | Haute | À faire
Créer page Portail fer forgé Tunis | Page locale pour cibler les recherches portail fer forgé à Tunis | SEO local | 10/07/2026 | 12/07/2026 | Walid | Moyenne | À faire
Créer pages locales Ariana | Créer cuisine sur mesure Ariana, dressing Ariana et fenêtre aluminium Ariana | SEO local | 12/07/2026 | 16/07/2026 | Walid | Moyenne | À faire
Créer pages locales La Marsa | Créer cuisine sur mesure La Marsa, dressing La Marsa et meuble TV La Marsa | SEO local | 16/07/2026 | 20/07/2026 | Walid | Moyenne | À faire
Créer guide Prix cuisine sur mesure Tunisie | Article guide pour expliquer les facteurs de prix et pousser vers demande de devis | Guides & contenus | 20/07/2026 | 22/07/2026 | Walid | Moyenne | À faire
Créer guide Prix dressing sur mesure Tunisie | Article guide pour expliquer dimensions, matériaux, finitions et estimation | Guides & contenus | 22/07/2026 | 24/07/2026 | Walid | Moyenne | À faire
Créer guide Choisir une fenêtre aluminium | Article guide pour expliquer types d’ouverture, vitrage, dimensions et pose | Guides & contenus | 24/07/2026 | 26/07/2026 | Walid | Moyenne | À faire
Créer guide Portail fer ou aluminium | Article comparatif pour aider à choisir entre portail fer et portail aluminium | Guides & contenus | 26/07/2026 | 28/07/2026 | Walid | Basse | À faire
Créer ou optimiser Google Business Profile | Ajouter description, catégories, zone desservie, horaires, téléphone, photos et lien devis | Google / Réseaux / Ads | 28/07/2026 | 30/07/2026 | Walid | Haute | À faire
Publier 10 photos sur Google Business | Ajouter photos atelier, produits, installations, avant/après et équipe | Google / Réseaux / Ads | 30/07/2026 | 01/08/2026 | Walid | Haute | À faire
Créer template publication Facebook | Préparer un modèle simple : photo réalisation, ville, service, CTA WhatsApp | Google / Réseaux / Ads | 01/08/2026 | 02/08/2026 | Walid | Moyenne | À faire
Préparer 5 posts avant/après | Créer 5 publications : cuisine, dressing, portail, fenêtre aluminium, meuble TV | Google / Réseaux / Ads | 02/08/2026 | 05/08/2026 | Walid | Haute | À faire
Préparer campagne Meta Ads WhatsApp | Préparer campagne messages WhatsApp sur cuisine, dressing, portail, pergola et aluminium | Google / Réseaux / Ads | 05/08/2026 | 07/08/2026 | Walid | Haute | À faire
Installer Google Analytics | Installer le suivi du trafic, sources, pages vues et conversions principales | Suivi & amélioration | 07/08/2026 | 08/08/2026 | Walid | Haute | À faire
Installer Google Search Console | Connecter le site pour suivre indexation, requêtes SEO et problèmes techniques | Suivi & amélioration | 08/08/2026 | 09/08/2026 | Walid | Haute | À faire
Suivre les clics WhatsApp | Ajouter tracking sur tous les boutons WhatsApp pour identifier les pages qui convertissent | Suivi & amélioration | 09/08/2026 | 10/08/2026 | Walid | Haute | À faire
Créer tableau de suivi des demandes | Suivre date, service demandé, ville, source, budget, statut et conversion | Suivi & amélioration | 10/08/2026 | 11/08/2026 | Walid | Haute | À faire
Analyser les résultats après 30 jours | Identifier pages avec trafic mais sans demandes et préparer corrections | Suivi & amélioration | 11/08/2026 | 15/08/2026 | Walid | Moyenne | À faire
`;

function loadEnvFile(filename) {
  const fullPath = path.join(process.cwd(), filename);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildId(prefix, value) {
  const hash = crypto.createHash("sha1").update(value).digest("hex").slice(0, 8);
  const slug = slugify(value).slice(0, 70) || "item";
  return `${prefix}-${slug}-${hash}`;
}

function toIsoDate(value) {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function parseTasks() {
  return RAW_TASKS.trim().split(/\r?\n/).map((line) => {
    const parts = line.split("|").map((part) => part.trim());

    if (parts.length !== 8) {
      throw new Error(`Invalid task line: ${line}`);
    }

    const [title, note, section, startDate, dueDate, responsible, priority, status] = parts;

    return {
      dueDate: toIsoDate(dueDate),
      note,
      priority,
      responsible,
      section,
      startDate: toIsoDate(startDate),
      status,
      title,
    };
  });
}

function getDbConfig() {
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");

  return {
    database: process.env.DB_NAME || "techsolution",
    host: process.env.DB_HOST || "localhost",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
  };
}

async function main() {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    charset: "utf8mb4",
    namedPlaceholders: true,
  });

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const sections = SECTION_NAMES.map((name, index) => ({
    color: SECTION_COLORS[index % SECTION_COLORS.length],
    id: buildId("section-maison216", name),
    name,
    position: index,
  }));
  const sectionsByName = new Map(sections.map((section) => [section.name, section]));
  const tasks = parseTasks();

  await connection.beginTransaction();

  try {
    await connection.execute(
      `INSERT INTO projects
        (id, name, type, color, status, health, progress, next_action, blockers, last_update)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [PROJECT_ID, PROJECT_NAME, "MEDIA", PROJECT_COLOR, "Actif", "Bon", 0, "", "", null]
    );

    for (const section of sections) {
      await connection.execute(
        `INSERT INTO task_sections (id, project_id, name, color, position)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           color = VALUES(color),
           position = VALUES(position)`,
        [section.id, PROJECT_ID, section.name, section.color, section.position]
      );
    }

    const [existingRows] = await connection.query(
      "SELECT id, title FROM tasks WHERE project_id = ?",
      [PROJECT_ID]
    );
    const existingTitles = new Set(
      existingRows.map((row) => String(row.title).trim().toLowerCase())
    );

    let insertedTasks = 0;
    let skippedTasks = 0;

    for (const task of tasks) {
      const titleKey = task.title.trim().toLowerCase();

      if (existingTitles.has(titleKey)) {
        skippedTasks += 1;
        continue;
      }

      const section = sectionsByName.get(task.section);

      if (!section) {
        throw new Error(`Unknown section for task "${task.title}": ${task.section}`);
      }

      await connection.execute(
        `INSERT INTO tasks
          (id, project_id, section_id, title, status, priority, start_date, start_time, due_date, due_time, note, responsible, created_on, created_by, updated_on, updated_by, status_changed_on, status_changed_by, completed_on, completed_by, attachments_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          buildId("task-maison216", task.title),
          PROJECT_ID,
          section.id,
          task.title,
          task.status,
          task.priority,
          task.startDate,
          null,
          task.dueDate,
          null,
          task.note,
          task.responsible,
          now,
          CREATED_BY,
          now,
          CREATED_BY,
          now,
          CREATED_BY,
          null,
          null,
          "[]",
        ]
      );
      existingTitles.add(titleKey);
      insertedTasks += 1;
    }

    await connection.commit();

    console.log(
      `Maison216 seed completed: ${sections.length} sections ready, ${insertedTasks} tasks inserted, ${skippedTasks} tasks skipped.`
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
