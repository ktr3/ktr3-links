# Ktr3 Links v2

Web oficial de Ktr3 construida con Next.js, PostgreSQL y Docker.

## Desarrollo

```bash
cp .env.example .env
npm install
npm run db:start
set -a
. ./.env
set +a
npm run db:migrate
npm run dev
```

La guía completa del catálogo y panel de recursos está en [`docs/resources-local-development.md`](docs/resources-local-development.md).

## Comprobaciones

```bash
npm test
npm run build
npm audit --omit=dev
```
