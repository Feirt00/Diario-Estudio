// Crear la cuenta "feirt" con 60 días de sesiones de ejemplo.
//
// Esto NO es la app: es una ayuda de una sola vez para poder probar que cada
// usuario tiene sus propios datos. Se puede borrar el fichero después.
//
// Reproduce EXACTAMENTE el formato que usa la app:
//   - Cuenta en "diario-estudio-usuarios": { username, usernameKey, passwordHash,
//     salt, createdAt, role } con hash PBKDF2-HMAC-SHA256 de 210.000 iteraciones
//     y salt aleatorio de 16 bytes, todo en hexadecimal.
//   - Sesiones en "diario-estudio-sesiones-feirt": [{ date, topic, minutes }].

const NOMBRE_USUARIO = 'feirt';
const CONTRASENA = '12345678';
const USUARIOS_KEY = 'diario-estudio-usuarios';
const SESIONES_KEY = 'diario-estudio-sesiones-' + NOMBRE_USUARIO.trim().toLowerCase();

const PBKDF2_ITERATIONS = 210000;
const SALT_BYTES = 16;

// Temas y minutos fijos: al ser siempre los mismos, el gráfico sale igual en
// todas las pruebas y se puede comparar.
const TEMAS = ['Matematicas', 'Programacion', 'Historia', 'Ingles', 'Fisica', 'Quimica'];

const boton = document.getElementById('crear');
const resultado = document.getElementById('resultado');

// Pasar bytes a texto hexadecimal (para guardar el salt y el hash)
function bytesToHex(bytes)
{
    let hex = '';
    for (let i = 0; i < bytes.length; i++)
    {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

// Pasar texto hexadecimal a bytes (para usar el salt en PBKDF2)
function hexToBytes(hex)
{
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++)
    {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

// Convertir una fecha a texto "AAAA-MM-DD" usando la hora LOCAL del navegador.
// Ojo: nunca se usa toISOString(), que se guarda en UTC y puede desplazar el día.
function fechaATexto(date)
{
    const año = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const día = String(date.getDate()).padStart(2, '0');
    return año + '-' + mes + '-' + día;
}

// Hash de la contraseña con PBKDF2 (SHA-256) y el salt del usuario, igual que app.js
async function hashPassword(password, saltHex)
{
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: hexToBytes(saltHex),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    return bytesToHex(new Uint8Array(bits));
}

// Minutos del día i: un número fijo entre 20 y 90 (sin Math.random, para que
// los datos sean siempre los mismos y se puedan comparar entre pruebas).
function minutosDelDía(indice)
{
    return 20 + ((indice * 17 + 9) % 71);
}

// Las sesiones de los últimos 60 días. Hay días vacíos a propósito: así se
// comprueba que el gráfico de barras marca la ausencia.
function crearSesiones()
{
    const sesiones = [];
    const hoy = new Date();

    for (let indice = 59; indice >= 0; indice--)
    {
        const día = new Date(hoy.getTime());
        día.setDate(día.getDate() - indice);
        const fecha = fechaATexto(día);

        // Un día de cada siete no se estudió nada
        if (indice % 7 === 3) continue;

        sesiones.push({
            date: fecha,
            topic: TEMAS[indice % TEMAS.length],
            minutes: minutosDelDía(indice)
        });

        // De vez en cuando, una segunda sesión el mismo día
        if (indice % 3 === 0)
        {
            sesiones.push({
                date: fecha,
                topic: TEMAS[(indice + 2) % TEMAS.length],
                minutes: 15 + ((indice * 11) % 26)
            });
        }
    }

    return sesiones;
}

function mostrar(texto, error)
{
    resultado.textContent = '';
    resultado.appendChild(document.createTextNode(texto));
    resultado.style.background = error ? '#fef2f2' : '#ecfdf5';
    resultado.style.borderColor = error ? '#fca5a5' : '#6ee7b7';
    resultado.classList.remove('oculto');
}

async function crear()
{
    boton.disabled = true;
    boton.textContent = 'Creando la cuenta…';

    // Si ya existía, no se toca nada: borrar datos sin avisar es peor que parar
    const guardado = localStorage.getItem(USUARIOS_KEY);
    let usuarios = [];

    try
    {
        usuarios = guardado ? JSON.parse(guardado) : [];
        if (!Array.isArray(usuarios)) usuarios = [];
    }
    catch (error)
    {
        usuarios = [];
    }

    if (usuarios.some(user => user && user.usernameKey === NOMBRE_USUARIO))
    {
        mostrar('La cuenta "feirt" ya existía en este navegador: no se ha tocado nada. Abre index.html y entra con ella.', true);
        boton.disabled = false;
        boton.textContent = 'Volver a intentarlo';
        return;
    }

    if (localStorage.getItem(SESIONES_KEY))
    {
        mostrar('Ya hay sesiones guardadas en la cuenta "feirt": no se han sobrescrito. Abre index.html y compruébalo.', true);
        boton.disabled = false;
        boton.textContent = 'Volver a intentarlo';
        return;
    }

    if (typeof crypto === 'undefined' || !crypto.subtle)
    {
        mostrar('Este navegador no permite usar un hash seguro (falta la Web Crypto API). No se ha creado nada.', true);
        boton.disabled = false;
        boton.textContent = 'Volver a intentarlo';
        return;
    }

    // Salt aleatorio de 16 bytes, igual que la app
    const saltBytes = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(saltBytes);
    const salt = bytesToHex(saltBytes);

    const passwordHash = await hashPassword(CONTRASENA, salt);
    const sesiones = crearSesiones();

    usuarios.push({
        username: NOMBRE_USUARIO,
        usernameKey: NOMBRE_USUARIO,
        passwordHash: passwordHash,
        salt: salt,
        createdAt: fechaATexto(new Date()),
        // "role" no lo usa la app todavía: está ahí por si Feirt quiere en el
        // futuro funcionalidad de administrador. No abre ni cierra nada por sí solo.
        role: 'admin'
    });

    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
    localStorage.setItem(SESIONES_KEY, JSON.stringify(sesiones));

    let minutos = 0;
    for (const sesión of sesiones)
    {
        minutos += sesión.minutes;
    }

    mostrar('Listo. Cuenta "feirt" creada con ' + sesiones.length + ' sesiones (' + minutos
        + ' min en total). Cierra esta pestaña, abre index.html y entra con la contraseña '
        + CONTRASENA + '.');
}

boton.addEventListener('click', () =>
{
    crear().catch(error =>
    {
        mostrar('Algo ha fallado al crear la cuenta: ' + error.message, true);
        boton.disabled = false;
        boton.textContent = 'Volver a intentarlo';
    });
});
