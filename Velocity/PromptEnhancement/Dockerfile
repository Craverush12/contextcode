FROM python:3.10.16-slim
# Set environment variables to prevent .pyc files and enable unbuffered logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
# Set working directory
WORKDIR /app
# Install system dependencies for building some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libz-dev \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
# Copy requirements file
COPY requirements.txt .
# Install Python dependencies
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt
# Copy application code
COPY application.py ./
COPY src/ ./src/
COPY config/ ./config/
# Create log directory
RUN mkdir -p logs && chmod 777 logs
# Expose the port FastAPI runs on
EXPOSE ${APP_PORT}
# Use Uvicorn for production with optimal settings
CMD ["sh", "-c", "uvicorn application:app --host 0.0.0.0 --port $APP_PORT --workers 2"]