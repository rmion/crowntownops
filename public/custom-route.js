  var app = new Vue({
      el: "#app",
      data: {
        fetchedStops: [],
        currentCoords: [35.226293,-80.823527],
        counter: 0,
        isSecureConnection: window.location.protocol == 'https:',
        isFinishedFetchingStops: false,
        isRecordUpdating: false,
        isCalculatingRoute: false,
        hasRouteLoaded: false,
        filters: {
            "Service day": {
                active: false,
                selected: new Intl.DateTimeFormat('en-US', {weekday: 'long'}).format(new Date()),
                options: [
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday'
                ]
            },
            "Route": {
                active: false,
                selected: 'M1',
                options: [
                    'M1',
                    'M2',
                    'T1',
                    'T2',
                    'W1',
                    'W2',
                    'TH1',
                    'TH2',
                    'F1',
                    'F2'
                ]
            },
            "Customer type": {
                active: false,
                selected: 'Residential',
                options: [
                    'Residential',
                    'Commercial',
                    'Apartment'
                ]
            },
            "Bin type": {
                active: false,
                selected: 'Bin',
                options: [
                    'Bin',
                    'Bucket'
                ]
            },
            "Commercial": {
                active: false,
                selected: 'No',
                options: [
                    'Yes',
                    'No'
                ]
            },
            "Bi-weekly": {
                active: false,
                selected: 'Yes',
                options: [
                    'Yes',
                    'No'
                ]
            },
            "Pilot": {
                active: false,
                selected: 'No',
                options: [
                    'Yes',
                    'No'
                ]
            },
            "Completed yesterday": {
                active: false,
                selected: 'No',
                options: [
                    'Yes',
                    'No'
                ]
            },
            "New customer": {
                active: false,
                selected: 'No',
                options: [
                    'Yes',
                    'No'
                ]
            },
            "Skip": {
                active: false,
                selected: 'No',
                options: [
                    'Yes',
                    'No'
                ]
            },
            "Bin count": {
                active: false,
                selected: '1',
                options: [
                    '1'
                ]
            },
        }
      },
      computed: {
          currentStop() {
              return this.mappedSegments.length > 0 ? this.mappedSegments[this.counter] : null;
          },
          newStops() {
            if (this.mappedSegments.length) {
              return this.mappedSegments.filter((row) => row["Recent Pick-up"] == "").length;
            } else {
              return null;
            }
          },
          needsBucket() {
            if (this.mappedSegments.length) {
              return this.mappedSegments.filter((row) => row["Recent Pick-up"] == "" && row["Has Bin"] == "").length;
            } else {
              return null;
            }
          },
          needsYardSign() {
            if (this.mappedSegments.length) {
              return this.mappedSegments.filter((row) => row["Recent Pick-up"] == "" && row["Yard Sign"].indexOf("Yes") == 0).length;
            } else {
              return null;
            }
          },    
          routeURL() {
            let url = 'https://sheetdb.io/api/v1/65s1qbqcffqpa/search?';
            url += `Service-Day=${this.filters["Service day"].selected}&Skip=!Y&Status=Active`;
            if (this.filters["Customer type"].active) {
                url += `&Customer-Type=${this.filters["Customer type"].selected}`
            }
            if (this.filters["Bin type"].active) {
                if (this.filters["Bin type"].selected == 'Bin') {
                    url += '&Has-Bin=Y'
                } else {
                    url += '&Has-Bin=!Y'
                }
            }
            if (this.filters["Route"].active) {
                url += `&Route=${this.filters["Route"].selected}`
            }
            if (this.filters["Commercial"].active) {
                if (this.filters["Commercial"].selected == 'Yes') {
                    url += '&Commercial=Y'
                } else {
                    url += '&Commercial=!Y'
                }
            }
            if (this.filters["Bi-weekly"].active) {
                if (this.filters["Bi-weekly"].selected == 'Yes') {
                    url += '&Bi-Weekly=Y'
                } else {
                    url += '&Bi-Weekly=!Y'
                }
            }
            if (this.filters["Pilot"].active) {
                if (this.filters["Pilot"].selected == 'Yes') {
                    url += '&Pilot=Y'
                } else {
                    url += '&Pilot=!Y'
                }
            }
            if (this.filters["Skip"].active) {
                if (this.filters["Skip"].selected == 'Yes') {
                    url += '&Skip=Y'
                } else {
                    url += '&Skip=!Y'
                }
            }
            if (this.filters["New customer"].active) {
                if (this.filters["New customer"].selected == 'Yes') {
                    url += `&Recent%20Pick-up=${(new Date().toLocaleDateString() + '*')}`
                } else {
                    url += `&Recent%20Pick-up=''`
                }
            }
            if (this.filters["Completed yesterday"].active) {
                if (this.filters["Completed yesterday"].selected == "Yes") {
                    url += `&Recent%20Pick-up=${new Date(moment().subtract(1, 'days')._d).toLocaleDateString() + '*'}`
                } else {
                    url += `&Recent%20Pick-up=!${new Date(moment().subtract(1, 'days')._d).toLocaleDateString() + '*'}`
                }
            }
            if (this.filters["Bin count"].active) {
                url += `&Bin-Count=${this.filters["Bin count"].selected == '1' ? '' : '*'}`
            }
            return url;
          },
          mappedSegments() {
              if (this.fetchedStops.length > 0) {
                  return this.fetchedStops.map(s => {
                    return {
                        "Name": s["Name"],
                        "Phone": s["Phone"],
                        "Address": s["Address"],
                        "Recent Pick-up": s["Recent Pick-up"],
                        "How to Access": s["How to Access"],
                        "Bin Location": s["Bin Location"],
                        "Bi-Weekly": s["Bi-Weekly"],
                        "Notes": s["Notes"],
                        "Service Day": s["Service-Day"],
                        "Route": s["Route"],
                        "Bin Count": s["Bin-Count"],
                        "Missed Bin": s["Missed-Bin"],
                        "Commercial": s["Commercial"],
                        "Has Bin": s["Has-Bin"],
                        "Latitude": s["Latitude"],
                        "Longitude": s["Longitude"],
                        "Email": s["Email"],
                        "Yard Sign": s["Sign"]
                    }
                  })
              } else return [];
          }
      },
      methods: {
          generateHeaders() {
            let username = 'l79dssqs';
            let password = 'cuirv5acqfj6zspxw5c6';
            let headers = new Headers();
    
            headers.append('Authorization', 'Basic ' + btoa(username + ":" + password));
            headers.append('Content-Type', 'application/json');
            return headers;
          },
          reInitRoute() {
            this.counter = 0;
            this.isFinishedFetchingStops = true;
          },
          fetchGSheetData() {
            fetch(this.routeURL, {
                    headers: this.generateHeaders()
                })
                .then(response => response.json())
                .then(data => {
                    this.fetchedStops = _.uniqBy(this.fetchedStops.concat(data), 'Email');
                    this.reInitRoute();
                })
          },
          showNextStop(num) {
            if (this.counter == this.fetchedStops.length) {
                return;
            } else if (this.counter + num < 0) {
                return;
            } else if (this.counter == this.fetchedStops.length - 1) {
                this.counter += num;
            } else {
                this.counter += num;
            }
        },
        markCompletedStop() {
            this.isRecordUpdating = true;
            fetch(`https://sheetdb.io/api/v1/65s1qbqcffqpa/Email/${this.currentStop.Email}`, {
                headers: this.generateHeaders(),
                method: "PATCH",
                body: JSON.stringify({
                    "data": [
                        { 
                        "Recent Pick-up": new Date().toLocaleString(),
                        "Notes": this.currentStop.Notes
                        }
                    ]
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.updated == 1) {
                    this.isRecordUpdating = false;
                    this.currentStop["Recent Pick-up"] = new Date().toLocaleString()
                    this.fetchedStops.splice(this.counter, 1)
                }
            })
        },
        flagMissedBin() {
            this.isRecordUpdating = false;
            fetch(`https://sheetdb.io/api/v1/65s1qbqcffqpa/Email/${this.currentStop.Email}`, {
                    headers: this.generateHeaders(),
                    method: "PATCH",
                    body: JSON.stringify({
                        "data": [
                            {
                                "Missed-Bin": `${this.curretStop['Missed-Bin']} ${new Date().toLocaleDateString()};` 
                            }
                        ]
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.updated == 1) {
                        this.isRecordUpdating = false;
                        this.currentStop["Missed-Bin"] += new Date().toLocaleDateString()
                    }
                })
    
          },
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
          optimizeRoute(bool) {
            this.setLocation(bool)
            const service = `https://wse.ls.hereapi.com/2/findsequence.json?&apiKey=nXD3LCdyfFtuprcsOT2oWnekCTAeQH5CPeKwt9bFu44&mode=fastest;car;`;
            const start = `&start=${this.currentCoords[0]},${this.currentCoords[1]}`
            const end = `&end=35.226293,-80.823527`
            var destinations = "";
            var counter = 0;
            this.fetchedStops.forEach(segment => {
                if (segment.Latitude != "" && segment.Longitude != "") {
                    destinations += `&destination${counter}=${segment.Latitude},${segment.Longitude}`;
                    counter++;
                }
            })
            this.apiRequestURI = service + start + destinations + end;
            this.isCalculatingRoute = true;
            fetch(this.apiRequestURI)
                .then((response) => response.json())
                .then((data) => {
                    let reOrderedStops = []
                    data.results[0].waypoints.forEach(waypoint => {
                        let matchingStop = this.fetchedStops.find(stop => {
                            return stop.Latitude == waypoint.lat && stop.Longitude == waypoint.lng
                        })
                        typeof matchingStop == 'object' ? reOrderedStops.push(matchingStop) : null;
                      })
                    this.fetchedStops = reOrderedStops
                    this.isCalculatingRoute = false;
                    this.hasRouteLoaded = true;
                })
          }    
    }
  })