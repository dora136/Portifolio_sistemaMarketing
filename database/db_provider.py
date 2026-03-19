"""
Database Provider Module

Gerencia conexoes com multiplos bancos SQL Server,
seguindo o mesmo padrao dos demais sistemas.
"""

from typing import Literal, Optional
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from config.config import settings

ProfileType = Literal["reader", "writer", "ddl"]
ConnectionType = Literal["sqlalchemy", "pyodbc"]


class DatabaseConfigError(Exception):
    """Erro de configuracao do banco de dados."""


class MissingCredentialsError(DatabaseConfigError):
    """Credenciais do banco de dados nao encontradas."""


class InvalidProfileError(DatabaseConfigError):
    """Perfil de acesso invalido ou nao suportado."""


def _generate_db_name_map() -> dict[str, str]:
    all_mappings = {
        "primary": ("DB_DATABASE_PRIMARY", getattr(settings, "DB_DATABASE_PRIMARY", None)),
        "admin": ("DB_DATABASE_ADMIN", getattr(settings, "DB_DATABASE_ADMIN", None)),
        "management": ("DB_DATABASE_MANAGEMENT", getattr(settings, "DB_DATABASE_MANAGEMENT", None)),
        "dev": ("DB_DATABASE_DEV", getattr(settings, "DB_DATABASE_DEV", None)),
        "secure": ("DB_DATABASE_SECURE", getattr(settings, "DB_DATABASE_SECURE", None)),
    }
    return {
        db_key: env_var
        for db_key, (env_var, value) in all_mappings.items()
        if value is not None
    }


def _generate_credentials_map() -> dict[tuple[str, str], tuple[str, str]]:
    all_possible_credentials = [
        (("dev", "reader"), "DB_DEV_READER_UID", "DB_DEV_READER_PWD"),
        (("dev", "writer"), "DB_DEV_WRITER_UID", "DB_DEV_WRITER_PWD"),
        (("dev", "ddl"), "DB_DEV_DDL_UID", "DB_DEV_DDL_PWD"),
        (("primary", "reader"), "DB_PRIMARY_READER_UID", "DB_PRIMARY_READER_PWD"),
        (("primary", "writer"), "DB_PRIMARY_WRITER_UID", "DB_PRIMARY_WRITER_PWD"),
        (("primary", "ddl"), "DB_PRIMARY_DDL_UID", "DB_PRIMARY_DDL_PWD"),
        (("admin", "reader"), "DB_ADMIN_READER_UID", "DB_ADMIN_READER_PWD"),
        (("admin", "writer"), "DB_ADMIN_WRITER_UID", "DB_ADMIN_WRITER_PWD"),
        (("admin", "ddl"), "DB_ADMIN_DDL_UID", "DB_ADMIN_DDL_PWD"),
        (("management", "reader"), "DB_MGMT_READER_UID", "DB_MGMT_READER_PWD"),
        (("management", "writer"), "DB_MGMT_WRITER_UID", "DB_MGMT_WRITER_PWD"),
        (("management", "ddl"), "DB_MGMT_DDL_UID", "DB_MGMT_DDL_PWD"),
        (("secure", "reader"), "DB_SECURE_READER_UID", "DB_SECURE_READER_PWD"),
        (("secure", "writer"), "DB_SECURE_WRITER_UID", "DB_SECURE_WRITER_PWD"),
        (("secure", "ddl"), "DB_SECURE_DDL_UID", "DB_SECURE_DDL_PWD"),
    ]

    result = {}
    for key, uid_var, pwd_var in all_possible_credentials:
        uid = getattr(settings, uid_var, None)
        pwd = getattr(settings, pwd_var, None)
        if uid is not None and pwd is not None:
            result[key] = (uid_var, pwd_var)
    return result


DB_NAME_MAP = _generate_db_name_map()
DB_CREDENTIALS_MAP = _generate_credentials_map()

_engine: Optional[Engine] = None
_current_db_key: Optional[str] = None
_current_profile: Optional[str] = None


