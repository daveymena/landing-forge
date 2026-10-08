import path from "node:path";

/** Tipos que se aceptan al subir desde el editor, y con qué extensión se guardan. */
export const TIPOS: Record<string, { ext: string }> = {
  "image/jpeg": { ext: "jpg" },
  "image/png": { ext: "png" },
  "image/webp": { ext: "webp" },
  "image/gif": { ext: "gif" },
  "video/mp4": { ext: "mp4" },
  "video/webm": { ext: "webm" },
  "video/quicktime": { ext: "mov" },
};

export const CONTENT_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(TIPOS).map(([mime, { ext }]) => [ext, mime]),
);

/** data/ es volumen persistente en EasyPanel (ver Dockerfile). */
export function carpetaMedia(): string {
  return path.join(process.cwd(), "data", "media");
}

export const NOMBRE_VALIDO = /^[a-f0-9]{16}\.(jpg|png|webp|gif|mp4|webm|mov)$/;
