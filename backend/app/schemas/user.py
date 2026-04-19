from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.enums import UserRole, UserStatus
from app.utils import user_id, utcnow


class UserDocument(BaseModel):
    """MongoDB document shape for the `users` collection."""

    user_id: str = Field(default_factory=user_id)
    role: UserRole
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    password_hash: str | None = None
    token_version: int = 0
    status: UserStatus = UserStatus.ACTIVE
    email_verified: bool = False
    profile_completed: bool = False
    last_login_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class UserCreate(BaseModel):
    """Payload for creating a new user."""

    role: UserRole
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class UserRead(BaseModel):
    """Response DTO for user records."""

    user_id: str
    role: UserRole
    email: str
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    token_version: int = 0
    status: UserStatus
    email_verified: bool
    profile_completed: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
