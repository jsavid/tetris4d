@echo off
echo ========================================================
echo   SUBIENDO TETRIS 4D A GITHUB
echo ========================================================
echo.
echo 1. Inicializando repositorio...
git init

echo.
echo 2. Agregando archivos...
git add .

echo.
echo 3. Guardando version...
git commit -m "Upload Tetris 4D"

echo.
echo ========================================================
echo   IMPORTANTE: Necesito la URL de tu repositorio.
echo   Debe ser algo como: https://github.com/TU_USARIO/tetris4d.git
echo ========================================================
echo.
set /p REPO_URL="Pega aqui la URL de tu repositorio y pulsa ENTER: "

echo.
echo 4. Conectando con %REPO_URL%...
git remote remove origin
git remote add origin %REPO_URL%

echo.
echo 5. Subiendo archivos (Te pedira login si no estas logueado)...
git branch -M main
git push -u origin main

echo.
echo ========================================================
echo   SI TODO SALIO BIEN:
echo   1. Ve a %REPO_URL% en tu navegador.
echo   2. Ve a Settings -> Pages.
echo   3. En Source elige "Deploy from a branch" y selecciona "main".
echo   4. Guarda y espera el link.
echo ========================================================
pause
