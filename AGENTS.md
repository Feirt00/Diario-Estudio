# AGENTS.md - Diario de Estudio

Web estática para registrar sesiones de estudio y motivarse viendo la racha de días seguidos. Proyecto didáctico: el código debe poder entenderlo alguien que empieza a programar.

## Trato
- Llama siempre al usuario por su nombre: **Feirt**. Nada de "usuario" genérico ni otros apodos.
- El nombre del asistente es **Zeirt**. Los dos están en `../Notas de Agente/jarvis-notas.md`: léelos de
  ahí, no los inventes ni los cambies por tu cuenta.

## Stack y estructura
- HTML, CSS y JavaScript puros: sin frameworks, librerías, npm, bundler ni build.
- `index.html` (estructura), `styles.css` (estilos), `app.js` (lógica y datos).
- Debe funcionar abriendo `index.html` con doble clic (`file://`): nada de módulos ES (`type="module"`), `fetch` a archivos locales ni nada que requiera servidor.
- Hay una CSP en `<head>` (`default-src 'self' file:; ...`). El `file:` está porque en `file://` el origen es opaco y `'self'` solo bloquearía el propio `app.js`. Si añades un recurso externo, actualiza la CSP y vuelve a comprobar que la app abre con doble clic.
- los comandos o bn elcodgio tene que tener la siguiente estructura para qeu se vea mas prolijo 
--nombre de la variable 
{
    1 + 1
}

    eso es un ejeplo osea uqe los corche siempre se vean abjo organizados para la sintasis de todo el codiog que hagas.

## Convenciones
- Textos de la interfaz en español.
- Código simple, nombres descriptivos y comentarios solo donde me aporten.
- Diseño limpio y responsive; cualquier pantalla nueva debe verse bien en el móvil.

## Datos
- localStorage guarda la lista de sesiones: array de `{ date: "AAAA-MM-DD", topic, minutes }`.
- **Cada usuario tiene sus propias sesiones**: con sesión iniciada la clave es
  `diario-estudio-sesiones-<usernameKey>` (por ejemplo `diario-estudio-sesiones-ana`); sin cuenta se usa
  la clave global `diario-estudio-sesiones`. El nombre de la clave la calcula `getSessionsKey()`.
- **Migración única**: la primera vez que un usuario entra, si su clave todavía no existe, las sesiones
  que hubiera en la global pasan a su clave y la global queda vacía (`migrateSessionsToUser()`). Así
  nadie pierde lo que tenía registrado y ninguna sesión queda duplicada en las dos claves.
- **Todo lo demás se recalcula desde `loadSessions()`** (racha, mejor racha, total de la semana, lista y
  gráficos), que ya devuelve las sesiones del usuario actual: no hace falta tocar nada más.
- `refreshCurrentUserViews()` repinta todo eso de golpe y la llama Zeirt al arrancar, al iniciar sesión,
  al cerrar sesión y cuando otra pestaña del navegador guarda sesiones.
- Si cambias la forma de los datos, mantén compatibilidad con lo ya guardado o el usuario perderá sus sesiones.
- El contenido del usuario **nunca** se pinta con `innerHTML`: usa `createElement` + `textContent`.
- **Todo lo que lees de `localStorage` se valida antes de usarlo**: puede venir corrupto o manipulado a
  propósito. Patrón del proyecto: `normalizeSession()` filtra lo que no tenga la forma esperada y
  `loadSessions()` nunca lanza. Si añades un dato nuevo, valídalo con el mismo patrón.
- Los errores al leer o guardar se avisan **en la interfaz**, nunca con `alert()` ni solo por consola:
  `saveSessions()` devuelve `{ ok, message }` y el mensaje se pinta en `#form-message`.
- **Nunca llames a `localStorage` directamente**: usa `storageGet()`, `storageSet()` y `storageRemove()`.
  `localStorage` puede lanzar sin avisar (cookies desactivadas, modo privado, cuota llena) y si eso
  pasa en mitad de la app la pantalla se queda en blanco.
- Una sesión con **0 minutos o negativos se descarta** al cargarla: no es estudiar y no puede contar
  para la racha. Los minutos admiten **un decimal** (12.5) y se redondean a una sola cifra.
- **La lista "Sesiones" tiene un filtro visual** (`#lista-filtro`: hoy —por defecto—, última semana,
  último mes o todo el historial). El filtro **solo cambia lo que se pinta** en `updateSessionList()`:
  racha, mejor racha y total de la semana siguen midiéndose con **todo** el historial. El estado vive
  en la variable `listaFiltro`, no en el DOM, para que sobreviva a registrar sesión, al evento
  `storage` y a entrar o salir de cuenta. **Al recargar (F5) vuelve a «Hoy»: es a propósito**, así lo
  decidió Feirt (el rango elegido no se persiste en `localStorage`).

