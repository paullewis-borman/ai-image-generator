# images/

Generated images are saved here with unique, chronologically sortable names:

```
img_<YYYYMMDD-HHMMSS>-<4-char-suffix>.<ext>
```

## manifest.json

Tracks every generated image. Each entry:

```json
{
  "id": "img_20260629-153000-a1b2",
  "filename": "img_20260629-153000-a1b2.png",
  "createdAt": "2026-06-29T15:30:00Z",
  "type": "initial | iteration | reset",
  "parentImage": "golden | <filename of prior image> | null",
  "prompt": "the user/default prompt used (generic instructions are not repeated here)",
  "current": true
}
```

`current: true` marks the active image — the one to pass back in as the
"image to modify" on the next iteration request. Only one entry should be
`current` at a time.
