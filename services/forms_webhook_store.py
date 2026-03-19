from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4


@dataclass(frozen=True)
class FormsWebhookEvent:
    id: str
    received_at_epoch_s: float
    received_at_iso: str
    contact_name: str | None
    form_name: str | None
    submission_id: str | None
    raw: dict


class InMemoryFormsWebhookStore:
    def __init__(self):
        self._lock = RLock()
        self._items: list[FormsWebhookEvent] = []

    def add(self, *, raw: dict) -> FormsWebhookEvent:
        now = datetime.now(timezone.utc)
        event = FormsWebhookEvent(
            id=str(uuid4()),
            received_at_epoch_s=now.timestamp(),
            received_at_iso=now.isoformat(),
            contact_name=_extract_contact_name(raw),
            form_name=_extract_form_name(raw),
            submission_id=_extract_submission_id(raw),
            raw=raw,
        )
        with self._lock:
            self._items.insert(0, event)
            self._items = self._items[:500]
        return event

    def list(self, *, limit: int = 25) -> list[FormsWebhookEvent]:
        with self._lock:
            return list(self._items[: max(1, int(limit))])


_STORE: InMemoryFormsWebhookStore | None = None


def get_forms_webhook_store() -> InMemoryFormsWebhookStore:
    global _STORE
    if _STORE is None:
        _STORE = InMemoryFormsWebhookStore()
    return _STORE


def _dig_first_str(obj: object, keys: list[str]) -> str | None:
    if not isinstance(obj, dict):
        return None
    for key in keys:
        value = obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _extract_contact_name(raw: dict) -> str | None:
    # Heurísticas para payloads de automations/webhooks (variam por template).
    direct = _dig_first_str(raw, ["contactName", "name", "fullName", "nome", "leadName"])
    if direct:
        return direct

    contact = raw.get("contact") or raw.get("lead") or raw.get("visitor")
    if isinstance(contact, dict):
        direct = _dig_first_str(contact, ["name", "fullName", "displayName", "nome"])
        if direct:
            return direct
        first = _dig_first_str(contact, ["firstName", "first", "nome"])
        last = _dig_first_str(contact, ["lastName", "last", "sobrenome"])
        if first and last:
            return f"{first} {last}".strip()
        if first:
            return first
    return None


def _extract_form_name(raw: dict) -> str | None:
    direct = _dig_first_str(raw, ["formName", "formTitle", "form", "nomeFormulario"])
    if direct:
        return direct
    form = raw.get("form")
    if isinstance(form, dict):
        direct = _dig_first_str(form, ["name", "title", "formName", "formTitle"])
        if direct:
            return direct
    return None


def _extract_submission_id(raw: dict) -> str | None:
    direct = _dig_first_str(raw, ["submissionId", "submission_id", "id", "formSubmissionId"])
    if direct:
        return direct
    submission = raw.get("submission") or raw.get("formSubmission")
    if isinstance(submission, dict):
        direct = _dig_first_str(submission, ["id", "submissionId"])
        if direct:
            return direct
    return None


def format_relative_pt_br_from_epoch(epoch_s: float | None) -> str:
    if epoch_s is None:
        return "-"
    now = datetime.now(timezone.utc).timestamp()
    delta_s = max(0.0, now - float(epoch_s))
    minutes = int(delta_s // 60)
    hours = int(delta_s // 3600)
    days = int(delta_s // 86400)
    if minutes < 1:
        return "agora"
    if minutes < 60:
        return f"há {minutes} min"
    if hours < 24:
        return f"há {hours} {'hora' if hours == 1 else 'horas'}"
    if days < 30:
        return "há um dia" if days == 1 else f"há {days} dias"
    months = max(1, days // 30)
    if months < 12:
        return "há um mês" if months == 1 else f"há {months} meses"
    years = max(1, months // 12)
    return "há um ano" if years == 1 else f"há {years} anos"
