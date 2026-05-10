let animelerData = [];
let currentAnimeId = null;
let currentGenre = 'Tümü';

document.addEventListener('DOMContentLoaded', () => {
    // Scroll edildiğinde Navbar efekti
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    // Dışarı tıklayınca Modalları kapat
    window.onclick = function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
            if (event.target.id === 'videoModal') closeVideoModal();
        }
    }

    checkUserStatus();

    // Verileri MySQL Backend API'sinden (Node.js) getiriyoruz
    fetch('http://localhost:3000/api/animes')
        .then(response => {
            if (!response.ok) throw new Error("Ağ yanıtı başarısız");
            return response.json();
        })
        .then(data => {
            animelerData = data;
            renderHeroSlider(); // Yeni eklenen slider fonksiyonu
            renderGenres();
            renderAnimes(animelerData);
            renderTrending(animelerData);
            renderMyList();
        })
        .catch(error => {
            console.error("Veri çekme hatası:", error);
            showNotification("Sunucuya bağlanılamadı. Backend API çalışmıyor olabilir.", "error");
        });

    // Arama Animasyonlu ve Dropdown (Yazarken Sıralanma)
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        
        if(term.length === 0) { 
            renderAnimes(animelerData); 
            searchDropdown.classList.remove('active');
            return; 
        }

        const filtered = animelerData.filter(a => a.title.toLowerCase().includes(term) || a.genres.join(' ').toLowerCase().includes(term));
        renderAnimes(filtered);

        // Dropdown'u Doldur
        searchDropdown.innerHTML = '';
        if (filtered.length > 0) {
            filtered.forEach(anime => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.onclick = () => {
                    openAnimeDetail(anime.id);
                    searchDropdown.classList.remove('active');
                    searchInput.value = '';
                    renderAnimes(animelerData);
                };
                item.innerHTML = `
                    <img src="${anime.image}" alt="${anime.title}">
                    <div class="search-item-info">
                        <span class="search-item-title">${anime.title}</span>
                        <span class="search-item-meta"><i class="fas fa-star" style="color:gold"></i> ${anime.rating} &nbsp;•&nbsp; ${anime.genres[0]}</span>
                    </div>
                `;
                searchDropdown.appendChild(item);
            });
            searchDropdown.classList.add('active');
        } else {
            searchDropdown.innerHTML = '<div class="search-item" style="justify-content:center; color:#94a3b8;">Sonuç bulunamadı</div>';
            searchDropdown.classList.add('active');
        }
    });

    // Sayfa dışına tıklandığında menüleri kapat
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar')) {
            searchDropdown.classList.remove('active');
        }
        if (!e.target.closest('.user-profile-wrap')) {
            const profileDropdown = document.getElementById('profileDropdown');
            const chevron = document.querySelector('.user-chevron');
            if (profileDropdown) profileDropdown.classList.remove('active');
            if (chevron) chevron.classList.remove('active');
        }
    });

    // Form İşlemleri
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value;
        localStorage.setItem('currentUser', user);
        closeModal('loginModal'); checkUserStatus();
        renderMyList();
        showNotification(`Hoş geldin, ${user}! Platforma başarıyla giriş yapıldı.`);
    });

    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('regUser').value;
        localStorage.setItem('currentUser', user);
        closeModal('registerModal'); checkUserStatus();
        renderMyList();
        showNotification(`Kayıt başarılı! Hoş geldin, ${user}!`);
    });

    // Mobil Menü Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.innerHTML = navLinks.classList.contains('active') ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });

        // Linke tıklayınca menüyü kapat
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }
});

// Dinamik Hero Slider Sistemi
let heroInterval;
let currentSlideIndex = 0;

