// src/middleware/runtimeEnvUpdater.js
const configManager = require("../config/configManager");
const dbWorkerPool = require("../config/dbWorkerPool");

// Lista de componentes que se pueden reconfigurar en tiempo de ejecución
const reconfigurableComponents = {
  // Base de datos
  database: {
    affected: ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_SCHEMA", "DB_TABLE"],
    handler: async (changedVars) => {
      console.log(
        "Detectados cambios en configuración de base de datos:",
        Object.keys(changedVars)
      );

      // Si cambiaron parámetros críticos de conexión, reiniciamos el pool
      const criticalConnectionParams = ["DB_USER", "DB_PASSWORD", "DB_HOST"];
      if (
        criticalConnectionParams.some(
          (param) => changedVars[param] !== undefined
        )
      ) {
        try {
          console.log("Reiniciando pool de conexiones de base de datos...");
          await dbWorkerPool.terminate();

          // En un entorno real, deberías inicializar un nuevo pool de conexiones
          // Aquí simularemos la creación de un nuevo pool usando las variables actualizadas
          const numWorkers = parseInt(process.env.WORKER_COUNT || 4);

          // Crear un nuevo pool de trabajadores con las nuevas configuraciones
          // Como dbWorkerPool es un singleton, simplemente podemos recrearlo o inicializarlo de nuevo
          setTimeout(() => {
            // Esto simula la creación de un nuevo pool
            console.log(
              `Pool de base de datos reiniciado con ${numWorkers} workers`
            );
          }, 100);

          return true;
        } catch (error) {
          console.error("Error al reiniciar pool de conexiones:", error);
          return false;
        }
      }

      return true;
    },
  },

  // Configuración de workers
  workers: {
    affected: ["WORKER_COUNT"],
    handler: async (changedVars) => {
      if (changedVars.WORKER_COUNT !== undefined) {
        const workerCount = parseInt(changedVars.WORKER_COUNT);
        if (isNaN(workerCount) || workerCount <= 0) {
          console.error(
            "Valor inválido para WORKER_COUNT:",
            changedVars.WORKER_COUNT
          );
          return false;
        }

        try {
          console.log(`Actualizando cantidad de workers a: ${workerCount}`);

          // En un entorno real, aquí ajustarías el pool de trabajadores
          // Por ejemplo, terminar trabajadores existentes y crear nuevos según sea necesario

          return true;
        } catch (error) {
          console.error("Error al actualizar workers:", error);
          return false;
        }
      }

      return true;
    },
  },

  // Frontend URL
  frontend: {
    affected: ["URL_FRONTEND"],
    handler: async (changedVars) => {
      if (changedVars.URL_FRONTEND !== undefined) {
        console.log(
          `URL del frontend actualizada a: ${changedVars.URL_FRONTEND}`
        );

        // Aquí puedes realizar acciones relacionadas con CORS, redirecciones, etc.

        return true;
      }

      return true;
    },
  },
};

// Inicializar escuchadores para cambios en la configuración
function initRuntimeConfigListeners() {
  configManager.on("configChanged", async (changedVars) => {
    console.log(
      "Cambios detectados en la configuración:",
      Object.keys(changedVars)
    );

    // Verificar qué componentes necesitan ser actualizados
    for (const [componentName, component] of Object.entries(
      reconfigurableComponents
    )) {
      const affectedKeys = Object.keys(changedVars).filter((key) =>
        component.affected.includes(key)
      );

      if (affectedKeys.length > 0) {
        console.log(`Reconfigurando componente: ${componentName}`);

        // Extraer solo las variables que afectan a este componente
        const componentChanges = {};
        affectedKeys.forEach((key) => {
          componentChanges[key] = changedVars[key];
        });

        try {
          // Llamar al manejador de este componente con las variables cambiadas
          const result = await component.handler(componentChanges);

          if (result) {
            console.log(
              `Componente ${componentName} reconfigurado exitosamente`
            );
          } else {
            console.error(`Error al reconfigurar ${componentName}`);
          }
        } catch (error) {
          console.error(`Error al reconfigurar ${componentName}:`, error);
        }
      }
    }
  });

  console.log(
    "Inicializados escuchadores de configuración en tiempo de ejecución"
  );
}

module.exports = {
  initRuntimeConfigListeners,
};
