import io
from typing import Optional

import piexif
from PIL import Image


def extract_exif(image_bytes: bytes) -> dict:
    """從照片 bytes 提取 EXIF 資料"""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif_raw = img.info.get("exif", b"")
        if not exif_raw:
            return {}

        exif_dict = piexif.load(exif_raw)
        result = {}

        ifd0 = exif_dict.get("0th", {})
        exif_ifd = exif_dict.get("Exif", {})
        gps_ifd = exif_dict.get("GPS", {})

        # 相機資訊
        if piexif.ImageIFD.Make in ifd0:
            result["make"] = ifd0[piexif.ImageIFD.Make].decode("utf-8", errors="ignore").strip("\x00")
        if piexif.ImageIFD.Model in ifd0:
            result["model"] = ifd0[piexif.ImageIFD.Model].decode("utf-8", errors="ignore").strip("\x00")

        # 鏡頭
        if piexif.ExifIFD.LensModel in exif_ifd:
            result["lens_model"] = exif_ifd[piexif.ExifIFD.LensModel].decode("utf-8", errors="ignore").strip("\x00")

        # 焦段
        if piexif.ExifIFD.FocalLength in exif_ifd:
            num, den = exif_ifd[piexif.ExifIFD.FocalLength]
            result["focal_length"] = round(num / den, 2) if den else None

        # 光圈 (FNumber)
        if piexif.ExifIFD.FNumber in exif_ifd:
            num, den = exif_ifd[piexif.ExifIFD.FNumber]
            result["aperture"] = round(num / den, 2) if den else None

        # ISO
        if piexif.ExifIFD.ISOSpeedRatings in exif_ifd:
            result["iso"] = exif_ifd[piexif.ExifIFD.ISOSpeedRatings]

        # 快門速度
        if piexif.ExifIFD.ExposureTime in exif_ifd:
            num, den = exif_ifd[piexif.ExifIFD.ExposureTime]
            result["shutter_speed"] = f"{num}/{den}" if den > 1 else str(num)

        # 圖片尺寸
        result["width"], result["height"] = img.size

        return result

    except Exception:
        return {}
