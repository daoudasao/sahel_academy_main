#!/bin/sh
set -e

echo "⏳ Application des migrations de base de données..."

MAX_RETRIES=30
RETRY_COUNT=0

# `migrate deploy` n'applique que les migrations versionnées de prisma/migrations :
# aucune modification implicite ni destructive, contrairement à `db push`.
# Les tentatives répétées couvrent le cas d'une base pas encore joignable.
until ./node_modules/.bin/prisma migrate deploy; do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Migrations impossibles après $MAX_RETRIES tentatives."
    exit 1
  fi
  echo "⌛ Base de données indisponible... Nouvelle tentative dans 2s ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "✅ Base de données à jour !"
echo "🚀 Démarrage du serveur NestJS..."

exec node dist/main.js
