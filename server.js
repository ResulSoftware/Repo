import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());


app.use(express.static('.'));



const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '816541', 
    database: 'anime_db'
};


app.get('/api/animes', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Animeleri çekiyoruz
        const [animes] = await connection.query('SELECT * FROM animes');
        
        // Her anime için bölümlerini çekiyoruz
        for (let i = 0; i < animes.length; i++) {
            const animeId = animes[i].id;
            const [episodes] = await connection.query('SELECT * FROM episodes WHERE anime_id = ?', [animeId]);
            
            // Formatlama: Frontend JSON beklediği için veriyi hazırlayalım
            animes[i].episodes = episodes;
            // is_trending sütununu frontend'in beklediği gibi boolean (true/false) yapalım
            animes[i].isTrending = animes[i].is_trending === 1;
            delete animes[i].is_trending;
        }
        await connection.end();
        
        res.json(animes);
    } catch (error) {
        console.error("Veritabanı hatası:", error);
        res.status(500).json({ error: 'Veritabanı hatası' });
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.resolve('İndex.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} portunda çalışıyor`);
});