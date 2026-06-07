from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.database import Base


class NodeHistory(Base):
    __tablename__ = "node_history"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("workflow_nodes.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    details = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
