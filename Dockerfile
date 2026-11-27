FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY Minor_Project/backend/requirements.txt /app/Minor_Project/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/Minor_Project/backend/requirements.txt

COPY Minor_Project /app/Minor_Project

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --app-dir Minor_Project/backend --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
