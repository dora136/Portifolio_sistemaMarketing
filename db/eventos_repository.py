from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import text

from database.db_provider import get_db_engine, list_all_databases
from database.queries import EventoQueries


def _to_iso_date(value) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


class EventosRepositorySql:
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

    def _map_evento_row(self, row) -> dict:
        return {
            "id_evento": int(row.get("id_evento")) if row.get("id_evento") is not None else None,
            "nome": row.get("nome"),
            "data_inicio": _to_iso_date(row.get("data_inicio")),
            "data_fim": _to_iso_date(row.get("data_fim")),
            "nivel": row.get("nivel"),
            "local": row.get("local"),
            "cidade": row.get("cidade"),
            "site": row.get("site"),
            "permissoe": row.get("permissoe"),
        }

    def list_eventos(self) -> list[dict]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.connect() as conn:
            rows = conn.execute(text(EventoQueries.SQL_LIST_EVENTOS)).mappings().all()

        return [self._map_evento_row(row) for row in rows]

    def create_evento(
        self,
        *,
        nome: str,
        data_inicio: str,
        data_fim: str,
        nivel: str,
        local: str | None,
        cidade: str | None,
        site: str | None,
        permissoe: str | None,
    ) -> dict:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            row = conn.execute(
                text(EventoQueries.SQL_INSERT_EVENTO),
                {
                    "nome": nome,
                    "data_inicio": data_inicio,
                    "data_fim": data_fim,
                    "nivel": nivel,
                    "local": local,
                    "cidade": cidade,
                    "site": site,
                    "permissoe": permissoe,
                },
            ).mappings().first()

        if not row:
            raise ValueError("Nao foi possivel inserir o evento.")

        return self._map_evento_row(row)

    def update_evento(
        self,
        *,
        id_evento: int,
        nome: str | None,
        data_inicio: str | None,
        data_fim: str | None,
        nivel: str | None,
        local: str | None,
        cidade: str | None,
        site: str | None,
        permissoe: str | None,
    ) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            result = conn.execute(
                text(EventoQueries.SQL_UPDATE_EVENTO),
                {
                    "id_evento": id_evento,
                    "nome": nome,
                    "data_inicio": data_inicio,
                    "data_fim": data_fim,
                    "nivel": nivel,
                    "local": local,
                    "cidade": cidade,
                    "site": site,
                    "permissoe": permissoe,
                },
            )
        return result.rowcount or 0

    def delete_evento(self, *, id_evento: int) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            result = conn.execute(
                text(EventoQueries.SQL_DELETE_EVENTO),
                {"id_evento": id_evento},
            )
        return result.rowcount or 0
