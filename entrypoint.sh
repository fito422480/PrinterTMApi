#!/bin/bash
set -e

# Verificar si existe un archivo de configuración en el volumen
if [ -f /app/config/.env ]; then
  echo "Cargando configuración desde volumen montado..."
  cp /app/config/.env /app/.env
fi

# Si se proporciona un archivo de configuración como variable de entorno
if [ -n "$CONFIG_FROM_ENV" ]; then
  echo "Generando archivo .env desde variable CONFIG_FROM_ENV..."
  echo "$CONFIG_FROM_ENV" > /app/.env
fi

# Asegurarse de que existe un archivo .env con valores por defecto si no se proporciona
if [ ! -f /app/.env ]; then
  echo "Generando archivo .env por defecto..."
  echo "PORT=${PORT:-9500}" > /app/.env
  echo "DB_USER=${DB_USER:-mundo2}" >> /app/.env
  echo "DB_PASSWORD=${DB_PASSWORD:-Tigo2014!}" >> /app/.env
  echo "DB_HOST=${DB_HOST:-10.255.8.19:1521/KIRA}" >> /app/.env
  echo "DB_SCHEMA=${DB_SCHEMA:-MUNDO2}" >> /app/.env
  echo "DB_TABLE=${DB_TABLE:-MFS_INVOICE}" >> /app/.env
  echo "URL_FRONTEND=${URL_FRONTEND:-http://mfs-invoice-web-ui.qa.sec.telecel.net.py/}" >> /app/.env
  echo "WORKER_COUNT=${WORKER_COUNT:-4}" >> /app/.env
  echo "INSTANT_CLIENT_DIR=${INSTANT_CLIENT_DIR:-/opt/oracle/instantclient_12_2}" >> /app/.env
  echo "API_KEY=${API_KEY:-change-me-in-production}" >> /app/.env
fi

# Asegurarse de que el archivo .env tiene permisos correctos
chmod 600 /app/.env

# Comprobar la conexión a la base de datos antes de iniciar la aplicación
echo "Verificando conexión a la base de datos..."
DB_HOST_VALUE=$(grep DB_HOST /app/.env | cut -d '=' -f2)
DB_HOST_PARTS=(${DB_HOST_VALUE//:/ })
DB_SERVER=${DB_HOST_PARTS[0]}
DB_PORT=${DB_HOST_PARTS[1]%%/*}

# Intentar conectar al servidor de base de datos (sin realizar una conexión completa)
if nc -z -w5 $DB_SERVER $DB_PORT; then
  echo "Conexión a servidor de base de datos establecida correctamente."
else
  echo "ADVERTENCIA: No se pudo conectar al servidor de base de datos $DB_SERVER:$DB_PORT"
  echo "La aplicación intentará conectarse durante la ejecución."
fi

# Ejecutar node con los parámetros que se pasen
echo "Iniciando aplicación Node.js..."
exec node "$@"
