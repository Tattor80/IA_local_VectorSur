# Estado RAG (local)

Fecha: 2026-01-02

## Hecho
- RAG persistente integrado en la app (Qdrant + embeddings Ollama).
- Endpoints:
  - /api/rag/ingest (ingesta manual)
  - /api/rag/query (consulta)
  - /api/rag/ingest-folder (ingesta de carpeta local)
- Chat injecta contexto RAG en /api/chat.
- UI local para ingesta en /rag.
- Soporte de PDF + Excel (xlsx, xls) en ingesta de carpeta.
- Dependencias instaladas (xlsx ya incluido) y package-lock.json actualizado.
- Creado `.env.local` con RAG habilitado y carpeta default en `docs`.
- Se corrigio crash en UI cuando falta modelo (null-safe en Chat).
- Agregada traduccion es-ES para "Unknown model".
- Creado `start-app.bat` para iniciar la app y abrir el navegador.
- Ollama instalado y modelo `mistral` descargado.
- `/api/models` verificado en `http://localhost:3003` (muestra `mistral:latest`).

## Configuracion clave
- RAG_ENABLED="true"
- RAG_QDRANT_URL="http://127.0.0.1:6333"
- RAG_COLLECTION="chatbot_ollama"
- RAG_EMBED_MODEL="nomic-embed-text"
- RAG_DEFAULT_FOLDER="C:\\Users\\jose\\Desktop\\chatbot-ollama-main\\docs"
- NEXT_PUBLIC_RAG_DEFAULT_FOLDER="C:\\Users\\jose\\Desktop\\chatbot-ollama-main\\docs"
- OLLAMA_HOST="http://127.0.0.1:11434" (opcional si Ollama no esta en default)

## Pendiente
- Asegurar Docker Desktop con engine corriendo (estado verde) y `docker` en PATH.
- Levantar Qdrant local (contenedor) o definir Qdrant remoto.
- Probar ingesta desde `/rag` (UI) y consultar con RAG.
- Ajustar `start-app.bat` para fijar el puerto de Next si se requiere 3003.
- (Opcional) Agregar acceso a `/rag` desde la UI principal.
- (Opcional) Mejorar manejo de errores y feedback durante ingesta.

## Avances 2026-01-06
- Docker Desktop activo; `docker info` OK.
- Qdrant levantado en Docker y `healthz` OK en `http://127.0.0.1:6333`.
- Creada carpeta de conocimiento: `C:\\Users\\jose\\Desktop\\chatbot-ollama-main\\documentacion-rag`.
- `.env.local` actualizado para usar `documentacion-rag` como carpeta default.
- Creado archivo de prueba: `documentacion-rag\\rag-prueba.xlsx`.
- App dev levantada en `http://localhost:3003` (sin Turbopack).
- Modelo de embeddings `nomic-embed-text` descargado en Ollama.
- `start-app.bat` actualizado para desactivar Turbopack, esperar server y abrir navegador.
- Bug corregido: IDs de puntos en Qdrant (ahora UUID por chunk).
- Ingesta OK con XLSX y consulta RAG OK.
- PDF de prueba valido generado e ingestado OK.
- Consulta RAG OK con PDF y XLSX.

## Avances 2026-01-07
- System Prompt probado: `mistral:latest` lo ignora; `llama3:latest` lo respeta.
- Backend cambiado a `/api/chat` de Ollama para mensajes con rol `system`.
- Parser NDJSON de streaming corregido.
- Modelo por defecto actualizado a `llama3:latest`.
- UI agrega advertencia si el modelo puede ignorar el System Prompt.

## Avances 2026-01-07 (continuacion)
- `/api/chat` vuelto a `nodejs` para evitar sandbox Edge y permitir fetch a Qdrant/Ollama locales.
- Handler de `/api/chat` adaptado a `NextApiRequest/NextApiResponse` con streaming en Node.
- Qdrant levantado y `healthz` OK en `http://127.0.0.1:6333`.
- RAG validado con XLSX de prueba (respuesta correcta `RAG de prueba`).
- Creado inventario en `documentacion-rag\\inventario-ferreteria.xlsx`.
- `start-app.bat` actualizado para iniciar Docker Desktop, levantar Qdrant, esperar `healthz` y luego iniciar la app.

## Avances 2026-01-08
- Verificado que `inventario-ferreteria.xlsx` esta en `RAG_DEFAULT_FOLDER`.
- UI de `/rag` ahora permite "Examinar carpeta" y "Examinar archivos" para ingesta puntual.
- Nuevo endpoint `/api/rag/ingest-files` para ingestar archivos seleccionados desde la UI.
- Agregado acceso a "RAG Ingestion" desde la home (sidebar).

## Bloqueos / Observaciones
- Con Turbopack activo, los endpoints `/api/*` se quedan colgados.
- El PDF de prueba inicial era invalido (error `bad XRef entry`); se reemplazo por uno valido.

