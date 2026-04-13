from enum import StrEnum


class UserRole(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class UserStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class Gender(StrEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class LinkStatus(StrEnum):
    PENDING_PATIENT_REQUEST = "pending_patient_request"
    PENDING_DOCTOR_INVITE = "pending_doctor_invite"
    ACTIVE = "active"
    REJECTED = "rejected"
    REVOKED = "revoked"
    ENDED = "ended"


class LinkRequestedBy(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"


class PrescriptionStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    SUPERSEDED = "superseded"


class DocumentType(StrEnum):
    PRESCRIPTION = "prescription"
    LAB_REPORT = "lab_report"
    MEDICAL_TEST = "medical_test"
    IMAGING = "imaging"
    DISCHARGE_SUMMARY = "discharge_summary"
    OTHER = "other"


class DocumentVisibility(StrEnum):
    PRIVATE = "private"
    LINKED_DOCTORS = "linked_doctors"


class DocumentSource(StrEnum):
    PATIENT_UPLOAD = "patient_upload"
    DOCTOR_UPLOAD = "doctor_upload"
    ADMIN_UPLOAD = "admin_upload"
    MIGRATED = "migrated"


class ChatType(StrEnum):
    PATIENT_SELF_SERVICE = "patient_self_service"
    DOCTOR_PATIENT_CONTEXT = "doctor_patient_context"
    DOCTOR_GENERAL = "doctor_general"
    ADMIN_SUPPORT = "admin_support"


class SenderType(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
