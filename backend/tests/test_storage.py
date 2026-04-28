from unittest.mock import Mock

from app.services import storage_service


def test_generate_presigned_url_includes_content_type_and_rewrites_host(monkeypatch):
    mock_client = Mock()
    mock_client.generate_presigned_url.return_value = (
        "http://minio:9000/lenslog-dev/photos/test.jpg"
        "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-SignedHeaders=content-type%3Bhost"
    )
    monkeypatch.setattr(storage_service, "get_storage_client", lambda: mock_client)

    url = storage_service.generate_presigned_url(
        "photos/test.jpg",
        content_type="image/jpeg",
        tagging="upload_state=pending",
    )

    assert url.startswith("http://localhost:9000/")
    call_kwargs = mock_client.generate_presigned_url.call_args.kwargs
    assert call_kwargs["Params"]["ContentType"] == "image/jpeg"
    assert call_kwargs["Params"]["Key"] == "photos/test.jpg"
    assert call_kwargs["Params"]["Tagging"] == "upload_state=pending"


def test_generate_presigned_post_enforces_content_length_range_and_rewrites_host(monkeypatch):
    mock_client = Mock()
    mock_client.generate_presigned_post.return_value = {
        "url": "http://minio:9000/lenslog-dev",
        "fields": {"key": "photos/test.jpg"},
    }
    monkeypatch.setattr(storage_service, "get_storage_client", lambda: mock_client)

    data = storage_service.generate_presigned_post(
        "photos/test.jpg",
        content_type="image/jpeg",
        max_size_mb=20,
    )

    assert data["url"].startswith("http://localhost:9000/")
    call_kwargs = mock_client.generate_presigned_post.call_args.kwargs
    assert call_kwargs["Key"] == "photos/test.jpg"
    assert call_kwargs["Fields"]["Content-Type"] == "image/jpeg"
    assert ["content-length-range", 1, 20 * 1024 * 1024] in call_kwargs["Conditions"]


def test_upload_and_download_object(monkeypatch):
    mock_client = Mock()
    mock_client.get_object.return_value = {"Body": Mock(read=Mock(return_value=b"hello"))}
    monkeypatch.setattr(storage_service, "get_storage_client", lambda: mock_client)

    storage_service.upload_object("test/a.txt", b"hello", content_type="text/plain")
    result = storage_service.download_object("test/a.txt")

    assert result == b"hello"
    mock_client.put_object.assert_called_once()
    mock_client.get_object.assert_called_once()


def test_get_object_url_uses_public_url():
    url = storage_service.get_object_url("photos/a.jpg")
    assert url == "http://localhost:9000/lenslog-dev/photos/a.jpg"


def test_put_object_tags(monkeypatch):
    mock_client = Mock()
    monkeypatch.setattr(storage_service, "get_storage_client", lambda: mock_client)

    storage_service.put_object_tags("photos/test.jpg", {"upload_state": "confirmed"})

    mock_client.put_object_tagging.assert_called_once_with(
        Bucket="lenslog-dev",
        Key="photos/test.jpg",
        Tagging={"TagSet": [{"Key": "upload_state", "Value": "confirmed"}]},
    )
