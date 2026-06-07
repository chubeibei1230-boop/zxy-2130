from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Application, WorkflowNode, ApprovalRecord
from app.schemas import ApprovalAction
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def get_next_node(db: Session, current_node_id: int) -> WorkflowNode:
    current_node = db.query(WorkflowNode).filter(WorkflowNode.id == current_node_id).first()
    if not current_node or not current_node.outgoing_connections:
        return None

    next_connection = current_node.outgoing_connections[0]
    next_node = db.query(WorkflowNode).filter(WorkflowNode.id == next_connection.to_node_id).first()
    return next_node


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
