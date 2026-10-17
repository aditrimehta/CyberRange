FROM python:3.12-slim
WORKDIR /app
COPY target.py lab_action.py ./
COPY incidents.json ./
USER 10001:10001
CMD ["python", "/app/target.py"]