function renderHeroSlider() {
    const slider = document.getElementById('heroSlider');
    if (!slider) return;

    const trendingAnimes = animelerData.filter(a => a.isTrending);
    if (trendingAnimes.length === 0) {
        slider.innerHTML = '<div style="padding: 50px; color: var(--text-muted);">Trend anime bulunamadı.</div>';
        return;
    }

    slider.innerHTML = '';
    trendingAnimes.forEach((anime, index) => {
        const slide = document.createElement('div');
        slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
        slide.style.backgroundImage = `linear-gradient(to right, rgba(15,17,26,1) 20%, rgba(15,17,26,0.3) 100%), url('${anime.cover}')`;
        
        slide.innerHTML = `
            <div class="hero-content">
                <span class="badge badge-primary"><i class="fas fa-fire"></i> Trend Başyapıt</span>
                <h1 class="hero-title">${anime.title}</h1>
                <p class="hero-desc">${anime.description.substring(0, 200)}...</p>
                <div class="hero-buttons">
                    <button class="btn btn-primary glow-btn" onclick="openAnimeDetail(${anime.id})"><i class="fas fa-play"></i> Hemen İzle</button>
                    <button class="btn btn-glass" onclick="toggleFavorite(${anime.id})"><i class="fas fa-heart"></i> Listeme Ekle</button>
                </div>
            </div>
        `;
        slider.appendChild(slide);
    });

    if (trendingAnimes.length > 1) {
        startHeroAutoSlide();
    }
}

function startHeroAutoSlide() {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        const slides = document.querySelectorAll('.hero-slide');
        if (slides.length <= 1) return;

        slides[currentSlideIndex].classList.remove('active');
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        slides[currentSlideIndex].classList.add('active');
    }, 5000); 
}

// Kategori Filtreleme Sistemi
function renderGenres() {
    const filtersContainer = document.getElementById('genreFilters');
    if(!filtersContainer) return;

    // Benzersiz kategorileri bul
    const allGenres = new Set();
    animelerData.forEach(a => {
        if(a.genres) a.genres.forEach(g => allGenres.add(g));
    });
    
    // Alfabetik sırala ve başa Tümü ekle
    const genresArray = ['Tümü', ...Array.from(allGenres).sort()];
    
    filtersContainer.innerHTML = '';
    
    genresArray.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = `btn-genre ${genre === currentGenre ? 'active' : ''}`;
        btn.textContent = genre;
        btn.onclick = () => filterByGenre(genre);
        filtersContainer.appendChild(btn);
    });
}

function filterByGenre(genre) {
    currentGenre = genre;
    renderGenres(); // Butonların aktiflik durumunu güncelle
    
    if (genre === 'Tümü') {
        renderAnimes(animelerData);
    } else {
        const filtered = animelerData.filter(a => a.genres && a.genres.includes(genre));
        renderAnimes(filtered);
    }
}

// JSON Çekme fonksiyonunu kaldırdık çünkü doğrudan veri.js içinden alıyoruz.

