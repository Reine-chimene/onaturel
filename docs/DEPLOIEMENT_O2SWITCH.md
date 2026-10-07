# Déploiement O'Naturelle sur O2Switch

Guide pour héberger l'application Next.js (site + admin + API) sur un hébergement O2Switch mutualisé.

## Prérequis

- Compte O2Switch avec accès **cPanel** et **SSH**
- Un **nom de domaine** pointant vers O2Switch
- Node.js **20** ou **22** (Setup Node.js App dans cPanel)
- Base **PostgreSQL** créée dans cPanel

## 1. Préparer le package (en local)

Depuis votre machine de développement :

```bash
cd apps/web
npm ci
npm run build:o2switch
```

Le dossier `dist/o2switch/` contient tout le nécessaire. Vous pouvez aussi créer une archive :

```bash
cd ../..
tar -czf onaturelle-o2switch.tar.gz -C dist o2switch
```

> **Conseil :** compilez en local plutôt que sur le serveur — la mémoire SSH O2Switch est limitée pour `next build`.

## 2. Créer la base PostgreSQL (cPanel)

1. cPanel → **PostgreSQL Databases**
2. Créez une base (ex. `user_onaturelle`)
3. Créez un utilisateur avec mot de passe fort
4. Associez l'utilisateur à la base (tous privilèges)
5. Notez l'URL de connexion, format :

```
postgresql://USER:PASSWORD@localhost:5432/NOM_BASE
```

## 3. Uploader les fichiers

1. Connectez-vous en **SFTP** ou **File Manager**
2. Créez un dossier, ex. `~/onaturelle`
3. Uploadez le contenu de `dist/o2switch/` dans ce dossier

Structure attendue :

```
onaturelle/
  server.js
  .next/
  public/
  prisma/
  storage/media/
  package.json
  node_modules/
```

## 4. Configurer l'application Node.js (cPanel)

1. cPanel → **Setup Node.js App** → **Create Application**
2. **Node.js version :** 20 ou 22
3. **Application mode :** Production
4. **Application root :** `onaturelle` (votre dossier)
5. **Application URL :** votre domaine ou sous-domaine
6. **Application startup file :** `server.js`
7. Cliquez **Create**

## 5. Variables d'environnement

Dans Setup Node.js App → **Environment variables**, ajoutez (ou copiez `.env.example` → `.env`) :

| Variable | Exemple |
|----------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://...` |
| `AUTH_SECRET` | chaîne aléatoire longue |
| `JWT_SECRET` | même valeur ou autre chaîne longue |
| `STORAGE_DRIVER` | `local` |
| `STORAGE_LOCAL_PATH` | `./storage/media` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.votre-domaine.fr` |
| `NEXT_PUBLIC_API_URL` | *(vide)* |

## 6. Initialiser la base (SSH)

```bash
source /home/USER/nodevenv/onaturelle/20/bin/activate
cd ~/onaturelle
npx prisma migrate deploy
npx prisma db seed
```

Identifiants admin créés par le seed :

- **Identifiant :** `onqture`
- **Mot de passe :** `naturel2`

Changez le mot de passe après la première connexion (Paramètres → Mot de passe).

## 7. Permissions

Le dossier `storage/media/` doit être **inscriptible** par l'application :

```bash
chmod -R 755 storage
```

## 8. SSL / HTTPS

1. cPanel → **SSL/TLS** ou **Let's Encrypt**
2. Activez le certificat pour votre domaine
3. Mettez à jour `NEXT_PUBLIC_SITE_URL` avec `https://`
4. Redémarrez l'application Node.js

## 9. Redémarrer l'application

Après chaque mise à jour ou changement de variables :

cPanel → Setup Node.js App → **Restart**

## Mises à jour

1. `npm run build:o2switch` en local
2. Uploadez les fichiers modifiés (`.next/`, `public/`, etc.)
3. SSH : `npx prisma migrate deploy` si de nouvelles migrations existent
4. Redémarrez l'app Node.js

## Dépannage

| Problème | Piste |
|----------|-------|
| Erreur 500 au démarrage | Vérifiez les logs dans Setup Node.js App |
| Images non affichées | `STORAGE_DRIVER=local`, dossier `storage/media` writable |
| Erreur Prisma | Vérifiez `DATABASE_URL`, lancez `prisma migrate deploy` |
| Build échoue en SSH | Compilez en local, uploadez le package pré-construit |
| Admin inaccessible | URL : `https://votre-domaine.fr/?manager=1` |

## Architecture sur O2Switch

```
Visiteur → Apache/Nginx (Passenger) → server.js → Next.js
                                              ├── Pages publiques
                                              ├── /dashboard (admin)
                                              ├── /api/v1/* (API)
                                              └── /api/v1/media/* (images locales)
                                              ↓
                                         PostgreSQL (cPanel)
                                         storage/media/ (disque)
```

MinIO n'est **pas** utilisé en production O2Switch — le stockage local remplace S3.
