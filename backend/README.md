# LensLog Backend

Base API prefix: `/api/v1`

> Note:
> This README uses example payloads and example responses.
> IDs, tokens, timestamps, URLs, usernames, and emails below are mock values for documentation purposes.

## API Summary

- `POST /api/v1/auth/register`: Register a new user.
- `POST /api/v1/auth/login`: Login and receive an access token and refresh token.
- `POST /api/v1/auth/refresh`: Exchange a refresh token for a new token pair.
- `POST /api/v1/auth/logout`: Logout and blacklist the current access token and refresh token.
- `GET /api/v1/auth/me`: Return the current logged-in user's profile.
- `GET /api/v1/photos`: List the current user's photos.
- `POST /api/v1/photos/presign`: Generate a presigned S3 upload URL and `s3_key`.
- `POST /api/v1/photos`: Create a photo record after upload finishes.
- `GET /api/v1/photos/{photo_id}`: Get one photo by ID.
- `PATCH /api/v1/photos/{photo_id}`: Update photo metadata.
- `DELETE /api/v1/photos/{photo_id}`: Delete a photo.
- `GET /api/v1/locations`: List locations, or search nearby with `lat`, `lng`, and `radius`.
- `POST /api/v1/locations`: Create a new location.
- `GET /api/v1/locations/{location_id}`: Get one location by ID.
- `PATCH /api/v1/locations/{location_id}`: Update a location.
- `DELETE /api/v1/locations/{location_id}`: Delete a location.
- `GET /api/v1/gear`: List the current user's gear.
- `POST /api/v1/gear`: Create a gear item.
- `GET /api/v1/gear/{gear_id}`: Get one gear item by ID.
- `PATCH /api/v1/gear/{gear_id}`: Update a gear item.
- `DELETE /api/v1/gear/{gear_id}`: Delete a gear item.
- `GET /api/v1/stats/me/focal-length`: Return focal length usage counts for the current user.
- `GET /api/v1/stats/me/aperture`: Return aperture usage counts for the current user.
- `GET /api/v1/stats/me/monthly`: Return monthly photo counts for the current user.
- `GET /api/v1/admin/users`: List all users.
- `DELETE /api/v1/admin/users/{user_id}`: Delete a user.
- `PATCH /api/v1/admin/users/{user_id}/toggle-admin`: Toggle the user's admin status.
- `GET /health`: Basic health check for the backend service.

## Auth API

Most protected routes use the authentication chain in `app/api/deps.py`.

![Auth Flow](images/auth_flow.png)

### POST `/api/v1/auth/register`

Purpose: Register a new user.

Auth: none

Request body:

```json
{
  "username": "vincentchen",
  "email": "vincent@example.com",
  "password": "lenslog123"
}
```

Success response `201 Created`:

```json
{
  "id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "username": "vincentchen",
  "email": "vincent@example.com",
  "avatar_url": "https://cdn.lenslog.app/avatars/vincentchen.jpg",
  "bio": "Street photographer based in Taipei.",
  "is_admin": false,
  "created_at": "2026-04-17T09:30:00Z"
}
```

### POST `/api/v1/auth/login`

Purpose: Login and receive an access token and refresh token.

Auth: none

Request body:

```json
{
  "email": "vincent@example.com",
  "password": "lenslog123"
}
```

Success response `200 OK`:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.payload",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.payload",
  "token_type": "bearer"
}
```

### POST `/api/v1/auth/refresh`

Purpose: Exchange a refresh token for a new token pair.

Auth: none

Request params:

- Query: `refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.payload`

Success response `200 OK`:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-access.payload",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-refresh.payload",
  "token_type": "bearer"
}
```

### POST `/api/v1/auth/logout`

Purpose: Logout and blacklist both the current access token and refresh token.

Auth:

- Bearer token required

