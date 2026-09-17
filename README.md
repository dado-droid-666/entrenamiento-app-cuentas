# Plan 15 Nov — App de entrenamiento (PWA)

App web (PWA) con tu plan de 9 semanas hacia la competencia del **15 de noviembre de 2026**.
Se ve y se usa como una app nativa en iPhone, funciona offline y guarda tu progreso en el telefono.

## Ver en tu computadora (Edge / Chrome) ahora mismo

1. Abre PowerShell en esta carpeta.
2. Corre: `python -m http.server 5500`
3. Abre en Edge: http://localhost:5500/index.html
4. F12 → icono de "Toggle device toolbar" → elige iPhone para ver como se veria en el celular.
5. En Edge tambien puedes hacer clic en el icono **"Instalar esta aplicacion"** (barra de direcciones) para probar la instalacion de escritorio.

Pantallas: **Hoy** (sesion del dia + cuenta regresiva), **Semana** (Lun-Dom navegable), **Plan** (las 9 semanas).
Toca "Empezar sesion" para abrir el reproductor paso a paso con temporizador de descanso en los dias de fuerza.

## Publicarla para poder instalarla en iPhone (Safari)

Safari solo permite "Agregar a inicio" desde una direccion `https://`, no desde un archivo local.
Dos opciones gratis, sin cuenta tecnica complicada:

### Opcion A — Netlify Drop (mas facil, 1 minuto)
1. Entra a https://app.netlify.com/drop desde tu computadora.
2. Arrastra la carpeta **entrenamiento-app** completa a la pagina.
3. Te da una URL como `https://algo-al-azar.netlify.app`. Copiala.

### Opcion B — GitHub Pages
1. Crea un repositorio nuevo en GitHub y sube estos archivos.
2. Settings → Pages → Deploy from branch → main → / (root).
3. Te da una URL como `https://tuusuario.github.io/entrenamiento-app`.

## Instalar en tu iPhone

1. Abre la URL publicada **en Safari** (no en Chrome, no funciona igual).
2. Toca el icono de **Compartir** (cuadrado con flecha hacia arriba).
3. Baja y toca **"Agregar a pantalla de inicio"**.
4. Toca **Agregar**. Aparece el icono "15N" en tu pantalla de inicio.
5. Abrela desde ahi: se abre en pantalla completa, sin barra de Safari, como una app nativa.
6. Despues de la primera visita, funciona **sin internet**.

## Estructura de archivos

```
entrenamiento-app/
  index.html              pantallas + estilos
  app.js                  logica: fechas, navegacion, player, progreso
  data.js                 datos del plan (63 sesiones, 9 semanas)
  manifest.webmanifest     configuracion de instalacion PWA
  sw.js                    service worker (cache offline)
  icons/                   iconos 180 / 192 / 512
```

## Actualizar el plan

Todo el contenido (dias, series, fechas) esta en `data.js`, en el arreglo `SESSIONS`.
Cada sesion tiene `bloques` (los pasos que ves uno a la vez en el reproductor). Editar ese
archivo y volver a publicar (repetir Opcion A o B) actualiza la app para todos los que la
tengan instalada — el service worker revisa la version cada vez que hay internet.

## Notas

- El progreso ("Hecho") se guarda en el navegador de tu iPhone (localStorage), no en un servidor.
  Si borras datos de Safari o cambias de telefono, se pierde.
- Si cambias el plan (menos dias de alberca, otra fecha de competencia, etc.), edita `data.js`
  y `PLAN_START` / `COMPETITION_DATE` al inicio del archivo.
