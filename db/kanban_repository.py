from __future__ import annotations

import json
from datetime import date, datetime

from sqlalchemy import text

from database.db_provider import get_db_engine, list_all_databases
from database.queries import KanbanQueries


def _to_iso_date(value) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text_value = str(value).strip()
    if not text_value:
        return None
    try:
        return datetime.fromisoformat(text_value.replace("Z", "")).date().isoformat()
    except ValueError:
        return text_value


def _to_date(value) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text_value = str(value).strip()
    if not text_value:
        return None
    try:
        return datetime.fromisoformat(text_value.replace("Z", "")).date()
    except ValueError:
        return None


def _to_int(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(int(value))
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "sim", "yes", "y"}
    return False


class KanbanRepositorySql:
    DEFAULT_ETAPAS = [
        {"id": 1, "nome": "Backlog", "cor": "#64748b"},
        {"id": 2, "nome": "Em Andamento", "cor": "#2563eb"},
        {"id": 3, "nome": "Revisao", "cor": "#f59e0b"},
        {"id": 4, "nome": "Concluido", "cor": "#16a34a"},
    ]

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
            "Nenhum banco configurado para leitura/escrita. Configure o .env com DB_SERVER e credenciais."
        )

    def _map_atividade(self, row) -> dict:
        id_kanban = _to_int(row.get("id_kanban")) or 1
        return {
            "id_atividade": _to_int(row.get("id_atividade")),
            "id_kanban": id_kanban,
            "id_responsavel": _to_int(row.get("id_responsavel")),
            "titulo": row.get("titulo") or "",
            "descricao": row.get("descricao"),
            "observacao": row.get("observacao"),
            "data_criacao": _to_iso_date(row.get("data_criacao")),
            "data_prazo": _to_iso_date(row.get("data_prazo")),
            "data_finalizado": _to_iso_date(row.get("data_finalizado")),
            "finalizado": _to_bool(row.get("finalizado")),
            "urgencia": _to_bool(row.get("urgencia")),
            "prioridade": row.get("prioridade") or "media",
            "status": str(id_kanban),
        }

    def _map_history(self, row, payload: dict) -> dict:
        data_value = row.get("data")
        data_br = ""
        if isinstance(data_value, date):
            data_br = data_value.strftime("%d/%m/%Y")
        elif data_value:
            iso = _to_iso_date(data_value)
            if iso:
                parts = iso.split("-")
                if len(parts) == 3:
                    data_br = f"{parts[2]}/{parts[1]}/{parts[0]}"

        return {
            "id_registro": _to_int(row.get("id_registro")),
            "id_responsavel": _to_int(row.get("id_responsavel")),
            "responsavel": payload.get("responsavel") or (
                f"ID {_to_int(row.get('id_responsavel'))}" if _to_int(row.get("id_responsavel")) is not None else "Sistema"
            ),
            "data_hora": data_br,
            "dado_antigo": payload.get("dado_antigo") or "",
            "dado_novo": payload.get("dado_novo") or "",
            "local_alteracao": payload.get("local_alteracao") or "Marketing > Kanban",
            "acao": payload.get("acao") or "",
        }

    def _normalize_color(self, value: str | None, fallback: str) -> str:
        if not value:
            return fallback
        color = str(value).strip()
        if len(color) == 7 and color.startswith("#"):
            return color.lower()
        return fallback

    def _normalize_etapas(self, etapas: list[dict] | None) -> list[dict]:
        if not isinstance(etapas, list) or not etapas:
            return [dict(item) for item in self.DEFAULT_ETAPAS]

        normalized = []
        used_ids: set[int] = set()
        for index, item in enumerate(etapas, start=1):
            if not isinstance(item, dict):
                continue
            id_value = _to_int(item.get("id")) or index
            if id_value in used_ids:
                continue
            used_ids.add(id_value)
            default_row = self.DEFAULT_ETAPAS[min(index - 1, len(self.DEFAULT_ETAPAS) - 1)]
            nome = str(item.get("nome") or default_row["nome"]).strip() or default_row["nome"]
            cor = self._normalize_color(item.get("cor"), default_row["cor"])
            normalized.append({"id": id_value, "nome": nome, "cor": cor})

        if not normalized:
            return [dict(item) for item in self.DEFAULT_ETAPAS]
        return normalized

    def _get_final_stage_id(self, etapas: list[dict]) -> int:
        normalized = self._normalize_etapas(etapas)
        return _to_int(normalized[-1].get("id")) or 4

    def _parse_log_payload(self, raw_value) -> dict:
        if raw_value is None:
            return {}
        if isinstance(raw_value, dict):
            return raw_value
        text_value = str(raw_value).strip()
        if not text_value:
            return {}
        try:
            parsed = json.loads(text_value)
            if isinstance(parsed, dict):
                return parsed
        except (TypeError, ValueError):
            return {}
        return {}

    def list_atividades(self) -> list[dict]:
        try:
            db_key, profile = self._resolve_db_key(for_write=False)
            engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
            with engine.connect() as conn:
                rows = conn.execute(text(KanbanQueries.SQL_LIST_ATIVIDADES)).mappings().all()
            return [self._map_atividade(row) for row in rows]
        except Exception:
            return []

    def get_atividade(self, *, id_atividade: int) -> dict | None:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.connect() as conn:
            row = conn.execute(
                text(KanbanQueries.SQL_SELECT_ATIVIDADE_BY_ID),
                {"id_atividade": id_atividade},
            ).mappings().first()
        return self._map_atividade(row) if row else None

    def create_atividade(self, *, payload: dict, etapas: list[dict]) -> dict:
        first_stage = _to_int(self._normalize_etapas(etapas)[0].get("id")) or 1
        final_stage = self._get_final_stage_id(etapas)
        id_kanban = _to_int(payload.get("id_kanban")) or first_stage

        # finalizado is automatic: only true when the activity reaches the last stage.
        finalizado = id_kanban == final_stage
        data_finalizado = date.today() if finalizado else None

        data_criacao = _to_date(payload.get("data_criacao")) or date.today()

        params = {
            "id_kanban": id_kanban,
            "id_responsavel": _to_int(payload.get("id_responsavel")),
            "titulo": str(payload.get("titulo") or "").strip(),
            "descricao": payload.get("descricao"),
            "observacao": payload.get("observacao"),
            "data_criacao": data_criacao,
            "data_prazo": _to_date(payload.get("data_prazo")),
            "data_finalizado": data_finalizado,
            "finalizado": 1 if finalizado else 0,
            "urgencia": 1 if _to_bool(payload.get("urgencia")) else 0,
            "prioridade": str(payload.get("prioridade") or "media"),
        }

        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            inserted = conn.execute(text(KanbanQueries.SQL_INSERT_ATIVIDADE), params).mappings().first()
            if not inserted:
                raise ValueError("Nao foi possivel inserir a atividade.")
            id_atividade = _to_int(inserted.get("id_atividade"))
            row = conn.execute(
                text(KanbanQueries.SQL_SELECT_ATIVIDADE_BY_ID),
                {"id_atividade": id_atividade},
            ).mappings().first()
        if not row:
            raise ValueError("Atividade criada, mas nao encontrada para retorno.")
        return self._map_atividade(row)

    def update_atividade(self, *, id_atividade: int, payload: dict, etapas: list[dict]) -> dict | None:
        current = self.get_atividade(id_atividade=id_atividade)
        if not current:
            return None

        merged = dict(current)
        for key in (
            "id_kanban",
            "id_responsavel",
            "titulo",
            "descricao",
            "observacao",
            "data_criacao",
            "data_prazo",
            "data_finalizado",
            "finalizado",
            "urgencia",
            "prioridade",
        ):
            if key in payload:
                merged[key] = payload.get(key)

        final_stage = self._get_final_stage_id(etapas)
        id_kanban = _to_int(merged.get("id_kanban")) or 1
        # finalizado is automatic: only true when the activity reaches the last stage.
        finalizado = id_kanban == final_stage
        if finalizado:
            data_finalizado = _to_date(merged.get("data_finalizado")) or date.today()
        else:
            data_finalizado = None

        params = {
            "id_atividade": id_atividade,
            "id_kanban": id_kanban,
            "id_responsavel": _to_int(merged.get("id_responsavel")),
            "titulo": str(merged.get("titulo") or "").strip(),
            "descricao": merged.get("descricao"),
            "observacao": merged.get("observacao"),
            "data_criacao": _to_date(merged.get("data_criacao")) or date.today(),
            "data_prazo": _to_date(merged.get("data_prazo")),
            "data_finalizado": data_finalizado,
            "finalizado": 1 if finalizado else 0,
            "urgencia": 1 if _to_bool(merged.get("urgencia")) else 0,
            "prioridade": str(merged.get("prioridade") or "media"),
        }

        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            result = conn.execute(text(KanbanQueries.SQL_UPDATE_ATIVIDADE), params)
            if not (result.rowcount or 0):
                return None
            row = conn.execute(
                text(KanbanQueries.SQL_SELECT_ATIVIDADE_BY_ID),
                {"id_atividade": id_atividade},
            ).mappings().first()

        return self._map_atividade(row) if row else None

    def update_status(self, *, id_atividade: int, id_kanban: int, etapas: list[dict]) -> int:
        final_stage = self._get_final_stage_id(etapas)
        finalizado = id_kanban == final_stage
        data_finalizado = date.today() if finalizado else None

        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            result = conn.execute(
                text(KanbanQueries.SQL_UPDATE_ATIVIDADE_STATUS),
                {
                    "id_atividade": id_atividade,
                    "id_kanban": id_kanban,
                    "finalizado": 1 if finalizado else 0,
                    "data_finalizado": data_finalizado,
                },
            )
        return result.rowcount or 0

    def delete_atividade(self, *, id_atividade: int) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            result = conn.execute(
                text(KanbanQueries.SQL_DELETE_ATIVIDADE),
                {"id_atividade": id_atividade},
            )
        return result.rowcount or 0

    def get_etapas(self) -> list[dict]:
        try:
            db_key, profile = self._resolve_db_key(for_write=False)
            engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
            with engine.connect() as conn:
                rows = conn.execute(text(KanbanQueries.SQL_LIST_LOGS_RECENT)).mappings().all()
        except Exception:
            return [dict(item) for item in self.DEFAULT_ETAPAS]

        for row in rows:
            payload = self._parse_log_payload(row.get("json_registro"))
            if payload.get("kind") != "kanban_config":
                continue
            etapas = self._normalize_etapas(payload.get("etapas"))
            if etapas:
                return etapas
        return [dict(item) for item in self.DEFAULT_ETAPAS]

    def save_etapas(self, *, etapas: list[dict], id_responsavel: int | None = None) -> list[dict]:
        normalized = self._normalize_etapas(etapas)
        self._insert_log(
            id_responsavel=id_responsavel,
            payload={
                "kind": "kanban_config",
                "etapas": normalized,
                "local_alteracao": "Marketing > Kanban > Etapas",
                "dado_antigo": "",
                "dado_novo": "Etapas atualizadas",
            },
        )
        return normalized

    def log_history(
        self,
        *,
        acao: str,
        dado_antigo: str,
        dado_novo: str,
        local_alteracao: str = "Marketing > Kanban",
        id_responsavel: int | None = None,
    ) -> None:
        self._insert_log(
            id_responsavel=id_responsavel,
            payload={
                "kind": "history",
                "acao": acao,
                "responsavel": f"ID {id_responsavel}" if id_responsavel is not None else "Sistema",
                "dado_antigo": dado_antigo,
                "dado_novo": dado_novo,
                "local_alteracao": local_alteracao,
            },
        )

    def list_history(self) -> list[dict]:
        try:
            db_key, profile = self._resolve_db_key(for_write=False)
            engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
            with engine.connect() as conn:
                rows = conn.execute(text(KanbanQueries.SQL_LIST_HISTORY)).mappings().all()
        except Exception:
            return []

        history = []
        for row in rows:
            payload = self._parse_log_payload(row.get("json_registro"))
            if payload.get("kind") != "history":
                continue
            history.append(self._map_history(row, payload))
        return history

    def _insert_log(self, *, id_responsavel: int | None, payload: dict) -> None:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            conn.execute(
                text(KanbanQueries.SQL_INSERT_LOG),
                {
                    "id_responsavel": id_responsavel,
                    "data": date.today(),
                    "json_registro": json.dumps(payload, ensure_ascii=False),
                },
            )
