  var app = new Vue({
      el: "#app",
      data: {
        fetchedSegments: [],
        counter: 0,
        isSecureConnection: window.location.protocol == 'https:',
        isDoneWithRouteSetup: false,
        isRecordUpdating: false,
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
            "Completed": {
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
                    '1',
                    '2+'
                ]
            },
        }
      },
      computed: {
          currentStop() {
              return this.mappedSegments.length > 0 ? this.mappedSegments[this.counter] : null;
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
            if (this.filters["Completed"].active) {
                url += `&Recent%20Pick-up=${this.filters["Completed"].selected == 'Yes' ? (new Date().toLocaleDateString() + '*') : '*'}`
            }
            if (this.filters["Bin count"].active) {
                url += `&Bin-Count=${this.filters["Bin count"].selected == '1' ? '' : '*'}`
            }
            return url;
          },
          mappedSegments() {
              if (this.fetchedSegments.length > 0) {
                  return this.fetchedSegments.map(s => {
                    return {
                        "Name": s["Name"],
                        "Address": s["Address"],
                        "Recent Pick-up": s["Recent Pick-up"],
                        "How to Access": s["How to Access"],
                        "Bin Location": s["Bin Location"],
                        "Bi-Weekly": s["Bi-Weekly"],
                        "Notes": s["Notes"],
                        "Service-Day": s["Service-Day"],
                        "Bin-Count": s["Bin-Count"],
                        "Missed-Bin": s["Missed-Bin"],
                        "Commercial": s["Commercial"],
                        "Has-Bin": s["Has-Bin"]
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
            this.isDoneWithRouteSetup = true;
          },
          fetchGSheetData() {
            fetch(this.routeURL, {
                    headers: this.generateHeaders()
                })
                .then(response => response.json())
                .then(data => {
                    this.fetchedSegments = data;
                    this.reInitRoute();
                })
          },
          showNextStop(num) {
            if (this.counter == this.fetchedSegments.length) {
                return;
            } else if (this.counter + num < 0) {
                return;
            } else if (this.counter == this.fetchedSegments.length - 1) {
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
                }
            })
        },
        flagMissedBin() {
            this.isRecordUpdating = false;
            fetch(`https://sheetdb.io/api/v1/65s1qbqcffqpa/Email/${this.currentStop.Email}`, {
                    headers: this.generateHeaders(),
                    method: "PATCH",
                    body: JSON.stringify({"data":[{ "Missed-Bin": `${this['Missed-Bin']} ${new Date().toLocaleDateString()};` }]})
                })
                .then(response => response.json())
                .then(data => {
                    if (data.updated == 1) {
                        this.isRecordUpdating = false;
                        this.currentStop["Missed-Bin"] += new Date().toLocaleDateString()
                    }
                })
    
          },    
    }
  })