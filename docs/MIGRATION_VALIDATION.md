# O'Naturelle — validation réelle après migration Phase 2

Date : 22 août 2026  
Périmètre : Next.js Route Handlers + Prisma contre le PostgreSQL existant.  
Règles respectées : aucune fonctionnalité ajoutée, `apps/api` conservé, aucune migration destructive (`db push` / `migrate reset` non exécutés), aucun mot de passe utilisateur modifié.

**La migration n’est pas considérée comme complète.** Les Route Handlers fonctionnent contre PostgreSQL, mais l’environnement local `apps/web` n’est pas encore configuré pour que le frontend utilise `/api/v1` same-origin par défaut.

## Environnement (sans valeurs secrètes)

| Élément | État |
|---|---|
| `apps/web/.env.local` | Présent, **non suivi** par Git |
| `DATABASE_URL` dans `.env.local` | **ABSENT** |
| `AUTH_SECRET` dans `.env.local` | **ABSENT** |
| `JWT_SECRET` / durées JWT dans `.env.local` | **ABSENT** |
| Variables MinIO dans `.env.local` | **ABSENTES** |
| `NEXT_PUBLIC_SITE_URL` dans `.env.local` | Présente |
| `NEXT_PUBLIC_API_URL` dans `.env.local` | Présente et pointe vers FastAPI `:8002` |
| `.env` racine | Présent, **non suivi** ; `DATABASE_URL` au format SQLAlchemy `postgresql+psycopg://` (hôte `localhost:5435`) ; `JWT_SECRET` et MinIO présents ; `AUTH_SECRET` absent |
| Conversion Prisma | Le client (`lib/db/prisma.ts`) accepte `postgresql+psycopg://` et le convertit en `postgresql://` |

Pour cette validation, le serveur Next a été lancé sur le port **3001** avec les variables du `.env` racine injectées en mémoire (URL convertie, `NEXT_PUBLIC_API_URL` vide). Rien n’a été écrit dans `.env.local`.

Ports observés au moment du test :

- `5435` PostgreSQL : ouvert
- `9000` MinIO : ouvert
- `8002` FastAPI : ouvert, `/health` OK
- `3000` : occupé par **une autre application** (`GET /api/health` → `{"ok":true,"database":false}`, `/` en 404). Ce n’est pas l’app O'Naturelle.

## Schéma Prisma / SQLAlchemy / PostgreSQL

Comparaison en lecture seule. **Aucune correction automatique.**

### Aligné (pas d’écart fonctionnel)

- 26 tables métier présentes des deux côtés. Table extra PostgreSQL uniquement : `alembic_version` (attendu, Alembic conservé).
- Uniques nommées identiques (`uq_*`) : toutes présentes.
- Clés étrangères : 51, règles `ON DELETE` identiques à Prisma et SQLAlchemy (RESTRICT / CASCADE / SET NULL).
- Enums stockés en `varchar`, pas en type PostgreSQL ENUM.
- Montants et stocks en `int4` (unités mineures), jamais en `numeric` / `float`.
- Dates en `timestamptz` (et `date` pour `cash_closures.business_date`).
- `files.size_bytes` en `bigint`.
- `settings.value` / `audit_logs.payload` en `jsonb`.
- Zones réelles : `cameroun` / XAF (`minor_units` 0), `europe` / EUR (`minor_units` 2).

### Écarts signalés (non corrigés)

1. **Noms d’index** — PostgreSQL utilise les noms SQLAlchemy `ix_*`. Prisma déclare les mêmes colonnes sous `*_idx`. Couverture équivalente, pas d’index métier manquant.
2. **`@updatedAt` Prisma** — mis à jour côté client Prisma, pas par un trigger PostgreSQL. Comportement SQLAlchemy `TimestampMixin` inchangé pour FastAPI.
3. **Aucune table Prisma inventée.** Aucune table métier absente.

## Données observées (lecture)

- 2 utilisateurs : `OWNER`, `SELLER` (pas de compte `ADMIN`).
- Hashes `argon2id`. Vérification `@node-rs/argon2` : **OWNER PASS**, **SELLER PASS** avec les identifiants existants.
- 40 produits, 17 catégories, 36 prix zone Cameroun, **0 prix zone Europe**.
- 0 ligne `promotions`, 0 `promo_is_active` sur les prix zone.
- 1 fichier en base, **0 `product_images`**.
- Positions échantillonnées : aucune quantité négative.

## PASS

Fonctionnalités réellement exercées contre PostgreSQL via les Route Handlers Next (`http://localhost:3001`) :

### Auth / JWT / RBAC

