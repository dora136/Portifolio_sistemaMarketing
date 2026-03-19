from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy import text

from config.config import settings
from database.db_provider import (
    get_db_engine,
    list_all_databases,
    validate_environment,
)
from infrastructure.db.conteudo_repository import ConteudoRepositorySql
from infrastructure.db.acessos_repository import AcessosRepositorySql
from infrastructure.db.eventos_repository import EventosRepositorySql
from infrastructure.db.kanban_repository import KanbanRepositorySql
from infrastructure.db.forms_leads_repository import FormsLeadsRepositorySql
from infrastructure.db.colaboradores_repository import ColaboradoresRepository
from services.forms_instance import extract_instance_id
from services.forms_http import FormsApiError
from services.forms_updates import fetch_recent_form_updates
from services.forms_webhook_store import (
    format_relative_pt_br_from_epoch,
    get_forms_webhook_store,
 )
from services.demo_data import (
    get_demo_acessos, get_demo_eventos, get_demo_noticias,
    get_demo_kanban_data, get_demo_kanban_etapas, get_demo_kanban_historico,
    get_demo_colaboradores, get_demo_areas, get_demo_leads,
    get_demo_ga4_sessions, get_demo_ga4_behavior, get_demo_ga4_blog,
    get_demo_ga4_kpi, get_demo_forms_analytics, get_demo_webhook_events,
    get_demo_blog_posts, get_demo_site_info,
)


router = APIRouter(prefix="/portifolio", tags=["home"])

BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")
FRONTEND_DIST_DIR = BASE_DIR / "static" / "marketing"
FRONTEND_INDEX = FRONTEND_DIST_DIR / "index.html"


class EventoUpdatePayload(BaseModel):
    nome: str | None = None
    data_inicio: str | None = None
    data_fim: str | None = None
    nivel: str | None = None
    local: str | None = None
    cidade: str | None = None
    site: str | None = None
    permissoe: str | None = None


class EventoCreatePayload(BaseModel):
    nome: str | None = None
    data_inicio: str | None = None
    data_fim: str | None = None
    nivel: str | None = None
    local: str | None = None
    cidade: str | None = None
    site: str | None = None
    permissoe: str | None = None


class ConteudoPayload(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    link: str | None = None
    status_post: str | None = None
    observacao: str | None = None
    importancia: bool | int | None = None
    img_video_base64: str | None = None
    remove_midia: bool | None = None


class NoticiaImportanciaPayload(BaseModel):
    importancia: bool | int | None = None


class KanbanActivityPayload(BaseModel):
    id_kanban: int | None = None
    id_responsavel: int | None = None
    titulo: str | None = None
    descricao: str | None = None
    observacao: str | None = None
    data_criacao: str | None = None
    data_prazo: str | None = None
    data_finalizado: str | None = None
    finalizado: bool | None = None
    urgencia: bool | None = None
    prioridade: str | None = None
    change_count: int | None = None


class KanbanStatusPayload(BaseModel):
    id_atividade: int
    id_kanban: int
    id_responsavel: int | None = None


class KanbanEtapaPayload(BaseModel):
    id: int
    nome: str
    cor: str


class KanbanEtapasPayload(BaseModel):
    etapas: list[KanbanEtapaPayload]
    id_responsavel: int | None = None


class AcessoCreatePayload(BaseModel):
    plataforma: str | None = None
    valor: float | None = None
    data_referencia: str | None = None
    link: str | None = None
    email: str | None = None
    senha: str | None = None


class AcessoUpdatePayload(BaseModel):
    plataforma: str | None = None
    valor: float | None = None
    data_referencia: str | None = None
    link: str | None = None
    email: str | None = None
    senha: str | None = None


def frontend_is_built() -> bool:
    return FRONTEND_INDEX.exists()


def _payload_to_dict(payload: BaseModel) -> dict:
    if hasattr(payload, "model_dump"):
        return payload.model_dump(exclude_unset=True)  # type: ignore[attr-defined]
    return payload.dict(exclude_unset=True)


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    if frontend_is_built():
        return FileResponse(FRONTEND_INDEX)

    return templates.TemplateResponse(
        "page_home.html",
        {
            "request": request,
            "app_name": settings.APP_NAME,
            "portal_url": settings.PORTAL_URL or "#",
            "frontend_built": False,
        },
    )


@router.get("/home", include_in_schema=False)
async def home_route(request: Request):
    if frontend_is_built():
        return FileResponse(FRONTEND_INDEX)
    return templates.TemplateResponse(
        "page_home.html",
        {
            "request": request,
            "app_name": settings.APP_NAME,
            "portal_url": settings.PORTAL_URL or "#",
            "frontend_built": False,
        },
    )


@router.get("/api/db/status")
async def db_status():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"status": "demo", "mode": "demonstração", "databases": {}}
    return {
        "environment": validate_environment(),
        "databases": list_all_databases(),
    }


