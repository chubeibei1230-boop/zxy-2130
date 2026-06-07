from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, WorkflowNode, NodeConnection, NodeHistory
from app.schemas import WorkflowNodeUpdate
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


def serialize_node(node: WorkflowNode) -> dict:
    return {
        "id": node.id,
        "workflowId": node.workflow_id,
        "name": node.name,
        "type": node.type,
        "assigneeRole": node.assignee_role,
        "assigneeUserId": node.assignee_user_id,
        "timeoutHours": node.timeout_hours,
        "isRequired": node.is_required,
        "isPaused": node.is_paused,
        "positionX": node.position_x,
        "positionY": node.position_y,
        "connections": [c.to_node_id for c in node.outgoing_connections],
    }


def add_node_history(db: Session, node_id: int, action: str, operator_id: int, details: str):
    history = NodeHistory(
        node_id=node_id,
        action=action,
        operator_id=operator_id,
        details=details,
    )
    db.add(history)
    db.commit()


@router.put("/{node_id}", response_model=dict)
def update_node(
    node_id: int,
    node_data: WorkflowNodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_node = db.query(WorkflowNode).filter(WorkflowNode.id == node_id).first()
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    update_fields = []
    if node_data.name is not None:
        db_node.name = node_data.name
        update_fields.append("name")
    if node_data.type is not None:
        db_node.type = node_data.type
        update_fields.append("type")
    if node_data.assigneeRole is not None:
        db_node.assignee_role = node_data.assigneeRole
        update_fields.append("assigneeRole")
    if node_data.assigneeUserId is not None:
        db_node.assignee_user_id = node_data.assigneeUserId
        update_fields.append("assigneeUserId")
    if node_data.timeoutHours is not None:
        db_node.timeout_hours = node_data.timeoutHours
        update_fields.append("timeoutHours")
    if node_data.isRequired is not None:
        db_node.is_required = node_data.isRequired
        update_fields.append("isRequired")
    if node_data.isPaused is not None:
        db_node.is_paused = node_data.isPaused
        update_fields.append("isPaused")
    if node_data.positionX is not None:
        db_node.position_x = node_data.positionX
        update_fields.append("positionX")
    if node_data.positionY is not None:
        db_node.position_y = node_data.positionY
        update_fields.append("positionY")

    if node_data.connections is not None:
        db.query(NodeConnection).filter(NodeConnection.from_node_id == node_id).delete()
        for to_node_id in node_data.connections:
            connection = NodeConnection(
                from_node_id=node_id,
                to_node_id=to_node_id,
            )
            db.add(connection)
        update_fields.append("connections")

    db.commit()
    db.refresh(db_node)

    add_node_history(db, node_id, "update", current_user.id, f"Updated fields: {', '.join(update_fields)}")

    return serialize_node(db_node)


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_node = db.query(WorkflowNode).filter(WorkflowNode.id == node_id).first()
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )
    if db_node.type in ["start", "end"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete start or end nodes",
        )
    db.delete(db_node)
    db.commit()
    return None


@router.post("/{node_id}/copy", response_model=dict)
def copy_node(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_node = db.query(WorkflowNode).filter(WorkflowNode.id == node_id).first()
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    new_node = WorkflowNode(
        workflow_id=db_node.workflow_id,
        name=f"{db_node.name} (副本)",
        type=db_node.type,
        assignee_role=db_node.assignee_role,
        assignee_user_id=db_node.assignee_user_id,
        timeout_hours=db_node.timeout_hours,
        is_required=db_node.is_required,
        is_paused=db_node.is_paused,
        position_x=db_node.position_x + 30,
        position_y=db_node.position_y + 30,
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)

    add_node_history(db, node_id, "copy", current_user.id, f"Copied to node {new_node.id}")
    add_node_history(db, new_node.id, "create", current_user.id, f"Created as copy of node {node_id}")

    return serialize_node(new_node)


@router.post("/{node_id}/required", response_model=dict)
def set_required(
    node_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_node = db.query(WorkflowNode).filter(WorkflowNode.id == node_id).first()
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    is_required = data.get("isRequired", True)
    db_node.is_required = is_required
    db.commit()
    db.refresh(db_node)

    add_node_history(db, node_id, "set_required", current_user.id, f"Set required to {is_required}")

    return serialize_node(db_node)


@router.post("/{node_id}/pause", response_model=dict)
def pause_node(
    node_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_node = db.query(WorkflowNode).filter(WorkflowNode.id == node_id).first()
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found",
        )

    is_paused = data.get("isPaused", True)
    db_node.is_paused = is_paused
    db.commit()
    db.refresh(db_node)

    add_node_history(db, node_id, "pause", current_user.id, f"Set paused to {is_paused}")

    return serialize_node(db_node)


@router.get("/{node_id}/history", response_model=List[dict])
def get_node_history(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    histories = (
        db.query(NodeHistory)
        .filter(NodeHistory.node_id == node_id)
        .order_by(NodeHistory.created_at.desc())
        .all()
    )

    result = []
    for h in histories:
        operator = db.query(User).filter(User.id == h.operator_id).first()
        result.append({
            "id": h.id,
            "nodeId": h.node_id,
            "action": h.action,
            "operatorId": h.operator_id,
            "operatorName": operator.name if operator else None,
            "details": h.details,
            "createdAt": h.created_at.isoformat() if h.created_at else None,
        })

    return result
