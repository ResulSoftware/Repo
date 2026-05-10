import mysql from 'mysql2/promise';
import fs from 'fs';

// MySQL Bağlantı Bilgileri
// Eğer şifreniz farklıysa lütfen burayı değiştirin. XAMPP için genelde şifre boştur ('').
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '816541' 
};

async function setupDatabase() {
    try {
        console.log("MySQL'e bağlanılıyor...");
        const connection = await mysql.createConnection(dbConfig);
        
        console.log("Veritabanı oluşturuluyor...");
        await connection.query('CREATE DATABASE IF NOT EXISTS anime_db');
        await connection.query('USE anime_db');

        console.log("Tablolar oluşturuluyor...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS animes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                rating VARCHAR(10),
                cover VARCHAR(255),
                genres JSON,
                is_trending BOOLEAN DEFAULT false
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS episodes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                anime_id INT,
                ep_num INT,
                ep_title VARCHAR(255),
                video_url VARCHAR(255),
                duration VARCHAR(50),
                FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
            )
        `);

        console.log("Veriler veri.js'den okunuyor...");
        
        // veri.js yerine veri.json üzerinden okuma yapıyoruz. 
        // Not: Gerçek veri.js'den verileri almak yerine, önceden kaydettiğimiz veri.json dosyasını okuyoruz.
        const veriRaw = fs.readFileSync('veri.json', 'utf8');
        const animeData = JSON.parse(veriRaw);

        console.log("Tablolar temizleniyor (tekrarlayan verileri önlemek için)...");
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE episodes');
        await connection.query('TRUNCATE TABLE animes');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log("Veriler veritabanına ekleniyor...");
        for (const anime of animeData) {
            const [animeResult] = await connection.query(`
                INSERT INTO animes (title, description, image, rating, cover, genres, is_trending) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [anime.title, anime.description, anime.image, anime.rating, anime.cover, JSON.stringify(anime.genres), anime.isTrending]);
            
            const animeId = animeResult.insertId;

            if (anime.episodes && anime.episodes.length > 0) {
                for (const ep of anime.episodes) {
                    await connection.query(`
                        INSERT INTO episodes (anime_id, ep_num, ep_title, video_url, duration)
                        VALUES (?, ?, ?, ?, ?)
                    `, [animeId, ep.ep_num, ep.ep_title, ep.video_url, ep.duration]);
                }
            }
        }

        console.log("Veritabanı kurulumu başarıyla tamamlandı!");
        connection.end();

    } catch (error) {
        console.error("Hata oluştu:", error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error("Bağlantı reddedildi! Lütfen dosya içindeki 'password' alanına doğru MySQL şifrenizi girin.");
        }
    }
}

setupDatabase();
