const WeatherApp = class {
    constructor(apiKey, resultsBlockSelector) {
        this.apiKey = apiKey;
        this.resultsBlockSelector = resultsBlockSelector;

        this.geoLocationURL = 'https://api.openweathermap.org/geo/1.0/direct?q={city}&limit={limit}&appid={API_key}';
        this.geoLocationURL = this.geoLocationURL.replace('{API_key}', this.apiKey);
        this.geoLocationURL = this.geoLocationURL.replace('{limit}', 1);

        this.currentWeatherURL = 'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&lang=pl&appid={API_key}';
        this.currentWeatherURL = this.currentWeatherURL.replace('{API_key}', this.apiKey);

        this.forecastURL = 'https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=metric&lang=pl&appid={API_key}';
        this.forecastURL = this.forecastURL.replace('{API_key}', this.apiKey);
    }

    getCurrentWeather(latitude, longitude) {
        const url = this.currentWeatherURL
            .replace('{lat}', encodeURIComponent(latitude))
            .replace('{lon}', encodeURIComponent(longitude));

        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                console.log('Aktualna pogoda:', data);
                this.drawWeather(data); // draw current (clears container)
            })
            .catch((err) => {
                console.error('Błąd podczas pobierania aktualnej pogody:', err);
            });
    }

    getForecast(latitude, longitude) {
        const url = this.forecastURL
            .replace('{lat}', encodeURIComponent(latitude))
            .replace('{lon}', encodeURIComponent(longitude));

        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                console.log('Forecast:', data);
                this.drawWeather(data); // draw forecast (appends under current)
            })
            .catch((err) => {
                console.error('Błąd podczas pobierania prognozy:', err);
            });
    }

    getWeather(query) {
        const geoUrl = this.geoLocationURL.replace('{city}', encodeURIComponent(query));

        fetch(geoUrl)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const lat = data[0].lat;
                    const lon = data[0].lon;
                    this.getCurrentWeather(lat, lon);
                    this.getForecast(lat, lon);
                } else {
                    console.error('Nie znaleziono lokalizacji dla:', query);
                }
            })
            .catch((err) => {
                console.error('Błąd podczas geokodowania:', err);
            });
    }

    // uniwersalny rysownik: current zastępuje kontener, forecast dopisuje pod spodem
    drawWeather(data) {
        const container = document.querySelector(this.resultsBlockSelector);
        if (!container) {
            console.error('Brak kontenera:', this.resultsBlockSelector);
            return;
        }
        if (!data || typeof data !== 'object') return;

        // jeśli to forecast (ma pole list) — dopisz prognozę pod aktualną pogodą
        if (Array.isArray(data.list)) {
            // upewnij się, że kontener aktualnej pogody istnieje; nie czyścimy całego container
            let forecastWrapper = document.querySelector('#forecast-container');
            if (!forecastWrapper) {
                forecastWrapper = document.createElement('div');
                forecastWrapper.id = 'forecast-container';
                container.appendChild(forecastWrapper);
            }
            forecastWrapper.innerHTML = ''; // czyść poprzednią prognozę

            const tz = data.city && typeof data.city.timezone === 'number' ? data.city.timezone : 0;

            // grupuj po dacie miejsca i wybierz reprezentatywną próbkę na dzień
            const groups = {};
            data.list.forEach((entry) => {
                const placeMs = entry.dt * 1000 + tz * 1000;
                const d = new Date(placeMs);
                const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push({ entry, placeMs });
            });

            const days = Object.keys(groups).sort();
            const daily = days.map((k) => {
                const items = groups[k];
                let chosen = items.find(it => new Date(it.placeMs).getUTCHours() === 12);
                if (!chosen) chosen = items[0];
                return chosen.entry;
            });

            const title = document.createElement('h3');
            title.textContent = 'Prognoza';
            forecastWrapper.appendChild(title);

            const row = document.createElement('div');
            row.className = 'forecast-row';
            daily.forEach((item) => {
                const tzSec = typeof data.city.timezone === 'number' ? data.city.timezone : 0;
                const placeMs = item.dt * 1000 + tzSec * 1000;
                const d = new Date(placeMs);
                const dateLabel = `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
                const weather0 = item.weather && item.weather[0] ? item.weather[0] : null;
                const icon = weather0 ? weather0.icon : '';
                const desc = weather0 ? weather0.description : '';
                const temp = item.main && typeof item.main.temp === 'number' ? `${item.main.temp.toFixed(1)}°C` : 'N/A';

                const block = this.createWeatherBlock({
                    dateString: dateLabel,
                    locationLabel: '', // możesz tu wstawić nazwę dnia
                    temperature: temp,
                    feelsLikeTemperature: '',
                    iconName: icon,
                    description: desc,
                    humidity: item.main && item.main.humidity,
                    pressure: item.main && item.main.pressure,
                    windSpeed: item.wind && item.wind.speed,
                    windDeg: item.wind && item.wind.deg
                });
                block.classList.add('forecast-day');
                row.appendChild(block);
            });

            forecastWrapper.appendChild(row);
            return;
        }

        // inaczej to aktualna pogoda — czyścimy container i rysujemy aktualną pogodę
        container.innerHTML = '';

        const name = data.name || '';
        const country = data.sys && data.sys.country ? data.sys.country : '';
        const weather0 = data.weather && data.weather[0] ? data.weather[0] : null;
        const description = weather0 ? weather0.description : '';
        const icon = weather0 ? weather0.icon : '';
        const temp = data.main && typeof data.main.temp === 'number' ? `${data.main.temp.toFixed(1)}°C` : 'N/A';
        const feels = data.main && typeof data.main.feels_like === 'number' ? `${data.main.feels_like.toFixed(1)}°C` : 'N/A';
        const humidity = data.main && typeof data.main.humidity === 'number' ? data.main.humidity : null;
        const pressure = data.main && typeof data.main.pressure === 'number' ? data.main.pressure : null;
        const windSpeed = data.wind && typeof data.wind.speed === 'number' ? data.wind.speed : null;
        const windDeg = data.wind && typeof data.wind.deg === 'number' ? data.wind.deg : null;

        const utcMs = data.dt * 1000;
        const tzMs = typeof data.timezone === 'number' ? data.timezone * 1000 : 0;
        const placeMs = utcMs + tzMs;
        const d = new Date(placeMs);
        const dateString = `${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;

        const block = this.createWeatherBlock({
            dateString,
            locationLabel: name + (country ? ', ' + country : ''),
            temperature: temp,
            feelsLikeTemperature: feels,
            iconName: icon,
            description,
            humidity,
            pressure,
            windSpeed,
            windDeg
        });

        container.appendChild(block);

        // przygotuj miejsce na forecast (będzie dopisany, gdy przyjdzie)
        const forecastContainer = document.createElement('div');
        forecastContainer.id = 'forecast-container';
        container.appendChild(forecastContainer);
    }

    createWeatherBlock({ dateString, locationLabel, temperature, feelsLikeTemperature, iconName, description, humidity, pressure, windSpeed, windDeg }) {
        const wrapper = document.createElement('div');
        wrapper.className = 'weather-block';

        const header = document.createElement('div');
        header.className = 'weather-header';
        header.textContent = `${locationLabel} — ${dateString}`;
        wrapper.appendChild(header);

        const main = document.createElement('div');
        main.className = 'weather-main';

        const left = document.createElement('div');
        left.className = 'weather-left';

        const tempEl = document.createElement('div');
        tempEl.className = 'weather-temp';
        tempEl.textContent = temperature;
        left.appendChild(tempEl);

        const feelsEl = document.createElement('div');
        feelsEl.className = 'weather-feels';
        feelsEl.textContent = feelsLikeTemperature ? `Odczuwalna: ${feelsLikeTemperature}` : '';
        left.appendChild(feelsEl);

        const right = document.createElement('div');
        right.className = 'weather-right';

        if (iconName) {
            const img = document.createElement('img');
            img.className = 'weather-icon';
            img.src = `http://openweathermap.org/img/wn/${iconName}@2x.png`;
            img.alt = description || 'weather icon';
            right.appendChild(img);
        }

        const descEl = document.createElement('div');
        descEl.className = 'weather-desc';
        descEl.textContent = description || '';
        right.appendChild(descEl);

        const meta = document.createElement('div');
        meta.className = 'weather-meta';

        const hum = document.createElement('div');
        hum.textContent = humidity !== null && humidity !== undefined ? `Wilgotność: ${humidity}%` : 'Wilgotność: N/A';
        meta.appendChild(hum);

        const pres = document.createElement('div');
        pres.textContent = pressure !== null && pressure !== undefined ? `Ciśnienie: ${pressure} hPa` : 'Ciśnienie: N/A';
        meta.appendChild(pres);

        const wind = document.createElement('div');
        const windText = windSpeed !== null && windSpeed !== undefined ? `Wiatr: ${windSpeed} m/s` : 'Wiatr: N/A';
        wind.textContent = windDeg !== null && windDeg !== undefined ? `${windText}, kierunek ${Math.round(windDeg)}°` : windText;
        meta.appendChild(wind);

        right.appendChild(meta);

        main.appendChild(left);
        main.appendChild(right);

        wrapper.appendChild(main);

        return wrapper;
    }
};

document.weatherApp = new WeatherApp('86fdc3487ae96db86afef08b23477b33', '#weather-results-container');

document.querySelector('#checkButton').addEventListener('click', function () {
    const query = document.querySelector('#locationInput').value;
    document.weatherApp.getWeather(query);
});
