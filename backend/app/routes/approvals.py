from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from typing import List, Optional
from app.models import User, Application, Workflow, WorkflowNode, ApprovalRecord
from app.schemas import ApprovalAction
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def get_next_node(db: Session, current_node_id: int) -> WorkflowNode:
    current_node = db.query(WorkflowNode).filter(WorkflowNode.id == current_node_id).first()
    if not current_node:
        return None

    if current_node.outgoing_connections:
        next_connection = current_node.outgoing_connections[0]
        return db.query(WorkflowNode).filter(WorkflowNode.id == next_connection.to_node_id).first()

    return (
        db.query(WorkflowNode)
        .filter(
            WorkflowNode.workflow_id == current_node.workflow_id,
            WorkflowNode.position_y > current_node.position_y,
        )
        .order_by(WorkflowNode.position_y.asc(), WorkflowNode.id.asc())
        .first()
    )


def serialize_application(app: Application, db: Session) -> dict:
    workflow = db.query(Workflow).filter(Workflow.id == app.workflow_id).first()
    applicant = db.query(User).filter(User.id == app.applicant_id).first()
    current_node = None
    if app.current_node_id:
        current_node = db.query(WorkflowNode).filter(WorkflowNode.id == app.current_node_id).first()

    return {
        "id": app.id,
        "workflowId": app.workflow_id,
        "workflowName": workflow.name if workflow else None,
        "title": app.title,
        "content": app.content,
        "applicantId": app.applicant_id,
        "applicantName": applicant.name if applicant else None,
        "status": app.status,
        "currentNodeId": app.current_node_id,
        "currentNodeName": current_node.name if current_node else None,
        "attachments": app.attachments.split(",") if app.attachments else [],
        "createdAt": app.created_at.isoformat() if app.created_at else None,
        "updatedAt": app.updated_at.isoformat() if app.updated_at else None,
    }


def serialize_record(record: ApprovalRecord, db: Session) -> dict:
    approver = db.query(User).filter(User.id == record.approver_id).first()
    node = db.query(WorkflowNode).filter(WorkflowNode.id == record.node_id).first()
    transfer_to = None
    if record.transfer_to_user_id:
        transfer_to = db.query(User).filter(User.id == record.transfer_to_user_id).first()

    return {
        "id": record.id,
        "applicationId": record.application_id,
        "nodeId": record.node_id,
        "nodeName": node.name if node else None,
        "approverId": record.approver_id,
        "approverName": approver.name if approver else None,
        "action": record.action,
        "comment": record.comment,
        "transferToUserId": record.transfer_to_user_id,
        "transferToUserName": transfer_to.name if transfer_to else None,
        "createdAt": record.created_at.isoformat() if record.created_at else None,
    }


@router.get("/pending", response_model=List[dict])
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    query = db.query(Application).filter(Application.status == "pending")

    if current_user.role == "supervisor":
        query = query.join(WorkflowNode, Application.current_node_id == WorkflowNode.id).filter(
            (WorkflowNode.assignee_role == "supervisor")
            | (WorkflowNode.assignee_user_id == current_user.id)
            | (WorkflowNode.assignee_role.is_(None))
        )

    applications = query.order_by(Application.created_at.desc()).all()
    return [serialize_application(app, db) for app in applications]


@router.get("/handled", response_model=List[dict])
def get_handled_approvals(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    query = db.query(Application).join(ApprovalRecord).filter(
        ApprovalRecord.approver_id == current_user.id
    )
    if status_filter:
        query = query.filter(Application.status == status_filter)
    applications = query.order_by(Application.updated_at.desc()).distinct().all()
    return [serialize_application(app, db) for app in applications]


@router.get("/transfer-users", response_model=List[dict])
def get_transfer_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    users = (
        db.query(User)
        .filter(User.role.in_(["admin", "supervisor"]), User.id != current_user.id)
        .order_by(User.role.asc(), User.name.asc())
        .all()
    )
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


@router.post("/{application_id}/approve", response_model=dict)
def approve_application(
    application_id: int,
    action_data: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not pending",
        )

    current_node = None
    if application.current_node_id:
        current_node = db.query(WorkflowNode).filter(
            WorkflowNode.id == application.current_node_id
        ).first()

    if current_node and current_node.is_paused:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current node is paused",
        )

    approval_record = ApprovalRecord(
        application_id=application_id,
        node_id=application.current_node_id,
        approver_id=current_user.id,
        action="approve",
        comment=action_data.comment,
    )
    db.add(approval_record)

    next_node = get_next_node(db, application.current_node_id) if application.current_node_id else None

    if next_node:
        if next_node.type == "end":
            application.status = "completed"
            application.current_node_id = next_node.id
        else:
            application.current_node_id = next_node.id
    else:
        application.status = "completed"

    db.commit()
    db.refresh(approval_record)

    return serialize_record(approval_record, db)


@router.post("/{application_id}/reject", response_model=dict)
def reject_application(
    application_id: int,
    action_data: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not pending",
        )

    approval_record = ApprovalRecord(
        application_id=application_id,
        node_id=application.current_node_id,
        approver_id=current_user.id,
        action="reject",
        comment=action_data.comment,
    )
    db.add(approval_record)

    application.status = "rejected"
    db.commit()
    db.refresh(approval_record)

    return serialize_record(approval_record, db)


@router.post("/{application_id}/transfer", response_model=dict)
def transfer_application(
    application_id: int,
    action_data: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "supervisor"])),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application is not pending",
        )

    if not action_data.transferToUserId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="transferToUserId is required",
        )

    transfer_to_user = db.query(User).filter(User.id == action_data.transferToUserId).first()
    if not transfer_to_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found",
        )

    approval_record = ApprovalRecord(
        application_id=application_id,
        node_id=application.current_node_id,
        approver_id=current_user.id,
        action="transfer",
        comment=action_data.comment,
        transfer_to_user_id=action_data.transferToUserId,
    )
    db.add(approval_record)
    db.commit()
    db.refresh(approval_record)

    return serialize_record(approval_record, db)
