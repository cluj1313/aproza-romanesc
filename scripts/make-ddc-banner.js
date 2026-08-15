const sharp = require('sharp');

const W = 700, H = 300;
const flagH = 24;
const blue = [0x00, 0x2B, 0x7F, 255];
const yellow = [0xFC, 0xD1, 0x16, 255];
const red = [0xCE, 0x11, 0x26, 255];

async function stripeImage(color) {
  const h = Math.round(flagH / 3);
  return sharp({ create: { width: W, height: h, channels: 4, background: color } }).png().toBuffer();
}

async function run() {
  const bg = await sharp('public/images/ddc-shop.jpeg').resize(W, H, { fit: 'cover' }).jpeg().toBuffer();

  const logo = await sharp('public/images/logo.jpeg').resize(92, 92).jpeg().toBuffer();
  const mask = Buffer.from(
    '<svg width="92" height="92"><circle cx="46" cy="46" r="44" fill="white"/></svg>'
  );
  const circleLogo = await sharp(logo)
    .composite([{ input: mask, top: 0, left: 0 }])
    .png()
    .toBuffer();
  const ring = Buffer.from(
    '<svg width="104" height="104"><circle cx="52" cy="52" r="50" fill="rgba(255,255,255,0)" stroke="white" stroke-width="6"/></svg>'
  );

  const overlay = Buffer.from(
    '<svg width="' + W + '" height="' + H + '">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="rgba(0,0,0,0)"/>' +
    '<stop offset="0.6" stop-color="rgba(0,0,0,0.08)"/>' +
    '<stop offset="0.9" stop-color="rgba(0,0,0,0.55)"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>' +
    '</svg>'
  );

  const layers = [
    { input: overlay, top: 0, left: 0 },
    { input: circleLogo, top: 54, left: (W - 92) / 2 },
    { input: ring, top: 50, left: (W - 104) / 2 }
  ];

  const withLogo = await sharp(bg).composite(layers).png().toBuffer();

  const blueImg = await stripeImage(blue);
  const yellowImg = await stripeImage(yellow);
  const redImg = await stripeImage(red);
  const flagLayers = [
    { input: blueImg, top: H - flagH, left: 0 },
    { input: yellowImg, top: H - flagH + Math.round(flagH / 3), left: 0 },
    { input: redImg, top: H - flagH + 2 * Math.round(flagH / 3), left: 0 }
  ];

  await sharp(withLogo)
    .composite(flagLayers)
    .jpeg({ quality: 85 })
    .toFile('public/images/ddc-banner.jpeg');

  const meta = await sharp('public/images/ddc-banner.jpeg').metadata();
  console.log('Banner creat:', meta.width + 'x' + meta.height, meta.format);
}

run().catch(e => { console.error('ERR', e.message); process.exit(1); });
