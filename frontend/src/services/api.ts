import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import {
  User,
  LoginRequest,
  LoginResponse,
  Workflow,
  WorkflowNode,
  Application,
  ApprovalRecord,
  NodeHistory,
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: LoginRequest): Promise<LoginResponse> =>
    api.post('/auth/login', data).then((res) => res.data),
  getMe: (): Promise<User> => api.get('/auth/me').then((res) => res.data),
};

export const userAPI = {
  getUsers: (): Promise<User[]> => api.get('/users').then((res) => res.data),
  createUser: (data: Partial<User> & { password: string }): Promise<User> =>
    api.post('/users', data).then((res) => res.data),
  updateUser: (id: number, data: Partial<User>): Promise<User> =>
    api.put(`/users/${id}`, data).then((res) => res.data),
  deleteUser: (id: number): Promise<void> =>
    api.delete(`/users/${id}`).then((res) => res.data),
};

export const workflowAPI = {
  getWorkflows: (): Promise<Workflow[]> =>
    api.get('/workflows').then((res) => res.data),
  getWorkflow: (id: number): Promise<Workflow> =>
    api.get(`/workflows/${id}`).then((res) => res.data),
  createWorkflow: (data: Partial<Workflow>): Promise<Workflow> =>
    api.post('/workflows', data).then((res) => res.data),
  updateWorkflow: (id: number, data: Partial<Workflow>): Promise<Workflow> =>
    api.put(`/workflows/${id}`, data).then((res) => res.data),
  deleteWorkflow: (id: number): Promise<void> =>
    api.delete(`/workflows/${id}`).then((res) => res.data),
  addNode: (workflowId: number, data: Partial<WorkflowNode>): Promise<WorkflowNode> =>
    api.post(`/workflows/${workflowId}/nodes`, data).then((res) => res.data),
};

export const nodeAPI = {
  updateNode: (id: number, data: Partial<WorkflowNode>): Promise<WorkflowNode> =>
    api.put(`/nodes/${id}`, data).then((res) => res.data),
  deleteNode: (id: number): Promise<void> =>
    api.delete(`/nodes/${id}`).then((res) => res.data),
  copyNode: (id: number): Promise<WorkflowNode> =>
    api.post(`/nodes/${id}/copy`).then((res) => res.data),
  setRequired: (id: number, isRequired: boolean): Promise<WorkflowNode> =>
    api.post(`/nodes/${id}/required`, { isRequired }).then((res) => res.data),
  pauseNode: (id: number, isPaused: boolean): Promise<WorkflowNode> =>
    api.post(`/nodes/${id}/pause`, { isPaused }).then((res) => res.data),
  getHistory: (id: number): Promise<NodeHistory[]> =>
    api.get(`/nodes/${id}/history`).then((res) => res.data),
};

export const applicationAPI = {
  getApplications: (params?: { status?: string }): Promise<Application[]> =>
    api.get('/applications', { params }).then((res) => res.data),
  getApplication: (id: number): Promise<Application> =>
    api.get(`/applications/${id}`).then((res) => res.data),
  createApplication: (data: Partial<Application>): Promise<Application> =>
    api.post('/applications', data).then((res) => res.data),
  updateApplication: (id: number, data: Partial<Application>): Promise<Application> =>
    api.put(`/applications/${id}`, data).then((res) => res.data),
  submitApplication: (id: number): Promise<Application> =>
    api.post(`/applications/${id}/submit`).then((res) => res.data),
  getApprovalRecords: (id: number): Promise<ApprovalRecord[]> =>
    api.get(`/applications/${id}/records`).then((res) => res.data),
};

export const approvalAPI = {
  approve: (applicationId: number, comment: string): Promise<ApprovalRecord> =>
    api.post(`/approvals/${applicationId}/approve`, { comment }).then((res) => res.data),
  reject: (applicationId: number, comment: string): Promise<ApprovalRecord> =>
    api.post(`/approvals/${applicationId}/reject`, { comment }).then((res) => res.data),
  transfer: (
    applicationId: number,
    transferToUserId: number,
    comment: string
  ): Promise<ApprovalRecord> =>
    api
      .post(`/approvals/${applicationId}/transfer`, { transferToUserId, comment })
      .then((res) => res.data),
};

export default api;
