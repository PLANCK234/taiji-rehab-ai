FROM node:26.13.0-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG API_INTERNAL_URL=http://backend:8000
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN pnpm build

FROM node:26.13.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
