// FILE: map_script.js
// Poprawiona wersja: używa leaflet-image zamiast html2canvas,
// czyści planszę przed generowaniem, oraz stabilniejszy drag & drop.

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('map');
    const locBtn = document.getElementById('loc-btn');
    const exportBtn = document.getElementById('export-btn');
    const notifBtn = document.getElementById('notif-perm');
    const info = document.getElementById('info');
    const board = document.getElementById('board');
    const table = document.getElementById('table');

    const S_ROWS = 4, S_COLS = 4;

    // Inicjalizacja mapy Leaflet
    const map = L.map(mapEl).setView([52.2297, 21.0122], 13);

    // Tile layer z crossOrigin - może pomóc przy rasteryzacji
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
        crossOrigin: true
    });
    tiles.addTo(map);

    let myMarker = null;

    // Przygotowanie pól docelowych (4x4)
    for (let r = 0; r < S_ROWS * S_COLS; r++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.slotIndex = r;
        slot.addEventListener('dragover', ev => ev.preventDefault());
        slot.addEventListener('drop', onDropToSlot);
        board.appendChild(slot);
    }

    // Stan puzzli
    let piecesState = {}; // pieceId -> correctSlotIndex
    let placed = {};      // pieceId -> boolean (czy poprawnie umieszczone)
    const piecesById = new Map(); // pieceId -> element (stabilne odnajdywanie)

    // --- Geolocation ---
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

    // --- Powiadomienia ---
    notifBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            alert('Przeglądarka nie wspiera Notification API');
            return;
        }
        const perm = await Notification.requestPermission();
        info.textContent = 'Permission for notifications: ' + perm;
    });

    // Pozwól wrzucać z powrotem na stół
    table.addEventListener('dragover', ev => ev.preventDefault());
    table.addEventListener('drop', ev => {
        ev.preventDefault();
        const id = ev.dataTransfer.getData('text/plain');
        const node = piecesById.get(id);
        if (!node) return;

        // jeśli był w jakimś slocie, odznacz
        const prevSlot = findSlotByOccupiedId(id);
        if (prevSlot) {
            delete prevSlot.dataset.occupied;
            prevSlot.style.border = ''; // przywróć domyślne
        }

        table.appendChild(node);
        // zaznacz jako nieprzydzielony
        placed[id] = false;
        checkAllCorrect();
    });

    // --- Eksport mapy i podział na kawałki (leaflet-image) ---
    exportBtn.addEventListener('click', async () => {
        info.textContent = 'Generuję obraz mapy...';

        // Przygotowanie: wyczyść stół i planszę (zawartość i stany)
        clearAllPiecesAndSlots();

        // Krótkie opóźnienie (render), nie jest wymagane ale pomaga przy dynamicznym DOM
        await new Promise(resolve => setTimeout(resolve, 100));

        // Użyj leaflet-image (leafletImage) - biblioteka powinna być dołączona w HTML
        if (typeof leafletImage !== 'function') {
            alert('Brak leaflet-image (leafletImage). Dołącz leaflet-image.js w HTML.');
            info.textContent = 'Błąd: brak leaflet-image.js';
            return;
        }

        leafletImage(map, (err, canvas) => {
            if (err || !canvas) {
                console.error(err);
                alert('Nie udało się wygenerować obrazu mapy. Spróbuj innego tile servera lub sprawdź konsolę.');
                info.textContent = 'Błąd generowania obrazu mapy';
                return;
            }

            const w = canvas.width, h = canvas.height;
            const pieceW = Math.floor(w / S_COLS);
            const pieceH = Math.floor(h / S_ROWS);

            // reset stanów
            piecesState = {};
            placed = {};
            piecesById.clear();

            // utworzenie kawałków
            const pieces = [];
            for (let r = 0; r < S_ROWS; r++) {
                for (let c = 0; c < S_COLS; c++) {
                    const pCanvas = document.createElement('canvas');
                    pCanvas.width = pieceW;
                    pCanvas.height = pieceH;
                    const ctx = pCanvas.getContext('2d');
                    ctx.drawImage(canvas, c * pieceW, r * pieceH, pieceW, pieceH, 0, 0, pieceW, pieceH);

                    const id = `${r}-${c}`;
                    pCanvas.className = 'piece';
                    pCanvas.draggable = true;
                    pCanvas.dataset.pieceId = id;
                    pCanvas.dataset.correctSlot = (r * S_COLS + c).toString();

                    // dragstart
                    pCanvas.addEventListener('dragstart', ev => {
                        ev.dataTransfer.setData('text/plain', id);
                        ev.dataTransfer.effectAllowed = 'move';
                        // set drag image
                        const dragImg = new Image();
                        dragImg.src = pCanvas.toDataURL();
                        // jeśli obraz się jeszcze nie załadował, ustaw mały placeholder
                        dragImg.onload = () => ev.dataTransfer.setDragImage(dragImg, pieceW / 2, pieceH / 2);
                        // fallback: natychmiast ustaw bez wait
                        ev.dataTransfer.setDragImage(pCanvas, pieceW / 2, pieceH / 2);
                    });

                    // dragend - upewnij się, że nie ma tmp stanów
                    pCanvas.addEventListener('dragend', () => {
                        // nic specjalnego teraz, ale tu można dodać cleanup
                    });

                    pieces.push(pCanvas);
                    piecesState[id] = parseInt(pCanvas.dataset.correctSlot, 10);
                    placed[id] = false;
                    piecesById.set(id, pCanvas);
                }
            }

            // shuffle i dodaj na stół
            shuffleArray(pieces);
            pieces.forEach(pc => table.appendChild(pc));

            info.textContent = 'Mapa podzielona i rozrzucona. Przeciągnij elementy na planszę.';
            checkAllCorrect(); // aktualizacja licznika
        });
    });

    function onDropToSlot(ev) {
        ev.preventDefault();
        const slot = ev.currentTarget;
        const id = ev.dataTransfer.getData('text/plain');
        const node = piecesById.get(id);
        if (!node) return;

        // jeżeli miejsce już zajęte, przenieś istniejący element z powrotem na stół
        if (slot.dataset.occupied) {
            const prevId = slot.dataset.occupied;
            const prevNode = piecesById.get(prevId);
            if (prevNode) table.appendChild(prevNode);
            delete slot.dataset.occupied;
        }

        // jeśli ten kawałek był wcześniej w innym slocie - odznacz tamten slot
        const prevSlotForNode = findSlotByOccupiedId(id);
        if (prevSlotForNode && prevSlotForNode !== slot) {
            delete prevSlotForNode.dataset.occupied;
            prevSlotForNode.style.border = '';
        }

        slot.appendChild(node);
        slot.dataset.occupied = id;

        // sprawdź poprawność
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
        const total = Object.keys(piecesState).length;
        const correctPlaced = Object.keys(placed).filter(k => placed[k]).length;
        info.textContent = `Ustawione poprawnie: ${correctPlaced} / ${total}`;
        if (total > 0 && correctPlaced === total) {
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
            alert(`${title}\n${body}`);
        }
    }

    // --- pomocnicze funkcje ---
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function clearAllPiecesAndSlots() {
        // usuń elementy z table
        table.innerHTML = '';
        // usuń zawartość slotów i atrybuty
        const slotEls = board.querySelectorAll('.slot');
        slotEls.forEach(s => {
            s.innerHTML = '';
            delete s.dataset.occupied;
            s.style.border = ''; // reset obramowania
        });
        // wyczyść stany
        piecesState = {};
        placed = {};
        piecesById.clear();
        info.textContent = 'Wyczyszczono planszę i stół.';
    }

    function findSlotByOccupiedId(id) {
        // znajdź slot który ma data-occupied == id
        const slots = board.querySelectorAll('.slot');
        for (const s of slots) {
            if (s.dataset.occupied === id) return s;
        }
        return null;
    }
});
