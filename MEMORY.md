# MEMORY.md - Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- v1.9 (fase 7): **pantalla de acceso + rediseño suave**. La app arranca con `#app` oculto y `#pantalla-acceso` visible (iniciar sesión / crear cuenta / **entrar sin cuenta**); cerrar sesión vuelve a la pantalla y con sesión guardada se entra directo. El modal `#auth-modal` desapareció: **E1/H8 ya no aplican** (no hay modal que cerrar y el foco no escapa porque la app está detrás con `[hidden]` — comprobado por el Inspector). Rediseño claro/oscuro (degradados, radios 22/24/12, pestañas píldora, foco luminoso, sesiones en tarjetitas) con contraste AA ajustado tras el informe del Inspector (**94/94, GO**). Nuevo `README.md` con la descripción del proyecto y el equipo de agentes.
- v1.8 (fase 6): **filtros de periodo**. La lista "Sesiones" arranca en **Hoy** con desplegable (última semana / último mes / todo el historial) y el gráfico de pastel tiene su desplegable (global / hoy / **día elegido** —el día pulsado en las barras— / semana de lunes a hoy). Ambos filtros son **solo visuales**: racha, mejor racha y total de la semana siguen midiéndose con todo el historial.
- v1.7 (fase 5): **datos por usuario** (sesiones, racha, totales y gráficos ya no se comparten entre cuentas) y **gráficos navegables** (ventana de 7 días movible con `‹`/`›` + detalle por día). Para comprobarlo en su navegador, Feirt tiene `crear-cuenta-feirt.html` (cuenta **feirt**, contraseña provisional `12345678`, 60 días de sesiones).
- v1.6: auditoría de seguridad **cerrada** (commit `e4a1208`). Las 27 pruebas y los 9 hallazgos del Inspector (H1-H9) están en `vulnerabilities.md`.
- Cerradas: B1, B2, B3, B4, B6, C3 (enumeración, sin canal de tiempo), C4/C5 (hash + cuentas antiguas desactivadas), C6, A3, D2, E1 (Escape + foco, hoy sin objeto: no hay modal), E2, E3 y los 9 hallazgos del Inspector.
- Sigue abierto **por diseño y sin arreglo posible** sin backend: C1/C2 (rate limit reseteable), C7 (la sesión no caduca), C8 (la app no está protegida), B3 residual (suplantar a un usuario que sí existe).
- Tres pestañas (Diario, Cronómetro, Gráficos).
- Claves en localStorage (prefijo `diario-estudio-`): `sesiones`, `sesiones-<usuario>`, `tema`, `usuarios`, `sesion`, `login-intentos`, `cronometro`. Sin prefijo es un error.
- **El panel «🤖 Agentes» se quitó de la interfaz** a petición de Feirt (no se veía bien en la web): se borraron su bloque de `index.html`, el array `AGENTS`, `renderAgents()`, su constante `agentList` y todo su CSS. El equipo de agentes **solo vive en `manageste.md` y `AGENTS.md`**: no lo vuelvas a pintar en la app.
- Versionado: rama `master` → `https://github.com/Feirt00/Agentes.git` (subida a `origin`). La rama temporal `agentes-de-la-web` **se borró** (remoto y local). En ese repo `main` es de otro proyecto de Feirt: no mezclarla ni borrarla.

## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic (`file://`).
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- Mejor racha = corrida consecutiva máxima en todo el historial, sin anclaje a hoy/ayer.
- Ninguna racha ni el total semanal se guardan: se recalculan desde las sesiones (fuente única). El total va en minutos, sin convertir a horas: menos lógica y menos que explicar.
- Acceso solo localStorage: la app NO está protegida (el login identifica, no bloquea).
- Contraseñas con PBKDF2-SHA256 (210.000 iteraciones) y salt aleatorio por usuario. Sin Web Crypto API no se crea la cuenta ni se inicia sesión: nunca se cae a un hash débil.
- **Cada usuario tiene sus sesiones** en `diario-estudio-sesiones-<usernameKey>`; sin cuenta se usa la clave global. Al entrar por primera vez, lo que había en la global **pasa** a su cuenta (una sola vez).
- Delegar en agentes con zonas reservadas: dos agentes pueden tocar el mismo archivo a la vez sin pisarse. El padre (Zeirt) verifica el diff y las pruebas antes de dar por bueno nada.
- La cuenta atrás del cronómetro se calcula con la **hora real** (`Date.now()`), no con un contador: `setInterval` se desvía y en segundo plano se para. El estado se guarda en `diario-estudio-cronometro`.
- Los gráficos se dibujan **a mano con SVG**: nada de Chart.js ni CDN. Los colores van con clases CSS (con su variante `body.dark`), nunca en línea.
- El registro **nunca confirma** si el nombre existe (mismo mensaje y mismo flujo) y el login calcula un hash "de mentira" si el usuario no existe: si no, se enumeran los usuarios por el texto o por el tiempo.
- Las cuentas anteriores a PBKDF2 se **desactivan** (su hash de 32 bits se rompe por colisión): se borran al arrancar y el nombre queda libre. No se pierde nada de lo estudiado.
- Todo acceso a `localStorage` pasa por `storageGet()`/`storageSet()`/`storageRemove()`: si el navegador lo bloquea, la app avisa y sigue viva en vez de quedarse en blanco.

## Aprendizajes y errores a evitar
- **Al probar en un navegador automatizado, sirve la carpeta con `Cache-Control: no-store`**: si el navegador entrega el `app.js` viejo, las pruebas mienten. Un `?v=2` en el HTML no basta.
- Al medir tiempos de login hay que **limpiar el rate limit** (`diario-estudio-login-intentos`): con 5 fallos se activa el bloqueo y las siguientes mediciones salen a 0 ms y no comparan nada.
- **Un `try/catch` alrededor de un helper que ya no lanza se queda muerto**: `storageSet()` no lanza, así que el aviso de "almacenamiento lleno" hay que sacarlo del valor que devuelve (se perdió al pasar a los helpers y se detectó revisando el diff, no con las pruebas).
- `localStorage` puede lanzar sin avisar (modo privado, cookies desactivadas, cuota): por eso van helpers.
- `Number(session.minutes)` al sumar: si un guardado antiguo tuviera los minutos como texto, `0 + "30"` daría `"03030"`.
- Lo que viene de `localStorage` se valida siempre al leer: `normalizeSession()` filtra lo que no tenga la forma esperada y `loadSessions()` no peta aunque el JSON esté corrupto. 0 o negativos se descartan.
- `saveSessions()` devuelve `{ ok, message }` y captura la cuota llena: el aviso sale en la página (`#form-message`), nunca en consola ni con `alert()`.
- `hashPassword()`, `registerUser()` y `loginUser()` son async: quien las llama usa `await`. Validaciones y rate limit van DENTRO de esas funciones, no en el evento del formulario.
- `app.js` tiene finales de línea mezclados (CRLF y LF): no normalizar el archivo entero (diff gigante). Al concatenar o reescribir con PowerShell 5.1 se rompen acentos y emojis: usar el editor de opencode.
- **La pantalla de acceso arranca en modo *login***: para registrar por la interfaz hay que pulsar `#acceso-tab-registro` ("Crear cuenta") antes. Un test que no lo hace registra nada, `loginUser` falla y el resultado parece un bug de datos (se investigó un "duplicado" que era del test).
- En las baterías de pruebas, **`const R = []` con propiedades con nombre imprime `[]`**: `JSON.stringify` de un array solo serializa los índices. Para recoger resultados con nombre, usar `const R = {}` (le costó una repetición entera a la batería v18).
- Al elegir un color nuevo hay que mirar **los dos temas**: un tono que pasa en claro no pasa en oscuro y al revés (el Inspector lo pilló en `.acceso-invitado a` y en `.session-date`).

## Próximos pasos
- **Fase 8 en cola**: borrar sesiones con botón 🗑️ y confirmación en dos pasos (petición de Feirt; Agente 1, zona de datos).
- **Fase 9 en cola**: agrupar temas en los gráficos sin importar mayúsculas/espacios (Agente 4; en cadena tras la fase 8 porque ambos tocan `app.js`).
- Falta documentar el bloque de Términos y Condiciones de `index.html`.
