# Assessment Frontend — crenex-website-preview

> Revisión experta del sitio estático (HTML puro, sin build) que sirve el sitio público de crenex.io.
> Alcance: `*.html` raíz, `blog/*.html`, `assets/` (CSS/JS/fuentes/imágenes), `sitemap.xml`, `robots.txt`, meta tags.

## Resumen ejecutivo

El sitio está **notablemente bien construido para ser HTML manual**: vanilla CSS + vanilla JS sin frameworks ni CDNs externos, sin scripts inline (solo JSON-LD), `<title>`/`meta description` únicos por página, un único `<h1>` por página, `alt` en el 100% de las imágenes, `rel="noopener noreferrer"` ya presente en todos los `target="_blank"`, canonical en todas las páginas, y datos estructurados sólidos en home y blog. La base técnica es limpia y ligera.

Los problemas se concentran en tres frentes:

1. **Bloqueo de indexación (P0):** las 20 páginas llevan `meta robots = noindex,follow`. Correcto para un preview, pero es un **bloqueador absoluto de posicionamiento** que debe removerse al pasar a producción en crenex.io. Además el `sitemap.xml` lista esas mismas URLs como indexables → contradicción.
2. **Inconsistencia de dominio en URLs absolutas (P1):** OG/Twitter usaban `bookacorner-dev.github.io` mientras canonical y blog usan `crenex.io`. El `action`/`_next` del formulario apuntan a GitHub Pages. Hay que unificar todo a `crenex.io` en la migración.
3. **Mantenibilidad y performance (P1):** header/nav/footer están **duplicados a mano en las 20 páginas** (sin partials, al no haber build), los screenshots del producto son PNG pesados (dashboard.png 408 KB, LCP del home), y el CSS de 156 KB no está minificado.

Sin build ni servidor propio configurable, las **cabeceras de seguridad HTTP** (CSP, HSTS, etc.) no se pueden fijar desde el HTML y quedan como acción a nivel de hosting/CDN (fuera del alcance de este repo, documentado abajo).

### Tabla de prioridades

| # | Prioridad | Dimensión | Hallazgo |
|---|-----------|-----------|----------|
| 1 | P0 | SEO | `noindex` en las 20 páginas bloquea indexación en producción |
| 2 | P0 | Seguridad | Sin cabeceras de seguridad HTTP (CSP/HSTS/X-Frame-Options/etc.) |
| 3 | P1 | SEO/Infra | OG/Twitter en dominio `github.io` (corregido) + `_next`/`action` del form en `github.io` |
| 4 | P1 | Arquitectura | Header/nav/footer duplicados a mano en 20 archivos |
| 5 | P1 | Performance | Screenshots PNG pesados (hasta 408 KB); LCP del home es PNG sin webp/avif |
| 6 | P1 | Seguridad | Formulario en `formsubmit.co` con email en claro; sin validación server propia |
| 7 | P2 | SEO | `sitemap.xml` contradice `noindex`; falta JSON-LD en 10 páginas de producto/legales |
| 8 | P2 | Performance | CSS 156 KB y JS 12 KB sin minificar; CSS render-blocking |
| 9 | P2 | SEO/PWA | Falta `apple-touch-icon` y `manifest`; `og:image:width/height` solo en home |
| 10 | P2 | Arquitectura | `changefreq/priority` en sitemap poco realistas; sin proceso de generación |

---

## 1. Seguridad Frontend

### P0 — Ausencia total de cabeceras de seguridad HTTP
- **Problema:** no hay CSP, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ni `Permissions-Policy`. No existe ningún `<meta http-equiv>` en el sitio. Al ser estático servido por GitHub Pages/Hostinger, estas cabeceras no se envían por defecto.
- **Impacto:** exposición a clickjacking (sin `X-Frame-Options`/`frame-ancestors`), MIME-sniffing, degradación a HTTP y fuga de `Referer`. Es el hallazgo de seguridad de mayor severidad.
- **Recomendación:** configurarlas en el hosting/CDN (Hostinger, Cloudflare o `_headers`/regla equivalente). Set base sugerido:
  - `Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; form-action 'self' https://formsubmit.co; frame-ancestors 'none'; base-uri 'self'`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `X-Frame-Options: DENY` · `Permissions-Policy: geolocation=(), camera=(), microphone=()`
  - Nota: el CSS usa estilos inline (`style="..."`) en varias páginas, por eso `style-src` requiere `'unsafe-inline'` salvo que se migren a clases. No aplicable como `<meta>` sin riesgo de romper el render; hacerlo a nivel de servidor. **Fuera del alcance de este repo** (no se toca deploy), se deja como acción para infra.

### P1 — Formulario de demo en tercero (`formsubmit.co`) con email en claro
- **Problema:** `demo.html` postea a `https://formsubmit.co/gaston@crenex.io`. El email de destino queda **en claro en el HTML** (harvesting de spam) y los datos del lead pasan por un tercero. El `_next` redirige a `bookacorner-dev.github.io/...`.
- **Impacto:** exposición del email a bots, dependencia de un tercero sin DPA claro para datos personales (GDPR — la empresa es española), y redirección post-submit rota fuera del preview.
- **Recomendación:** usar el endpoint **hasheado** de FormSubmit (`formsubmit.co/{hash}`) para no exponer el email, o migrar a un handler propio/serverless. Actualizar `_next` a `https://crenex.io/demo.html?submitted=1` en la migración. Mantener el honeypot `_honey` (ya presente, correcto). Confirmar aviso GDPR (ya hay link a Privacy Policy, bien).

