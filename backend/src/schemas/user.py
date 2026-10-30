from pydantic import BaseModel, EmailStr, computed_field

# ─── Request schemas ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserUpdate(BaseModel):
    full_name: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class PasswordSet(BaseModel):
    new_password: str


class DeleteAccount(BaseModel):
    confirmation: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class WaitlistRequest(BaseModel):
    email: EmailStr


# ─── Response schemas ─────────────────────────────────────────────────────────

def _initials(full_name: str) -> str:
    parts = full_name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return full_name[:2].upper()


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    plan: str
    onboarding_completed: bool

    @computed_field
    @property
    def avatar_initials(self) -> str:
        return _initials(self.full_name)

    model_config = {"from_attributes": True}


class ProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str

    @computed_field
    @property
    def avatar_initials(self) -> str:
        return _initials(self.full_name)

    model_config = {"from_attributes": True}


class UsageItemResponse(BaseModel):
    used: int
    limit: int | None


class UsageResponse(BaseModel):
    documents: UsageItemResponse
    queries_today: UsageItemResponse
    storage_bytes: UsageItemResponse


class MessageResponse(BaseModel):
    message: str


class AuthResponse(BaseModel):
    user: UserResponse


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
