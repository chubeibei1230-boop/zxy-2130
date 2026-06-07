from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, Application, Workflow, WorkflowNode, ApprovalRecord, UrgeRecord
from app.schemas import ApplicationCreate, ApplicationUpdate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/applications", tags=["applications"])


def get_urge_info(app: Application, db: Session) -> dict:
    urge_records = (
        db.query(UrgeRecord)
        .filter(UrgeRecord.application_id == app.id)
        .order_by(UrgeRecord.created_at.desc())
        .all()
    )
    latest_urge = urge_records[0] if urge_records else None
    return {
        "urgeCount": len(urge_records),
        "isUrged": len(urge_records) > 0,
        "latestUrgeAt": latest_urge.created_at.isoformat() if latest_urge and latest_urge.created_at else None,
        "latestUrgeStatus": latest_urge.status if latest_urge else None,
    }


def get_aging_info(app: Application, db: Session) -> dict:
    if not app.current_node_id or not app.current_node_entered_at:
        return {
            "remainingHours": None,
            "elapsedHours": None,
            "isNearTimeout": False,
            "isTimeout": False,
            "timeoutHours": None,
        }
    
    current_node = db.query(WorkflowNode).filter(WorkflowNode.id == app.current_node_id).first()
    if not current_node or not current_node.timeout_hours:
        return {
            "remainingHours": None,
            "elapsedHours": None,
            "isNearTimeout": False,
            "isTimeout": False,
            "timeoutHours": None,
        }
    
    now = datetime.utcnow()
    elapsed = now - app.current_node_entered_at.replace(tzinfo=None)
    elapsed_hours = elapsed.total_seconds() / 3600
    remaining_hours = current_node.timeout_hours - elapsed_hours
    
    return {
        "remainingHours": round(remaining_hours, 1),
        "elapsedHours": round(elapsed_hours, 1),
        "isNearTimeout": remaining_hours <= 24 and remaining_hours > 0,
        "isTimeout": remaining_hours <= 0,
        "timeoutHours": current_node.timeout_hours,
    }


def serialize_application(app: Application, db: Session, include_aging: bool = False) -> dict:
    workflow = db.query(Workflow).filter(Workflow.id == app.workflow_id).first()
    applicant = db.query(User).filter(User.id == app.applicant_id).first()
    current_node = None
    if app.current_node_id:
        current_node = db.query(WorkflowNode).filter(WorkflowNode.id == app.current_node_id).first()
    
    result = {
        "id": app.id,
        "workflowId": app.workflow_id,
        "workflowName": workflow.name if workflow else None,
        "workflowType": workflow.type if workflow else None,
        "title": app.title,
        "content": app.content,
        "applicantId": app.applicant_id,
        "applicantName": applicant.name if applicant else None,
        "status": app.status,
        "currentNodeId": app.current_node_id,
        "currentNodeName": current_node.name if current_node else None,
        "currentNodeEnteredAt": app.current_node_entered_at.isoformat() if app.current_node_entered_at else None,
        "attachments": app.attachments.split(",") if app.attachments else [],
        "createdAt": app.created_at.isoformat() if app.created_at else None,
        "updatedAt": app.updated_at.isoformat() if app.updated_at else None,
        "urgeInfo": get_urge_info(app, db),
    }
    
    if include_aging:
        result["agingInfo"] = get_aging_info(app, db)
    
    return result


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
    db_application.current_node_entered_at = func.now() if next_node else None
    db.commit()
    db.refresh(db_application)

    return serialize_application(db_application, db)


@router.post("/{application_id}/urge", response_model=dict)
def urge_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "employee"])),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if application.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only urge pending applications",
        )

    if not application.current_node_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application has no current node",
        )

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_urge = (
        db.query(UrgeRecord)
        .filter(
            UrgeRecord.application_id == application_id,
            UrgeRecord.node_id == application.current_node_id,
            UrgeRecord.created_at >= one_hour_ago,
        )
        .first()
    )
    if recent_urge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only urge once per hour for the same node",
        )

    urge_record = UrgeRecord(
        application_id=application_id,
        node_id=application.current_node_id,
        urged_by=current_user.id,
        status="pending",
    )
    db.add(urge_record)
    db.commit()
    db.refresh(urge_record)

    return {
        "id": urge_record.id,
        "applicationId": urge_record.application_id,
        "nodeId": urge_record.node_id,
        "urgedBy": urge_record.urged_by,
        "urgedByName": current_user.name,
        "status": urge_record.status,
        "createdAt": urge_record.created_at.isoformat() if urge_record.created_at else None,
    }


