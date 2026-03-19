import base64
import json


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def extract_instance_id(instance_token: str) -> str:
    """
    Extrai instance_id de um Forms Instance Token (JWT).

    Observação: aqui não validamos assinatura. Para produção, valide a assinatura
    do instance token conforme a documentação do Forms.
    """
    token = instance_token.strip()
    if token.startswith("IST."):
        token = token[4:]

    parts = token.split(".")
    if len(parts) < 2:
        raise ValueError("Instance token inválido (JWT incompleto).")

    payload_raw = _b64url_decode(parts[1]).decode("utf-8", errors="replace")
    payload = json.loads(payload_raw)

    data_field = payload.get("data")
    data_obj: dict | None = None
    if isinstance(data_field, str):
        try:
            data_obj = json.loads(data_field)
        except json.JSONDecodeError:
            data_obj = None
    elif isinstance(data_field, dict):
        data_obj = data_field

    instance_id = None
    if isinstance(data_obj, dict):
        instance_id = data_obj.get("id") or data_obj.get("instanceId") or data_obj.get("instance_id")
    instance_id = instance_id or payload.get("instanceId") or payload.get("instance_id")

    if not instance_id or not isinstance(instance_id, str):
        raise ValueError("Não foi possível extrair instance_id do token.")
    return instance_id
