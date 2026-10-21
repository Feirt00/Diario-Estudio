# Vulnerabilidades - Diario de Estudio

Auditoría de seguridad de la app local (`index.html` + `app.js` + `styles.css`).

- **Fecha:** 2026-10-21
- **Alcance:** todo lo que se ejecuta en el navegador. La app es 100 % local: sin backend, sin red,
  sin base de datos. El "atacante" es alguien con acceso al navegador (la misma persona que usa la
  app, o alguien que le abre el equipo un momento).
- **Método:** revisión del código + 28 pruebas ejecutadas de verdad en el navegador, simulando a un
  atacante haciendo cosas desde la consola (DevTools).
- **Cómo se probó:** la app servida en `http://localhost:8123` (mismo código que con doble clic) y
  ataque con `localStorage`, inyecciones de payloads y llamadas directas a las funciones internas.
  No se modificó ningún archivo del proyecto.
- **Escala:** `Alta` / `Media` / `Baja` / `Info`. Casi todo cae en `Media` o `Baja` porque el daño
  se limita a este navegador. Lo marcado `Info` o "por diseño" son cosas que `AGENTS.md` ya declara
  como aceptadas.
- **Nada de esto se ha arreglado todavía.** Este archivo es el informe; los arreglos van en tareas
  aparte.

---

## Resumen

| # | Prueba | Resultado | Gravedad |
|---|--------|-----------|----------|
| A1 | XSS en el campo "Tema" | **Seguro** — se pinta como texto, no se ejecuta | — |
| A2 | XSS en el nombre de usuario | **Seguro** — se pinta como texto | — |
| A3 | `innerHTML` vivo en `renderAuthStatus()` | No explotable hoy, pero es la puerta por la que entraría un XSS | Baja |
| A4 | XSS inyectado directo en `localStorage` | **Seguro** — se pinta como texto | — |
| A5 | `href`/`src` con datos del usuario | **Seguro** — el único `<a>` es `#` | — |
| B1 | JSON corrupto en `localStorage` | **Vulnerable** — la app muere al arrancar y al guardar | Media |
| B2 | Sesiones con tipos de datos raros | **Vulnerable** — `TypeError` al pintar la lista o al calcular | Media |
| B3 | Suplantación de sesión | **Vulnerable** — impersonar a cualquiera sin contraseña | Media |
| B4 | Cuota de `localStorage` | **Vulnerable** — al guardar no se avisa de nada | Baja |
| B5 | Prototype pollution | **Seguro** — `JSON.parse` no contamina nada | — |
| B6 | Sin CSP ni `integrity` | **Falta** — grave solo si la app se hospeda | Media |
| C1 | Bypass del rate limit | **Vulnerable** — borrando una clave se anula el bloqueo | Media |
| C2 | El rate limit es local | **Limitación** — otro perfil o ventana privada lo esquivan | Info |
| C3 | Enumeración de usuarios | **Vulnerable** — el registro dice si el usuario ya existe | Baja |
| C4 | Colisión del hash FNV-1a | **Vulnerable** — contraseña ajena que abre la cuenta | Media |
| C5 | Crack offline del hash | **Vulnerable** — diccionario de 10 palabras, instantáneo | Media |
| C6 | Contraseñas flojas | **Vulnerable** — `123456` se acepta | Baja |
| C7 | La sesión no caduca | **Limitación** — acceso permanente | Info |
| C8 | La app no está protegida | **Por diseño** (documentado en `AGENTS.md`) | Info |
| D1 | Sesiones con fecha futura | **Seguro** — no suman en ningún contador | — |
| D2 | Minutos negativos | **Vulnerable** — el total semanal puede quedar negativo | Baja |
| D3 | Minutos guardados como texto | **Seguro** — `Number('30')` = 30 | — |
| D4 | Duplicar sesiones del mismo día | **Limitación** — infla los minutos, no la racha | Info |
| D5 | Editar o borrar datos a mano | **Seguro** — todo se recalcula desde el origen | — |
| E1 | El modal no cierra con `Escape` | Falta | Info |
| E2 | `alert()` en las validaciones | Falta | Info |
| E3 | Sin `autocomplete` en el modal | Falta | Info |

