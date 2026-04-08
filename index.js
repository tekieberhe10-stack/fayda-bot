import TelegramBot from 'node-telegram-bot-api';
import pkg from 'canvas';
const { createCanvas, loadImage, registerFont } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. CONFIGURATION
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Register Ethiopic Font
const FONT_PATH = path.join(__dirname, 'assets', 'font.ttf');
if (fs.existsSync(FONT_PATH)) {
    registerFont(FONT_PATH, { family: 'EthiopicFont' });
}

const TEMPLATE_PATH = path.join(__dirname, 'assets', 'template.jpg');

// 2. ID GENERATION LOGIC
async function generateIdCard(data, photoPath) {
    const template = await loadImage(TEMPLATE_PATH);
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');
    
    // Draw Background Template
    ctx.drawImage(template, 0, 0);

    // --- FRONT SIDE (Left) ---
    // Photo Placement (Centered in the white box)
    if (photoPath && fs.existsSync(photoPath)) {
        const photoImg = await loadImage(photoPath);
        ctx.drawImage(photoImg, 78, 108, 105, 130); 
    }

    ctx.fillStyle = '#000000';

    // Full Name - Amharic
    ctx.font = 'bold 15px "EthiopicFont"';
    ctx.fillText(data.nameAmharic || "", 195, 115);

    // Full Name - English
    ctx.font = 'bold 13px Arial';
    ctx.fillText(data.nameEnglish || "", 195, 135);

    // Date of Birth
    ctx.font = '12px Arial';
    ctx.fillText(data.dob || "", 195, 185);

    // Sex
    ctx.fillText("ወንድ | Male", 195, 235);

    // --- BACK SIDE (Right) ---
    const bx = 640; 

    // Phone Number
    ctx.font = 'bold 14px Arial';
    ctx.fillText(data.phone || "+251 914 226 148", bx + 85, 45);

    // QR Code - Resized smaller and centered correctly
    const qrData = data.fcn || "FAYDA-ID";
    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1 });
    const qrImg = await loadImage(Buffer.from(qrDataUrl.split(',')[1], 'base64'));
    ctx.drawImage(qrImg, bx + 365, 85, 155, 155); 

    // FCN Number (Bottom Center)
    ctx.font = '12px Arial';
    ctx.fillText("FAN: " + (data.fcn || ""), 195, 330);

    return canvas.toBuffer('image/jpeg');
}

// 3. BOT HANDLERS
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.document && msg.document.mime_type === 'application/pdf') {
        bot.sendMessage(chatId, "📥 Processing your Fayda PDF...");

        try {
            const userData = {
                nameAmharic: "አዱኛ ተሸመ ተስፋይ",
                nameEnglish: "Adugna Tesheme Tesfay",
                dob: "14/10/1971 | 1979/06/21",
                fcn: "1234 5678 9012",
                phone: "+251 914 226 148"
            };

            const imageBuffer = await generateIdCard(userData, null);
            bot.sendPhoto(chatId, imageBuffer, { caption: "✅ Here is your updated Digital ID!" });
        } catch (err) {
            bot.sendMessage(chatId, "❌ Error creating card: " + err.message);
        }
    } else if (msg.text === '/start') {
        bot.sendMessage(chatId, "Welcome! Send me your Fayda PDF to generate your card.");
    }
});

console.log("🚀 Fayda Bot is running...");
