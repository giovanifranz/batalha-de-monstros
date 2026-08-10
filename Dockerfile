# syntax=docker/dockerfile:1

FROM ghcr.io/voidzero-dev/vite-plus:0.2.8 AS build

WORKDIR /app

COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .nvmrc ./
COPY --chown=vp:vp apps/web/package.json apps/web/
COPY --chown=vp:vp packages/domain/package.json packages/domain/
COPY --chown=vp:vp packages/infra/package.json packages/infra/
COPY --chown=vp:vp packages/ui/package.json packages/ui/

RUN vp install --frozen-lockfile

COPY --chown=vp:vp . .

RUN vp build

FROM nginxinc/nginx-unprivileged:1-alpine AS runtime

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER=^PORT$

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1
