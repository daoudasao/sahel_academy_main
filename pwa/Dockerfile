# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# PWA Sahel Academy (Flutter Web) — build puis service statique via nginx.
# (La version mobile Android/iOS se build hors Docker.)
# ─────────────────────────────────────────────────────────────

# ─── Étape 1 : build Flutter Web ───
# Version de l'image Flutter, surchargeable :
#   docker build --build-arg FLUTTER_VERSION=3.44.4 ...
# `stable` par défaut ; épingle ta version exacte quand elle est publiée sur
# ghcr.io/cirruslabs/flutter (ex. 3.27.0, 3.24.5…).
ARG FLUTTER_VERSION=stable
FROM ghcr.io/cirruslabs/flutter:${FLUTTER_VERSION} AS builder
WORKDIR /app

# Le SDK Flutter appartient à un autre utilisateur : autoriser git ici.
RUN git config --global --add safe.directory /sdks/flutter || true
RUN flutter config --no-analytics --enable-web

# Cache des dépendances : on récupère pubspec avant le reste du code.
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .

# Paramètres injectés au build (mêmes --dart-define qu'en production).
ARG API_URL=https://sahel-academy-backend.onrender.com/api/v1
ARG WEB_PUSH_VAPID_KEY=
ARG GOOGLE_WEB_CLIENT_ID=

RUN flutter build web --release \
      --dart-define=API_URL=${API_URL} \
      --dart-define=WEB_PUSH_VAPID_KEY=${WEB_PUSH_VAPID_KEY} \
      --dart-define=GOOGLE_WEB_CLIENT_ID=${GOOGLE_WEB_CLIENT_ID}

# ─── Étape 2 : service statique ───
FROM nginx:1.27-alpine AS runner
RUN rm -rf /usr/share/nginx/html/* && rm -f /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