@router.get("/api/config")
async def app_config():
    return {
        "ok": True,
        "portal_url": settings.PORTAL_URL or "#",
        "app_name": settings.APP_NAME,
    }


@router.get("/api/acessos")
async def list_acessos():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "acessos": get_demo_acessos()}
    try:
        repository = AcessosRepositorySql()
        acessos = repository.list_acessos()
        for item in acessos:
            item.pop("area", None)
        return {"ok": True, "acessos": acessos}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/acessos")
async def create_acesso(payload: AcessoCreatePayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"id_assinatura": 99, "message": "Demo: registro simulado"}
    if not payload.plataforma:
        raise HTTPException(status_code=400, detail="Campo obrigatorio: plataforma")

    try:
        repository = AcessosRepositorySql()
        item = repository.create_acesso(
            plataforma=payload.plataforma,
            valor=payload.valor,
            data_referencia=payload.data_referencia,
            link=payload.link,
            email=payload.email,
            senha=payload.senha,
        )
        item.pop("area", None)
        return {"ok": True, "acesso": item}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/api/acessos/{id_assinatura}")
async def update_acesso(id_assinatura: int, payload: AcessoUpdatePayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: atualizado com sucesso"}
    updates = _payload_to_dict(payload)
    if "plataforma" not in updates:
        raise HTTPException(status_code=400, detail="Campo obrigatorio: plataforma")

    try:
        repository = AcessosRepositorySql()
        updated = repository.update_acesso(
            id_assinatura=id_assinatura,
            plataforma=str(updates.get("plataforma") or ""),
            valor=updates.get("valor"),
            data_referencia=updates.get("data_referencia"),
            link=updates.get("link"),
            email=updates.get("email"),
            senha=updates.get("senha"),
        )
        if updated == 0:
            raise HTTPException(status_code=404, detail="Acesso nao encontrado")
        return {"ok": True, "updated": updated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/api/acessos/{id_assinatura}")
async def delete_acesso(id_assinatura: int):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: removido com sucesso"}
    try:
        repository = AcessosRepositorySql()
        deleted = repository.delete_acesso(id_assinatura=id_assinatura)
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Acesso nao encontrado")
        return {"ok": True, "deleted": deleted}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/db/test")
async def db_test(
    db_key: str = Query(default="dev"),
    profile: str = Query(default="reader"),
):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "mode": "demo"}
    try:
        engine = get_db_engine(db_key=db_key, profile=profile)  # type: ignore[arg-type]
        with engine.connect() as conn:
            value = conn.execute(text("SELECT 1")).scalar()
        return {"ok": True, "db_key": db_key, "profile": profile, "result": value}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/eventos")
async def list_eventos():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "eventos": get_demo_eventos()}
    try:
        repository = EventosRepositorySql()
        eventos = repository.list_eventos()
        return {"ok": True, "eventos": eventos}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/eventos")
async def create_evento(payload: EventoCreatePayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"id_evento": 99, "message": "Demo: evento criado"}
    if not payload.nome or not payload.data_inicio or not payload.nivel:
        raise HTTPException(
            status_code=400,
            detail="Campos obrigatorios: nome, data_inicio, nivel",
        )
    try:
        repository = EventosRepositorySql()
        evento = repository.create_evento(
            nome=payload.nome,
            data_inicio=payload.data_inicio,
            data_fim=payload.data_fim or payload.data_inicio,
            nivel=payload.nivel,
            local=payload.local,
            cidade=payload.cidade,
            site=payload.site,
            permissoe=payload.permissoe,
        )
        return {"ok": True, "evento": evento}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/api/eventos/{id_evento}")