### Positivo (sin acción)
- **Sin scripts externos ni CDNs:** el único JS es `assets/js/app.js` local; no hay `<script src>` a terceros → **no se requiere SRI**. No hay JS inline (solo `application/ld+json`).
- **Sin mixed-content, sin secretos/keys** embebidos en HTML/JS.
- **`target="_blank"` seguro:** los 9 enlaces externos (en artículos de blog) ya llevan `rel="noopener noreferrer"`.
- El `iframe`-freezing en `app.js` deshabilita interacción en previews embebidos (bien).

---

## 2. Arquitectura

### P1 — Duplicación de header/nav/footer en 20 archivos
- **Problema:** el `<header>`, `<nav>` (7 links + CTA) y el `<footer>` (3 columnas) están copiados literalmente en cada una de las 20 páginas. Sin build no hay partials/includes.
- **Impacto:** cualquier cambio de navegación, link legal o copyright exige editar 20 archivos → alto riesgo de divergencia (p. ej. la nav de `demo.html` ya difiere levemente de `index.html`: CTA a `#demo-form` vs `demo.html`).
- **Recomendación:** introducir un generador estático mínimo (Eleventy/Astro/Nunjucks) o, sin build, un pequeño script Node que inyecte partials en el HTML antes del deploy. Como paso intermedio sin build, extraer header/footer a un include vía snippet de build en CI. **No aplicado** (cambio estructural mayor).

### P2 — Assets bien organizados; convenciones consistentes
- **Positivo:** `assets/{brand,css,fonts,js,logos,people,screens,blog}` está limpio y coherente. Nomenclatura de archivos consistente. CSS con 477 custom properties (design tokens) — buena base de sistema de diseño.
- **Recomendación menor:** documentar en README la convención de assets y el flujo de publicación (hoy el README es mínimo).

### P2 — URLs con `.html` (clave para migración)
- **Problema:** todas las URLs internas y del sitemap usan extensión `.html`. En la migración desde crenex-landing conviene decidir **URLs limpias** (`/platform` en vez de `/platform.html`).
- **Impacto:** si se cambia el esquema después de indexar, hace falta 301 masivos.
- **Recomendación:** decidir el esquema **antes** de quitar `noindex`. Si se van a URLs limpias, configurar rewrites en el hosting y actualizar canonical/sitemap/links de una vez. **No aplicado** (decisión de migración/infra).

---

## 3. SEO / Posicionamiento

### P0 — `noindex` en las 20 páginas
- **Problema:** todas llevan `<meta name="robots" content="noindex,follow,max-image-preview:large">`.
- **Impacto:** **el sitio no se indexará**. Correcto mientras es preview en `github.io`; es un bloqueador total en cuanto se publique en crenex.io.
- **Recomendación:** al migrar a producción, cambiar a `index,follow,max-image-preview:large` (o simplemente eliminar el `noindex`). Coordinar con el punto de URLs limpias. **No aplicado** (podría ser intencional para el preview actual; es una decisión de go-live, no un quick-win seguro).

### P1 — Dominio inconsistente en URLs absolutas (parcialmente corregido)
- **Problema:** OG/Twitter `image` de las 13 páginas raíz apuntaban a `bookacorner-dev.github.io/...` mientras canonical (20/20) y OG del blog (6/6) usan `crenex.io`.
- **Impacto:** tarjetas sociales inconsistentes y señales de dominio mezcladas.
- **Acción aplicada:** se estandarizó `og:image` y `twitter:image` a `https://crenex.io/assets/brand/crenex-social-card.jpg` en las 13 páginas raíz, alineándolas con canonical y con el blog (26 ocurrencias). El `_next`/`action` del formulario a `github.io` se **dejó intacto** (es funcional en el preview) y se documenta como pendiente de migración.

### P2 — `sitemap.xml` contradice `noindex`
- **Problema:** el sitemap lista las 20 URLs como indexables (con `priority`/`changefreq`) mientras el meta dice `noindex`. Señal contradictoria para crawlers.
- **Impacto:** menor mientras es preview; resolver al go-live junto con el `noindex`.
- **Recomendación:** al quitar `noindex` el conflicto desaparece. Revisar además `changefreq: weekly` en home y `priority` muy planos — usar valores realistas o generarlos automáticamente. `<lastmod>` fijo `2026-07-14` en todo: automatizar por fecha de cambio real.

