from pydantic_settings import BaseSettings, SettingsConfigDict

# Secret usado apenas em desenvolvimento local, quando SECRET_KEY não vem do
# ambiente. Em produção o docker-compose exige a variável (`${SECRET_KEY:?...}`)
# e o startup avisa se este valor estiver em uso — ver `using_dev_secret_key`.
DEV_SECRET_KEY = "dev-secret-change-me"


class Settings(BaseSettings):
    """Configuração da aplicação, carregada de variáveis de ambiente / .env."""

    database_url: str = "postgresql+psycopg2://capmar:capmar@localhost:5432/capmar"
    # Origens permitidas para CORS, separadas por vírgula.
    cors_origins: str = "http://localhost:3000"

    # Auth / JWT. TROCAR o secret em produção (via env SECRET_KEY).
    secret_key: str = DEV_SECRET_KEY
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 dias

    # Diretório onde as imagens enviadas são salvas (montado em volume no Docker).
    upload_dir: str = "/app/uploads"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def using_dev_secret_key(self) -> bool:
        """True quando os JWTs estão sendo assinados sem um secret do ambiente.

        Cobre o default de desenvolvimento e também a chave em branco — o
        `.env.example` traz `SECRET_KEY=` vazia, então copiá-lo sem preencher
        cai neste caso.
        """
        return self.secret_key.strip() in ("", DEV_SECRET_KEY)


settings = Settings()
