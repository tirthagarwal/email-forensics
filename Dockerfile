# ==============================================================================
# AI-Assisted Email Cryptographic Security Posture Assessment Framework
# Remote Forensic Engine Container
# ==============================================================================

FROM python:3.11-slim-bookworm

# Metadata
LABEL maintainer="AI-Assisted Email Forensics Team"
LABEL description="Remote Forensic Analysis Engine running Zeek and Python pipeline"
LABEL version="1.0.0"

# Container configuration
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/zeek/bin:${PATH}" \
    PORT=8000 \
    APP_HOME=/app

WORKDIR ${APP_HOME}

# 1. Install system utilities, networking libraries, and Zeek from official OpenSUSE Build Service (OBS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    libpcap0.8 \
    libpcap-dev \
    tcpdump \
    && echo 'deb http://download.opensuse.org/repositories/security:/zeek/Debian_12/ /' > /etc/apt/sources.list.d/security:zeek.list \
    && curl -fsSL https://download.opensuse.org/repositories/security:/zeek/Debian_12/Release.key | gpg --dearmor > /etc/apt/trusted.gpg.d/security_zeek.gpg \
    && apt-get update \
    && (apt-get install -y --no-install-recommends zeek-core || apt-get install -y --no-install-recommends zeek) \
    && apt-get purge -y curl gnupg \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy application components
COPY part1/ ./part1/
COPY remote_engine/ ./remote_engine/

# 4. Create non-root unprivileged service account
RUN useradd -m -u 1000 forensic \
    && chown -R forensic:forensic ${APP_HOME}

USER forensic

# 5. Expose HTTP port and define healthcheck
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/ping').getcode() == 200 else 1)"

# 6. Service entrypoint
CMD ["python3", "remote_engine/server.py", "--port", "8000"]
