FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Production: Vite build is copied here by the root multi-stage Dockerfile
# Development: this directory won't exist and static serving is skipped
COPY static/ static/

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
