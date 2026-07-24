# Deploy runbook — crenex.io (sitio estático en Hostinger)

## Arquitectura del deploy

```
merge a main → GitHub Action (deploy-build.yml) → branch `build` → Hostinger (webhook) → public_html → crenex.io
```

- **Repo:** `bookacorner-dev/crenex-website-preview` — HTML estático, **sin build step**.
- **`main`** = source of truth (incluye `docs/`, `.github/`, `.claude/`, `README.md`).
- **GHA `deploy-build.yml`:** en cada push a `main`, espeja el sitio a la branch **`build`**, strippeando lo que NO debe ser público (`docs/`, `.github/`, `.claude/`, `README.md`).
- **Hostinger:** Git deploy conectado a la branch **`build`**, dir `public_html`, con deploy key read-only + webhook (auto-deploy en cada push a `build`).
- **GitHub Pages:** apagado — Hostinger es producción.

## Publicar un cambio

1. Branch feature desde `main`; editás los `.html` / `assets`.
2. Si agregás/quitás/renombrás una página → actualizá **`sitemap.xml`** (y `robots.txt` si corresponde) a mano.
3. PR → merge a `main`.
4. El GHA corre solo → actualiza `build` → Hostinger pulea → **live en ~1-2 min**.
5. Verificar en `https://crenex.io`.

## Cómo TESTEAR el flujo (end-to-end)

```bash
# 1) cambio trivial visible
git checkout -b test/flujo main
# editar, por ej, un texto en index.html
git commit -am "test: verificar pipeline de deploy" && git push -u origin test/flujo
gh pr create --fill && gh pr merge --squash --delete-branch

# 2) ver la Action correr
gh run watch                    # o pestaña Actions

# 3) confirmar que build se actualizó
git fetch origin && git log -1 origin/build --format='%ci %s'

# 4) confirmar que Hostinger deployó (esperar ~1-2 min)
curl -s https://crenex.io/ | grep "el texto que cambiaste"
```
Manual sin merge: **Actions → "Publish to build" → Run workflow** (`workflow_dispatch`).

> Si el paso 4 no refleja el cambio: revisá que el **webhook/auto-deployment** esté activo en hPanel → crenex.io → Git. Si no, en hPanel hay un botón "Deploy" para pullear a mano.

## Reglas / gotchas (no romper)

- El **`.htaccess` NO lleva rewrite tipo SPA** — es un sitio multi-página; un rewrite `→ index.html` genera soft-404s (malos para SEO). Ver headers de seguridad en el `.htaccess`.
- **`noindex` solo en preview.** En producción = `index,follow`.
- **Nada sensible en el `build`:** el workflow ya strippea `docs/`/`.github/`/`.claude/`/`README`. Si agregás carpetas nuevas con material interno, sumalas al `--exclude` del workflow.
- **Deploy key de Hostinger = read-only.** El push a `build` lo hace la Action, no Hostinger.

## Rollback

- **Rápido:** revertí el commit en `main` (`git revert`) → el GHA redeploya el estado anterior.
- **Manual:** Hostinger File Manager → restaurar backup de `public_html`.
- El DNS nunca cambia (crenex.io ya apunta a Hostinger) → el rollback es de contenido, inmediato.

## Setup inicial (referencia — ya hecho)

1. Deploy key `hostinger` (read-only) en el repo (Settings → Deploy keys).
2. hPanel → crenex.io → Git: `git@github.com:bookacorner-dev/crenex-website-preview.git`, branch `build`, dir `public_html`, auto-deploy ON.
3. GitHub Pages → None.

## Pendientes conocidos

- Email `formsubmit.co/gaston@crenex.io` expuesto en `demo.html` → migrar a endpoint hasheado de FormSubmit (P3).

---

## Instrucciones para ChatGPT / otro LLM (copiar-pegar como contexto)

> Sos un asistente de DevOps ayudando a mantener **crenex.io**, un sitio web **estático** (HTML/CSS/JS, sin build) en el repo `bookacorner-dev/crenex-website-preview`.
> **Deploy:** cada push/merge a `main` dispara una GitHub Action (`.github/workflows/deploy-build.yml`) que espeja el sitio (sin `docs/`, `.github/`, `.claude/`, `README.md`) a la branch **`build`**. Hostinger tiene un Git deploy conectado a `build` que publica a `public_html` por webhook. GitHub Pages está apagado.
> **Para publicar un cambio:** branch desde main → editar HTML/assets → si cambian páginas, actualizar `sitemap.xml`/`robots.txt` a mano → PR → merge a main. El deploy es automático (~1-2 min).
> **Reglas:** el `.htaccess` NO debe tener rewrite SPA (es multi-página); en producción las páginas van con `index,follow` (nunca `noindex`); nunca poner material interno en el `build` (docs va strippeado); la deploy key de Hostinger es read-only.
> **Rollback:** `git revert` en main → redeploy automático. **Verificar** siempre en `https://crenex.io` con `curl -sI` (headers) y navegando las páginas.
