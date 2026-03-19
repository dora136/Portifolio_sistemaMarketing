from pathlib import Path
import logging

from datetime import date

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from fastapi.templating import Jinja2Templates

from config.config import settings
from domain.template_models import TemplateCreatePayload, TemplateUpdatePayload
from infrastructure.db.blob_storage_repository import BlobStorageRepositorySql
from services.templates_store import TemplateNotFoundError, TemplateQuery, _blob_name_from_id, get_template_store

logger = logging.getLogger(__name__)

router = APIRouter(tags=["templates"])

BASE_DIR = Path(__file__).resolve().parent.parent
_templates = Jinja2Templates(directory=BASE_DIR / "templates")

_blob_repo = BlobStorageRepositorySql()


def _store():
    return get_template_store(
        provider=settings.TEMPLATES_STORE_PROVIDER,
        cloud_connection_string=settings.CLOUD_STORAGE_CONNECTION_STRING,
        cloud_container=settings.CLOUD_BLOB_CONTAINER_TEMPLATES,
        cloud_prefix=settings.CLOUD_BLOB_PREFIX_TEMPLATES,
        cloud_tenant_id=settings.CLOUD_TENANT_ID,
        cloud_client_id=settings.CLOUD_CLIENT_ID,
        cloud_client_secret=settings.CLOUD_CLIENT_SECRET,
        cloud_storage_account=settings.CLOUD_STORAGE_ACCOUNT,
    )


# ── Página HTML ───────────────────────────────────────────────────────────────

@router.get("/portifolio/templates", include_in_schema=False)
async def page_templates(request: Request):
    return _templates.TemplateResponse("page_templates.html", {"request": request})


# ── API JSON ──────────────────────────────────────────────────────────────────

@router.get("/portifolio/api/templates")
async def list_templates(
    q: str | None = None,
    categoria: str | None = None,
    tipo: str | None = None,
):
    store = _store()
    items = store.list(TemplateQuery(q=q, categoria=categoria, tipo=tipo))
    return {"ok": True, "templates": [item.model_dump() for item in items]}


@router.get("/portifolio/api/templates/{template_id}/download")
async def download_template(template_id: str):
    """Download do arquivo do blob Cloud."""
    store = _store()
    try:
        data, content_type = store.download(template_id)
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Download não suportado neste provider")

    try:
        blob_name = _blob_name_from_id(template_id)
        filename = blob_name.split("/")[-1]
    except Exception:
        filename = "arquivo"

    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/portifolio/api/templates/{template_id}/preview")
async def preview_template(template_id: str):
    """Serve o arquivo inline (preview de imagens)."""
    store = _store()
    try:
        data, content_type = store.download(template_id)
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Preview não suportado neste provider")

    return Response(content=data, media_type=content_type)


@router.get("/portifolio/api/templates/{template_id}")
async def get_template(template_id: str):
    store = _store()
    try:
        item = store.get(template_id)
        return {"ok": True, "template": item.model_dump()}
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template não encontrado")


@router.post("/portifolio/api/templates", status_code=201)
async def create_template(payload: TemplateCreatePayload):
    store = _store()
    item = store.create(payload)
    return {"ok": True, "template": item.model_dump()}


@router.put("/portifolio/api/templates/{template_id}")
async def update_template(template_id: str, payload: TemplateUpdatePayload):
    store = _store()
    try:
        item = store.update(template_id, payload)
        return {"ok": True, "template": item.model_dump()}
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template não encontrado")


@router.delete("/portifolio/api/templates/{template_id}")
async def delete_template(template_id: str, hard: bool = Query(default=True)):
    _ = hard
    store = _store()
    try:
        store.delete(template_id)
        return {"ok": True, "deleted": True}
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template não encontrado")


# ── API Blob Storage DB (pastas / sync) ───────────────────────────────────────

@router.post("/portifolio/api/blob-storage/sync")
async def sync_blob_storage():
    """Sincroniza o Cloud Blob Storage com a tabela db_blob_storage (somente origem=portifolio)."""
    from infrastructure.db.blob_storage_repository import ORIGEM_ORION

    store = _store()
    try:
        records = store.list_blob_records(origem=ORIGEM_ORION)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Sync não suportado neste provider")

    try:
        result = _blob_repo.sync_from_blobs(records)
        return {"ok": True, "total_blobs": len(records), **result}
    except Exception as e:
        logger.exception("Erro ao sincronizar blob storage com DB")
        raise HTTPException(status_code=500, detail=f"Erro na sincronização: {str(e)}")