- Login OWNER et SELLER avec les mots de passe existants (Argon2id inchangé).
- Login refusé (401) avec un mauvais mot de passe.
- `GET /api/v1/auth/me`.
- Refresh : nouveau couple access/refresh ; réutilisation de l’ancien refresh → 401 (rotation / révocation).
- Dashboard OWNER 200 ; dashboard SELLER 403.
- Ajustement stock SELLER 403.
- Changement de statut commande SELLER 403 (`requireOwner`).

### Catalogue / public

- `GET /api/v1/public/shop?zone=cameroun` : 36 produits, devise **XAF**.
- `GET /api/v1/public/shop?zone=europe` : 0 produit, devise **EUR** (pas de conversion XAF→EUR).
- Fiche produit public Cameroun 200 ; slug inconnu 404.
- `GET /api/v1/categories` (17) et `GET /api/v1/products` (40) authentifiés.
- `GET /api/v1/zones` (2) et `GET /api/v1/currencies` (2).

### Checkout / commandes

- Devis Cameroun : montant entier XAF, `can_submit=true`.
- Devis Europe du même produit Cameroun : `products_amount=0`, `can_submit=false` (prix par zone, pas de FX).
- Création commande publique `ON-CA-20260822-A3B0` statut `NEW` (stock non décrémenté à la création).
- Lecture publique par numéro.
- Liste commandes OWNER et SELLER.
- Transition `NEW → CONFIRMED` puis `CONFIRMED → CANCELLED` : mouvements `ORDER_CONFIRMED -1` et `ORDER_CANCELLED +1`, solde net 0.

### Stock

- Lecture des positions (40).
- Transfert 1 unité Cameroun → Europe puis retour : quantités cohérentes, restauration nette.
- Vendeuse interdite en écriture stock.

### Promotions / settings

- `GET /api/v1/promotions` 200 (liste vide).
- `GET /api/v1/settings` OWNER 200.

### MinIO (écriture)

- Upload PNG via `POST /api/v1/files` : 200.
- Récupération de l’URL publique du fichier **venant d’être uploadé** : 200.
- Objet inexistant : 404.

### Frontend (HTTP serveur, pas de navigateur)

Pages 200 : `/`, `/boutique`, `/panier`, `/commande`, `/dashboard/login`, `/dashboard`, `/dashboard/produits`, `/dashboard/commandes`, `/dashboard/stock`, `/dashboard/parametres`.  
HTML d’accueil du serveur 3001 sans `localhost:8002` (env same-origin).  
Aucun 500 Prisma observé sur ces appels.

### Qualité

- `npm test` : 12 tests Vitest OK.
- `npm run build` : OK après libération du moteur Prisma (le `dev` 3001 le verrouillait sous Windows).

### Git

Non suivis : `.env`, `.env.local`, `apps/web/.env.local`, `apps/api/.env` (absent), `apps/api/.venv`, `node_modules`, `.next`.  
Suivis uniquement : `.env.example` et `apps/web/.env.example` (placeholders).  
Aucun secret réel trouvé dans l’index Git.

## FAIL

1. **`apps/web/.env.local` incomplet** — sans `DATABASE_URL` / JWT / MinIO, `npm run dev` standard ne peut pas servir l’API Prisma. Aujourd’hui le fichier force encore FastAPI via `NEXT_PUBLIC_API_URL`.
2. **Le frontend n’utilise pas `/api/v1` same-origin dans cet environnement.** Le code par défaut est correct (`NEXT_PUBLIC_API_URL ?? ""`), mais `.env.local` pointe vers `:8002`. Le `npm run build` a **inliné** `localhost:8002` dans les chunks client.
3. **Port 3000** occupé par une autre app : le `npm run dev` prévu (`--port 3000`) ne peut pas démarrer tel quel.
4. **Catalogue Europe vide** — 0 `product_zone_prices` pour `europe`. Le parcours boutique Europe est techniquement OK mais sans produits.
5. **Images catalogue** — 0 liaison `product_images` ; le bucket MinIO était vide avant l’upload de validation. La clé fichier déjà en base n’existe pas dans MinIO (404). Les fiches n’ont pas d’`image_url`.
6. **Promotions métier non exercées** — API liste OK, mais aucune règle promo réelle en base (`promotions` = 0, `promo_is_active` = 0).
7. **Rôle ADMIN** — prévu dans le RBAC, aucun utilisateur `ADMIN` à tester.
8. **Console navigateur non inspectée** — pas de session Chrome/Playwright. Hydration / CORS navigateur / appels accidentels `:8002` depuis l’UI réelle restent à confirmer à la main une fois l’env corrigé.

