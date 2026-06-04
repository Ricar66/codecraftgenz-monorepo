/**
 * Validação de arquivos do painel — magic-byte sniffing.
 *
 * NÃO confiamos no MIME enviado pelo cliente: lemos os primeiros bytes
 * do buffer para garantir que o arquivo realmente é do tipo declarado.
 *
 * Whitelist conservadora: PDF, PNG, JPG, GIF, WEBP, TXT/CSV.
 */
export interface AllowedKind {
  ext: string;
  mime: string;
  test: (buf: Buffer) => boolean;
}

const startsWith = (buf: Buffer, bytes: number[]) =>
  buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

const isPdf = (b: Buffer) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const isPng = (b: Buffer) =>
  startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isJpg = (b: Buffer) => startsWith(b, [0xff, 0xd8, 0xff]);
const isGif = (b: Buffer) =>
  startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
  startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const isWebp = (b: Buffer) =>
  b.length >= 12 &&
  startsWith(b, [0x52, 0x49, 0x46, 0x46]) && // RIFF
  b[8] === 0x57 &&
  b[9] === 0x45 &&
  b[10] === 0x42 &&
  b[11] === 0x50; // WEBP

// Texto/CSV: heurística — só caracteres imprimíveis ASCII + \r\n\t nos primeiros 512 bytes.
const isPlainText = (b: Buffer) => {
  const sample = b.subarray(0, Math.min(b.length, 512));
  for (const byte of sample) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
    if (byte < 0x20 || byte > 0x7e) return false;
  }
  return sample.length > 0;
};

const KINDS: AllowedKind[] = [
  { ext: 'pdf', mime: 'application/pdf', test: isPdf },
  { ext: 'png', mime: 'image/png', test: isPng },
  { ext: 'jpg', mime: 'image/jpeg', test: isJpg },
  { ext: 'gif', mime: 'image/gif', test: isGif },
  { ext: 'webp', mime: 'image/webp', test: isWebp },
  { ext: 'txt', mime: 'text/plain', test: isPlainText },
  { ext: 'csv', mime: 'text/csv', test: isPlainText },
];

export function detectKind(buf: Buffer): AllowedKind | null {
  for (const k of KINDS) {
    if (k.test(buf)) return k;
  }
  return null;
}

/**
 * Sanitiza um nome de arquivo para EXIBIÇÃO.
 * NUNCA usar este nome para gravar em disco — usar UUID + ext em vez disso.
 *  - remove path separators (/ \ : ..)
 *  - trunca em 120 chars
 *  - aceita apenas [a-zA-Z0-9._- ] (sem unicode para evitar normalização)
 */
export function sanitizeDisplayFilename(name: string): string {
  const stripped = name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.+/g, '.') // colapsa pontos sucessivos (..)
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .trim()
    .slice(0, 120);
  return stripped || 'arquivo';
}
