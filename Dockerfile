# ==============================================================================
# WB-Agent Unified All-In-One Production Dockerfile
# Runs Next.js 15 Dashboard (:3000 / $PORT), FastAPI Backend (:8000), and
# WhatsApp Multi-Device Baileys Bridge (:3001) via `python run.py --prod`
# Suitable for Render, Railway, Fly.io, Coolify, DigitalOcean, and Linux VPS
# ==============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    PORT=3000 \
    BACKEND_PORT=8000 \
    BRIDGE_PORT=3001

WORKDIR /app

# 1. Install system dependencies and Node.js 20 LTS
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    build-essential \
    libpq-dev \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Python Backend dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 3. Install WhatsApp Bridge Node.js dependencies
COPY whatsapp-bridge/package*.json ./whatsapp-bridge/
RUN cd whatsapp-bridge && npm install --no-audit --no-fund

# 4. Install Next.js Dashboard Node.js dependencies
COPY dashboard/package*.json ./dashboard/
RUN cd dashboard && npm install --no-audit --no-fund

# 5. Copy full application source
COPY . .

# 6. Pre-build Next.js Dashboard for fast production startup
RUN cd dashboard && npm run build

# 7. Ensure runtime storage & SQLite directories exist
RUN mkdir -p /app/storage /app/whatsapp-bridge/auth_info_baileys

EXPOSE 3000 8000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/v1/health || exit 1

CMD ["python", "run.py", "--prod", "--no-open"]
