import React from 'react'
import type { FileItem } from '../../lib/uploadTypes'
import FileList from './FileList'
import PreviewPane from './PreviewPane'
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
  const item = items[selectedIdx]
  if (!item) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 320px', gap: 20, minHeight: 540 }}>
      {/* Left: file list */}
      <FileList
        items={items}
        selectedIdx={selectedIdx}
        onSelect={onSelect}
        onAddMore={onAddMore}
      />

      {/* Middle: preview + caption + tags */}
      <PreviewPane
        item={item}
        onChange={patch => onChangeItem(selectedIdx, patch)}
      />

      {/* Right: metadata panels */}
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
