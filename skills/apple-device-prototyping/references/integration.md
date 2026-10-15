# Integration contract

Copy `assets/starter/device-kit/` as a versioned local dependency (including LICENSE).
Load `device-preview.css` before application CSS and use an ES module entrypoint.
The module has no package, network, font, image or application dependencies.

```html
<div id="stage"><div id="space"><div id="frame"><div id="screen">
  <div id="application">Your persistent application</div>
</div></div></div></div>
```

```js
import {DevicePreview,preset,rotate} from './device-kit/device-preview.js';
const find=id=>document.getElementById(id);
const preview=new DevicePreview({screen:find('screen'),frame:find('frame'),
  space:find('space'),stage:find('stage'),maxHeight:700});
let state=preset('duo');
let geometry=preview.update(state,{guides:true,cameraActive:false});
state=rotate(state);
geometry=preview.update(state);
// Application decides what goes in each region; kit never remounts it.
find('screen').addEventListener('pointerdown',event=>{
  const point=preview.toLocal(event.clientX,event.clientY);
});
// When removing the workbench:
// preview.destroy(); // removes its overlays and disconnects ResizeObserver
```

`stage` needs available width and padding. `space` reserves the scaled shell's
size; `frame` applies a uniform transform; `screen` remains the logical viewport.
Use one instance per preview; selectors and observations are scoped to its elements.
`update` returns a geometry snapshot and emits `devicechange` on that screen.

State: `width`, `height` (positive logical pixels), `family` ordinary/duo,
`display` generic/inner/outer/hypothetical, `pose` flat/vertical/tabletop,
`rotation` left/right (outer landscape safe-area side). Outer displays normalize
to flat. `rotate` swaps dimensions and vertical/tabletop axes, preserving state.
`preset(id)` returns a fresh mutable object, never a shared app state.

Geometry: `sample` (matching historical measurement or null), `exact`, `evidence`,
`simulated`, `safe`, `regions` (including inactive), `division` (active/fixture),
`chromeHint`, `edgeLane`, `note`. Chrome hints are example design policy, not UIKit
layout output. The 84 pt lane is a recorded design convention; apps can choose
other chrome and should not blindly add it to safeRight 84 again.

CSS exports: `--safe-top/right/bottom/left` (and `--native-*` compatibility aliases),
`--division-x/y/width/height`, `--fold`, `--half-division`, `--edge-lane`.
Datasets: family/display/pose/native/geometry-evidence/guides/preview-scale.
The screen is a named size container `device`. Create additional app containers
for content regions, e.g. `container: scene / size`.

Geometry guides have pointer-events:none and never absorb application input.
`destroy` leaves content/state and assigned styles in place; remove the preview
DOM yourself if it is no longer needed. The kit does not manage window globals,
app listeners, keyboard shortcuts, navigation, audio or localization.