@router.get("/{application_id}/urge-records", response_model=List[dict])
def get_urge_records(
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
        db.query(UrgeRecord)
        .filter(UrgeRecord.application_id == application_id)
        .order_by(UrgeRecord.created_at.desc())
        .all()
    )

    result = []
    for r in records:
        urged_by = db.query(User).filter(User.id == r.urged_by).first()
        node = db.query(WorkflowNode).filter(WorkflowNode.id == r.node_id).first()
        result.append({
            "id": r.id,
            "applicationId": r.application_id,
            "nodeId": r.node_id,
            "nodeName": node.name if node else None,
            "urgedBy": r.urged_by,
            "urgedByName": urged_by.name if urged_by else None,
            "status": r.status,
            "handledAt": r.handled_at.isoformat() if r.handled_at else None,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        })

    return result


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


@router.get("/admin/aging-dashboard", response_model=dict)
def get_aging_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    workflows = db.query(Workflow).all()
    workflow_stats = []

    total_pending = 0
    total_timeout = 0
    total_urged = 0
    total_near_timeout = 0

    for workflow in workflows:
        apps = db.query(Application).filter(
            Application.workflow_id == workflow.id,
            Application.status == "pending",
        ).all()

        timeout_count = 0
        near_timeout_count = 0
        urged_count = 0
        elapsed_hours_list = []

        for app in apps:
            aging = get_aging_info(app, db)
            urge = get_urge_info(app, db)
            
            if aging.get("isTimeout"):
                timeout_count += 1
            if aging.get("isNearTimeout"):
                near_timeout_count += 1
            if urge.get("isUrged"):
                urged_count += 1
            if aging.get("elapsedHours") is not None:
                elapsed_hours_list.append(aging["elapsedHours"])

        avg_elapsed = round(sum(elapsed_hours_list) / len(elapsed_hours_list), 1) if elapsed_hours_list else 0
        
        workflow_stats.append({
            "workflowId": workflow.id,
            "workflowName": workflow.name,
            "workflowType": workflow.type,
            "pendingCount": len(apps),
            "timeoutCount": timeout_count,
            "nearTimeoutCount": near_timeout_count,
            "urgedCount": urged_count,
            "avgElapsedHours": avg_elapsed,
        })

        total_pending += len(apps)
        total_timeout += timeout_count
        total_urged += urged_count
        total_near_timeout += near_timeout_count

    node_bottlenecks = []
    nodes = db.query(WorkflowNode).filter(WorkflowNode.type == "approval").all()
    for node in nodes:
        apps_at_node = db.query(Application).filter(
            Application.current_node_id == node.id,
            Application.status == "pending",
        ).all()
        
        timeout_at_node = 0
        elapsed_list = []
        for app in apps_at_node:
            aging = get_aging_info(app, db)
            if aging.get("isTimeout"):
                timeout_at_node += 1
            if aging.get("elapsedHours") is not None:
                elapsed_list.append(aging["elapsedHours"])
        
        avg_elapsed = round(sum(elapsed_list) / len(elapsed_list), 1) if elapsed_list else 0
        workflow = db.query(Workflow).filter(Workflow.id == node.workflow_id).first()
        
        node_bottlenecks.append({
            "nodeId": node.id,
            "nodeName": node.name,
            "workflowId": node.workflow_id,
            "workflowName": workflow.name if workflow else None,
            "pendingCount": len(apps_at_node),
            "timeoutCount": timeout_at_node,
            "avgElapsedHours": avg_elapsed,
        })

    node_bottlenecks.sort(key=lambda x: (-x["pendingCount"], -x["avgElapsedHours"]))

    return {
        "summary": {
            "totalPending": total_pending,
            "totalTimeout": total_timeout,
            "totalNearTimeout": total_near_timeout,
            "totalUrged": total_urged,
        },
        "workflowStats": workflow_stats,
        "nodeBottlenecks": node_bottlenecks,
    }
