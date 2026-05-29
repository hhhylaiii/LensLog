import L from 'leaflet'

const pinSvg = (fill: string, dot: string): string =>
  `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  `<path d="M20 10C20 14.4183 12 22 12 22C12 22 4 14.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke="#000000" stroke-width="1.5" fill="${fill}"/>` +
  `<path d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z" fill="${dot}" stroke="${dot}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
  `</svg>`

export const pinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: pinSvg('#ffffff', '#000000'),
  iconSize: [28, 28],
  iconAnchor: [14, 26],
  popupAnchor: [0, -26],
})

export const activePinIcon = L.divIcon({
  className: 'lenslog-pin',
  html: pinSvg('#000000', '#ffffff'),
  iconSize: [34, 34],
  iconAnchor: [17, 31],
  popupAnchor: [0, -31],
})
