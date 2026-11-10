# Team portraits

Each officer has two transparent PNG cutouts in this folder, named by their `photo`
number in `../members.ts`:

| File        | Shown                                               |
| ----------- | --------------------------------------------------- |
| `<n>.png`   | Normally                                            |
| `<n>.1.png` | On mouse hover (and on the slide in view on phones) |

Example for `{ photo: 3, name: "Gian Allen S. Ong", role: "President" }`:

```
3.png
3.1.png
```

## Photo guidelines

- **Transparent background** (PNG with alpha). The card supplies the background, so every
  portrait sits on the same backdrop.
- **Same framing for everyone**: crop all cutouts the same way (e.g. head to mid-chest),
  with the bottom edge of the body touching the bottom of the image.
- **At least 800px wide.** The build converts them to WebP at 320–800px; they're never enlarged.

## Adding or removing an officer

Edit `../members.ts` (one line per person, in display order) and add or remove their two PNGs.
The number on the card (01, 02…) follows the list order, not the file number.

## What happens if something is missing

- No `<n>.1.png`: the card shows the main portrait only, with no swap.
- No `<n>.png`: the card shows the member's initials (and `pnpm dev` prints a warning).
- No members in `members.ts`: the whole Team section is hidden.
