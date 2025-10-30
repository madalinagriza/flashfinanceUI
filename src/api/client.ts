// Base API client for FlashFinance backend using axios
import axios, { AxiosInstance, AxiosError } from 'axios'

// Use Vue CLI env var if provided, otherwise default to dev proxy path '/api'
const API_BASE_URL = (process.env.VUE_APP_API_BASE as string | undefined) || '/api'

export class ApiClient {
  private client: AxiosInstance

  constructor(baseUrl: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.data) {
          const data = error.response.data as any
          // Try several common shapes for error payloads
          let extracted: string | undefined
          if (typeof data === 'string') {
            extracted = data
          } else if (data && typeof data === 'object') {
            // common keys
            extracted = data.error || data.message || data.err || undefined
            // sometimes backend logs include wrapped text; fallback to JSON
            if (!extracted) {
              try {
                extracted = JSON.stringify(data)
              } catch (_) {
                extracted = String(data)
              }
            }
          }

          const status = error.response.status
          const message = extracted || `HTTP ${status}: ${error.message}`
          // surface the server payload to aid debugging
          // eslint-disable-next-line no-console
          console.error('[ApiClient] server error payload:', error.response.data)
          throw new Error(message)
        }

        throw new Error(error.message || 'An unexpected error occurred')
      }
    )
  }

  /**
   * Makes a POST request to the specified endpoint
   */
  async post<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    const response = await this.client.post<TResponse>(endpoint, data)
    return response.data
  }

  /**
   * Makes a GET request to the specified endpoint (if needed in the future)
   */
  async get<TResponse>(endpoint: string): Promise<TResponse> {
    const response = await this.client.get<TResponse>(endpoint)
    return response.data
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
