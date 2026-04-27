import axios from 'axios'
import api from './api'
import type { FileItem } from './uploadTypes'

type PresignPostResponse = {
  presigned_url: string
  s3_key: string
  fields: Record<string, string>
  max_size_mb?: number
}

export async function uploadOne(
  item: FileItem,
  index: number,
  updateItem: (index: number, patch: Partial<FileItem>) => void
): Promise<void> {
  updateItem(index, { status: 'uploading', progress: 0 })
  try {
    const contentType = item.file.type || 'application/octet-stream'
    const { data } = await api.post<PresignPostResponse>(
      `/photos/presign?filename=${encodeURIComponent(item.file.name)}&content_type=${encodeURIComponent(contentType)}`
    )

    if (typeof data.max_size_mb === 'number') {
      const maxBytes = data.max_size_mb * 1024 * 1024
      if (item.file.size > maxBytes) {
        updateItem(index, {
          status: 'error',
          error: `檔案大小超過上限 (${data.max_size_mb} MB)`,
          progress: 0,
        })
        return
      }
    }

    const form = new FormData()
    Object.entries(data.fields || {}).forEach(([k, v]) => form.append(k, v))
    form.append('file', item.file)

    // POST directly to storage (no auth header — use plain axios)
    await axios.post(data.presigned_url, form, {
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
