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
          const errorData = error.response.data as { error?: string }
          throw new Error(errorData.error || `HTTP ${error.response.status}: ${error.message}`)
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