// Tüm Animeler Grid
function renderAnimes(animes) {
    const grid = document.getElementById('animeGrid');
    grid.innerHTML = '';
    
    if (animes.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; padding: 50px; color: #a0a5ba; font-size: 1.2rem;">Maalesef kriterlerinize uygun anime bulunamadı.</p>';
        return;
    }

    animes.forEach((anime, index) => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
        card.style.opacity = "0"; // Animasyon için
        card.onclick = () => openAnimeDetail(anime.id);

        card.innerHTML = `
            <div class="anime-img-container">
                <img src="${anime.image}" alt="${anime.title}" class="anime-img">
                <div class="play-overlay"><i class="fas fa-play-circle"></i></div>
            </div>
            <div class="anime-info">
                <div class="anime-title" title="${anime.title}">${anime.title}</div>
                <div class="anime-meta">
                    <span>${anime.genres[0]}</span>
                    <span style="color: gold;"><i class="fas fa-star"></i> ${anime.rating}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Trend Animeler Alanı
function renderTrending(animes) {
    const grid = document.getElementById('trendingGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const trending = animes.filter(a => a.isTrending).slice(0, 4); // İlk 4 trendi göster
    trending.forEach(anime => {
        const div = document.createElement('div');
        div.className = 'anime-card';
        div.onclick = () => openAnimeDetail(anime.id);
        div.innerHTML = `
            <div class="anime-img-container" style="height: 250px;">
                <img src="${anime.image}" class="anime-img">
            </div>
            <div class="anime-info"><div class="anime-title">${anime.title}</div></div>
        `;
        grid.appendChild(div);
    });
    // CSS'te grid stilini ayarladık ama inline da ekleyebiliriz
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(200px, 1fr))";
    grid.style.gap = "20px";
}

// Anime Detayı
function openAnimeDetail(id) {
    const anime = animelerData.find(a => a.id === id);
    if (!anime) return;
    
    currentAnimeId = id; // Açık olan animeyi Global değişkene ata
    updateFavoriteButton(id);

    document.getElementById('detailHeader').style.backgroundImage = `url('${anime.cover}')`;
    document.getElementById('detailImg').src = anime.image;
    document.getElementById('detailTitle').textContent = anime.title;
    document.getElementById('detailRating').textContent = anime.rating;
    document.getElementById('detailDesc').textContent = anime.description;

    const genresContainer = document.getElementById('detailGenres');
    genresContainer.innerHTML = '';
    anime.genres.forEach(g => {
        const span = document.createElement('span');
        span.className = 'badge-glass';
        span.textContent = g;
        genresContainer.appendChild(span);
    });

    const episodesList = document.getElementById('episodesList');
    episodesList.innerHTML = '';
    
    if (anime.episodes && anime.episodes.length > 0) {
        anime.episodes.forEach(ep => {
            const epCard = document.createElement('div');
            epCard.className = 'episode-card';
            epCard.onclick = () => playEpisode(anime.title, ep);
            epCard.innerHTML = `
                <div>
                    <h4 style="margin-bottom: 5px;">Bölüm ${ep.ep_num}: ${ep.ep_title}</h4>
                    <span style="color: var(--text-muted); font-size: 0.8rem;">
                        <i class="fas fa-closed-captioning"></i> TR Altyazı &nbsp;&nbsp; 
                        <i class="fas fa-clock"></i> ${ep.duration || '24 dk'}
                    </span>
                </div>
                <div class="btn btn-primary" style="padding: 10px; border-radius: 50%; width: 40px; height: 40px; display:flex; justify-content:center; align-items:center;">
                    <i class="fas fa-play" style="margin-left:3px;"></i>
                </div>
            `;
            episodesList.appendChild(epCard);
        });
        
        // İlk bölümü izle butonuna bağla
        document.getElementById('watchFirstBtn').onclick = () => playEpisode(anime.title, anime.episodes[0]);
    } else {
        episodesList.innerHTML = '<p style="color: var(--text-muted);">Henüz bölüm yüklenmedi.</p>';
        document.getElementById('watchFirstBtn').onclick = () => alert("Henüz bölüm yok!");
    }

    openModal('animeDetailModal');
}

// Video Oynatma Sistemi
function playEpisode(animeTitle, episode) {
    if (!localStorage.getItem('currentUser')) {
        showNotification("İzlemeye başlamak için giriş yapmalısın!", "error");
        openModal('loginModal');
        return;
    }
    const videoTitle = document.getElementById('videoTitle');
    const videoPlayer = document.getElementById('videoPlayer');
    videoTitle.innerHTML = `<span style="color: var(--primary)">${animeTitle}</span> - Bölüm ${episode.ep_num}`;
    videoPlayer.src = episode.video_url;
    openModal('videoModal');
    videoPlayer.play();
}

function closeVideoModal() {
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.pause();
    videoPlayer.src = "";
    closeModal('videoModal');
}

// Modallar
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function switchModal(closeId, openId) { closeModal(closeId); openModal(openId); }

// Kullanıcı Oturumu
function checkUserStatus() {
    const userMenu = document.getElementById('userMenu');
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        userMenu.innerHTML = `
            <div class="user-profile-wrap" onclick="toggleProfileDropdown(event)">
                <div class="user-avatar">
                    <span class="user-initial">${currentUser.charAt(0).toUpperCase()}</span>
                </div>
                <span class="user-name">${currentUser}</span>
                <i class="fas fa-chevron-down user-chevron"></i>
                
                <div class="profile-dropdown" id="profileDropdown">
                    <div class="dropdown-header">
                        <span class="dropdown-title">Hoş Geldin,</span>
                        <span class="dropdown-user">${currentUser}</span>
                    </div>
                    <hr class="dropdown-divider">
                    <a href="javascript:void(0)" onclick="openSettingsModal()" class="dropdown-item">
                        <i class="fas fa-cog"></i> Ayarlar
                    </a>
                    <hr class="dropdown-divider">
                    <a href="javascript:void(0)" onclick="logout()" class="dropdown-item logout-item">
                        <i class="fas fa-sign-out-alt"></i> Çıkış Yap
                    </a>
                </div>
            </div>
        `;
    } else {
        userMenu.innerHTML = `
            <button class="btn btn-glass" onclick="openModal('loginModal')"><i class="fas fa-sign-in-alt"></i> Giriş</button>
            <button class="btn btn-primary glow-btn" onclick="openModal('registerModal')"><i class="fas fa-user-plus"></i> Kayıt Ol</button>
        `;
    }
}

function toggleProfileDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    const chevron = document.querySelector('.user-chevron');
    if (dropdown) dropdown.classList.toggle('active');
    if (chevron) chevron.classList.toggle('active');
}
function logout() {
    localStorage.removeItem('currentUser');
    window.location.reload();
}

// Favoriler / Benim Listem Sistemi
function getMyList() {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return [];
    return JSON.parse(localStorage.getItem('myList_' + currentUser)) || [];
}

function saveMyList(list) {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) localStorage.setItem('myList_' + currentUser, JSON.stringify(list));
}

function toggleFavorite(id) {
    if (!localStorage.getItem('currentUser')) {
        showNotification("Listeye eklemek için önce giriş yapmalısın!", "error");
        openModal('loginModal');
        return;
    }
    
    let list = getMyList();
    if (list.includes(id)) {
        list = list.filter(item => item !== id);
        showNotification("Favorilerinden çıkarıldı.", "success");
    } else {
        list.push(id);
        showNotification("Favorilerine eklendi!", "success");
    }
    
    saveMyList(list);
    renderMyList();
    if(document.getElementById('favoritesGrid')) populateFavorites(); // Update real-time if open
    updateFavoriteButton(id);
}

function updateFavoriteButton(id) {
    const btn = document.getElementById('addFavoriteBtn');
    if (!btn) return;
    const list = getMyList();
    if (list.includes(id)) {
        btn.innerHTML = `<i class="fas fa-heart-broken" style="color:var(--secondary)"></i> Favorilerden Çıkar`;
        btn.style.color = "var(--secondary)";
        btn.style.borderColor = "var(--secondary)";
    } else {
        btn.innerHTML = `<i class="fas fa-heart"></i> Favorilere Ekle`;
        btn.style.color = "white";
        btn.style.borderColor = "var(--glass-border)";
    }
}

function openFavoritesModal() {
    populateFavorites();
    openModal('favoritesModal');
}

function renderMyList() {
    const navBtn = document.getElementById('navMyListBtn');
    if (!navBtn) return;
    
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) { 
        navBtn.style.display = 'none';
        return; 
    }
    
    navBtn.style.display = 'inline-block';
}

function populateFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const statsContainer = document.getElementById('favStatsContainer');
    if (!grid) return;
    
    const list = getMyList();
    if (list.length === 0) {
        if(statsContainer) statsContainer.innerHTML = '';
        grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 50px; text-align: center; color: var(--text-muted); font-size: 1.2rem;"><i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 20px; color: var(--glass-border);"></i><br>Henüz favorilerine bir anime eklemedin.</div>';
        return;
    }
    
    const myAnimes = animelerData.filter(a => list.includes(a.id));
    grid.innerHTML = '';
    
    if(statsContainer) {
        statsContainer.innerHTML = `
            <div class="fav-stat-box"><i class="fas fa-film"></i> Toplam ${myAnimes.length} Anime Kayıtlı</div>
        `;
    }
    
    
    myAnimes.forEach((anime) => {
        const div = document.createElement('div');
        div.className = 'anime-card';
        div.onclick = () => {
            closeModal('favoritesModal');
            openAnimeDetail(anime.id);
        };
        div.innerHTML = `
            <div class="anime-img-container" style="height: 280px;">
                <img src="${anime.image}" class="anime-img">
                <div class="play-overlay"><i class="fas fa-play-circle"></i></div>
            </div>
            <div class="anime-info">
                <div class="anime-title" style="font-size:1.1rem;">${anime.title}</div>
            </div>
        `;
        grid.appendChild(div);
    });
}

// Şık Bildirim Sistemi
function showNotification(message, type="success") {
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.bottom = '20px';
    notif.style.right = '20px';
    notif.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    notif.style.color = 'white';
    notif.style.padding = '15px 25px';
    notif.style.borderRadius = '10px';
    notif.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    notif.style.zIndex = '9999';
    notif.style.backdropFilter = 'blur(10px)';
    notif.style.animation = 'popup 0.4s ease';
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> &nbsp; ${message}`;
    
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(20px)';
        notif.style.transition = '0.4s';
        setTimeout(() => notif.remove(), 400);
    }, 4000);
}

