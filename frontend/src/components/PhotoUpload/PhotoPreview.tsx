import React from 'react'
import T from '../../styles/tokens'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { FileItem } from '../../lib/uploadTypes'

const mono = "'IBM Plex Mono', monospace"

interface PhotoPreviewProps {
  item: FileItem
}

const PhotoPreview: React.FC<PhotoPreviewProps> = ({ item }) => {
  const { isMobile } = useBreakpoint()
  return (
    <div style={{ position: 'relative', background: T.paperTwo, flexShrink: 0, borderRadius: isMobile ? 0 : 8, overflow: 'hidden' }}>
      <img
        src={item.preview}
        alt=""
        style={{ width: '100%', height: 'auto', maxHeight: isMobile ? 280 : 560, objectFit: 'contain', display: 'block' }}
      />
      {isMobile && (
        <span style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: mono, fontSize: 9, background: 'rgba(255,255,255,0.9)', color: T.inkMute, padding: '2px 6px', borderRadius: 3 }}>
          {item.file.name}
        </span>
      )}
    </div>
  )
}

export default PhotoPreview
