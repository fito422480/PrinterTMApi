# PrinterTMApi

Backend API para el sistema de Facturador Frontend (`mfs-invoice-web-ui`). Esta API gestiona las facturas, estadísticas y analíticas, conectándose a una base de datos Oracle.

##  Descripción

Este proyecto es una aplicación Node.js construida con **Express** que sirve com API REST. Sus principales características incluyen:
- **Conexión a Oracle DB**: Utiliza `oracledb` y un Pool de Workers personalizado para manejar consultas de manera eficiente.
- **Clustering**: Soporte para clustering nativo de Node.js o réplicas mediante Docker + NGINX.
- **Caching**: Implementación de caché en memoria (`node-cache`) para optimizar respuestas de lectura.
- **Docker Ready**: Configuración completa con Docker y Docker Compose para despliegue escalable.

##  Requisitos Previos

- **Node.js**: v18 o superior recomendado.
- **Oracle Instant Client**: Necesario para la conexión con bases de datos Oracle (si se ejecuta localmente sin Docker).
- **Docker y Docker Compose**: Para el despliegue en contenedores.

##  Instalación y Ejecución Local

1.  **Clonar el repositorio:**
    ```bash
    git clone <url-del-repositorio>
    cd PrinterTMApi
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz (o asegúrate de tener las variables configuradas). Ejemplo de variables necesarias:
    ```env
    PORT=9500
    ENABLE_CLUSTERING=false
    # Oracle Configuration
    DB_USER=mi_usuario
    DB_PASSWORD=mi_password
    DB_HOST=10.255.8.19:1521/KIRA
    DB_SCHEMA=MUNDO2
    # Configuración de Oracle Client (Local)
    LD_LIBRARY_PATH=/opt/oracle/instantclient
    ```

4.  **Ejecutar la aplicación:**
    - Modo desarrollo (con nodemon):
      ```bash
      npm run dev
      ```
    - Modo producción:
      ```bash
      npm start
      ```

##  Despliegue con Docker

El proyecto incluye una configuración de `docker-compose` que levanta:
- **Backend API**: 2 réplicas (`backendapi1`, `backendapi2`).
- **NGINX**: Load balancer en el puerto `9502`.
- **Config Updater**: Servicio auxiliar para actualizar configuraciones.

Para iniciar el entorno completo:

```bash
docker-compose up -d --build
```

El servicio estará disponible a través de NGINX en `http://localhost:9502`.
Las instancias individuales escuchan en `9500` y `9501`.

##  Variables de Entorno

| Variable | Descripción | Valor por defecto / Ejemplo |
|----------|-------------|----------------------------|
| `PORT` | Puerto del servidor | `9500` |
| `ENABLE_CLUSTERING` | Activa el modo cluster nativo | `true` / `false` |
| `NUM_CLUSTERS` | Número de workers (si clustering activo) | `CPUs - 1` |
| `DB_USER` | Usuario de Oracle DB | `mundo2` |
| `DB_PASSWORD` | Contraseña de Oracle DB | - |
| `DB_HOST` | Host y servicio Oracle | `10.x.x.x:1521/KIRA` |
| `DB_SCHEMA` | Esquema de la base de datos | `MUNDO2` |
| `INSTANT_CLIENT_DIR` | Directorio del cliente Oracle | `/opt/oracle/instantclient...` |
| `WORKER_COUNT` | Tamaño del pool de workers para DB | `4` |

##  API Endpoints

### Invoices (`/invoices`)

- **GET /**
  - Obtiene un listado de facturas.
  - **Query Params:**
    - `id`: Filtrar por ID de factura.
    - `startDate`: Fecha inicio (`YYYY-MM-DD`).
    - `endDate`: Fecha fin (`YYYY-MM-DD`).
    - `page`: Número de página (Default: 1).
    - `limit`: Resultados por página (Default: 100).
  
- **POST /**
  - Crea una nueva factura.
  - **Body:**
    ```json
    {
      "traceId": "string",
      "requestId": "string",
      "invoiceOrigin": "string",
      "xmlReceived": "string (XML)",
      "status": "string"
    }
    ```

- **PUT /:id**
  - Actualiza una factura (específicamente el campo `xml_received`).
  - **Body:**
    ```json
    {
      "xml_received": "nuevo contenido xml"
    }
    ```

- **GET /stats**
  - Obtiene estadísticas mensuales de las facturas.

- **GET /analytics**
  - Obtiene análisis general de las facturas.

### Health Check

- **GET /test-db**
  - Verifica la conexión a la base de datos ejecutando `SELECT * FROM DUAL`.

##  Estructura del Proyecto

```
PrinterTMApi/
├── src/
│   ├── config/         # Configuración de DB y Worker Pool
│   ├── models/         # Modelos de datos (invoiceModel)
│   ├── routes/         # Definición de rutas (invoiceRoutes)
│   └── ...
├── scripts/            # Scripts de utilidad
├── app.cjs             # Punto de entrada de la aplicación
├── Dockerfile.api      # Definición de imagen Docker
├── docker-compose.yml  # Orquestación de contenedores
└── package.json        # Dependencias y scripts
```

##  Autor

**Adolfo Ayala**
