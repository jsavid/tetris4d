# Cómo Publicar Tetris 4D en GitHub y Jugar Online

Has creado "TETRIS 4D". Para subirlo a un nuevo repositorio llamado `tetris4d` y activarlo online, sigue estos pasos:

## 1. Preparar el Nuevo Repositorio

1. Ve a tu cuenta de GitHub (github.com).
2. Crea un **Nuevo Repositorio** y llámalo: `tetris4d`.
3. No añadas `README`, ni `.gitignore` por ahora (repositorio vacío).

## 2. Subir los Archivos desde tu Ordenador

Abre tu terminal (PowerShell o CMD) en la carpeta donde tienes el juego ahora y ejecuta estos comandos uno a uno:

```powershell
# Inicializar git si no lo has hecho
git init

# Añadir todos los archivos
git add .

# Guardar los cambios
git commit -m "Versión Inicial Tetris 4D"

# Conectar con tu nuevo repositorio (CAMBIA 'usuario' por tu nombre de usuario real de GitHub)
git remote add origin https://github.com/TU_USUARIO/tetris4d.git

# Subir el código
git branch -M main
git push -u origin main
```

*(Si `git remote add origin` da error porque ya existe, usa primero: `git remote remove origin`)*

## 3. Activar el Juego Online (GitHub Pages)

1. Ve a la página de tu repositorio `tetris4d` en GitHub.
2. Haz clic en **Settings** (Configuración) > **Pages** (en el menú lateral izquierdo).
3. En **Source**, selecciona `Deploy from a branch`.
4. En **Branch**, selecciona `main` y la carpeta `/ (root)`.
5. Haz clic en **Save**.

¡Listo! En unos minutos, GitHub te dará un enlace (algo como `https://tu-usuario.github.io/tetris4d/`) donde cualquiera podrá jugar a **TETRIS 4D** desde su navegador o móvil.
