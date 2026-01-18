# Vector Sur AI (Chatbot Ollama)

## Acerca de

**Vector Sur AI** es una interfaz de chat preparada para empresas impulsada por Ollama, desarrollada por **Vector Sur**.

Las características incluyen RAG (Generación Aumentada por Recuperación), carga de documentos, prompts del sistema personalizables y soporte para múltiples modelos.

![Vector Sur AI – Oscuro](./public/screenshots/screenshot-2025-09-dark.png)

![Vector Sur AI – Claro](./public/screenshots/screenshot-2025-09-light.png)

## Destacados (Novedades)

- **Tema Azul Intuitivo**: Optimizado para modos claro y oscuro con barras laterales, encabezados y superposiciones consistentes.
- **Carga de Documentos (PDF, TXT, MD)**:
  - Los PDF se procesan en el servidor para mayor fiabilidad; texto/markdown se leen en el cliente.
  - El contenido completo (truncado si es necesario) se adjunta invisiblemente al prompt del modelo — la interfaz se mantiene limpia.
  - Límite de 50 MB, 100 páginas (PDF), 50k caracteres por adjunto.
- **Carga de Imágenes**: Adjunta imágenes y envíalas a modelos con capacidad de visión (base64). Los modelos sin visión simplemente ignoran las imágenes.
- **Bloques de Código**: Botón de copiar, etiqueta de lenguaje, números de línea opcionales, alternar ajuste de línea y "descargar como archivo".
- **Streaming y Control**: Botón "Detener Generación", alternancia de auto-scroll (pausa/reanuda al desplazarse hacia arriba).
- **Atajos de Teclado**:
  - Enter para enviar, Shift+Enter para salto de línea.
  - Esc para desenfocar el input.
  - Ctrl/Cmd+L limpia el editor.
  - Flecha Arriba recupera el último mensaje del usuario.
- **Manejo de Errores**: Notificaciones (toast) consistentes con detalles, opción de copiar detalles y reintentar.
- **Herramientas de Conversación**: Botón para copiar toda la conversación visible (con etiquetas de roles y contenido adjunto).
- **UX de Barra Lateral**: Inputs de búsqueda adaptables al tema, lista de prompts coincide con el estilo de lista de chats, mejor selección/hover.

## Próximos Pasos (Roadmap)

Vector Sur AI se actualizará con el tiempo.

- [ ] Gestión de modelos (pull/delete)
- [ ] Diálogo de información/detalles del modelo

## Docker

Construir localmente:

```shell
docker build -t chatbot-ollama .
docker run -p 3000:3000 chatbot-ollama
```

Descargar de ghcr:

```bash
docker run -p 3000:3000 ghcr.io/ivanfioravanti/chatbot-ollama:main
```

## Ejecución Local

### 1. Clonar Repositorio

```bash
git clone https://github.com/Tattor80/IA_local_VectorSur.git
```

### 2. Entrar en la carpeta

```bash
cd IA_local_VectorSur
```

### 3. Instalar Dependencias

```bash
npm ci
```

### 4. Ejecutar servidor Ollama

Ya sea vía CLI:

```bash
ollama serve
```

o vía el [cliente de escritorio](https://ollama.ai/download).

### 5. Iniciar la App

```bash
npm run dev
```

### 6. Usar

Deberías poder empezar a chatear en `http://localhost:3000`.

### Consejos

- Adjunta documentos con el icono de clip — el contenido se incluye invisiblemente para el modelo.
- Adjunta una imagen con el icono de cámara — los modelos de visión la "verán"; otros la ignorarán.
- Usa el icono de portapapeles en el encabezado fijo para copiar la conversación actual.

## RAG Persistente (Local)

Este proyecto puede inyectar contexto recuperado en los chats usando una base de datos vectorial local (Qdrant) + embeddings de Ollama. La ingesta de carpetas soporta archivos PDF y Excel.

### 1. Iniciar Qdrant (local)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2. Configurar variables de entorno

En `.env.local`:

```bash
RAG_ENABLED="true"
RAG_QDRANT_URL="http://127.0.0.1:6333"
RAG_COLLECTION="chatbot_ollama"
RAG_EMBED_MODEL="nomic-embed-text"
```

### 3. Ingestar documentos

Ejemplo con PowerShell:

```powershell
$body = @{
  documents = @(
    @{ text = "Texto de tu documento aqui"; metadata = @{ source = "notas.txt" } }
  )
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/rag/ingest -ContentType "application/json" -Body $body
```

### 3b. Ingestar carpeta local (UI)

Configurar en `.env.local`:

```bash
RAG_DEFAULT_FOLDER="C:\\ruta\\a\\docs"
NEXT_PUBLIC_RAG_DEFAULT_FOLDER="C:\\ruta\\a\\docs"
```

Luego visita:

```
http://localhost:3000/rag
```

Usa la interfaz para seleccionar tipos de archivos y opcionalmente limpiar la colección antes de re-ingestar.

### 4. (Opcional) Probar recuperación

```powershell
$body = @{ query = "¿De que trata este documento?" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/rag/query -ContentType "application/json" -Body $body
```

Una vez habilitado, `/api/chat` recuperará automáticamente fragmentos relevantes y los antepondrá al prompt.

## Configuración

Al desplegar la aplicación, se pueden configurar las siguientes variables de entorno:

| Variable de Entorno               | Valor por defecto              | Descripción                                                                                                                               |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DEFAULT_MODEL                     | `llama3:latest`                 | El modelo por defecto para nuevas conversaciones                                                                                          |
| NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT | [ver aquí](utils/app/const.ts) | El prompt del sistema por defecto para nuevas conversaciones                                                                              |
| NEXT_PUBLIC_DEFAULT_TEMPERATURE   | 1                              | La temperatura por defecto para nuevas conversaciones                                                                                     |

## Contacto

Si tienes preguntas, no dudes en contactarnos.