**Resultado global: la app aguanta bien el XSS (lo importante) y flojea en el manejo de datos y en
la autenticación.** Lo que más pesa: B1, B3, C1, C4 y C5.

---

## Lo que hay que arreglar primero

1. **B1 — `loadSessions()` sin `try/catch`.** Un solo carácter corrupto en
   `diario-estudio-sesiones` deja la app muerta: al arrancar salta `SyntaxError` (app.js:75), la
   racha se queda en 0, la lista no se pinta y al guardar otra vez revienta (app.js:291) **sin
   avisar**. Se pierde la sesión sin que el usuario entienda por qué.
   *Arreglo*: `try/catch` al leer, devolver `[]` y validar cada sesión al cargarla.
2. **B2 — no se valida lo que ya está guardado.** Solo valida el formulario. Si alguien edita
   `localStorage` a mano, la app peta: `date` numérico → `dateStr.split is not a function`; una
   sesión `null` → `Cannot read properties of null`; una sesión que sea un texto → `undefined.split`.
   Con `minutes: '1e309'` el total de la semana sale `Infinity`.
   *Arreglo*: filtrar al cargar las sesiones que no tengan `{ date: "AAAA-MM-DD", topic: string,
   minutes: número > 0 }`.
3. **C4/C5 — el hash no resiste.** Es FNV-1a de 32 bits con salt fijo: se rompe con un diccionario
   y **dos contraseñas distintas dan el mismo hash**, así que una contraseña "equivocada" puede
   abrir una cuenta ajena.
   *Arreglo*: `crypto.subtle` (PBKDF2 con salt aleatorio por usuario) — es nativo, no añade
   dependencias ni build, pero `hashPassword()` pasa a ser asíncrona.
4. **B3 — la sesión se puede falsificar.** La "sesión" es un JSON en `localStorage` sin firma:
   ```
   localStorage.setItem('diario-estudio-sesion', '{"username":"adminFantasma","loggedInAt":"2026-10-21"}')
   ```
   y la cabecera ya muestra `adminFantasma` **aunque ese usuario no exista**.
   *Arreglo*: validar que el usuario de la sesión exista y que el objeto tenga la forma correcta.
   Aviso: en una app sin backend **no hay forma real de evitar la suplantación** (todo el secreto
   estaría en el mismo navegador); lo que sí se puede es no mostrar usuarios que no existen y
   dejarlo escrito como limitación.
5. **C1 — el rate limit se desactiva solo.** Basta con borrar o editar
   `diario-estudio-login-intentos` para que los 5 intentos / 30 s dejen de contar.
   *Arreglo*: no se puede arreglar de verdad sin servidor. Dejarlo documentado como limitación
   asumida (o acceptarlo tal cual y que no se venda como protección real).
6. **B6 — falta CSP.** No hay `Content-Security-Policy` ni `integrity` en el `<script>`. Con
   `file://` el riesgo es bajo, pero **si la app se sube a un servidor HTTP**, cualquier JS
   inyectado puede leer todo el `localStorage` (hashes de contraseñas, sesión y datos de estudio).
   *Arreglo*: una meta CSP del tipo `default-src 'self'; script-src 'self'` (con `file://` hay que
   comprobar que no rompe el arranque).

---

## A. Inyección de código (XSS)

### A1. XSS almacenado en el campo "Tema" — **Seguro**
- **Por qué:** el `topic` es el único texto libre que guarda el usuario y se vuelve a pintar en la
  lista. Si se pintase con `innerHTML`, un `<img onerror=...>` se ejecutaría en cada visita.
- **Cómo se probó:** se registró una sesión con `topic` = `<img src=x onerror="window.__xss1=1">`.
- **Resultado:** `window.__xss1` **no** se ejecutó, hay **0** elementos `<img>` en la lista y el
  HTML generado escapa el payload (`&lt;img src=x onerror=...&gt;`).
- **Por qué funciona:** `createSessionItem()` construye los `<span>` con `document.createElement` y
  `textContent`. Correcto tal y como manda `AGENTS.md`.

