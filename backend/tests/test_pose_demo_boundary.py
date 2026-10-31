"""The synthetic pose shell must not expose image persistence APIs."""

import uuid

from fastapi.testclient import TestClient

from app.main import app


def test_no_image_collection_or_upload_route() -> None:
    documented_paths = app.openapi()["paths"]
    assert all("/images" not in path and "/uploads" not in path for path in documented_paths)

    object_id = uuid.uuid4()
    with TestClient(app) as client:
        assert client.post(f"/api/v1/participants/{object_id}/images").status_code == 404
        assert client.post(f"/api/v1/assessments/{object_id}/images").status_code == 404
