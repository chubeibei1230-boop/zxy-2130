from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import User, Workflow, WorkflowNode, NodeConnection
from app.auth import get_password_hash
from app.routes import (
    auth_router,
    users_router,
    workflows_router,
    nodes_router,
    applications_router,
    approvals_router,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Workflow Approval System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(workflows_router)
app.include_router(nodes_router)
app.include_router(applications_router)
app.include_router(approvals_router)


@app.on_event("startup")
def init_data():
    db = SessionLocal()
    try:
        existing_users = db.query(User).count()
        if existing_users == 0:
            users = [
                User(
                    username="admin",
                    password_hash=get_password_hash("admin123"),
                    name="系统管理员",
                    role="admin",
                    department="IT部",
                ),
                User(
                    username="employee1",
                    password_hash=get_password_hash("123456"),
                    name="张三",
                    role="employee",
                    department="市场部",
                ),
                User(
                    username="employee2",
                    password_hash=get_password_hash("123456"),
                    name="李四",
                    role="employee",
                    department="技术部",
                ),
                User(
                    username="supervisor1",
                    password_hash=get_password_hash("123456"),
                    name="王主管",
                    role="supervisor",
                    department="市场部",
                ),
                User(
                    username="supervisor2",
                    password_hash=get_password_hash("123456"),
                    name="李主管",
                    role="supervisor",
                    department="技术部",
                ),
            ]
            db.add_all(users)
            db.commit()

            admin = db.query(User).filter(User.username == "admin").first()

            workflow = Workflow(
                name="请假审批流程",
                description="员工请假审批流程",
                type="leave",
                is_active=True,
                created_by=admin.id,
            )
            db.add(workflow)
            db.commit()
            db.refresh(workflow)

            start_node = WorkflowNode(
                workflow_id=workflow.id,
                name="开始",
                type="start",
                position_x=200,
                position_y=50,
                is_required=True,
            )
            db.add(start_node)

            supervisor_node = WorkflowNode(
                workflow_id=workflow.id,
                name="主管审批",
                type="approval",
                assignee_role="supervisor",
                timeout_hours=24,
                position_x=200,
                position_y=150,
                is_required=True,
            )
            db.add(supervisor_node)

            end_node = WorkflowNode(
                workflow_id=workflow.id,
                name="结束",
                type="end",
                position_x=200,
                position_y=250,
                is_required=True,
            )
            db.add(end_node)
            db.commit()

            workflow2 = Workflow(
                name="报销审批流程",
                description="费用报销审批流程",
                type="expense",
                is_active=True,
                created_by=admin.id,
            )
            db.add(workflow2)
            db.commit()
            db.refresh(workflow2)

            start_node2 = WorkflowNode(
                workflow_id=workflow2.id,
                name="开始",
                type="start",
                position_x=200,
                position_y=50,
                is_required=True,
            )
            db.add(start_node2)

            supervisor_node2 = WorkflowNode(
                workflow_id=workflow2.id,
                name="主管审批",
                type="approval",
                assignee_role="supervisor",
                timeout_hours=24,
                position_x=200,
                position_y=150,
                is_required=True,
            )
            db.add(supervisor_node2)

            finance_node = WorkflowNode(
                workflow_id=workflow2.id,
                name="财务审批",
                type="approval",
                assignee_role="admin",
                timeout_hours=48,
                position_x=200,
                position_y=250,
                is_required=True,
            )
            db.add(finance_node)

            end_node2 = WorkflowNode(
                workflow_id=workflow2.id,
                name="结束",
                type="end",
                position_x=200,
                position_y=350,
                is_required=True,
            )
            db.add(end_node2)
            db.commit()

        workflows = db.query(Workflow).all()
        for workflow in workflows:
            nodes = (
                db.query(WorkflowNode)
                .filter(WorkflowNode.workflow_id == workflow.id)
                .order_by(WorkflowNode.position_y.asc(), WorkflowNode.id.asc())
                .all()
            )
            for index, node in enumerate(nodes[:-1]):
                exists = (
                    db.query(NodeConnection)
                    .filter(
                        NodeConnection.from_node_id == node.id,
                        NodeConnection.to_node_id == nodes[index + 1].id,
                    )
                    .first()
                )
                if not exists:
                    db.add(
                        NodeConnection(
                            from_node_id=node.id,
                            to_node_id=nodes[index + 1].id,
                        )
                    )
        db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8030)
