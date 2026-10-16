import argparse
import getpass
import sys

from sqlalchemy import select

from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.labs import load_packages
from app.main import sync_packages
from app.models import User
from app.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    labs = commands.add_parser("labs")
    labs.add_argument("action", choices=["validate", "sync"])
    commands.add_parser("create-admin")
    args = parser.parse_args()
    settings = get_settings()
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(engine)
    if args.command == "labs":
        packages = load_packages(settings.lab_root)
        if args.action == "validate":
            print(f"Validated {len(packages)} lab packages")
            return
        with SessionLocal() as db:
            print(f"Synced {sync_packages(db)} lab packages")
        return
    if args.command == "create-admin":
        if settings.app_env == "production" and not sys.stdin.isatty():
            raise SystemExit("Run create-admin interactively")
        email = input("Admin email: ").strip().lower()
        first = input("First name: ").strip()
        last = input("Last name: ").strip()
        password = getpass.getpass("Password (12+ chars): ")
        with SessionLocal() as db:
            if db.scalar(select(User.id).where(User.email == email)):
                raise SystemExit("That email already exists")
            user = User(email=email, first_name=first, last_name=last, role="admin", password_hash=hash_password(password), email_verified_at=__import__("app.models", fromlist=["now"]).now())
            db.add(user)
            db.commit()
        print("Admin created. Sign in and accept the Acceptable Use Policy.")


if __name__ == "__main__":
    main()
