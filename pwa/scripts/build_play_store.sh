#!/usr/bin/env bash
# Fabrique le fichier .aab à envoyer sur la Play Console.
#
#   ./scripts/build_play_store.sh
#
# Avant chaque nouvelle version : augmenter `version:` dans pubspec.yaml
# (le nombre après le « + » doit toujours monter, Google refuse sinon).
set -euo pipefail
cd "$(dirname "$0")/.."

PROPS=android/key.properties
if [[ ! -f $PROPS ]] || grep -q "=CHANGE_MOI" "$PROPS"; then
  echo "❌ $PROPS absent ou mot de passe non renseigné (CHANGE_MOI)." >&2
  exit 1
fi

# Valeurs publiques (pas des secrets) : URL de l'API et client OAuth « Web »,
# le même que GOOGLE_CLIENT_ID côté backend.
API_URL=https://app.sahel-academy.com/api/v1
GOOGLE_WEB_CLIENT_ID=550445304636-tin864bc1lvssdie10umo0dn21tk4mc9.apps.googleusercontent.com

flutter build appbundle --release \
  --dart-define=API_URL="$API_URL" \
  --dart-define=GOOGLE_WEB_CLIENT_ID="$GOOGLE_WEB_CLIENT_ID"

echo
echo "✅ Fichier à envoyer sur la Play Console :"
echo "   $(pwd)/build/app/outputs/bundle/release/app-release.aab"
