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
