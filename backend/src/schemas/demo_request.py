from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class DemoRequestCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: str | None = Field(default=None, max_length=160)
    team_size: Literal["solo", "2-10", "11-50", "51+"] | None = None
    message: str | None = Field(default=None, max_length=2000)
    website: str = ""  # hidden field that people never fill in; bots do

    @field_validator("name", "company")
    @classmethod
    def collapse_whitespace(cls, value: str | None) -> str | None:
        """One line only: the name goes into an email subject, where a line break could add mail headers."""
        return " ".join(value.split()) if value else value
