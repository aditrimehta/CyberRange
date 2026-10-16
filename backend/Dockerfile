FROM python:3.12.8-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --create-home app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
USER app
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python -m app.cli labs sync && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
