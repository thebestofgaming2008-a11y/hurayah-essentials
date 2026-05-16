type Env = {
  MEDIA_BUCKET?: R2Bucket;
  R2_PUBLIC_BASE_URL?: string;
  ADMIN_UPLOAD_TOKEN?: string;
};

const MAX_BYTES = 25 * 1024 * 1024;

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "upload";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.MEDIA_BUCKET || !env.R2_PUBLIC_BASE_URL || !env.ADMIN_UPLOAD_TOKEN) {
    return Response.json({ error: "R2 media uploads are not configured." }, { status: 501 });
  }
  const token = request.headers.get("x-admin-upload-token");
  if (token !== env.ADMIN_UPLOAD_TOKEN) {
    return Response.json({ error: "Upload denied." }, { status: 401 });
  }
  const fileName = request.headers.get("x-file-name") || "upload";
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const bytes = Number(request.headers.get("content-length") || 0);
  if (bytes > MAX_BYTES) return Response.json({ error: "File is too large." }, { status: 413 });
  if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
    return Response.json({ error: "Only image and video uploads are allowed." }, { status: 415 });
  }
  const key = `media/${Date.now()}-${crypto.randomUUID()}-${safeName(fileName)}`;
  await env.MEDIA_BUCKET.put(key, request.body, {
    httpMetadata: { contentType },
    customMetadata: { originalName: fileName },
  });
  const base = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return Response.json({ url: `${base}/${key}` });
};