## WARNINGS

- `AUTH_SECRET` absent : le code retombe sur `JWT_SECRET`. À aligner explicitement avant prod.
- Un devis Europe crée une `inventory_positions` à 0 (`getOrCreatePosition`). Une position Europe qty=0 existe suite à ce test.
- Commande de validation `ON-CA-20260822-A3B0` laissée en `CANCELLED`. Un fichier PNG de test a été uploadé dans MinIO / table `files`.
- Noms d’index Prisma vs SQLAlchemy différents (couverture OK).
- `npm test` nécessitait des shims `node_modules/.bin` (install incomplète au départ). `npm install` dans `apps/web` les a restaurés. Premier `npm run build` en EPERM tant qu’un `next dev` tenait le query engine Windows.
- Stubs FastAPI historiques (`/customers`, `/cash-closures`, `/documents` vides) : non revalidés comme parcours métier.
- POS / ventes écriture : hors priorité de cette vague, non testés en écriture.
- Hashes Argon2 compatibles **aujourd’hui** ; tout futur changement de paramètres `@node-rs/argon2` casserait les comptes existants.

## FASTAPI FALLBACK

**Conservé. Ne pas supprimer.**

- Code : `apps/web/lib/apiUrl.ts` → `process.env.NEXT_PUBLIC_API_URL ?? ""`.
- FastAPI vivant : `/health` OK, boutique Cameroun 36 produits, login OWNER 200.
- L’environnement local utilise déjà ce fallback (`.env.local` → `:8002`).
- Test explicite « Next same-origin puis bascule `:8002` dans le navigateur » non rejoué : le port 3000 n’était pas l’app, et un second `next dev` avec `NEXT_PUBLIC_API_URL=http://localhost:8002` n’a pas été relancé après le build.

Pour forcer le fallback : `NEXT_PUBLIC_API_URL=http://localhost:8002` (dev). Pour Netlify / same-origin : laisser **vide**.

## NETLIFY RISKS

À régler **avant** tout déploiement Netlify. Pas de migration MinIO maintenant.

1. **MinIO n’existe pas sur Netlify.** Uploads et URLs `http://localhost:9000/{bucket}/{key}` sont incompatibles. Il faudra un stockage public HTTPS (plus tard), des `MINIO_*` joignables, ou des images déjà publiques.
2. **`DATABASE_URL` runtime** obligatoire (Route Handlers Node, pas Edge). Prisma n’a pas de `binaryTargets` serverless ; à ajouter pour l’image Netlify (souvent OpenSSL / rhel/debian).
3. **`@node-rs/argon2`** est natif : vérifier le binaire Linux Netlify, sinon login cassé.
4. **`NEXT_PUBLIC_API_URL`** : s’il reste à `:8002` ou à une URL FastAPI, le client Netlify n’appellera pas les Route Handlers. Doit être vide en prod same-origin.
5. **Secrets** : `DATABASE_URL`, `JWT_SECRET` / `AUTH_SECRET`, MinIO — uniquement dans les env Netlify, jamais dans Git.
6. **Pool / serverless** : connexions PostgreSQL courtes ; éviter un unique client trop agressif sans adaptateur pool si le projet passe en functions.
7. **Uploads 8 Mo** : limites body Netlify Functions.
8. **CORS** : same-origin sur Netlify évite le CORS ; le fallback FastAPI sur un autre host le réintroduit.

## NEXT STEP

1. Compléter `apps/web/.env.local` (sans commit) : `DATABASE_URL` Prisma (`postgresql://…`), JWT, MinIO. Laisser `NEXT_PUBLIC_API_URL` **vide** pour same-origin.
2. Libérer ou changer le port 3000, relancer `npm run dev` depuis `apps/web`.
3. Contrôle navigateur réel : login, boutique, fiche, panier, checkout, commandes, dashboard, stock, paramètres — console sans 404/500/CORS/Prisma/hydration ni appels `:8002`.
4. Ensuite seulement : rejouer le fallback `NEXT_PUBLIC_API_URL=http://localhost:8002`.
5. Données à traiter hors vague de code : prix Europe, liaisons images, objets MinIO manquants, rôle ADMIN si besoin.
6. **Ne pas** supprimer Python / Alembic / Docker / `apps/api`.
7. **Ne pas** lancer une nouvelle vague de migration tant que les points 1–3 ne sont pas PASS.

Résidu de cette validation (données, pas le schéma) : commande `ON-CA-20260822-A3B0` annulée, 1 position Europe à 0, 1 image PNG de test dans MinIO.