@router.get("/portifolio/api/blob-storage/categorias")
async def list_blob_categorias():
    """Lista categorias (pastas) com contagem de arquivos."""
    try:
        categorias = _blob_repo.list_categorias()
        return {"ok": True, "categorias": categorias}
    except Exception as e:
        logger.exception("Erro ao listar categorias do blob storage")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portifolio/api/blob-storage/arquivos")
async def list_blob_arquivos(
    categoria: str | None = None,
    q: str | None = None,
):
    """Lista arquivos, opcionalmente filtrado por categoria ou busca."""
    try:
        if q:
            arquivos = _blob_repo.search(q)
        elif categoria:
            arquivos = _blob_repo.list_by_categoria(categoria)
        else:
            arquivos = _blob_repo.list_all()
        return {"ok": True, "arquivos": arquivos}
    except Exception as e:
        logger.exception("Erro ao listar arquivos do blob storage")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portifolio/api/blob-storage/tree")
async def blob_storage_tree():
    """Retorna todos os caminhos para montar a arvore de pastas no frontend."""
    try:
        caminhos = _blob_repo.list_all_caminhos()
        return {"ok": True, "caminhos": caminhos}
    except Exception as e:
        logger.exception("Erro ao listar arvore de caminhos")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portifolio/api/blob-storage/upload")
async def upload_blob_file(
    arquivo: UploadFile = File(...),
    pasta: str = Form(...),
    nome_arquivo: str = Form(...),
    descricao: str = Form(default=""),
    id_responsavel: str = Form(default=""),
):
    """Upload de arquivo para o Cloud Blob Storage + registro no banco.

    pasta pode ser aninhada: 'Marketing/Campanhas/2024'
    """
    store = _store()

    from infrastructure.db.blob_storage_repository import ORIGEM_ORION

    # Normalizar pasta: remover barras extras
    pasta = pasta.strip().strip("/")
    if not pasta:
        raise HTTPException(status_code=400, detail="Pasta é obrigatória")

    # Origem = prefixo no blob (ex: portifolio/)
    origem = ORIGEM_ORION

    # Categoria = primeiro nivel da pasta
    categoria = pasta.split("/")[0]

    # Ler conteudo do arquivo
    file_data = await arquivo.read()
    if not file_data:
        raise HTTPException(status_code=400, detail="Arquivo vazio")

    # Determinar content-type e extensao
    content_type = arquivo.content_type or "application/octet-stream"
    ext = nome_arquivo.rsplit(".", 1)[-1].lower() if "." in nome_arquivo else ""

    # Mapeamento extensao → tipo
    from services.templates_store import _EXT_TIPO
    tipo_arquivo = _EXT_TIPO.get(ext, "documento")

    try:
        # Upload para o blob — caminho final: origem/pasta/arquivo (ex: portifolio/Marketing/Campanhas/logo.png)
        caminho = store.upload_blob(
            categoria=f"{origem}/{pasta}",
            filename=nome_arquivo,
            data=file_data,
            content_type=content_type,
        )
    except AttributeError:
        raise HTTPException(status_code=501, detail="Upload não suportado neste provider")
    except Exception as e:
        logger.exception("Erro ao fazer upload para blob storage")
        raise HTTPException(status_code=500, detail=f"Erro no upload: {str(e)}")

    # Salvar no banco
    try:
        _blob_repo.upsert(
            caminho=caminho,
            nome_arquivo=nome_arquivo,
            tipo_arquivo=tipo_arquivo,
            id_responsavel=id_responsavel or None,
            descricao=descricao or None,
            categoria=categoria,
            versao=None,
            data_criacao=date.today().isoformat(),
        )
    except Exception as e:
        logger.exception("Erro ao salvar registro no banco (blob ja foi salvo)")
        raise HTTPException(status_code=500, detail=f"Arquivo salvo no blob, mas erro no banco: {str(e)}")

    return {
        "ok": True,
        "caminho": caminho,
        "nome_arquivo": nome_arquivo,
        "tipo_arquivo": tipo_arquivo,
        "pasta": pasta,
        "categoria": categoria,
    }


