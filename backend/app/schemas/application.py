from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ApplicationBase(BaseModel):
    workflowId: int
    title: str
    content: Optional[str] = None
    attachments: Optional[List[str]] = []


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    attachments: Optional[List[str]] = None
    status: Optional[str] = None


class WithdrawRequest(BaseModel):
    reason: str


class ApprovalAction(BaseModel):
    comment: str
    transferToUserId: Optional[int] = None


class Application(ApplicationBase):
    id: int
    applicantId: int
    applicantName: Optional[str] = None
    workflowName: Optional[str] = None
    status: str
    currentNodeId: Optional[int] = None
    currentNodeName: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class ApprovalRecord(BaseModel):
    id: int
    applicationId: int
    nodeId: int
    nodeName: Optional[str] = None
    approverId: int
    approverName: Optional[str] = None
    action: str
    comment: str
    transferToUserId: Optional[int] = None
    transferToUserName: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True


class SupplementRequest(BaseModel):
    note: str


class SupplementSubmit(BaseModel):
    content: Optional[str] = None
    attachments: Optional[List[str]] = []


class SupplementRecord(BaseModel):
    id: int
    applicationId: int
    nodeId: int
    nodeName: Optional[str] = None
    requestedBy: int
    requestedByName: Optional[str] = None
    requestNote: str
    requestedAt: datetime
    submittedContent: Optional[str] = None
    submittedAttachments: Optional[List[str]] = []
    submittedAt: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True
