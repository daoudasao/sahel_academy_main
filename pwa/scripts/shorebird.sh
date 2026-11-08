#!/usr/bin/env bash
# Shorebird (correctifs Dart sans passer par le Play Store). Voir SHOREBIRD.md.
#
#   ./scripts/shorebird.sh release   # NOUVELLE VERSION STORE (remplace build_play_store.sh)
#   ./scripts/shorebird.sh patch     # correctif envoyé aux utilisateurs de la dernière release
#   (ajouter --yes après release/patch pour ne pas demander confirmation)
#   ./scripts/shorebird.sh list      # releases connues de Shorebird
#
# Les --dart-define DOIVENT être identiques entre `release` et `patch`
# (ils sont définis une seule fois ici, ne pas les dupliquer ailleurs).
set -euo pipefail
cd "$(dirname "$0")/.."

# Valeurs publiques (pas des secrets) — les mêmes que build_play_store.sh.
API_URL=https://app.sahel-academy.com/api/v1
GOOGLE_WEB_CLIENT_ID=550445304636-tin864bc1lvssdie10umo0dn21tk4mc9.apps.googleusercontent.com
DEFINES=(--dart-define=API_URL="$API_URL" --dart-define=GOOGLE_WEB_CLIENT_ID="$GOOGLE_WEB_CLIENT_ID")

VERSION=$(grep -E '^version:' pubspec.yaml | awk '{print $2}')
cmd="${1:-}"

check_login() {
  command -v shorebird >/dev/null || { echo "❌ shorebird introuvable (https://docs.shorebird.dev)" >&2; exit 1; }
  [[ -f shorebird.yaml ]] || { echo "❌ shorebird.yaml absent (lancer « shorebird init »)" >&2; exit 1; }
}

case "$cmd" in
  release)
    check_login
    PROPS=android/key.properties
    if [[ ! -f $PROPS ]] || grep -q "=CHANGE_MOI" "$PROPS"; then
      echo "❌ $PROPS absent ou mot de passe non renseigné (CHANGE_MOI)." >&2
      exit 1
    fi
    echo "→ Release Shorebird de la version $VERSION"
    echo "  (le numéro après « + » doit être supérieur à celui déjà sur la Play Console)"
    ok=o; [[ ${2:-} == --yes ]] || read -r -p "Continuer ? [o/N] " ok
    [[ $ok == [oOyY]* ]] || exit 0
    shorebird release android --artifact aab "${DEFINES[@]}"
    echo
    echo "✅ À envoyer sur la Play Console :"
    echo "   $(pwd)/build/app/outputs/bundle/release/app-release.aab"
    ;;
  patch)
    check_login
    echo "→ Patch pour la release $VERSION (même version que dans pubspec.yaml)"
    echo "  ⚠ Ne change QUE le Dart. Nouveau plugin / permission / code natif = vraie version store."
    ok=o; [[ ${2:-} == --yes ]] || read -r -p "Publier le patch aux utilisateurs ? [o/N] " ok
    [[ $ok == [oOyY]* ]] || exit 0
    shorebird patch android --release-version="$VERSION" "${DEFINES[@]}"
    ;;
  list)
    check_login
    shorebird releases list
    ;;
  *)
    sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
