#!/bin/sh
# Script para verificar y aplicar actualizaciones de configuración

# Verificar si existen variables de entorno necesarias
if [ -z "$API_ENDPOINT" ]; then
  echo "Error: Se requieren las variables de entorno API_ENDPOINT y API_KEY"
  exit 1
fi

# Verificar si existe el archivo de configuración externa
CONFIG_FILE="/scripts/runtime-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "No se encontró archivo de configuración en $CONFIG_FILE"
  exit 0
fi

echo "Verificando actualizaciones de configuración..."

# Leer el archivo de configuración
CONFIG_DATA=$(cat "$CONFIG_FILE")

# Enviar la configuración al API
echo "Enviando configuración al punto final: $API_ENDPOINT"
RESPONSE=$(curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d "$CONFIG_DATA" \
  "$API_ENDPOINT")

# Verificar la respuesta
if echo "$RESPONSE" | grep -q "success"; then
  echo "Actualización aplicada exitosamente:"
  echo "$RESPONSE" | grep -o '"message":"[^"]*"'
else
  echo "Error al aplicar la actualización:"
  echo "$RESPONSE"
fi

# Verificar si se necesita persistir la configuración
PERSIST=$(grep "\"persist\":\s*true" "$CONFIG_FILE")
if [ -n "$PERSIST" ]; then
  echo "Persistiendo configuración..."
  PERSIST_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    "$API_ENDPOINT/persist")

  if echo "$PERSIST_RESPONSE" | grep -q "success"; then
    echo "Configuración persistida exitosamente"
  else
    echo "Error al persistir la configuración:"
    echo "$PERSIST_RESPONSE"
  fi
fi

echo "Verificación de configuración completada"
