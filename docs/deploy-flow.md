# Flujo de deploy — Crenex website preview

Este documento explica cómo se publica este sitio y por qué **no** necesita
el pipeline de CI/CD que usa `crenex-landing`.

## TL;DR

El sitio es **HTML estático final**. Se sirve con **GitHub Pages (modo
clásico)** directamente desde la branch `main`. Cada push a `main` dispara
un deploy automático de Pages: **no hay build, no hace falta ningún workflow
de GitHub Actions**. Para publicar un cambio, alcanza con mergear a `main`.

## Cómo se sirve hoy

Configuración actual de GitHub Pages del repo (`repos/.../pages`):

| Campo          | Valor                                                     |
| -------------- | --------------------------------------------------------- |
| `build_type`   | `legacy` (Pages clásico desde branch, sin Actions)        |
| `source`       | branch `main`, path `/`                                    |
| `status`       | `built`                                                    |
| `html_url`     | `https://bookacorner-dev.github.io/crenex-website-preview/`|
| `cname`        | `null` (sin dominio custom configurado todavía)           |
| `https_enforced` | `true`                                                   |

El archivo `.nojekyll` en la raíz evita el procesamiento Jekyll, de modo que
Pages publica los archivos tal cual (incluidas rutas con `_` o assets que
Jekyll ignoraría).

### Ciclo de publicación

```
commit -> push/merge a main -> GitHub Pages (pages-build-deployment) -> live
```

No interviene ningún paso de compilación ni ninguna branch intermedia.

## Por qué NO se porta el pipeline de crenex-landing

`crenex-landing` es una app **Vite/React** y su `publish.yml` existe por dos
motivos que **no aplican** a este preview:

1. **Tiene un build.** En el landing, el fuente (`src/`, JSX) no es
   desplegable: hay que compilarlo (`vite build`) para generar `dist/`. Acá
   los `.html` del repo ya son el artefacto final; no hay nada que compilar.

2. **Lo consume Hostinger desde una branch `build`.** El workflow del landing
   corre `npm ci` + `npm run build` y espeja `dist/` a la branch `build`
   (con `s0/git-publish-subdir-action`); Hostinger deploya esa branch e
   incluye un `.htaccess` para reescribir rutas (SPA). Este preview **no usa
   Hostinger**: lo sirve GitHub Pages leyendo `main` en directo, así que una
   branch `build` espejo no tendría ningún consumidor.

En resumen, replicar `publish.yml` acá sería copiar un mecanismo sin la
condición que lo justifica (build + hosting externo). Sería redundante y
solo agregaría una branch y un workflow que no cumplen ninguna función.

### Otros elementos del flujo del landing — evaluación

| Elemento del landing            | ¿Se porta? | Motivo                                                                                      |
| ------------------------------- | :--------: | ------------------------------------------------------------------------------------------- |
| `publish.yml` (mirror a `build`)| No         | Pages deploya `main` directo; no hay build ni Hostinger que consuma una branch espejo.      |
| Vite / build de assets          | No         | El sitio ya es HTML/CSS/JS final; no hay etapa de compilación.                               |
| `prerender.js` (SSG)            | No         | El landing prerenderiza una SPA React; acá cada página ya es un `.html` independiente.       |
| `generate-sitemap.js` + Firebase| No         | El generador lee posts de Firestore. Acá `sitemap.xml`/`robots.txt` son chicos y estáticos: se mantienen a mano. |
| ESLint / Prettier               | No (por ahora) | Config pensada para React/JS. Para un puñado de `.html` escritos a mano el costo/beneficio no lo justifica. |

## Cómo publicar un cambio

1. Editar los `.html` / assets necesarios en una branch feature.
2. Si se agrega, elimina o renombra una página, actualizar **a mano**
   `sitemap.xml` (y `robots.txt` si corresponde).
3. Abrir PR contra `main` y mergear.
4. GitHub Pages redeploya solo en segundos. Verificar en la URL de Pages
   (o en el dominio custom, si está configurado).

> Nota: como `main` va directo a producción sin gate, conviene revisar el
> render del cambio en local (o en un fork con Pages) antes de mergear.

## Dominio custom (crenex.io) — pendiente, fuera de alcance de este repo

Hoy `cname` es `null`: el sitio está en la URL `github.io`. `sitemap.xml` y
`robots.txt` ya apuntan a `https://crenex.io`, lo que indica que la intención
es servir ese dominio. Para hacerlo (cuando se decida), sin tocar nada de eso
en este PR:

1. Agregar un archivo `CNAME` en la raíz con `crenex.io`.
2. En Settings -> Pages, setear el dominio custom y esperar la verificación.
3. Configurar en el DNS los registros que pida GitHub Pages (A/ALIAS/CNAME).

Estos pasos tocan configuración de GitHub Pages y DNS, por lo que quedan
**fuera del alcance de este PR** (que es solo documentación).