// ----- Ayarlar ve Tema Sistemi -----

let userSettings = {
    theme: 'default',
    animations: true,
    autoplay: true,
    compact: false,
    clarity: false
};

function initSettings() {
    const saved = localStorage.getItem('userSettings_colakanime');
    if (saved) {
        userSettings = JSON.parse(saved);
    }
    
    // Uygula
    changeTheme(userSettings.theme, false);
    toggleAnimations(userSettings.animations, false);
    toggleAutoplay(userSettings.autoplay, false);
    toggleCompactMode(userSettings.compact, false);
    toggleGlassClarity(userSettings.clarity, false);
    
    // Arayüzü güncelle
    const tSelect = document.getElementById('themeSelecter');
    const aToggle = document.getElementById('animToggle');
    const apToggle = document.getElementById('autoplayToggle');
    const cToggle = document.getElementById('compactToggle');
    const gToggle = document.getElementById('glassToggle');

    if (tSelect) tSelect.value = userSettings.theme;
    if (aToggle) aToggle.checked = userSettings.animations;
    if (apToggle) apToggle.checked = userSettings.autoplay;
    if (cToggle) cToggle.checked = userSettings.compact;
    if (gToggle) gToggle.checked = userSettings.clarity;
}

function saveSettings() {
    localStorage.setItem('userSettings_colakanime', JSON.stringify(userSettings));
}

