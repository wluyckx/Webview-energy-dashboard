FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/dashboard.conf.template
COPY dist/dashboard.html /usr/share/nginx/html/index.html

# 127.0.0.1, not localhost: nginx listens IPv4-only and alpine wget resolves
# localhost to ::1 first, which made this healthcheck report a serving
# container as permanently unhealthy (observed live, 2026-07-30).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO /dev/null http://127.0.0.1/health || exit 1

EXPOSE 80
