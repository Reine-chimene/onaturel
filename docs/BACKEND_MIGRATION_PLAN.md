# O'Naturelle — Plan de migration FastAPI → Next.js / TypeScript

**Statut :** Phases 2–9 en cours — API Next.js créée, `apps/api` conservé.  
**Date :** 22 août 2026  
**Décision :** FastAPI reste en repli (`NEXT_PUBLIC_API_URL`). Par défaut le frontend appelle `/api/v1` same-origin.

---

## Synthèse après audit (à valider avant Phase 2)

### 1. Architecture actuelle

```
GitHub
↓
Docker Compose (local) / Render (API) + Netlify ou autre (web)
↓
apps/web  (Next.js 15, React 19, TypeScript)
  ├── pages publiques, dashboard propriétaire, panier localStorage
  └── HTTP client → NEXT_PUBLIC_API_URL (FastAPI :8002)
↓
apps/api  (Python 3.12, FastAPI, SQLAlchemy 2, Alembic, JWT, MinIO)
  ├── /health
  └── /api/v1/*
↓
PostgreSQL 16     MinIO (images catalogue)
```

Une enseigne unique, **pas de multi-tenant**. Deux zones commerciales seedées : `cameroun` (XAF, 0 décimales) et `europe` (EUR, 2 décimales). Aucune conversion automatique de devise.

### 2. Architecture cible

```
GitHub
↓
Netlify
↓
apps/web  (Next.js / TypeScript)
  ├── Interface publique
  ├── Dashboard
  ├── app/api/**/route.ts  (Route Handlers)
  ├── lib/services, lib/auth, lib/validations (Zod)
  ├── Prisma + PostgreSQL
  └── Stockage objets (S3-compatible — MinIO local, S3/Cloudinary en prod)
↓
PostgreSQL
```

`apps/api` reste en place jusqu’à parité fonctionnelle testée. Le frontend continue d’appeler FastAPI tant que l’équivalent Next.js n’est pas branché **endpoint par endpoint**.

### 3. Fonctionnalités à migrer

| Priorité | Domaine | Utilisé par le frontend actuel |
|---|---|---|
| P0 | Auth JWT (login / refresh / logout / me) | Oui — dashboard |
| P0 | Catalogue public + fiche produit | Oui — boutique |
| P0 | Checkout (config, quote, create, get order) | Oui — panier / commande |
| P0 | Commandes admin (liste, détail, statuts, paiements, frais) | Oui |
| P0 | Produits / catégories / images / fichiers | Oui |
| P1 | Packs, promotions, stock (adjust + threshold) | Oui |
| P1 | Zones (modes de réception) | Oui |
| P1 | Dashboard overview + rapports | Oui |
| P1 | Paramètres (`default_low_stock_threshold`) | Oui |
| P2 | Utilisateurs, audit, positions/mouvements/transferts | API existe, **pas d’UI** |
| P2 | Devises, PATCH zone, GET zone by id | API existe, **peu ou pas d’UI** |
| Hors scope immédiat | POS / ventes boutique / clôture caisse / documents / clients | Modèles + stubs vides, **pas d’écriture** |

### 4. Ordre de migration proposé

1. Prisma = schéma actuel (introspecter PostgreSQL, ne pas inventer de tables).  
2. Auth + RBAC (comportement JWT actuel, secrets serveur).  
3. Public shop / product / checkout (cœur boutique).  
4. Commandes admin (transitions + stock).  
5. Catalogue admin (catégories, produits, fichiers).  
6. Packs + promotions.  
7. Inventaire (adjust / threshold, puis transfers).  
8. Zones + settings.  
9. Dashboard + reports.  
10. Users + audit (API, UI plus tard si besoin).  
11. Brancher le frontend (`/api/v1/...` same-origin).  
12. Tests TypeScript + `npm run build`.  
13. Adapter Docker / Netlify.  
14. **Seulement alors** retirer FastAPI.

### 5. Risques (voir §10)

Auth Argon2, stock transactionnel, MinIO vs Netlify, Prisma vs Alembic `create_all`, pas de pooling serverless, endpoints stubs vs tables réelles, double API pendant la transition.

### 6. Fichiers qui seront créés (après validation)

