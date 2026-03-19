from __future__ import annotations

import logging
from datetime import date, datetime

from sqlalchemy import text

from database.db_provider import get_db_engine, list_all_databases
from database.queries import BlobStorageQueries

logger = logging.getLogger(__name__)

ORIGEM_ORION = "portifolio"


def _to_iso_date(value) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


class BlobStorageRepositorySql:
    def __init__(self, origem: str = ORIGEM_ORION):
        self._origem = origem

    def _resolve_db_key(self, *, for_write: bool = False) -> tuple[str, str]:
        available = list_all_databases()
        # db_blob_storage fica no banco dev
        if "dev" not in available:
            raise ValueError(
                "Banco 'dev' nao configurado. Configure o .env com DB_DATABASE_DEV e credenciais."
            )
        profiles = available.get("dev", [])
        if for_write and "writer" in profiles:
            return "dev", "writer"
        if for_write and "ddl" in profiles:
            return "dev", "ddl"
        if "reader" in profiles:
            return "dev", "reader"
        if profiles:
            return "dev", profiles[0]
        raise ValueError("Nenhum perfil configurado para o banco 'dev'.")

    def _map_row(self, row) -> dict:
        return {
            "id": row.get("id"),
            "origem": row.get("origem"),
            "caminho": row.get("caminho"),
            "nome_arquivo": row.get("nome_arquivo"),
            "tipo_arquivo": row.get("tipo_arquivo"),
            "id_responsavel": row.get("id_responsavel"),
            "descricao": row.get("descricao"),
            "categoria": row.get("categoria"),
            "versao": row.get("versao"),
            "data_criacao": _to_iso_date(row.get("data_criacao")),
        }

    def list_all(self) -> list[dict]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text(BlobStorageQueries.SQL_LIST_ALL),
                {"origem": self._origem},
            ).mappings().all()
        return [self._map_row(r) for r in rows]

    def list_by_categoria(self, categoria: str) -> list[dict]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text(BlobStorageQueries.SQL_LIST_BY_CATEGORIA),
                {"origem": self._origem, "categoria": categoria},
            ).mappings().all()
        return [self._map_row(r) for r in rows]

    def list_categorias(self) -> list[dict]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text(BlobStorageQueries.SQL_LIST_CATEGORIAS),
                {"origem": self._origem},
            ).mappings().all()
        return [
            {
                "categoria": row.get("categoria"),
                "total_arquivos": row.get("total_arquivos"),
                "ultima_atualizacao": _to_iso_date(row.get("ultima_atualizacao")),
            }
            for row in rows
        ]

    def list_all_caminhos(self) -> list[str]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text(BlobStorageQueries.SQL_LIST_ALL_CAMINHOS),
                {"origem": self._origem},
            ).mappings().all()
        return [r.get("caminho") for r in rows]

    def search(self, termo: str) -> list[dict]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.connect() as conn:
            rows = conn.execute(
                text(BlobStorageQueries.SQL_SEARCH),
                {"origem": self._origem, "termo": f"%{termo}%"},
            ).mappings().all()
        return [self._map_row(r) for r in rows]

    def upsert(self, *, caminho: str, nome_arquivo: str, tipo_arquivo: str,
               id_responsavel: str | None = None, descricao: str | None = None,
               categoria: str, versao: str | None = None,
               data_criacao: str) -> None:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.begin() as conn:
            conn.execute(
                text(BlobStorageQueries.SQL_UPSERT),
                {
                    "origem": self._origem,
                    "caminho": caminho,
                    "nome_arquivo": nome_arquivo,
                    "tipo_arquivo": tipo_arquivo,
                    "id_responsavel": id_responsavel,
                    "descricao": descricao,
                    "categoria": categoria,
                    "versao": versao,
                    "data_criacao": data_criacao,
                },
            )

    def delete_by_caminho(self, caminho: str) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.begin() as conn:
            result = conn.execute(
                text(BlobStorageQueries.SQL_DELETE_BY_CAMINHO),
                {"origem": self._origem, "caminho": caminho},
            )
        return result.rowcount or 0

    def delete_folder(self, prefix: str) -> int:
        """Deleta todos os registros de uma pasta no banco."""
        prefix = prefix.rstrip("/") + "/"
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.begin() as conn:
            result = conn.execute(
                text(BlobStorageQueries.SQL_DELETE_FOLDER),
                {"origem": self._origem, "prefix_like": prefix + "%"},
            )
        return result.rowcount or 0

    def rename_folder(self, old_prefix: str, new_prefix: str) -> int:
        """Renomeia pasta no banco: atualiza caminhos e categoria."""
        old_prefix = old_prefix.rstrip("/") + "/"
        new_prefix = new_prefix.rstrip("/") + "/"
        # Categoria é o primeiro nível após a origem (ex: "portifolio/Marketing/" → "Marketing")
        parts = new_prefix.rstrip("/").split("/")
        new_categoria = parts[1] if len(parts) > 1 and parts[0] == self._origem else parts[0]

        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)
        with engine.begin() as conn:
            result = conn.execute(
                text(BlobStorageQueries.SQL_RENAME_FOLDER),
                {
                    "origem": self._origem,
                    "old_prefix": old_prefix,
                    "new_prefix": new_prefix,
                    "new_categoria": new_categoria,
                    "old_like": old_prefix + "%",
                },
            )
        return result.rowcount or 0

    def sync_from_blobs(self, blob_records: list[dict]) -> dict:
        """Sincroniza a tabela db_blob_storage com a lista de blobs do Cloud.

        Faz upsert de todos e remove os que nao existem mais no blob (somente desta origem).
        """
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)

        upserted = 0
        removed = 0
        caminhos = set()

        with engine.begin() as conn:
            for record in blob_records:
                conn.execute(
                    text(BlobStorageQueries.SQL_UPSERT),
                    {
                        "origem": self._origem,
                        "caminho": record["caminho"],
                        "nome_arquivo": record["nome_arquivo"],
                        "tipo_arquivo": record["tipo_arquivo"],
                        "id_responsavel": record.get("id_responsavel"),
                        "descricao": record.get("descricao"),
                        "categoria": record["categoria"],
                        "versao": record.get("versao"),
                        "data_criacao": record["data_criacao"],
                    },
                )
                caminhos.add(record["caminho"])
                upserted += 1

            # Remove registros que nao existem mais no blob (somente desta origem)
            if caminhos:
                params = {f"p{i}": c for i, c in enumerate(caminhos)}
                params["origem"] = self._origem
                placeholders = ", ".join(f":p{i}" for i in range(len(caminhos)))
                sql = f"DELETE FROM db_blob_storage WHERE origem = :origem AND caminho NOT IN ({placeholders})"
                result = conn.execute(text(sql), params)
                removed = result.rowcount or 0
            else:
                result = conn.execute(
                    text("DELETE FROM db_blob_storage WHERE origem = :origem"),
                    {"origem": self._origem},
                )
                removed = result.rowcount or 0

        logger.info("Sync blob→DB [origem=%s]: %d upserted, %d removed", self._origem, upserted, removed)
        return {"upserted": upserted, "removed": removed}