def _build_connection_string(
    db_key: str,
    profile: ProfileType = "reader",
    connection_type: ConnectionType = "sqlalchemy",
) -> str:
    valid_profiles = ["reader", "writer", "ddl"]
    if profile not in valid_profiles:
        raise InvalidProfileError(
            f"Perfil '{profile}' invalido. Perfis validos: {', '.join(valid_profiles)}"
        )

    if db_key not in DB_NAME_MAP:
        raise ValueError(
            f"Banco '{db_key}' nao reconhecido. "
            f"Bancos disponiveis: {', '.join(DB_NAME_MAP.keys())}"
        )

    credential_key = (db_key, profile)
    if credential_key not in DB_CREDENTIALS_MAP:
        available_profiles = get_available_profiles(db_key)
        raise InvalidProfileError(
            f"Perfil '{profile}' nao esta configurado para o banco '{db_key}'.\n"
            f"Perfis disponiveis para '{db_key}': {', '.join(available_profiles)}"
        )

    uid_var, pwd_var = DB_CREDENTIALS_MAP[credential_key]
    db_uid = getattr(settings, uid_var, None)
    db_pwd = getattr(settings, pwd_var, None)

    missing_vars = []
    if not db_uid:
        missing_vars.append(uid_var)
    if not db_pwd:
        missing_vars.append(pwd_var)
    if missing_vars:
        raise MissingCredentialsError(
            f"Credenciais faltantes no .env: {', '.join(missing_vars)}"
        )

    db_server = settings.DB_SERVER
    if not db_server:
        raise MissingCredentialsError("DB_SERVER nao configurado no .env.")

    db_database = get_database_name(db_key)
    db_driver = settings.DB_DRIVER3

    odbc_conn_str = (
        f"Driver={{{db_driver}}};"
        f"Server={db_server};"
        f"Database={db_database};"
        f"UID={db_uid};"
        f"PWD={db_pwd};"
        "TrustServerCertificate=yes;"
    )

    if connection_type == "pyodbc":
        return odbc_conn_str
    if connection_type == "sqlalchemy":
        encoded_conn_str = quote_plus(odbc_conn_str)
        return f"mssql+pyodbc:///?odbc_connect={encoded_conn_str}"
    raise ValueError("Tipo de conexao nao suportado. Use 'sqlalchemy' ou 'pyodbc'.")


def get_db_engine(db_key: str = "dev", profile: ProfileType = "reader") -> Engine:
    if not db_key:
        raise ValueError("Parametro 'db_key' e obrigatorio.")

    global _engine, _current_db_key, _current_profile
    if _engine is not None and _current_db_key == db_key and _current_profile == profile:
        return _engine

    if _engine is not None:
        _engine.dispose()

    conn_str = _build_connection_string(db_key=db_key, profile=profile)
    engine = create_engine(
        conn_str,
        future=True,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

    _engine = engine
    _current_db_key = db_key
    _current_profile = profile
    return engine


def dispose_db_engine() -> None:
    global _engine, _current_db_key, _current_profile
    if _engine:
        _engine.dispose()
        _engine = None
        _current_db_key = None
        _current_profile = None


def get_current_connection_info() -> dict:
    return {
        "db_key": _current_db_key,
        "profile": _current_profile,
        "connected": _engine is not None,
    }


def get_available_profiles(db_key: str) -> list[str]:
    profiles = [profile for (db, profile) in DB_CREDENTIALS_MAP.keys() if db == db_key]
    return sorted(profiles)


def list_all_databases() -> dict[str, list[str]]:
    return {db_key: get_available_profiles(db_key) for db_key in DB_NAME_MAP.keys()}


def get_database_name(db_key: str) -> str:
    if db_key not in DB_NAME_MAP:
        available = list(DB_NAME_MAP.keys())
        raise KeyError(
            f"Banco '{db_key}' nao esta configurado. "
            f"Bancos disponiveis: {', '.join(available) if available else 'nenhum'}"
        )
    env_var = DB_NAME_MAP[db_key]
    return getattr(settings, env_var)


def validate_environment() -> dict[str, list[str]]:
    missing = []
    ok = []

    if settings.DB_SERVER:
        ok.append("DB_SERVER")
    else:
        missing.append("DB_SERVER")

    for (db_key, profile), (uid_var, pwd_var) in DB_CREDENTIALS_MAP.items():
        uid_value = getattr(settings, uid_var, None)
        pwd_value = getattr(settings, pwd_var, None)
        if uid_value:
            ok.append(uid_var)
        else:
            missing.append(uid_var)
        if pwd_value:
            ok.append(pwd_var)
        else:
            missing.append(pwd_var)

    for env_var in DB_NAME_MAP.values():
        db_name = getattr(settings, env_var, None)
        if db_name:
            ok.append(env_var)
        else:
            missing.append(env_var)

    return {"missing": sorted(set(missing)), "ok": sorted(set(ok))}
