from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from config.env import BASE_DIR


def _find_env_files() -> tuple[str, ...]:
    candidates = [
        Path(BASE_DIR) / ".env",
        Path(BASE_DIR).parent / ".env",
    ]
    return tuple(str(path) for path in candidates if path.exists())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_find_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_NAME: str = Field(default="Portfolio Marketing Hub")
    PORTAL_URL: Optional[str] = Field(default=None)
    PORTIFOLIO_DEMO_MODE: bool = Field(default=True, description="Executa a aplicacao em modo demonstrativo")

    DB_SERVER: Optional[str] = Field(default=None, description="Servidor de banco de dados")
    DB_DRIVER3: str = Field(default="ODBC Driver 18")

    DB_DATABASE_PRIMARY: Optional[str] = Field(default=None)
    DB_DATABASE_ADMIN: Optional[str] = Field(default=None)
    DB_DATABASE_MANAGEMENT: Optional[str] = Field(default=None)
    DB_DATABASE_SECURE: Optional[str] = Field(default=None)
    DB_DATABASE_DEV: Optional[str] = Field(default=None)

    DB_DEV_READER_UID: Optional[str] = Field(default=None)
    DB_DEV_READER_PWD: Optional[str] = Field(default=None)
    DB_DEV_WRITER_UID: Optional[str] = Field(default=None)
    DB_DEV_WRITER_PWD: Optional[str] = Field(default=None)
    DB_DEV_DDL_UID: Optional[str] = Field(default=None)
    DB_DEV_DDL_PWD: Optional[str] = Field(default=None)

    DB_PRIMARY_READER_UID: Optional[str] = Field(default=None)
    DB_PRIMARY_READER_PWD: Optional[str] = Field(default=None)
    DB_PRIMARY_WRITER_UID: Optional[str] = Field(default=None)
    DB_PRIMARY_WRITER_PWD: Optional[str] = Field(default=None)
    DB_PRIMARY_DDL_UID: Optional[str] = Field(default=None)
    DB_PRIMARY_DDL_PWD: Optional[str] = Field(default=None)

    DB_ADMIN_READER_UID: Optional[str] = Field(default=None)
    DB_ADMIN_READER_PWD: Optional[str] = Field(default=None)
    DB_ADMIN_WRITER_UID: Optional[str] = Field(default=None)
    DB_ADMIN_WRITER_PWD: Optional[str] = Field(default=None)
    DB_ADMIN_DDL_UID: Optional[str] = Field(default=None)
    DB_ADMIN_DDL_PWD: Optional[str] = Field(default=None)

    DB_MGMT_READER_UID: Optional[str] = Field(default=None)
    DB_MGMT_READER_PWD: Optional[str] = Field(default=None)
    DB_MGMT_WRITER_UID: Optional[str] = Field(default=None)
    DB_MGMT_WRITER_PWD: Optional[str] = Field(default=None)
    DB_MGMT_DDL_UID: Optional[str] = Field(default=None)
    DB_MGMT_DDL_PWD: Optional[str] = Field(default=None)

    DB_SECURE_READER_UID: Optional[str] = Field(default=None)
    DB_SECURE_READER_PWD: Optional[str] = Field(default=None)
    DB_SECURE_WRITER_UID: Optional[str] = Field(default=None)
    DB_SECURE_WRITER_PWD: Optional[str] = Field(default=None)
    DB_SECURE_DDL_UID: Optional[str] = Field(default=None)
    DB_SECURE_DDL_PWD: Optional[str] = Field(default=None)

    FORMS_API_KEY: Optional[str] = Field(default=None, description="Chave da API do provedor de formularios")
    FORMS_SITE_ID: Optional[str] = Field(default=None, description="Identificador do site")
    FORMS_APP_ID: Optional[str] = Field(default=None, description="App ID")
    FORMS_APP_SECRET: Optional[str] = Field(default=None, description="App Secret")
    FORMS_FORMS_NAMESPACE: str = Field(default="forms.app.submissions", description="Namespace do provedor de formularios")
    FORMS_FORMS_LIMIT: int = Field(default=20, description="Limite de submissões listadas")
    FORMS_WEBHOOK_SECRET: Optional[str] = Field(
        default=None,
        description="Segredo para validar chamadas do webhook",
    )
    FORMS_WEBHOOK_PAGE_LIMIT: int = Field(default=25, description="Limite de eventos exibidos no direcionamento")

    GA4_PROPERTY_ID: Optional[str] = Field(default=None, description="Property ID do GA4")
    GA4_CREDENTIALS_PATH: Optional[str] = Field(default=None, description="Caminho para o JSON de credenciais da service account do GA4")

    TEMPLATES_STORE_PROVIDER: str = Field(default="memory", description="Onde armazenar templates: memory|cloud_blob")
    CLOUD_STORAGE_CONNECTION_STRING: Optional[str] = Field(default=None, description="Connection string do storage")
    CLOUD_BLOB_CONTAINER_TEMPLATES: str = Field(default="portfolio-assets", description="Container de templates")
    CLOUD_BLOB_PREFIX_TEMPLATES: str = Field(default="", description="Prefixo/pasta no container")

    CLOUD_TENANT_ID: Optional[str] = Field(default=None, description="Tenant ID")
    CLOUD_CLIENT_ID: Optional[str] = Field(default=None, description="Client ID")
    CLOUD_CLIENT_SECRET: Optional[str] = Field(default=None, description="Client Secret")
    CLOUD_STORAGE_ACCOUNT: Optional[str] = Field(default="demostorage", description="Nome da conta de storage")


settings = Settings()
