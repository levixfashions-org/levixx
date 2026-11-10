import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
const MAX_BYTES = 8 * 1024 * 1024;
/** Detects the real image type from the file's first bytes (never trust the browser's label). */
function sniff(buf) {
    if (buf.length < 12)
        return null;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
        return { mime: 'image/jpeg', ext: 'jpg' };
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return { mime: 'image/png', ext: 'png' };
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP')
        return { mime: 'image/webp', ext: 'webp' };
    if (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a')
        return { mime: 'image/gif', ext: 'gif' };
    if (buf.subarray(4, 12).toString('ascii').startsWith('ftypavif'))
        return { mime: 'image/avif', ext: 'avif' };
    return null;
}
/** POST /api/admin/media — body is the raw image (sent by the admin uploader after compressing it). */
export async function uploadMedia(req, res) {
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0)
        throw new AppError('No image received', 400);
    if (body.length > MAX_BYTES)
        throw new AppError('Image is too large (max 8 MB)', 413);
    const kind = sniff(body);
    if (!kind)
        throw new AppError('Only JPG, PNG, WEBP, GIF or AVIF images can be uploaded', 415);
    const width = Number(req.headers['x-image-width']) || null;
    const height = Number(req.headers['x-image-height']) || null;
    const fileName = String(req.headers['x-file-name'] || '').slice(0, 180) || null;
    const file = await prisma.mediaFile.create({
        data: { mime: kind.mime, size: body.length, width, height, fileName: fileName ? decodeURIComponent(fileName) : null, data: body },
        select: { id: true }
    });
    res.status(201).json({ id: file.id, url: `/media/${file.id}.${kind.ext}`, size: body.length, width, height });
}
/** GET /media/:file — public, cached forever (file ids never change). */
export async function serveMedia(req, res) {
    const id = String(req.params.file || '').split('.')[0];
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
        res.status(404).end();
        return;
    }
    if (req.headers['if-none-match'] === `"${id}"`) {
        res.status(304).end();
        return;
    }
    const file = await prisma.mediaFile.findUnique({ where: { id }, select: { mime: true, data: true } });
    if (!file) {
        res.status(404).end();
        return;
    }
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${id}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(Buffer.from(file.data));
}