### P2 — JSON-LD ausente en páginas de producto y legales
- **Problema:** tienen datos estructurados: `index` (Organization/WebSite/SoftwareApplication), `blog.html` (CollectionPage/ItemList), `demo` (ContactPage), `roi-calculator` (WebApplication) y los 6 posts (BlogPosting + BreadcrumbList + ImageObject). **No tienen** JSON-LD: `platform`, `workflow`, `listing`, `ai-agent`, `industries`, `customers`, `mri-integration`, `trust`, `privacy-policy`, `terms-and-conditions`.
- **Impacto:** se pierde elegibilidad para rich results y refuerzo de entidad en páginas comerciales clave.
- **Recomendación:** añadir `WebPage` + `BreadcrumbList` a todas, y `Service`/`Product` donde aplique (platform, listing, mri-integration). **No aplicado** (contenido/estructura, no quick-win trivial).

### Positivo (sin acción)
- `<title>` y `meta description` **únicos** en las 20 páginas. Un solo `<h1>` por página. `lang="en"` y `viewport` en 20/20. Canonical en 20/20. `alt` en 124/124 imágenes (30 decorativas con `alt=""` correcto). Breadcrumbs con schema en el blog. No se necesita `hreflang` (sitio monolingüe en inglés).

### P2 — Favicons / manifest
- **Problema:** solo hay favicon SVG (`crenex-mark-electric.svg`). Falta `apple-touch-icon` (PNG 180×180) y `manifest.webmanifest`. `og:image:width/height` solo está en `index`.
- **Recomendación:** añadir PNG 180×180 + manifest para PWA/pinned tabs y `og:image:width/height` (1200×630) al resto de páginas. **No aplicado** (requiere generar assets PNG que no existen en el repo).

---

## 4. Optimización / Performance

### P1 — Screenshots del producto en PNG pesado (impacto LCP)
- **Problema:** `assets/screens/*.png` pesan 188–408 KB (`dashboard.png` 408 KB). `dashboard.png` es el **LCP del home** (`fetchpriority="high"`). Los logos de partners también son PNG (ISPT 112 KB).
- **Impacto:** LCP alto y transferencia elevada; el resto del blog ya usa webp, pero los screens no.
- **Recomendación:** convertir screens y logos PNG a **webp/avif** (ahorro típico 60–80%) y servir `srcset` responsive. Mantener `width/height` (ya presentes → buen CLS). **No aplicado** (requiere reprocesar binarios).

### P2 — CSS/JS sin minificar; CSS render-blocking
- **Problema:** `styles.css` 156 KB / 2033 líneas sin minificar, cargado de forma bloqueante en `<head>`. `app.js` 12 KB sin minificar.
- **Impacto:** render-blocking y bytes evitables en el critical path.
- **Recomendación:** minificar en un paso de publicación (ahorro ~20–30%). Opcional: inline del critical CSS y carga diferida del resto. **No aplicado** (necesita paso de build).

### Positivo (sin acción)
- Fuentes locales `woff2` con `preload` (geist + space-grotesk) y `font-display` en los 3 `@font-face` → sin FOIT, sin FOUT largo, sin llamada a Google Fonts.
- `loading="lazy"` en 53 imágenes; `decoding="async"` extendido; LCP con `fetchpriority="high"`. `width/height` en las imágenes → CLS controlado.
- Sin librerías pesadas: JS total ~12 KB. Buen presupuesto de INP (interacciones simples: nav, tabs, ROI, filtros de blog).
- **Caching:** definir `Cache-Control` de larga duración para `assets/` (immutable) a nivel hosting — fuera del repo, se documenta.

---

## 5. Módulos / Librerías / Estilos

- **Librerías:** **ninguna externa.** Sin Tailwind/Bootstrap/jQuery/React, sin `@import` ni `url(http...)` en el CSS. Todo vanilla. Es una decisión acertada para un sitio de marketing: mínimo peso y máxima control.
- **Enfoque CSS:** un único `styles.css` con **477 custom properties** (tokens de color, espaciado, tipografía) → buena base de design system. Consistencia alta entre páginas.
- **JS:** un único `app.js` con IIFE, sin dependencias, responsabilidades claras (nav accesible con `inert`, freezing de iframes de preview, tour de tabs, calculadora ROI, filtros de blog, estado del form). Código limpio y accesible (usa `aria-*`, `role=status`, `aria-live`).
- **CSS/JS sin uso:** el CSS es monolítico (156 KB) y probablemente incluye reglas para componentes no usados en todas las páginas; sin herramienta de build no hay tree-shaking. **Recomendación:** auditar con PurgeCSS/coverage en un paso de build y minificar. **No aplicado.**
- **Peso total:** `assets/` ~4 MB, dominado por PNG de screens; ver punto de conversión a webp.

---

## Anexo — Cambios aplicados en este PR (quick-wins seguros)

- **OG/Twitter image → `crenex.io`:** se reemplazó `bookacorner-dev.github.io/crenex-website-preview/assets/brand/crenex-social-card.jpg` por `https://crenex.io/assets/brand/crenex-social-card.jpg` en `og:image` y `twitter:image` de las 13 páginas raíz (26 ocurrencias), alineándolas con el canonical (ya en `crenex.io`) y con las páginas de blog. El `_next`/`action` del formulario de demo se dejó **sin tocar** (funcional en el preview; pendiente de migración).
- **Sin cambios de diseño, contenido ni estructura.** El resto de hallazgos queda como recomendación priorizada, no aplicado, según lo pactado.
