const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../resources/icon.png');
const icoPath = path.join(__dirname, '../resources/icon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('Source PNG not found at ' + pngPath);
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);
const pngSize = pngBuffer.length;

// Header (6 bytes)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type (1 = ICO)
header.writeUInt16LE(1, 4); // Number of images

// Directory Entry (16 bytes)
const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // Width (0 means 256)
entry.writeUInt8(0, 1); // Height (0 means 256)
entry.writeUInt8(0, 2); // Color palette (0 means no palette)
entry.writeUInt8(0, 3); // Reserved
entry.writeUInt16LE(1, 4); // Color planes
entry.writeUInt16LE(32, 6); // Bits per pixel
entry.writeUInt32LE(pngSize, 8); // Size of PNG data
entry.writeUInt32LE(22, 12); // Offset of PNG data (6 bytes header + 16 bytes entry)

// Concatenate everything
const icoBuffer = Buffer.concat([header, entry, pngBuffer]);

fs.writeFileSync(icoPath, icoBuffer);
console.log('Successfully created ICO file at ' + icoPath);