### A2. XSS en el nombre de usuario — **Seguro**
- **Por qué:** el nombre de usuario se pinta en la cabecera al iniciar sesión. Si llevara HTML
  ejecutable, se ejecutaría en cada carga de la app.
- **Cómo se probó:** se creó el usuario `<b>x</b>` y se inició sesión.
- **Resultado:** la cabecera muestra el texto literal `<b>x</b>` y hay **0** etiquetas `<b>` en el
  DOM. `renderAuthStatus()` usa `createElement` + `textContent` para el nombre.

### A3. `innerHTML` vivo en `renderAuthStatus()` — **No explotable hoy, riesgo latente**
- **Por qué:** la rama "sin sesión" usa `innerHTML` con un literal fijo:
  `authStatus.innerHTML = '<span class="auth-link" id="login-link">Iniciar sesión</span>'`.
  Hoy **no hay dato del usuario dentro**, así que no se puede explotar. Pero es la única puerta
  por la que entraría un XSS si alguien "optimiza" esa línea metiendo el nombre del usuario
  dentro, y el resto del archivo ya usa `textContent`.
- **Cómo se probó:** se leyó el código y se comprobó que las dos apariciones de `innerHTML` no
  contienen datos del usuario.
- **Arreglo de una línea:** usar `textContent = ''` + `createElement`, como la rama de arriba.

### A4. XSS inyectado directo en `localStorage` — **Seguro**
- **Por qué:** un atacante puede escribir en `diario-estudio-sesiones` sin pasar por el formulario;
  el formulario valida, `localStorage` no.
- **Cómo se probó:** se escribió a mano una sesión con `topic` = `<svg onload="window.__xss4=1">`
  y se recargó la página.
- **Resultado:** `window.__xss4` no se ejecutó, hay **0** `<svg>` en la lista y el payload sale
  escapado como texto.

### A5. Inyección de atributos / `javascript:` — **Seguro**
- **Por qué:** si el nombre se pintara como `href` o `src`, un `javascript:` se ejecutaría al
  hacer clic.
- **Resultado:** el único `<a>` de la página es el enlace de "Crear usuario" (`href="#"`), no hay
  ningún `<img>` y ningún `onclick`/`onerror` en el HTML. No hay `href`/`src` asignados desde
  JavaScript.

---

## B. Datos y localStorage

### B1. JSON corrupto → la app se muere — **Vulnerable (Media)**
- **Por qué:** `loadSessions()` hace `JSON.parse(data)` sin `try/catch`.
- **Cómo se probó:** `localStorage.setItem('diario-estudio-sesiones', '{roto')` + recarga.
- **Resultado:**
  - Al arrancar: `SyntaxError: Expected property name or '}' in JSON at position 1` en
    `loadSessions (app.js:75)` ← `updateStreak (app.js:210)` ← `app.js:666`. La inicialización se
    corta ahí: la racha se queda en **"0"**, la lista se queda **vacía sin mensaje** y la app no
    arranca.
  - Al intentar guardar: vuelve a petar en `app.js:291`, la sesión **no se guarda** y **no
    aparece ningún aviso**. El usuario cree que ha guardado y no.
  - El error solo se ve en la consola: para quien usa la app, la app simplemente "no funciona".

### B2. Sesiones con tipos de datos raros — **Vulnerable (Media)**
- **Por qué:** nada valida lo que ya está guardado: `minutes` puede ser texto, `null` o `Infinity`;
  `date` puede ser `"no-es-fecha"`, un número, o la sesión entera puede no ser un objeto.
- **Cómo se probó:** se escribieron a mano sesiones inválidas y se llamó a los cálculos y al pintado.
- **Resultado:**

  | Dato inyectado | Qué pasa |
  |---|---|
  | `date: "no-es-fecha"` | No peta, pero en la lista sale **"Invalid Date"** |
  | `date: 20261021` (número) | **Peta**: `dateStr.split is not a function` al pintar la lista |
  | `[null]` | **Peta**: `Cannot read properties of null (reading 'date')` al calcular la racha |
  | `["hola"]` | **Peta**: `Cannot read properties of undefined (reading 'split')` |
  | `minutes: null` | Se trata como 0 (silencioso) |
  | `minutes: "1e309"` | El total de la semana sale **Infinity** |

  Ninguno de estos errores se muestra en pantalla: todos mueren en la consola.

