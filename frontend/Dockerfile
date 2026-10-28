# Dockerfile pour le frontend Next.js 15
FROM node:20-alpine AS base

WORKDIR /app

# Dépendances
COPY package.json package-lock.json ./
RUN npm ci

# Copie du code source
COPY . .

# Construction de l'application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Étape d'exécution légère
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public 2>/dev/null || true

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
