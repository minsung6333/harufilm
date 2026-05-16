import io
import uuid
from PIL import Image, ExifTags
from app.db import supabase

BUCKET = "photos"
MAX_SIZE = 1200
QUALITY = 85


def _compress(file_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))

    # EXIF 회전 정보 반영 (스마트폰 사진 뒤집힘 방지)
    try:
        exif = img._getexif()
        if exif:
            for tag, value in exif.items():
                if ExifTags.TAGS.get(tag) == "Orientation":
                    if value == 3:
                        img = img.rotate(180, expand=True)
                    elif value == 6:
                        img = img.rotate(270, expand=True)
                    elif value == 8:
                        img = img.rotate(90, expand=True)
                    break
    except Exception:
        pass

    # 최대 1200px로 리사이즈 (비율 유지)
    img.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)

    # JPEG로 변환해서 압축
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=QUALITY, optimize=True)
    return buf.getvalue()


def upload_image(file_bytes: bytes, content_type: str, user_id: str) -> str:
    compressed = _compress(file_bytes)
    filename = f"{user_id}/{uuid.uuid4()}.jpg"
    supabase.storage.from_(BUCKET).upload(
        filename,
        compressed,
        {"content-type": "image/jpeg"},
    )
    return supabase.storage.from_(BUCKET).get_public_url(filename)


def delete_image(image_url: str) -> None:
    path = image_url.split(f"/object/public/{BUCKET}/")[-1]
    supabase.storage.from_(BUCKET).remove([path])
