from __future__ import annotations

from sqlalchemy import text

from database.db_provider import get_db_engine, list_all_databases


class ColaboradoresRepository:
    def _resolve_db_key(self) -> tuple[str, str]:
        available = list_all_databases()
        if "secure" in available:
            profiles = available["secure"]
            for p in ("reader", "ddl", "writer"):
                if p in profiles:
                    return "secure", p
        raise ValueError("Banco secure não configurado no .env.")

    def list_comercial_ativos(self) -> list[str]:
        """Retorna nomes dos colaboradores ativos da área Comercial."""
        db_key, profile = self._resolve_db_key()
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT nome
                    FROM dbo.dadm_colaboradores
                    WHERE status = 'Ativo' AND area = 'Comercial'
                    ORDER BY nome
                """)
            ).fetchall()
        return [r[0] for r in rows if r[0]]

    def list_areas(self) -> list[str]:
        """Retorna todas as áreas distintas."""
        db_key, profile = self._resolve_db_key()
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT DISTINCT area
                    FROM dbo.dadm_colaboradores
                    WHERE area IS NOT NULL
                    ORDER BY area
                """)
            ).fetchall()
        return [r[0] for r in rows if r[0]]
