# Tech-Solution - contexte projet et déploiement

Dernière mise à jour : 2026-04-22

Ce document sert de briefing rapide pour un nouveau développeur. Il décrit le site, l'hébergement, le dépôt GitHub, la stack technique, la base de données et la procédure de déploiement actuelle.

## Vue d'ensemble

Tech-Solution est le site vitrine de la société Tech-Solution, principalement en arabe, accessible sur :

- Site public : https://www.techsolution-group.com/
- Application interne projets : https://www.techsolution-group.com/projects

Le site public est une vitrine marketing. L'espace `/projects` est une mini app interne de pilotage de projets, protégée par connexion email + mot de passe.

## Dépôt GitHub

- Repository : https://github.com/walkhatib39-ctrl/tech-solution
- Branche de production utilisée : `master`
- Commit initial de mise en ligne de l'app projets : `109ea01 feat: add projects management app`

Le déploiement Plesk tire directement depuis ce repository via l'outil Git intégré :

- `Pull now`
- `Deploy now`

Ne pas versionner les fichiers de secrets, notamment `.env.production`, `.env.local` ou équivalents.

## Hébergement

Hébergement actuel :

- Fournisseur VPS : OVH
- Nom VPS : `vps-657d78f8.vps.ovh.net`
- IPv4 : `37.59.96.235`
- IPv6 : `2001:41d0:305:2100::ec5b`
- Panel : Plesk
- Accès Plesk via IP : `https://37.59.96.235:8443`
- Utilisateur SSH principal : `debian`
- L'utilisateur `debian` a accès `sudo`.

Domaine Plesk :

- Domaine : `techsolution-group.com`
- Document root : `/httpdocs`
- Chemin absolu serveur : `/var/www/vhosts/techsolution-group.com/httpdocs`
- Utilisateur système Plesk du site : `techsolution-group.co_lufiimcupx`
- Groupe : `psacln` / `psaserv` selon les fichiers

Important : plusieurs sites existent sur le VPS. Toujours cibler explicitement le dossier `techsolution-group.com/httpdocs`.

## Stack technique

Application :

- Next.js `16.1.4`
- React `19.2.3`
- TypeScript
- Tailwind CSS v4
- lucide-react pour les icônes
- mysql2 pour MySQL
- Serveur custom `server.js` utilisé par Plesk/Passenger

Scripts npm :

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Sur Plesk, l'application Node.js est configurée avec :

- Mode : `production`
- Application root : `/httpdocs`
- Startup file : `server.js`
- Node.js activé via l'extension Node.js de Plesk

## Structure importante du code

Fichiers principaux de l'espace projets :

- `src/app/projects/page.tsx` : page `/projects`
- `src/app/projects/ProjectsLogin.tsx` : écran de connexion
- `src/app/projects/ProjectsManager.tsx` : interface principale de gestion projets
- `src/app/api/projects/route.ts` : API GET/PUT des données projets
- `src/lib/projectsAuth.ts` : authentification utilisateur et cookie signé
- `src/lib/projectsStore.ts` : accès MySQL, création/migration du schéma, lecture/sauvegarde
- `src/lib/projectsTypes.ts` : types TypeScript partagés

Le site vitrine reste dans les composants classiques sous `src/components`.

## Base de données

Base locale de développement :

- Environnement : WAMP / phpMyAdmin
- Database : `techsolution`
- User local historique : `root`
- Password local historique : vide

Base production Plesk :

- Database : `techsolution`
- User : `techsolution_user`
- Password : défini dans Plesk, ne pas écrire dans Git

Tables utilisées par l'app projets :

- `project_users`
- `project_access`
- `projects`
- `task_sections`
- `tasks`
- `project_doc_folders`
- `project_doc_files`
- `project_tracking_fields`
- `project_updates`
- `project_interventions`

Le schéma est créé automatiquement par `src/lib/projectsStore.ts` au premier accès API si les tables n'existent pas. Les migrations simples, comme `tasks.section_id`, sont aussi gérées dans ce fichier.

Les données locales ont été exportées depuis phpMyAdmin local puis importées dans la base Plesk `techsolution`.

## Variables d'environnement

En production, le serveur utilise `.env.production` dans :

```text
/var/www/vhosts/techsolution-group.com/httpdocs/.env.production
```

Permissions actuelles recommandées :

```bash
chmod 600 .env.production
```

