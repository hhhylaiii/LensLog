import io
import piexif
from PIL import Image, ImageOps
from typing import Dict, Any

def _convert_to_degrees(value) -> float:
    """
    將 EXIF 的 Rational (有理數) 格式轉換為十進位度數 (Decimal Degrees)。
    EXIF GPS 格式為: ((度, 分母), (分, 分母), (秒, 分母))
    公式: 度 + 分/60 + 秒/3600
    """
    d = float(value[0][0]) / float(value[0][1])
    m = float(value[1][0]) / float(value[1][1])
    s = float(value[2][0]) / float(value[2][1])
    return d + (m / 60.0) + (s / 3600.0)

def extract_exif(image_bytes: bytes) -> Dict[str, Any]:
    """
    從照片的二進位數據中提取攝影參數。
    
    參數註解:
    - make: 相機製造商 (如 Sony, Canon)
    - model: 相機型號 (如 A7IV)
    - lens_model: 鏡頭型號
    - focal_length: 實際焦距 (mm)
    - aperture: 光圈數值 (F-stop)
    - shutter_speed: 快門速度字串 (如 1/500)
    - iso: 感光度
    - gps_lat/lng: 緯度與經度 (十進位)
    - width/height: 原始解析度
    """
    try:
        img: Image.Image = Image.open(io.BytesIO(image_bytes))
        # 取得解析度 (必備基礎資訊)
        result: Dict[str, Any] = {"width": img.size[0], "height": img.size[1]}
        
        # 提取原始 EXIF 區塊
        exif_raw = img.info.get("exif", b"")
        if not exif_raw:
            return result

        exif_dict = piexif.load(exif_raw)
        ifd0 = exif_dict.get("0th", {})
        exif_ifd = exif_dict.get("Exif", {})
        gps_ifd = exif_dict.get("GPS", {})

        # 1. 處理機身資訊 (bytes 需轉碼並去除尾端空位元 \x00)
        if piexif.ImageIFD.Make in ifd0:
            result["make"] = ifd0[piexif.ImageIFD.Make].decode("utf-8", errors="ignore").strip("\x00")
        if piexif.ImageIFD.Model in ifd0:
            result["model"] = ifd0[piexif.ImageIFD.Model].decode("utf-8", errors="ignore").strip("\x00")

        # 2. 處理鏡頭資訊
        if piexif.ExifIFD.LensModel in exif_ifd:
            result["lens_model"] = exif_ifd[piexif.ExifIFD.LensModel].decode("utf-8", errors="ignore").strip("\x00")

        # 3. 處理攝影數值 (處理 EXIF 分數格式)
        # 焦距 FocalLength
        if piexif.ExifIFD.FocalLength in exif_ifd:
            num, den = exif_ifd[piexif.ExifIFD.FocalLength]
            result["focal_length"] = round(num / den, 2) if den else None
            
        # 光圈 FNumber (F-stop)
        if piexif.ExifIFD.FNumber in exif_ifd:
            num, den = exif_ifd[piexif.ExifIFD.FNumber]
            result["aperture"] = round(num / den, 2) if den else None

        # 快門速度 ExposureTime (轉換為易讀字串如 "1/125")
        if piexif.ExifIFD.ExposureTime in exif_ifd:
            num, den = exif_ifd[piexif.ExifIFD.ExposureTime]
            result["shutter_speed"] = f"{num}/{den}" if den > 1 else str(num)

        # 感光度 ISO
        if piexif.ExifIFD.ISOSpeedRatings in exif_ifd:
            result["iso"] = exif_ifd[piexif.ExifIFD.ISOSpeedRatings]

        # 4. 處理拍攝時間 DateTimeOriginal (0x9003) → 轉為 ISO datetime
        date_raw = exif_ifd.get(piexif.ExifIFD.DateTimeOriginal) or ifd0.get(piexif.ImageIFD.DateTime)
        if date_raw:
            try:
                from datetime import datetime as _dt
                date_str = date_raw.decode("utf-8", errors="ignore").strip("\x00")
                result["taken_at"] = _dt.strptime(date_str, "%Y:%m:%d %H:%M:%S").isoformat()
            except Exception:
                pass

        # 5. 處理 GPS 定位資訊
        if gps_ifd:
            lat = gps_ifd.get(piexif.GPSIFD.GPSLatitude)
            lat_ref = gps_ifd.get(piexif.GPSIFD.GPSLatitudeRef) # N 或 S
            lng = gps_ifd.get(piexif.GPSIFD.GPSLongitude)
            lng_ref = gps_ifd.get(piexif.GPSIFD.GPSLongitudeRef) # E 或 W
            
            if lat and lat_ref:
                result["gps_lat"] = _convert_to_degrees(lat)
                if lat_ref == b"S":
                    result["gps_lat"] = -result["gps_lat"]
            if lng and lng_ref:
                result["gps_lng"] = _convert_to_degrees(lng)
                if lng_ref == b"W":
                    result["gps_lng"] = -result["gps_lng"]

        return result
    except Exception:
        # 若解析失敗則回傳基本尺寸
        return result

def get_resized_image(image_bytes: bytes, max_size: int) -> bytes:
    """
    縮圖工具函式：保持比例縮放並回傳 JPEG bytes。
    """
    img: Image.Image = Image.open(io.BytesIO(image_bytes))
    # 依據 EXIF Orientation 標籤將像素物理旋轉，縮圖才不會方向錯誤
    img = ImageOps.exif_transpose(img)
    # 統一轉成 RGB 以相容 JPEG 格式 (避免 RGBA 報錯)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # thumbnail 會自動保持比例
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()
