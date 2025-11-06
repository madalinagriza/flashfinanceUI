// File uploading API endpoints

import { apiClient } from './client'
import type { UploadFileRequest, UploadFileResponse } from './types'

export const fileUploadingApi = {
  /**
   * POST /api/FileUploading/uploadFile
   * Persists file content for a user and returns the created file identifier.
   */
  async uploadFile(request: UploadFileRequest): Promise<UploadFileResponse> {
    const primary = '/FileUploading/uploadFile'
    const fallback = '/FileUploading/upload_file'

    try {
      const resp = await apiClient.post<UploadFileRequest, UploadFileResponse>(primary, request)
      console.debug('fileUploadingApi.uploadFile: used', primary)
      return resp
    } catch (err: any) {
      console.warn(`uploadFile primary endpoint ${primary} failed (${String(err?.message)}), trying fallback ${fallback}`)
      const resp2 = await apiClient.post<UploadFileRequest, UploadFileResponse>(fallback, request)
      console.debug('fileUploadingApi.uploadFile: used', fallback)
      return resp2
    }
  },
}
