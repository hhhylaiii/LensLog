import type { ExifData } from './uploadTypes'

const SEGMENT_START = 0xff
const APP1_MARKER = 0xe1

function readString(view: DataView, offset: number, length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    const code = view.getUint8(offset + i)
    if (code === 0) break
    out += String.fromCharCode(code)
  }
  return out.trim()
}

function formatSize(format: number): number {
  switch (format) {
    case 1:
    case 2:
    case 7:
      return 1
    case 3:
      return 2
    case 4:
    case 9:
      return 4
    case 5:
    case 10:
      return 8
    default:
      return 0
  }
}

function readNumber(view: DataView, offset: number, format: number, littleEndian: boolean): number {
  switch (format) {
    case 1:
    case 7:
      return view.getUint8(offset)
    case 3:
      return view.getUint16(offset, littleEndian)
    case 4:
      return view.getUint32(offset, littleEndian)
    case 5: {
      const numerator = view.getUint32(offset, littleEndian)
      const denominator = view.getUint32(offset + 4, littleEndian)
      return denominator ? numerator / denominator : 0
    }
    case 9:
      return view.getInt32(offset, littleEndian)
    case 10: {
      const numerator = view.getInt32(offset, littleEndian)
      const denominator = view.getInt32(offset + 4, littleEndian)
      return denominator ? numerator / denominator : 0
    }
    default:
      return 0
  }
}

function readTagValue(
  view: DataView,
  tiffOffset: number,
  entryOffset: number,
  format: number,
  count: number,
  littleEndian: boolean
): string | number | number[] | null {
  const unitSize = formatSize(format)
  if (!unitSize) return null
  const valueSize = unitSize * count
  const dataOffset = valueSize <= 4
    ? entryOffset + 8
    : tiffOffset + view.getUint32(entryOffset + 8, littleEndian)

  if (format === 2) {
    return readString(view, dataOffset, count)
  }
  if (count === 1) {
    return readNumber(view, dataOffset, format, littleEndian)
  }
  const values: number[] = []
  for (let i = 0; i < count; i += 1) {
    values.push(readNumber(view, dataOffset + i * unitSize, format, littleEndian))
  }
  return values
}

function readIfd(view: DataView, tiffOffset: number, ifdOffset: number, littleEndian: boolean) {
  const absoluteOffset = tiffOffset + ifdOffset
  const entries = view.getUint16(absoluteOffset, littleEndian)
  const result = new Map<number, string | number | number[] | null>()
  for (let i = 0; i < entries; i += 1) {
    const entryOffset = absoluteOffset + 2 + i * 12
    const tag = view.getUint16(entryOffset, littleEndian)
    const format = view.getUint16(entryOffset + 2, littleEndian)
    const count = view.getUint32(entryOffset + 4, littleEndian)
    result.set(tag, readTagValue(view, tiffOffset, entryOffset, format, count, littleEndian))
  }
  return result
}

function asNumberArray(value: string | number | number[] | null | undefined): number[] | undefined {
  return Array.isArray(value) ? value : undefined
}

function asNumber(value: string | number | number[] | null | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function asString(value: string | number | number[] | null | undefined): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function formatShutter(exposure?: number): string | undefined {
  if (!exposure || exposure <= 0) return undefined
  if (exposure >= 1) return `${exposure.toFixed(exposure >= 10 ? 0 : 1)}s`
  const denominator = Math.round(1 / exposure)
  return `1/${denominator}s`
}

function formatAperture(aperture?: number): string | undefined {
  if (!aperture) return undefined
  return `f/${aperture % 1 === 0 ? aperture.toFixed(0) : aperture.toFixed(1)}`
}

function formatFocalLength(focalLength?: number): string | undefined {
  if (!focalLength) return undefined
  return `${focalLength % 1 === 0 ? focalLength.toFixed(0) : focalLength.toFixed(1)}mm`
}

function formatTakenAt(raw?: string): string | undefined {
  if (!raw) return undefined
  const normalized = raw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
  return normalized.replace(' ', ' · ')
}

function gpsToDecimal(values?: number[], ref?: string): number | undefined {
  if (!values || values.length < 3) return undefined
  const decimal = values[0] + values[1] / 60 + values[2] / 3600
  if (ref === 'S' || ref === 'W') return -decimal
  return decimal
}

export async function parseExifData(file: File): Promise<ExifData | undefined> {
  if (!file.type.includes('jpeg') && !file.name.toLowerCase().match(/\.(jpe?g)$/)) {
    return undefined
  }

  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return undefined
  }

  let offset = 2
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== SEGMENT_START) break
    const marker = view.getUint8(offset + 1)
    const segmentLength = view.getUint16(offset + 2)
    if (marker === APP1_MARKER && readString(view, offset + 4, 6) === 'Exif') {
      const tiffOffset = offset + 10
      const littleEndian = view.getUint16(tiffOffset) === 0x4949
      const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian)
      const ifd0 = readIfd(view, tiffOffset, ifd0Offset, littleEndian)
      const exifIfdOffset = asNumber(ifd0.get(0x8769))
      const gpsIfdOffset = asNumber(ifd0.get(0x8825))
      const exifIfd = exifIfdOffset != null ? readIfd(view, tiffOffset, exifIfdOffset, littleEndian) : new Map()
      const gpsIfd = gpsIfdOffset != null ? readIfd(view, tiffOffset, gpsIfdOffset, littleEndian) : new Map()

      const gpsLat = gpsToDecimal(
        asNumberArray(gpsIfd.get(0x0002)),
        asString(gpsIfd.get(0x0001))
      )
      const gpsLng = gpsToDecimal(
        asNumberArray(gpsIfd.get(0x0004)),
        asString(gpsIfd.get(0x0003))
      )

      return {
        make: asString(ifd0.get(0x010f)),
        model: asString(ifd0.get(0x0110)),
        lens: asString(exifIfd.get(0xa434)),
        aperture: formatAperture(asNumber(exifIfd.get(0x829d))),
        shutter: formatShutter(asNumber(exifIfd.get(0x829a))),
        iso: asNumber(exifIfd.get(0x8827))?.toString(),
        focalLength: formatFocalLength(asNumber(exifIfd.get(0x920a))),
        takenAt: formatTakenAt(asString(exifIfd.get(0x9003)) ?? asString(ifd0.get(0x0132))),
        width: asNumber(exifIfd.get(0xa002))?.toString(),
        height: asNumber(exifIfd.get(0xa003))?.toString(),
        gpsLat,
        gpsLng,
      }
    }
    offset += 2 + segmentLength
  }

  return undefined
}
