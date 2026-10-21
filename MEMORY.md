# MEMORY.md - Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- v1.4: auditoría de seguridad aplicada. Informe con las 28 pruebas y su estado en `vulnerabilities.md`.
  Cerradas: B1 (JSON corrupto), B2 (datos no validados), B3 (sesión falsificada), B4 (cuota), B6 (CSP),
  C3 (enumeración), C4/C5 (hash), C6 (contraseñas flojas), A3 (`innerHTML`), D2 (minutos negativos),
  E1 (Escape), E2 (sin `alert()`), E3 (`autocomplete`).
- Sigue abierto **por diseño y sin arreglo posible** sin backend: C1/C2 (el rate limit se puede resetear
  borrando su clave), C7 (la sesión no caduca), C8 (la app no está protegida), B3 residual (suplantar a un
  usuario que sí existe). Documentados como limitaciones aceptadas en `AGENTS.md`.
- Equipo de 4: **Zeirt** (padre) + 3 agentes con zonas reservadas. Reparto y estado en `manageste.md`.
  La app tiene un apartado "🤖 Agentes" (array `AGENTS` en `app.js`) que muestra quién hace qué.
- Claves en localStorage (prefijo `diario-estudio-`): `sesiones`, `tema`, `usuarios`, `sesion`, `login-intentos`. Sin prefijo es un error.
- Todo en `index.html` + `styles.css` + `app.js`. Sin build, sin dependencias, sin tests en el repo.
- Versionado: rama `master` (orphan) → `https://github.com/Feirt00/Agentes.git`. En ese repo `main`
  es otra cosa: no mezclarla ni borrarla. GitHub Desktop descartado: se versiona por CLI y web.

## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic (`file://`).
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- Mejor racha = corrida consecutiva máxima en todo el historial, sin anclaje a hoy/ayer.
- Ninguna racha ni el total semanal se guardan: se recalculan desde `diario-estudio-sesiones` (fuente única de verdad).
- Semana = de lunes a hoy. Las fechas futuras no suman, igual que en las rachas.
- El total va en minutos, sin convertir a horas: menos lógica y menos que explicar.
- Acceso solo localStorage: la app NO está protegida (el login identifica, no bloquea).
- Contraseñas con PBKDF2-SHA256 (210.000 iteraciones) y salt aleatorio por usuario (campo `salt`). Sin Web
  Crypto API no se crea la cuenta ni se inicia sesión: nunca se cae a un hash débil.
- Usuario sin distinguir mayúsculas ni espacios (`usernameKey`); el nombre se guarda tal cual. Sesión sin caducidad.
- La sesión se valida al arrancar: si el usuario no existe o el formato es raro, se borra y se sigue sin sesión.
- CSP con `file:` en la lista de fuentes: en `file://` el origen es opaco y `'self'` solo bloquearía `app.js`.
- Delegar en agentes con zonas reservadas: dos agentes pueden tocar el mismo archivo a la vez sin pisarse.
  El padre (Zeirt) verifica el diff y las pruebas antes de dar por bueno nada.

## Aprendizajes y errores a evitar
- **Al probar en un navegador automatizado, sirve la carpeta con `Cache-Control: no-store`**: si el
  navegador entrega el `app.js` viejo, las pruebas mienten (pasó: el error apuntaba a una línea que ya no
  existía en el archivo). Un `?v=2` en `index.html` no basta: hay que romper la caché de los recursos.
- Para comprobar que la app abre con doble clic: Chrome headless con `--dump-dom` sobre `file://` y mirar si
  `#auth-status` se rellena (si el JS corrió, se rellenó).
- No mezclar el anclaje de la racha actual (hoy/ayer) con el cálculo histórico de la mejor racha.
- `new Date("AAAA-MM-DD")` se parsea en UTC y desplaza el día: usar `parseLocalDate()`.
- Las fechas `AAAA-MM-DD` se pueden comparar como texto (`>=`, `<=`): el orden coincide con el cronológico.
- `Number(session.minutes)` al sumar: si un guardado antiguo tuviera los minutos como texto, `0 + "30"` daría `"03030"`.
- Nada de `innerHTML` con datos del usuario: se usa `createElement` + `textContent`. Ya no queda ninguno.
- Lo que viene de `localStorage` se valida siempre al leer: `normalizeSession()` filtra lo que no tenga la forma
  esperada y `loadSessions()` no peta aunque el JSON esté corrupto. Los minutos como texto se aceptan y normalizan.
- `saveSessions()` devuelve `{ ok, message }` y captura `QuotaExceededError`: el aviso sale en la página
  (`#form-message`), nunca en consola ni con `alert()`.
- Las cuentas antiguas (FNV-1a, sin `salt`) se migran solas al iniciar sesión: si el usuario no tiene
  `salt`, se valida con `hashPasswordLegacy()` y, si acierta, se re-hashea con PBKDF2 y se guarda el salt.
- `hashPassword()`, `registerUser()` y `loginUser()` son async: quien las llama usa `await`.
- Al documentar, escribir siempre las claves de localStorage con su prefijo real, o se confunden.
- Validaciones y rate limit van DENTRO de `registerUser()`/`loginUser()`, no en el evento del formulario.
- `app.js` tiene finales de línea mezclados (CRLF y LF): no normalizar el archivo entero (diff gigante).
- Al concatenar o reescribir con PowerShell 5.1 se rompen acentos y emojis: usar el editor de opencode.

## Próximos pasos
- Terminar la fase 2 de la auditoría con el informe del Inspector (Agente 3) y cerrar sus hallazgos.
- Decidir si las sesiones se separan por usuario: hoy la lista es global y dos usuarios del mismo
  navegador comparten sesiones y total semanal (cambiaría el formato de los datos).
- Falta documentar el bloque de Términos y Condiciones de `index.html`.
