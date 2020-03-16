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
      sheetsDBPayload: [],
      stops: [],
      stopsRemaining: 0,
      stopsCompleted: [],
      counter: 0,
      isSecureConnection: window.location.protocol == 'https:',
      isRouteLoading: false,
      isRouteLoaded: false,
      isDataLoaded: false,
      apiRequestURI: "",
      allMarkers: [],
      todaysStops: null,
      currentCoords: [35.27078,-80.74005], // Warehouse on Orr Rd
    },
    computed: {
      currentStop() {
        return this.stops ? this.stops[this.counter] : null;
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
            if (localStorage.getItem('pilot') && JSON.parse(localStorage.getItem('pilot')).updated === new Date().toLocaleDateString()) {
              this.sheetsDBPayload = JSON.parse(localStorage.getItem('pilot')).destinations;
              this.hydrateApp(JSON.parse(localStorage.getItem('pilot')).destinations)
            } else {
                let username = 'l79dssqs';
                let password = 'cuirv5acqfj6zspxw5c6';
                let headers = new Headers();
        
                headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));
                
                fetch(`https://sheetdb.io/api/v1/65s1qbqcffqpa/search?Pilot=Y`, {
                        headers: headers
                    })
                    .then(response => response.json())
                    .then(data => {
                        data = data.filter(row => row.Skip !== "Y").filter(row => row["Recent Pick-up"] !== new Date().toLocaleDateString());
                        this.sheetsDBPayload = data;
                        localStorage.setItem('pilot', JSON.stringify({ updated: new Date().toLocaleDateString(), destinations: data }));
                        this.hydrateApp(data)
                    })
            }
        },
        hydrateApp(rows) {
            rows.forEach((row) => this.allMarkers.push(L.marker([Number(row.Latitude), Number(row.Longitude)])))
            this.stopsRemaining = this.allMarkers.length;
            this.todaysStops = L.layerGroup(this.allMarkers);
            L.control.layers(null, { "Today": this.todaysStops }).addTo(map)
            this.todaysStops.addTo(map);
            this.isDataLoaded = true;
          },
      showNextStop(num) {
        localStorage.setItem('stopNumber', this.counter)
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
        this.stops[this.counter].isSaving = true;
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
                      "Notes": this.currentStop.Notes
                    }
                  ]
                })
            })
            .then(response => response.json())
            .then(data => {
              this.stops[this.counter].isSaving = false;
              if (this.stopsCompleted.indexOf(this.stops[this.counter].Phone) == -1) {
                this.stopsRemaining -= 1;
                this.stopsCompleted.push(this.stops[this.counter].Phone)
              }
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
                this.stops[this.counter].flagged = true;
            })

      },
      initializeRoute(waypoints, isCached) {
        this.stops = waypoints;
        this.isRouteLoading = false;
        this.isRouteLoaded = true;
        if (localStorage.getItem('stopNumber') && isCached) {
          this.counter = Number(localStorage.getItem('stopNumber'))
        }
        map.setView([this.stops[this.counter].Latitude, this.stops[this.counter].Longitude], 14)
      },
      calculateRoute() {
        if (localStorage.getItem('pilotRoute') && JSON.parse(localStorage.getItem('pilotRoute')).updated === new Date().toLocaleDateString()) {
          this.initializeRoute(JSON.parse(localStorage.getItem('pilotRoute')).waypoints, true)
        } else {
          const service = `https://wse.api.here.com/2/findsequence.json?app_id=TQz2PVEYCL8W49T7zZKO&app_code=rcFSeTs5AqMlYuPCX8D4Jg&mode=fastest;car;`;
          const start = `&start=geo!${this.currentCoords[0]},${this.currentCoords[1]}`
          const end = `&end=geo!35.27078,-80.74005`
          var destinations = "";
          var counter = 0;
          this.todaysStops.getLayers().forEach(layer => {
            destinations += `&destination${counter}=geo!${layer._latlng.lat},${layer._latlng.lng}`;
            counter++;
          })
          this.apiRequestURI = service + start + destinations + end;
          this.isRouteLoading = true;
          fetch(this.apiRequestURI)
            .then((response) => response.json())
            .then((data) => {
              data.results[0].waypoints.forEach(stop => {
                this.stops.push({ lat: stop.lat, lng: stop.lng })
              })
              this.stops = this.stops.slice(1, this.stops.length - 1).map((coords) => {
                var match = JSON.parse(localStorage.getItem('pilot')).destinations.find((stop) => {
                  return stop.Latitude == coords.lat && stop.Longitude == coords.lng
                });
                match.completed = false;
                match.flagged = false;
                match.isSaving = false;
                return match;
              })
              localStorage.setItem('pilotRoute', JSON.stringify({ updated: new Date().toLocaleDateString(), waypoints: this.stops }));
              app.initializeRoute(this.stops, false)
            })
        }
      }
    }
  })
  