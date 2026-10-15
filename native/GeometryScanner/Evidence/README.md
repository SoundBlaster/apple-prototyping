# Scanner → browser verification, 2026-10-15

These are actual app-export pairs from the iPhone Duo Simulator, iOS 27.1.0
(24A94401), model identifier iPhone19,4. They are observations of
`scanner.rootView`, not physical-device measurements.

| Capture | Bounds, pt | Safe top / right / bottom / left |
| --- | --- | --- |
| [Full screen](duo-fullscreen-landscape.json) | 951 × 669 | 0 / 84 / 34 / 0 |
| [System bars](duo-system-bars-landscape.json) | 951 × 669 | 82 / 84 / 82 / 0 |

Both use landscapeLeft, visible status bar and no home-indicator auto-hide.
System bars means the scanner's navigation bar and toolbar are visible. Exact
timestamps, traits, source and all region records are inside each JSON.

![Full-screen scanner](duo-fullscreen-landscape.png)

![Scanner with system bars](duo-system-bars-landscape.png)

## Checks completed

- Simulator build and generic iOS build (unsigned) succeeded with Xcode 27.1.
- UI checked on inner portrait/landscape and outer portrait/landscape:
  configuration toggles, status-bar changes and export share sheet worked.
- The compact landscape layout was then adjusted to prioritize the report and
  rechecked on the outer 678 × 466 display. Report scrolling through automation
  remains unverified; full values are present in the JSON.
- Ten Node geometry/import tests passed.
- The 13-preset browser smoke passed, including state, overlays and pointer mapping.
- The actual system-bars export was imported in the browser: 951 × 669 and
  safe insets 82 / 84 / 82 / 0 matched; note count survived import.
  Rotation invalidated measured geometry; reselect restored it; an invalid
  schema was rejected without changing the active profile.
- The sample button was checked inside the imported safe-area rectangle.

The screenshot pairs predate the small compact-height layout adjustment; their
inner landscape presentation and captured geometry are unchanged by it.
Physical-device execution, iPad window resizing and pre-27.1 runtime behavior
have not been verified. Build success alone is not physical-device evidence.
