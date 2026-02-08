# Gallery Feed

## Overview

Instagram-style vertical video feed. Videos play on hover, sorted by recency.

## API

```
GET /gallery
```

## Response

```json
[
  {
    "key": "1707400000000-uuid-video.mp4",
    "url": "https://...",
    "size": 12345678
  }
]
```

## Display

- 9:16 aspect ratio cards
- Grid layout, responsive
- Hover to play, leave to pause
- Sorted newest first
- Max 50 videos

## URL Strategy

1. If `R2_PUBLIC_URL` set: use public URLs (faster, no expiry)
2. Otherwise: generate signed URLs (1 hour expiry)

## Future

- [ ] Infinite scroll / pagination
- [ ] Video thumbnails
- [ ] Lightbox view
- [ ] Download option