## Pestañas, cronómetro y gráficos
- La app tiene **tres pestañas**: Diario, Cronómetro y Gráficos. Los paneles son `<section class="panel">`
  y se muestran con el atributo `hidden`. Ojo: la regla CSS `.panel { display: block }` gana al
  `[hidden]` del navegador, así que hace falta `.panel[hidden] { display: none }`.
- Todo cambio de pestaña pasa por `showTab(tabName)`. No toggles `hidden` a mano desde otros sitios.
- **Cronómetro**: la cuenta atrás se calcula con la **hora real** (`Date.now()`), nunca con un contador que
  se incrementa: `setInterval` se desvía y en segundo plano se para. Estado en
  `diario-estudio-cronometro` (prefijo `diario-estudio-`).
- El cronómetro **no duplica** la lógica del formulario: registra la sesión con `loadSessions()` +
  `saveSessions()`.
- El aviso al terminar es **sonido con la Web Audio API**, sin archivos de sonido ni descargas.
- **Gráficos**: se dibujan **a mano con SVG** (`createElementNS`). Nada de Chart.js, D3 ni CDN: la app no
  puede depender de la red. Cada SVG con `viewBox` + `width: 100%` para que se vea bien en el móvil.
- Los colores de los gráficos van con **clases CSS** (y su variante `body.dark`), no en línea, para que el
  tema oscuro los pueda cambiar.
- **Gráfico de barras navegable**: enseña una ventana de **7 días** movible con los botones `‹` y `›`
  (`moveChartDays()`), que nunca pasa de hoy. El título (`#chart-dias-titulo`) dice el rango visible y
  cada barra es un `<g class="chart-day" role="button" tabindex="0">` con su `<title>` y `aria-label`.
- **Detalle por día**: al pulsar (o darle a `Enter` en) una barra se abre `#chart-detalle` con los temas
  y minutos de ese día (`renderChartDetail()`); un segundo clic lo cierra. Las variables de la ventana
  son `chartDaysOffset`, `chartSelectedDay` y `chartSessionsKey`; al cambiar de usuario hay que
  llamar a `clearChartDays()`, que es lo que hace `refreshCurrentUserViews()`.
- **El gráfico de pastel tiene filtro** (`#pastel-filtro`: global —por defecto—, hoy, día elegido o
  semana). Las sesiones que ve el pastel las decide `getPastelSessions()`; "día elegido" es el día
  pulsado en el gráfico de barras (`chartSelectedDay`) y, si no hay día, se muestra un aviso en vez de
  un SVG. `renderPastel()` repinta **solo** el gráfico circular: nunca el de barras, para no entrar en
  bucles. La lista "Temas más estudiados" no tiene filtro: sigue siendo global.

## Autenticación (solo local, sin backend)
- No hay servidor ni base de datos: usuarios y sesión viven en `localStorage`.
- Claves: `diario-estudio-usuarios` (array de `{ username, usernameKey, passwordHash, salt, createdAt }`), `diario-estudio-sesion` (sesión activa) y `diario-estudio-login-intentos` (rate limit).
- Las contraseñas se guardan hasheadas, nunca en claro. El hash es **PBKDF2-HMAC-SHA256** con 210.000 iteraciones y **salt aleatorio por usuario** (campo `salt`), vía Web Crypto API. Si `crypto.subtle` no está disponible, se avisa y **no** se cae a un hash débil.
- `hashPassword()`, `registerUser()` y `loginUser()` son **asíncronas**: quien las llama usa `await`.
- Las cuentas anteriores a PBKDF2 (sin `salt`) están **desactivadas**: su hash era FNV-1a de 32 bits,
  que se rompe por colisión, así que no se pueden validar sin abrir ese agujero. `purgeLegacyUsers()`
  las borra al arrancar. **No se pierde nada de lo estudiado**: las sesiones viven en la clave de
  sesiones del usuario, no dentro de la cuenta; solo hay que crear la cuenta otra vez.
- Contraseñas: mínimo 8 caracteres, máximo 128 y lista de contraseñas comunes rechazadas.
- `usernameKey` es el nombre en minúsculas y sin espacios: dos usuarios que solo se diferencian en mayúsculas o espacios son el mismo.
- Login fallido devuelve siempre el mismo mensaje genérico para no revelar qué usuarios existen.
- **El registro tampoco puede revelar nada**: el mensaje (`REGISTER_MESSAGE`) es el mismo si el nombre
  está libre o si ya existe, y el flujo **siempre** acaba pidiendo iniciar sesión. Si el mensaje o el
  comportamiento cambian según exista el nombre, se puede enumerar la lista de usuarios.
- **Ni el tiempo puede delatarlo**: cuando el usuario no existe se calcula un hash "de mentira" con
  el mismo coste, para que el login tarde lo mismo en los dos casos (canal de tiempo).
