# Badges Fi.Fa.Kri

Application pour générer des badges à partir d’un modèle image, d’un fichier Excel et d’une base PostgreSQL. Stack : **Quasar (Vue 3)** + **Node.js (Express)** + **PostgreSQL**.

## Prérequis

- Node.js 18+ (recommandé : 20 LTS via nvm)
- Docker (optionnel, pour PostgreSQL)

## Base de données

```bash
docker compose up -d
```

Cela crée la base `fifakri` et applique `sql/init.sql` au premier démarrage du volume.

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Variables dans `.env` :

- `DATABASE_URL` — ex. `postgresql://postgres:postgres@localhost:5432/fifakri`
- `PORT` — défaut `3001`
- `UPLOAD_DIR` — dossier des fichiers uploadés (modèles)

## Frontend

```bash
cd frontend
npm install
npm run dev
```

L’UI est sur `http://localhost:9000` ; les appels `/api` sont proxifiés vers le backend (voir `vite.config.js`). Pour une autre URL d’API, définir `VITE_API_URL`.

## Excel

Première ligne : en-têtes. Colonnes reconnues (insensible à la casse / accents) :

| Champ            | Exemples d’en-tête                                         |
| ---------------- | ---------------------------------------------------------- |
| Nom              | Nom                                                        |
| Prénoms          | Prénoms                                                    |
| Eglizy           | Eglizy (nom ou code présent dans la table **Églises**)     |
| Tokim-panompoana | Tokim-panompoana                                           |
| Distrika         | Distrika                                                   |
| Matricule        | Matricule (si rempli : utilisé tel quel, doit être unique) |
| Photo            | Photo, lien, URL…                                          |

## Matricule automatique

Format par défaut : `MMYY` + `CODE_ÉGLISE` (4 caractères) + `DDMMYY` (date Tokim) + `NNN` (compteur sur ce préfixe, base données).

Exemple : `0526AMRY180421001` — mois/année courants, code église `AMRY`, date Tokim 18/04/21, compteur `001`.

Les styles (ordre des segments) sont configurables dans l’écran **Styles matricule**.

## PDF

A4 portrait, **12 badges par page** : 2 colonnes × 6 lignes (6 à gauche puis 6 à droite). Proportions badge allongées (+3 cm de longueur) adaptées à la feuille (~6,5 × 4,9 cm par badge, espacement minimal). Photos Excel/ODS recadrées en cercle dans le rond bleu.

## API (résumé)

| Méthode | Chemin                      | Rôle                                          |
| ------- | --------------------------- | --------------------------------------------- |
| GET     | `/api/eglises`              | Liste des églises / codes                     |
| POST    | `/api/eglises`              | Ajouter                                       |
| GET     | `/api/matricule-styles`     | Styles de matricule                           |
| POST    | `/api/matricule-styles`     | Créer un style                                |
| GET     | `/api/templates/active`     | Modèle actif                                  |
| POST    | `/api/templates`            | multipart `file` — upload modèle              |
| GET     | `/api/membres`              | Liste membres                                 |
| POST    | `/api/membres/import-excel` | multipart `file`, option `matricule_style_id` |
| PATCH   | `/api/membres/:id`          | Modifier champs dont `matricule`              |
| POST    | `/api/badges/pdf`           | JSON `{ "ids": [] }` ou `{}` pour tous → PDF  |

# badge_fifakri

# en développement

git checkout dev

git add .
git commit -m "nouvelle fonctionnalité"
git push origin dev

# Validation si correcte :

git checkout main
git merge dev
git push origin main