### B3. Suplantación de sesión — **Vulnerable (Media)**
- **Por qué:** la "sesión" es un objeto en `localStorage` (`{username, loggedInAt}`) sin ninguna
  firma ni comprobación. Escribirlo a mano mete a cualquiera como cualquier usuario.
- **Cómo se probó:**
  ```js
  localStorage.setItem('diario-estudio-sesion', '{"username":"adminFantasma","loggedInAt":"2026-10-21"}')
  ```
  y recarga.
- **Resultado:** la cabecera muestra **`adminFantasma`** y el botón "Cerrar sesión", aunque en
  `diario-estudio-usuarios` **no existe ningún usuario** con ese nombre. Cero contraseñas.
- **Nota honesta:** en una app sin servidor esto **no tiene arreglo real**: cualquier secreto
  guardado en el navegador es recuperable por quien tenga el navegador. Lo que sí se puede es no
  mostrar usuarios inexistentes y dejarlo escrito como limitación.

### B4. Cuota de `localStorage` agotada — **Vulnerable (Baja)**
- **Por qué:** `saveSessions()` no captura `QuotaExceededError`. Si el navegador rechaza la
  escritura, la sesión **no se guarda y no se avisa**.
- **Cómo se probó:** en este navegador la cuota resultó enorme (~50 MB): semanaged guardar una
  sesión con un `topic` de 6 MB sin problema, y llenando el almacenamiento a tope la app siguió
  guardando. **No se pudo agotar la cuota real**, así que se simuló el error real de Chrome/Edge
  (5 MB por origen) parchendo `Storage.prototype.setItem` para que lanzase `QuotaExceededError`.
- **Resultado (simulado):** error `QuotaExceededError` sin capturar en la consola, la sesión **no
  se guarda** (`localStorage` sigue con `[]`), el campo "Tema" **no** se limpia (el usuario no
  pierde lo escrito) y **no hay ningún mensaje en pantalla**. La app parece no hacer nada.
- **Por qué no se reproduce aquí:** este navegador da mucha más cuota; en Chrome o Edge con la
  cuota estándar de 5 MB, un `topic` de varios MB lo dispara de verdad.

### B5. Prototype pollution — **Seguro**
- **Por qué:** `JSON.parse` con `__proto__` no contamina nada por sí solo; el riesgo aparece si el
  objeto se fusiona (`Object.assign`, spread, `merge`).
- **Cómo se probó:** se guardó `[{"date":"...","topic":"x","minutes":10,"__proto__":{"admin":true}}]`.
- **Resultado:** `({}).admin` sigue siendo `undefined`: **no hay contaminación**. El proyecto no
  fusiona datos de `localStorage` con `Object.assign` ni con spread, así que la vía está cerrada.

### B6. Sin CSP ni integridad de scripts — **Falta (Media si se hospeda)**
- **Por qué:** no hay `Content-Security-Policy` ni atributo `integrity` en `<script src="app.js">`.
- **Cómo se probó:** se inspeccionó el DOM: `hayCSP: false`, `integrity: null`, un solo script
  (`app.js`).
- **Resultado:** con `file://` el riesgo es bajo. **Si la app se sube a un servidor HTTP**, cualquier
  JavaScript que se meta en la página puede leer todo el `localStorage`: hash de contraseñas,
  sesión activa y datos de estudio. Con una CSP `default-src 'self'` eso se cierra.

---

## C. Autenticación (login local)

### C1. Bypass del rate limit — **Vulnerable (Media)**
- **Por qué:** el bloqueo por intentos vive en `diario-estudio-login-intentos`, en el mismo
  almacenamiento que el atacante controla.
- **Cómo se probó:** 5 intentos fallidos → el 6º devuelve *"Demasiados intentos fallidos.
  Inténtalo de nuevo en 30 s."* (bloqueo confirmado, 30 s). Después:
  ```js
  localStorage.removeItem('diario-estudio-login-intentos')          // → bloqueo anulado
  localStorage.setItem('diario-estudio-login-intentos', '{"count":0,"blockedUntil":0}')  // → idem
  ```
