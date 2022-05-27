'use strict';

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;   //lat, lng
        this.distance = distance;   //km
        this.duration = duration;   //minutes
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
            'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on
          ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running'
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration)
        this.cadence = cadence;

        //call the calcPace func
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        //min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling'
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration)
        this.elevationGain = elevationGain
        this.calcSpeed();
        this._setDescription();
    }


    calcSpeed() {
        //km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);






/////////////////////////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// let map, mapEvent;    //creating map globally

class App {
    #map;   //# means its a private instance property i.e they will be present in all instances created in the App class.
    #mapZoomLevel = 13;
    #mapEvent;  //we declare these variables globally only in the App class similar to let in FOP
    #workouts = [];

    //everything called in the constructor will be first executed as the page functionality loads
    constructor() {
        // Get users position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this))
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {    //.bind(this) will bind the this keyword of the App class or else we'll be using the navigator.getCurrent position
                alert('Could not get your position')
            }
            );
    }

    _loadMap(position) {
        const { latitude } = position.coords; //use of destructuring
        const { longitude } = position.coords; //use of destructuring
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude]    //an array to passed into the setView and marker

        console.log(this)   //undefined. this is undefined because the _loadMap is an ordinary func call
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);   //13 is the zoom level  //the map string in parentheses is an id gotten from the html

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {      //  fr/hot/ changes the style of the map tiles
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);


        //Handling clicks on map
        this.#map.on('click', this._showForm.bind(this))    //map is an object from the lealet library and on() is a method from the library as well.


        // this is from the _getLocalStorage method
        //we want to render the workout marker immedietely the map loads, so we can make use of the data from the other local storage when the page reloaded
        //#map too is not available until we load the map.
        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        console.log(mapE)
        form.classList.remove('hidden');
        inputDistance.focus(); //this makes the user to start typing immediately.
    }

    _hideForm() {
        inputDistance.value = inputCadence.value = inputDistance.value = inputElevation.value = ''

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000)
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        //If workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;    // + turns it to a number.

            //check if data is valid
            if (
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence) 
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                return alert("Inputs have to be positive numbers")

                //calling the running class
            workout = new Running([lat, lng], distance, duration, cadence)
        }

        // if workout cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            if (
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration)
            )
                return alert("Inputs have to be positive numbers")

                //calling the cycling class
            workout = new Cycling([lat, lng], distance, duration, elevation)
        }

        // Add new object to workout array
        this.#workouts.push(workout);
        // console.log(workout);

        //Render workout on map as marker
        this._renderWorkoutMarker(workout)

        //Render workout on list
        this._renderWorkout(workout)

        // Hide form & clear input fields
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();

    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)     //.marker creates the marker, .addTo adds the marker to the map.
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}  ${workout.description}`)
            .openPopup();

    }

    _renderWorkout(workout) {

        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
              <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
         `;

        if (workout.type === 'running')
            html += `
             <div class="workout__details">
              <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
     </li>
         `;

        if (workout.type === 'cycling')
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
            `
        form.insertAdjacentHTML('afterend', html)
    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout')
        console.log(workoutEl);

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

        // console.log(workout);

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            }
        })

        // using the public interface
        // workout.click();     this will console - not a function
        //cus when we convert objects to strings and back to objects, the objects looses their prototype chain
        //i.e they are no more in the running or cycling classes. therefore we cannot get the click prototype
    }

    _setLocalStorage() {        //local storage should not be used to store large apps
        localStorage.setItem('workouts', JSON.stringify(this.#workouts))
        // 'workout' is the key of the object - you can set any name, its just for us to be able to retrieve the data as a specific name.
        //JSON.stringify() is to convert an object to a string
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        // console.log(data);

        if (!data) return;

        this.#workouts = data;
        //the _getLocalStorage is called in the beginning b4 other methods and at that time #workouts is empty
        // so we set the data that we get from the local storage to the #workouts objects first after reload even b4 we fill and add some other files to the local storage

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        });
    }

    _reset() {
        localStorage.removeItem('workouts')
        location.reload();  //reloading the page programmatically after removing the objects in the local storage

        //go to the browser console and run app._reset(); to clear all workouts
    }
}

const app = new App();

console.log(Date.now())