## Pendiente proxima sesion
- Revisar mejoras UI/UX y logica (lista abajo) y priorizar cambios.
- Decidir si se mantiene Turbopack desactivado por defecto en dev.
- Opcional: reingestar documentos reales en `documentacion-rag`.
- Verificar en UI que el System Prompt se respete con `llama3:latest`.
- Actualizar `docker-compose.yml` si se quiere fijar `DEFAULT_MODEL=llama3:latest`.
- (Opcional) Agregar mas modelos a la lista de advertencia si ignoran System Prompt.
- Probar `start-app.bat` desde doble click y confirmar que levanta Docker/Qdrant sin conflictos.
- Ingestar `inventario-ferreteria.xlsx` y validar consultas RAG con precios/cantidades.
- Validar acceso a `/rag` desde home y probar ingesta con "Examinar archivos".

## Notas tecnicas / mejoras propuestas
- UI: Boton "Stop Generating" no tiene onClick (falta `handleStopConversation`).
- UI: Prompts filtrados usan `prompts.length` en vez de `filteredPrompts.length`.
- UI: `alert()` en input vacio; migrar a toast.
- UI: Adjuntos muestran icono PDF fijo y un caracter raro; mejorar metadata.
- App: Adjuntos guardan texto completo en historial/localStorage (riesgo de limite).
- App: Ingesta por carpeta no acepta `.txt/.md` aunque UI soporta adjuntos de texto.
- App: `Math.random()` como key en CodeBlock.
- App: `if (!false)` en streaming (codigo muerto).

## Notas
- La ingesta por carpeta recorre subcarpetas y omite archivos muy grandes (RAG_MAX_FILE_MB, default 50).
- El RAG inyecta contexto en el prompt como "Context:" antes del prompt de usuario.
- Docker Desktop instalado; el engine aun devolvio 500 desde el CLI.
- Docker CLI instalado en `C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe`.

## Avances 2026-01-11
- **Solución Definitiva System Prompt**:
  - Implementado "Post-Prompting" (Sandwich Strategy): El system prompt se envía al inicio (standard) Y al final del mensaje del usuario (`IMPORTANT_INSTRUCTION: ...`).
  - Esto fuerza la adherencia incluso en modelos "rebeldes" como Llama 3 o cuando hay mucho contexto RAG.
  - Eliminado código legacy de `SYSTEM_PROMPT_UNRELIABLE_MODELS`; ahora la estrategia es universal.
- **UI System Prompts**:
  - Agregado botón "Librería" (icono libro) junto al input de System Prompt.
  - Solucionado bug en `PromptList.tsx` donde el clic no seleccionaba el prompt correctamente.
- **Mejoras Backend**:
  - `OllamaModel` ahora incluye detalles técnicos (`parameter_size`, `quantization_level`) extraídos de `/api/tags`.
  - Logging mejorado en `chat.ts` para depuración (payloads JSON).
- **Validación RAG**:
  - Verificado que el chatbot responde correctamente preguntas de inventario con datos de `inventario-ferreteria.xlsx` (Martillos: 25, Destornilladores: 60, etc.).
  - Confirmado que mantiene la persona ("Jefe") mientras usa RAG.
- **Verificación**:
  - Creado script `verify_system_prompt.ps1` para pruebas automatizadas de adherencia.
  - Ejecutadas pruebas de navegador confirmando flujo completo UI + Backend.

## Sprint Enterprise 2026-01-11 (Evening)

### 🎨 Rebranding a Vector Sur AI
- **Archivos modificados**: LICENSE, README.md, package.json (v2.0.0), pages/_document.tsx, pages/api/home/home.tsx
- **UI Updates**: Header "Vector Sur AI" con gradiente, footer "Powered by local AI models"
- **Locales**: Descripción en español actualizada en `public/locales/es/chat.json`
- Unificado branding entre páginas Home y RAG

### 📊 RAG Ingestion UX Mejorada
- **Archivo**: `pages/rag.tsx`
- Añadida barra de progreso con porcentaje (0-100%)
- Indicador de archivo actual procesándose (📄 filename.pdf)
- Mensajes de estado con emojis: ✅ completado, ❌ error
- Contador de archivos procesados al finalizar
- Branding Vector Sur AI consistente

### 🟢 Indicadores de Estado de Conexión
- **NUEVO**: `components/Chatbar/components/ConnectionStatus.tsx`
- **NUEVO**: `pages/api/rag/status.ts` - Endpoint health check Qdrant
- Indicadores en sidebar: 🟢 Ollama OK, 🟡 Sin datos, 🔴 Error
- Auto-refresh cada 30 segundos

### 🎯 Welcome Cards (Onboarding)
- **Archivo**: `components/Chat/Chat.tsx`
- Tarjeta "RAG Ingestion" clickeable con descripción en español
- Tarjeta "Consejo Pro" explicando system prompts
- Diseño profesional con hover effects

### ✅ Verificación Final
- Demo completa grabada mostrando flujo RAG
- Test de chat con pregunta de inventario: IA devolvió 11 productos correctamente
- Datos incluían: Martillo $12.99 (25), Destornillador $5.50 (60), Taladro $89.90 (4), etc.

### 📝 Estado del Producto
- **Listo para demos enterprise** ✅
- Branding consistente
- UX profesional con feedback visual
- RAG funcional con documentos reales
