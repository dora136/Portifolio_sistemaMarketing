from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from services.forms_contacts import extract_contact_display_name, get_contact
from services.forms_submissions import extract_form_name, get_form, query_submissions_by_namespace


@dataclass(frozen=True)
class FormsFormUpdate:
    submission_id: str | None
    contact_id: str | None
    contact_name: str
    form_id: str | None
    form_name: str
    created_date_iso: str | None
    created_relative: str
    submission_data: dict | None = None


def _parse_dt(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    # normalize "Z"
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _plural(n: int, singular: str, plural: str) -> str:
    return singular if n == 1 else plural


def format_relative_pt_br(dt: datetime | None) -> str:
    if dt is None:
        return "-"
    now = datetime.now(timezone.utc)
    delta_s = max(0.0, (now - dt).total_seconds())
    minutes = int(delta_s // 60)
    hours = int(delta_s // 3600)
    days = int(delta_s // 86400)

    if minutes < 1:
        return "agora"
    if minutes < 60:
        return f"há {minutes} {_plural(minutes, 'min', 'min')}"
    if hours < 24:
        return f"há {hours} {_plural(hours, 'hora', 'horas')}"
    if days < 30:
        if days == 1:
            return "há um dia"
        return f"há {days} dias"
    months = max(1, days // 30)
    if months < 12:
        if months == 1:
            return "há um mês"
        return f"há {months} meses"
    years = max(1, months // 12)
    if years == 1:
        return "há um ano"
    return f"há {years} anos"


_UUID_RE = __import__("re").compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", __import__("re").IGNORECASE
)

# Campos comuns de nome em formulários Forms
_NAME_FIELD_KEYS = (
    "name", "full_name", "fullName", "first_name", "firstName",
    "nome", "nome_completo", "nomeCompleto",
    "field:nome", "field:name", "field:full_name",
)
_EMAIL_FIELD_KEYS = (
    "email", "e-mail", "email_address", "emailAddress",
    "field:email", "field:e-mail",
)


def _extract_from_submissions(raw: object) -> tuple[str | None, str | None]:
    """Tenta extrair nome e email dos campos enviados no formulário.
    Suporta dict {fieldId: value}, list [{fieldId, value}] e dicts aninhados.
    """
    name: str | None = None
    email: str | None = None

    # Normaliza para lista de (chave, valor)
    pairs: list[tuple[str, str]] = []
    if isinstance(raw, dict):
        for k, v in raw.items():
            if isinstance(v, str):
                pairs.append((str(k), v))
            elif isinstance(v, dict):
                inner = v.get("value") or v.get("text") or v.get("label") or ""
                if isinstance(inner, str):
                    pairs.append((str(k), inner))
    elif isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict):
                k = str(item.get("fieldId") or item.get("key") or "")
                v = item.get("value") or item.get("text") or item.get("label") or ""
                if isinstance(v, str):
                    pairs.append((k, v))

    # Procura email
    for k, v in pairs:
        if "@" in v:
            email = v.strip()
            break
        for ek in _EMAIL_FIELD_KEYS:
            if ek in k.lower():
                email = v.strip()
                break

    # Procura nome por chave conhecida
    for k, v in pairs:
        for nk in _NAME_FIELD_KEYS:
            if nk in k.lower() and v.strip() and not _UUID_RE.match(v.strip()) and "@" not in v:
                name = v.strip()
                break
        if name:
            break

    # Fallback: primeiro valor que não seja UUID nem email e tenha espaço (nome completo)
    if not name:
        for _, v in pairs:
            if v.strip() and not _UUID_RE.match(v.strip()) and "@" not in v and " " in v and len(v) < 80:
                name = v.strip()
                break

    # Fallback final: qualquer valor curto não-UUID
    if not name:
        for _, v in pairs:
            if v.strip() and not _UUID_RE.match(v.strip()) and "@" not in v and len(v) < 80:
                name = v.strip()
                break

    if not name and email:
        name = email.split("@")[0]

    return name, email


def _short_id(uid: str | None) -> str:
    """Retorna os primeiros 8 chars de um UUID para exibição."""
    if not uid:
        return "—"
    return uid[:8] + "…" if len(uid) > 8 else uid


def _unique(values: Iterable[str | None]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if not value or not isinstance(value, str):
            continue
        if value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def fetch_recent_form_updates(
    *,
    api_key: str,
    site_id: str,
    namespace: str,
    limit: int = 20,
) -> list[FormsFormUpdate]:
    submissions = query_submissions_by_namespace(
        api_key=api_key,
        site_id=site_id,
        namespace=namespace,
        limit=limit,
    )

    contact_ids = _unique([item.get("contactId") for item in submissions if isinstance(item, dict)])
    form_ids = _unique([item.get("formId") for item in submissions if isinstance(item, dict)])

    contacts_by_id: dict[str, str] = {}
    for contact_id in contact_ids:
        try:
            contact = get_contact(api_key=api_key, site_id=site_id, contact_id=contact_id)
            contacts_by_id[contact_id] = extract_contact_display_name(contact) or contact_id
        except Exception:
            contacts_by_id[contact_id] = contact_id

    forms_by_id: dict[str, str] = {}
    for form_id in form_ids:
        try:
            form = get_form(api_key=api_key, site_id=site_id, form_id=form_id)
            forms_by_id[form_id] = extract_form_name(form) or form_id
        except Exception:
            forms_by_id[form_id] = form_id

    updates: list[FormsFormUpdate] = []
    for item in submissions:
        if not isinstance(item, dict):
            continue
        created_date_iso = item.get("createdDate") or item.get("submissionDate") or item.get("createdAt")
        created_dt = _parse_dt(created_date_iso if isinstance(created_date_iso, str) else None)
        contact_id = item.get("contactId") if isinstance(item.get("contactId"), str) else None
        form_id = item.get("formId") if isinstance(item.get("formId"), str) else None

        # Tenta obter nome dos dados da submissão como fallback
        raw_submissions = item.get("submissions") or item.get("formFieldValues") or {}
        sub_name, _sub_email = _extract_from_submissions(raw_submissions)

        # Resolve nome do contato: API > dados do form > ID curto
        resolved_contact = (
            contacts_by_id.get(contact_id or "")
            if contact_id and not _UUID_RE.match(contacts_by_id.get(contact_id or "", ""))
            else None
        )
        contact_name = resolved_contact or sub_name or (f"#{_short_id(contact_id)}" if contact_id else "Contato")

        # Resolve nome do formulário: API > ID curto
        resolved_form = forms_by_id.get(form_id or "") if form_id else None
        if resolved_form and _UUID_RE.match(resolved_form):
            resolved_form = None
        form_name = resolved_form or (f"Formulário {_short_id(form_id)}" if form_id else "Formulário")

        updates.append(
            FormsFormUpdate(
                submission_id=item.get("id") if isinstance(item.get("id"), str) else None,
                contact_id=contact_id,
                contact_name=contact_name,
                form_id=form_id,
                form_name=form_name,
                created_date_iso=created_dt.isoformat() if created_dt else (created_date_iso if isinstance(created_date_iso, str) else None),
                created_relative=format_relative_pt_br(created_dt),
                submission_data=item if isinstance(item, dict) else None,
            )
        )

    return updates
