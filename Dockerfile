FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/dashboard.conf.template
COPY dist/dashboard.html /usr/share/nginx/html/index.html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO /dev/null http://localhost/health || exit 1

EXPOSE 80
