from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, Application, Workflow, WorkflowNode, ApprovalRecord
from app.schemas import ApplicationCreate, ApplicationUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/applications", tags=["applications"])


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


def get_next_workflow_node(db: Session, current_node: WorkflowNode) -> WorkflowNode:
    if not current_node:
        return None
    if current_node.outgoing_connections:
        next_node_id = current_node.outgoing_connections[0].to_node_id
        return db.query(WorkflowNode).filter(WorkflowNode.id == next_node_id).first()
    return (
        db.query(WorkflowNode)
        .filter(
            WorkflowNode.workflow_id == current_node.workflow_id,
            WorkflowNode.position_y > current_node.position_y,
        )
        .order_by(WorkflowNode.position_y.asc(), WorkflowNode.id.asc())
        .first()
    )


@router.get("", response_model=List[dict])
def get_applications(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Application)

    if current_user.role == "employee":
        query = query.filter(Application.applicant_id == current_user.id)
    elif current_user.role == "supervisor":
        pass

    if status:
        query = query.filter(Application.status == status)

    applications = query.order_by(Application.created_at.desc()).all()
    return [serialize_application(app, db) for app in applications]


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_application(
    application_data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "employee"])),
):
    workflow = db.query(Workflow).filter(Workflow.id == application_data.workflowId).first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )

    start_node = db.query(WorkflowNode).filter(
        WorkflowNode.workflow_id == application_data.workflowId,
        WorkflowNode.type == "start",
    ).first()

    db_application = Application(
        workflow_id=application_data.workflowId,
        title=application_data.title,
        content=application_data.content,
        applicant_id=current_user.id,
        status="draft",
        current_node_id=start_node.id if start_node else None,
        attachments=",".join(application_data.attachments) if application_data.attachments else None,
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)

    return serialize_application(db_application, db)


@router.get("/{application_id}", response_model=dict)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if current_user.role == "employee" and application.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return serialize_application(application, db)


@router.put("/{application_id}", response_model=dict)
def update_application(
    application_id: int,
    application_data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_application = db.query(Application).filter(Application.id == application_id).first()
    if not db_application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if current_user.role == "employee" and db_application.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if db_application.status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update application in current status",
        )

    if application_data.title is not None:
        db_application.title = application_data.title
    if application_data.content is not None:
        db_application.content = application_data.content
    if application_data.attachments is not None:
        db_application.attachments = ",".join(application_data.attachments)
    if application_data.status is not None:
        db_application.status = application_data.status

    db.commit()
    db.refresh(db_application)

    return serialize_application(db_application, db)


@router.post("/{application_id}/submit", response_model=dict)
def submit_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "employee"])),
):
    db_application = db.query(Application).filter(Application.id == application_id).first()
    if not db_application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if db_application.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if db_application.status not in ["draft", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit application in current status",
        )

    workflow = db.query(Workflow).filter(Workflow.id == db_application.workflow_id).first()
    start_node = db.query(WorkflowNode).filter(
        WorkflowNode.workflow_id == workflow.id,
        WorkflowNode.type == "start",
    ).first()

    next_node = get_next_workflow_node(db, start_node)

    db_application.status = "pending" if next_node else "completed"
    db_application.current_node_id = next_node.id if next_node else start_node.id if start_node else None
    db.commit()
    db.refresh(db_application)

    return serialize_application(db_application, db)


@router.get("/{application_id}/records", response_model=List[dict])
def get_approval_records(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if current_user.role == "employee" and application.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    records = (
        db.query(ApprovalRecord)
        .filter(ApprovalRecord.application_id == application_id)
        .order_by(ApprovalRecord.created_at.asc())
        .all()
    )

    result = []
    for r in records:
        approver = db.query(User).filter(User.id == r.approver_id).first()
        node = db.query(WorkflowNode).filter(WorkflowNode.id == r.node_id).first()
        transfer_to = None
        if r.transfer_to_user_id:
            transfer_to = db.query(User).filter(User.id == r.transfer_to_user_id).first()

        result.append({
            "id": r.id,
            "applicationId": r.application_id,
            "nodeId": r.node_id,
            "nodeName": node.name if node else None,
            "approverId": r.approver_id,
            "approverName": approver.name if approver else None,
            "action": r.action,
            "comment": r.comment,
            "transferToUserId": r.transfer_to_user_id,
            "transferToUserName": transfer_to.name if transfer_to else None,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        })

    return result
