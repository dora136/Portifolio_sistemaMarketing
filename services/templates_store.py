from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from datetime import date
from threading import RLock

from domain.template_models import Template, TemplateCreatePayload, TemplateUpdatePayload

logger = logging.getLogger(__name__)


class TemplateNotFoundError(KeyError):
    pass


@dataclass(frozen=True)
class TemplateQuery:
    q: str | None = None
    categoria: str | None = None
    tipo: str | None = None


class TemplateStore:
    def list(self, query: TemplateQuery | None = None) -> list[Template]:
        raise NotImplementedError

    def get(self, template_id: str) -> Template:
        raise NotImplementedError

    def create(self, payload: TemplateCreatePayload) -> Template:
        raise NotImplementedError

    def update(self, template_id: str, payload: TemplateUpdatePayload) -> Template:
        raise NotImplementedError

    def delete(self, template_id: str) -> None:
        raise NotImplementedError

    def download(self, template_id: str) -> tuple[bytes, str]:
        """Retorna (conteúdo em bytes, content_type). Opcional."""
        raise NotImplementedError

    def list_blob_records(self) -> list[dict]:
        """Retorna lista de dicts com dados do blob para sincronizar com o DB."""
        raise NotImplementedError


class InMemoryTemplateStore(TemplateStore):
    def __init__(self):
        self._lock = RLock()
        self._items: dict[str, Template] = {}
        self._seed_defaults()

    def _seed_defaults(self) -> None:
        pass

    def list(self, query: TemplateQuery | None = None) -> list[Template]:
        with self._lock:
            items = list(self._items.values())

        if not query:
            return items

        q = (query.q or "").strip().lower()
        categoria = (query.categoria or "").strip()
        tipo = (query.tipo or "").strip()

        def match(item: Template) -> bool:
            if q and (q not in item.titulo.lower() and q not in (item.descricao or "").lower()):
                return False
            if categoria and item.categoria != categoria:
                return False
            if tipo and item.tipo != tipo:
                return False
            return True

        return [item for item in items if match(item)]

    def get(self, template_id: str) -> Template:
        with self._lock:
            item = self._items.get(template_id)
        if not item:
            raise TemplateNotFoundError(template_id)
        return item

    def create(self, payload: TemplateCreatePayload) -> Template:
        item = Template(
            titulo=payload.titulo,
            descricao=payload.descricao or "",
            categoria=payload.categoria,
            tipo=payload.tipo,
            autor=payload.autor or "Usuário",
            preview=True if payload.preview is None else bool(payload.preview),
            conteudo=payload.conteudo,
        )
        with self._lock:
            self._items[item.id] = item
        return item

    def update(self, template_id: str, payload: TemplateUpdatePayload) -> Template:
        with self._lock:
            current = self._items.get(template_id)
            if not current:
                raise TemplateNotFoundError(template_id)
            data = current.model_dump()
            updates = payload.model_dump(exclude_unset=True)
            data.update({k: v for k, v in updates.items() if v is not None})
            updated = Template(**data)
            self._items[template_id] = updated
            return updated

    def delete(self, template_id: str) -> None:
        with self._lock:
            if template_id not in self._items:
                raise TemplateNotFoundError(template_id)
            del self._items[template_id]


# ── Mapeamento extensão → tipo ────────────────────────────────────────────────

_EXT_TIPO: dict[str, str] = {
    "jpg": "imagem", "jpeg": "imagem", "png": "imagem", "gif": "imagem",
    "svg": "imagem", "webp": "imagem", "bmp": "imagem",
    "mp4": "video", "mov": "video", "avi": "video", "mkv": "video", "webm": "video",
    "pdf": "documento", "docx": "documento", "doc": "documento",
    "xlsx": "documento", "xls": "documento", "pptx": "documento", "ppt": "documento",
    "html": "email", "htm": "email",
    "ai": "layout", "psd": "layout", "fig": "layout", "sketch": "layout",
    "zip": "documento", "rar": "documento",
}

