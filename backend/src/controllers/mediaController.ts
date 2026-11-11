import { Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const MAX_BYTES = 8 * 1024 * 1024;

/** Detects the real image type from the file's first bytes (never trust the browser's label). */
function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a') return { mime: 'image/gif', ext: 'gif' };
  if (buf.subarray(4, 12).toString('ascii').startsWith('ftypavif')) return { mime: 'image/avif', ext: 'avif' };
  return null;
}

/** POST /api/admin/media — body is the raw image (sent by the admin uploader after compressing it). */
export async function uploadMedia(req: Request, res: Response) {
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) throw new AppError('No image received', 400);
  if (body.length > MAX_BYTES) throw new AppError('Image is too large (max 8 MB)', 413);
  const kind = sniff(body);
  if (!kind) throw new AppError('Only JPG, PNG, WEBP, GIF or AVIF images can be uploaded', 415);

  const width = Number(req.headers['x-image-width']) || null;
  const height = Number(req.headers['x-image-height']) || null;
  const fileName = String(req.headers['x-file-name'] || '').slice(0, 180) || null;

  const file = await prisma.mediaFile.create({
    data: { mime: kind.mime, size: body.length, width, height, fileName: fileName ? decodeURIComponent(fileName) : null, data: body },
    select: { id: true }
  });
  res.status(201).json({ id: file.id, url: `/media/${file.id}.${kind.ext}`, size: body.length, width, height });
}

/* ----------------------------------------------------------------------------------------------
 * Videos — uploaded in 4 MB pieces, served with HTTP Range support (needed for iPhone playback).
 * --------------------------------------------------------------------------------------------*/
export const VIDEO_CHUNK = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

function sniffVideo(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    return brand.startsWith('qt') ? { mime: 'video/quicktime', ext: 'mov' } : { mime: 'video/mp4', ext: 'mp4' };
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { mime: 'video/webm', ext: 'webm' };
  return null;
}
const extFor = (mime: string) => (mime === 'video/webm' ? 'webm' : mime === 'video/quicktime' ? 'mov' : 'mp4');

/**
 * POST /api/admin/media/video — one piece of a video per request.
 * Headers: X-Upload-Id (uuid chosen by the browser), X-Chunk-Index, X-Chunk-Total, X-Total-Size, X-File-Name.
 * Every piece except the last must be exactly 4 MB.
 */
export async function uploadVideoChunk(req: Request, res: Response) {
  const body = req.body;
  const id = String(req.headers['x-upload-id'] || '');
  const idx = Number(req.headers['x-chunk-index']);
  const total = Number(req.headers['x-chunk-total']);
  const totalSize = Number(req.headers['x-total-size']);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new AppError('Invalid upload id', 400);
  if (!Buffer.isBuffer(body) || body.length === 0) throw new AppError('No video data received', 400);
  if (!Number.isInteger(idx) || !Number.isInteger(total) || total < 1 || idx < 0 || idx >= total) throw new AppError('Invalid video piece', 400);
  if (!Number.isFinite(totalSize) || totalSize <= 0 || totalSize > MAX_VIDEO_BYTES) throw new AppError('Video is too large (max 60 MB)', 413);
  if (total !== Math.ceil(totalSize / VIDEO_CHUNK)) throw new AppError('Video piece count does not match its size', 400);
  const expected = idx < total - 1 ? VIDEO_CHUNK : totalSize - VIDEO_CHUNK * (total - 1);
  if (body.length !== expected) throw new AppError('Video piece has the wrong size — please try the upload again', 400);

  if (idx === 0) {
    const kind = sniffVideo(body);
    if (!kind) throw new AppError('Only MP4, MOV or WEBM videos can be uploaded', 415);
    const existing = await prisma.mediaFile.findUnique({ where: { id }, select: { complete: true } });
    if (existing?.complete) throw new AppError('This upload is already finished', 409);
    const fileName = String(req.headers['x-file-name'] || '').slice(0, 180);
    await prisma.mediaFile.upsert({
      where: { id },
      update: { mime: kind.mime, size: totalSize, chunkCount: total, complete: false },
      create: {
        id,
        mime: kind.mime,
        size: totalSize,
        fileName: fileName ? decodeURIComponent(fileName) : null,
        data: Buffer.alloc(0),
        chunkCount: total,
        complete: false
      }
    });
  } else {
    const file = await prisma.mediaFile.findUnique({ where: { id }, select: { complete: true, chunkCount: true, size: true } });
    if (!file || file.complete || file.chunkCount !== total || file.size !== totalSize) throw new AppError('Upload not found — please start again', 404);
  }

  await prisma.mediaChunk.upsert({
    where: { mediaId_idx: { mediaId: id, idx } },
    update: { data: body },
    create: { mediaId: id, idx, data: body }
  });

  if (idx < total - 1) {
    res.json({ ok: true, received: idx + 1, total });
    return;
  }
  const count = await prisma.mediaChunk.count({ where: { mediaId: id } });
  if (count !== total) throw new AppError('Some video pieces are missing — please upload again', 400);
  const file = await prisma.mediaFile.update({ where: { id }, data: { complete: true }, select: { mime: true } });
  res.status(201).json({ id, url: `/media/${id}.${extFor(file.mime)}`, size: totalSize });
}

