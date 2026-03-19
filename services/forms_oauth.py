import json
import time
from dataclasses import dataclass

from services.forms_http import FormsApiError, request_json


FORMS_OAUTH_TOKEN_URL = "https://www.formsapis.com/oauth2/token"


@dataclass(frozen=True)
class FormsAccessToken:
    access_token: str
    expires_at_epoch_s: float | None = None

    def is_expired(self, skew_s: float = 15.0) -> bool:
        if self.expires_at_epoch_s is None:
            return False
        return time.time() >= (self.expires_at_epoch_s - skew_s)


_TOKEN_CACHE: dict[str, FormsAccessToken] = {}


def create_access_token(*, client_id: str, client_secret: str, instance_id: str) -> FormsAccessToken:
    cache_key = f"{client_id}:{instance_id}"
    cached = _TOKEN_CACHE.get(cache_key)
    if cached and not cached.is_expired():
        return cached

    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "instance_id": instance_id,
    }
    data = request_json(method="POST", url=FORMS_OAUTH_TOKEN_URL, body=payload)

    access_token = data.get("access_token")
    expires_in = data.get("expires_in")

    if not access_token and isinstance(data.get("body"), str):
        try:
            body_data = json.loads(data["body"])
        except Exception:
            body_data = {}
        access_token = body_data.get("access_token")
        expires_in = body_data.get("expires_in")

    if not access_token or not isinstance(access_token, str):
        raise FormsApiError("Não foi possível obter access_token do OAuth da Forms.", response_text=str(data))

    expires_at = None
    if isinstance(expires_in, (int, float)):
        expires_at = time.time() + float(expires_in)

    token = FormsAccessToken(access_token=access_token, expires_at_epoch_s=expires_at)
    _TOKEN_CACHE[cache_key] = token
    return token
