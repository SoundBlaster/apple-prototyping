# Geometry provenance and limits

The initial catalog was extracted from an HTML book design lab on 2026-10-15.
Only general framework code and numerical measurements are included; no book art,
audio, text, branding, native engine code or credentials are part of this skill.

Duo measurements were captured on a dedicated iPhone Duo Simulator using a local
UIKit owning-view probe, Xcode 27.1 (27A9275), iOS 27.1 (24A94401), scale 3. The fixture
profile hides the status bar and keeps the home indicator visible. Dimensions
were also compared with user-provided Figma screen frames. The original records
are preserved as JS data in `device-kit/measurements.js` without reinterpretation.

| Profile | Bounds, pt | Safe T / R / B / L |
| --- | --- | --- |
| Inner landscape / vertical fold | 951×669 | 0 / 0 / 34 / 0 |
| Inner portrait / tabletop | 669×951 | 0 / 0 / 34 / 0 |
| Outer portrait | 466×678 | 0 / 84 / 34 / 0 |
| Outer landscape right | 678×466 | 0 / 84 / 34 / 0 |
| Outer landscape left | 678×466 | 0 / 0 / 34 / 84 |

Active tabletop division: `(0,455.5,669,40)`. Active vertical division:
`(455.5,0,40,669)`. Forty points already include the reported margins; don't add
those margins again. Flat layouts may report inactive regions; don't turn them
into layout barriers. Occlusion activation is explicitly synthetic when toggled.

These are historical observations of one environment, not current guaranteed
Apple hardware specifications. Visible system chrome can change safe insets;
embedded native game views can have different bounds. The skill does not model
those combinations as verified measurements. Update data only with new evidence
and record platform, owning view, orientation, chrome visibility and active regions.

Ordinary phone/iPad/window sizes and 1280×1000 large-foldable are authored layout
fixtures, not measured devices. For changed dimensions, the kit clears native
safe insets/regions instead of reusing stale absolute rectangles. A non-flat
unmeasured fixture gets a centered 18 pt division, labeled fixture. That 18 pt is
an illustrative gap, not a measured hinge specification.

The UI should expose `geometry.evidence`, `note` and `simulated` to reviewers.
HTML/CSS does not supply real UIKit safeAreaInsets or reservedRegions; CSS env()
on the desktop browser cannot substitute for the target device geometry.
