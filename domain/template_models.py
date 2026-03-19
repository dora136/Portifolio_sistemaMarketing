from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


TemplateTipo = Literal["email", "imagem", "video", "documento", "layout"]


class Template(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    titulo: str
    descricao: str = ""
    categoria: str
    tipo: TemplateTipo
    autor: str = "Usuário"
    data: str = Field(default_factory=lambda: date.today().isoformat())
    preview: bool = True
    conteudo: str | None = None


class TemplateCreatePayload(BaseModel):
    titulo: str
    descricao: str | None = None
    categoria: str
    tipo: TemplateTipo
    autor: str | None = None
    preview: bool | None = None
    conteudo: str | None = None


class TemplateUpdatePayload(BaseModel):
    titulo: str | None = None
    descricao: str | None = None
    categoria: str | None = None
    tipo: TemplateTipo | None = None
    autor: str | None = None
    preview: bool | None = None
    conteudo: str | None = None
