# Extraction validation, 2026-10-15

- Node26 geometry suite:6 tests passed, covering native bounds/lane ownership,
  rotation/fold axis, inactive divisions, custom-size provenance, immutable
  samples and fit scaling for every preset.
- Browser smoke: all13 presets passed in Chromium at1440×1100 browser size;
  logical dimensions remain independent from zoom; app state survives switches.
- Additional browser assertions: custom viewport clears measured status; pointer
  coordinates invert preview scaling; two preview instances remain independent;
  destroy removes overlays while preserving application DOM.
- Screenshots of inner landscape and tabletop were visually inspected. A clipped
  decorative sample orb in tabletop was corrected and recaptured.
- Skill frontmatter validation passed. Scaffold creation succeeded; a second run
  targeting the same directory refused to overwrite it.
- The original book now imports a vendored copy of device-kit.24 device/scene
  combinations were checked with English locale retained, one overlay owner and
  positive scene bounds. Landscape/tabletop screenshots were inspected. This is
  a focused extraction regression check, not the full prior visual audit.

No new native Simulator, hardware, UIKit, audio, physics or accessibility proof
was performed during this extraction. Existing measurements remain historical.
