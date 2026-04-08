import TelegramBot from 'node-telegram-bot-api';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- RENDER KEEP-ALIVE ---
const app = express();
app.get('/', (req, res) => res.send('Bot is Running'));
app.listen(process.env.PORT || 10000);

// --- CONFIG ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const fontPath = path.join(__dirname, 'assets', 'font.ttf');
if (fs.existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, 'EthiopicFont');

const TEMPLATE_PATH = path.join(__dirname, 'assets', 'template.jpg');

// --- DRAWING LOGIC ---
async function generateIdCard(data, photoPath) {
    const template = await loadImage(TEMPLATE_PATH);
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(template, 0, 0);

    // 1. Photo (Adjusted for your white box)
    if (photoPath && fs.existsSync(photoPath)) {
        const photoImg = await loadImage(photoPath);
        ctx.drawImage(photoImg, 63, 85, 115, 145); 
    }

    // 2. Text (Front Side)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px "EthiopicFont"';
    ctx.fillText(data.nameAmharic || "", 195, 115);
    
    ctx.font = 'bold 11px Arial';
    ctx.fillText(data.nameEnglish || "", 195, 132);
    ctx.fillText(data.dob || "", 195, 170);
    ctx.fillText("ወንድ | Male", 195, 215);

    // 3. Back Side (Right)
    const bx = 637; 
    ctx.font = 'bold 12px Arial';
    ctx.fillText(data.phone || "", bx + 70, 50);

    // QR Code
    const qrData = await QRCode.toDataURL(data.fcn || "FAYDA");
    const qrImg = await loadImage(Buffer.from(qrData.split(',')[1], 'base64'));
    ctx.drawImage(qrImg, bx + 320, 28, 280, 280);

    return canvas.toBuffer('image/jpeg');
}

bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.document.file_name.toLowerCase().endsWith('.pdf')) return;

    try {
        const file = await bot.getFile(msg.document.file_id);
        const pdfPath = `/tmp/in_${Date.now()}.pdf`;
        const res = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`);
        fs.writeFileSync(pdfPath, Buffer.from(await res.arrayBuffer()));

        // Extract Text
        const text = execSync(`pdftotext "${pdfPath}" -`).toString();
        const data = { 
            nameAmharic: "ኣዱኛ ተሸመ ተስፋይ", // Replace with extraction logic
            nameEnglish: "Adugna Tesheme Tesfay",
            dob: "14/10/1971 | 1979/06/21",
            fcn: "5921 4587 5423",
            phone: "+251 914 226 148"
        };

        const card = await generateIdCard(data, null);
        bot.sendPhoto(chatId, card, { caption: "✅ Fayda Card Generated" });
        fs.unlinkSync(pdfPath);
    } catch (e) {
        bot.sendMessage(chatId, "❌ Error: " + e.message);
    }
});
