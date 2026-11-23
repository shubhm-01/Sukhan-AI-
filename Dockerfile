FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PORT=7860 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv python3-pip ffmpeg ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/sukhan-python
ENV PATH="/opt/sukhan-python/bin:$PATH"

COPY package.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY livekit-agent/requirements.txt ./livekit-agent/requirements.txt
RUN pip install --no-cache-dir -r livekit-agent/requirements.txt

COPY . .
RUN npm run build

EXPOSE 7860
CMD ["bash", "./start.sh"]
