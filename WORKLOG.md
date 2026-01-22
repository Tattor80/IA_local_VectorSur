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

## Avances 2026-01-21 (RAG Fixes & Multi-Dept)

### 🐛 Fix: Actualización de RAG (Ingestión)
- **Problema:** Al re-ingestar un archivo con el mismo nombre, se duplicaban los vectores en Qdrant, generando respuestas repetidas o mezcladas.
- **Solución:** Implementada función `deleteDocumentsBySource` en `utils/server/rag.ts`.
- **Resultado:** Ahora, antes de ingestar un archivo, el sistema borra automáticamente cualquier vector previo asociado a ese path/nombre. La información siempre está fresca y sin duplicados.

### 🏠 UI Improvement: Botón Home
- Agregado botón de "Volver al Inicio" (flecha izquierda) en la cabecera de la página `/rag`. Facilita la navegación sin usar el botón atrás del navegador.

### 🏢 Feature: Soporte Multi-Departamento
- **Arquitectura**: Filtrado por Metadatos (Metadata Filtering) en una única colección.
- **Backend**:
    - `RagDocument` ahora incluye campo `category` (metadata).
    - `ingestDocuments` guarda este campo en Qdrant payload.
    - `searchSimilar` y `queryRagMatches` aceptan un filtro `department` opcional.
- **Frontend (Ingesta)**:
    - Nuevo selector "Department / Category" en `/rag`. Permite etiquetar documentos como *General, RRHH, Ventas, Soporte, Finanzas* o *Legal*.
- **Frontend (Chat)**:
    - Nuevo selector "Dept" en la cabecera del chat (`Chat.tsx`).
    - Permite filtrar las búsquedas RAG para que solo responda con documentos del departamento seleccionado.

### 🚀 Próximos Pasos Prochaine
- **Auto-etiquetado por carpeta**: Implementar lógica para que si se selecciona una carpeta (ej: `docs/RRHH`), el sistema asigne automáticamente la etiqueta `RRHH` a los archivos contenidos, sin necesidad de selección manual.

## Avances 2026-01-22
- **Feature: Auto-etiquetado por carpeta**:
  - Implementada lógica en frontend (`pages/rag.tsx`) para detectar automáticamente el departamento según el nombre de la carpeta seleccionada o escrita manualmente.
  - Palabras clave soportadas:
    - **RRHH**: "rrhh", "recursos humanos", "hr"
    - **Ventas**: "ventas", "sales", "comercial"
    - **Soporte**: "soporte", "support", "helpdesk", "tecnico"
    - **Finanzas**: "finanzas", "finance", "contabilidad", "facturacion"
    - **Legal**: "legal", "juridico", "contratos"
  - Funciona tanto con el botón "Examinar carpeta" como al escribir la ruta manualmente (onBlur).

- **Feature: Gestión de Colecciones Avanzada**:
  - Habilitado borrado selectivo de documentos.
  - Nuevo endpoint `/api/rag/delete`.
  - UI en `/rag` ahora lista los documentos ingestados agrupados por categoría.
  - Botones para eliminar archivo individual 🗑️ o categoría completa.
  - Actualizado endpoint `/api/rag/status` para soportar listado de documentos (`?details=true`).

- **Mejoras UI Chat y Personas**:
  - **Limpieza de Header**: Simplificado el encabezado del chat, eliminado selector de temperatura duplicado, y mejorado el estilo del selector de departamentos.
  - **Selector de Personas**: Implementado selector de roles predefinidos (Legal, Soporte, Ventas, etc.) en `SystemPrompt.tsx` para cambiar rápidamente el comportamiento del asistente.
  - **Correcciones Técnicas**: Solucionados errores de linting en `Chat.tsx` (tipos implícitos y retornos de `t`).

- **Feature: Citas RAG Interactivas (Source Highlighting)**:
  - **Backend**: Modificado `utils/server/rag.ts` y `pages/api/chat.ts` para enviar metadatos de las fuentes (título, texto, dept) al final del stream de respuesta.
  - **Frontend**: Nuevo componente `SourceBubble.tsx` que parsea la respuesta y muestra "badges" de fuentes al final del mensaje.
  - **Interactividad**: Los badges son desplegables (acordeón) y muestran el fragmento exacto de texto utilizado por la IA, junto con su departamento y porcentaje de relevancia (score).

