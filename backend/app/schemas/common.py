from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    accessToken: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
