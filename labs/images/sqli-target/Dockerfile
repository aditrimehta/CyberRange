FROM python:3.12.8-slim-bookworm
WORKDIR /app
COPY app.py ./app.py
RUN pip install --no-cache-dir Flask==3.1.0 && \
    useradd --system --create-home lab && chown -R lab:lab /app
USER lab
EXPOSE 80
CMD ["python", "app.py"]
