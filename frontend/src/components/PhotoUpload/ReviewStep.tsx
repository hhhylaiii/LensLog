import React from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import type { FileItem } from '../../lib/uploadTypes'
import FileList from './FileList'
import PreviewPane from './PreviewPane'
import PhotoPreview from './PhotoPreview'
import ExifPanel from './ExifPanel'
import LocationPanel from './LocationPanel'
import VisibilityPanel from './VisibilityPanel'

interface ReviewStepProps {
  items: FileItem[]
  selectedIdx: number
  onSelect: (i: number) => void
  onAddMore: (files: File[]) => void
  onChangeItem: (i: number, patch: Partial<FileItem>) => void
}

const ReviewStep: React.FC<ReviewStepProps> = ({ items, selectedIdx, onSelect, onAddMore, onChangeItem }) => {
  const { isMobile } = useBreakpoint()
  const item = items[selectedIdx]

  if (!item) return null

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
        <PhotoPreview item={item} />
        <FileList items={items} selectedIdx={selectedIdx} onSelect={onSelect} onAddMore={onAddMore} />
        <div style={{ margin: '8px 10px 0' }}><ExifPanel exif={item.exif} /></div>
        <div style={{ margin: '8px 10px 0' }}><LocationPanel gpsLat={item.exif?.gpsLat} gpsLng={item.exif?.gpsLng} value={item.location} onChange={(location) => onChangeItem(selectedIdx, { location })} /></div>
        <PreviewPane item={item} onChange={patch => onChangeItem(selectedIdx, patch)} />
        <div style={{ margin: '8px 10px' }}>
          <VisibilityPanel
            visibility={item.visibility}
            onChange={v => onChangeItem(selectedIdx, { visibility: v })}
            hidePreciseGps={item.hidePreciseGps}
            onToggleGps={() => onChangeItem(selectedIdx, { hidePreciseGps: !item.hidePreciseGps })}
          />
        </div>
      </div>
    )
  }

  // Desktop 三欄
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 320px', gap: 20, minHeight: 540 }}>
      <FileList items={items} selectedIdx={selectedIdx} onSelect={onSelect} onAddMore={onAddMore} />
      <PreviewPane item={item} onChange={patch => onChangeItem(selectedIdx, patch)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ExifPanel exif={item.exif} />
        <LocationPanel
          gpsLat={item.exif?.gpsLat}
          gpsLng={item.exif?.gpsLng}
          value={item.location}
          onChange={(location) => onChangeItem(selectedIdx, { location })}
        />
        <VisibilityPanel
          visibility={item.visibility}
          onChange={v => onChangeItem(selectedIdx, { visibility: v })}
          hidePreciseGps={item.hidePreciseGps}
          onToggleGps={() => onChangeItem(selectedIdx, { hidePreciseGps: !item.hidePreciseGps })}
        />
      </div>
    </div>
  )
}

export default ReviewStep
