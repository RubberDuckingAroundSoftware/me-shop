import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const AGENT_SERVICE_URL =
  process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Recipe import proxy. Accepts three input sources and forwards a normalized
 * { source, url, text } payload to the Python recipe-extractor service:
 *   - URL  (JSON body)      → { source: "url", url }
 *   - Text (JSON body)      → { source: "text", text }
 *   - File (multipart form) → server extracts text, then { source: "file", text }
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  let source: string;
  let url: string | undefined;
  let text: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    // File upload — extract text server-side, then send text to the agent.
    const formData = await request.formData();
    const file = formData.get('file');
    source = 'file';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'File must be under 10MB.' },
        { status: 400 }
      );
    }

    try {
      text = await extractTextFromFile(file);
    } catch (e) {
      const message =
        e instanceof UnsupportedFileError
          ? e.message
          : 'Could not read that file. Try a different file.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    // JSON body (URL or text)
    const body = await request.json().catch(() => null);
    source = body?.source;
    url = typeof body?.url === 'string' ? body.url.trim() : undefined;
    text = typeof body?.text === 'string' ? body.text : undefined;

    if (source !== 'url' && source !== 'text') {
      return NextResponse.json(
        { error: 'source must be "url", "text", or a file upload.' },
        { status: 400 }
      );
    }
    if (source === 'url' && !url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    if (source === 'text' && !text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
  }

  let agentResponse: Response;
  try {
    agentResponse = await fetch(`${AGENT_SERVICE_URL}/extract-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, url, text }),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The extractor service isn't running. Start it with `cd agents && uvicorn main:app`",
      },
      { status: 503 }
    );
  }

  const data = await agentResponse.json().catch(() => ({}));
  if (!agentResponse.ok) {
    const message =
      (data && (data.detail || data.error)) ||
      `Extraction failed (${agentResponse.status}).`;
    return NextResponse.json({ error: message }, { status: agentResponse.status });
  }

  return NextResponse.json(data);
}

class UnsupportedFileError extends Error {}

/**
 * Turn an uploaded file into text for the LLM.
 * - text/markdown: read directly
 * - PDF: extract text with pdf-parse
 * - image: base64-encode behind an [IMAGE:...] marker for vision-capable models
 */
async function extractTextFromFile(file: File): Promise<string> {
  const type = file.type;

  if (
    type === 'text/plain' ||
    type === 'text/markdown' ||
    type === 'text/x-markdown'
  ) {
    return await file.text();
  }

  if (type === 'application/pdf') {
    const buffer = new Uint8Array(await file.arrayBuffer());
    // pdf-parse v2 exposes a PDFParse class (not a default function).
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (type.startsWith('image/')) {
    // The LLM needs to "see" the image for OCR. Encode as base64 behind a
    // marker so the agent service can route it to a vision-capable model.
    // If the configured model lacks vision, extraction degrades gracefully.
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    return `[IMAGE:${type}:${base64}]`;
  }

  // Fall back to reading as text; reject binary types we don't understand.
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return await file.text();
  }
  throw new UnsupportedFileError(
    'Unsupported file type. Try JPG, PNG, PDF, or TXT.'
  );
}
