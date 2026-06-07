from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    current_node_id = Column(Integer, ForeignKey("workflow_nodes.id"))
    current_node_entered_at = Column(DateTime(timezone=True))
    attachments = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    withdrawn_at = Column(DateTime(timezone=True))
    withdrawn_by = Column(Integer, ForeignKey("users.id"))
    withdraw_reason = Column(Text)
    original_application_id = Column(Integer, ForeignKey("applications.id"))

    supplement_status = Column(String(20), default=None)
    supplement_requested_by = Column(Integer, ForeignKey("users.id"))
    supplement_requested_at = Column(DateTime(timezone=True))
    supplement_request_note = Column(Text)
    supplement_count = Column(Integer, default=0)

    approval_records = relationship("ApprovalRecord", back_populates="application", cascade="all, delete-orphan")
    urge_records = relationship("UrgeRecord", back_populates="application", cascade="all, delete-orphan")
    supplement_records = relationship("SupplementRecord", back_populates="application", cascade="all, delete-orphan")


class ApprovalRecord(Base):
    __tablename__ = "approval_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Integer, ForeignKey("workflow_nodes.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(20), nullable=False)
    comment = Column(Text)
    transfer_to_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="approval_records")


class UrgeRecord(Base):
    __tablename__ = "urge_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Integer, ForeignKey("workflow_nodes.id"), nullable=False)
    urged_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    handled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="urge_records")


class SupplementRecord(Base):
    __tablename__ = "supplement_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Integer, ForeignKey("workflow_nodes.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    request_note = Column(Text, nullable=False)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    
    submitted_content = Column(Text)
    submitted_attachments = Column(Text)
    submitted_at = Column(DateTime(timezone=True))
    
    status = Column(String(20), nullable=False, default="pending")

    application = relationship("Application", back_populates="supplement_records")
