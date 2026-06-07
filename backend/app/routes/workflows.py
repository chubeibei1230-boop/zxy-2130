from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User, Workflow, WorkflowNode, NodeConnection
from app.schemas import WorkflowCreate, WorkflowUpdate, WorkflowNodeCreate
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


def serialize_workflow(wf: Workflow) -> dict:
    return {
        "id": wf.id,
        "name": wf.name,
        "description": wf.description,
        "type": wf.type,
        "isActive": wf.is_active,
        "createdBy": wf.created_by,
        "createdAt": wf.created_at.isoformat() if wf.created_at else None,
        "nodes": [
            {
                "id": n.id,
                "workflowId": n.workflow_id,
                "name": n.name,
                "type": n.type,
                "assigneeRole": n.assignee_role,
                "assigneeUserId": n.assignee_user_id,
                "timeoutHours": n.timeout_hours,
                "isRequired": n.is_required,
                "isPaused": n.is_paused,
                "positionX": n.position_x,
                "positionY": n.position_y,
                "connections": [c.to_node_id for c in n.outgoing_connections],
            }
            for n in wf.nodes
        ],
    }


@router.get("", response_model=List[dict])
def get_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflows = db.query(Workflow).all()
    return [serialize_workflow(wf) for wf in workflows]


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_workflow(
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        type=workflow_data.type,
        is_active=workflow_data.isActive,
        created_by=current_user.id,
    )
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)

    start_node = WorkflowNode(
        workflow_id=db_workflow.id,
        name="开始",
        type="start",
        position_x=200,
        position_y=50,
        is_required=True,
    )
    db.add(start_node)

    end_node = WorkflowNode(
        workflow_id=db_workflow.id,
        name="结束",
        type="end",
        position_x=200,
        position_y=350,
        is_required=True,
    )
    db.add(end_node)
    db.commit()

    return serialize_workflow(db_workflow)


@router.get("/{workflow_id}", response_model=dict)
def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return serialize_workflow(workflow)


@router.put("/{workflow_id}", response_model=dict)
def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not db_workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )

    if workflow_data.name is not None:
        db_workflow.name = workflow_data.name
    if workflow_data.description is not None:
        db_workflow.description = workflow_data.description
    if workflow_data.type is not None:
        db_workflow.type = workflow_data.type
    if workflow_data.isActive is not None:
        db_workflow.is_active = workflow_data.isActive

    db.commit()
    db.refresh(db_workflow)
    return serialize_workflow(db_workflow)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    db_workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not db_workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    db.delete(db_workflow)
    db.commit()
    return None


@router.post("/{workflow_id}/nodes", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_node(
    workflow_id: int,
    node_data: WorkflowNodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )

    db_node = WorkflowNode(
        workflow_id=workflow_id,
        name=node_data.name,
        type=node_data.type,
        assignee_role=node_data.assigneeRole,
        assignee_user_id=node_data.assigneeUserId,
        timeout_hours=node_data.timeoutHours,
        is_required=node_data.isRequired,
        is_paused=node_data.isPaused,
        position_x=node_data.positionX,
        position_y=node_data.positionY,
    )
    db.add(db_node)
    db.commit()
    db.refresh(db_node)

    if node_data.connections:
        for to_node_id in node_data.connections:
            connection = NodeConnection(
                from_node_id=db_node.id,
                to_node_id=to_node_id,
            )
            db.add(connection)
        db.commit()
        db.refresh(db_node)

    return {
        "id": db_node.id,
        "workflowId": db_node.workflow_id,
        "name": db_node.name,
        "type": db_node.type,
        "assigneeRole": db_node.assignee_role,
        "assigneeUserId": db_node.assignee_user_id,
        "timeoutHours": db_node.timeout_hours,
        "isRequired": db_node.is_required,
        "isPaused": db_node.is_paused,
        "positionX": db_node.position_x,
        "positionY": db_node.position_y,
        "connections": [c.to_node_id for c in db_node.outgoing_connections],
    }
