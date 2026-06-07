from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    type = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    nodes = relationship("WorkflowNode", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    assignee_role = Column(String(20))
    assignee_user_id = Column(Integer, ForeignKey("users.id"))
    timeout_hours = Column(Integer)
    is_required = Column(Boolean, default=True)
    is_paused = Column(Boolean, default=False)
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)

    workflow = relationship("Workflow", back_populates="nodes")
    outgoing_connections = relationship(
        "NodeConnection",
        foreign_keys="NodeConnection.from_node_id",
        back_populates="from_node",
        cascade="all, delete-orphan",
    )
    incoming_connections = relationship(
        "NodeConnection",
        foreign_keys="NodeConnection.to_node_id",
        back_populates="to_node",
        cascade="all, delete-orphan",
    )


class NodeConnection(Base):
    __tablename__ = "node_connections"

    id = Column(Integer, primary_key=True, index=True)
    from_node_id = Column(Integer, ForeignKey("workflow_nodes.id", ondelete="CASCADE"), nullable=False)
    to_node_id = Column(Integer, ForeignKey("workflow_nodes.id", ondelete="CASCADE"), nullable=False)

    from_node = relationship("WorkflowNode", foreign_keys=[from_node_id], back_populates="outgoing_connections")
    to_node = relationship("WorkflowNode", foreign_keys=[to_node_id], back_populates="incoming_connections")
