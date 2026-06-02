const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const FALLBACK_PROJECT_ID = "project-azur-private-driver";
const PROJECT_NAME = "Azur Private Driver";
const PROJECT_COLOR = "#d7f340";
const CREATED_BY = "Walid";
const DEFAULT_RESPONSIBLE = "Walid";

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
  "Stratégie",
  "Technique",
  "Homepage",
  "Flotte",
  "Multilingue",
  "UI/UX",
  "Navigation",
  "Pages",
  "SEO technique",
  "SEO local",
  "Documentation",
  "SEO indexation",
  "Formulaires",
  "CRM léger",
  "SEO contenu",
  "Conversion",
  "Réputation",
  "Performance",
  "Contenu",
  "Assets",
  "Google Business Profile",
  "Email domaine",
  "Données business",
];

const RAW_TASKS = `
Terminé | Haute | Stratégie | Cadrage positionnement premium | Définir Azur Private Driver comme machine d’acquisition VTC premium : Nice Airport, Monaco, Cannes, Saint-Tropez, WhatsApp, prix fixe. | 2026-05-20 | 2026-05-21
Terminé | Haute | Stratégie | Architecture SEO en silos | Structurer le site en silos /services/, /trajets/, /zones/, /flotte/, /evenements/ pour éviter les doublons SEO. | 2026-05-21 | 2026-05-22
Terminé | Haute | Technique | Socle Next.js + MySQL | Créer le site Next.js avec base MySQL azurdriver, composants réutilisables, contenus modulaires et routes SEO. | 2026-05-22 | 2026-05-24
Terminé | Haute | Technique | Déploiement VPS OVH | Configurer GitHub, SSH, serveur Node/PM2, reverse proxy Plesk/Nginx et mise en production sur azurprivatedriver.net. | 2026-05-24 | 2026-05-26
Terminé | Haute | Technique | Runbook production | Créer le document d’exploitation : accès SSH, repo GitHub, commandes de déploiement, logs, DB, PM2, sécurité. | 2026-05-26 | 2026-05-26
Terminé | Haute | Homepage | Perfection homepage complète | Améliorer hero, trajets avec images/prix, transfert aéroport, flotte, services, zones, événements, FAQ, CTA finale et footer. | 2026-05-22 | 2026-05-29
Terminé | Haute | Homepage | Intégration logo et images | Ajouter le logo officiel, photos véhicules, images aéroport et visuels premium sur les sections clés. | 2026-05-23 | 2026-05-27
Terminé | Haute | Flotte | Ajouter Mercedes Classe E | Ajouter Mercedes Classe E à la flotte avec Tesla Model Y et Mercedes Classe V. | 2026-05-27 | 2026-05-27
Terminé | Haute | Multilingue | Version anglaise | Créer la structure EN, menu EN, pages EN, contenus anglais orientés clientèle internationale. | 2026-05-27 | 2026-05-28
Terminé | Haute | Multilingue | Version allemande | Ajouter /de/ avec vrai copywriting allemand, menus, pages, sitemap, hreflang et html lang="de". | 2026-06-01 | 2026-06-01
Terminé | Moyenne | UI/UX | Sélecteur de langue premium | Remplacer FR/EN/DE collés par un composant avec drapeaux, liste verticale et version mobile dans le hamburger. | 2026-06-01 | 2026-06-01
Terminé | Haute | Navigation | Menu principal desktop/mobile | Créer menu premium avec sous-menus, architecture réelle du site et hamburger mobile. | 2026-05-31 | 2026-06-01
Terminé | Haute | Pages | Page /tarifs/ | Créer page Trajets & Tarifs avec prix indicatifs, mentions, tableaux, CTA WhatsApp et articles placeholder. | 2026-05-29 | 2026-05-30
Terminé | Haute | Pages | Pages trajets FR/EN/DE | Créer les pages trajets prioritaires : Nice Airport vers Monaco, Cannes, Antibes, Saint-Tropez, Menton, Èze, etc. | 2026-05-29 | 2026-05-31
Terminé | Haute | Pages | Pages services FR/EN/DE | Créer les pages services : transfert aéroport, mise à disposition, événementiel, tours privés, longue distance, business. | 2026-05-30 | 2026-05-31
Terminé | Haute | Pages | Pages zones FR/EN/DE | Créer les pages locales : Nice, Monaco, Cannes, Antibes, Saint-Tropez, Menton, Saint-Jean-Cap-Ferrat, Villefranche-sur-Mer. | 2026-05-30 | 2026-05-31
Terminé | Haute | Pages | Pages événements FR/EN/DE | Créer Festival de Cannes, Grand Prix Monaco, Monaco Yacht Show, MIPIM Cannes, Cannes Lions. | 2026-05-31 | 2026-06-01
Terminé | Moyenne | Pages | Pages principales | Créer /trajets/, /flotte/, /evenements/, /reservation/, /contact/, /a-propos/. | 2026-05-31 | 2026-06-01
Terminé | Haute | SEO technique | Sitemap, robots, canonical, hreflang | Générer sitemap final, robots.txt, canonical et alternates FR/EN/DE. | 2026-05-31 | 2026-06-01
Terminé | Haute | SEO technique | Redirections 301 | Mettre en place les redirections depuis anciennes URLs vers les nouveaux silos. | 2026-05-31 | 2026-06-01
Terminé | Haute | SEO technique | Balise Google Search Console | Ajouter la balise de vérification Google Search Console. | 2026-06-01 | 2026-06-01
Terminé | Haute | SEO technique | Balise Bing Webmaster Tools | Ajouter la balise de vérification Bing Webmaster Tools. | 2026-06-01 | 2026-06-01
Terminé | Haute | SEO local | Fiche Google Business Profile | Créer la fiche Google Business Profile, choisir catégories et rédiger description anglaise orientée clientèle internationale. | 2026-06-01 | 2026-06-01
Terminé | Moyenne | Documentation | Guide projet complet | Créer le guide projet : contexte, stack, base de données, architecture, charte graphique, SEO, pages, déploiement. | 2026-05-30 | 2026-05-31
En cours | Haute | SEO indexation | Soumission Search Console | Soumettre sitemap, vérifier indexation, suivre les pages découvertes/indexées et corriger les exclusions. | 2026-06-01 | 2026-06-14
En cours | Haute | SEO indexation | Soumission Bing Webmaster Tools | Soumettre sitemap à Bing, suivre indexation Bing/Yahoo/DuckDuckGo via Bing. | 2026-06-01 | 2026-06-14
En cours | Haute | SEO local | Optimisation Google Business Profile | Ajouter photos, services, zones, horaires, lien /en/, posts, questions/réponses et premières preuves de confiance. | 2026-06-01 | 2026-06-10
À faire | Haute | Formulaires | Notifications réservation | Envoyer chaque demande formulaire vers email et/ou WhatsApp, avec copie claire des champs client. | 2026-06-02 | 2026-06-04
À faire | Haute | Formulaires | Support formulaire allemand | Mettre à jour validation API et base pour accepter locale = de dans les demandes de réservation. | 2026-06-02 | 2026-06-02
À faire | Haute | CRM léger | Interface admin réservations | Créer une petite interface pour voir les demandes stockées dans bookings, statut, date, client, trajet et véhicule. | 2026-06-04 | 2026-06-08
À faire | Haute | SEO contenu | Module blog | Créer le module articles : catégories, slug, image, date, contenu, SEO title/meta, FR/EN/DE si nécessaire. | 2026-06-05 | 2026-06-12
À faire | Haute | SEO contenu | Premiers articles trafic | Rédiger 6 à 10 articles autour prix/trajets : Nice Airport Monaco, Cannes, Saint-Tropez, van 7 places, événements, comparatifs. | 2026-06-10 | 2026-06-24
À faire | Moyenne | Conversion | Tracking conversions | Installer GA4, Google Tag Manager ou tracking simple : clic WhatsApp, formulaire, téléphone, pages à forte conversion. | 2026-06-03 | 2026-06-06
À faire | Moyenne | SEO local | Apple Business Connect | Créer/optimiser la fiche Apple Plans pour capter recherches iPhone et Siri. | 2026-06-03 | 2026-06-07
À faire | Moyenne | SEO local | Bing Places | Vérifier ou importer la fiche Google Business Profile dans Bing Places. | 2026-06-03 | 2026-06-07
À faire | Moyenne | SEO local | Annuaire TripAdvisor / plateformes voyage | Étudier présence pertinente sur TripAdvisor, Yelp, Trustpilot ou annuaires premium locaux sans spam SEO. | 2026-06-07 | 2026-06-14
À faire | Haute | Réputation | Collecte avis clients | Préparer lien avis Google, message WhatsApp post-trajet et process pour obtenir les premiers avis. | 2026-06-02 | 2026-06-15
À faire | Moyenne | Performance | Audit Core Web Vitals | Tester Lighthouse/PageSpeed sur mobile et corriger images, JS, CLS, LCP si nécessaire. | 2026-06-04 | 2026-06-08
À faire | Moyenne | SEO technique | Validation Schema.org | Tester LocalBusiness, Service, FAQPage, BreadcrumbList et corriger les erreurs Rich Results. | 2026-06-04 | 2026-06-08
À faire | Moyenne | Contenu | Relecture humaine FR/EN/DE | Relire les textes avec un œil commercial natif, surtout allemand, pour affiner ton premium et naturel. | 2026-06-03 | 2026-06-10
À faire | Moyenne | Assets | Photos réelles véhicules | Remplacer progressivement les images génériques par photos réelles Tesla, Classe E, Classe V et chauffeur. | 2026-06-05 | 2026-06-20
Bloqué | Haute | Google Business Profile | Validation finale fiche Google | Dépend de Google : validation par téléphone, email, vidéo ou courrier selon ce que Google impose. | 2026-06-01 | 2026-06-15
Bloqué | Moyenne | Email domaine | Configuration email pro | À confirmer côté Plesk/domaine : boîte contact@azurprivatedriver.net, SPF/DKIM/DMARC, réception et envoi fiables. | 2026-06-02 | 2026-06-06
Bloqué | Moyenne | Données business | Prix définitifs et conditions | Valider avec le gérant les prix, suppléments nuit/événement, conditions d’attente, paiement et annulation. | 2026-06-02 | 2026-06-05
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

function parseTasks() {
  return RAW_TASKS.trim().split(/\r?\n/).map((line) => {
    const parts = line.split("|").map((part) => part.trim());

    if (parts.length !== 7) {
      throw new Error(`Invalid task line: ${line}`);
    }

    const [status, priority, section, title, note, startDate, dueDate] = parts;

    return {
      dueDate,
      note,
      priority,
      responsible: DEFAULT_RESPONSIBLE,
      section,
      startDate,
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

async function resolveProjectId(connection) {
  const [rows] = await connection.query(
    "SELECT id FROM projects WHERE name = ? ORDER BY created_at ASC LIMIT 1",
    [PROJECT_NAME]
  );

  if (rows.length > 0) {
    return String(rows[0].id);
  }

  await connection.execute(
    `INSERT INTO projects
      (id, name, type, color, status, health, progress, next_action, blockers, last_update)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [FALLBACK_PROJECT_ID, PROJECT_NAME, "AUTRE", PROJECT_COLOR, "Actif", "Bon", 0, "", "", null]
  );

  return FALLBACK_PROJECT_ID;
}