- `apps/web/prisma/schema.prisma` + migrations Prisma  
- `apps/web/lib/db/` (client Prisma)  
- `apps/web/lib/auth/`  
- `apps/web/lib/services/*.service.ts`  
- `apps/web/lib/validations/*.ts` (Zod)  
- `apps/web/app/api/**/route.ts`  
- `apps/web/.env.example`  
- tests TypeScript (Vitest ou équivalent)  
- éventuellement `netlify.toml`  
- scripts de seed TS (remplacement progressif de `apps/api/app/seed.py`)

### 7. Fichiers qui seront modifiés (après validation)

- `apps/web/lib/apiUrl.ts`, `lib/admin/api.ts`, `lib/catalog.ts`, `lib/checkout.ts`  
- pages dashboard et composants qui appellent FastAPI  
- `apps/web/package.json` (prisma, zod, bcrypt/argon2, jose, etc.)  
- `docker-compose.yml` (à terme : web + postgres, plus api Python)  
- `.env.example` racine  
- `.gitignore` (déjà ignore `.env` ; vérifier `apps/web/.env*`)

### 8. Fichiers qui pourront être supprimés **à la fin** (pas maintenant)

- `apps/api/` entier (FastAPI, SQLAlchemy, Alembic, tests pytest, Docker Python)  
- service `api` dans `docker-compose.yml`  
- variables `NEXT_PUBLIC_API_URL` une fois same-origin  
- éventuellement MinIO **si** un stockage S3-compatible unique est en place

**Règle absolue confirmée :** ne pas supprimer `apps/api`, SQLAlchemy, Alembic ni les modèles Python maintenant.

---

## 1. Fonctionnalités existantes du backend

### 1.1 Cœur métier

- **Une enseigne**, zones commerciales configurables (Cameroun / Europe).  
- **Prix et stocks par zone** — jamais de copie ni de conversion XAF ↔ EUR.  
- **Montants entiers** en unités mineures (`price_amount`, etc.).  
- **Catalogue** : catégories (arbre 1 niveau utilisé), produits, images, packs (bundles), promotions zonées.  
- **Inventaire** : positions par (produit, zone), mouvements, transferts, seuil bas.  
- **Commandes en ligne** : devis serveur, création publique, confirmation qui décrémente le stock, annulation qui le restitue.  
- **Paiements commande** : produits (`PENDING` / `PAID`) et réception (`NOT_APPLICABLE` / `DUE_ON_FULFILLMENT` / `PAID`) séparés.  
- **Reporting** : CA par zone + devise + canal, sans total mixte.  
- **Auth** : JWT access + refresh hashé en base, rôles OWNER / ADMIN / SELLER, permissions RBAC, scope vendeuse = zone assignée.  
- **Audit** : journal d’actions.  
- **Fichiers** : upload JPEG/PNG/WebP ≤ 8 Mo vers MinIO (`products/…`), lecture anonyme de ce préfixe.  
- **Seed** : devises, zones, modes de réception, comptes OWNER/SELLER, catégories, catalogue.

### 1.2 Présent en modèles mais non implémenté en écriture API

Tables `sales`, `sale_items`, `payments`, `documents`, `cash_closures`, `customers` (customers est écrit au checkout).  
Endpoints GET `/customers`, `/cash-closures`, `/documents` **renvoient `[]`**.  
Le POS (`PosShell`) n’est qu’un mock du design system. **Aucune API de vente boutique.**

### 1.3 Couches techniques

| Couche | Réalité |
|---|---|
| Routes | FastAPI routers dans `app/api/` |
| Schemas | Pydantic **inline dans les fichiers de routes** (pas de dossier `schemas/`) |
| Services | `app/services/` (checkout, inventory, orders, pricing, promotions, reporting, catalog_admin, audit) |
| Repositories | **Absents** — SQLAlchemy directement dans routes/services |
| Middleware | CORS uniquement |
| Erreurs | `HTTPException` + messages FR |
| Migrations | Alembic `0001_initial` = `Base.metadata.create_all` (pas de SQL explicite) |
| Tests | 4 fichiers pytest, **sans HTTP** (règles pures) |
| Docker | `apps/api/Dockerfile` : alembic + seed + uvicorn |

