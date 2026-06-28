# Sprite Sheet Editor

A browser-based sprite sheet editor built with React, Vite, and TailwindCSS. Load, inspect, animate, edit, and export sprite sheets entirely in your browser — no server required, no installs beyond a dev server.

---

![Sprite Sheet Editor Screenshot](https://github.com/markentingh/spritesheeteditor/blob/main/public/screenshot-01.png?raw=true)

## Features

### Sheet Management
- **Drag & Drop Import** — Drop a PNG or JPG directly onto the canvas or the full browser window to load it as a sprite sheet
- **Click to Browse** — File picker for importing PNG and JPG sprite sheets
- **Configurable Grid** — Set the number of rows and columns to define the frame layout overlaid on your sheet
- **Grid Padding** — Set Top, Right, Bottom, and Left padding (in pixels) to offset the grid inward from the edges of the sprite sheet image, useful for sheets that have a border or margin around the frame area
- **Frame Grid Overlay** — Red dashed SVG grid lines drawn over the sheet to visualize frame boundaries
- **Per-Frame Selection** — Toggle individual frames on or off via checkboxes; only selected frames are included in animation playback and export
- **Persistent State** — Everything is automatically saved to `localStorage` as you work — your sprite sheet image, grid configuration, padding, FPS, zoom levels, sidebar width, pixel editor panel width, drawing tool settings, preview background, and animation state. When you refresh the page or return to the site later, the entire workspace is restored exactly as you left it, with no manual saving required

### Animation Preview
- **Real-time Playback** — Play/pause animation cycling through selected frames at the configured FPS
- **FPS Control** — Slider to set frames per second (1–60)
- **Zoom Control** — Preview zoom from 50% to 500%
- **Pan & Drag** — Click and drag the preview canvas to reposition the frame view
- **Reset Button** — Resets preview zoom and pan position to defaults
- **Timeline Scrubber** — Draggable timeline bar showing current frame position within the selected frame sequence; click or drag to jump to any frame
- **Resizable Preview Panel** — Drag the top edge of the preview section to resize its height (150px–600px)
- **Background Options** — Choose a solid color (with full alpha support via the color picker) or one of 8 preset background images for the preview canvas
- **Customizable Background Color** — Full color picker with HSL, RGB, HEX, and alpha channel input

### Pixel Editor (Per-Frame)
Click any frame on the sheet to open the pixel editor panel for that frame.

#### Tools
- **Hand Tool** — Pan the canvas freely
- **Pencil** — Draw pixels with configurable brush width (0.1–100px), spread (spacing), and optional anti-aliasing
- **Eraser** — Erase pixels with configurable brush width, alpha (partial transparency erase), spread, and optional anti-aliasing
- **Flood Fill** — Fill contiguous regions with the selected color; configurable tolerance (0–255) and optional anti-aliasing
- **Box Select** — Draw a rectangular selection region on the frame (marching-ants animated border)
- **Eyedropper** — Sample any pixel color from the canvas and set it as the active drawing color

#### Color Picker
- **HSL Color Wheel** — Interactive circular color wheel for hue/saturation selection
- **Hue & Saturation Bars** — Slider bars for precise hue and saturation control
- **Alpha Channel** — Full transparency/opacity control
- **HEX Input** — Type a hex color code directly
- **RGB / HSL Mode** — Toggle between RGB and HSL numeric input modes
- **Original Color Swatch** — Shows the color at the time the picker was opened for easy comparison

#### Replace Color Modal
Opened from the **Image** menu in the pixel editor. A non-destructive, real-time color replacement tool — useful for recoloring sprites or performing a **chroma key** (removing a solid background color to transparency).

- **Source Color Picker** — Click the eyedropper button to sample colors directly from the frame canvas; up to 6 source colors can be added simultaneously to handle anti-aliased or gradient edges around the target color
- **Click to Replace Source** — Click any existing source color swatch to re-pick it on the canvas
- **Remove Source Color** — Hover a source swatch and click the red X to remove it from the selection
- **Fuzziness** — Slider (1–200) controls how loosely pixels are matched against the source colors; higher values match a wider range of similar colors, enabling smooth chroma-key edges
- **Fuzziness Mask Preview** — Live grayscale preview showing exactly which pixels will be affected and at what blend strength; white = full match, black = no match
- **Target Hue** — Full 0°–360° rainbow slider to set the output color hue; auto-populated from the first picked source color
- **Target Saturation** — 0–100% slider with a live gradient reflecting the current hue and lightness
- **Target Lightness** — 0–100% slider with a live gradient reflecting the current hue and saturation
- **Target Alpha** — 0–255 slider to set the output opacity; set to 0 to fully erase matched pixels (chroma key / background removal)
- **Real-time Preview** — All slider changes are applied live to the pixel editor canvas so you can see the result before committing
- **Apply to Current Frame** — Applies the replacement only to the frame currently open in the pixel editor
- **Apply to Entire Sprite Sheet** — Checkbox option that processes every pixel across all frames in the full sprite sheet; requires confirmation due to being irreversible
- **Cancel** — Reverts the canvas to its original state before the modal was opened

#### File Menu
- **Download Frame** — Export the current frame as an individual PNG file

#### Editing Controls
- **Undo / Redo** — Full undo/redo history (up to 50 states) with `Ctrl+Z` / `Ctrl+Y` keyboard shortcuts and toolbar buttons
- **Save Changes** — Commits pixel editor changes back into the sprite sheet and persists to `localStorage`
- **Cancel** — Reverts unsaved changes back to the last saved state
- **Zoom** — Pixel editor canvas zoom from 100% to 1500%
- **Pan** — Canvas panning with the hand tool or while using the hand tool mode
- **Live Preview** — Changes in the pixel editor update the animation preview in real time without requiring a save
- **Checkerboard Background** — Transparent areas shown with a checkerboard pattern for clear alpha visibility
- **Brush Cursor Preview** — Visual circle cursor showing exact brush size and position while drawing or erasing
- **Resizable Editor Panel** — Drag the left edge to resize the pixel editor panel width (400px–1200px)

### Export
- **Export Sprite Sheet** — Opens an export modal to re-pack only the selected frames into a new PNG
- **Frames Per Row Control** — Slider to choose how many frames appear per row in the exported sheet (1 to total selected frames)
- **Resolution Preview** — Displays the calculated output resolution and per-frame dimensions before downloading
- **PNG Download** — Exported sheet is downloaded directly as a PNG file with an auto-generated filename

### UI & Layout
- **Resizable Sidebar** — Drag the left edge of the sidebar to adjust its width (280px–600px)
- **Dark Theme** — Full dark UI using gray-900/950 with purple accent colors
- **Global Drag Overlay** — Full-screen drop target overlay appears when dragging an image file over the browser window

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | TailwindCSS 4 |
| Language | JavaScript (ESM) |
| Storage | Browser `localStorage` |
| Icons | Google Material Symbols |

---

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/markentingh/spritesheeteditor.git
   cd spritesheeteditor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in your browser**
   Navigate to `http://localhost:5173` (or whichever port Vite reports).

### Build for Production

```bash
npm run build
```

The output will be in the `dist/` folder, ready to serve as a static site.

### Preview the Production Build

```bash
npm run preview
```

---

## Usage

1. **Load a sprite sheet** — Drag and drop a PNG or JPG onto the page, or click the upload area to browse for a file.
2. **Configure the grid** — Set the number of rows and columns in the sidebar to match your sprite sheet's frame layout.
3. **Select frames** — Check or uncheck individual frames to include or exclude them from animation and export.
4. **Preview the animation** — Use the play button in the sidebar to animate the selected frames. Adjust FPS and zoom as needed.
5. **Edit a frame** — Click any frame on the sheet to open the pixel editor. Use the drawing tools to make changes, then save or discard.
6. **Export** — Click **Export New Sprite Sheet** to download a re-packed PNG containing only the selected frames.

---

## Contributors

| Name | GitHub | Background |
|---|---|---|
| **Mark Entingh** | [@markentingh](https://github.com/markentingh) | 26+ years as a professional web application developer. I proudly built this tool to help other developers and artists work with sprite sheets more efficiently, and I built the entire thing from scratch in 12 hours using Windsurf AI and didn't have to write a line of code myself. |

---

## License

See [LICENSE](LICENSE) for details.