/** GET /media/:file — public, cached forever (file ids never change). */
export async function serveMedia(req: Request, res: Response) {
  const id = String(req.params.file || '').split('.')[0];
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    res.status(404).end();
    return;
  }
  if (req.headers['if-none-match'] === `"${id}"` && !req.headers.range) {
    res.status(304).end();
    return;
  }
  const meta = await prisma.mediaFile.findUnique({ where: { id }, select: { mime: true, size: true, chunkCount: true, complete: true } });
  if (!meta || !meta.complete) {
    res.status(404).end();
    return;
  }
  res.setHeader('Content-Type', meta.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('ETag', `"${id}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (meta.chunkCount > 0) {
    await streamVideo(req, res, id, meta.size, meta.chunkCount);
    return;
  }
  const file = await prisma.mediaFile.findUnique({ where: { id }, select: { data: true } });
  res.end(Buffer.from(file!.data));
}

/* Videos are rebuilt from the database once and kept on the server's disk, so playback starts fast. */
const CACHE_DIR = path.join(os.tmpdir(), 'levix-media-cache');
const building = new Map<string, Promise<void>>();

async function cachedVideoFile(id: string, size: number, chunkCount: number): Promise<string | null> {
  const file = path.join(CACHE_DIR, id);
  try {
    const st = await fs.promises.stat(file);
    if (st.size === size) return file;
  } catch {
    /* not cached yet */
  }
  if (!building.has(id)) {
    const job = (async () => {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
      const tmp = `${file}.${process.pid}.part`;
      const fh = await fs.promises.open(tmp, 'w');
      try {
        for (let i = 0; i < chunkCount; i++) {
          const chunk = await prisma.mediaChunk.findUnique({ where: { mediaId_idx: { mediaId: id, idx: i } }, select: { data: true } });
          if (!chunk) throw new Error(`missing chunk ${i}`);
          await fh.write(Buffer.from(chunk.data));
        }
      } finally {
        await fh.close();
      }
      const st = await fs.promises.stat(tmp);
      if (st.size === size) await fs.promises.rename(tmp, file);
      else await fs.promises.unlink(tmp).catch(() => undefined);
    })()
      .catch((err) => console.error('Video cache build failed:', err?.message || err))
      .finally(() => building.delete(id));
    building.set(id, job);
  }
  return null;
}

async function streamVideo(req: Request, res: Response, id: string, size: number, chunkCount: number) {
  res.setHeader('Accept-Ranges', 'bytes');
  let start = 0;
  let end = size - 1;
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === '' && m[2] === '')) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return;
    }
    if (m[1] === '') {
      start = Math.max(0, size - Number(m[2]));
    } else {
      start = Number(m[1]);
      if (m[2] !== '') end = Math.min(size - 1, Number(m[2]));
    }
    if (start > end || start >= size) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return;
    }
    // Answer big open-ended requests a few MB at a time; the player asks for the rest as it plays.
    if (m[2] === '') end = Math.min(end, start + 2 * VIDEO_CHUNK - 1);
    res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
  }
  res.setHeader('Content-Length', String(end - start + 1));
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const cached = await cachedVideoFile(id, size, chunkCount);
  if (cached) {
    const stream = fs.createReadStream(cached, { start, end });
    stream.on('error', () => res.destroy());
    req.on('close', () => stream.destroy());
    stream.pipe(res);
    return;
  }
  let closed = false;
  req.on('close', () => (closed = true));
  const first = Math.floor(start / VIDEO_CHUNK);
  const last = Math.min(chunkCount - 1, Math.floor(end / VIDEO_CHUNK));
  for (let i = first; i <= last && !closed; i++) {
    const chunk = await prisma.mediaChunk.findUnique({ where: { mediaId_idx: { mediaId: id, idx: i } }, select: { data: true } });
    if (!chunk) break;
    const buf = Buffer.from(chunk.data);
    const base = i * VIDEO_CHUNK;
    const from = Math.max(0, start - base);
    const to = Math.min(buf.length, end - base + 1);
    if (!res.write(buf.subarray(from, to))) await new Promise((r) => res.once('drain', r));
  }
  res.end();
}
