# Déploiement O'Naturelle sur Netlify

À utiliser **en attendant le domaine et l’hébergement O2Switch**. Le site, la boutique, l’admin Manager et l’API tournent dans une seule app Next.js sur Netlify.

## 1. Prérequis

| Élément | Solution recommandée |
|--------|----------------------|
| Code | Dépôt GitHub `Reine-chimene/onaturel`, branche **`o2switch-production`** |
| PostgreSQL | [Neon](https://neon.tech) (gratuit) ou Supabase |
| Images (upload admin) | Stockage **S3 compatible** (ex. [Cloudflare R2](https://developers.cloudflare.com/r2/)) — pas de disque local sur Netlify |
| Compte | [Netlify](https://app.netlify.com) |

## 2. Base de données (Neon)

1. Créez un projet PostgreSQL sur Neon.
2. Copiez deux URLs :
   - **Pooled** → `DATABASE_URL` (runtime Netlify)
   - **Direct** → `DIRECT_DATABASE_URL` (migrations Prisma)
3. Sur votre PC, depuis `apps/web` :

```bash
export DATABASE_URL="postgresql://..."          # direct ou pooled pour migrate
export DIRECT_DATABASE_URL="postgresql://..." # connexion directe Neon
npx prisma migrate deploy
npx prisma db seed
```

Identifiants admin après seed : `onqture` / `naturel2`.

## 3. Lier Netlify au dépôt

1. Netlify → **Add new site** → **Import an existing project** → GitHub.
2. Choisir le dépôt **onaturel**.
3. Branche : **`o2switch-production`** (ou `main` si vous l’avez mise à jour).
4. Netlify détecte `netlify.toml` à la racine :
   - **Base directory** : `apps/web` (via `base` dans le toml)
   - **Build command** : `npm run build`
   - **Plugin** : `@netlify/plugin-nextjs`

## 4. Variables d’environnement Netlify

Site → **Site configuration** → **Environment variables**.

Modèle complet : `apps/web/.env.netlify.example`.

| Variable | Obligatoire | Note |
|----------|-------------|------|
| `DATABASE_URL` | Oui | URL pooler Neon |
| `DIRECT_DATABASE_URL` | Oui | URL directe (Prisma) |
| `AUTH_SECRET` / `JWT_SECRET` | Oui | Chaînes longues aléatoires |
| `NEXT_PUBLIC_SITE_URL` | Oui | `https://xxx.netlify.app` puis votre domaine custom |
| `NEXT_PUBLIC_API_URL` | Non | **Vide** (same-origin) |
| `MINIO_*` + `STORAGE_DRIVER=minio` | Pour les uploads | R2 ou autre S3 HTTPS public |

Sans stockage S3 : le site et le catalogue **seed** fonctionnent ; les **nouveaux uploads** d’images admin échoueront.

## 5. Premier déploiement

1. **Deploy site**.
2. Ouvrez `https://votre-site.netlify.app`.
3. Manager : `https://votre-site.netlify.app/?manager=1`.

## 6. Domaine temporaire Netlify

Plus tard, quand vous achetez le domaine :

- Netlify → **Domain management** → ajouter le domaine (DNS).
- Mettre à jour `NEXT_PUBLIC_SITE_URL` et redéployer.

Quand vous passerez à **O2Switch**, suivez [`DEPLOIEMENT_O2SWITCH.md`](./DEPLOIEMENT_O2SWITCH.md) (stockage local, PostgreSQL cPanel, etc.).

## 7. Limites Netlify

- **Uploads** : corps des requêtes limité (~6 Mo) ; images admin max 8 Mo en code — privilégier des fichiers &lt; 5 Mo.
- **Pas de MinIO local** : `STORAGE_DRIVER=local` est ignoré si `NETLIFY=true`.
- **Connexions DB** : utilisez le **pooler** Neon en `DATABASE_URL`.

## 8. Dépannage

| Symptôme | Piste |
|----------|--------|
| Build Prisma / OpenSSL | `binaryTargets` inclut `rhel-openssl-3.0.x` |
| 500 sur `/api/*` | Vérifier `DATABASE_URL`, logs Netlify Functions |
| Login impossible | `AUTH_SECRET`, binaire `@node-rs/argon2` (runtime Node 20) |
| Images cassées | `MINIO_PUBLIC_ENDPOINT` accessible en HTTPS |
| Appels vers `:8002` | `NEXT_PUBLIC_API_URL` doit être **vide** |

## Architecture

```
Visiteur → Netlify CDN → Next.js (plugin)
                              ├── Pages boutique / CMS
                              ├── /dashboard (Manager)
                              └── /api/v1/*
                                    ↓
                              Neon PostgreSQL
                              S3 / R2 (médias)
```