function openSettingsModal() {
    const dropdown = document.getElementById('profileDropdown');
    const chevron = document.querySelector('.user-chevron');
    if (dropdown) dropdown.classList.remove('active');
    if (chevron) chevron.classList.remove('active');
    
    openModal('settingsModal');
}

function changeTheme(themeVal, showNotif = true) {
    userSettings.theme = themeVal;
    
    const root = document.documentElement;
    if (themeVal === 'default') {
        root.style.setProperty('--primary', '#8b5cf6');
        root.style.setProperty('--primary-hover', '#a78bfa');
        root.style.setProperty('--secondary', '#ec4899');
    } else if (themeVal === 'blue') {
        root.style.setProperty('--primary', '#3b82f6');
        root.style.setProperty('--primary-hover', '#60a5fa');
        root.style.setProperty('--secondary', '#06b6d4');
    } else if (themeVal === 'red') {
        root.style.setProperty('--primary', '#ef4444');
        root.style.setProperty('--primary-hover', '#f87171');
        root.style.setProperty('--secondary', '#f97316');
    } else if (themeVal === 'green') {
        root.style.setProperty('--primary', '#10b981');
        root.style.setProperty('--primary-hover', '#34d399');
        root.style.setProperty('--secondary', '#84cc16');
    }
    
    saveSettings();
    if (showNotif) showNotification("Tema başarıyla değiştirildi!");
}

function toggleAnimations(isActive, showNotif = true) {
    userSettings.animations = isActive;
    const orbs = document.querySelector('.bg-orbs');
    if (orbs) {
        orbs.style.display = isActive ? 'block' : 'none';
    }
    saveSettings();
    if (showNotif) showNotification(isActive ? "Animasyonlar açıldı!" : "Animasyonlar kapatıldı.");
}

function toggleAutoplay(isActive, showNotif = true) {
    userSettings.autoplay = isActive;
    
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.autoplay = isActive;
    }
    saveSettings();
    if (showNotif) showNotification(isActive ? "Otomatik oynatma açıldı!" : "Otomatik oynatma kapatıldı.");
}

function toggleCompactMode(isActive, showNotif = true) {
    userSettings.compact = isActive;
    const grid = document.getElementById('animeGrid');
    if (grid) {
        if (isActive) {
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
            grid.style.gap = '15px';
        } else {
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
            grid.style.gap = '30px';
        }
    }
    saveSettings();
    if (showNotif) showNotification(isActive ? "Kompakt görünüm aktif!" : "Standart görünüm aktif.");
}

function toggleGlassClarity(isActive, showNotif = true) {
    userSettings.clarity = isActive;
    const root = document.documentElement;
    if (isActive) {
        root.style.setProperty('--glass-bg', 'rgba(15, 17, 26, 0.95)');
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.2)');
    } else {
        root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    }
    saveSettings();
    if (showNotif) showNotification(isActive ? "Ultra netlik aktif!" : "Klasik cam efekti aktif.");
}

// Dom kilitlendiğinde ayarları da çalıştır
document.addEventListener('DOMContentLoaded', initSettings);