- La app escucha el evento `storage`: si otra pestaña del navegador guarda sesiones de **este mismo
  usuario** (su clave), esta actualiza sola la lista, los totales y los gráficos. Si cambia la clave de
  sesiones (al entrar o salir de una cuenta), la vista se repinta con `refreshCurrentUserViews()`.
- Rate limit local: 5 intentos fallidos → 30 s de bloqueo en el que **ni un login correcto entra**. El bloqueo vive en `loginUser()`, no en el evento del formulario; se resetea al iniciar sesión.
- La sesión se valida al arrancar (`validateSession()`): si el usuario no existe o el formato es raro, se borra y se sigue sin sesión.
- La app **no** está protegida: se puede usar sin iniciar sesión. El login solo identifica al usuario.
- Las validaciones viven en `registerUser()` / `loginUser()`, que devuelven `{ ok, message }` y nunca lanzan errores. Quien llama solo muestra el mensaje.

### Limitaciones aceptadas (sin backend no hay arreglo real)
No las maquilles con seguridad falsa: documéntalas y ya está.
- El rate limit vive en `localStorage`: se puede resetear borrando `diario-estudio-login-intentos` y no cubre otros navegadores.
- La sesión no se puede firmar: sin servidor, suplantar a un usuario **que sí existe** sigue siendo posible.
- La sesión no caduca y la app no está protegida: el login identifica, no bloquea.

## Fechas y racha (fácil equivocarse)
- Trabaja siempre con la fecha local del usuario. Nunca uses `toISOString()` ni `new Date("AAAA-MM-DD")`: se interpretan en UTC y desplazan el día.
- Racha = días consecutivos con al menos 1 sesión que terminan hoy. Si hoy no hay sesión pero ayer sí, la racha sigue viva y se cuenta desde ayer.
- Varias sesiones el mismo día cuentan como un solo día. Las fechas futuras no suman.
- Mejor racha = longitud máxima de días consecutivos con al menos 1 sesión en cualquier periodo del historial. Se deduplican sesiones del mismo día (cuenta 1 día), se ignoran fechas futuras y no requiere que la corrida termine hoy (puede ser una racha pasada). A diferencia de la racha actual, **no usa el anclaje de hoy/ayer**: son dos cálculos distintos, no los mezcles.
- Ambas rachas se recalculan siempre desde `diario-estudio-sesiones`; no se guardan en localStorage para evitar que se desincronicen.
- Los totales de minutos siguen la misma regla: se calculan desde `diario-estudio-sesiones` y no se guardan. La semana va de lunes a hoy y las fechas futuras no suman.
- Como el formato es `AAAA-MM-DD`, comparar fechas como texto (`>=`, `<=`) es correcto y evita más aritmética con `Date`. Para pasar de un `Date` a texto usa siempre `toLocalDateString()`.

## Forma de trabajar
- Haz solo lo que se pide: no añadas funcionalidades por tu cuenta.
- Cambios pequeños y enfocados; no reescribas lo que ya funciona.
- Al terminar, resume qué has cambiado y cualquier decisión que deba revisar.

## Equipo de agentes
- El proyecto se trabaja con un equipo de agentes: **Zeirt** (agente principal, el padre) delega, revisa y
  entrega; los agentes 1-4 tienen zonas de código reservadas y no tocan la de los demás.
- El reparto, el protocolo de delegación y el estado de cada uno están en **`manageste.md`**: léelo antes de
  tocar nada y actualiza el estado al terminar tu parte.
- Regla de oro: si necesitas tocar la zona de otro agente, **no lo hagas**: anótalo en tu informe y lo decide Zeirt.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Límites
- ✅ Siempre: respetar las reglas de fechas y racha, mantener los textos en español.
- ✅ Siempre: actualiza `MEMORY.md` al terminar cada tarea. 
- ⚠️️ Pregunta antes: crear archivos nuevos, cambiar el formato de los datos guardados.
- 🚫 Nunca: añadir dependencias, frameworks o un paso de build.

## Verificación
- No hay tests ni lint. Probar abriendo `index.html` en el navegador.
- Total de la semana: registrar una sesión de hoy debe subir el total; una de la semana pasada o de mañana no deben cambiarlo.
- Para empezar de cero: DevTools → Application → Local Storage → borrar la clave `diario-estudio-sesiones`.
- La auditoría de seguridad y el estado de cada prueba están en **`vulnerabilities.md`**: antes de tocar el
  acceso o los datos, léela, y si cambias algo, deja la prueba correspondiente al día.
- Para probar en un navegador automatizado, sirve la carpeta por HTTP **sin caché** (`Cache-Control: no-store`):
  si el navegador sirve el `app.js` viejo, la prueba miente.