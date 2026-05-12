export const convertGoogleSheetUrlToExport = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "docs.google.com") return null;
    if (!parsed.pathname.includes("/spreadsheets/d/")) return null;

    const match = parsed.pathname.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const fileId = match?.[1];
    if (!fileId) return null;

    const gidMatch = url.match(/gid=(\d+)/);
    const gid = gidMatch?.[1] || 0;

    return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
};
