const WeatherApp = class {
    constructor(apiKey, resultsBlockSelector) {
        this.apiKey=apiKey;
        this.resultsBlockSelector=resultsBlockSelector;

        this.geoLocationURL='http://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit={limit}&appid={API key}'
        this.geoLocationURL = this.geoLocationURL.replace("{API_key}",this.apiKey);
        this.geoLocationURL = this.geoLocationURL.replace("{limit}",1);

        this.currentWeatherURL='https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_key}'
        this.currentWeatherURL = this.currentWeatherURL.replace("{API_key}",this.apiKey);

        this.forecastURL='api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API key}'
        this.forecastURL = this.forecastURL.replace("{API_key}",this.apiKey);
    }

    getCurrentWeather(latitude,longitude) {
        let currentWeatherurl=this.currentWeatherURL.replace("{lat}",latitude);
        currentWeatherurl=this.currentWeatherURL.replace("{lon}",longitude);
    }

    getForecast(query) {

    }
    getWeather(query) {
        let geolocationURL=this.geoLocationURL.replace("{city name},{state code},{country code}",query);

        let latitude=''
        let longitude =''

        fetch(geolocationURL)
            .then((response) => response.json())
            .then((data) => {
                latitude = data.lat;   // <- tutaj przypisujesz
                longitude = data.lon;  // np. jeśli chcesz też długość
                console.log("Szerokość geograficzna:", latitude);
                console.log("Dlugosc geograficzna:", longitude);
            })
            .catch((error) => {
                console.error("Błąd podczas pobierania danych:", error);
            });


        this.getCurrentWeather(latitude,longitude)

    }

    drawWeather() {

    }

    createWeatherBlock(dateString, temperature, feelsLikeTemperature, iconName, description) {

    }
}

document.weatherApp = new WeatherApp("86fdc3487ae96db86afef08b23477b33", "#weather-results-container");

document.querySelector("#checkButton").addEventListener("click", function() {
    const query = document.querySelector("#locationInput").value;
    document.weatherApp.getWeather(query);
});