# Migrations Prisma — O'Naturelle

Le schéma `schema.prisma` reproduit les tables SQLAlchemy existantes. **Aucune table n’a été ajoutée ni supprimée.**

## Base déjà créée par Alembic (données à conserver)

Ne pas rejouer le SQL de création. Marquer la migration initiale comme déjà appliquée :

```bash
cd apps/web
npx prisma migrate resolve --applied 0001_baseline
npx prisma generate
```

## Base vide

```bash
cd apps/web
npx prisma migrate deploy
npx prisma generate
```

Tant que FastAPI tourne encore, Alembic reste la source de vérité DDL. Prisma sert de client TypeScript sur **la même** base PostgreSQL.
