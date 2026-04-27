import axios from 'axios'
import api from './api'
import type { FileItem } from './uploadTypes'
import type { PresignResponse } from '@shared/types'

export async function uploadOne(
  item: FileItem,
  index: number,
  updateItem: (index: number, patch: Partial<FileItem>) => void
): Promise<void> {
  updateItem(index, { status: 'uploading', progress: 0 })
  try {
    const contentType = item.file.type || 'application/octet-stream'
    const { data } = await api.post<PresignResponse>(
      `/photos/presign?filename=${encodeURIComponent(item.file.name)}&content_type=${encodeURIComponent(contentType)}`
    )
    await axios.put(data.presigned_url, item.file, {
      headers: data.upload_headers,
      onUploadProgress: (e) => {
        const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
        updateItem(index, { progress: pct })
      },
    })
    const isPublic = item.visibility === 'public'
    const locationId = item.location?.status === 'matched' ? item.location.loc?.id : undefined
    await api.post('/photos', {
      s3_key: data.s3_key,
      caption: item.caption || undefined,
      is_public: isPublic,
      ...(locationId ? { location_id: locationId } : {}),
    })
    updateItem(index, { status: 'done', progress: 100 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    updateItem(index, { status: 'error', error: msg })
  }
}
