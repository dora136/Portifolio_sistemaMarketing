from services.forms_http import request_json


FORMS_QUERY_SUBMISSIONS_BY_NAMESPACE_URL = "https://www.formsapis.com/form-submission-service/v4/submissions/namespace/query"
FORMS_GET_FORM_URL_TEMPLATE = "https://www.formsapis.com/form-schema-service/v4/forms/{form_id}"


def query_submissions_by_namespace(
    *,
    access_token: str | None = None,
    api_key: str | None = None,
    site_id: str | None = None,
    namespace: str,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    query = {
        "filter": {"namespace": {"$eq": namespace}},
        "sort": [{"fieldName": "createdDate", "order": "DESC"}],
        "paging": {"limit": int(limit), "offset": int(offset)},
    }
    data = request_json(
        method="POST",
        url=FORMS_QUERY_SUBMISSIONS_BY_NAMESPACE_URL,
        token=access_token,
        api_key=api_key,
        site_id=site_id,
        body={"query": query},
    )

    submissions = data.get("submissions") or data.get("items") or []
    if isinstance(submissions, list):
        return submissions
    return []


def get_form(
    *,
    access_token: str | None = None,
    api_key: str | None = None,
    site_id: str | None = None,
    form_id: str,
) -> dict | None:
    data = request_json(
        method="GET",
        url=FORMS_GET_FORM_URL_TEMPLATE.format(form_id=form_id),
        token=access_token,
        api_key=api_key,
        site_id=site_id,
    )
    if isinstance(data, dict) and data:
        return data
    return None


def extract_form_name(form_obj: dict | None) -> str | None:
    if not form_obj:
        return None
    for key in ("name", "title"):
        value = form_obj.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    properties = form_obj.get("properties")
    if isinstance(properties, dict):
        for key in ("name", "title"):
            value = properties.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None