@router.post("/portifolio/api/blob-storage/excluir")
async def delete_blob_arquivo(caminho: str = Query(...)):
    """Exclui um arquivo do blob storage e do banco."""
    from infrastructure.db.blob_storage_repository import ORIGEM_ORION

    store = _store()
    origem = ORIGEM_ORION
    origem_prefix = origem + "/"

    # Deletar do blob — tentar caminho original e sem prefixo de origem (blobs legados)
    try:
        store.delete_blob_by_path(caminho)
    except Exception:
        pass
    if caminho.startswith(origem_prefix):
        try:
            store.delete_blob_by_path(caminho[len(origem_prefix):])
        except Exception:
            pass

    # Deletar do banco
    try:
        removed = _blob_repo.delete_by_caminho(caminho)
        return {"ok": True, "removed": removed}
    except Exception as e:
        logger.exception("Erro ao deletar registro do banco")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portifolio/api/blob-storage/renomear-pasta")
async def rename_blob_folder(
    pasta_atual: str = Form(...),
    pasta_nova: str = Form(...),
):
    """Renomeia uma pasta (move blobs e atualiza banco)."""
    from infrastructure.db.blob_storage_repository import ORIGEM_ORION

    pasta_atual = pasta_atual.strip().strip("/")
    pasta_nova = pasta_nova.strip().strip("/")

    if not pasta_atual or not pasta_nova:
        raise HTTPException(status_code=400, detail="Pasta atual e nova são obrigatórias")
    if pasta_atual == pasta_nova:
        return {"ok": True, "message": "Nenhuma alteração"}

    origem = ORIGEM_ORION
    store = _store()

    # Renomear no blob — tentar com prefixo de origem e sem (blobs legados)
    try:
        blob_count = store.rename_folder(f"{origem}/{pasta_atual}", f"{origem}/{pasta_nova}")
        blob_count += store.rename_folder(pasta_atual, f"{origem}/{pasta_nova}")
    except AttributeError:
        raise HTTPException(status_code=501, detail="Renomear não suportado neste provider")
    except Exception as e:
        logger.exception("Erro ao renomear pasta no blob")
        raise HTTPException(status_code=500, detail=f"Erro no blob: {str(e)}")

    # Renomear no banco (caminho no banco inclui origem/)
    try:
        db_count = _blob_repo.rename_folder(f"{origem}/{pasta_atual}", f"{origem}/{pasta_nova}")
    except Exception as e:
        logger.exception("Erro ao renomear pasta no banco")
        raise HTTPException(status_code=500, detail=f"Blob renomeado, erro no banco: {str(e)}")

    return {"ok": True, "blob_count": blob_count, "db_count": db_count}


@router.post("/portifolio/api/blob-storage/excluir-pasta")
async def delete_blob_folder(pasta: str = Form(...)):
    """Exclui uma pasta inteira (todos os arquivos) do blob e do banco."""
    from infrastructure.db.blob_storage_repository import ORIGEM_ORION

    pasta = pasta.strip().strip("/")
    if not pasta:
        raise HTTPException(status_code=400, detail="Pasta é obrigatória")

    origem = ORIGEM_ORION
    blob_prefix_with_origin = f"{origem}/{pasta}"
    blob_prefix_without_origin = pasta
    store = _store()

    # Deletar do blob — tentar com prefixo de origem e sem (blobs legados)
    try:
        blob_count = store.delete_folder(blob_prefix_with_origin)
        blob_count += store.delete_folder(blob_prefix_without_origin)
    except AttributeError:
        raise HTTPException(status_code=501, detail="Delete não suportado neste provider")
    except Exception as e:
        logger.exception("Erro ao excluir pasta do blob")
        raise HTTPException(status_code=500, detail=f"Erro no blob: {str(e)}")

    # Deletar do banco (caminho no banco tem prefixo de origem)
    try:
        db_count = _blob_repo.delete_folder(blob_prefix_with_origin)
    except Exception as e:
        logger.exception("Erro ao excluir pasta do banco")
        raise HTTPException(status_code=500, detail=f"Blob excluido, erro no banco: {str(e)}")

    return {"ok": True, "blob_count": blob_count, "db_count": db_count}