Request body:

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.payload"
}
```

Success response `200 OK`:

```json
{
  "detail": "Successfully logged out"
}
```

### GET `/api/v1/auth/me`

Purpose: Return the current logged-in user's profile.

Auth:

- Bearer token required

Success response `200 OK`:

```json
{
  "id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "username": "vincentchen",
  "email": "vincent@example.com",
  "avatar_url": "https://cdn.lenslog.app/avatars/vincentchen.jpg",
  "bio": "Street photographer based in Taipei.",
  "is_admin": false,
  "created_at": "2026-04-17T09:30:00Z"
}
```

![Auth Endpoints](images/auth_endpoints.png)

## Photos API

Photo upload uses direct upload:

1. Frontend calls `POST /api/v1/photos/presign`.
2. Frontend uploads the file directly to S3 with the returned signed URL.
3. Frontend calls `POST /api/v1/photos` to save metadata.

![Photo Upload Flow](images/photo_upload.png)

### GET `/api/v1/photos`

Purpose: List the current user's photos.

Auth:

- Bearer token required

Request params:

- Query: `skip=0`
- Query: `limit=20`

Success response `200 OK`:

```json
[
  {
    "id": "8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21",
    "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
    "location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
    "s3_key": "photos/8b1f2e70/taipei-street.jpg",
    "thumb_key": "photos/8b1f2e70/thumb-taipei-street.jpg",
    "url": "https://s3.amazonaws.com/lenslog/photos/8b1f2e70/taipei-street.jpg",
    "caption": "Rainy night in Ximending",
    "is_public": true,
    "taken_at": "2026-04-10T19:45:00Z",
    "created_at": "2026-04-10T20:00:00Z"
  }
]
```

### POST `/api/v1/photos/presign`

Purpose: Generate a presigned S3 upload URL and `s3_key`.

Auth:

- Bearer token required

Request params:

- Query: `filename=taipei-street.jpg`

Success response `200 OK`:

```json
{
  "presigned_url": "https://s3.amazonaws.com/lenslog/upload-signed-url",
  "s3_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg"
}
```

### POST `/api/v1/photos`

Purpose: Create a photo record after upload finishes.

Auth:

- Bearer token required

Request body:

```json
{
  "s3_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
  "thumb_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/thumb-taipei-street.jpg",
  "caption": "Rainy night in Ximending",
  "location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
  "is_public": true
}
```

Success response `201 Created`:

```json
{
  "id": "8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
  "s3_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
  "thumb_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/thumb-taipei-street.jpg",
  "url": "https://s3.amazonaws.com/lenslog/photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
  "caption": "Rainy night in Ximending",
  "is_public": true,
  "taken_at": "2026-04-10T19:45:00Z",
  "created_at": "2026-04-10T20:00:00Z"
}
```

### GET `/api/v1/photos/{photo_id}`

Purpose: Get one photo by ID.

Auth: none in current implementation

Request params:

- Path: `photo_id=8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21`

Success response `200 OK`:

```json
{
  "id": "8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
  "s3_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
  "thumb_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/thumb-taipei-street.jpg",
  "url": "https://s3.amazonaws.com/lenslog/photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
  "caption": "Rainy night in Ximending",
  "is_public": true,
  "taken_at": "2026-04-10T19:45:00Z",
  "created_at": "2026-04-10T20:00:00Z"
}
```

### PATCH `/api/v1/photos/{photo_id}`

Purpose: Update photo metadata.

Auth:

- Bearer token required
- Must be the photo owner

Request params:

- Path: `photo_id=8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21`

Request body:

```json
{
  "caption": "Rainy night walk in Ximending",
  "is_public": false,
  "location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73"
}
```

Success response `200 OK`:

```json
{
  "id": "8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "location_id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
  "s3_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
  "thumb_key": "photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/thumb-taipei-street.jpg",
  "url": "https://s3.amazonaws.com/lenslog/photos/c2fd4c7a-3ef1-47b8-a402-b6565516d1da/taipei-street.jpg",
  "caption": "Rainy night walk in Ximending",
  "is_public": false,
  "taken_at": "2026-04-10T19:45:00Z",
  "created_at": "2026-04-10T20:00:00Z"
}
```

### DELETE `/api/v1/photos/{photo_id}`

Purpose: Delete a photo.

Auth:

- Bearer token required
- Must be the photo owner

Request params:

- Path: `photo_id=8b1f2e70-50c9-4b8a-a7a0-7f8f5e0e1c21`

Success response `204 No Content`

## Locations API

### GET `/api/v1/locations`

Purpose: List locations, or search nearby when `lat`, `lng`, and `radius` are provided.

Auth: none

Request params:

- Query: `lat=25.0478`
- Query: `lng=121.5319`
- Query: `radius=5000`

Success response `200 OK`:

```json
[
  {
    "id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
    "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
    "name": "Ximending Pedestrian Area",
    "description": "Popular street photography spot with neon signs and crowds.",
    "latitude": 25.0422,
    "longitude": 121.5078,
    "tags": ["street", "night", "city"],
    "created_at": "2026-04-08T14:20:00Z"
  }
]
```

### POST `/api/v1/locations`

Purpose: Create a new location.

Auth:

- Bearer token required

Request body:

```json
{
  "name": "Ximending Pedestrian Area",
  "description": "Popular street photography spot with neon signs and crowds.",
  "latitude": 25.0422,
  "longitude": 121.5078,
  "tags": ["street", "night", "city"]
}
```

Success response `201 Created`:

```json
{
  "id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "name": "Ximending Pedestrian Area",
  "description": "Popular street photography spot with neon signs and crowds.",
  "latitude": 25.0422,
  "longitude": 121.5078,
  "tags": ["street", "night", "city"],
  "created_at": "2026-04-08T14:20:00Z"
}
```

### GET `/api/v1/locations/{location_id}`

Purpose: Get one location by ID.

Auth: none

Request params:

- Path: `location_id=90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73`

Success response `200 OK`:

```json
{
  "id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "name": "Ximending Pedestrian Area",
  "description": "Popular street photography spot with neon signs and crowds.",
  "latitude": 25.0422,
  "longitude": 121.5078,
  "tags": ["street", "night", "city"],
  "created_at": "2026-04-08T14:20:00Z"
}
```

### PATCH `/api/v1/locations/{location_id}`

Purpose: Update a location.

Auth:

- Bearer token required
- Must be the location owner

Request params:

- Path: `location_id=90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73`

Request body:

```json
{
  "name": "Ximending Night Walk",
  "description": "Best visited after sunset for neon and crowd shots.",
  "latitude": 25.0423,
  "longitude": 121.5077
}
```

Success response `200 OK`:

```json
{
  "id": "90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "name": "Ximending Night Walk",
  "description": "Best visited after sunset for neon and crowd shots.",
  "latitude": 25.0423,
  "longitude": 121.5077,
  "tags": ["street", "night", "city"],
  "created_at": "2026-04-08T14:20:00Z"
}
```

### DELETE `/api/v1/locations/{location_id}`

Purpose: Delete a location.

Auth:

- Bearer token required
- Must be the location owner

Request params:

- Path: `location_id=90fa7cc1-9bd3-4215-bfa2-ecf2f576ee73`

Success response `204 No Content`

## Gear API

All gear routes are scoped to the current user.

### GET `/api/v1/gear`

Purpose: List the current user's gear.

Auth:

- Bearer token required

Success response `200 OK`:

```json
[
  {
    "id": "1d6ef2d3-32dd-43df-a184-7ef14e3aa8a5",
    "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
    "type": "lens",
    "brand": "Sony",
    "model": "FE 35mm F1.8",
    "serial_number": "SN35F180123",
    "purchase_date": "2025-08-15",
    "notes": "Main walkaround lens for street shooting.",
    "maintenance_interval_days": 180,
    "last_maintained": "2026-03-01",
    "created_at": "2025-08-16T10:00:00Z"
  }
]
```

### POST `/api/v1/gear`

Purpose: Create a gear item.

Auth:

- Bearer token required

Request body:

```json
{
  "type": "lens",
  "brand": "Sony",
  "model": "FE 35mm F1.8",
  "serial_number": "SN35F180123",
  "purchase_date": "2025-08-15",
  "notes": "Main walkaround lens for street shooting.",
  "maintenance_interval_days": 180
}
```

Success response `201 Created`:

```json
{
  "id": "1d6ef2d3-32dd-43df-a184-7ef14e3aa8a5",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "type": "lens",
  "brand": "Sony",
  "model": "FE 35mm F1.8",
  "serial_number": "SN35F180123",
  "purchase_date": "2025-08-15",
  "notes": "Main walkaround lens for street shooting.",
  "maintenance_interval_days": 180,
  "last_maintained": null,
  "created_at": "2025-08-16T10:00:00Z"
}
```

### GET `/api/v1/gear/{gear_id}`

Purpose: Get one gear item by ID.

Auth:

- Bearer token required

Request params:

- Path: `gear_id=1d6ef2d3-32dd-43df-a184-7ef14e3aa8a5`

Success response `200 OK`:

```json
{
  "id": "1d6ef2d3-32dd-43df-a184-7ef14e3aa8a5",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "type": "lens",
  "brand": "Sony",
  "model": "FE 35mm F1.8",
  "serial_number": "SN35F180123",
  "purchase_date": "2025-08-15",
  "notes": "Main walkaround lens for street shooting.",
  "maintenance_interval_days": 180,
  "last_maintained": "2026-03-01",
  "created_at": "2025-08-16T10:00:00Z"
}
```

### PATCH `/api/v1/gear/{gear_id}`

Purpose: Update a gear item.

Auth:

- Bearer token required

Request params:

- Path: `gear_id=1d6ef2d3-32dd-43df-a184-7ef14e3aa8a5`

Request body:

```json
{
  "type": "lens",
  "brand": "Sony",
  "model": "FE 35mm F1.8",
  "serial_number": "SN35F180123",
  "purchase_date": "2025-08-15",
  "notes": "Updated notes after sensor cleaning.",
  "maintenance_interval_days": 180,
  "last_maintained": "2026-04-01"
}
```

Success response `200 OK`:

```json
{
  "id": "1d6ef2d3-32dd-43df-a184-7ef14e3aa8a5",
  "user_id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
  "type": "lens",
  "brand": "Sony",
  "model": "FE 35mm F1.8",
  "serial_number": "SN35F180123",
  "purchase_date": "2025-08-15",
  "notes": "Updated notes after sensor cleaning.",
  "maintenance_interval_days": 180,
  "last_maintained": "2026-04-01",
  "created_at": "2025-08-16T10:00:00Z"
}
```

### DELETE `/api/v1/gear/{gear_id}`

Purpose: Delete a gear item.

Auth:

- Bearer token required

Request params:

- Path: `gear_id=1d6ef2d3-32dd-43df-a184-7ef14e3aa8a5`

Success response `204 No Content`

## Stats API

These endpoints return aggregated data from photo and EXIF records.

### GET `/api/v1/stats/me/focal-length`

Purpose: Return focal length usage counts for the current user.

Auth:

- Bearer token required

Success response `200 OK`:

```json
[
  {
    "focal_length": 35.0,
    "count": 12
  },
  {
    "focal_length": 85.0,
    "count": 7
  }
]
```

### GET `/api/v1/stats/me/aperture`

Purpose: Return aperture usage counts for the current user.

Auth:

- Bearer token required

Success response `200 OK`:

```json
[
  {
    "aperture": 1.8,
    "count": 9
  },
  {
    "aperture": 2.8,
    "count": 6
  }
]
```

### GET `/api/v1/stats/me/monthly`

Purpose: Return monthly photo counts for the current user.

Auth:

- Bearer token required

Success response `200 OK`:

```json
[
  {
    "month": "2026-03",
    "count": 18
  },
  {
    "month": "2026-04",
    "count": 20
  }
]
```

## Admin API

### GET `/api/v1/admin/users`

Purpose: List all users.

Auth:

- Bearer token required
- Admin required

Success response `200 OK`:

```json
[
  {
    "id": "3f4a8c2d-7d87-4b69-8cc8-e12d9b3a0f11",
    "username": "vincentchen",
    "email": "vincent@example.com",
    "is_admin": true,
    "created_at": "2026-04-17T09:30:00Z"
  },
  {
    "id": "f64b4a3d-6233-4281-8589-c9914d5a7c4d",
    "username": "miyu",
    "email": "miyu@example.com",
    "is_admin": false,
    "created_at": "2026-04-12T11:10:00Z"
  }
]
```

### DELETE `/api/v1/admin/users/{user_id}`

Purpose: Delete a user.

Auth:

- Bearer token required
- Admin required

Request params:

- Path: `user_id=f64b4a3d-6233-4281-8589-c9914d5a7c4d`

Success response `204 No Content`

### PATCH `/api/v1/admin/users/{user_id}/toggle-admin`

Purpose: Toggle the user's admin status.

Auth:

- Bearer token required
- Admin required

Request params:

- Path: `user_id=f64b4a3d-6233-4281-8589-c9914d5a7c4d`

Success response `200 OK`:

```json
{
  "id": "f64b4a3d-6233-4281-8589-c9914d5a7c4d",
  "username": "miyu",
  "email": "miyu@example.com",
  "is_admin": true,
  "created_at": "2026-04-12T11:10:00Z"
}
```

## System API

### GET `/health`

Purpose: Basic health check for the backend service.

Auth: none

Success response `200 OK`:

```json
{
  "status": "ok",
  "app": "LensLog"
}
```

## Database Model

The backend uses PostgreSQL. Models are defined in `app/models/models.py`.

![ER Diagram](images/er_diagram.png)

Key relationships:

1. `Photo` and `ExifData` are `1:1`.
2. `Location` and `LocationTag` are `1:N`.

## Notes

- `POST /api/v1/auth/refresh` uses `refresh_token` as a query parameter, not a JSON body.
- `POST /api/v1/photos/presign` uses `filename` as a query parameter, not a JSON body.
- `POST /api/v1/auth/logout` requires both the current Bearer token and a `refresh_token` in the body because both are blacklisted on logout.
- Successful `DELETE` endpoints return `204 No Content`.