async def update_evento(id_evento: int, payload: EventoUpdatePayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: evento atualizado"}
    try:
        repository = EventosRepositorySql()
        updated = repository.update_evento(
            id_evento=id_evento,
            nome=payload.nome,
            data_inicio=payload.data_inicio,
            data_fim=payload.data_fim,
            nivel=payload.nivel,
            local=payload.local,
            cidade=payload.cidade,
            site=payload.site,
            permissoe=payload.permissoe,
        )
        if updated == 0:
            raise HTTPException(status_code=404, detail="Evento nao encontrado")
        return {"ok": True, "updated": updated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/api/eventos/{id_evento}")
async def delete_evento(id_evento: int):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: evento removido"}
    try:
        repository = EventosRepositorySql()
        deleted = repository.delete_evento(id_evento=id_evento)
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Evento nao encontrado")
        return {"ok": True, "deleted": deleted}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/canal-noticias")
async def list_conteudo():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "noticias": get_demo_noticias()}
    try:
        repository = ConteudoRepositorySql()
        noticias = repository.list_noticias()
        return {"ok": True, "noticias": noticias}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/canal-noticias")
async def create_conteudo(payload: ConteudoPayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"id_noticia": 99, "message": "Demo: notícia criada"}
    if not payload.titulo:
        raise HTTPException(status_code=400, detail="Campo obrigatorio: titulo")
    try:
        repository = ConteudoRepositorySql()
        noticia = repository.create_noticia(
            titulo=payload.titulo,
            descricao=payload.descricao,
            link=payload.link,
            status_post=payload.status_post or "rascunho",
            observacao=payload.observacao,
            importancia=payload.importancia,
            img_video_base64=payload.img_video_base64,
        )
        return {"ok": True, "noticia": noticia}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/canal-noticias/{id_noticia}/midia")
async def get_conteudo_midia(id_noticia: int):
    """Serve a imagem/vídeo armazenado em img_video para a notícia indicada."""
    if settings.PORTIFOLIO_DEMO_MODE:
        raise HTTPException(status_code=404, detail="Demo: sem mídia")
    import json as _json
    import base64 as _b64
    from fastapi.responses import Response as _Response

    repository = ConteudoRepositorySql()
    raw = repository.get_midia(id_noticia=id_noticia)
    if not raw:
        raise HTTPException(status_code=404, detail="Midia nao encontrada.")

    # Formato JSON: [{"mime": "image/jpeg", "data": "<base64>"}]
    try:
        payload_json = _json.loads(raw.decode("utf-8"))
        if isinstance(payload_json, list) and payload_json:
            item = payload_json[0]
            mime = item.get("mime", "image/jpeg")
            img_data = _b64.b64decode(item["data"])
            return _Response(content=img_data, media_type=mime)
    except Exception:
        pass

    # Fallback: binário direto
    return _Response(content=raw, media_type="image/jpeg")


@router.put("/api/canal-noticias/{id_noticia}")
async def update_conteudo(id_noticia: int, payload: ConteudoPayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: notícia atualizada"}
    try:
        repository = ConteudoRepositorySql()
        updated = repository.update_noticia(
            id_noticia=id_noticia,
            titulo=payload.titulo,
            descricao=payload.descricao,
            link=payload.link,
            status_post=payload.status_post,
            observacao=payload.observacao,
            importancia=payload.importancia,
            img_video_base64=payload.img_video_base64,
            remove_midia=bool(payload.remove_midia),
        )
        if updated == 0:
            raise HTTPException(status_code=404, detail="Noticia nao encontrada")
        return {"ok": True, "updated": updated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/api/canal-noticias/{id_noticia}")
async def delete_conteudo(id_noticia: int):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: notícia removida"}
    try:
        repository = ConteudoRepositorySql()
        deleted = repository.delete_noticia(id_noticia=id_noticia)
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Noticia nao encontrada")
        return {"ok": True, "deleted": deleted}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/canal-noticias/{id_noticia}/enviar")
async def enviar_conteudo(id_noticia: int):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: notícia enviada"}
    try:
        repository = ConteudoRepositorySql()
        updated = repository.mark_noticia_enviada(id_noticia=id_noticia)
        if updated == 0:
            raise HTTPException(status_code=404, detail="Noticia nao encontrada")
        return {"ok": True, "updated": updated, "status_post": "enviado"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/canal-noticias/{id_noticia}/importancia")
async def set_importancia_conteudo(id_noticia: int, payload: NoticiaImportanciaPayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"importancia": 1}
    try:
        repository = ConteudoRepositorySql()
        value = repository.set_importancia(id_noticia=id_noticia, importancia=payload.importancia)
        return {"ok": True, "importancia": value}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/kanban/data")
async def kanban_data():
    if settings.PORTIFOLIO_DEMO_MODE:
        _demo = get_demo_kanban_data()
        return {"ok": True, "items": _demo["atividades"], "etapas": _demo["etapas"]}
    try:
        repository = KanbanRepositorySql()
        etapas = repository.get_etapas()
        items = repository.list_atividades()
        return {"ok": True, "items": items, "etapas": etapas}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/kanban/historico")
async def kanban_historico():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "items": get_demo_kanban_historico()}
    try:
        repository = KanbanRepositorySql()
        items = repository.list_history()
        return {"ok": True, "items": items}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/kanban/etapas")
async def kanban_etapas():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "etapas": get_demo_kanban_etapas()}
    try:
        repository = KanbanRepositorySql()
        etapas = repository.get_etapas()
        return {"ok": True, "etapas": etapas}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/kanban/etapas")
async def update_kanban_etapas(payload: KanbanEtapasPayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: etapas salvas"}
    if not payload.etapas:
        raise HTTPException(status_code=400, detail="Informe ao menos uma etapa.")
    try:
        repository = KanbanRepositorySql()
        etapas = repository.save_etapas(
            etapas=[_payload_to_dict(item) for item in payload.etapas],
            id_responsavel=payload.id_responsavel,
        )
        repository.log_history(
            acao="atualizar_etapas",
            dado_antigo="",
            dado_novo=f"{len(etapas)} etapa(s) configurada(s)",
            local_alteracao="Marketing > Kanban > Etapas",
            id_responsavel=payload.id_responsavel,
        )
        return {"ok": True, "etapas": etapas}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/kanban/criar")
async def create_kanban_atividade(payload: KanbanActivityPayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"id_atividade": 99, "message": "Demo: atividade criada"}
    if not payload.titulo:
        raise HTTPException(status_code=400, detail="Campo obrigatorio: titulo")
    try:
        repository = KanbanRepositorySql()
        etapas = repository.get_etapas()
        atividade = repository.create_atividade(
            payload=_payload_to_dict(payload),
            etapas=etapas,
        )
        repository.log_history(
            acao="criar",
            dado_antigo="",
            dado_novo=f"{atividade.get('titulo') or 'Atividade'} - Criada",
            local_alteracao="Marketing > Kanban",
            id_responsavel=atividade.get("id_responsavel"),
        )
        return {"ok": True, "item": atividade}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/kanban/atualizar")
async def update_kanban_status(payload: KanbanStatusPayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: atividade atualizada"}
    try:
        repository = KanbanRepositorySql()
        etapas = repository.get_etapas()
        etapa_map = {int(item["id"]): item["nome"] for item in etapas if item.get("id") is not None}
        atual = repository.get_atividade(id_atividade=payload.id_atividade)
        if not atual:
            raise HTTPException(status_code=404, detail="Atividade nao encontrada")
        updated = repository.update_status(
            id_atividade=payload.id_atividade,
            id_kanban=payload.id_kanban,
            etapas=etapas,
        )
        if updated == 0:
            raise HTTPException(status_code=404, detail="Atividade nao encontrada")
        repository.log_history(
            acao="mover_etapa",
            dado_antigo=f"{atual.get('titulo') or 'Atividade'} - {etapa_map.get(atual.get('id_kanban'), atual.get('id_kanban'))}",
            dado_novo=f"{atual.get('titulo') or 'Atividade'} - {etapa_map.get(payload.id_kanban, payload.id_kanban)}",
            local_alteracao="Marketing > Kanban",
            id_responsavel=payload.id_responsavel or atual.get("id_responsavel"),
        )
        return {"ok": True, "updated": updated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/kanban/editar/{id_atividade}")
async def edit_kanban_atividade(id_atividade: int, payload: KanbanActivityPayload):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: atividade editada"}
    try:
        repository = KanbanRepositorySql()
        etapas = repository.get_etapas()
        atual = repository.get_atividade(id_atividade=id_atividade)
        if not atual:
            raise HTTPException(status_code=404, detail="Atividade nao encontrada")
        updates = _payload_to_dict(payload)
        updated_item = repository.update_atividade(
            id_atividade=id_atividade,
            payload=updates,
            etapas=etapas,
        )
        if not updated_item:
            raise HTTPException(status_code=404, detail="Atividade nao encontrada")

        fields_to_compare = [
            "id_kanban",
            "titulo",
            "descricao",
            "observacao",
            "data_prazo",
            "prioridade",
            "urgencia",
            "finalizado",
        ]
        changes = 0
        for field in fields_to_compare:
            old = atual.get(field)
            new = updated_item.get(field)
            if str(old if old is not None else "") != str(new if new is not None else ""):
                changes += 1

        repository.log_history(
            acao="editar",
            dado_antigo=f"{atual.get('titulo') or 'Atividade'}",
            dado_novo=f"{updated_item.get('titulo') or 'Atividade'} ({changes} alteracao(oes))",
            local_alteracao="Marketing > Kanban",
            id_responsavel=updated_item.get("id_responsavel"),
        )
        return {"ok": True, "item": updated_item, "changes": changes}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/api/kanban/excluir/{id_atividade}")
async def delete_kanban_atividade(id_atividade: int, id_responsavel: int | None = None):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: atividade excluída"}
    try:
        repository = KanbanRepositorySql()
        atual = repository.get_atividade(id_atividade=id_atividade)
        if not atual:
            raise HTTPException(status_code=404, detail="Atividade nao encontrada")
        deleted = repository.delete_atividade(id_atividade=id_atividade)
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Atividade nao encontrada")
        repository.log_history(
            acao="excluir",
            dado_antigo=f"{atual.get('titulo') or 'Atividade'}",
            dado_novo="Atividade excluida",
            local_alteracao="Marketing > Kanban",
            id_responsavel=id_responsavel or atual.get("id_responsavel"),
        )
        return {"ok": True, "deleted": deleted}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/forms/redirect", response_class=HTMLResponse, include_in_schema=False)
async def forms_redirect(
    request: Request,
    instance: str | None = None,
    token: str | None = None,
    instance_id: str | None = None,
):
    if not settings.FORMS_API_KEY or not settings.FORMS_SITE_ID:
        return templates.TemplateResponse(
            "page_forms_redirect.html",
            {
                "request": request,
                "error": "Config faltando: defina FORMS_API_KEY e FORMS_SITE_ID no .env.",
                "details": None,
                "updates": [],
                "namespace": settings.FORMS_FORMS_NAMESPACE,
                "instance_id": "-",
            },
        )

    try:
        from starlette.concurrency import run_in_threadpool

        updates = await run_in_threadpool(
            fetch_recent_form_updates,
            api_key=settings.FORMS_API_KEY,
            site_id=settings.FORMS_SITE_ID,
            namespace=settings.FORMS_FORMS_NAMESPACE,
            limit=settings.FORMS_FORMS_LIMIT,
        )
        return templates.TemplateResponse(
            "page_forms_redirect.html",
            {
                "request": request,
                "error": None,
                "details": None,
                "updates": updates,
                "namespace": settings.FORMS_FORMS_NAMESPACE,
                "instance_id": settings.FORMS_SITE_ID,
            },
        )
    except FormsApiError as exc:
        return templates.TemplateResponse(
            "page_forms_redirect.html",
            {
                "request": request,
                "error": str(exc),
                "details": exc.response_text,
                "updates": [],
                "namespace": settings.FORMS_FORMS_NAMESPACE,
                "instance_id": settings.FORMS_SITE_ID,
            },
        )
    except Exception as exc:
        return templates.TemplateResponse(
            "page_forms_redirect.html",
            {
                "request": request,
                "error": "Falha inesperada consultando a Forms.",
                "details": str(exc),
                "updates": [],
                "namespace": settings.FORMS_FORMS_NAMESPACE,
                "instance_id": settings.FORMS_SITE_ID,
            },
        )


@router.post("/api/forms/webhook", include_in_schema=False)
async def forms_webhook(request: Request):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: webhook recebido"}
    expected = (settings.FORMS_WEBHOOK_SECRET or "").strip()
    provided = (request.query_params.get("secret") or "").strip()
    if not provided:
        provided = (request.headers.get("x-core-webhook-secret") or "").strip()

    if expected and provided != expected:
        raise HTTPException(status_code=401, detail="Webhook secret inválido")

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    if not isinstance(payload, dict):
        payload = {"payload": payload}

    store = get_forms_webhook_store()
    event = store.add(raw=payload)

    try:
        repo = FormsLeadsRepositorySql()
        repo.upsert_lead(
            submission_id=payload.get("id") or payload.get("submissionId") or event.id,
            contact_id=payload.get("contactId"),
            contact_name=payload.get("contactName") or "Contato",
            form_id=payload.get("formId"),
            form_name=payload.get("formName") or "Formulário",
            submission_data=payload,
            origem="webhook",
            created_date=payload.get("createdDate") or payload.get("submissionDate"),
        )
    except Exception:
        pass

    return {"ok": True, "event_id": event.id}


@router.get("/api/forms/webhook/events")
async def forms_webhook_events(limit: int = Query(default=25, ge=1, le=200)):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "events": get_demo_webhook_events()}
    store = get_forms_webhook_store()
    events = store.list(limit=limit)
    return {
        "ok": True,
        "events": [
            {
                "id": e.id,
                "received_at_iso": e.received_at_iso,
                "received_relative": format_relative_pt_br_from_epoch(e.received_at_epoch_s),
                "contact_name": e.contact_name,
                "form_name": e.form_name,
                "submission_id": e.submission_id,
                "raw": e.raw,
            }
            for e in events
        ],
    }


@router.get("/api/forms/leads")
async def forms_leads(limit: int = Query(default=100, ge=1, le=500)):
    if settings.PORTIFOLIO_DEMO_MODE:
        _demo_leads = get_demo_leads()
        return {"ok": True, "leads": _demo_leads, "total": len(_demo_leads)}
    repo = FormsLeadsRepositorySql()
    leads = repo.list_leads(limit=limit)
    return {"ok": True, "leads": leads, "total": len(leads)}


@router.get("/api/forms/debug-raw")
async def forms_debug_raw():
    """Retorna os dados brutos da API do Forms para diagnóstico."""
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"mode": "demo", "message": "Sem dados em modo demonstração"}
    if not settings.FORMS_API_KEY or not settings.FORMS_SITE_ID:
        raise HTTPException(status_code=400, detail="FORMS_API_KEY e FORMS_SITE_ID não configurados no .env.")
    from starlette.concurrency import run_in_threadpool
    from services.forms_submissions import query_submissions_by_namespace
    items = await run_in_threadpool(
        query_submissions_by_namespace,
        api_key=settings.FORMS_API_KEY,
        site_id=settings.FORMS_SITE_ID,
        namespace=settings.FORMS_FORMS_NAMESPACE,
        limit=2,
    )
    return {"total": len(items), "sample": items[:2] if items else []}


@router.post("/api/forms/sync")
async def forms_sync():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: sincronização simulada", "count": 0}
    if not settings.FORMS_API_KEY or not settings.FORMS_SITE_ID:
        raise HTTPException(status_code=400, detail="FORMS_API_KEY e FORMS_SITE_ID não configurados no .env.")
    from starlette.concurrency import run_in_threadpool
    updates = await run_in_threadpool(
        fetch_recent_form_updates,
        api_key=settings.FORMS_API_KEY,
        site_id=settings.FORMS_SITE_ID,
        namespace=settings.FORMS_FORMS_NAMESPACE,
        limit=settings.FORMS_FORMS_LIMIT,
    )
    repo = FormsLeadsRepositorySql()
    for u in updates:
        repo.upsert_lead(
            submission_id=u.submission_id,
            contact_id=u.contact_id,
            contact_name=u.contact_name,
            form_id=u.form_id,
            form_name=u.form_name,
            submission_data=u.submission_data,
            origem="pull",
            created_date=u.created_date_iso,
        )
    return {"ok": True, "synced": len(updates)}


@router.get("/api/forms/colaboradores")
async def forms_colaboradores():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "colaboradores": get_demo_colaboradores()}
    repo = ColaboradoresRepository()
    try:
        nomes = repo.list_comercial_ativos()
        return {"ok": True, "colaboradores": nomes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/forms/areas")
async def forms_areas():
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, "areas": get_demo_areas()}
    repo = ColaboradoresRepository()
    try:
        areas = repo.list_areas()
        return {"ok": True, "areas": areas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LeadFieldsUpdate(BaseModel):
    redirecionar: str | None = None
    area: str | None = None


@router.patch("/api/forms/leads/{id_lead}")
async def forms_update_lead(id_lead: int, body: LeadFieldsUpdate):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"message": "Demo: lead atualizado"}
    repo = FormsLeadsRepositorySql()
    repo.update_lead_fields(
        id_lead=id_lead,
        redirecionar=body.redirecionar or None,
        area=body.area or None,
    )
    return {"ok": True}


@router.get("/api/forms/site-info")
async def forms_site_info():
    """Retorna informações públicas do site Forms (sem expor chaves)."""
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"site_id": get_demo_site_info().get("site_url", "")}
    return {"site_id": settings.FORMS_SITE_ID or ""}


@router.get("/api/forms/blog-posts")
async def forms_blog_posts(limit: int = Query(default=5, ge=1, le=20)):
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"posts": get_demo_blog_posts()}
    if not settings.FORMS_API_KEY or not settings.FORMS_SITE_ID:
        raise HTTPException(status_code=400, detail="FORMS_API_KEY e FORMS_SITE_ID não configurados no .env.")
    from services.forms_blog import fetch_blog_posts
    try:
        posts = fetch_blog_posts(
            api_key=settings.FORMS_API_KEY,
            site_id=settings.FORMS_SITE_ID,
            limit=limit,
        )
        return {"posts": posts}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/api/ga4/sessions-overview")
