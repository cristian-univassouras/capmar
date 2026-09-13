from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET_KEY = "dev-secret-change-me"


class Settings(BaseSettings):
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+psycopg2://capmar:capmar@localhost:5432/capmar"
    cors_origins: str = "http://localhost:3000"
    secret_key: str = Field(default=DEV_SECRET_KEY, repr=False)
    access_token_expire_minutes: int = Field(default=60 * 24 * 7, ge=1, le=10080)
    cookie_name: str = "capmar_token"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    forwarded_allow_ips: str = "127.0.0.1"
    upload_dir: str = "/app/uploads"  # Apenas importação dos arquivos legados.
    upload_quota_bytes: int = Field(default=50 * 1024 * 1024, ge=1)
    upload_quota_count: int = Field(default=100, ge=1)
    upload_orphan_hours: int = Field(default=24, ge=1)
    login_limit: int = Field(default=10, ge=1)
    register_limit: int = Field(default=5, ge=1)
    write_limit: int = Field(default=120, ge=1)
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", hide_input_in_errors=True)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_security(self):
        if not self.secret_key.strip():
            raise ValueError("SECRET_KEY não pode ser vazia")
        origins = self.cors_origins_list
        if not origins:
            raise ValueError("CORS_ORIGINS deve conter origens explícitas")
        for origin in origins:
            parsed = urlsplit(origin)
            if (parsed.scheme not in ("http", "https") or not parsed.hostname
                    or parsed.username or parsed.password or parsed.path or parsed.query
                    or parsed.fragment or "*" in origin):
                raise ValueError("CORS_ORIGINS aceita somente origens HTTP(S), sem caminhos ou curingas")
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("COOKIE_SAMESITE=none exige COOKIE_SECURE=true")
        if self.environment == "production":
            if "*" in self.forwarded_allow_ips:
                raise ValueError("Produção não pode confiar em forwarded headers de qualquer IP")
            if ("secret_key" not in self.model_fields_set or len(self.secret_key.encode()) < 32
                    or any(word in self.secret_key.lower() for word in
                           ("dev-secret", "change-me", "changeme", "example", "development"))):
                raise ValueError("Produção exige SECRET_KEY aleatória de pelo menos 32 bytes")
            if not self.cookie_secure:
                raise ValueError("Produção exige COOKIE_SECURE=true")
            if "cors_origins" not in self.model_fields_set or any(not o.startswith("https://") for o in origins):
                raise ValueError("Produção exige CORS_ORIGINS explícitas com HTTPS")
            if "database_url" not in self.model_fields_set or not self.database_url.startswith("postgresql"):
                raise ValueError("Produção exige DATABASE_URL explícita para PostgreSQL")
        return self


settings = Settings()
