"""Provisionamento/recuperação presencial: python -m app.admin_cli create-admin EMAIL USERNAME."""
import argparse
import getpass
from sqlalchemy import select, delete, text
from . import models
from .audit import record
from .database import SessionLocal
from .mfa import cipher, generate_secret, provisioning, totp
from .schemas import UserCreate
from .security import hash_password


def main():
    parser = argparse.ArgumentParser(description="Provisionamento auditado; execute apenas no terminal seguro do servidor")
    parser.add_argument("action", choices=["create-admin", "recover"])
    parser.add_argument("email")
    parser.add_argument("username", nargs="?")
    args = parser.parse_args()
    password = getpass.getpass("Nova senha (mínimo 12 caracteres): ")
    if len(password) < 12 or password != getpass.getpass("Repita a senha: "):
        raise SystemExit("Senha inválida ou confirmação diferente")
    reason = input("Motivo/ticket da operação (mínimo 5 caracteres): ").strip()
    if not 5 <= len(reason) <= 500:
        raise SystemExit("Informe um motivo válido")
    secret = generate_secret()
    print("Cadastre esta chave no autenticador e guarde-a em local seguro:", secret)
    print(provisioning(secret, args.email))
    if getpass.getpass("Código atual do autenticador: ") != totp(secret):
        raise SystemExit("Código inválido; nenhuma conta alterada")
    with SessionLocal.begin() as db:
        db.execute(text("SELECT pg_advisory_xact_lock(724001)"))
        user = db.scalar(select(models.User).where(models.User.email == args.email.lower()).with_for_update())
        if args.action == "create-admin":
            if user or not args.username:
                raise SystemExit("Informe username e e-mail de uma nova conta")
            payload = UserCreate(username=args.username, email=args.email, password=password)
            user = models.User(username=payload.username, email=str(payload.email), user_password=hash_password(password))
            db.add(user)
            user.role = "admin"
        elif user is None:
            raise SystemExit("Conta inexistente")
        user.user_password = hash_password(password)
        user.mfa_secret = cipher().encrypt(secret.encode()).decode()
        user.mfa_pending, user.mfa_pending_until, user.mfa_last_step = None, 0, -1
        db.flush()
        db.execute(delete(models.AuthSession).where(models.AuthSession.user_id == user.user_id))
        record(db, None, "operator." + args.action, "user", user.user_id, reason, operator=getpass.getuser())
    print("Operação concluída. Sessões anteriores revogadas.")


if __name__ == "__main__":
    main()
