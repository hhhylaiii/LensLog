import pytest
import io
import piexif
from PIL import Image
from app.services.exif_service import extract_exif, get_resized_image

@pytest.fixture
def mock_photo_with_exif():
    """模擬一張帶有真實 EXIF 資訊的照片 bytes"""
    img = Image.new('RGB', (1000, 1000), color='red')
    
    # 建立虛擬的 EXIF 數據
    zeroth_ifd = {
        piexif.ImageIFD.Make: u"Sony",
        piexif.ImageIFD.Model: u"A7IV"
    }
    exif_ifd = {
        piexif.ExifIFD.LensModel: u"FE 35mm F1.4 GM",
        piexif.ExifIFD.FocalLength: (350, 10), # 35.0 mm
        piexif.ExifIFD.FNumber: (14, 10),      # F1.4
        piexif.ExifIFD.ISOSpeedRatings: 100,
        piexif.ExifIFD.ExposureTime: (1, 500), # 1/500s
    }
    exif_dict = {"0th": zeroth_ifd, "Exif": exif_ifd}
    exif_bytes = piexif.dump(exif_dict)
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_bytes)
    return buf.getvalue()

def test_extract_exif_mock_data(mock_photo_with_exif):
    """測試提取邏輯是否正確處理數值"""
    info = extract_exif(mock_photo_with_exif)
    
    assert info["make"] == "Sony"
    assert info["model"] == "A7IV"
    assert info["lens_model"] == "FE 35mm F1.4 GM"
    assert info["focal_length"] == 35.0
    assert info["aperture"] == 1.4
    assert info["shutter_speed"] == "1/500"
    assert info["iso"] == 100
    assert info["width"] == 1000

def test_generate_thumbnail(mock_photo_with_exif):
    """測試縮圖功能是否產生正確 bytes"""
    thumb = get_resized_image(mock_photo_with_exif, 400)
    
    # 驗證輸出的圖片尺寸
    thumb_img = Image.open(io.BytesIO(thumb))
    assert thumb_img.size[0] <= 400
    assert thumb_img.size[1] <= 400