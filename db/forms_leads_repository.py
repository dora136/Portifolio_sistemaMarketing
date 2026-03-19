from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import text

from database.db_provider import get_db_engine, list_all_databases


class FormsLeadsRepositorySql:
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
        raise ValueError("Nenhum banco configurado. Configure o .env com DB_SERVER e credenciais.")

    def _map_row(self, row) -> dict:
        def _iso(val):
            if isinstance(val, datetime):
                return val.isoformat()
            return val

        return {
            "id_lead": row.get("id_lead"),
            "submission_id": row.get("submission_id"),
            "contact_id": row.get("contact_id"),
            "contact_name": row.get("contact_name"),
            "form_id": row.get("form_id"),
            "form_name": row.get("form_name"),
            "submission_data": row.get("submission_data"),
            "origem": row.get("origem"),
            "created_date": _iso(row.get("created_date")),
            "imported_at": _iso(row.get("imported_at")),
            "redirecionar": row.get("redirecionar"),
            "area": row.get("area"),
        }

    def list_leads(self, limit: int = 100) -> list[dict]:
        db_key, profile = self._resolve_db_key()
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT TOP (:limit)
                        id_lead, submission_id, contact_id, contact_name,
                        form_id, form_name, submission_data, origem,
                        created_date, imported_at, redirecionar, area
                    FROM dbo.db_mkt_forms_leads
                    ORDER BY imported_at DESC
                """),
                {"limit": limit},
            ).mappings().all()
        return [self._map_row(row) for row in rows]

    def update_lead_fields(self, *, id_lead: int, redirecionar: str | None, area: str | None) -> None:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.begin() as conn:
            conn.execute(
                text("""
                    UPDATE dbo.db_mkt_forms_leads
                    SET redirecionar = :redirecionar,
                        area         = :area
                    WHERE id_lead = :id_lead
                """),
                {"id_lead": id_lead, "redirecionar": redirecionar, "area": area},
            )

    def upsert_lead(
        self,
        *,
        submission_id: str | None,
        contact_id: str | None,
        contact_name: str | None,
        form_id: str | None,
        form_name: str | None,
        submission_data: dict | None,
        origem: str,
        created_date: str | None,
    ) -> None:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)
        data_json = json.dumps(submission_data, ensure_ascii=False) if submission_data else None
        with engine.begin() as conn:
            conn.execute(
                text("""
                    MERGE dbo.db_mkt_forms_leads AS target
                    USING (SELECT :submission_id AS submission_id) AS source
                        ON target.submission_id = source.submission_id
                    WHEN MATCHED THEN
                        UPDATE SET
                            contact_name    = COALESCE(:contact_name,    target.contact_name),
                            form_name       = COALESCE(:form_name,       target.form_name),
                            submission_data = COALESCE(:submission_data, target.submission_data)
                    WHEN NOT MATCHED THEN
                        INSERT (submission_id, contact_id, contact_name, form_id, form_name,
                                submission_data, origem, created_date)
                        VALUES (:submission_id, :contact_id, :contact_name, :form_id, :form_name,
                                :submission_data, :origem, :created_date);
                """),
                {
                    "submission_id": submission_id,
                    "contact_id": contact_id,
                    "contact_name": contact_name,
                    "form_id": form_id,
                    "form_name": form_name,
                    "submission_data": data_json,
                    "origem": origem,
                    "created_date": created_date,
                },
            )
