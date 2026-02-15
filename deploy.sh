#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
VPS_HOST="${VPS_HOST:?Set VPS_HOST to your server address (e.g. vps.wimluyckx.dev)}"
VPS_USER="${VPS_USER:-ubuntu}"
VPS_PATH="${VPS_PATH:-/opt/energy-dashboard}"

# --- Colors ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $1"; }
error() { echo -e "${RED}[deploy]${NC} $1" >&2; exit 1; }

# --- Pre-flight checks ---
info "Pre-flight checks..."

# Must be in project root
[[ -f "package.json" ]] || error "Run this script from the project root (package.json not found)"
[[ -f "Dockerfile" ]]   || error "Dockerfile not found in project root"

# Test SSH connection
info "Testing SSH connection to ${VPS_USER}@${VPS_HOST}..."
ssh -o ConnectTimeout=5 -q "${VPS_USER}@${VPS_HOST}" exit || error "Cannot connect to ${VPS_USER}@${VPS_HOST}"

# --- Build ---
info "Building dashboard..."
npm run build
[[ -f "dist/dashboard.html" ]] || error "Build failed — dist/dashboard.html not found"

BUILD_SIZE=$(wc -c < dist/dashboard.html | tr -d ' ')
info "Build output: dist/dashboard.html (${BUILD_SIZE} bytes)"

if (( BUILD_SIZE > 204800 )); then
    error "Build output exceeds 200 KB limit (${BUILD_SIZE} bytes)"
fi

# --- Upload ---
info "Ensuring remote directory exists..."
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}/dist"

info "Uploading deployment files..."
scp Dockerfile nginx.conf docker-compose.yml "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
scp dist/dashboard.html "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/dist/"

# --- Deploy ---
info "Building and starting container on VPS..."
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && docker compose build --quiet && docker compose up -d"

# --- Health check ---
info "Waiting for health check..."
sleep 3

HEALTH=$(ssh "${VPS_USER}@${VPS_HOST}" "docker inspect --format='{{.State.Health.Status}}' energy-dashboard 2>/dev/null" || echo "unknown")

if [[ "${HEALTH}" == "healthy" ]]; then
    info "Container is healthy!"
elif [[ "${HEALTH}" == "starting" ]]; then
    warn "Container is starting (health check not yet passed). Check again in ~30s."
else
    warn "Health status: ${HEALTH}. Check with: ssh ${VPS_USER}@${VPS_HOST} 'docker logs energy-dashboard'"
fi

# --- Status ---
info "Container status:"
ssh "${VPS_USER}@${VPS_HOST}" "docker compose -f ${VPS_PATH}/docker-compose.yml ps"

echo ""
info "Deploy complete! Dashboard should be available at https://dashboard.wimluyckx.dev"
info "Health check: curl https://dashboard.wimluyckx.dev/health"