- **Mejora UI Avanzada**:
  - **Limpieza Extrema del Header**: Eliminados indicadores técnicos (temp) de la barra principal.
  - **Menú Configuración Unificado**: Integrados controles de `SystemPrompt` (con selector de Personas) y `Temperatura` dentro del menú desplegable de "Ajustes" (⚙️), manteniéndolos accesibles pero ocultos por defecto.

- **Optimización de Cerebro RAG**:
  - **Super Prompt Activado**: Se ha definido un `DEFAULT_SYSTEM_PROMPT` robusto en `utils/app/const.ts`.
  - **Instrucciones Clave**: Manda a la IA a basarse exclusivamente en el contexto, evitar alucinaciones, ser directa y mantener tono corporativo. Esto soluciona problemas de "falta de entendimiento" de documentos.

- **Rediseño UX/UI Premium**:
  - **Tipografía**: Implementada fuente `Inter` (Google Fonts) para una lectura profesional.
  - **Glassmorphism**: Aplicado efecto de cristal/desenfoque en Sidebar y Header.
  - **Paleta de Colores**: Reemplazado azul plano por gradientes neutros (Gris oscuro/negro en modo oscuro, Blanco/Gris perla en modo claro) para un look "Enterprise SaaS".
  - **Contraste**: Corregidos problemas de texto blanco sobre blanco en modo claro.

- **Dashboard de Valor (Enterprise Feature)**:
  - **Servicio de Analíticas**: Nuevo `utils/app/analyticsService.ts` para tracking de consultas, documentos citados y tiempo de respuesta.
  - **Integración en Chat**: Cada respuesta exitosa registra automáticamente métricas (departamento, fuentes RAG, tiempo).
  - **Página `/analytics`**: Dashboard premium con:
    - Tarjetas KPI animadas (Total Consultas, Tiempo Respuesta, Docs Referenciados, Ahorro Estimado).
    - Gráfico de barras "Consultas por Departamento".
    - Top 5 Documentos Más Citados.
    - Calculadora de ROI (horas ahorradas, valor generado €30/h).
  - **Navegación Integrada**: Botón "📊 Dashboard" añadido al menú lateral.

- **Persistencia SQLite (Enterprise Feature)**:
  - **Dependencias**: Instalado `better-sqlite3` para acceso SQLite nativo desde Node.js.
  - **Servicio de BD**: Nuevo `utils/server/database.ts` con esquema (conversations, folders, prompts) y funciones CRUD.
  - **API Endpoints**: Creados `/api/db/conversations`, `/api/db/folders`, `/api/db/prompts` para persistencia.
  - **Frontend Híbrido**: Modificados `home.tsx`, `conversation.ts`, `folders.ts`, `prompts.ts` para guardar simultáneamente en localStorage (rápido) y SQLite (persistente).
  - **Migración Automática**: Al cargar, si SQLite está vacío pero localStorage tiene datos, se migran automáticamente.
  - **Base de Datos**: Archivo `vectorsur.db` se crea automáticamente en la raíz del proyecto.

- **Exportación PDF Profesional (Enterprise Feature)**:
  - **Dependencias**: Instalado `pdfkit` para generación de PDF.
  - **Endpoint**: `/api/export/pdf` genera PDF con:
    - Header con marca "Vector Sur AI" sobre fondo oscuro premium.
    - Metadatos (fecha, modelo, departamento).
    - Mensajes formateados con bordes de color por rol (azul=usuario, gris=asistente).
    - Footer con paginación y aviso de confidencialidad.
  - **UI**: Botón 📄 "Exportar PDF" añadido al header del Chat.
  - **UX**: Toast de carga, descarga automática, manejo de errores.

---

## 🚀 Release: Beta 2.0 (2026-01-22)

**Commit**: `2767897 🚀 Beta 2.0 - Enterprise Release`
**Tag**: `beta-2.0`
**GitHub**: `https://github.com/Tattor80/IA_local_VectorSur`

---

