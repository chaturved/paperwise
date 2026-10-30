
from pydantic import BaseModel


class QuerySearchRequest(BaseModel):
    question: str
    top_k: int | None = 5
    filters: dict[str, str] | None = None