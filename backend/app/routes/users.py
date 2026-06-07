from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import User as UserSchema, UserCreate, UserUpdate
from app.auth import get_password_hash, require_role, get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[dict])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "role": u.role,
            "department": u.department,
            "createdAt": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        password_hash=hashed_password,
        name=user_data.name,
        role=user_data.role,
        department=user_data.department,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {
        "id": db_user.id,
        "username": db_user.username,
        "name": db_user.name,
        "role": db_user.role,
        "department": db_user.department,
        "createdAt": db_user.created_at.isoformat() if db_user.created_at else None,
    }


@router.put("/{user_id}", response_model=dict)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_data.name is not None:
        db_user.name = user_data.name
    if user_data.role is not None:
        db_user.role = user_data.role
    if user_data.department is not None:
        db_user.department = user_data.department
    if user_data.password:
        db_user.password_hash = get_password_hash(user_data.password)

    db.commit()
    db.refresh(db_user)

    return {
        "id": db_user.id,
        "username": db_user.username,
        "name": db_user.name,
        "role": db_user.role,
        "department": db_user.department,
        "createdAt": db_user.created_at.isoformat() if db_user.created_at else None,
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    db.delete(db_user)
    db.commit()
    return None
