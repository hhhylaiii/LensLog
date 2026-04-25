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
    )

    assert url.startswith("http://localhost:9000/")
    call_kwargs = mock_client.generate_presigned_url.call_args.kwargs
    assert call_kwargs["Params"]["ContentType"] == "image/jpeg"
    assert call_kwargs["Params"]["Key"] == "photos/test.jpg"


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
