from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class WorkflowNodeBase(BaseModel):
    name: str
    type: str
    assigneeRole: Optional[str] = None
    assigneeUserId: Optional[int] = None
    timeoutHours: Optional[int] = None
    isRequired: bool = True
    isPaused: bool = False
    positionX: int = 0
    positionY: int = 0
    connections: Optional[List[int]] = []


class WorkflowNodeCreate(WorkflowNodeBase):
    pass


class WorkflowNodeUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    assigneeRole: Optional[str] = None
    assigneeUserId: Optional[int] = None
    timeoutHours: Optional[int] = None
    isRequired: Optional[bool] = None
    isPaused: Optional[bool] = None
    positionX: Optional[int] = None
    positionY: Optional[int] = None
    connections: Optional[List[int]] = None


class WorkflowNode(WorkflowNodeBase):
    id: int
    workflowId: int

    class Config:
        from_attributes = True


class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    isActive: bool = True


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    isActive: Optional[bool] = None


class Workflow(WorkflowBase):
    id: int
    createdBy: int
    createdAt: datetime
    nodes: List[WorkflowNode] = []

    class Config:
        from_attributes = True