- **Resultado:** en ambos casos el siguiente intento vuelve a fallar **sin bloquear**: la fuerza
  bruta es ilimitada. El rate limit protege solo contra la impaciencia de quien usa la interfaz.

### C2. El rate limit es local, no global — **Limitación (Info)**
- **Por qué:** aunque no se toque el almacenamiento, el bloqueo es por navegador: otro navegador,
  otro perfil o una ventana privada lo esquivan sin esfuerzo. "5 intentos / 30 s" es una
  comodidad, no una protección.

### C3. Enumeración de usuarios — **Vulnerable (Baja)**
- **Por qué:** el login devuelve un mensaje genérico (bien hecho), pero el **registro** dice
  *"Ese nombre de usuario ya existe"*, lo que confirma qué usuarios existen.
- **Cómo se probó:** se intentó registrar `<b>x</b>` dos veces.
- **Resultado:** 1º → *"¡Cuenta creada!"*; 2º → *"Ese nombre de usuario ya existe."*; login con
  un usuario inexistente → *"Usuario o contraseña incorrectos."* (genérico, correcto).
- **Matiz:** es un compromiso habitual entre registro y login; en una app local sin lista de
  usuarios pública tiene poca importancia real.

### C4. Colisión del hash FNV-1a — **Vulnerable (Media)**
- **Por qué:** el hash es de 32 bits: solo 2^32 valores posibles, un espacio enumerable. Y como el
  hash solo depende de (salt fijo + usuario + contraseña), **dos contraseñas distintas pueden dar
  el mismo hash**, y entonces la contraseña de una cuenta sirve para entrar en otra.
- **Cómo se probó:** se buscaron colisiones con un script aparte (≈131 000 contraseñas probadas) y
  se encontró una: para el usuario `atacante`, las contraseñas **`4o7aaa`** y **`aitcaa`** dan las
  dos el hash `4872846f`.
- **Resultado:**
  ```
  registerUser('atacante', '4o7aaa')   → ok
  loginUser('atacante', 'aitcaa')      → { ok: true, message: 'Sesión iniciada.' }
  ```
  **Se entra con una contraseña que nunca se creó.**

### C5. El hash se crackea offline en milisegundos — **Vulnerable (Media)**
- **Por qué:** hash determinista (FNV-1a, salt fijo `diario-estudio-v1`, sin coste): un diccionario
  de contraseñas comunes rompe cualquier cuenta al instante.
- **Cómo se probó:** se leyó `diario-estudio-usuarios` de `localStorage` y se probaron 10
  contraseñas contra el hash guardado.
- **Resultado:** el usuario `atacante` se rompió con `4o7aaa` **y** con `aitcaa` (las dos del
  mismo hash). No hizo falta nada más: sin salt aleatorio ni coste, la misma contraseña da el
  mismo hash siempre y se puede precomputar.
- **Aviso:** el propio `AGENTS.md` dice que el hash "no es criptográfico". Confirmado: **no protege
  la contraseña**, solo evita leerla en claro.

### C6. Contraseñas flojas permitidas — **Vulnerable (Baja)**
- **Por qué:** solo se exigen 6 caracteres y no hay lista de contraseñas comunes.
- **Resultado:** `registerUser('debil', '123456')` → **accepted**. Con C5, `123456` es además la
  primera contraseña que prueba cualquier diccionario.

### C7. La sesión no caduca nunca — **Limitación (Info)**
- **Por qué:** `diario-estudio-sesion` es `{username, loggedInAt}`: sin `expiresAt` ni caducidad.
- **Resultado:** el contenido guardado es `{"username":"debil","loggedInAt":"2026-10-21"}`. Quien
  quede con ese navegador queda dentro para siempre.

### C8. La app no está protegida — **Por diseño (Info)**
- **Por qué:** se puede usar la app **sin iniciar sesión**: el login identifica, no bloquea. Está
  declarado en `AGENTS.md`, pero conviene que quede escrito en el informe: la contraseña protege
  cosas que están **en ese mismo `localStorage`**, así que no es una barrera real.