---

## 2. Endpoints existants

Préfixe : **`/api/v1`**. Health : `GET /health`.

### Auth — `/auth`

| Méthode | Chemin | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | email lowercased ; vendeuse sans zone → 403 |
| POST | `/auth/refresh` | public | rotation : ancien refresh révoqué |
| POST | `/auth/logout` | Bearer | révoque le refresh de l’utilisateur |
| GET | `/auth/me` | Bearer | profil |

Tokens : HS256, access `typ=access` (30 min), refresh `typ=refresh` (14 j). Refresh stocké en SHA-256.

### Public — `/public`

| Méthode | Chemin | Auth |
|---|---|---|
| GET | `/public/shop?zone&category?` | public |
| GET | `/public/products/{slug}?zone` | public |
| GET | `/public/checkout?zone` | public |
| POST | `/public/cart/quote` | public |
| POST | `/public/orders` | public |
| GET | `/public/orders/{number}` | public |

### Zones / devises

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/zones` | public (zones actives) |
| GET | `/zones/all` | `zones:write` |
| GET | `/zones/{zone_id}` | public |
| PATCH | `/zones/{zone_id}` | `zones:write` |
| PATCH | `/zones/{zone_id}/fulfillment-modes/{mode}` | `zones:write` |
| GET | `/currencies` | public |

### Users

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/users` | `users:read` |
| POST | `/users` | `users:write` — vendeuse obligatoire avec zone |
| PATCH | `/users/{user_id}/zone` | `users:write` — vendeuses seulement |

### Catalogue

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/categories` | `catalog:read` |
| POST | `/categories` | `catalog:write` |
| PATCH | `/categories/{id}` | `catalog:write` |
| GET | `/products` | `catalog:read` — détail multi-zones si OWNER sans `zone_id` |
| POST | `/products` | `catalog:write` |
| GET | `/products/{id}` | `catalog:read` |
| PATCH | `/products/{id}` | `catalog:write` — archive ⇒ `is_active=false` |
| POST | `/products/{id}/images?file_id&as_primary` | `catalog:write` |
| PUT | `/products/{id}/images` | `catalog:write` (ordre / primaire) |
| DELETE | `/products/{id}/images/{image_id}` | `catalog:write` |

### Packs / promotions

| Méthode | Chemin | Permission |
|---|---|---|
| GET/POST | `/packs` | read / write catalog |
| GET/PATCH | `/packs/{id}` | idem |
| GET | `/promotions` | `catalog:read` |
| POST | `/promotions` | `pricing:write` |
| PATCH | `/promotions/{id}` | `pricing:write` |

### Inventaire

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/inventory/positions` | `inventory:read` |
| GET | `/inventory/movements` | `inventory:read` |
| POST | `/inventory/transfers` | `inventory:write` |
| POST | `/inventory/adjust` | `inventory:write` (qty absolue) |
| PATCH | `/inventory/threshold` | `inventory:write` |

### Commandes admin

| Méthode | Chemin | Auth |
|---|---|---|
| GET | `/orders` | `orders:read` — vendeuse filtrée à sa zone |
| GET | `/orders/{id}` | `orders:read` + scope zone |
| POST | `/orders/{id}/status` | **OWNER/ADMIN** |
| PATCH | `/orders/{id}/products-payment` | OWNER/ADMIN |
| PATCH | `/orders/{id}/fulfillment-payment` | OWNER/ADMIN |
| PATCH | `/orders/{id}/fulfillment-fee` | OWNER/ADMIN |

### Dashboard / reports / admin

| Méthode | Chemin | Permission |
|---|---|---|
| GET | `/dashboard/overview` | `dashboard:access` |
| GET | `/reports/revenue` | `reports:sensitive` |
| GET | `/reports/top-products` | `reports:sensitive` |
| GET | `/reports/series` | `reports:sensitive` |
| GET | `/reports/sales-lines` | `reports:sensitive` |
| GET | `/audit` | `audit:read` |
| GET/PATCH | `/settings` | dashboard / `settings:write` — clé autorisée : `default_low_stock_threshold` |
| GET | `/customers` | stub `[]` |
| GET | `/cash-closures` | stub `[]` |
| GET | `/documents` | stub `[]` |
| POST | `/files` | `catalog:write` multipart |