async def ga4_sessions_overview(days: int = Query(default=30, ge=7, le=90)):
    """Retorna todos os dados de sessões GA4 para o dashboard de analytics."""
    if settings.PORTIFOLIO_DEMO_MODE:
        _demo = get_demo_ga4_sessions()
        return {"ok": True, "is_mock": True, **_demo}
    from starlette.concurrency import run_in_threadpool

    prop = settings.GA4_PROPERTY_ID
    creds = settings.GA4_CREDENTIALS_PATH

    if not prop or not creds:
        raise HTTPException(status_code=400, detail="GA4_PROPERTY_ID e GA4_CREDENTIALS_PATH não configurados no .env")

    try:
        from services.ga4_analytics import (
            fetch_sessions_over_time,
            fetch_new_vs_returning,
            fetch_by_device,
            fetch_by_day_of_week,
            fetch_by_country,
            fetch_by_source,
            fetch_visitors_over_time,
        )

        sessions_time, new_vs_ret, by_device, by_dow, by_country, by_source, visitors_time = await run_in_threadpool(
            lambda: (
                fetch_sessions_over_time(property_id=prop, credentials_path=creds, days=days),
                fetch_new_vs_returning(property_id=prop, credentials_path=creds, days=days),
                fetch_by_device(property_id=prop, credentials_path=creds, days=days),
                fetch_by_day_of_week(property_id=prop, credentials_path=creds, days=days),
                fetch_by_country(property_id=prop, credentials_path=creds, days=days),
                fetch_by_source(property_id=prop, credentials_path=creds, days=days),
                fetch_visitors_over_time(property_id=prop, credentials_path=creds, days=days),
            )
        )

        total = sum(d["value"] for d in sessions_time)
        return {
            "ok": True,
            "is_mock": False,
            "total_sessions": total,
            "sessions_over_time": sessions_time,
            "visitors_over_time": visitors_time,
            "new_vs_returning": new_vs_ret,
            "by_device": by_device,
            "by_day_of_week": by_dow,
            "by_country": by_country,
            "by_source": by_source,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/api/ga4/behavior-overview")
async def ga4_behavior_overview(days: int = Query(default=30, ge=7, le=90)):
    """Retorna comportamento do site: duração média, páginas/sessão, bounce rate e top páginas."""
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, **get_demo_ga4_behavior(), "pageviews_over_time": []}
    from starlette.concurrency import run_in_threadpool

    prop  = settings.GA4_PROPERTY_ID
    creds = settings.GA4_CREDENTIALS_PATH

    if not prop or not creds:
        raise HTTPException(status_code=400, detail="GA4_PROPERTY_ID e GA4_CREDENTIALS_PATH não configurados no .env")

    try:
        from services.ga4_analytics import fetch_behavior_overview, fetch_pageviews_over_time
        behavior_data, pageviews_time = await run_in_threadpool(
            lambda: (
                fetch_behavior_overview(property_id=prop, credentials_path=creds, days=days),
                fetch_pageviews_over_time(property_id=prop, credentials_path=creds, days=days),
            )
        )
        return {"ok": True, **behavior_data, "pageviews_over_time": pageviews_time}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/api/ga4/blog-overview")