---

## D. Lógica de rachas y totales

### D1. Sesiones con fecha futura — **Seguro**
- **Cómo se probó:** una sesión con fecha de mañana.
- **Resultado:** racha **0**, mejor racha **0**, minutos de la semana **0**. Las fechas futuras no
  suman en ningún contador. Correcto.

### D2. Minutos negativos — **Vulnerable (Baja)**
- **Por qué:** `minutes` se guarda tal cual; nada impide un valor negativo.
- **Resultado:** con una sesión de 30 min y otra de −500 min, el **total de la semana queda en
  −470** (la racha y la mejor racha no se ven afectadas: 1 y 1). El total de la semana se puede
  manipular a la baja desde el propio almacenamiento.

### D3. Minutos guardados como texto — **Seguro**
- **Por qué:** aprendizaje ya guardado en `MEMORY.md`: `0 + "30"` daría `"03030"`.
- **Resultado:** con `minutes: "30"` el total de la semana es **30**. `Number()` lo resuelve bien.

### D4. Duplicar sesiones del mismo día — **Limitación (Info)**
- **Por qué:** la racha cuenta **1 día** por fecha, pero el total de minutos **suma cada sesión**.
- **Resultado:** 10 sesiones del mismo día → racha **1**, mejor racha **1**, semana **300 min**.
  El "minutos de la semana" se puede inflar duplicando, la racha no.

### D5. Editar o borrar datos a mano — **Seguro**
- **Por qué:** no hay función de borrado en la interfaz, pero se puede editar el almacenamiento.
- **Resultado:** como racha, mejor racha y total se **recalculan siempre** desde
  `diario-estudio-sesiones`, editar a mano no desincroniza nada. Es el comportamiento correcto y es
  la razón de no guardar las rachas en `localStorage`.

---

## E. Robustez y usabilidad (no son vulnerabilidades)

- **E1.** El modal de acceso **no cierra con `Escape`** (no hay ningún listener de teclado en
  `app.js`: comprobado con grep) y **no atrapa el foco**: al abrirlo el foco sí entra
  (`authUsername.focus()`), pero con `Tab` se puede salir a la página de detrás.
- **E2.** Las validaciones del formulario usan `alert()` (`app.js:287`) en vez de un mensaje en la
  interfaz.
- **E3.** Ni el campo de usuario ni el de contraseña tienen `autocomplete`.

---

## Límites reales de esta app (lo que no se puede arreglar aquí)

1. **Todo vive en el mismo navegador.** Quien tiene acceso al `localStorage` tiene acceso a las
   contraseñas hasheadas, a la sesión y a los datos de estudio. Sin backend no hay forma de poner
   un secreto fuera del alcance del atacante.
2. **El rate limit y el bloqueo son por dispositivo**, no por cuenta ni por servidor.
3. **La sesión no se puede firmar de verdad** sin guardar un secreto en el cliente, y ese secreto
   también sería recuperable.

Lo que **sí** se puede arreglar, en este orden:

1. `try/catch` + validación de sesiones al leer (arregla **B1** y **B2**).
2. No pintar sesiones con datos inválidos y no mostrar "Invalid Date".
3. Clamp de `minutes` a `>= 0` al calcular (**D2**).
4. `crypto.subtle` con salt aleatorio por usuario para el hash (**C4**, **C5**, **C6**).
5. Validar que el usuario de la sesión exista y tenga la forma correcta (**B3**).
6. Meta CSP (**B6**).
7. Quitar el `innerHTML` que queda (**A3**), `Escape` para cerrar el modal y `autocomplete`
   (**E1**, **E3**).
8. Documentar en `AGENTS.md` lo que se acepta como limitación (**C1**, **C2**, **C7**, **C8**).

---

## Pendiente

- [ ] Decidir qué se arregla y en qué tarea (esto no se ha tocado: el proyecto sigue igual).
- [ ] Mover a `AGENTS.md` las reglas permanentes que salgan de aquí.
- [ ] Repetir estas pruebas después de los arreglos (la lista de arriba sirve de checklist).
