# Geometry Scanner

A small UIKit app that records the geometry of its visible root view. Run it on
an iPhone, iPad or Simulator, change orientation and chrome, then import the
exported JSON into the browser playground.

## Run

Open `GeometryScanner.xcodeproj`, select the `GeometryScanner` scheme and an iOS
destination, then Run. The project requires the iOS 27.1 SDK to compile and
supports iOS 18+. Choose your own signing team for a physical device; no team or
credentials are committed. The checked-in project is generated from
`project.yml` with XcodeGen; regenerate it after changing that specification.

CLI example (choose a destination and build location for your machine):

```sh
xcodebuild -project GeometryScanner.xcodeproj -scheme GeometryScanner \
  -destination 'platform=iOS Simulator,name=YOUR_SIMULATOR' \
  -derivedDataPath /your/build/location/GeometryScanner \
  CODE_SIGNING_ALLOWED=NO build
```

## Measure and export

1. Choose **Full screen** or **System bars** (navigation bar + toolbar).
2. Toggle **Hide status bar**, rotate or resize the window, and let layout settle.
3. Inspect bounds in blue, safe area in green, readable content in orange and
   reserved regions in purple (dashed when inactive).
4. Tap **Export JSON + screenshot** and save/share both files. The screenshot
   shows the measured view, not the full display or an unrelated application.
5. In the HTML playground, choose **Import scanner JSON**. The profile appears in
   the device selector; its recorded safe-area guides are enabled.

The app saves the latest settled observation as `Documents/latest.json`.
Explicit exports use unique matching `geometry-<id>.json` and `.png` names;
Files sharing is enabled. A screenshot is generated before presenting the share
sheet so the sheet does not become part of the evidence. Simulator automation
can copy Documents via `xcrun simctl get_app_container <UDID> dev.soundblaster.apple-prototyping.scanner data`.
The optional launch argument `--system-bars` starts with system panels visible.

## Measurement scope

Measurements come from the actual owning view, its window and that window's
screen. The scanner avoids global key-window or main-screen lookup. It records
local view bounds, window/screen/native bounds, the view's frame in its window,
safe area, margins, readable content, scale, size classes, Dynamic Type category,
appearance, interface orientation and chrome configuration.

On iOS 27.1+, reserved regions include active and inactive occlusions/divisions
and their reported margins. Earlier OS versions record `regionsSupported:false`
instead of claiming there are no reserved regions. A fold is inferred in the
browser only from an active measured division. Region margins are preserved as
evidence and are not added to the reported frame a second time.

This release measures two scanner configurations. It does not scan other apps,
keyboard geometry, tab bars or arbitrary SwiftUI presentations. Its control
panel overlays the view without changing that view's safe-area insets.
Rotation/window-size changes and safe-area updates trigger a debounced capture;
transitions and presented sheets are excluded.

For an embedded probe, reuse `GeometryCapture.swift` in the app target and call
`GeometryCapture.measure(view:configuration:)` on the main actor after the
specific target view is visible and laid out. Use `mode: "embedded"`, a descriptive
target name and the actual hosting configuration. That is the measurement needed
for an embedded game view; scanner-root insets should not be substituted for it.

See the [capture contract](../../skills/apple-device-prototyping/references/captures.md)
for provenance, coordinate spaces and import rules.