**Total : ~55 endpoints** (+ `/health`).

---

## 3. Modèles de données

Toutes les PK (sauf `settings.key`) sont des **UUID**. Mixins : `created_at` / `updated_at` timezone.

| Table | Rôle |
|---|---|
| `currencies` | code unique, symbol, `minor_units` |
| `commercial_zones` | slug unique, `currency_id`, `is_active`, `sort_order` |
| `zone_fulfillment_modes` | unique `(zone_id, mode)` ; `fee_policy`, `default_fee_amount` |
| `users` | email unique, hash mot de passe, rôle, `assigned_zone_id`, `is_active` |
| `refresh_tokens` | `token_hash` unique, expiration, `revoked_at` |
| `audit_logs` | actor, action, entity, payload JSONB |
| `settings` | PK `key`, value JSONB |
| `files` | `storage_key` unique, mime, size, variants JSONB |
| `categories` | slug unique, `parent_id`, `image_file_id`, visibilité |
| `products` | slug unique, sku unique nullable, flags new/featured/active/archived |
| `product_images` | `product_id`, `file_id`, ordre, primaire |
| `product_zone_prices` | unique `(product_id, zone_id)` ; prix, promo, dispo |
| `promotions` | produit **ou** pack, zone, dates, `is_active` |
| `bundles` | packs, slug unique |
| `bundle_items` | unique `(bundle_id, product_id)`, quantity |
| `bundle_zone_prices` | unique `(bundle_id, zone_id)` |
| `inventory_positions` | unique `(product_id, zone_id)` ; qty, seuil |
| `inventory_movements` | delta, reason, références, transfer_group |
| `customers` | phone unique, `last_zone_id` |
| `orders` | number unique, snapshots client, montants, statuts paiement |
| `order_items` | snapshot nom/prix, product **ou** bundle |
| `sales` / `sale_items` | POS (non branché) |
| `payments` | kind order/sale |
| `documents` | RECEIPT / INVOICE |
| `cash_closures` | unique `(seller_id, zone_id, business_date)` |

Enums (stockés en `String`) : voir `app/core/enums.py` — `UserRole`, `FulfillmentMode`, `FeePolicy`, `OrderStatus`, paiements, `MovementReason`, `DocumentKind`, `SaleStatus`, `SalesChannel`, `StockStatus`.

---

## 4. Relations entre les modèles

```
Currency 1──* CommercialZone 1──* ZoneFulfillmentMode
                │
                ├──* User (assigned_zone, SELLER)
                ├──* ProductZonePrice / BundleZonePrice / InventoryPosition
                ├──* Order / Sale / Document / CashClosure / Promotion
                └──  Customer.last_zone

Category 1──* Product (parent Category optionnel)
Product 1──* ProductImage → FileAsset
Product 1──* ProductZonePrice
Product 1──* InventoryPosition / InventoryMovement
Bundle 1──* BundleItem → Product
Bundle 1──* BundleZonePrice
Promotion → Product XOR Bundle + Zone

Order → Zone, Currency, Customer?, User? (created_by)
Order 1──* OrderItem → Product? / Bundle?
Confirm/cancel → InventoryMovement (ORDER_CONFIRMED / ORDER_CANCELLED)
```

Règles FK notables : `ondelete RESTRICT` sur zones/devises liées aux commandes ; `CASCADE` images/prix ; `SET NULL` customer sur commande.

---

## 5. Règles métier (à conserver)

### Argent

- Interdit de convertir XAF ↔ EUR (`convert()` → 400).  
- Interdit de sommer deux devises (`assert_same_currency`, `assert_no_mixed_total`).  
- Prix de vente = promo si `promo_is_active` et `promo_price_amount` non null, sinon `price_amount`.

### Stock

- Qty ne peut pas devenir négative (409 « Stock insuffisant »).  
- `OUT_OF_STOCK` si qty ≤ 0 ; `LOW_STOCK` si qty ≤ seuil (défaut 5) ; sinon `IN_STOCK`.  
- Transfert : même produit, zones distinctes, qty > 0, couple TRANSFER_OUT / TRANSFER_IN.  
- Pack buildable = min(floor(stock_composant / qty_composant)) ; 0 si un composant manque.

