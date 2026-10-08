/* Qué es un enlace de video y cómo se incrusta.
 *
 * 08-10: el dueño pegó un video y "no aparece ni en la galería ni nada". Dos
 * causas: la galería solo dibujaba <img> (un video ahí era una foto rota), y
 * fuera de YouTube/Vimeo/.mp4 todo caía en un <iframe> con la URL de la página
 * -- TikTok, Facebook, Instagram y Drive lo bloquean y queda un recuadro vacío.
 * Cada red tiene su dirección de inserción propia; esta función la arma. */

export type Video =
  | { tipo: "iframe"; src: string; vertical: boolean; miniatura?: string }
  | { tipo: "archivo"; src: string };

const ARCHIVO = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;

export function leerVideo(url: string): Video | null {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u) && !u.startsWith("/")) return null;

  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (yt) {
    return {
      tipo: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&playsinline=1`,
      vertical: /\/shorts\//.test(u),
      miniatura: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`,
    };
  }
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vm[1]}`, vertical: false };

  const tk = u.match(/tiktok\.com\/.*\/video\/(\d+)/);
  if (tk) return { tipo: "iframe", src: `https://www.tiktok.com/embed/v2/${tk[1]}`, vertical: true };

  const ig = u.match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/);
  if (ig) return { tipo: "iframe", src: `https://www.instagram.com/${ig[1] === "reels" ? "reel" : ig[1]}/${ig[2]}/embed`, vertical: true };

  if (/(facebook\.com|fb\.watch)\//.test(u) && /(\/videos?\/|\/reel\/|watch|fb\.watch|\/share\/v\/|\/share\/r\/)/.test(u)) {
    return {
      tipo: "iframe",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false`,
      vertical: /\/reel\/|\/share\/r\//.test(u),
    };
  }

  const dr = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/);
  if (dr) return { tipo: "iframe", src: `https://drive.google.com/file/d/${dr[1]}/preview`, vertical: false };

  if (ARCHIVO.test(u)) return { tipo: "archivo", src: u };
  return null;
}

/** ¿Este enlace es un video? Sirve para separar fotos de videos en la galería. */
export function esVideo(url: string): boolean {
  return leerVideo(url) !== null;
}
