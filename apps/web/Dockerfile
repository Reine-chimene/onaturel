FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json /app/package.json
COPY prisma /app/prisma
RUN npm install
COPY . /app
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./server.js

RUN mkdir -p storage/media/products storage/media/cms

EXPOSE 3000
CMD ["node", "server.js"]
