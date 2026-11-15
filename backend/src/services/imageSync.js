// backend/src/services/imageSync.js
import { pool, cloudPool } from '../db.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export function startImageSyncWorker() {
  console.log('[image-sync] Worker started. Monitoring local images...');

  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
      const { rows: menuItems } = await pool.query(
        `SELECT id, image_url FROM menu_items WHERE image_url LIKE '%/uploads/%'`
      );
      if (menuItems.length === 0) return;

      console.log(`[image-sync] Found ${menuItems.length} local images to sync...`);

      for (const item of menuItems) {
        const filename = item.image_url.split('/uploads/')[1];
        if (!filename) continue;
        const filePath = path.join(__dirname, '../../public/uploads', filename);
        if (!fs.existsSync(filePath)) continue;

        try {
          const result = await cloudinary.uploader.upload(filePath, { folder: 'burger-bombs' });
          const newCloudUrl = result.secure_url;
          await pool.query(`UPDATE menu_items SET image_url = $1 WHERE id = $2`, [newCloudUrl, item.id]);
          if (cloudPool) {
            await cloudPool.query(`UPDATE menu_items SET image_url = $1 WHERE id = $2`, [newCloudUrl, item.id]);
          }
          fs.unlinkSync(filePath);
          console.log(`[image-sync] ✅ Synced item ${item.id} to Cloudinary.`);
        } catch (err) {
          console.error(`[image-sync] ❌ Failed:`, err.message);
        }
      }
    } catch (err) {
      // Internet down, retry next tick
    }
  }, 15000);
}