### Commande publique

- Backend = source de vérité (prix, stock, frais).  
- Ligne = **soit** `product_id` **soit** `bundle_id`.  
- Téléphone : 8–15 chiffres ; nom ≥ 2 caractères.  
- Livraison → quartier obligatoire ; expédition → ville obligatoire ; retrait → pas d’adresse.  
- Frais à la création : **jamais** `PAID`. Pickup → 0 / `NOT_APPLICABLE`. `NONE` → 0 / NA. `DEFAULT` + montant → montant / `DUE_ON_FULFILLMENT`. `SET_AT_PROCESSING` → 0 / due, frais inconnus.  
- Numéro : `ON-{2 lettres zone}-{YYYYMMDD}-{4 hex}`.  
- Statut initial `NEW` ; stock **non** décrémenté à la création.  
- Customer upsert par téléphone.

### Workflow commande admin

```
NEW → CONFIRMED | CANCELLED
CONFIRMED → PREPARING | CANCELLED
PREPARING → READY | CANCELLED
READY → DELIVERED | CANCELLED
DELIVERED / CANCELLED → (fin)
```

- `CONFIRMED` : décrémente stock (produits et composants de packs) une fois (`stock_decremented_at`).  
- `CANCELLED` : restitue si déjà décrémenté.  
- CA en ligne : statuts CONFIRMED, PREPARING, READY, DELIVERED uniquement. NEW et CANCELLED exclus.  
- Frais de réception dans le CA seulement si `fulfillment_payment_status = PAID`.

### Promotions

- Un produit **ou** un pack, pas les deux.  
- Prix promo > 0.  
- Live = `is_active` et dans la fenêtre de dates.  
- Appliquée **uniquement** sur le prix de la zone cible (le prix de zone doit exister).

### Auth / RBAC

- OWNER et ADMIN partagent les permissions « propriétaire ».  
- SELLER : lecture catalogue/stock/commandes, POS/sales (prévu), **pas** dashboard, reports sensibles, pricing, inventory write, zones write, users, settings, audit.  
- SELLER verrouillée sur `assigned_zone_id`.  
- Dashboard web actuel : **refuse SELLER** même si le token est valide (`isOwnerRole`).

### Fichiers

- MIME jpeg/png/webp, max 8 Mo, clé `products/{uuid}.{ext}`.

---

## 6. Dépendances frontend → backend

Point unique d’origine : `NEXT_PUBLIC_API_URL` (`lib/apiUrl.ts`, défaut `http://localhost:8002`).

### Client public

| Module | Endpoints |
|---|---|
| `lib/catalog.ts` | `GET /api/v1/public/shop`, `GET /api/v1/public/products/{slug}` |
| `lib/checkout.ts` | checkout, cart/quote, POST orders, GET order by number |

Panier et zone : **localStorage** (`on-cart-{zone}`, `on-zone`) + cookie `on-zone`. Pas d’auth publique.

### Client admin (`lib/admin/api.ts`)

Bearer + refresh automatique sur 401. Tokens dans localStorage (`on-admin-access/refresh/role`).

| Page / composant | Endpoints |
|---|---|
| login | POST `/auth/login` |
| AdminShell | GET `/auth/me`, POST `/auth/logout` |
| dashboard home | GET `/dashboard/overview` |
| commandes | GET `/orders`, GET `/orders/{id}`, status/payments/fee, GET `/zones/all` |
| produits / ProductEditor | CRUD products, POST `/files`, images |
| catégories | GET/POST/PATCH `/categories` |
| packs | GET/POST/PATCH `/packs`, products, zones |
| promotions | GET/POST/PATCH `/promotions` |
| stock | GET `/products`, POST `/inventory/adjust`, PATCH `/inventory/threshold` |
| zones | GET `/zones/all`, PATCH fulfillment-modes |
| ventes | reports revenue/series/top-products/sales-lines |
| paramètres | GET/PATCH `/settings` |