_CONTENT_TYPE: dict[str, str] = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif",
    "svg": "image/svg+xml", "webp": "image/webp", "bmp": "image/bmp",
    "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "html": "text/html", "htm": "text/html",
    "zip": "application/zip",
}


def _ext(blob_name: str) -> str:
    return blob_name.rsplit(".", 1)[-1].lower() if "." in blob_name else ""


def _blob_id(blob_name: str) -> str:
    """Codifica o nome do blob em base64url para usar como ID na URL."""
    return base64.urlsafe_b64encode(blob_name.encode()).decode().rstrip("=")


def _blob_name_from_id(blob_id: str) -> str:
    """Decodifica o ID base64url de volta para o nome do blob."""
    padding = 4 - len(blob_id) % 4
    padded = blob_id + "=" * (padding % 4)
    return base64.urlsafe_b64decode(padded).decode()


class CloudBlobTemplateStore(TemplateStore):
    def __init__(self, *, tenant_id: str, client_id: str, client_secret: str,
                 account_url: str, container: str, prefix: str):
        from cloud.identity import ClientSecretCredential
        from cloud.storage.blob import BlobServiceClient

        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
        service_client = BlobServiceClient(account_url=account_url, credential=credential)
        self._container = service_client.get_container_client(container)
        self._prefix = prefix
        logger.info("CloudBlobTemplateStore iniciado — container: %s, prefix: %r", container, prefix)

    def _blob_to_template(self, blob) -> Template:
        name: str = blob.name
        display = name[len(self._prefix):] if self._prefix and name.startswith(self._prefix) else name

        ext = _ext(display)
        tipo = _EXT_TIPO.get(ext, "documento")

        parts = display.split("/")
        categoria = parts[0] if len(parts) > 1 else "Geral"
        filename = parts[-1]
        titulo = filename.rsplit(".", 1)[0] if "." in filename else filename
        titulo = titulo.replace("-", " ").replace("_", " ")

        last_mod = getattr(blob, "last_modified", None)
        data_str = last_mod.strftime("%Y-%m-%d") if last_mod else date.today().isoformat()

        size_bytes = getattr(blob, "size", 0) or 0
        descricao = f"{display}  •  {_human_size(size_bytes)}"

        metadata = getattr(blob, "metadata", None) or {}
        autor = metadata.get("author") or metadata.get("autor") or "Marketing"

        return Template(
            id=_blob_id(name),
            titulo=titulo,
            descricao=descricao,
            categoria=categoria,
            tipo=tipo,
            autor=autor,
            data=data_str,
            preview=(tipo == "imagem"),
            conteudo=name,  # caminho real no blob (usado no download)
        )

    def list(self, query: TemplateQuery | None = None) -> list[Template]:
        prefix = self._prefix or None
        blobs = list(self._container.list_blobs(name_starts_with=prefix, include=["metadata"]))
        templates = [self._blob_to_template(b) for b in blobs]

        if not query:
            return templates

        q = (query.q or "").strip().lower()
        categoria = (query.categoria or "").strip()
        tipo = (query.tipo or "").strip()

        def match(item: Template) -> bool:
            if q and q not in item.titulo.lower() and q not in (item.descricao or "").lower():
                return False
            if categoria and item.categoria != categoria:
                return False
            if tipo and item.tipo != tipo:
                return False
            return True

        return [t for t in templates if match(t)]

    def get(self, template_id: str) -> Template:
        blob_name = _blob_name_from_id(template_id)
        blob_client = self._container.get_blob_client(blob_name)
        try:
            props = blob_client.get_blob_properties()
        except Exception:
            raise TemplateNotFoundError(template_id)

        # Constrói um objeto "blob-like" para reusar _blob_to_template
        class _BlobProxy:
            name = blob_name
            last_modified = props.last_modified
            size = props.size
            metadata = props.metadata or {}

        return self._blob_to_template(_BlobProxy())

    def download(self, template_id: str) -> tuple[bytes, str]:
        blob_name = _blob_name_from_id(template_id)
        ext = _ext(blob_name)
        content_type = _CONTENT_TYPE.get(ext, "application/octet-stream")
        data = self._container.get_blob_client(blob_name).download_blob().readall()
        return data, content_type

    def upload_blob(self, *, categoria: str, filename: str, data: bytes,
                     content_type: str = "application/octet-stream",
                     metadata: dict | None = None) -> str:
        """Faz upload de um arquivo para o blob storage. Retorna o caminho completo."""
        from cloud.storage.blob import ContentSettings

        blob_path = f"{self._prefix}{categoria}/{filename}" if self._prefix else f"{categoria}/{filename}"
        blob_client = self._container.get_blob_client(blob_path)
        blob_client.upload_blob(
            data, overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
            metadata=metadata or {},
        )
        logger.info("Blob uploaded: %s", blob_path)
        return blob_path

    def delete_blob_by_path(self, caminho: str) -> None:
        """Deleta um blob pelo caminho completo."""
        self._container.get_blob_client(caminho).delete_blob()
        logger.info("Blob deletado por caminho: %s", caminho)

    def delete_folder(self, prefix: str) -> int:
        """Deleta todos os blobs dentro de uma pasta."""
        prefix = prefix.rstrip("/") + "/"
        blobs = list(self._container.list_blobs(name_starts_with=prefix))
        count = 0
        for blob in blobs:
            self._container.get_blob_client(blob.name).delete_blob()
            count += 1
        logger.info("Pasta deletada: %s (%d blobs)", prefix, count)
        return count

    def rename_folder(self, old_prefix: str, new_prefix: str) -> int:
        """Renomeia uma pasta (move todos os blobs de old_prefix para new_prefix)."""
        import time

        old_prefix = old_prefix.rstrip("/") + "/"
        new_prefix = new_prefix.rstrip("/") + "/"

        blobs = list(self._container.list_blobs(name_starts_with=old_prefix))
        count = 0
        for blob in blobs:
            old_name = blob.name
            new_name = new_prefix + old_name[len(old_prefix):]

            # Copiar para novo caminho e aguardar conclusão
            source_blob = self._container.get_blob_client(old_name)
            new_blob = self._container.get_blob_client(new_name)
            copy = new_blob.start_copy_from_url(source_blob.url)

            # Aguardar cópia finalizar antes de deletar o original
            while True:
                props = new_blob.get_blob_properties()
                status = props.copy.status
                if status == "success":
                    break
                if status in ("failed", "aborted"):
                    raise RuntimeError(f"Cópia falhou para {new_name}: {status}")
                time.sleep(0.3)

            # Deletar original após cópia confirmada
            source_blob.delete_blob()
            count += 1
            logger.info("Blob renomeado: %s -> %s", old_name, new_name)

        return count

    def create(self, payload: TemplateCreatePayload) -> Template:
        raise RuntimeError("Upload via API não suportado para cloud_blob. Use o portal Cloud ou o Storage Explorer.")

    def update(self, template_id: str, payload: TemplateUpdatePayload) -> Template:
        raise RuntimeError("Edição via API não suportada para cloud_blob.")

    def delete(self, template_id: str) -> None:
        blob_name = _blob_name_from_id(template_id)
        self._container.get_blob_client(blob_name).delete_blob()
        logger.info("Blob deletado: %s", blob_name)

    def list_blob_records(self, origem: str = "") -> list[dict]:
        """Lista blobs e retorna dados para sincronizar com db_blob_storage.

        Se origem for informada, inclui blobs que começam com origem/ E
        blobs que não começam com nenhuma origem conhecida (blobs soltos).
        Blobs soltos são tratados como pertencentes à origem informada.
        """
        prefix = self._prefix or None
        blobs = list(self._container.list_blobs(name_starts_with=prefix, include=["metadata"]))
        records = []

        origem_prefix = (origem.strip("/") + "/") if origem else ""

        for blob in blobs:
            name: str = blob.name
            display = name[len(self._prefix):] if self._prefix and name.startswith(self._prefix) else name

            # Determinar se o blob pertence a esta origem
            has_origin_prefix = origem_prefix and display.startswith(origem_prefix)

            if origem_prefix and not has_origin_prefix:
                # Blob solto (sem prefixo de origem) — incluir como desta origem
                # O caminho no banco será origem/caminho_original
                pass

            ext = _ext(display)
            tipo = _EXT_TIPO.get(ext, "documento")

            if has_origin_prefix:
                # Blob com prefixo de origem: portifolio/pasta/arquivo.png
                after_origin = display[len(origem_prefix):]
                origin_parts = after_origin.split("/")
                categoria = origin_parts[0] if len(origin_parts) > 1 else "Geral"
                caminho_db = display  # manter como está: portifolio/pasta/arquivo.png
            elif origem_prefix:
                # Blob solto: pasta/arquivo.png — tratar como portifolio/pasta/arquivo.png
                parts = display.split("/")
                categoria = parts[0] if len(parts) > 1 else "Geral"
                caminho_db = origem_prefix + display  # adicionar: portifolio/pasta/arquivo.png
            else:
                parts = display.split("/")
                categoria = parts[0] if len(parts) > 1 else "Geral"
                caminho_db = display

            filename = display.split("/")[-1]

            last_mod = getattr(blob, "last_modified", None)
            data_str = last_mod.strftime("%Y-%m-%d") if last_mod else date.today().isoformat()

            metadata = getattr(blob, "metadata", None) or {}
            autor = metadata.get("author") or metadata.get("autor") or None
            descricao = metadata.get("descricao") or metadata.get("description") or None
            versao = metadata.get("versao") or metadata.get("version") or None

            records.append({
                "caminho": caminho_db,
                "nome_arquivo": filename,
                "tipo_arquivo": tipo,
                "id_responsavel": autor,
                "descricao": descricao,
                "categoria": categoria,
                "versao": versao,
                "data_criacao": data_str,
            })
        return records


