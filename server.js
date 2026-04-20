require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500'
  ]
})); app.use(express.json());

// ── DB pool ───────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// ── GET /api/puntos ───────────────────────────────────────────────────────────
app.get('/api/puntos', async (req, res) => {
  try {
    const view = process.env.OBSERVATION_VIEW;
    const [rows] = await pool.query(`SELECT * FROM ${view} LIMIT 500`);

    const puntos = rows.reduce((acc, row) => {
      try {
        console.log(row.observation_metadata);
        const meta = row.observation_metadata;
        const [lng, lat] = meta.latLng; // [lng, lat]

        // 🔥 Normalización de inefficiency
        let inefficiency = null;

        if (meta.inefficiency !== undefined) {
          inefficiency = meta.inefficiency;
        } else if (meta.deltaTemp !== undefined) {
          // regla simple temporal (puedes ajustar luego)
          inefficiency = meta.deltaTemp / 100;
        } else {
          inefficiency = 0;
        }

        acc.push({
          lat,
          lng,
          inefficiency: meta.inefficiency,
          rgb: meta.idPhotoRGB,
          thermal: meta.idPhotoThermal,
        });
      } catch {
        // registro con observation_metadata inválido → se ignora
      }
      return acc;
    }, []);

    res.json(puntos);
  } catch (err) {
    console.error('Error en /api/puntos:', err.message);
    res.status(500).json({ error: 'Error al obtener los puntos.' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ EX-VIEW SOLAR API corriendo en http://localhost:${PORT}`);
});
