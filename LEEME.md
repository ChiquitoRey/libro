# 📖 Nuestro libro — instructivo

Un libro de recuerdos virtual: hojas donde ponés títulos, textos, fotos, videos y audios **donde quieras**, con tres perfiles (vos, ella e invitados) y avisos de fechas especiales.

Todo es gratis y queda en **tus** cuentas:

| Parte | Servicio | Qué guarda |
|---|---|---|
| La página | **GitHub Pages** | El código de la app (sin datos) |
| Los datos | **Supabase** | Textos, hojas, usuarios y archivos (1 GB gratis, 50 MB por archivo) |

> 💡 **¿Querés probarla antes?** Abrí `index.html` con un servidor local (o subila directo a GitHub, paso 3) **sin** completar `js/config.js`: arranca en *modo demo*. Entrás con `ari`, `mile` o `invitado` y contraseña `demo`. En el modo demo no se guarda nada al recargar.

---

## Paso 1 — Crear la base de datos en Supabase (10 min)

1. Entrá a **https://supabase.com** → **Start your project** y creá la cuenta. Podés usar la de GitHub.
2. **New project**:
   - *Name*: `nuestro-libro`
   - *Database password*: inventá una y guardala. La app no la usa, pero no la pierdas.
   - *Region*: **South America (São Paulo)**, que es la más cercana.
   - Tocá **Create new project** y esperá 1 o 2 minutos.
3. En el menú de la izquierda, entrá a **SQL Editor** → **New query**.
   Abrí el archivo `supabase/esquema.sql`, copiá **todo**, pegalo y tocá **Run**. Tiene que decir *Success*.

### Cerrar la puerta a desconocidos 🔒
4. Andá a **Authentication** → **Sign In / Providers** (en algunas versiones está en *Settings*).
   **Desactivá "Allow new users to sign up"** y guardá.
   Así nadie puede crearse una cuenta solo: los usuarios los creás vos.

### Crear los 3 perfiles
5. Andá a **Authentication** → **Users** → **Add user** → **Create new user**:

   | Email | Contraseña | |
   |---|---|---|
   | `ari@nuestrolibro.app` | la tuya | ✅ tildá **Auto Confirm User** |
   | `mile@nuestrolibro.app` | la de ella | ✅ Auto Confirm User |
   | `invitado@nuestrolibro.app` | una para compartir | ✅ Auto Confirm User |

   > En la app **solo se escribe la parte de adelante** (`ari`, `mile`, `invitado`). El dominio `nuestrolibro.app` no tiene que existir. Si querés otro, cambialo también en `js/config.js`.
   > Podés crear más invitados (por ejemplo `familia`, `amigos`): todos arrancan como invitados.

6. Volvé al **SQL Editor**, pegá esto (cambiando los nombres si hace falta) y tocá **Run**:
   ```sql
   update public.perfiles set rol = 'dueno', nombre = 'Ari'  where usuario = 'ari';
   update public.perfiles set rol = 'dueno', nombre = 'Mile' where usuario = 'mile';
   ```
   Desde ese momento ustedes dos son **dueños**: ven y editan todo. Los demás son **invitados**: solo leen y no reciben nada de lo que ocultan.

### Copiar las dos "llaves"
7. Andá a **Project Settings** (⚙️ abajo a la izquierda) → **API** (o el botón **Connect** arriba).
   Copiá:
   - **Project URL** → algo como `https://abcdxyz.supabase.co`
   - **anon public** key, o **Publishable key** si aparece así (empieza con `eyJ…` o `sb_publishable_…`)
8. Abrí `js/config.js` con cualquier editor de texto (Bloc de notas sirve) y pegalas:
   ```js
   SUPABASE_URL: "https://abcdxyz.supabase.co",
   SUPABASE_KEY: "eyJhbGciOi...",
   ```
   > Esa llave **es pública a propósito**: la seguridad la ponen las reglas del paso 3. ⚠️ **Nunca** pongas la llave `service_role` o `secret`.

---

## Paso 2 — Publicar la página en GitHub Pages (5 min)

1. Creá una cuenta en **https://github.com** si no tenés.
2. Arriba a la derecha, **+** → **New repository**:
   - *Repository name*: `libro` (el enlace va a quedar `tuusuario.github.io/libro`)
   - Marcá **Public**. El plan gratis de Pages lo necesita. Se ve el *código*, pero **nunca los recuerdos**: esos están en Supabase, detrás del usuario y la contraseña.
   - **Create repository**.
3. Tocá **uploading an existing file** y arrastrá **todo el contenido** de la carpeta (`index.html`, `sw.js`, `manifest.webmanifest`, `LEEME.md` y las carpetas `css`, `js`, `icons`, `supabase`). Después, **Commit changes**.
4. La carpeta **`.github`** queda oculta en Windows y Mac, así que creala a mano:
   **Add file** → **Create new file**, escribí como nombre `.github/workflows/mantener-activo.yml`, pegá el contenido de ese archivo (está en el .zip) y **Commit changes**.
5. Andá a **Settings** → **Pages** → en *Branch* elegí **main** y **/(root)** → **Save**.
   En 1 o 2 minutos aparece arriba: **"Your site is live at https://tuusuario.github.io/libro/"** 🎉

---

## Paso 3 — Que Supabase no se duerma nunca (5 min)

El plan gratis de Supabase **pausa el proyecto si pasa 7 días sin uso**. Hay dos "despertadores" automáticos que lo consultan cada 3 días. Configurá los dos.

