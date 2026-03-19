from __future__ import annotations

from datetime import datetime

from sqlalchemy import text

from database.db_provider import get_db_engine, list_all_databases
from database.queries import AcessosQueries


class AcessosRepositorySql:
    def _is_schema_mismatch(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return "invalid column name" in message or "invalid column" in message

    def _is_non_insertable_date(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "computed column" in message
            or "cannot be modified" in message
            or "cannot insert explicit value" in message
            or "timestamp" in message
            or "rowversion" in message
        )

    def _resolve_db_key(self, *, for_write: bool = False) -> tuple[str, str]:
        available = list_all_databases()
        for candidate in ("management", "primary", "dev"):
            if candidate in available:
                profiles = available.get(candidate, [])
                if for_write and "writer" in profiles:
                    return candidate, "writer"
                if for_write and "ddl" in profiles:
                    return candidate, "ddl"
                if "reader" in profiles:
                    return candidate, "reader"
                if "ddl" in profiles:
                    return candidate, "ddl"
                if "writer" in profiles:
                    return candidate, "writer"
        raise ValueError(
            "Nenhum banco configurado para leitura. Configure o .env com DB_SERVER e credenciais."
        )

    def _map_acesso_row(self, row) -> dict:
        valor = row.get("valor")
        try:
            valor = float(valor) if valor is not None else None
        except (TypeError, ValueError):
            valor = None

        data_criacao = row.get("data_criacao")
        if isinstance(data_criacao, datetime):
            data_criacao = data_criacao.isoformat()

        return {
            "id_assinatura": int(row.get("id_assinatura"))
            if row.get("id_assinatura") is not None
            else None,
            "plataforma": row.get("plataforma"),
            "valor": valor,
            "data_referencia": row.get("data_referencia"),
            "data_criacao": data_criacao,
            "link": row.get("link"),
            "email": row.get("email"),
            "senha": row.get("senha"),
        }

    def list_acessos(self) -> list[dict]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.connect() as conn:
            try:
                rows = conn.execute(text(AcessosQueries.SQL_LIST_ACESSOS_V2)).mappings().all()
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
                rows = conn.execute(text(AcessosQueries.SQL_LIST_ACESSOS_V1)).mappings().all()

        return [self._map_acesso_row(row) for row in rows]

    def create_acesso(
        self,
        *,
        plataforma: str,
        valor: float | None,
        data_referencia: str | None,
        link: str | None,
        email: str | None,
        senha: str | None,
    ) -> dict:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            params = {
                "plataforma": plataforma,
                "valor": valor,
                "data_referencia": data_referencia,
                "link": link,
                "email": email,
                "senha": senha,
            }
            try:
                row = conn.execute(
                    text(AcessosQueries.SQL_INSERT_ACESSO_V2_WITH_DATE),
                    params,
                ).mappings().first()
            except Exception as exc:
                if self._is_schema_mismatch(exc):
                    row = conn.execute(text(AcessosQueries.SQL_INSERT_ACESSO_V1), params).mappings().first()
                elif self._is_non_insertable_date(exc):
                    row = conn.execute(text(AcessosQueries.SQL_INSERT_ACESSO_V2), params).mappings().first()
                else:
                    raise

            if row and row.get("id_assinatura") is not None and row.get("data_criacao") is None:
                try:
                    conn.execute(
                        text(AcessosQueries.SQL_TOUCH_DATA_CRIACAO_IF_NULL),
                        {"id_assinatura": int(row.get("id_assinatura"))},
                    )
                    refreshed = conn.execute(
                        text(AcessosQueries.SQL_SELECT_ACESSO_BY_ID_V2),
                        {"id_assinatura": int(row.get("id_assinatura"))},
                    ).mappings().first()
                    if refreshed:
                        row = refreshed
                except Exception:
                    # best-effort: if column doesn't exist or can't be updated, keep original row
                    pass

        if not row:
            raise ValueError("Nao foi possivel inserir o acesso.")

        return self._map_acesso_row(row)

    def update_acesso(
        self,
        *,
        id_assinatura: int,
        plataforma: str,
        valor: float | None,
        data_referencia: str | None,
        link: str | None,
        email: str | None,
        senha: str | None,
    ) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            params = {
                "id_assinatura": id_assinatura,
                "plataforma": plataforma,
                "valor": valor,
                "data_referencia": data_referencia,
                "link": link,
                "email": email,
                "senha": senha,
            }
            try:
                result = conn.execute(text(AcessosQueries.SQL_UPDATE_ACESSO_V2), params)
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
                result = conn.execute(text(AcessosQueries.SQL_UPDATE_ACESSO), params)
        return result.rowcount or 0

    def delete_acesso(self, *, id_assinatura: int) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            params = {"id_assinatura": id_assinatura}
            try:
                result = conn.execute(text(AcessosQueries.SQL_DELETE_ACESSO_V2), params)
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
                result = conn.execute(text(AcessosQueries.SQL_DELETE_ACESSO), params)
        return result.rowcount or 0