## 📋 Resumen de Sesión (2026-01-22)

### Logros del día:
1. ✅ Corregidos errores de linting en `Chat.tsx`, `ChatMessage.tsx`, `conversation.ts`
2. ✅ Implementadas **Citas RAG Interactivas** con badges clickeables
3. ✅ Añadido **Selector de Departamento** funcional (fix de stale closure)
4. ✅ Definido **Super Prompt RAG** por defecto para mejor comprensión de documentos
5. ✅ Rediseño **UI Premium**: Glassmorphism, tipografía Inter, gradientes neutros
6. ✅ Implementado **Dashboard de Valor** (`/analytics`) con KPIs y calculadora ROI
7. ✅ Implementada **Persistencia SQLite** (`vectorsur.db`) con migración automática
8. ✅ Implementada **Exportación PDF** profesional con membrete Vector Sur AI
9. ✅ Subido a GitHub como **Beta 2.0**

### Archivos clave creados/modificados:
- `utils/app/analyticsService.ts` - Servicio de tracking
- `utils/server/database.ts` - Servicio SQLite
- `pages/analytics.tsx` - Dashboard de valor
- `pages/api/db/conversations.ts` - API persistencia
- `pages/api/export/pdf.ts` - Generación PDF
- `components/Chat/SourceBubble.tsx` - Citas RAG interactivas

---

## 🔮 Próximos Pasos (Próxima Sesión)

### 1. Sistema de Configuración Avanzada
- [ ] Página `/settings` dedicada con todas las opciones
- [ ] Configuración de costes para calculadora ROI (€/hora personalizable)
- [ ] Temas de color personalizables
- [ ] Configuración de departamentos dinámicos

### 2. Sistema de Usuarios (Multi-tenant)
- [ ] Modelo de usuario en SQLite (id, email, role, createdAt)
- [ ] Autenticación básica (login/registro)
- [ ] Asociar conversaciones a usuarios
- [ ] Roles: Admin, Usuario, Solo-Lectura
- [ ] Panel de administración de usuarios

### 3. Auditoría y Compliance
- [ ] Tabla de logs en SQLite (userId, action, timestamp, details)
- [ ] API `/api/db/audit` para consultar logs
- [ ] Vista de auditoría en Dashboard

### 4. Mejoras Adicionales
- [ ] Búsqueda global de conversaciones
- [ ] Favoritos/Pins de conversaciones
- [ ] Exportación a Word (.docx)
- [ ] Modo offline completo con Service Worker

### 5. 🚀 Integración MCP + Google Workspace (Agent Mode)
**Objetivo**: Convertir Vector Sur AI en un agente que ejecute acciones.

#### Fase 1: Infraestructura
- [ ] Implementar MCP Client en el backend
- [ ] Sistema OAuth para Google (credenciales seguras)
- [ ] UI de confirmación de acciones sensibles

#### Fase 2: Google Workspace Tools
- [ ] **Gmail MCP**: Leer bandeja, buscar emails, enviar correos
- [ ] **Google Drive MCP**: Listar archivos, buscar documentos, descargar
- [ ] **Google Calendar MCP**: Ver agenda, crear eventos, recordatorios

#### Fase 3: Tool Calling en Chat
- [ ] Detectar intención del usuario para ejecutar acciones
- [ ] Mostrar preview de acción antes de ejecutar
- [ ] Feedback visual del resultado (✅ Email enviado, 📅 Evento creado)

**Recursos MCP**:
- Documentación: https://modelcontextprotocol.io
- Servers oficiales: `@anthropic/mcp-server-*`

---

## 📝 Notas Técnicas

### Dependencias añadidas hoy:
```json
"better-sqlite3": "^X.X.X",
"@types/better-sqlite3": "^X.X.X",
"pdfkit": "^X.X.X",
"@types/pdfkit": "^X.X.X"
```

### Base de datos SQLite:
- Archivo: `vectorsur.db` (raíz del proyecto)
- Tablas: `conversations`, `folders`, `prompts`
- Modo: WAL para mejor rendimiento

### Arquitectura de persistencia:
```
Frontend → localStorage (rápido)
        ↘
          API Routes → SQLite (persistente)
```