**Aucun appel frontend** vers : `/users`, `/audit`, `/currencies`, `/inventory/positions`, `/inventory/movements`, `/inventory/transfers`, `/customers`, `/cash-closures`, `/documents`.

Il n’existe **pas** de `apps/web/app/api/` aujourd’hui.

---

## 7. Fonctionnalités déjà présentes dans Next.js

- Site public : accueil, boutique, fiche produit, histoire, panier, checkout, confirmation, SEO (`sitemap.ts`, `robots.ts`).  
- Dashboard propriétaire (pages listées ci-dessus) + login.  
- Design system (`/design-system`) — mock POS inclus, non branché.  
- Types miroir (`lib/admin/types.ts`, `lib/catalog.ts`, `lib/checkout.ts`).  
- Formatage argent (`lib/money.ts`), statuts, univers visuels, WhatsApp commande (`lib/orderWhatsApp.ts`).  
- Session publique zone/panier.  
- Gate dashboard côté **client** (pas de middleware Next.js).

Next.js n’a **pas** : Prisma, Zod, Route Handlers, hashing, JWT serveur, accès PostgreSQL.

---

## 8. Fonctionnalités manquantes (côté Next.js cible)

Tout le backend listé en §1–2. En plus, pour Netlify :

- Couche DB Prisma + pooling (serverless).  
- Stockage fichiers compatible prod (S3 / Cloudinary / équivalent — MinIO local conservable en Docker).  
- Seed TypeScript.  
- Tests TS des règles métier.  
- `.env.example` dans `apps/web`.  
- Auth adaptée (conserver JWT actuel **ou** cookies httpOnly — un seul système).  
- `GET /health` éventuel pour le monitoring.

**Non manquant pour la parité actuelle** (volontairement plus tard) : POS réel, clôture caisse, documents, UI users/audit/transferts.

---

## 9. Plan de migration endpoint par endpoint

Convention recommandée **pendant** la coexistence : garder le chemin **`/api/v1/...`** dans Next.js pour ne pas casser le frontend. Les handlers vivent sous `app/api/v1/.../route.ts`. Optionnel ensuite : alias sans `v1`.

Chaque ligne : créer handler → Zod → service → tester → pointer le frontend → marquer FastAPI obsolète.

### Vague A — fondations (pas d’endpoint public encore)

1. Introspecter PostgreSQL → `schema.prisma` fidèle.  
2. `lib/db` + `DATABASE_URL`.  
3. Reproduire enums, money, slugify, RBAC.  
4. Auth service (verify Argon2 **compatible pwdlib**, JWT HS256 mêmes claims).

### Vague B — public (boutique)

| FastAPI | Next.js |
|---|---|
| GET `/api/v1/public/shop` | `app/api/v1/public/shop/route.ts` |
| GET `/api/v1/public/products/{slug}` | `app/api/v1/public/products/[slug]/route.ts` |
| GET `/api/v1/public/checkout` | `app/api/v1/public/checkout/route.ts` |
| POST `/api/v1/public/cart/quote` | `app/api/v1/public/cart/quote/route.ts` |
| POST `/api/v1/public/orders` | `app/api/v1/public/orders/route.ts` |
| GET `/api/v1/public/orders/{number}` | `app/api/v1/public/orders/[number]/route.ts` |
| GET `/health` | `app/api/health/route.ts` |

Puis `lib/catalog.ts` / `lib/checkout.ts` → fetch `/api/v1/...` (same origin).

### Vague C — auth dashboard

| FastAPI | Next.js |
|---|---|
| POST `/auth/login` | `app/api/v1/auth/login/route.ts` |
| POST `/auth/refresh` | `.../refresh/route.ts` |
| POST `/auth/logout` | `.../logout/route.ts` |
| GET `/auth/me` | `.../me/route.ts` |

Puis `lib/admin/api.ts` : `API_BASE = ""` (same origin).

### Vague D — commandes + catalogue admin

Miroir des chemins FastAPI : `/orders`, `/categories`, `/products`, `/files`, images.

### Vague E — packs, promotions, inventory, zones, settings

### Vague F — dashboard + reports

### Vague G — users, audit, currencies, stubs commerce

