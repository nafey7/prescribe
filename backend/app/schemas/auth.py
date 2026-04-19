import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.enums import UserRole, UserStatus

_COMMON_PASSWORDS = frozenset(
    {
        "password123456",
        "123456789012",
        "qwerty123456",
        "welcome123456",
        "prescribe12345",
    }
)


def validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must contain at least one letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if password.lower() in _COMMON_PASSWORDS:
        raise ValueError("Password is too common")
    return password


class SignupRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    confirm_password: str
    role: UserRole | None = Field(
        default=None,
        description="Defaults to patient. Doctor only when ALLOW_DOCTOR_SELF_SIGNUP is true.",
    )

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_names(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("password")
    @classmethod
    def password_policy(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self) -> "SignupRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    refresh_expires_in: int


class MeResponse(BaseModel):
    user_id: str
    role: UserRole
    email: str
    status: UserStatus
    email_verified: bool
    profile_completed: bool
    patient_slug: str | None = None


class AuthSessionResponse(TokenPair):
    """Access + refresh tokens returned from signup/login."""

    user: MeResponse
