from __future__ import annotations

import base64

from sqlalchemy import text

from database.db_provider import get_db_engine, list_all_databases
from database.queries import ConteudoQueries


class ConteudoRepositorySql:
    def _is_schema_mismatch(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return "invalid column name" in message or "invalid column" in message

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

    def _map_row(self, row) -> dict:
        area = row.get("area")
        if not area:
            area = "Marketing"

        importancia = row.get("importancia")
        if isinstance(importancia, bool):
            importancia_value = importancia
        elif importancia is None:
            importancia_value = False
        else:
            try:
                importancia_value = bool(int(importancia))
            except (TypeError, ValueError):
                importancia_value = False
        return {
            "id_noticia": int(row.get("id_noticia")) if row.get("id_noticia") is not None else None,
            "titulo": row.get("titulo"),
            "descricao": row.get("descricao"),
            "link": row.get("link"),
            "status_post": row.get("status_post"),
            "observacao": row.get("observacao"),
            "area": area,
            "importancia": importancia_value,
            "possui_midia": bool(row.get("possui_midia")),
        }

    def _decode_base64(self, value: str | None) -> bytes | None:
        if not value:
            return None
        raw = value.strip()
        if not raw:
            return None
        if "," in raw and raw.lower().startswith("data:"):
            raw = raw.split(",", 1)[1]
        return base64.b64decode(raw)

    def list_noticias(self) -> list[dict]:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.connect() as conn:
            try:
                rows = conn.execute(text(ConteudoQueries.SQL_LIST_NOTICIAS_V3)).mappings().all()
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
                try:
                    rows = conn.execute(text(ConteudoQueries.SQL_LIST_NOTICIAS_V2)).mappings().all()
                except Exception as exc2:
                    if not self._is_schema_mismatch(exc2):
                        raise
                    rows = conn.execute(text(ConteudoQueries.SQL_LIST_NOTICIAS)).mappings().all()
        return [self._map_row(row) for row in rows]

    def create_noticia(
        self,
        *,
        titulo: str,
        descricao: str | None,
        link: str | None,
        status_post: str | None,
        observacao: str | None,
        importancia: bool | int | None,
        img_video_base64: str | None,
    ) -> dict:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            params = {
                "titulo": titulo,
                "descricao": descricao,
                "img_video": self._decode_base64(img_video_base64),
                "link": link,
                "status_post": status_post,
                "observacao": observacao,
                "importancia": 1 if bool(importancia) else 0,
            }
            try:
                inserted = conn.execute(
                    text(ConteudoQueries.SQL_INSERT_NOTICIA_V2),
                    params,
                ).mappings().first()
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
                inserted = conn.execute(
                    text(ConteudoQueries.SQL_INSERT_NOTICIA),
                    params,
                ).mappings().first()
            if not inserted:
                raise ValueError("Nao foi possivel inserir a noticia.")
            id_noticia = int(inserted["id_noticia"])
            try:
                conn.execute(
                    text(ConteudoQueries.SQL_TOUCH_NOTICIA_AREA_MARKETING),
                    {"id_noticia": id_noticia},
                )
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
            row = conn.execute(
                text(ConteudoQueries.SQL_SELECT_NOTICIA_BY_ID_V3),
                {"id_noticia": id_noticia},
            ).mappings().first()
            if not row:
                row = conn.execute(
                    text(ConteudoQueries.SQL_SELECT_NOTICIA_BY_ID_V2),
                    {"id_noticia": id_noticia},
                ).mappings().first()
            if not row:
                row = conn.execute(
                    text(ConteudoQueries.SQL_SELECT_NOTICIA_BY_ID),
                    {"id_noticia": id_noticia},
                ).mappings().first()
        if not row:
            raise ValueError("Noticia criada, mas nao encontrada para retorno.")
        return self._map_row(row)

    def get_midia(self, *, id_noticia: int) -> bytes | None:
        db_key, profile = self._resolve_db_key(for_write=False)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.connect() as conn:
            row = conn.execute(
                text(ConteudoQueries.SQL_GET_NOTICIA_MEDIA),
                {"id_noticia": id_noticia},
            ).fetchone()
        if not row or not row[0]:
            return None
        return bytes(row[0])

    def update_noticia(
        self,
        *,
        id_noticia: int,
        titulo: str | None,
        descricao: str | None,
        link: str | None,
        status_post: str | None,
        observacao: str | None,
        importancia: bool | int | None,
        img_video_base64: str | None,
        remove_midia: bool = False,
    ) -> int:
        img_video = self._decode_base64(img_video_base64)
        # Se remove_midia=True e não tem nova imagem, usa WITH_MEDIA passando img_video=None (SET img_video = NULL)
        update_media = img_video is not None or remove_midia
        sql_update_v2 = (
            ConteudoQueries.SQL_UPDATE_NOTICIA_WITH_MEDIA_V2
            if update_media
            else ConteudoQueries.SQL_UPDATE_NOTICIA_V2
        )
        sql_update_v1 = (
            ConteudoQueries.SQL_UPDATE_NOTICIA_WITH_MEDIA
            if update_media
            else ConteudoQueries.SQL_UPDATE_NOTICIA
        )
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            params = {
                "id_noticia": id_noticia,
                "titulo": titulo,
                "descricao": descricao,
                "img_video": img_video,
                "link": link,
                "status_post": status_post,
                "observacao": observacao,
                "importancia": None if importancia is None else (1 if bool(importancia) else 0),
            }
            try:
                result = conn.execute(text(sql_update_v2), params)
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
                result = conn.execute(text(sql_update_v1), params)
            try:
                conn.execute(
                    text(ConteudoQueries.SQL_TOUCH_NOTICIA_AREA_MARKETING),
                    {"id_noticia": id_noticia},
                )
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
        return result.rowcount or 0

    def delete_noticia(self, *, id_noticia: int) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            result = conn.execute(
                text(ConteudoQueries.SQL_DELETE_NOTICIA),
                {"id_noticia": id_noticia},
            )
        return result.rowcount or 0

    def mark_noticia_enviada(self, *, id_noticia: int) -> int:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            result = conn.execute(
                text(ConteudoQueries.SQL_MARK_NOTICIA_ENVIADA),
                {"id_noticia": id_noticia},
            )
            try:
                conn.execute(
                    text(ConteudoQueries.SQL_TOUCH_NOTICIA_AREA_MARKETING),
                    {"id_noticia": id_noticia},
                )
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
        return result.rowcount or 0

    def set_importancia(self, *, id_noticia: int, importancia: bool | int | None) -> bool:
        db_key, profile = self._resolve_db_key(for_write=True)
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.begin() as conn:
            conn.execute(
                text(ConteudoQueries.SQL_SET_NOTICIA_IMPORTANCIA),
                {
                    "id_noticia": id_noticia,
                    "importancia": None if importancia is None else (1 if bool(importancia) else 0),
                },
            )
            try:
                conn.execute(
                    text(ConteudoQueries.SQL_TOUCH_NOTICIA_AREA_MARKETING),
                    {"id_noticia": id_noticia},
                )
            except Exception as exc:
                if not self._is_schema_mismatch(exc):
                    raise
            row = conn.execute(
                text(ConteudoQueries.SQL_SELECT_NOTICIA_IMPORTANCIA),
                {"id_noticia": id_noticia},
            ).mappings().first()
        if not row:
            raise ValueError("Noticia nao encontrada.")
        value = row.get("importancia")
        try:
            return bool(int(value)) if value is not None else False
        except (TypeError, ValueError):
            return bool(value)
