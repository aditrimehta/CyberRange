import hashlib
import secrets
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from cryptography.fernet import Fernet

from app.config import get_settings
from app.models import now

password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
COMMON_PASSWORDS = {"password12345", "qwerty123456", "letmein12345", "changeme1234", "admin1234567"}


def hash_password(password: str) -> str:
    if len(password) < 12 or password.lower() in COMMON_PASSWORDS:
        raise ValueError("Use at least 12 characters and avoid common passwords")
    return password_hasher.hash(password)


def verify_password(encoded: str, password: str) -> bool:
    try:
        return password_hasher.verify(encoded, password)
    except (VerifyMismatchError, InvalidHashError, VerificationError):
        return False


def token() -> str:
    return secrets.token_urlsafe(32)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def expires_in(minutes: int = 60 * 24 * 7):
    return now() + timedelta(minutes=minutes)


def _fernet() -> Fernet:
    key = hashlib.sha256(get_settings().session_secret.encode()).digest()
    import base64
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    return _fernet().decrypt(value.encode()).decode()
