# Chatbot Ollama by Vector Sur

## About

Chatbot Ollama is an enterprise-ready AI chat interface powered by Ollama, developed by **Vector Sur**.

Features include RAG (Retrieval-Augmented Generation), document upload, customizable system prompts, and multi-model support.

![Chatbot Ollama – Dark](./public/screenshots/screenshot-2025-09-dark.png)

![Chatbot Ollama – Light](./public/screenshots/screenshot-2025-09-light.png)

## Highlights (new)

- Blue theme polished for light and dark modes with consistent sidebars, headers, and overlays.
- Document upload (PDF, TXT, MD):
  - PDFs parsed server‑side for reliability; text/markdown read client‑side.
  - The full (truncated) content is attached invisibly to the model prompt — the UI stays clean.
  - 50 MB size cap, 100 page cap (PDF), 50k characters per attachment.
- Image upload: attach images and send them to vision‑capable models (base64). Non‑vision models simply ignore images.
- Code blocks: copy button, language label, optional line numbers, line‑wrap toggle, and “download as file”.
- Streaming & control: Stop Generation button, auto‑scroll toggle (pause/resume when you scroll up).
- Keyboard shortcuts:
  - Enter to send, Shift+Enter for newline
  - Esc to blur input
  - Ctrl/Cmd+L clears the composer
  - Arrow Up recalls the last user message
- Error handling: a consistent toast shows details, Copy details, and Retry.
- Conversation tools: Copy messages button copies the whole visible conversation (with role labels and any attached content).
- Sidebar UX: search inputs are theme‑aware, prompts list matches chat list styling, improved hover/selection.

## Updates

Chatbot Ollama will be updated over time.

### Next up

- [ ] Model management (pull/delete)
- [ ] Model info/details dialog

## Docker

Build locally:

```shell
docker build -t chatbot-ollama .
docker run -p 3000:3000 chatbot-ollama
```

Pull from ghcr:

```bash
docker run -p 3000:3000 ghcr.io/ivanfioravanti/chatbot-ollama:main
```

## Running Locally

### 1. Clone Repo

```bash
git clone https://github.com/ivanfioravanti/chatbot-ollama.git
```

### 2. Move to folder

```bash
cd chatbot-ollama
```

### 3. Install Dependencies

```bash
npm ci
```

### 4. Run Ollama server

Either via the cli:

```bash
ollama serve
```

or via the [desktop client](https://ollama.ai/download)

### 5. Run App

```bash
npm run dev
```

### 6. Use It

You should be able to start chatting.

### Tips

- Attach documents via the paper icon in the composer - the content is included for the model invisibly so the chat stays uncluttered.
- Attach an image with the camera icon - vision models will "see" it; others will ignore it.
- Use the clipboard icon in the sticky header to copy the current conversation.

## Persistent RAG (local)

This project can inject retrieved context into chats using a local vector DB (Qdrant) + Ollama embeddings. Folder ingestion supports PDF and Excel files.

### 1. Start Qdrant (local)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2. Configure env vars

Set in `.env.local`:

```bash
RAG_ENABLED="true"
RAG_QDRANT_URL="http://127.0.0.1:6333"
RAG_COLLECTION="chatbot_ollama"
RAG_EMBED_MODEL="nomic-embed-text"
```

### 3. Ingest documents

Example with PowerShell:

```powershell
$body = @{
  documents = @(
    @{ text = "Your document text goes here"; metadata = @{ source = "notes.txt" } }
  )
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/rag/ingest -ContentType "application/json" -Body $body
```

### 3b. Ingest a local folder (UI)

Set in `.env.local`:

```bash
RAG_DEFAULT_FOLDER="C:\\path\\to\\docs"
NEXT_PUBLIC_RAG_DEFAULT_FOLDER="C:\\path\\to\\docs"
```

Then visit:

```
http://localhost:3000/rag
```

Use the UI to select file types and optionally clear the collection before re-ingesting.

### 4. (Optional) Test retrieval

```powershell
$body = @{ query = "What is this document about?" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/rag/query -ContentType "application/json" -Body $body
```

Once enabled, `/api/chat` will automatically retrieve relevant chunks and prepend them to the prompt.

## Configuration

When deploying the application, the following environment variables can be set:

| Environment Variable              | Default value                  | Description                                                                                                                               |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DEFAULT_MODEL                     | `llama3:latest`                 | The default model to use on new conversations                                                                                             |
| NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT | [see here](utils/app/const.ts) | The default system prompt to use on new conversations                                                                                     |
| NEXT_PUBLIC_DEFAULT_TEMPERATURE   | 1                              | The default temperature to use on new conversations                                                                                       |

## Contact

If you have any questions, feel free to reach out to me on [X](https://x.com/ivanfioravanti).
