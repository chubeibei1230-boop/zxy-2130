export type UserRole = 'admin' | 'employee' | 'supervisor';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export type NodeType = 'start' | 'approval' | 'condition' | 'end';

export interface WorkflowNode {
  id: number;
  workflowId: number;
  name: string;
  type: NodeType;
  assigneeRole?: string;
  assigneeUserId?: number;
  timeoutHours?: number;
  isRequired: boolean;
  isPaused: boolean;
  positionX: number;
  positionY: number;
  connections?: number[];
}

export interface Workflow {
  id: number;
  name: string;
  description: string;
  type: string;
  nodes: WorkflowNode[];
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

export type ApplicationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';

export interface Application {
  id: number;
  workflowId: number;
  workflowName?: string;
  title: string;
  content: string;
  applicantId: number;
  applicantName?: string;
  status: ApplicationStatus;
  currentNodeId?: number;
  currentNodeName?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export type ApprovalAction = 'approve' | 'reject' | 'transfer';

export interface ApprovalRecord {
  id: number;
  applicationId: number;
  nodeId: number;
  nodeName?: string;
  approverId: number;
  approverName?: string;
  action: ApprovalAction;
  comment: string;
  transferToUserId?: number;
  transferToUserName?: string;
  createdAt: string;
}

export interface NodeHistory {
  id: number;
  nodeId: number;
  action: string;
  operatorId: number;
  operatorName?: string;
  details: string;
  createdAt: string;
}
