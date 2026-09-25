# Stage 1: Build Frontend
FROM node:20-alpine AS node-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (nginx)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    requests \
    xarray \
    netcdf4 \
    scipy \
    matplotlib \
    pillow \
    numpy \
    python-multipart

# Copy backend application
COPY backend/ /app/backend

# Copy frontend built distribution from stage 1
COPY --from=node-builder /app/frontend/dist /app/frontend/dist

# Configure Nginx
COPY nginx.conf /etc/nginx/sites-available/default
RUN rm -f /etc/nginx/sites-enabled/default && ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Set working directory and python path
ENV PYTHONPATH=/app/backend
WORKDIR /app/backend

EXPOSE 80 8001

# Start nginx in daemon mode and uvicorn in foreground
CMD service nginx start && uvicorn main_v3:app --host 0.0.0.0 --port 8001
