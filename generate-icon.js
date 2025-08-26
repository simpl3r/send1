const { createCanvas } = require('canvas');
const fs = require('fs');

// Create a 1024x1024 canvas
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Fill background with yellow color
ctx.fillStyle = '#FCFF52';
ctx.fillRect(0, 0, 1024, 1024);

// Draw outer black circle
ctx.fillStyle = '#000000';
ctx.beginPath();
ctx.arc(512, 512, 320, 0, 2 * Math.PI);
ctx.fill();

// Draw inner yellow circle
ctx.fillStyle = '#FCFF52';
ctx.beginPath();
ctx.arc(512, 512, 240, 0, 2 * Math.PI);
ctx.fill();

// Draw horizontal black bars (CELO logo style)
ctx.fillStyle = '#000000';
// Top bar
ctx.fillRect(432, 432, 160, 80);
// Bottom bar
ctx.fillRect(432, 512, 160, 80);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('icon-1024.png', buffer);

console.log('PNG icon generated: icon-1024.png (1024x1024)');