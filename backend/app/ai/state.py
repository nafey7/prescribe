from typing import Annotated, NotRequired, TypedDict

from langgraph.graph.message import add_messages


class MedicalChatState(TypedDict):
    messages: Annotated[list, add_messages]
    patient_id: str
    system_prompt: NotRequired[str]
