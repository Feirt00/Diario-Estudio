# MEMORY.md - Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- v1.3: registro/login local (modal), racha actual, mejor racha, minutos de la semana (lunes a
  hoy), lista de sesiones y tema claro/oscuro.
- Claves en localStorage (prefijo `diario-estudio-`): `sesiones`, `tema`, `usuarios`, `sesion`, `login-intentos`. Sin prefijo es un error.
- Todo en `index.html` + `styles.css` + `app.js`. Sin build, sin dependencias, sin tests en el repo.
- Auditoría de seguridad 2026-10-21: informe en `vulnerabilities.md` (28 pruebas). El XSS aguanta;
  fallan el manejo de datos y la autenticación. Sin arreglar todavía.
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
- Contraseñas hasheadas con FNV-1a + salt fijo. A propósito es simple: no criptográfico.
- Usuario sin distinguir mayúsculas ni espacios (`usernameKey`); el nombre se guarda tal cual. Sesión sin caducidad.

## Aprendizajes y errores a evitar
- No mezclar el anclaje de la racha actual (hoy/ayer) con el cálculo histórico de la mejor racha.
- `new Date("AAAA-MM-DD")` se parsea en UTC y desplaza el día: usar `parseLocalDate()`.
- Las fechas `AAAA-MM-DD` se pueden comparar como texto (`>=`, `<=`): el orden coincide con el
  cronológico y ahorra aritmética con `Date`. Para pasar un `Date` a texto, `toLocalDateString()`.
- `Number(session.minutes)` al sumar: si un guardado antiguo tuviera los minutos como texto, `0 + "30"` daría `"03030"`.
- Nada de `innerHTML` con datos del usuario: `updateSessionList()` lo usaba con `session.topic`;
  ahora usa `createSessionItem()` + `textContent`.
- `loadSessions()` sin `try/catch`: un JSON corrupto en `diario-estudio-sesiones` mata la app (al
  arrancar y al guardar). Leer validando siempre lo que viene del almacenamiento.
- Lo guardado no está validado (solo el formulario): `date` numérico o sesión `null` peta con
  `TypeError`. El hash FNV-1a (32 bits) tiene colisiones: un diccionario lo rompe al instante.
- Al documentar, escribir siempre las claves de localStorage con su prefijo real, o se confunden.
- Validaciones y rate limit van DENTRO de `registerUser()`/`loginUser()`, no en el evento del formulario.
- `app.js` tiene finales de línea mezclados (CRLF y LF): no normalizar el archivo entero (diff gigante).
- Al concatenar o reescribir con PowerShell 5.1 se rompen acentos y emojis: usar el editor de opencode, no `Set-Content`.

## Próximos pasos
- Arreglos de `vulnerabilities.md` por orden: `try/catch`+validación al leer (B1/B2), clamp de
  `minutes` (D2), `crypto.subtle` con salt aleatorio (C4/C5), validar la sesión (B3), CSP (B6).
- Decidir qué limitaciones se aceptan y dejarlas en `AGENTS.md` (rate limit local, sesión sin caducidad, app no protegida).
- Las sesiones (y el total semanal) son globales: dos usuarios en el mismo navegador comparten
  lista. Decidir si se documenta o se separan por usuario (cambiaría el formato de los datos).
- Falta documentar el bloque de Términos y Condiciones de `index.html`.