async def ga4_blog_overview(days: int = Query(default=30, ge=7, le=90)):
    """Retorna views de posts de blog ao longo do tempo + fontes de tráfego."""
    if settings.PORTIFOLIO_DEMO_MODE:
        _demo = get_demo_ga4_blog()
        return {"ok": True, "views_over_time": _demo.get("rows", []), "total_views": sum(d.get("screenPageViews", 0) for d in _demo.get("rows", [])), "sources": []}
    from starlette.concurrency import run_in_threadpool

    prop  = settings.GA4_PROPERTY_ID
    creds = settings.GA4_CREDENTIALS_PATH

    if not prop or not creds:
        raise HTTPException(status_code=400, detail="GA4_PROPERTY_ID e GA4_CREDENTIALS_PATH não configurados no .env")

    try:
        from services.ga4_analytics import fetch_blog_views_over_time, fetch_blog_sources
        views_time, sources = await run_in_threadpool(
            lambda: (
                fetch_blog_views_over_time(property_id=prop, credentials_path=creds, days=days),
                fetch_blog_sources(property_id=prop, credentials_path=creds, days=days),
            )
        )
        return {
            "ok": True,
            "views_over_time": views_time,
            "total_views": sum(d["value"] for d in views_time),
            "sources": sources,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/api/ga4/kpi-summary")
async def ga4_kpi_summary():
    """Retorna KPIs principais (sessões, page views, visitantes únicos) com hoje/ontem/trend."""
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"ok": True, **get_demo_ga4_kpi()}
    from starlette.concurrency import run_in_threadpool

    prop  = settings.GA4_PROPERTY_ID
    creds = settings.GA4_CREDENTIALS_PATH

    if not prop or not creds:
        raise HTTPException(status_code=400, detail="GA4_PROPERTY_ID e GA4_CREDENTIALS_PATH não configurados no .env")

    try:
        from services.ga4_analytics import fetch_kpi_summary
        data = await run_in_threadpool(
            lambda: fetch_kpi_summary(property_id=prop, credentials_path=creds)
        )
        return {"ok": True, **data}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/api/forms/analytics-debug")
