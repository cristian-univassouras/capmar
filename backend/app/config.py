from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração da aplicação, carregada de variáveis de ambiente / .env."""

    database_url: str = "postgresql+psycopg2://capmar:capmar@localhost:5432/capmar"
    # Origens permitidas para CORS, separadas por vírgula.
    cors_origins: str = "http://localhost:3000"

    # Auth / JWT. TROCAR o secret em produção (via env SECRET_KEY).
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 dias

    # Diretório onde as imagens enviadas são salvas (montado em volume no Docker).
    upload_dir: str = "/app/uploads"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
