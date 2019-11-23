  var map = L.map('map', {
    renderer: L.canvas()
  })

  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    maxZoom: 18,
    id: 'mapbox.dark',
    accessToken: 'pk.eyJ1Ijoicm1pb24iLCJhIjoiY2pkdzdnaG9xMXB3ZDJ2bXUzeDJ6d2FoZSJ9.yeDmn8LQpUq-TwM2fKqzCQ'
  }).addTo(map)
  
  document.addEventListener('DOMContentLoaded', function () {
    map.setView([35.2258, -80.8460], 10)
  });
  
  var app = new Vue({
    el: "#app",
    data: {
      stops: [],
      stopsRemaining: null,
      counter: 0,
      isSecureConnection: window.location.protocol == 'https://',
      isRouteLoading: false,
      isRouteLoaded: false,
      isDataLoaded: false,
      apiRequestURI: "",
      allMarkers: [],
      todaysStops: null,
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      currentCoords: [35.27078,-80.74005], // Warehouse on Orr Rd
    },
    computed: {
      currentStop() {
        return this.stops ? this.stops[this.counter] : null;
      },
      dayOfWeek() {
          return this.days[new Date().getDay()];
      }
    },
    mounted() {
        this.fetchGSheetData();
    },
    methods: {
        setLocation(bool) {
          if (bool) {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(this.updatePosition);
            }  
          } else {
            this.currentCoords = [35.27078,-80.74005];
          }
        },
        updatePosition(position) {
          if (position) {
            this.currentCoords = [position.coords.latitude, position.coords.longitude]
          }
        },
        fetchGSheetData() {
            if (localStorage.getItem('destinations') && JSON.parse(localStorage.getItem('destinations')).updated === new Date().toLocaleDateString()) {
                this.addMapMarkers(JSON.parse(localStorage.getItem('destinations')).destinations)
            } else {
                let username = 'l79dssqs';
                let password = 'cuirv5acqfj6zspxw5c6';
                let headers = new Headers();
        
                headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));
                
                fetch(`https://sheetdb.io/api/v1/65s1qbqcffqpa/search?Service%20Day=${this.dayOfWeek}`, {
                        headers: headers
                    })
                    .then(response => response.json())
                    .then(data => {
                        localStorage.setItem('destinations', JSON.stringify({ updated: new Date().toLocaleDateString(), destinations: data }));
                        this.addMapMarkers(data)
                    })
            }
        },
        addMapMarkers(rows) {
            rows.forEach((row) => this.checkStopForRouteInclusion(row))
            this.stopsRemaining = this.allMarkers.length;
            this.todaysStops = L.layerGroup(this.allMarkers);
            L.control.layers(null, { "Today": this.todaysStops }).addTo(map)
            this.todaysStops.addTo(map);
            this.isDataLoaded = true;
          },
        checkStopForRouteInclusion(stop) {
            let today = Math.floor(new Date().getTime() / (1000 * 3600 * 24));
            let last = stop["Recent Pick-up"] ? Math.floor(new Date(stop["Recent Pick-up"]).getTime() / (1000 * 3600 * 24)) : 0;
            let hasBeenOverAWeek = today - last > 7;
            let isBiWeekly = Boolean(stop["Bi-Weekly"]);
            let skip = Boolean(stop["Skip"]);
            let completed = new Date().toLocaleDateString() == new Date(stop["Recent Pick-up"]).toLocaleDateString();
          
            if ( 
              ( (isBiWeekly && hasBeenOverAWeek) || !isBiWeekly ) 
              && !completed && !skip && stop.Latitude && stop.Longitude 
            ) {
              this.allMarkers.push(L.marker([Number(stop.Latitude), Number(stop.Longitude)]))
            }
        },
      showNextStop(num) {
        if (this.counter == this.stops.length) {
          return;
        } else if (this.counter + num < 0) {
          return;
        } else if (this.counter == this.stops.length - 1) {
          this.counter += num;
        } else {
          this.counter += num;
          map.setView([this.stops[this.counter].Latitude, this.stops[this.counter].Longitude], 14)
        }
      },
      markCompletedStop() {
        let username = 'l79dssqs';
        let password = 'cuirv5acqfj6zspxw5c6';
        let headers = new Headers();

        headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));
        headers.append('Content-Type', 'application/json');
        
        fetch(`https://sheetdb.io/api/v1/65s1qbqcffqpa/Email/${this.currentStop.Email}`, {
                headers: headers,
                method: "PATCH",
                body: JSON.stringify({
                  "data": [
                    { 
                      "Recent Pick-up": new Date().toLocaleDateString(),
                      "Notes": this.currentStop.newNotes ? this.currentStop.Notes + " **" + this.currentStop.newNotes + "**" : this.currentStop.Notes
                    }
                  ]
                })
            })
            .then(response => response.json())
            .then(data => {
                this.stopsRemaining -= 1;
                this.stops[this.counter].completed = true;
            })
      },
      flagAddress() {
        let username = 'l79dssqs';
        let password = 'cuirv5acqfj6zspxw5c6';
        let headers = new Headers();
        this.setLocation(true)

        headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));
        headers.append('Content-Type', 'application/json');
        
        fetch(`https://sheetdb.io/api/v1/65s1qbqcffqpa/Email/${this.currentStop.Email}`, {
                headers: headers,
                method: "PATCH",
                body: JSON.stringify({"data":[{ "Notes": `Flagged address: ${this.currentCoords}` }]})
            })
            .then(response => response.json())
            .then(data => {
                this.stopsRemaining -= 1;
                this.stops[this.counter].flagged = true;
            })

      },
      initializeRoute(waypoints) {
        this.stops = waypoints;
        this.isRouteLoading = false;
        this.isRouteLoaded = true;
        map.setView([this.stops[this.counter].Latitude, this.stops[this.counter].Longitude], 14)
      },
      calculateRoute() {
        if (localStorage.getItem('route') && JSON.parse(localStorage.getItem('route')).updated === new Date().toLocaleDateString()) {
          this.initializeRoute(JSON.parse(localStorage.getItem('route')).waypoints)
        } else {
          const service = `https://wse.api.here.com/2/findsequence.json?app_id=TQz2PVEYCL8W49T7zZKO&app_code=rcFSeTs5AqMlYuPCX8D4Jg&mode=fastest;car;`;
          const start = `&start=geo!${this.currentCoords[0]},${this.currentCoords[1]}`
          // const end = `&end=geo!35.27078,-80.74005`
          var destinations = "";
          var counter = 0;
          this.todaysStops.getLayers().forEach(layer => {
            destinations += `&destination${counter}=geo!${layer._latlng.lat},${layer._latlng.lng}`;
            counter++;
          })
          this.apiRequestURI = service + start + destinations;
          this.isRouteLoading = true;
          fetch(this.apiRequestURI)
            .then((response) => response.json())
            .then((data) => {
            data.results[0].waypoints.forEach(stop => {
              this.stops.push({ lat: stop.lat, lng: stop.lng })
            })
            this.stops = this.stops.slice(1).map((coords) => {
              var match = JSON.parse(localStorage.getItem('destinations')).destinations.find((stop) => {
                return stop.Latitude == coords.lat && stop.Longitude == coords.lng
              });
              match.completed = false;
              match.flagged = false;
              match.newNote = "";
              return match;
            })
            localStorage.setItem('route', JSON.stringify({ updated: new Date().toLocaleDateString(), waypoints: this.stops }));
            app.initializeRoute(this.stops)
          })
        }
      }
    }
  })
  