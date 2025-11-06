// User API endpoints

import { apiClient } from './client'
import type {
  User,
  RegisterRequest,
  AuthenticateRequest,
  // DeactivateRequest,
  ChangePasswordRequest,
  // ReactivateRequest,
  UserAuthenticationResponse,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
} from './types'

export const userApi = {
  /**
   * POST /api/UserAuthentication/register
   * Registers a new user with a unique username and password.
   */
  async register(request: RegisterRequest): Promise<User> {
    const response = await apiClient.post<RegisterRequest, UserAuthenticationResponse>(
      '/UserAuthentication/register',
      request
    )

    return {
      user_id: response.user,
      username: request.username,
      status: 'ACTIVE',
    }
  },

  /**
   * POST /api/UserAuthentication/login
   * Authenticates a user with their username and password.
   */
  async authenticate(request: AuthenticateRequest): Promise<User> {
    const response = await apiClient.post<AuthenticateRequest, UserAuthenticationResponse>(
      '/UserAuthentication/login',
      request
    )

    let sessionId: string | undefined
    const loginEndpoints = ['/login', '/Login']

    for (const endpoint of loginEndpoints) {
      try {
        const sessionResponse = await apiClient.post<AuthenticateRequest, LoginResponse>(endpoint, request)
        if (sessionResponse?.session) {
          sessionId = sessionResponse.session
          console.debug(`userApi.authenticate: session established via ${endpoint}`)
          break
        }
      } catch (err: any) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`userApi.authenticate: ${endpoint} failed (${message})`)
      }
    }

    if (!sessionId) {
      console.warn('userApi.authenticate: proceeding without session — /login endpoints unavailable')
    }

    return {
      user_id: response.user,
      username: request.username,
      status: 'ACTIVE',
      session: sessionId,
    }
  },

  // /**
  //  * POST /api/User/deactivate
  //  * Sets a user's account status to INACTIVE.
  //  */
  // async deactivate(request: DeactivateRequest): Promise<Record<string, never>> {
  //   return apiClient.post<DeactivateRequest, Record<string, never>>('/User/deactivate', request)
  // },

  /**
   * POST /api/UserAuthentication/changePassword
   * Changes a user's password after verifying the old password.
   */
  async changePassword(request: ChangePasswordRequest): Promise<Record<string, never>> {
    return apiClient.post<ChangePasswordRequest, Record<string, never>>(
      '/UserAuthentication/changePassword',
      request
    )
  },

  /**
   * POST /logout
   * Invalidates the active session on the server.
   */
  async logout(request: LogoutRequest): Promise<LogoutResponse> {
    return apiClient.post<LogoutRequest, LogoutResponse>('/logout', request)
  },

  // /**
  //  * POST /api/User/reactivate
  //  * Reactivates an inactive user account and updates their password.
  //  */
  // async reactivate(request: ReactivateRequest): Promise<OkResponse> {
  //   return apiClient.post<ReactivateRequest, OkResponse>('/User/reactivate', request)
  // },

  /**
   * Listing users is not supported under the UserAuthentication concept.
   * Returns an empty array to keep legacy callers defensive.
   */
  async all(): Promise<User[]> {
    console.warn('[userApi] Listing users is not supported by UserAuthentication API.')
    return []
  },
}