async def forms_analytics_debug():
    """Testa a conexão com a Forms Analytics API e retorna a resposta bruta para diagnóstico."""
    if settings.PORTIFOLIO_DEMO_MODE:
        return {"mode": "demo"}
    from datetime import date, timedelta
    from starlette.concurrency import run_in_threadpool

    if not settings.FORMS_API_KEY or not settings.FORMS_SITE_ID:
        return {"ok": False, "error": "FORMS_API_KEY ou FORMS_SITE_ID não configurados no .env"}

    today = date.today()
    from_date = (today - timedelta(days=7)).isoformat()
    to_date = today.isoformat()

    try:
        from services.forms_http import request_json
        raw = await run_in_threadpool(
            request_json,
            method="POST",
            url="https://www.formsapis.com/analytics/v2/data-items/query",
            api_key=settings.FORMS_API_KEY,
            site_id=settings.FORMS_SITE_ID,
            body={
                "namespace": "website",
                "metrics": [{"name": "sessions"}],
                "dimensions": [{"name": "day"}],
                "dateRange": {"from": from_date, "to": to_date},
                "paging": {"limit": 10},
            },
        )
        return {"ok": True, "raw_response": raw, "api_key_prefix": settings.FORMS_API_KEY[:8] + "...", "site_id": settings.FORMS_SITE_ID}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "type": type(exc).__name__}


