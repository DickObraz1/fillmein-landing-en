# FILL ME IN landing page

Landing page pro omalovánku `FILL ME IN gay coloring book` s jednoduchým backendem pro editaci textů.

## Spuštění

```bash
npm start
```

Když je port `4173` obsazený, spusť jiný port:

```bash
env PORT=4174 npm start
```

Web:

```text
http://localhost:4173/
```

Editor textů:

```text
http://localhost:4173/admin.html
```

Texty se ukládají do `content.json`.

## Ostrý web na subdoméně

Doporučené nasazení pro `fillmein.dickobraz.cz`:

1. Nahraj projekt na Node hosting, například Render, Railway, Fly.io nebo VPS.
2. Nastav env proměnné:

```text
NODE_ENV=production
ADMIN_USER=admin
ADMIN_PASSWORD=nějaké-silné-heslo
```

3. V DNS domény `dickobraz.cz` přidej záznam pro subdoménu `fillmein`.
   Hosting ti dá cílovou hodnotu, typicky CNAME nebo A záznam.
4. V hostingu přidej custom domain:

```text
fillmein.dickobraz.cz
```

5. Po aktivaci SSL bude web dostupný na:

```text
https://fillmein.dickobraz.cz/
```

Admin bude na:

```text
https://fillmein.dickobraz.cz/admin.html
```

Admin a ukládání textů jsou chráněné přes Basic Auth. Veřejná landing page si texty z `/api/content` jen čte.

## Obrázky

Aktuálně stránka používá:

- `obálka.jpeg`
- `33B606B1-0504-445B-A0E2-0832BC186D0A.png`
- `05050B6F-462C-4B1D-ABF8-38B98CD0E65F.png`
- `bananachestnut1.jpg`
- `faithdesky_1.png`
- `double_trouble_3.png`
- `elcuatroojos.png`
- `Petra_3.jpg`
- `TOMHORYCH_FULL.jpg`

## Instagram carousel

Carousel je připravený jako HTML šablona:

```text
http://localhost:4173/carousel.html
```

Slidy mají rozměr `1080 x 1350 px`. Jsou v souborech:

- `carousel.html`
- `carousel.css`
- `carousel-download.js`

V horní liště nebo nad každým slidem je možné stáhnout slide jako PNG nebo JPG. Součástí jsou i čtvercové promo slidy `1080 x 1080 px` v češtině a angličtině.

## Upgates košík

V editoru textů vyplň `URL košíku Upgates`. Měla by to být URL, která v Upgates vloží konkrétní produkt do košíku a přesměruje zákazníka do košíku.

Pro aktuální produkt:

```text
https://www.dickobraz.cz/p/fill-me-in-gay-coloring-book?addtocart=1&quantity=1&return=cart
```
