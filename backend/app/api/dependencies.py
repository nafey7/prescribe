from fastapi import Header, HTTPException


async def get_current_patient_id(
    x_patient_id: str | None = Header(None, alias="X-Patient-Id"),
) -> str:
    if not x_patient_id:
        raise HTTPException(
            status_code=400,
            detail="X-Patient-Id header is required",
        )
    return x_patient_id


async def get_current_doctor_id(
    x_doctor_id: str | None = Header(None, alias="X-Doctor-Id"),
) -> str:
    if not x_doctor_id:
        raise HTTPException(
            status_code=400,
            detail="X-Doctor-Id header is required",
        )
    return x_doctor_id