@router.get("/api/forms/analytics/{metric_type}")
async def forms_analytics(metric_type: str, days: int = Query(default=30, ge=7, le=90)):
    """Retorna dados de analytics do Forms para um tipo de metrica especifico."""
    if settings.PORTIFOLIO_DEMO_MODE:
        _demo = get_demo_forms_analytics(metric_type)
        return {"metric_type": metric_type, "label": metric_type, "total": _demo.get("total", 0), "trend": _demo.get("change", 0), "data": _demo.get("data", []), "is_mock": True}
    from datetime import date, timedelta
    from starlette.concurrency import run_in_threadpool

    METRIC_CONFIG: dict[str, dict] = {
        "sessions":   {"namespace": "website", "metrics": ["sessions"],       "label": "Sessões do site"},
        "pageviews":  {"namespace": "website", "metrics": ["pageViews"],      "label": "Visualizações da página"},
        "postviews":  {"namespace": "blog",    "metrics": ["postViews"],      "label": "Visualizações do post"},
        "contacts":   {"namespace": "website", "metrics": ["buttonClicks"],   "label": "Cliques para contato"},
        "visitors":   {"namespace": "website", "metrics": ["uniqueVisitors"], "label": "Visitantes únicos"},
    }

    if metric_type not in METRIC_CONFIG:
        raise HTTPException(status_code=400, detail=f"metric_type inválido. Use: {', '.join(METRIC_CONFIG)}")

    cfg = METRIC_CONFIG[metric_type]
    today = date.today()
    from_date = (today - timedelta(days=days)).isoformat()
    to_date = today.isoformat()

    # Tenta buscar dados reais da API Forms
    is_mock = False
    data: list[dict] = []
    total_value = 0

    if not settings.FORMS_API_KEY or not settings.FORMS_SITE_ID:
        is_mock = True
    else:
        try:
            from services.forms_analytics import fetch_analytics
            raw = await run_in_threadpool(
                fetch_analytics,
                api_key=settings.FORMS_API_KEY,
                site_id=settings.FORMS_SITE_ID,
                namespace=cfg["namespace"],
                metrics=cfg["metrics"],
                dimensions=["day"],
                from_date=from_date,
                to_date=to_date,
                limit=days + 5,
            )
            if raw:
                metric_key = cfg["metrics"][0]
                data = [
                    {"date": item.get("date", item.get("day", "")), "value": int(item.get(metric_key, 0) or 0)}
                    for item in raw
                ]
                total_value = sum(d["value"] for d in data)
                is_mock = False
            else:
                is_mock = True
        except (FormsApiError, Exception) as exc:
            is_mock = True
            import logging
            logging.getLogger(__name__).warning("Forms Analytics fallback para mock: %s", exc)

    if is_mock:
        data = []
        total_value = 0

    return {
        "metric_type": metric_type,
        "label": cfg["label"],
        "total": total_value,
        "trend": 0,
        "data": data,
        "is_mock": is_mock,
    }


@router.get("/direcionamento", response_class=HTMLResponse, include_in_schema=False)
async def direcionamento(request: Request):
    if frontend_is_built():
        return FileResponse(FRONTEND_INDEX)
    return templates.TemplateResponse(
        "page_home.html",
        {
            "request": request,
            "app_name": settings.APP_NAME,
            "portal_url": settings.PORTAL_URL or "#",
            "frontend_built": False,
        },
    )


@router.get("/{frontend_path:path}", response_class=HTMLResponse, include_in_schema=False)
async def spa_fallback(frontend_path: str, request: Request):
    if frontend_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")

    if frontend_is_built():
        return FileResponse(FRONTEND_INDEX)

    return templates.TemplateResponse(
        "page_home.html",
        {
            "request": request,
            "app_name": settings.APP_NAME,
            "portal_url": settings.PORTAL_URL or "#",
            "frontend_built": False,
        },
    )
