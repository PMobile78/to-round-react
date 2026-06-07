# Mind Map screen — design

Date: 2026-06-07

## Goal

Add a Mind Map editor screen, visually inspired by the organic, radial,
colored-branch mind maps at https://learningfundamentals.com.au/resources/
(central topic with curved tapering colored branches radiating outward).

## Decisions (from brainstorming)

- **Integration:** separate screen, reachable from the main menu (like the
  bubbles/tasks views).
- **Persistence:** Firestore per user, with localStorage fallback (same pattern
  as bubbles/tags).
- **Editing:** rich — add/drag/delete nodes, branch colors, node shapes,
  emoji/icons, images (by URL), font size/bold, line style/width.
- **Style:** organic — curved colored branches radiating from the center.
- **Approach:** custom SVG canvas + MUI-positioned node elements (no heavy deps).

## Navigation

- `MainMenuDrawer` gets a new "Mind Map" item with an `onOpenMindMap` callback.
- `BubblesPage` holds `activeScreen` state (`'main' | 'mindmap'`). When
  `'mindmap'`, it renders a full-screen `<MindMapPage onBack=... />` instead of
  the bubbles/tasks content. Changes to the god-component stay minimal.

## Data model (Firestore)

- Collection: `user-mindmaps/{uid}/maps/{mapId}`.
- Map document:
  `{ id, title, rootId, nodes: MindMapNode[], createdAt, updatedAt }`
  (whole map stored in one doc — compact + atomic, like bubbles).
- `MindMapNode`:
  `{ id, parentId, text, x, y, color, shape ('rounded'|'ellipse'|'cloud'|'none'),
     fontSize, bold, icon (emoji|null), imageUrl (string|null),
     lineStyle ('solid'|'dashed'), lineWidth, collapsed }`.
  - `x`/`y` are positions relative to the canvas/center.
  - Root node has `parentId = null`.
  - A node's branch color is inherited from its top-level ancestor unless set.
- `firestore.rules`: add owner-only
  `match /user-mindmaps/{uid}/{document=**}`.

## Components

- `pages/MindMapPage.js` — map list (create/select/delete) + canvas of current map.
- `components/mindmap/MindMapCanvas.js` — SVG branch layer + node layer,
  pan/zoom, selection, drag, auto-radial-layout.
- `components/mindmap/MindMapNode.js` — node with inline text edit, icon/image.
- `components/mindmap/MindMapBranch.js` — tapering colored bezier ribbon
  (parent → child).
- `components/mindmap/MindMapToolbar.js` — selected-node editing: branch color,
  shape, emoji, font size/bold, line style/width, add child, delete.
- `components/mindmap/MindMapListDrawer.js` — choose/create/delete maps.
- `hooks/useMindmaps.js` — state + Firestore CRUD/subscription.
- `services/mindmapService.js` — Firestore persistence (load/save/delete/subscribe)
  with localStorage fallback.

## Interactions

- Click node → select (shows toolbar/handles).
- Double-click node → inline text edit.
- "+" on selected node → add child (auto-placed radially).
- Delete → remove node and its descendants (root cannot be deleted).
- Drag node → reposition; drag background → pan; wheel/pinch → zoom.
- "Auto-layout" button → arrange children radially around the root.

## i18n

- New `mindmap` section in `src/locales/en/translation.json` and
  `src/locales/uk/translation.json`.

## Out of scope (first stage, YAGNI)

- Uploading image files to Firebase Storage (use image URL / emoji only).
- Real-time collaborative editing.
- Export to PNG/PDF.