Les stubs peuvent rester `[]` **ou** être omis tant que l’UI ne les appelle pas — mais les **tables** restent dans Prisma.

---

## 10. Risques de migration

| Risque | Impact | Mitigation |
|---|---|---|
| **Argon2 pwdlib ≠ bcrypt Node** | Login cassé | Vérifier le hash actuel ; utiliser une lib Argon2 compatible (`@node-rs/argon2` ou équivalent) ; ne pas rehasher en masse sans plan |
| **Alembic `create_all`** | Prisma schema ≠ DB réelle | `prisma db pull` sur la base existante, pas une réécriture à la main |
| **Transactions stock/commande** | Survente | `$transaction` isolée ; mêmes 409 |
| **MinIO sur Netlify** | Images cassées | Abstraction `storage` ; S3/Cloudinary en prod ; MinIO en local |
| **Upload 8 Mo vs limite fonctions Netlify** (~6 Mo body) | Upload admin échoue | Upload direct signé vers S3, pas via la function |
| **Prisma serverless** | connexions PG saturées | PgBouncer / Prisma Accelerate / Neon pooled URL |
| **JWT dans localStorage** | XSS | Conserver le comportement pour parité, puis cookies httpOnly **après** parité |
| **Double API** | divergences | Feature flags / `NEXT_PUBLIC_API_URL` vide = same-origin ; bascule par domaine |
| **Route `GET /zones/{id}` vs `/zones/all`** | collision Next.js | Fichiers séparés `all/route.ts` **avant** `[zoneId]` |
| **IDs UUID** | parsing | Zod `uuid` partout |
| **Pas de tests HTTP FastAPI** | régressions silencieuses | Porter pytest métier + ajouter tests d’intégration TS |
| **Seed catalogue Python** | données manquantes en new env | Script seed TS **après** Prisma, sans écraser la prod |
| **CORS** | inutile en same-origin | Ne plus exposer l’API Python publiquement en prod finale |
| **Netlify Next 15** | runtime | Valider `@netlify/plugin-nextjs` ; éviter Node APIs incompatibles edge ; handlers en Node runtime |
| **Suppression trop tôt de `apps/api`** | perte métier | Parité + tests + bascule prod d’abord |

---

## Variables d’environnement actuelles (référence)

Racine `.env.example` : `DATABASE_URL` (psycopg), JWT, MinIO, OWNER/SELLER seed, CORS, ports, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`.

Cible `apps/web/.env.example` (placeholders seulement) :

```
DATABASE_URL=
AUTH_SECRET=
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=14
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=
```

Ne jamais y copier de secrets réels. `.gitignore` ignore déjà `.env`, `.env.local`, `.env.*.local`.

---

## Tests backend à porter (comportement)

- `test_business_rules.py` : stock status, no conversion, RBAC, CA.  
- `test_checkout_rules.py` : pack qty, téléphone, adresse, frais, CA NEW/CANCELLED.  
- `test_dashboard_owner.py` : permissions owner, transitions, promo live.  
- `test_zone_scope.py` : vendeuse vs owner.

---

## Docker / Netlify (aperçu, pas d’exécution maintenant)

- **Pendant** : composer inchangé (postgres + minio + api + web).  
- **Après parité** : web build Next + postgres ; MinIO ou S3.  
- **Netlify** : `npm run build` dans `apps/web` ; plugin Next ; `DATABASE_URL` pooled ; pas de MinIO intégré.

---

## Critère de fin (rappel Phase 14)

- [ ] Parité FastAPI nécessaire  
- [ ] Frontend sans `apps/api`  
- [ ] Prisma + PostgreSQL  
- [ ] Migrations documentées  
- [ ] Auth + permissions + validations  
- [ ] Données existantes préservées  
- [ ] Tests importants  
- [ ] `npm run build`  
- [ ] Déployable Netlify  
- [ ] Aucun secret dans Git  
- [ ] `apps/api` supprimable sans perte  

---

## Prochaine étape

**Attendre validation** de ce plan (architecture, ordre, stockage fichiers, conservation du préfixe `/api/v1`, JWT localStorage vs cookies).

Ensuite seulement : Phase 2–3 (Prisma + structure `lib/`), **sans** supprimer FastAPI.
