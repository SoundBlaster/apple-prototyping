---
name: apple-device-prototyping
description: Build reusable HTML/CSS layout prototypes inside iPhone, iPad and foldable-device fixtures, with preview scaling, safe-area guides and recorded Duo geometry. Use for browser design studies, not native iOS builds or device conformance claims.
---

# Apple device prototyping

Create a browser workbench whose device geometry is independent from application
content. Start with the supplied kit; preserve the user's existing app and visual
language when adapting an existing prototype.

## Start

For a new prototype, run `scripts/create_prototype.py /absolute/new/directory`.
Serve that directory over HTTP (`python3 -m http.server`); ES modules do not support
opening this starter as a `file://` page. The helper refuses existing destinations.
Replace the sample application in `index.html`, `app.css`, and `app.js`; keep
`device-kit/` independent. For an existing prototype, copy only `device-kit/`
and connect its elements through `DevicePreview` as described in
[the integration reference](references/integration.md).

For geometry exported from the native scanner, read [the capture contract](references/captures.md).
Use the starter's **Import scanner JSON** control or `parseCapture`/`captureState`
to replay it. Keep the owning-view/chrome context and declared source visible.
Capture each orientation separately; resizing a capture does not measure a new device.
To retrieve exports from a paired device or organize an export folder, use
`scripts/collect.mjs` as described in [collection](references/collection.md).

## Present in Codex and invite annotations

When working in Codex desktop, open the running prototype in its built-in browser
for the user to review. Verify the local HTTP server responds, then use
`open_in_codex` with a browser target and the served URL. Reuse the prototype's
existing browser tab when possible. Keep the server running during review.
Opening a tab alone does not verify the layout; perform the checks below too.
If the embedded browser tool is unavailable, provide the working URL and explain
how to open it; respect an explicitly requested alternative browser.

When presenting the prototype, briefly invite the user to use the built-in
browser's annotation feature if anything looks different from what they intended.
For example, adapt this to the user's language: “If something looks off, annotate
it directly in the Codex browser and describe how you want it to look.”
Use the existing browser feature; do not build an annotation system into the app.
If annotations are unavailable in the current host, accept ordinary feedback.

Treat submitted annotations as spatial context for the user's requested changes.
Reproduce the relevant device preset, orientation, pose and application state;
ask only for context missing from the received feedback. Apply the changes,
recheck the affected layout and adjacent modes, then show the updated prototype
in the same browser. Do not claim to have received annotations until they arrive,
and do not require annotations or approval to finish already authorized work.

## Boundaries that matter

- CSS pixels represent logical points. CSS transform scales only the preview;
  don't change logical width/height to fit the browser, and don't multiply by DPR.
- Keep application state and DOM identity when resizing, rotating or changing pose.
  The kit changes geometry and its own diagnostic overlays, never app content.
- Use container queries for composition inside the simulated device. Browser
  media queries are appropriate for the outer inspector/workbench.
- A fold pose does not change full display dimensions. Use the division rectangle
  to allocate panels only when the product needs them. A vertical fold does not
  inherently split the app. Tabletop can use the upper rect for content and lower
  rect for controls, but that remains an application decision.
- Safe-area insets, authored padding, toolbar allocation and physical occlusions
  are separate. Reserve an edge lane once. Backgrounds may extend to display
  edges while meaningful content/controls avoid occlusions.
- Read [geometry provenance](references/geometry.md) before claiming dimensions,
  safe areas or toolbar behavior. Exact presets replay historical Simulator
  measurements. Custom dimensions and the large foldable are fixtures. Activating
  inactive occlusions is a simulation, not a new measurement.
- Browser glass styling, camera masks and home indicators are illustrations;
  UIKit behavior, touch, audio, accessibility and native rendering need native proof.

## Verify the result

Run `node --test scripts/*.test.mjs` from this skill directory when changing
the bundled kit (`npm test` from the repository root). The reusable Playwright
check is `scripts/browser-smoke.mjs`: import `runBrowserSmoke(page, baseURL)`
with the starter served. For a generated prototype,
serve it and inspect representative phone/iPad, inner/outer portrait/landscape,
vertical-fold and tabletop states relevant to the request. Inspect actual
screenshots and DOM bounds: controls stay reachable, layout uses device dimensions,
state survives switches and scaled pointer coordinates map back correctly. Include
at least one custom size so fixture labeling is exercised. Report covered modes
and any unverified native behavior; do not declare native conformance from HTML.

The initial extraction checks and their limits are recorded in
[validation](references/validation.md).
