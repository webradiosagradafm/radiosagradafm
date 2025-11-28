// ToucanPlayer.js

(function() {
    // 1. CONSTANTES E CONFIGURAÇÕES
    const STREAM_URL = "https://stream.zeno.fm/hvwifp8ezc6tv";
    const audio = new Audio(STREAM_URL);
    audio.volume = 0.8;
    
    // Configuração de fuso horário: America/Chicago
    const TIME_ZONE = "America/Chicago";

    const images = {
        default: "/image/logopraisefm.webp",
        midnight: "/image/midnightgracelogo.webp",
        worship: "/image/praisefmworship.png",
        morning: "/image/morningshowlogo.webp",
        midday: "/image/middaygracelogo.webp",
        nonstop: "/image/praisefmnonstop.png",
        carpool: "/image/praisefmcarpoollogo.webp",
        pop: "/image/praisefmpoplogo.webp",
        sunday: "/image/sundaywithchrist.png",
        magazine: "/image/praisefmmagazine.png"
    };

    const hosts = {
        "Morning Show": "Stancy Campbell",
        "Midday Grace": "Michael Ray",
        "Praise FM Carpool": "Rachael Harris",
        "Praise FM POP": "Jordan Reys",
        "Sunday With Christ": "Matt Riley",
        "Midnight Grace": "Daniel Brooks",
        "Praise FM Non Stop": "Praise FM",
        "Praise FM Worship": "Praise FM"
    };

    // Estrutura de agendamento (Schedule)
    const schedule = [
        {start:"00:00", end:"06:00", name:"Midnight Grace", img:images.midnight, desc: "Daniel Brooks lays down the most soothing overnight praise vibes."},
        {start:"06:00", end:"07:00", name:"Praise FM Worship", img:images.worship, desc: "Praise FM plays the finest worship music."},
        {start:"07:00", end:"12:00", name:"Morning Show", img:images.morning, days:[1,2,3,4,5], desc: "Stancy Campbell kickstarts your day with uplifting praise and inspiration."},
        {start:"07:00", end:"12:00", name:"Sunday With Christ", img:images.sunday, days:[0], desc: "Matt Riley shares spiritual insights and Sunday music."},
        {start:"12:00", end:"16:00", name:"Midday Grace", img:images.midday, desc: "Michael Ray brings grace and tunes through the midday."},
        {start:"16:00", end:"17:00", name:"Praise FM Non Stop", img:images.nonstop, desc: "Praise FM with non-stop praise hits."},
        {start:"17:00", end:"18:00", name:"Praise FM Worship", img:images.worship, desc: "Praise FM plays the finest worship music."},
        {start:"18:00", end:"20:00", name:"Praise FM Carpool", img:images.carpool, days:[1,2,3,4,5], desc: "Rachael Harris with praise tunes for your drive home."},
        {start:"20:00", end:"20:30", name:"Praise FM POP", img:images.pop, desc: "Jordan Reys with all things pop and contemporary praise."},
        {start:"20:30", end:"20:31", name:"Praise FM Magazine", img:images.magazine, days:[0], desc: "Praise FM with magazine-style content and features."},
        {start:"20:30", end:"21:30", name:"Praise FM Non Stop", img:images.nonstop, days:[1,2,3,4,5,6], desc: "Praise FM with non-stop praise hits."},
        {start:"21:30", end:"00:00", name:"Praise FM Worship", img:images.worship, desc: "Praise FM plays the finest worship music."}
    ];

    let currentTrack = {title:"", artist:"", duration:0, startTime:0};
    const recents = [];
    let trackTimer = null;

    // 2. FUNÇÕES DE UTILIDADE DE TEMPO E FORMATO
    /** Retorna a data/hora atual no fuso horário da estação (America/Chicago). */
    function getTime() { 
        return new Date(new Date().toLocaleString("en-US", {timeZone: TIME_ZONE})); 
    }

    /** Converte HH:MM para minutos desde a meia-noite. */
    function timeToMins(t) { 
        const [h,m] = t.split(":").map(Number); 
        return h * 60 + m; 
    }

    /** Formata segundos em M:SS. */
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    /** Formata o nome do programa. */
    function formatProgramName(p) {
        if (!p) return "Praise FM";
        const base = p.name.replace(/ \([^)]*\)$/, '').trim();
        if (["Praise FM Non Stop", "Praise FM POP", "Praise FM Magazine", "Praise FM Worship"].includes(base)) {
            return base;
        }
        const host = hosts[base] || "Praise FM";
        return `${base} With ${host}`;
    }

    /** Formata o horário de início e fim em AM/PM. */
    function formatRange(p) {
        const [sh, sm] = p.start.split(":").map(Number);
        const [eh, em] = p.end.split(":").map(Number);
        const sSuffix = sh >= 12 ? "PM" : "AM";
        const eSuffix = eh >= 12 ? "PM" : "AM";
        // Convert to 12-hour format: (H + 11) % 12 + 1
        const sHour = ((sh + 11) % 12) + 1;
        const eHour = ((eh + 11) % 12) + 1;
        return `${sHour}:${sm.toString().padStart(2, '0')} ${sSuffix} - ${eHour}:${em.toString().padStart(2, '0')} ${eSuffix}`;
    }

    // 3. LÓGICA DE AGENDAMENTO
    function getCurrentAndNext() {
        const now = getTime();
        const day = now.getDay(); // 0=Sunday, 6=Saturday
        const mins = timeToMins(now.toTimeString().slice(0,5));
        let current = null;
        const future = [];

        for (const p of schedule) {
            if (p.days && !p.days.includes(day)) continue;
            const s = timeToMins(p.start);
            const e = timeToMins(p.end);
            // Lida com programas que passam da meia-noite (e <= s)
            const end = e <= s ? e + 1440 : e; 
            
            // Verifica o programa atual
            if (mins >= s && mins < end) {
                // Se houver sobreposição, prioriza o programa que termina mais tarde (maior duração)
                if (!current || end > timeToMins(current.end) + (timeToMins(current.end) <= timeToMins(current.start) ? 1440 : 0)) {
                     current = p;
                }
            }
            
            // Verifica os programas futuros
            if (mins < s) future.push({prog:p, startMins:s});
        }

        // Se nenhum programa futuro hoje, pega os programas de amanhã
        if (future.length === 0) {
            const tomorrow = (day + 1) % 7;
            for (const p of schedule) {
                // Apenas adiciona se o programa ocorrer amanhã
                if (!p.days || p.days.includes(tomorrow)) future.push({prog:p, startMins:timeToMins(p.start) + 1440}); // Adiciona 1440 minutos para ordenar após os de hoje
            }
        }

        future.sort((a,b) => a.startMins - b.startMins);
        
        // Retorna o programa atual (ou fallback), e os próximos dois
        return {
            current: current || {name:"Praise FM", img:images.default, start:"00:00", end:"00:00"},
            next1: future[0]?.prog || schedule[0],
            next2: future[1]?.prog || (future.length > 1 ? future[1].prog : schedule[1])
        };
    }

    // 4. METADADOS E FUNÇÕES DE REPRODUÇÃO RECENTE
    function updateProgramProgress() {
        const {current} = getCurrentAndNext();
        const now = getTime();
        const miniTrackFill = document.getElementById("miniTrackFill");
        const miniTrackCurrent = document.getElementById("miniTrackCurrent");
        const miniTrackDuration = document.getElementById("miniTrackDuration");
        const progressRing = document.getElementById("progressRing");

        if (current.start && current.end) {
            const s = timeToMins(current.start);
            let e = timeToMins(current.end);
            const n = timeToMins(now.toTimeString().slice(0,5));
            
            // Lida com a transição de meia-noite
            if (e <= s) e += 1440; 

            const total = e - s;
            const elapsed = (n >= s && n < e) ? n - s : (n + 1440) - s;

            const pct = total > 0 ? (elapsed / total) * 100 : 0;
            
            // Atualiza a barra de progresso do mini-player
            if(miniTrackFill) miniTrackFill.style.width = `${pct}%`;
            // Atualiza o tempo atual e total do mini-player
            if(miniTrackCurrent) miniTrackCurrent.textContent = formatTime(elapsed * 60);
            if(miniTrackDuration) miniTrackDuration.textContent = formatTime(total * 60);

            // Atualiza o anel de progresso circular
            if (progressRing) progressRing.style.background = `conic-gradient(var(--orange) ${pct}%, transparent ${pct}%)`;

        } else {
            // Caso não haja um programa definido (fallback)
            if(miniTrackFill) miniTrackFill.style.width = "0%";
            if(miniTrackCurrent) miniTrackCurrent.textContent = "--:--";
            if(miniTrackDuration) miniTrackDuration.textContent = "Live";
            if (progressRing) progressRing.style.background = "conic-gradient(var(--orange) 0%, transparent 0%)";
        }
    }

    /** Busca a capa do álbum na API do iTunes. */
    async function fetchAlbumCover(artist, title) {
        if (!artist || !title) return images.default;
        const query = encodeURIComponent(`${artist} ${title}`);
        const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.results?.[0]?.artworkUrl100) {
                // Aumenta o tamanho da imagem para melhor qualidade (e.g., de 100x100 para 600x600)
                return data.results[0].artworkUrl100.replace('100x100', '600x600'); 
            }
        } catch (e) {
            console.error("Erro ao buscar capa do álbum:", e);
        }
        return images.default;
    }

    /** Processa os metadados da faixa e atualiza a lista de reprodução recente. */
    async function processMetadata(artist, title) {
        if (trackTimer) clearInterval(trackTimer);
        
        const isAd = title.toLowerCase().includes("commercial") || title.toLowerCase().includes("ad");
        
        if (isAd) {
            currentTrack = {title:"", artist:"", duration:0, startTime:0};
        } else {
            currentTrack = {title, artist, duration:0, startTime:Date.now()};
            const cover = await fetchAlbumCover(artist, title);
            const key = `${artist}-${title}`;

            // Adiciona à lista de recentes se for uma faixa nova
            if (!recents.some(t => t.key === key)) {
                recents.unshift({title, artist, cover, key});
                if (recents.length > 4) recents.pop(); // Limita a 4 itens
                
                // Atualiza a lista de reproduzidas recentemente na UI
                const recentList = document.getElementById("recentList");
                if (recentList) {
                     recentList.innerHTML = recents.map(t => `
                        <div class="recent-item">
                            <img src="${t.cover}" class="recent-cover" onerror="this.src='${images.default}'" alt="Cover for ${t.title}">
                            <div>
                                <div class="recent-title">${t.title}</div>
                                <div class="recent-artist">${t.artist}</div>
                            </div>
                        </div>
                    `).join("");
                }
            }
        }
        
        updateDisplay(); // Atualiza os títulos e artistas na tela
        trackTimer = setInterval(updateProgramProgress, 1000); // Inicia/reinicia o timer de progresso
    }

    // 5. ATUALIZAÇÃO DA INTERFACE DO USUÁRIO
    function updateDisplay() {
        const {current, next1, next2} = getCurrentAndNext();

        // Atualiza Imagens
        if (document.getElementById("mainImg")) document.getElementById("mainImg").src = current.img || images.default;
        if (document.getElementById("miniImg")) document.getElementById("miniImg").src = current.img || images.default;
        if (document.getElementById("upnextImg1")) document.getElementById("upnextImg1").src = next1.img || images.default;
        if (document.getElementById("upnextImg2")) document.getElementById("upnextImg2").src = next2.img || images.default;
        
        // Atualiza Títulos
        const displayName = formatProgramName(current);
        if (document.getElementById("programTitle")) document.getElementById("programTitle").textContent = displayName;
        
        // Atualiza Mini Player
        if (document.getElementById("miniTitle")) document.getElementById("miniTitle").textContent = currentTrack.title ? currentTrack.title : displayName;
        if (document.getElementById("miniArtist")) document.getElementById("miniArtist").textContent = currentTrack.artist ? currentTrack.artist : "Praise & Worship";

        // Atualiza Próximos Programas (Up Next)
        if (document.getElementById("upnextTime1")) document.getElementById("upnextTime1").textContent = "UP NEXT: " + formatRange(next1);
        if (document.getElementById("upnextTitle1")) document.getElementById("upnextTitle1").textContent = formatProgramName(next1);
        if (document.getElementById("upnextDesc1")) document.getElementById("upnextDesc1").textContent = next1.desc || "-";
        
        if (document.getElementById("upnextTime2")) document.getElementById("upnextTime2").textContent = formatRange(next2);
        if (document.getElementById("upnextTitle2")) document.getElementById("upnextTitle2").textContent = formatProgramName(next2);
        if (document.getElementById("upnextDesc2")) document.getElementById("upnextDesc2").textContent = next2.desc || "-";
        
        // Atualiza o progresso do programa (barra e anel)
        updateProgramProgress(); 
    }

    // 6. EVENTOS DE ÁUDIO E CONTROLES
    function togglePlay() {
        const bigPlay = document.getElementById("bigPlay");
        const miniPlayPause = document.getElementById("miniPlayPause");
        const miniPlayer = document.getElementById("miniPlayer");
        
        if (audio.paused) { 
            audio.play(); 
            if (miniPlayer) miniPlayer.classList.add("show"); 
        } else { 
            audio.pause(); 
        }

        const playing = !audio.paused;
        const playSvg = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        const pauseSvg = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        
        if (bigPlay) bigPlay.innerHTML = playing ? pauseSvg + ' Pause' : playSvg + ' Play';
        if (miniPlayPause) miniPlayPause.innerHTML = playing ? pauseSvg : playSvg;
    }

    function updateVolumeDisplay() {
        const miniVolumeFill = document.getElementById("miniVolumeFill");
        const miniVolumeIcon = document.getElementById("miniVolumeIcon");
        
        if (miniVolumeFill) miniVolumeFill.style.width = (audio.volume * 100) + '%';
        
        if (miniVolumeIcon) {
             const muteSvg = '<svg viewBox="0 0 24 24"><path d="M16.5 12l4.5 4.5-1.5 1.5L15 13.5 11.5 17H7v-6h4.5L15 7.5l4.5-4.5 1.5 1.5L16.5 12z"/></svg>';
             const volumeSvg = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
             miniVolumeIcon.innerHTML = audio.muted ? muteSvg : volumeSvg;
        }
    }

    // 7. LISTENERS E INICIALIZAÇÃO
    function setupEventListeners() {
        // Controles de Reprodução
        if (document.getElementById("bigPlay")) document.getElementById("bigPlay").onclick = togglePlay;
        if (document.getElementById("miniPlayPause")) document.getElementById("miniPlayPause").onclick = togglePlay;
        
        // Controles de Pular (Rewind/Forward)
        if (document.getElementById("miniRewind")) document.getElementById("miniRewind").onclick = () => audio.currentTime = Math.max(0, audio.currentTime - 15);
        if (document.getElementById("miniForward")) document.getElementById("miniForward").onclick = () => audio.currentTime += 15;
        
        // Controles de Volume
        const miniVolumeBar = document.getElementById("miniVolumeBar");
        if (miniVolumeBar) {
            miniVolumeBar.onclick = e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audio.volume = Math.max(0, Math.min(1, percent));
                audio.muted = false; // Desmuta ao alterar o volume
                updateVolumeDisplay();
            };
        }
        
        const miniVolumeIcon = document.getElementById("miniVolumeIcon");
        if (miniVolumeIcon) {
            miniVolumeIcon.onclick = () => {
                audio.muted = !audio.muted;
                updateVolumeDisplay();
            };
        }

        // Garante que o display de volume está correto na inicialização
        updateVolumeDisplay();
    }
    
    // Conecta ao EventSource para metadados em tempo real (Now Playing)
    function setupMetadataListener() {
        try {
            const es = new EventSource("https://api.zeno.fm/mounts/metadata/subscribe/hvwifp8ezc6tv");
            es.onmessage = e => {
                try {
                    const d = JSON.parse(e.data);
                    if (d.streamTitle) {
                        const parts = d.streamTitle.split(" - ");
                        // O stream envia "Artista - Título"
                        processMetadata(parts[0]||"", parts.slice(1).join(" - ")||"");
                    }
                } catch (err) {
                    console.error("Erro ao processar metadados:", err);
                }
            };
        } catch(e) {
            console.error("Erro ao conectar ao EventSource de metadados:", e);
        }
    }

    // Função principal de inicialização
    function init() {
        // 1. Configura os listeners da interface do usuário
        setupEventListeners();
        
        // 2. Conecta para receber os metadados
        setupMetadataListener();
        
        // 3. Atualiza a tela imediatamente (dados do programa, next, etc.)
        updateDisplay();
        
        // 4. Configura o intervalo de atualização para a programação (8 segundos)
        setInterval(updateDisplay, 8000);
    }
    
    // Inicializa o player quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

// 🌐 Lógica do Banner de Localização (Apple-style) - Mantida no HTML para uso imediato do DOM e script síncrono.
// Se desejado, esta lógica também pode ser movida para este arquivo.