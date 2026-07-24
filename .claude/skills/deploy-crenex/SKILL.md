---
name: deploy-crenex
description: Publicar, testear y mantener el sitio estático crenex.io (repo crenex-website-preview) desplegado en Hostinger con auto-deploy vía la branch `build`. Usar cuando haya que cambiar contenido del sitio, verificar el deploy, testear el pipeline o hacer rollback.
---

# Deploy de crenex.io

Sitio **estático** (HTML/CSS/JS, sin build) → Hostinger. Pipeline:
`merge a main → GitHub Action deploy-build.yml → branch build → Hostinger (webhook) → public_html → crenex.io`.
GitHub Pages está apagado. Runbook completo: `docs/deploy-runbook.md`.

## Publicar un cambio
1. Branch feature desde `main`; editar `.html`/`assets`.
2. Si cambian páginas → actualizar `sitemap.xml`/`robots.txt` a mano.
3. PR → merge a `main`. El deploy es automático (~1-2 min).
4. Verificar en `https://crenex.io`.

## Testear el pipeline
- Cambio trivial → merge a main → `gh run watch` → `git log -1 origin/build` → `curl https://crenex.io`.
- Manual: Actions → "Publish to build" → Run workflow.

## Verificación / assessment (siempre en vivo)
```bash
curl -sI https://crenex.io/ | grep -iE 'strict-transport|x-frame|content-security'   # headers
curl -s -o /dev/null -w '%{http_code}\n' https://crenex.io/no-existe-xyz               # 404 (sin trampa SPA)
curl -s https://crenex.io/ | grep -o 'index,follow\|noindex'                           # index,follow en prod
curl -s -o /dev/null -w '%{http_code}\n' https://crenex.io/docs/deploy-runbook.md      # 404 (docs no se filtra)
```

## Reglas duras
- `.htaccess` SIN rewrite SPA (multi-página → si no, soft-404s).
- En producción: `index,follow` (nunca `noindex`).
- Nada interno en `build` (docs/.github/.claude van strippeados por el workflow).
- Deploy key Hostinger = read-only.

## Rollback
`git revert` del commit en `main` → el GHA redeploya el estado anterior. DNS no cambia.