### A) GitHub Actions (principal)
1. En tu repositorio: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Creá dos:
   - `SUPABASE_URL` = tu Project URL
   - `SUPABASE_KEY` = la misma llave de `config.js`
2. Andá a la pestaña **Actions**. Si pregunta, tocá **I understand… enable them**.
3. Entrá a **Mantener activo Supabase** → **Run workflow** para probarlo. A los segundos tiene que aparecer un ✅ verde.

Desde ahí corre solo cada 3 días. Además anota la fecha en `ultimo-ping.txt`, así GitHub nunca lo apaga por inactividad.

### B) cron-job.org (respaldo)
1. Creá una cuenta gratis en **https://cron-job.org** → **Create cronjob**.
2. *URL*: `https://TU-PROYECTO.supabase.co/rest/v1/rpc/ping`
3. *Schedule*: **Every day**. Es liviano y más seguro.
4. En **Advanced**:
   - *Request method*: **POST**
   - *Headers*: agregá `apikey` = tu llave, y `Authorization` = `Bearer TU-LLAVE`
   - *Request body*: `{}`
5. Guardá y tocá **Test run**: tiene que dar **200 OK**.

> Si alguna vez se pausara igual, entrás a supabase.com, abrís el proyecto, tocás **Restore** y no se pierde nada.

---

## Paso 4 — Instalarla como app en el celular 📱

Abrí el enlace en el celular y entrá con tu usuario.
- **iPhone**: en **Safari** → botón **Compartir** → **Agregar a inicio**.
- **Android**: en **Chrome** → menú **⋮** → **Instalar app** (o *Agregar a pantalla principal*).

Queda con su ícono y se abre a pantalla completa, como cualquier app.

---

## Paso 5 — Fechas especiales y avisos 🎂

1. Tocá la **ruedita ⚙️** → **Fechas especiales** → **+ Agregar fecha**. Ponés emoji, nombre, día y si se repite cada año.
2. Aparecen en la tapa con cuenta regresiva, y arriba se ve un aviso cuando falta una semana o menos.
3. Para recibir **notificaciones en el celular**, tocá **Descargar calendario (.ics)** y abrilo. Se agrega al calendario del teléfono y te avisa **una semana antes** (9 a. m.) y **el mismo día** (9 a. m.), todos los años. Pasáselo también a Mile.
   > Si después agregás fechas nuevas, descargalo y abrilo de nuevo. Si alguna fecha te aparece dos veces en el calendario, borrá la vieja.

---

## Cómo se usa ✍️

| Quiero… | Cómo |
|---|---|
| Pasar de hoja | Flechas, deslizar con el dedo o las teclas ← → |
| Editar | Tocá el **lápiz** ✏️ (solo dueños) |
| Agregar algo | Barra de abajo: **Título · Texto · Foto · Video · Audio · Hoja** |
| Mover | Arrastrá el elemento |
| Agrandar / achicar | Círculo de la esquina de abajo |
| Girar | Círculo de arriba (cerca de 0° se endereza solo) |
| Escribir | Tocá un texto ya seleccionado (o doble clic) |
| Negrita / cursiva | Seleccioná palabras y tocá **B** / **I** / **U** (sin selección, se aplica a todo el texto) |
| Letra, tamaño, color de un texto | Panel que aparece al seleccionarlo |
| Letra de todo el libro | **Ruedita ⚙️** → Formato de texto |
| Ocultar algo a los invitados | Seleccionalo → **👁 Visible para todos** → pasa a **Oculto a invitados** |
| Ocultar una hoja entera | En la barrita de arriba de la hoja, tocá el **ojo** |
| Describir una foto, video o audio | Al subirla, o después en el panel. Tildá *Mostrar la descripción en la hoja* para que se vea abajo |
| Ver una foto grande | Tocala (fuera del modo edición) |
| Cambiar el papel | Ruedita (todo el libro) o barrita de la hoja (solo esa) |
| Ir a una hoja | Botón **índice** ☰ |
| Letra más grande solo para leer | Ruedita → Lectura (cada uno en su dispositivo) |
| Cambiar mi contraseña | Tocá tu inicial (arriba a la derecha) |

### ¿De verdad los invitados no ven lo oculto?
Sí. Lo oculto **ni siquiera sale del servidor** hacia un invitado: las reglas de Supabase lo filtran antes. Y los archivos están en una carpeta privada, así que ni con un enlace directo pueden abrir una foto oculta.

### Límites del plan gratis
- **1 GB** de archivos en total y **50 MB** por archivo. Las fotos se comprimen solas al subirlas, así que entran cientos.
- Lo que más espacio ocupa son los **videos**. Si uno pesa más de 50 MB, recortalo o mandátelo por WhatsApp para que se comprima.
- Supabase gratis **no hace copias de seguridad**. De vez en cuando descargá las fotos importantes. Si querés, en *Storage → recuerdos* las ves todas.

---

## Archivos

```
index.html              la página
css/estilos.css         el diseño
js/config.js            ← TUS DATOS DE SUPABASE (lo único que editás)
js/app.js               la app
js/datos.js             conexión con Supabase (y modo demo)
sw.js                   permite instalarla como app
manifest.webmanifest    nombre e ícono de la app
icons/                  íconos
supabase/esquema.sql    base de datos y reglas de seguridad
.github/workflows/      el despertador automático
```
