from services.forms_http import request_json


FORMS_GET_CONTACT_URL_TEMPLATE = "https://www.formsapis.com/contacts/v4/contacts/{contact_id}"


def get_contact(
    *,
    access_token: str | None = None,
    api_key: str | None = None,
    site_id: str | None = None,
    contact_id: str,
) -> dict | None:
    data = request_json(
        method="GET",
        url=FORMS_GET_CONTACT_URL_TEMPLATE.format(contact_id=contact_id),
        token=access_token,
        api_key=api_key,
        site_id=site_id,
    )
    if isinstance(data, dict) and data:
        return data
    return None


def extract_contact_display_name(contact_obj: dict | None) -> str | None:
    if not contact_obj:
        return None

    info = contact_obj.get("info")
    if isinstance(info, dict):
        name = info.get("name")
        if isinstance(name, dict):
            first = name.get("first")
            last = name.get("last")
            full = " ".join([str(x).strip() for x in (first, last) if isinstance(x, str) and x.strip()]).strip()
            if full:
                return full
        company = info.get("company")
        if isinstance(company, str) and company.strip():
            return company.strip()

    # fallback
    display = contact_obj.get("displayName") or contact_obj.get("name")
    if isinstance(display, str) and display.strip():
        return display.strip()
    return None
