# Upload Flow

## Overview

Direct-to-R2 upload via presigned URLs. Server never touches video bytes.

## Sequence

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Guest   │     │  Server  │     │    R2    │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ GET /presign   │                │
     │───────────────>│                │
     │                │                │
     │ { url, key }   │                │
     │<───────────────│                │
     │                │                │
     │ PUT video      │                │
     │────────────────────────────────>│
     │                │                │
     │ 200 OK         │                │
     │<────────────────────────────────│
     │                │                │
```

## Presign Request

```
GET /presign?filename=video.mp4&type=video/mp4&size=12345678
```

## Presign Response

```json
{
  "url": "https://bucket.r2.cloudflarestorage.com/...",
  "key": "1707400000000-uuid-video.mp4"
}
```

## Upload

Frontend PUTs directly to presigned URL with `Content-Type` header.

## Stats Update

Stats incremented optimistically at presign time (not upload completion).
Trade-off: simpler architecture, slightly inflated counts if uploads fail.
