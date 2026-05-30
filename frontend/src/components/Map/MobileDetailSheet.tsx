import React from 'react'
import { ExploreLocation, SheetState, WeatherForecast, t, Icon, ICON, sharedStyles } from './types'
import type { Photo } from '@shared/types'

interface MobileDetailSheetProps {
  selected: ExploreLocation
  sheetState: Exclude<SheetState, null>
  onClose: () => void
  onAdvance: () => void
  onUploadHere: () => void
  weather: WeatherForecast | undefined
  weatherLoading: boolean
  weatherError: boolean
  goldenMin: number | null
  locationPhotos: Photo[]
  locationPhotosLoading: boolean
}

const MobileDetailSheet: React.FC<MobileDetailSheetProps> = ({
  selected,
  sheetState,
  onClose,
  onAdvance,
  onUploadHere,
  weather,
  weatherLoading,
  weatherError,
  goldenMin,
  locationPhotos,
  locationPhotosLoading,
}) => {
  const mPillIcon: React.CSSProperties = { width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }
  const currentForecast = weather?.forecasts?.[0]

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: t.card, borderRadius: '22px 22px 0 0', border: `1px solid ${t.line}`, borderBottom: 0, boxShadow: '0 -10px 32px rgba(15,30,56,0.18)', zIndex: 35, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: sheetState === 'peek' ? 168 : sheetState === 'half' ? '62%' : '100%', transition: 'height 0.32s cubic-bezier(0.32,0.72,0,1)' }}>

      {/* Drag handle — tap to advance state */}
      <div onClick={onAdvance} style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: sheetState !== 'full' ? 'pointer' : 'default' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: t.line }} />
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', height: sheetState === 'peek' ? 88 : sheetState === 'half' ? 110 : 130, background: 'linear-gradient(160deg,#6b82a8 0%,#4c6590 28%,#334a75 52%,#22355b 78%,#1a2942 100%)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(15,30,56,0) 50%,rgba(15,30,56,0.7) 100%)' }} />
        <div style={{ position: 'absolute', top: sheetState === 'peek' ? 7 : 10, right: sheetState === 'peek' ? 8 : 10, display: 'flex', gap: 6, zIndex: 2 }}>
          <button onClick={onClose} style={{ width: sheetState === 'peek' ? 26 : 28, height: sheetState === 'peek' ? 26 : 28, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <Icon path={ICON.xmark} size={sheetState === 'peek' ? 12 : 13} />
          </button>
        </div>
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: sheetState === 'peek' ? 9 : 12, color: '#fff', zIndex: 2 }}>
          {sheetState !== 'peek' && selected.tags[0] && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', padding: '2px 7px', borderRadius: 10, backdropFilter: 'blur(6px)', marginBottom: 6, color: '#fff' }}>{selected.tags[0]}</div>
          )}
          <h2 style={{ margin: '0 0 1px', fontSize: sheetState === 'peek' ? 16 : 17, fontWeight: 600, letterSpacing: '-0.015em', color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>{selected.name}</h2>
          <div style={{ fontSize: sheetState === 'peek' ? 10 : 10.5, color: 'rgba(255,255,255,0.85)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{selected.tags[0] || (selected.source === 'global' ? '公開景點' : '景點')}</span>
            <span style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'inline-block' }} />
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: sheetState === 'peek' ? 9 : 10 }}>{Number(selected.latitude).toFixed(3)}°N</span>
          </div>
        </div>
      </div>

      {/* Peek: 3 quick stat pills */}
      {sheetState === 'peek' && (
        <div style={{ padding: '8px 12px 0', display: 'flex', gap: 8, alignItems: 'stretch', flexShrink: 0 }}>
          <div style={{ flex: 1, background: t.goldSoft, border: '1px solid rgba(217,119,6,0.3)', borderRadius: 10, padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ ...mPillIcon, background: 'linear-gradient(135deg,#f0a838,#c97816)', boxShadow: '0 2px 8px rgba(217,119,6,0.32)' }}><Icon path={ICON.clock} size={14} /></div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.01em', color: t.gold }}>{goldenMin !== null ? <>{goldenMin}<small style={{ fontSize: 10, fontWeight: 500 }}>分</small></> : '—'}</div>
              <div style={{ fontSize: 9, color: t.inkMute, fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>黃金剩</div>
            </div>
          </div>
          <div style={{ flex: 1, background: 'linear-gradient(150deg,#edf0f5 0%,#d8e2ec 100%)', border: `1px solid ${t.line}`, borderRadius: 10, padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ ...mPillIcon, background: 'linear-gradient(135deg,#7896b2,#4a6882)', boxShadow: '0 2px 8px rgba(74,104,130,0.22)' }}><Icon path={ICON.cloud} size={14} /></div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{weatherLoading ? '…' : currentForecast ? <>{currentForecast.temp_max}<small style={{ fontSize: 10, fontWeight: 500 }}>°</small></> : '—'}</div>
              <div style={{ fontSize: 9, color: t.inkMute, fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>天氣</div>
            </div>
          </div>
          <div style={{ flex: 1, background: 'linear-gradient(150deg,#eaecf3 0%,#d4d8e8 100%)', border: `1px solid ${t.line}`, borderRadius: 10, padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ ...mPillIcon, background: 'linear-gradient(135deg,#7e90b6,#546082)', boxShadow: '0 2px 8px rgba(84,96,130,0.22)' }}><Icon path={ICON.drop} size={14} /></div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{currentForecast ? <>{currentForecast.pop}<small style={{ fontSize: 10, fontWeight: 500 }}>%</small></> : '—'}</div>
              <div style={{ fontSize: 9, color: t.inkMute, fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>降雨</div>
            </div>
          </div>
        </div>
      )}

      {/* Half / full: full content body */}
      {(sheetState === 'half' || sheetState === 'full') && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 0' }}>
            {/* Sun timing */}
            <div style={sharedStyles.sunTiming}>
              <div style={sharedStyles.sunLabel}>
                {goldenMin !== null && <span style={sharedStyles.sunPulse} />}
                黃金時刻{goldenMin !== null ? ' · 進行中' : ''}
              </div>
              <div style={sharedStyles.sunRow}>
                <div>
                  <div style={sharedStyles.sunK}><Icon path={ICON.sun} size={12} /> 日出</div>
                  <div style={sharedStyles.sunV}>{weatherLoading ? '…' : weather?.sunrise ?? '—'}</div>
                </div>
                <div>
                  <div style={sharedStyles.sunK}><Icon path={ICON.clock} size={12} /> 剩餘</div>
                  <div style={{ ...sharedStyles.sunV, ...sharedStyles.sunVGolden }}>{goldenMin !== null ? <>{goldenMin}<small style={sharedStyles.sunVSmall}> 分</small></> : '—'}</div>
                </div>
                <div>
                  <div style={sharedStyles.sunK}><Icon path={ICON.moon} size={12} /> 日落</div>
                  <div style={sharedStyles.sunV}>{weatherLoading ? '…' : weather?.sunset ?? '—'}</div>
                </div>
              </div>
            </div>

            {/* Weather grid (2x2) */}
            <div style={sharedStyles.weatherGrid}>
              <div style={{ ...sharedStyles.wxCell, ...sharedStyles.wxCellWeather }}>
                <div style={{ ...sharedStyles.wxIcon, ...sharedStyles.wxIconWeather }}><Icon path={ICON.cloud} size={18} /></div>
                <div style={sharedStyles.wxText}><div style={sharedStyles.wxK}>天氣</div><div style={sharedStyles.wxV}>{weatherLoading ? '…' : weatherError || !currentForecast ? '—' : <>{currentForecast.temp_max}°<small style={sharedStyles.wxVSmall}>C · {currentForecast.weather_description}</small></>}</div></div>
              </div>
              <div style={{ ...sharedStyles.wxCell, ...sharedStyles.wxCellRain }}>
                <div style={{ ...sharedStyles.wxIcon, ...sharedStyles.wxIconRain }}><Icon path={ICON.drop} size={18} /></div>
                <div style={sharedStyles.wxText}><div style={sharedStyles.wxK}>降雨機率</div><div style={sharedStyles.wxV}>{currentForecast ? <>{currentForecast.pop}<small style={sharedStyles.wxVSmall}>%</small></> : '—'}</div></div>
              </div>
              <div style={{ ...sharedStyles.wxCell, ...sharedStyles.wxCellWind }}>
                <div style={{ ...sharedStyles.wxIcon, ...sharedStyles.wxIconWind }}><Icon path={ICON.wind} size={18} /></div>
                <div style={sharedStyles.wxText}><div style={sharedStyles.wxK}>風速</div><div style={sharedStyles.wxV}>{currentForecast?.wind_speed ?? '—'}</div></div>
              </div>
              <div style={{ ...sharedStyles.wxCell, ...sharedStyles.wxCellVis }}>
                <div style={{ ...sharedStyles.wxIcon, ...sharedStyles.wxIconVis }}><Icon path={ICON.eye} size={18} /></div>
                <div style={sharedStyles.wxText}><div style={sharedStyles.wxK}>能見度</div><div style={sharedStyles.wxV}>—</div></div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', padding: '10px 0', borderTop: `1px solid ${t.lineSoft}`, borderBottom: `1px solid ${t.lineSoft}`, marginBottom: 10 }}>
              {[['1,284', '作品'], ['428', '攝影師']].map(([n, l], i, items) => (
                <div key={l} style={{ flex: 1, borderRight: i < items.length - 1 ? `1px solid ${t.lineSoft}` : 0, padding: '0 8px', paddingLeft: i === 0 ? 0 : undefined }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{n}</div>
                  <div style={{ fontSize: 9, color: t.inkMute, fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>

            {selected.source === 'global' && selected.description && (
              <div style={{ fontSize: 13, color: t.inkSoft, lineHeight: 1.6, marginBottom: 14 }}>{selected.description}</div>
            )}

            {/* Full: photo wall */}
            {sheetState === 'full' && (
              <div style={{ paddingTop: 12, borderTop: `1px solid ${t.lineSoft}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                  {selected.source === 'global' ? '這個景點的公開照片' : '這個景點的照片'}
                </div>
                {locationPhotosLoading ? (
                  <div style={{ fontSize: 12, color: t.inkMute }}>照片載入中…</div>
                ) : locationPhotos.length === 0 ? (
                  <div style={{ fontSize: 12, color: t.inkMute }}>目前還沒有照片</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                    {locationPhotos.slice(0, 9).map((photo) => (
                      <div key={photo.id} style={{ aspectRatio: '1', borderRadius: 5, overflow: 'hidden', background: t.paper2, border: `1px solid ${t.line}` }}>
                        {photo.thumb_url || photo.url ? (
                          <img
                            src={photo.thumb_url || photo.url}
                            alt={photo.caption || ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.inkMute, fontSize: 10 }}>
                            無預覽
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${t.lineSoft}`, padding: '10px 14px', display: 'flex', gap: 8, background: t.card, flexShrink: 0 }}>
            <button style={{ ...sharedStyles.icBtn, flex: 1 }} onClick={onUploadHere}>
              上傳到這裡
            </button>
            <button style={{ ...sharedStyles.icBtn, ...sharedStyles.icBtnPrimary, flex: 1 }} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`, '_blank')}>
              <Icon path={ICON.mapPin} size={14} /> 導航
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default MobileDetailSheet
