# Obrenna Releases

Public download artifacts for **Obrenna Desktop** and **Obrenna-Server**.
Source code lives in the private `En-login-inc/Obrenna`, `En-login-inc/Obrenna-Server`
and `En-login-inc/obrenna-site` repositories; this repo exists only so installers
and bundles can be downloaded anonymously.

## What is published

| Tag pattern | Assets | Consumed by |
|---|---|---|
| `server-vX.Y.Z` | `obrenna-server.tar.gz`, `obrenna-server.tar.gz.sha256` | `https://obrenna.com/install/obrenna-server.tar.gz` (redirects here) |
| `desktop-vX.Y.Z` | platform installers + `desktop-latest.json` | `https://obrenna.com/api/releases/desktop/latest` (reads the manifest) |

`desktop-latest.json` shape:

```json
{
  "version": "0.1.0",
  "published_at": "2026-11-26T00:00:00Z",
  "assets": [
    { "os": "windows", "url": "https://github.com/.../Obrenna_0.1.0_x64-setup.exe", "checksum_sha256": "..." }
  ]
}
```

The download page only offers an asset when its checksum is present.

## Publishing

Requires the `gh` CLI authenticated with write access to this repo.

```pwsh
# Server bundle (built by obrenna-site: npm run bundle:server)
node publish.mjs --tag server-v0.1.0 --title "Obrenna-Server 0.1.0" `
  --assets ..\obreanna-site\public\install\obrenna-server.tar.gz ..\obreanna-site\public\install\obrenna-server.tar.gz.sha256

# Desktop installers (from CI artifacts or a local tauri build)
node publish.mjs --tag desktop-v0.1.0 --title "Obrenna Desktop 0.1.0" --desktop `
  --assets Obrenna_0.1.0_x64-setup.exe Obrenna_0.1.0_x64.dmg Obrenna_0.1.0_amd64.AppImage
```

`--desktop` computes SHA-256 per installer, uploads them, then generates and
uploads `desktop-latest.json` pointing at the uploaded asset URLs.

## Notes

- Pilot builds are **unsigned**; the download page documents the SmartScreen /
  Gatekeeper steps. Signing and the in-app updater are tracked in the source repos.
- Never publish source code, secrets, or user data here — artifacts only.