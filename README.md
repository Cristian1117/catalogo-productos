# 🛍️ Catálogo digital con pedidos por WhatsApp

Tienda en línea sencilla para mostrar productos por categorías, con banners promocionales y un botón **“Pedir por WhatsApp”** en cada producto. Incluye un **panel administrativo** para gestionar todo y **control de stock**.

## Qué incluye

**Tienda (página principal `/`)**
- Banners promocionales en carrusel (automático, flechas, puntos y deslizar con el dedo).
- Productos agrupados por categoría, sección de ⭐ Destacados, buscador y filtro por categoría.
- Cada producto: imagen, nombre, descripción, precio en pesos (`$25.000`) y botón de WhatsApp con mensaje prellenado (producto, precio y enlace).
- Stock: si el producto llega a 0 aparece **“Agotado”** y el botón de WhatsApp se desactiva; si está en o por debajo del mínimo aparece **“¡Últimas unidades!”**.
- Botón flotante de WhatsApp general. Diseño pensado primero para celular.

**Panel administrativo (`/admin`, con contraseña)**
- **Resumen:** totales, alertas de stock bajo/agotados con ajuste rápido.
- **Productos:** crear, editar, eliminar; imagen, precio, categoría, visible/oculto, destacado, stock y mínimo de alerta. Botones **− / +** y campo para fijar la cantidad directamente. Filtros: stock bajo, agotados, bajo o agotado, categoría y búsqueda.
- **Categorías:** crear, renombrar, ordenar, activar/desactivar, eliminar.
- **Banners:** subir imagen, título, subtítulo, orden, activo, y enlace a una categoría, un producto o una URL.
- **Ajustes:** nombre de la tienda, eslogan, logo, número de WhatsApp, mensaje por defecto (variables `{tienda} {producto} {precio} {categoria} {link}`), mínimo de stock por defecto y si se muestra la cantidad restante.

Tecnología: Node.js + Express + SQLite (better-sqlite3) + multer (imágenes en `uploads/`) + Tailwind (CDN). Sin compilación.

## Cómo ejecutarlo en tu computador

Requisitos: [Node.js](https://nodejs.org) 18 o superior.

```bash
cd catalogo
npm install
cp .env.example .env      # en Windows: copy .env.example .env
# Edita .env y pon tu propia ADMIN_PASSWORD y una SESSION_SECRET larga
npm start
```

- Tienda: http://localhost:3000
- Panel: http://localhost:3000/admin

La primera vez se cargan datos de demostración automáticamente. Para reiniciarlos: `npm run seed -- --force` (¡borra todo lo que hayas creado!).

### Variables de entorno (`.env`)
| Variable | Para qué sirve |
|---|---|
| `ADMIN_PASSWORD` | Contraseña del panel (obligatoria) |
| `SESSION_SECRET` | Cadena larga aleatoria para firmar la sesión |
| `PORT` | Puerto (por defecto 3000) |
| `BASE_URL` | URL pública, p. ej. `https://mitienda.com`, para el enlace que va en el mensaje de WhatsApp |
| `DATA_DIR` / `UPLOAD_DIR` | Carpeta de la base de datos y de las imágenes (útil con discos persistentes) |

## Publicarlo en internet

> ⚠️ La base de datos (`data/`) y las imágenes (`uploads/`) son archivos locales. En el hosting necesitas un **disco persistente**, si no se borran en cada despliegue.

### Opción 1: Railway
1. Sube el proyecto a GitHub.
2. En Railway: *New Project → Deploy from GitHub*.
3. Agrega un **Volume** montado en `/data` y define las variables: `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATA_DIR=/data/db`, `UPLOAD_DIR=/data/uploads`, `BASE_URL=https://tu-app.up.railway.app`.
4. Comando de inicio: `npm start`.

### Opción 2: Render
1. *New → Web Service* desde tu repositorio. Build: `npm install` · Start: `npm start`.
2. Agrega un **Persistent Disk** (plan pago) montado en `/var/data` y define `DATA_DIR=/var/data/db`, `UPLOAD_DIR=/var/data/uploads`, además de `ADMIN_PASSWORD`, `SESSION_SECRET` y `BASE_URL`.

### Opción 3: Servidor propio (VPS Ubuntu)
```bash
sudo apt install -y nodejs npm nginx
git clone <tu-repo> catalogo && cd catalogo && npm install
cp .env.example .env && nano .env
sudo npm i -g pm2 && pm2 start server.js --name catalogo && pm2 save && pm2 startup
```
Luego configura Nginx como proxy hacia `http://localhost:3000` y activa HTTPS con `certbot --nginx`. En Nginx sube el límite de archivos: `client_max_body_size 6M;`.

**Copias de seguridad:** basta con guardar las carpetas `data/` y `uploads/`.

## Consejos
- Número de WhatsApp en formato internacional, sin `+` ni espacios: Colombia = `57` + celular (ej. `573001234567`).
- Imágenes recomendadas: productos cuadrados (800×800 px), banners 1600×600 px. Máximo 5 MB (JPG, PNG, WEBP o GIF).
- El stock **no se descuenta solo**: el pedido se cierra por WhatsApp, así que cuando vendas ajusta la cantidad con **−** en el panel.

## Pruebas automáticas y capturas
Con el servidor corriendo: `npm run screenshots` (usa Playwright; la primera vez ejecuta `npx playwright install chromium`). Crea una categoría, un producto y un banner desde el panel, verifica la tienda y el enlace de WhatsApp, y guarda capturas en `screenshots/`.
