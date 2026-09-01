import fs from 'fs';
import path from 'path';

const sourceImg = 'C:/Users/djw7ql/.gemini/antigravity/brain/1b40fee1-63b4-4d1b-b84f-04803a10ba35/baijiu_drink_1787971083282.jpg';
const targetDir1 = 'public/assets/drinks';
const targetDir2 = 'android/app/src/main/assets/public/assets/drinks';

if (!fs.existsSync(targetDir1)) fs.mkdirSync(targetDir1, { recursive: true });
if (!fs.existsSync(targetDir2)) fs.mkdirSync(targetDir2, { recursive: true });

fs.copyFileSync(sourceImg, path.join(targetDir1, 'baijiu.webp'));
fs.copyFileSync(sourceImg, path.join(targetDir1, 'baijiu.jpg'));
fs.copyFileSync(sourceImg, path.join(targetDir2, 'baijiu.webp'));
fs.copyFileSync(sourceImg, path.join(targetDir2, 'baijiu.jpg'));

console.log('Successfully copied Baijiu image to public and android asset directories!');
