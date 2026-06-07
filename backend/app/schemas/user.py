from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    name: str
    role: str
    department: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str
    role: Optional[str] = None


class User(UserBase):
    id: int
    createdAt: datetime

    class Config:
        from_attributes = True
