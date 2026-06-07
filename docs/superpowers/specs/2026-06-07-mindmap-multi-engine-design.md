# Mind Map multi-engine support — design

Date: 2026-06-07

## Goal

When creating a new mind map, let the user choose the rendering/editing engine:

- **custom** — the existing in-house canvas (`MindMapCanvas`).
- **reactflow** — an editor built on `@xyflow/react` (React Flow v12).
- **mindelixir** — the `mind-elixir` library's built-in editor.

The engine is chosen at creation time and is fixed for the life of that map.

## Decisions (from brainstorming)

- **Data storage:** each engine stores its data in its own native format. No
  cross-engine conversion.
- **Backward compatibility:** existing maps (no `engine` field) are treated as
  `custom`.
- **Engine picker:** shown in the "create map" UI (`MindMapListDrawer`), next to
  the name field. The empty-state "create" button in `MindMapPage` opens the
  drawer so an engine is always chosen deliberately.
- **React Flow scope:** rich editor — pan/zoom, drag, add node, connect edges,
  rename (double-click), delete, `Background`/`Controls`/`MiniMap`, node
  colors/shapes, and auto-layout via `dagre`.
- **Mind-Elixir scope:** use the library's full built-in editor as-is.

## Architecture — engine registry

Each engine is a self-contained React editor component with a uniform interface:

```
<EngineEditor map={map} onChange={(engineData) => ...} t={t} ... />
```

`MindMapPage` selects the component by `map.engine` (a host switch). Engines are
independent and own their data format.

## Data model (Firestore)

`user-mindmaps/{uid}/maps/{mapId}` document gains:

- `engine: 'custom' | 'reactflow' | 'mindelixir'` — missing ⇒ `'custom'`.
- **custom:** unchanged — `nodes: MindMapNode[]` + `rootId`.
- **reactflow:** `engineData` = JSON string of `{ nodes, edges }`.
- **mindelixir:** `engineData` = JSON string of the Mind-Elixir data tree.

Non-custom engine data is stored as a **JSON string** to avoid Firestore's
nested-array restriction and `undefined` issues.

`mindmapService.sanitizeMap` branches on `engine`:

- `custom` → sanitize `nodes` as today (+ `rootId`).
- `reactflow` / `mindelixir` → validate `engineData` is a string; pass through
  `engine` + `engineData`.

`NODE_SHAPES`, branch colors etc. remain custom-engine concerns.

## Components

```
src/
 pages/MindMapPage.js          # host: pick engine editor by map.engine
 hooks/useMindmaps.js          # createMap(title, engine) builds default per engine
 components/mindmap/
   MindMapListDrawer.js        # engine selector next to name; onCreate(title, engine)
   engines/
     CustomEngine.js           # thin wrapper over existing MindMapCanvas
     ReactFlowEngine.js        # @xyflow/react editor (+ dagre auto-layout)
     MindElixirEngine.js       # mind-elixir wrapper
 services/mindmapService.js    # engine-aware sanitizeMap
```

### CustomEngine
Wraps current `MindMapCanvas`; persists via `onNodesChange` → `nodes`. Behavior
unchanged.

### ReactFlowEngine
- `import { ReactFlow, Background, Controls, MiniMap, useNodesState,
  useEdgesState, addEdge, Handle, Position } from '@xyflow/react'` +
  `'@xyflow/react/dist/style.css'`.
- Custom editable node (label, color, shape) with a source + target `Handle`.
- Toolbar: add node, delete selected, auto-layout (dagre), node color/shape for
  the selected node.
- Connect by dragging handles (`onConnect` → `addEdge`).
- Persist `{ nodes, edges }` (debounced) via `onChange(JSON.stringify(...))`.

### MindElixirEngine
- `import MindElixir from 'mind-elixir'` + `'mind-elixir/style.css'`; locale from
  `mind-elixir/i18n` (en/uk; uk → fallback to en if unavailable).
- `new MindElixir({ el, direction, contextMenu: { locale } })`, `.init(data)`.
- New maps: `MindElixir.new(rootTopic)`.
- Persist on `mind.bus.addListener('operation', ...)` → `mind.getData()` →
  `onChange(JSON.stringify(data))` (debounced).

## Persistence flow

Engine editor calls `onChange(engineData)` → `MindMapPage` calls
`updateMap(id, m => ({ ...m, engineData }))` (custom keeps using `nodes`). The
existing debounced save in `useMindmaps` handles Firestore/localStorage writes.

## Dependencies

`@xyflow/react`, `mind-elixir`, `dagre` — installed with
`npm i --legacy-peer-deps`.

## i18n

New keys in `en`/`uk` `mindmap` section: `engine`, `engineCustom`,
`engineReactFlow`, `engineMindElixir`, plus any RF toolbar labels reused from
existing shape/color strings where possible.

## Out of scope (YAGNI)

- Converting an existing map from one engine to another.
- Sharing styling/themes across engines.
- Export/import of engine-native files.
