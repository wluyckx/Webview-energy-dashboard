FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/dashboard.conf
COPY dist/dashboard.html /usr/share/nginx/html/index.html

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80
