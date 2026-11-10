# Highlights photos

Each folder feeds one tile in the **Recent work** section:

| Folder             | Tile                                                  | What to put in it                                                 |
| ------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `event-coverage/`  | Event coverage · Every event, start to finish (large) | Wide shots that show scale: the stage, the full venue, a ceremony |
| `portraits/`       | Portraits · Captured with intent (tall)               | Best-lit, most polished portraits; vertical photos fit best       |
| `crowd-candids/`   | Crowd candids · The moments in between                | Real emotion: laughter, cheering, reactions                       |
| `details/`         | Attention to detail · Nothing too small               | Close-ups: hands, decor, medals, programs, textures               |
| `behind-the-lens/` | Behind the lens · The crew at work                    | Bidyo members mid-shoot, with the camera visible                  |

## Adding photos

1. Drop `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif` files into the folder. No code changes needed.
2. Photos rotate in **file-name order**. Prefix with numbers to control it; `01-…` is shown first.
3. Use lowercase, hyphenated, descriptive names (`crowd-cheering-intramurals.jpg`, not `IMG_4821.JPG`).
4. 3–4 photos per tile works well. A single photo is fine too (it just won't rotate).
5. For photos where students are clearly identifiable, get their OK before publishing.

A folder with no photos hides its tile (and `pnpm dev` prints a warning naming the folder).

## Sizes

You don't need to resize: the build (vite-imagetools) converts every photo to WebP at
400, 640, 960, 1280 and 1600px wide, and browsers download only the size they need.
Photos are never enlarged, so for sharp results on large screens use originals that are
**at least 1600px wide**.

Very large camera files (20 MB+) still work but slow down builds; exporting at around
2400px on the long edge is plenty.