async function main() {
  const connection = await mysql.createConnection({
    ...getDbConfig(),
    charset: "utf8mb4",
    namedPlaceholders: true,
  });

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const tasks = parseTasks();

  await connection.beginTransaction();

  try {
    const projectId = await resolveProjectId(connection);
    const sections = SECTION_NAMES.map((name, index) => ({
      color: SECTION_COLORS[index % SECTION_COLORS.length],
      id: buildId(`section-${projectId}`, name),
      name,
      position: index,
    }));
    const sectionsByName = new Map(sections.map((section) => [section.name, section]));

    for (const section of sections) {
      await connection.execute(
        `INSERT INTO task_sections (id, project_id, name, color, position)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           color = VALUES(color),
           position = VALUES(position)`,
        [section.id, projectId, section.name, section.color, section.position]
      );
    }

    const [existingRows] = await connection.query(
      "SELECT id, title FROM tasks WHERE project_id = ?",
      [projectId]
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

      const completedOn = task.status === "Terminé" ? task.dueDate : null;
      const completedBy = task.status === "Terminé" ? CREATED_BY : null;

      await connection.execute(
        `INSERT INTO tasks
          (id, project_id, section_id, title, status, priority, start_date, start_time, due_date, due_time, note, responsible, created_on, created_by, updated_on, updated_by, status_changed_on, status_changed_by, completed_on, completed_by, attachments_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          buildId(`task-${projectId}`, task.title),
          projectId,
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
          completedOn,
          completedBy,
          "[]",
        ]
      );

      existingTitles.add(titleKey);
      insertedTasks += 1;
    }

    await connection.commit();

    console.log(
      `Azur Private Driver seed completed for ${projectId}: ${sections.length} sections ready, ${insertedTasks} tasks inserted, ${skippedTasks} tasks skipped.`
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
