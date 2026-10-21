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
- localStorage, clave `diario-estudio-sesiones`: array de `{ date: "AAAA-MM-DD", topic, minutes }`.
- Si cambias la forma de los datos, mantén compatibilidad con lo ya guardado o el usuario perderá sus sesiones.
- El contenido del usuario **nunca** se pinta con `innerHTML`: usa `createElement` + `textContent`.

## Autenticación (solo local, sin backend)
- No hay servidor ni base de datos: usuarios y sesión viven en `localStorage`.
- Claves: `diario-estudio-usuarios` (array de `{ username, usernameKey, passwordHash, createdAt }`), `diario-estudio-sesion` (sesión activa) y `diario-estudio-login-intentos` (rate limit).
- Las contraseñas se guardan hasheadas, nunca en claro. El hash es **simple y no criptográfico** (FNV-1a con salt fijo + usuario): sirve para no dejar la contraseña legible, no como seguridad real. No prometas lo que no es.
- `usernameKey` es el nombre en minúsculas y sin espacios: dos usuarios que solo se diferencian en mayúsculas o espacios son el mismo.
- Login fallido devuelve siempre el mismo mensaje genérico para no revelar qué usuarios existen.
- Rate limit local: 5 intentos fallidos → 30 s de bloqueo en el que **ni un login correcto entra**. El bloqueo vive en `loginUser()`, no en el evento del formulario; se resetea al iniciar sesión.
- La app **no** está protegida: se puede usar sin iniciar sesión. El login solo identifica al usuario.
- Las validaciones viven en `registerUser()` / `loginUser()`, que devuelven `{ ok, message }` y nunca lanzan errores. Quien llama solo muestra el mensaje.

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