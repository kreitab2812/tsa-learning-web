export function getYoutubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      id = url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/") ? url.pathname.split("/")[2] : url.searchParams.get("v");
    }
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}

export function safeResourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function getDriveFile(value: string): { id: string; resourceKey: string | null } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["drive.google.com", "www.drive.google.com"].includes(url.hostname) || url.username || url.password || url.port) return null;
    const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1]
      ?? (["/open", "/uc"].includes(url.pathname) ? url.searchParams.get("id") : null);
    if (!id || !/^[\w-]{3,200}$/.test(id)) return null;
    return { id, resourceKey: url.searchParams.get("resourcekey") };
  } catch { return null; }
}

export function getDrivePreviewUrl(value: string): string | null {
  const file = getDriveFile(value);
  if (!file) return null;
  const url = new URL(`https://drive.google.com/file/d/${file.id}/preview`);
  if (file.resourceKey) url.searchParams.set("resourcekey", file.resourceKey);
  return url.href;
}

export function getDocumentDownloadUrl(value: string): string | null {
  const file = getDriveFile(value);
  if (!file) return safeResourceUrl(value);
  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download"); url.searchParams.set("id", file.id);
  if (file.resourceKey) url.searchParams.set("resourcekey", file.resourceKey);
  return url.href;
}
