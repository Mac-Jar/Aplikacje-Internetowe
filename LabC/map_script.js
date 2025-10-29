

/* FILE: script.js */

// Script for LAB C — puzzle map
// Wymagania z treści zadania:
// - pobranie zgody na lokalizację
// - pobranie zgody na powiadomienia
// - okno mapy Leaflet
// - przycisk Moja lokalizacja -> pokazuje współrzędne i oznacza na mapie
// - eksport mapy do rastra (html2canvas)
// - podział obrazu na 16 części (4x4), wymieszanie i rozrzucone na stole
// - drag & drop do umieszczania w slotach
// - weryfikacja na bieżąco; po ułożeniu wszystkich -> Notification

// Uwaga: Jeżeli tile server blokuje CORS, eksport przez html2canvas może się nie udać (tainting).
// Dlatego tileLayer ustawiamy crossOrigin: true i korzystamy z ogólnodostępnych tile'y.

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('map');
    const locBtn = document.getElementById('loc-btn');
    const exportBtn = document.getElementById('export-btn');
    const notifBtn = document.getElementById('notif-perm');
    const info = document.getElementById('info');
    const board = document.getElementById('board');
    const table = document.getElementById('table');

// Inicjalizacja mapy Leaflet
    const map = L.map(mapEl).setView([52.2297, 21.0122], 13);

// Tile layer z crossOrigin - może pomóc przy html2canvas
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
        crossOrigin: true
    });

    tiles.addTo(map);

    let myMarker = null;

// Geolocation: prośba o zgodę automatycznie przy kliknięciu przycisku
    locBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Twoja przeglądarka nie wspiera Geolocation API');
            return;
        }
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            info.textContent = `Twoja lokalizacja: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            if (myMarker) map.removeLayer(myMarker);
            myMarker = L.marker([latitude, longitude]).addTo(map).bindPopup('Tu jesteś').openPopup();
            map.setView([latitude, longitude], 14);
        }, err => {
            alert('Nie otrzymano zgody lub wystąpił błąd: ' + err.message);
        });
    });

// Powiadomienia
    notifBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            alert('Przeglądarka nie wspiera Notification API');
            return;
        }
        const perm = await Notification.requestPermission();
        info.textContent = 'Permission for notifications: ' + perm;
    });

// Przygotowanie pól docelowych (4x4)
    const S_ROWS = 4, S_COLS = 4;
    for (let r=0; r<S_ROWS*S_COLS; r++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.slotIndex = r;
        slot.addEventListener('dragover', ev => ev.preventDefault());
        slot.addEventListener('drop', onDropToSlot);
        board.appendChild(slot);
    }

    let piecesState = {}; // pieceId -> correctSlot
    let placed = {};

// Eksport mapy do rastra i podział
    exportBtn.addEventListener('click', async () => {
        info.textContent = 'Tworzę obraz mapy...';
// chwilowo ustawiamy mały zoom żeby obraz pasował do wymiarów elementów
        await new Promise(resolve => setTimeout(resolve, 200));

// użyj html2canvas na kontenerze mapy
        try {
            const canvas = await html2canvas(mapEl, {useCORS: true, allowTaint: false, backgroundColor: null});
            const w = canvas.width, h = canvas.height;
            const pieceW = Math.floor(w / S_COLS);
            const pieceH = Math.floor(h / S_ROWS);

// wyczyść poprzednie
            table.innerHTML = '';
            piecesState = {};
            placed = {};

// stworzenie 16 kawałków jako canvases
            let pieces = [];
            for (let r=0; r<S_ROWS; r++) {
                for (let c=0; c<S_COLS; c++) {
                    const pCanvas = document.createElement('canvas');
                    pCanvas.width = pieceW;
                    pCanvas.height = pieceH;
                    const ctx = pCanvas.getContext('2d');
                    ctx.drawImage(canvas, c*pieceW, r*pieceH, pieceW, pieceH, 0, 0, pieceW, pieceH);
                    const id = `${r}-${c}`;
                    pCanvas.className = 'piece';
                    pCanvas.draggable = true;
                    pCanvas.dataset.pieceId = id;
// data-url for quick preview or drag image
                    pCanvas.dataset.correctSlot = r*S_COLS + c;

                    pCanvas.addEventListener('dragstart', ev => {
                        ev.dataTransfer.setData('text/plain', id);
// set drag image
                        const img = new Image();
                        img.src = pCanvas.toDataURL();
                        ev.dataTransfer.setDragImage(img, pieceW/2, pieceH/2);
                    });

                    pieces.push(pCanvas);
                    piecesState[id] = r*S_COLS + c;
                }
            }

// shuffle pieces
            shuffleArray(pieces);
            pieces.forEach(pc => table.appendChild(pc));
            info.textContent = 'Mapa podzielona i rozrzucona. Przeciągnij elementy na planszę.';

// Allow dropping back to table
            table.addEventListener('dragover', ev => ev.preventDefault());
            table.addEventListener('drop', ev => {
                ev.preventDefault();
                const id = ev.dataTransfer.getData('text/plain');
                const node = document.querySelector(`[data-piece-id='${id}']`);
                if (node) table.appendChild(node);
// jeśli był w jakimś slocie, odznacz
                const slotEl = document.querySelector(`[data-slot-index][data-occupied='${id}']`);
                if (slotEl) {
                    delete slotEl.dataset.occupied;
                }
                checkAllCorrect();
            });

        } catch (e) {
            console.error(e);
            alert('Nie udało się wykonać eksportu mapy. Przyczyną może być blokada CORS na serwerze kafelków. Spróbuj innego tile servera z obsługą CORS.');
            info.textContent = 'Błąd eksportu: ' + e.message;
        }
    });

    function onDropToSlot(ev) {
        ev.preventDefault();
        const slot = ev.currentTarget;
        const id = ev.dataTransfer.getData('text/plain');
        const node = document.querySelector(`[data-piece-id='${id}']`);
        if (!node) return;

// jeżeli miejsce już zajęte, przenieś istniejący element z powrotem na stół
        if (slot.dataset.occupied) {
            const prevId = slot.dataset.occupied;
            const prevNode = document.querySelector(`[data-piece-id='${prevId}']`);
            if (prevNode) table.appendChild(prevNode);
            delete slot.dataset.occupied;
        }

        slot.appendChild(node);
        slot.dataset.occupied = id;

// sprawdź czy poprawne
        const correctSlot = parseInt(node.dataset.correctSlot, 10);
        const slotIndex = parseInt(slot.dataset.slotIndex, 10);
        if (correctSlot === slotIndex) {
            slot.style.border = '2px solid green';
            placed[id] = true;
        } else {
            slot.style.border = '2px solid red';
            placed[id] = false;
        }

        checkAllCorrect();
    }

    function checkAllCorrect() {
// count correct pieces placed into slots
        const total = Object.keys(piecesState).length;
        const correctPlaced = Object.keys(placed).filter(k => placed[k]).length;
        info.textContent = `Ustawione poprawnie: ${correctPlaced} / ${total}`;
        if (total > 0 && correctPlaced === total) {
// wszystkie ułożone poprawnie
            showNotification('Gratulacje!', 'Ułożyłeś mapę poprawnie.');
        }
    }

    function showNotification(title, body) {
        if (!('Notification' in window)) return alert(`${title}\n${body}`);
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') new Notification(title, { body });
            });
        } else {
// denied
            alert(`${title}\n${body}`);
        }
    }

// util
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

});
