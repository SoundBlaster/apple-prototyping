# Collect native geometry

Requires Node.js 20+. Device collection additionally needs macOS, Xcode tools and
a paired device with the scanner installed. Select its exact identifier; never
silently substitute a simulator or another phone.

From this repository:

```sh
npm run collect -- --device YOUR_DEVICE_UDID \
  --output skills/apple-device-prototyping/assets/starter/captures
```

From an installed skill, run `node scripts/collect.mjs` with the same arguments.
For an existing prototype, point `--output` at its `captures` directory. The CLI
does not install, launch, rotate, or delete anything on the device. It downloads
the scanner's Documents through `xcrun devicectl device copy from`; Bonjour or an
app HTTP server is not required. Tap Export on the device for each desired mode
and orientation, then collect again. `latest.json` is deliberately excluded:
explicit exports have stable identities and optional paired screenshots.

Already-downloaded export folders can be collected offline:

```sh
npm run collect -- --input /path/to/exports --output /path/to/prototype/captures
```

All `.json` files except `latest.json` and `catalog.json` are treated as captures;
each optional PNG must share its basename. A missing PNG is reported but does
not discard valid geometry. Invalid JSON, mismatched PNG dimensions, conflicting
capture IDs or corrupt existing objects abort the update. A later collection can
attach a previously missing screenshot. Device-copy failure leaves the catalog
unchanged. The CLI requires exactly one input source and an explicit output.

PNG validation checks every chunk's boundary/CRC, the terminal IEND, the compressed
image stream, scanline size and filter bytes. Supported screenshots are static,
noninterlaced RGB/RGBA at 8 or 16 bits (the UIKit exports verified here); other
encodings are rejected explicitly. Limits are 25 MiB encoded and 128 MiB decoded.

## Storage contract

`catalog.json` has `schemaVersion: 1` and a `profiles` array. Each profile contains:

- `key`: SHA-256 of canonical validated capture data excluding `id`/`capturedAt`.
- `capture`: the latest observation's capture, including source and configuration.
- `observations`: `{id, capturedAt, json, screenshot}` records; screenshot may be null.

Equal measurements become one profile while retaining distinct export records.
Changes to OS, configuration, traits, bounds, safe area or regions remain separate.
Recollecting identical exports is a no-op. Files live under `objects/<sha256>.json`
and `.png`; names never use user-provided IDs. Hashes identify content, not device
attestation. Profiles still carry the scanner's declared source.

The manifest is replaced atomically after validation and writing its assets. A
`.collect.lock` prevents overlapping writers; an interrupted process may leave
the lock and unreferenced objects. Confirm no collector is running before
removing a stale lock. The collector does not prune old observations or files.
Keep the complete directory together when serving or sharing the prototype.
Review exported screenshots before publishing them. The starter's local captures
directory is git-ignored; intentionally shared evidence belongs in a reviewed PR.

## Use in the playground

The starter fetches `./captures/catalog.json` on startup with caching disabled.
After collecting, click **Refresh catalog**; filter by device/OS, orientation and
mode, then **Use measurement**. **Measurement evidence** links to the representative
JSON and PNG and shows its capture time, target, traits and observation count.
The latest timestamp within each profile supplies that representative screenshot;
all observations remain in the catalog. A missing PNG leaves the JSON available.

The selection survives reload. Manual JSON imports also persist in localStorage
(up to 100 captures, scoped by URL path), with a session-only fallback when
storage is unavailable. Browser storage is not the portable catalog: copy the
whole `captures` directory to share measured profiles with another browser or
host. The browser never writes back to it. Resize/rotation invalidates measured
status; selecting the original profile restores it. Failed refreshes retain the
currently loaded catalog and application state.