def _human_size(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


# ── Singleton ─────────────────────────────────────────────────────────────────

_STORE_SINGLETON: TemplateStore | None = None


def get_template_store(
    *,
    provider: str,
    cloud_connection_string: str | None = None,
    cloud_container: str = "botcloud",
    cloud_prefix: str = "",
    cloud_tenant_id: str | None = None,
    cloud_client_id: str | None = None,
    cloud_client_secret: str | None = None,
    cloud_storage_account: str | None = None,
) -> TemplateStore:
    global _STORE_SINGLETON

    if provider.strip().lower() in {"cloud", "cloud_blob"}:
        # Service Principal (preferido)
        if all([cloud_tenant_id, cloud_client_id, cloud_client_secret, cloud_storage_account]):
            if _STORE_SINGLETON is None or not isinstance(_STORE_SINGLETON, CloudBlobTemplateStore):
                account_url = f"https://{cloud_storage_account}.blob.core.windows.net"
                _STORE_SINGLETON = CloudBlobTemplateStore(
                    tenant_id=cloud_tenant_id,
                    client_id=cloud_client_id,
                    client_secret=cloud_client_secret,
                    account_url=account_url,
                    container=cloud_container,
                    prefix=cloud_prefix,
                )
            return _STORE_SINGLETON

        raise RuntimeError(
            "Para TEMPLATES_STORE_PROVIDER=cloud_blob configure: "
            "CLOUD_TENANT_ID, CLOUD_CLIENT_ID, CLOUD_CLIENT_SECRET, CLOUD_STORAGE_ACCOUNT"
        )

    if _STORE_SINGLETON is None or not isinstance(_STORE_SINGLETON, InMemoryTemplateStore):
        _STORE_SINGLETON = InMemoryTemplateStore()
    return _STORE_SINGLETON
