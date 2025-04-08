#!/bin/bash
# Script para limpiar todos los recursos de Docker:
# Contenedores, imágenes, volúmenes, redes y caché.

# Detiene todos los contenedores en ejecución
echo "Deteniendo todos los contenedores en ejecución..."
docker stop $(docker ps -q) 2>/dev/null

# Elimina todos los contenedores
echo "Eliminando todos los contenedores..."
docker rm $(docker ps -a -q) 2>/dev/null

# Elimina todas las imágenes
echo "Eliminando todas las imágenes..."
docker rmi $(docker images -q) 2>/dev/null

# Elimina todos los volúmenes
echo "Eliminando todos los volúmenes..."
docker volume rm $(docker volume ls -q) 2>/dev/null

# Elimina todas las redes personalizadas (no elimina las predeterminadas: bridge, host, none)
echo "Eliminando todas las redes personalizadas..."
docker network prune -f

# Limpia el sistema de Docker (elimina imágenes colgantes, contenedores parados, volúmenes no usados, etc.)
echo "Limpiando la caché y recursos no utilizados..."
docker system prune -af

echo "¡Limpieza completa de Docker!"
# Fin del script
# Nota: Este script eliminará todos los recursos de Docker, así que asegúrate de que no necesitas nada antes de ejecutarlo.
# Puedes ejecutar este script con permisos de superusuario si es necesario:
# sudo ./docker-cleanup.sh
