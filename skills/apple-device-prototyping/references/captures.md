# Native geometry captures — version 1

Use this when importing a user's measurement or adding a native probe. The
repository includes `native/GeometryScanner`; the installed skill's starter
includes the importer, not the Xcode project.

The JSON is a single observation, not a universal profile for a model. It binds
an owning view, window size, OS, orientation and chrome configuration. The
browser validates structure and geometry; `source.kind` is declared provenance,
not cryptographic proof. Keep original exports and screenshots for review.

## Record

| Fields | Meaning |
| --- | --- |
| `schemaVersion`, `id`, `capturedAt` | Version 1; observation identity; ISO 8601 capture time. |
| `source` | `kind: device\|simulator`, model identifier, OS version/build, scanner version. |
| `configuration` | `mode: fullscreen\|system-bars\|embedded`, target name, interface orientation, actual status-bar visibility, home-indicator auto-hide preference, navigation/toolbar/tab-bar visibility. |
| `units`, `coordinateSpace` | `pt` and `view-local`; applies to view guides and reserved regions. |
| `viewBounds` | Owning view's local bounds. Defines the prototype viewport, not the screen bounds. |
| `windowBounds`, `viewFrameInWindow` | Window-local bounds and measured view's rectangle converted to that window. |
| `screenBounds`, `nativeBounds` | UIScreen bounds in its coordinate space (points); native pixel bounds for context only. |
| `scale`, `nativeScale` | View display scale and screen native scale. Never multiply CSS dimensions by either. |
| `safeAreaInsets`, `safeAreaFrame` | Insets and resulting layout-guide rectangle in the owning view. |
| `layoutMargins`, `readableContentFrame` | Insets and readable guide; separate from the safe area. |
| `traits` | Horizontal/vertical size classes, content size category, interface style and layout direction. |
| `regionsSupported`, `regionsIncludingInactive` | Whether query APIs were available and their reported regions. Each has `kind`, `active`, `frame`, `margins`. |

Rectangles use `{x,y,width,height}`; insets use `{top,right,bottom,left}`.
Unknown future fields are ignored. Unknown schema versions, malformed values,
inconsistent safe-area rectangles and files over 1 MiB are rejected before the
active prototype changes. The parser is in `device-kit/capture.js`; executable
contract cases are in `scripts/capture.test.mjs`.

## Browser behavior

```js
import {parseCapture,captureState,DevicePreview} from './device-kit/device-preview.js';
const capture = parseCapture(jsonText);
preview.update(captureState(capture), {guides:true});
```

The capture is copied into state. Exact replay uses its insets/regions and reports
`device-measured` or `simulator-measured`. Imported records never silently fall
back to the bundled Duo catalog. Changing dimensions, rotation or fold pose
invalidates the recorded geometry and reports `fixture`; reselect the imported
profile to restore it. Returning to the exact original state also restores it.
Record a separate native observation for each orientation/chrome configuration.

The browser subtracts a nonzero view-bounds origin from reserved rectangles
before drawing them. It preserves inactive regions and does not turn inactive
divisions into barriers. It does not infer a device model or toolbar width from
the model string. Imported home indicators are not drawn: the measured view may
not contain one. Recorded traits/margins remain available as metadata; the
importer does not implement Dynamic Type, RTL, UIKit bars or a native layout engine.

Application code still owns composition and safe-area use. JSON import adds
diagnostics and viewport geometry, not native system panels. Import is local to
the browser session; reload requires importing again.
