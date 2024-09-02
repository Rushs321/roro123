"use strict";
const sharp = require('sharp');
const redirect = require('./redirect');

const sharpStream = () => sharp({ animated: !process.env.NO_ANIMATE, unlimited: true });

async function compress(req, reply) {
    const format = req.params.webp ? 'webp' : 'jpeg';

    let originSize = req.params.originSize || 0;
    let chunks = [];

    try {
        // Buffer the incoming data
        for await (const chunk of req.raw) {
            originSize += chunk.length;
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);

        // Process the image with sharp
        const { data, info } = await sharpStream()
            .grayscale(req.params.grayscale)
            .toFormat(format, {
                quality: req.params.quality,
                progressive: true,
                optimizeScans: true,
            })
            .toBuffer({ resolveWithObject: true });

        _sendResponse(null, data, info, format, req, reply, originSize);
    } catch (err) {
        _sendResponse(err, null, null, format, req, reply, originSize);
    }
}

function _sendResponse(err, output, info, format, req, reply, originSize) {
    if (err || !info) return redirect(req, reply);

    reply
        .header('content-type', 'image/' + format)
        .header('content-length', info.size)
        .header('x-original-size', originSize)
        .header('x-bytes-saved', originSize - info.size)
        .code(200)
        .send(output);
}

module.exports = compress;
