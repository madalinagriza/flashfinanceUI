// User API endpoints

import { apiClient } from './client'
import type {
  User,
  RegisterRequest,
  AuthenticateRequest,
  DeactivateRequest,
  ChangePasswordRequest,
  ReactivateRequest,
  OkResponse,
} from './types'

export const userApi = {
  /**
   * POST /api/User/register
   * Registers a new user with a unique email, name, and password.
   */
  async register(request: RegisterRequest): Promise<User> {
    return apiClient.post<RegisterRequest, User>('/User/register', request)
  },

  /**
   * POST /api/User/authenticate
   * Authenticates a user with their email and password.
   */
  async authenticate(request: AuthenticateRequest): Promise<User> {
    return apiClient.post<AuthenticateRequest, User>('/User/authenticate', request)
  },

  /**
   * POST /api/User/deactivate
   * Sets a user's account status to INACTIVE.
   */
  async deactivate(request: DeactivateRequest): Promise<Record<string, never>> {
    return apiClient.post<DeactivateRequest, Record<string, never>>('/User/deactivate', request)
  },

  /**
   * POST /api/User/changePassword
   * Changes a user's password after verifying the old password.
   */
  async changePassword(request: ChangePasswordRequest): Promise<OkResponse> {
    return apiClient.post<ChangePasswordRequest, OkResponse>('/User/changePassword', request)
  },

  /**
   * POST /api/User/reactivate
   * Reactivates an inactive user account and updates their password.
   */
  async reactivate(request: ReactivateRequest): Promise<OkResponse> {
    return apiClient.post<ReactivateRequest, OkResponse>('/User/reactivate', request)
  },

  /**
   * POST /api/User/all
   * Returns all user documents in the system.
   */
  async all(): Promise<User[]> {
    return apiClient.post<Record<string, never>, User[]>('/User/all', {})
  },
}