Variables nécessaires :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=techsolution
DB_USER=techsolution_user
DB_PASSWORD=...
PROJECTS_PASSWORD=...
PROJECTS_AUTH_SECRET=...
```

Ne jamais committer les valeurs réelles. `PROJECTS_PASSWORD` sert de mot de passe initial pour les utilisateurs seedés si aucun utilisateur n'existe encore. `PROJECTS_AUTH_SECRET` sert à signer le cookie `ts-projects-auth`.

En production, si `PROJECTS_PASSWORD` est absent, l'accès `/projects` ne doit pas fonctionner. Le fallback `techsolution` existe seulement en développement.

## App interne `/projects`

Fonctionnalités actuelles :

- Connexion par email + mot de passe
- Gestion d'équipe réservée au super admin
- Assignation des membres aux projets
- Un membre voit uniquement les projets assignés
- Un membre assigné peut tout éditer dans ses projets
- Gestion de projets
- Tâches avec statut, priorité, responsable, date début, deadline et note
- Sections de tâches personnalisables par projet
- Sections collapsibles, fermées par défaut
- Filtres par statut et responsable
- Sauvegarde automatique en base MySQL
- Onglet Docs avec dossiers et fichiers `.md` créés dans l'app
- Onglet Pilotage calculé à partir des tâches
- Onglet Suivi avec indicateurs libres
- Onglet Interventions avec date, département, ville, intervention, prix, statut et note

Projet important actuellement :

- `WeCleaned`
- Sections existantes :
  - `SEO & GEO`
  - `Tracking site & conversion`
  - `Opérations & interventions`
  - `Devis & automatisation IA`

Note produit importante : les suivis ne doivent pas être pensés comme des templates fixes par catégorie globale. Chaque projet peut avoir un suivi et des fonctionnalités spécifiques. Pour les prochains développements, le propriétaire donnera le besoin exact projet par projet.

Utilisateurs seedés si la table `project_users` est vide :

- Walid : `walkhatib39@gmail.com`, rôle `super_admin`
- Fares Bouzoumita : `bouzoumita.fares@gmail.com`, rôle `member`
- Houcem Bouaffoura : `bouaffoura.houssem@gmail.com`, rôle `member`
- Hamza Bennour : `hamza.bennour@live.com`, rôle `member`
- Mohamed Jedoui : `mohamed.jedoui@gmail.com`, rôle `member`
- Hamdi Mannai : `mh.develite@gmail.com`, rôle `member`

Tous les utilisateurs seedés reçoivent initialement le hash du mot de passe `PROJECTS_PASSWORD`. Walid gère ensuite les accès projet dans l'onglet `Équipe`.

## Procédure de déploiement via Plesk

Chemin Plesk :

1. `Websites & Domains`
2. `techsolution-group.com`
3. `Git`
4. `Pull now`
5. `Deploy now`

Après un changement de dépendances ou de build :

1. Aller dans `Node.js`
2. Lancer `NPM install`
3. Lancer `npm run build`
4. Cliquer `Restart App`

## Procédure SSH utile

Toujours travailler dans :

```bash
cd /var/www/vhosts/techsolution-group.com/httpdocs
```

Comme les fichiers appartiennent à l'utilisateur Plesk, exécuter npm avec :

```bash
sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && npm install'
```

Build production :

```bash
sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && npm run build'
```

Redémarrage si le bouton Plesk n'est pas utilisé :

```bash
sudo -u techsolution-group.co_lufiimcupx bash -lc 'mkdir -p /var/www/vhosts/techsolution-group.com/httpdocs/tmp && touch /var/www/vhosts/techsolution-group.com/httpdocs/tmp/restart.txt'
```

Vérifier que le site répond :

```bash
curl -I https://www.techsolution-group.com/
curl -I https://www.techsolution-group.com/projects
```

Tester que l'API est protégée :

```bash
curl -i https://www.techsolution-group.com/api/projects | head -30
```

Réponse attendue sans cookie :

```text
HTTP/2 401
{"error":"Unauthorized"}
```

Tester la connexion MySQL depuis le VPS sans afficher les secrets :

```bash
sudo -u techsolution-group.co_lufiimcupx bash -lc 'cd /var/www/vhosts/techsolution-group.com/httpdocs && set -a && . ./.env.production && set +a && node -e "const mysql=require(\"mysql2/promise\"); mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME}).then(async c=>{const [r]=await c.query(\"SELECT DATABASE() db, COUNT(*) projects FROM projects\"); console.log(r); await c.end();}).catch(e=>{console.error(e.message); process.exit(1);})"'
```

## Procédure locale

Installation :

```bash
npm install
```

Développement :

```bash
npm run dev
```

URL locale :

```text
http://localhost:3000
http://localhost:3000/projects
```

Build local :

```bash
npm run build
```

Contrôles utiles ciblés pour l'app projets :

```bash
npx eslint src\app\projects\ProjectsManager.tsx src\lib\projectsStore.ts src\lib\projectsTypes.ts
npx tsc --noEmit
```

Note : `npm run lint` global peut remonter des problèmes historiques hors app projets, notamment dans `server.js`, `admin` ou certains composants vitrine. Ne pas confondre ces problèmes existants avec les changements de l'app projets.

## Points de vigilance

- Ne jamais committer `.env.production`, mots de passe Plesk, mots de passe MySQL ou secrets d'auth.
- La production dépend de MySQL Plesk, pas du WAMP local.
- Un `git pull/deploy` ne migre pas automatiquement les données locales. Pour déplacer les données, utiliser export/import phpMyAdmin ou un script de migration contrôlé.
- Si `mysql2` est absent après un pull, lancer `npm install`.
- Si `/projects` affiche une erreur 500, vérifier d'abord `.env.production`, la connexion DB, les tables `project_users/project_access` et les logs Plesk.
- Si l'API `/api/projects` répond `401` sans connexion, c'est normal.
- Si le site public fonctionne mais `/projects` échoue, vérifier surtout la DB et les variables `PROJECTS_*`.
