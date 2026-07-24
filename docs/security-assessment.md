# Security assessment — crenex.io

- **Alcance:** sitio estático `crenex.io` (Hostinger), repo `crenex-website-preview`.
- **Metodología:** verificación **en vivo por HTTP** (headers, códigos de respuesta, checks de fuga) + revisión del `.htaccess` y del pipeline de deploy.
- **Corte:** 2026-07-24. Reproducible con los comandos del final.

## Resumen

Postura **fuerte** (nivel A/A+ en securityheaders.com): TLS con HTTPS forzado + HSTS, set completo de cabeceras de seguridad, sin fuga de archivos internos, y el pipeline de deploy strippea material no publicable. **1 hallazgo abierto (P3)** y 2 mejoras menores.

## Verificado en vivo (2026-07-24)

| Control | Resultado |
| --- | --- |
| Cabeceras de seguridad | ✅ CSP · HSTS (1y, includeSubDomains) · X-Frame-Options: DENY · X-Content-Type-Options: nosniff · Referrer-Policy · Permissions-Policy |
| HTTP → HTTPS | ✅ 301 |
| Rewrite SPA residual (soft-404) | ✅ eliminado — `/ruta-inexistente` → **404** propio |
| Indexación | ✅ `index,follow` (sin `noindex` en prod) |
| Fuga de `docs/` interno | ✅ `/docs/*` → 404 (strippeado del `build`) |
| Fuga de `README.md` | ✅ 404 |
| Fuga de `.git/` | ✅ `/.git/config` → 403 |
| `.htaccess` legible | ✅ 403 (protegido) |
| Directory listing | ✅ deshabilitado (403 en dirs) |

## Hallazgos

| ID | Sev | Estado | Descripción | Acción |
| --- | --- | --- | --- | --- |
| SEC-1 | P3 | **Abierto** | Email `formsubmit.co/gaston@crenex.io` en claro en `demo.html` → harvesting de spam | PR: endpoint hasheado de FormSubmit (`formsubmit.co/{hash}`) — requiere el hash de la cuenta |
| SEC-2 | Bajo | Aceptado / mejora | CSP con `'unsafe-inline'` en `style-src` (por estilos inline del sitio) | PR: migrar estilos inline → clases CSS y quitar `'unsafe-inline'` |
| SEC-3 | Info | Mejora | HSTS sin `preload` | PR: sumar `preload` al header + registrar el dominio en hstspreload.org |

> `script-src` está en `'self'` (sin `unsafe-inline`/`unsafe-eval`) — el vector más importante ya está cerrado. `'unsafe-inline'` acotado a estilos es de bajo riesgo.

## Higiene del deploy (defensa en profundidad)

- El pipeline (`.github/workflows/deploy-build.yml`) **strippea** `docs/`, `.github/`, `.claude/`, `README.md` del bundle publicado → material interno nunca llega a `public_html`.
- Deploy key de Hostinger = **read-only**.
- Ver `docs/deploy-runbook.md` para el flujo completo y rollback.

## Cómo re-verificar (copiar-pegar)

```bash
U=https://crenex.io
curl -sI $U/ | grep -iE 'strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy|content-security'
curl -s -o /dev/null -w 'noexiste %{http_code}\n' $U/no-existe-xyz-123        # 404
curl -s $U/ | grep -o 'index,follow\|noindex'                                  # index,follow
for f in docs/security-assessment.md README.md .git/config .htaccess; do
  curl -s -o /dev/null -w "$f %{http_code}\n" "$U/$f"                          # 404/403
done
curl -s -o /dev/null -w 'http %{http_code} -> %{redirect_url}\n' http://crenex.io/  # 301
```

## Referencias

- OWASP Secure Headers — https://owasp.org/www-project-secure-headers/
- Mozilla Observatory / securityheaders.com para scoring externo.
- FormSubmit (endpoint hasheado) — https://formsubmit.co/
- HSTS preload — https://hstspreload.org/
