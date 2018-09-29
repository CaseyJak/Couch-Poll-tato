// Kick user back to login if somehow they get here without logging in
if (localStorage.getItem("username") === null) {
    window.location.href = "Auth.html";
}

//This is the section to trigger the function to initiate our Google APIs
var map;
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8
    });
}
function initMultiple() {
    initMap();
    initAutocomplete();
}
// This example displays an address form, using the autocomplete feature
// of the Google Places API to help users fill in the information.

var placeSearch, autocomplete;
var componentForm = {
    street_number: 'short_name',
    route: 'long_name',
    locality: 'long_name',
    administrative_area_level_1: 'short_name',
    country: 'long_name',
    postal_code: 'short_name'
};

function initAutocomplete() {
    // Create the autocomplete object, restricting the search to geographical
    // location types.
    autocomplete = new google.maps.places.Autocomplete(
            /** @type {!HTMLInputElement} */(document.getElementById('autocomplete')),
        { types: ['geocode'] });

    // When the user selects an address from the dropdown, populate the address
    // fields in the form.
    autocomplete.addListener('place_changed', fillInAddress);
}

function fillInAddress() {
    // Get the place details from the autocomplete object.
    var place = autocomplete.getPlace();

    for (var component in componentForm) {
        document.getElementById(component).value = '';
        document.getElementById(component).disabled = false;
    }

    // Get each component of the address from the place details
    // and fill the corresponding field on the form.
    for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
        if (componentForm[addressType]) {
            var val = place.address_components[i][componentForm[addressType]];
            document.getElementById(addressType).value = val;
        }
    }
}



$(document).ready(function () {
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyAU6KkP1GaxMgEbGMcoizsiusMF_qHytD4",
        authDomain: "election-info-project.firebaseapp.com",
        databaseURL: "https://election-info-project.firebaseio.com",
        projectId: "election-info-project",
        storageBucket: "election-info-project.appspot.com",
        messagingSenderId: "978592611481"
    };
    firebase.initializeApp(config);

    const database = firebase.database();
    const emailKey = encodeKey(localStorage.getItem("username"));


    // Set address to profile's address by default, simulate search
    database.ref(`/users/${emailKey}/`).once('value').then(function (snap) {
        let profileObj = snap.val();
        let profileAdd1 = profileObj.address1;
        //let profileAdd2 = profileObj.address2;
        let profileCity = profileObj.city;
        let profileState = profileObj.state;
        let profileZip = profileObj.zip;
        let profileAddress = profileAdd1 + ", " + profileCity + "," + profileState + profileZip;

        $(".streetAddress").val(profileAdd1);
        $(".cityAddress").val(profileCity);
        $(".stateAddress").val(profileState);
        $(".zipAddress").val(profileZip);
    });



    $(".searchMap").on("click", function () {
        let streetAddress = $(".streetAddress");
        let cityAddress = $(".cityAddress");
        let stateAddress = $(".stateAddress");
        let zipAddress = $(".zipAddress");
        var locations = [];

        var testAddress = "2515 Catamount St, Bozeman, MT 59715";
        var locationsUrl = "https://www.googleapis.com/civicinfo/v2/voterinfo?key=AIzaSyD70EcFlRlgIbc1ARNvns5CszqjaUyQzVI";
        var electionID = "&electionId=6000";
        let AddressLookup = testAddress
        let AddressPOST = encodeURIComponent(AddressLookup)
        const searchPoll = address => {
            $.get(locationsUrl + electionID + "&address=" + AddressPOST/*+"&levels="+govt_level*/).then(response => {

                // Empty the div so we don't have append multiple if user clicks search >1 time
                if ($(".locationInfo").length != 0) {
                    $(".locationInfo").empty();
                }

                if ($(".pollingTimeTable").length != 0) {
                    $(".pollingTimeTable").empty();
                }

                $(".pollingTimeTable").append(`<div class="table-wrapper-scroll-y">
                <table class="table table-bordered table-striped timeTable"<thead>
                <tr>
                  <th scope="col">Day of Week</th>
                  <th scope="col">Date</th>
                  <th scope="col">Times</th>
                </tr>
              </thead>
              </table>
              </div>`);


                //populate voting dates table
                for (let i = 0; i < response.earlyVoteSites.length; i++) {
                    locations.push(response.earlyVoteSites[i].address.line1 + ", " + response.earlyVoteSites[i].address.line2 + ", " + response.earlyVoteSites[i].address.city + ", " + response.earlyVoteSites[i].address.state + ", " + response.earlyVoteSites[i].address.zip);
                    let splitPollingHours = response.earlyVoteSites[i].pollingHours.split(/\n/g) || [];

                    splitPollingHours.forEach(day => {
                        let pollingDay = day.substring(0, day.indexOf(","));
                        pollingDay = fullDayOfWeek(pollingDay);
                        let pollingDate = day.substring(day.indexOf(",") + 1, day.indexOf(":"));
                        let pollingHours = day.split(':').pop();
                        $(".timeTable").append(`<tr><td>${pollingDay}</td><td>${pollingDate}</td><td>${pollingHours}</td></tr>`);
                    });



                    let startDate = response.earlyVoteSites[i].startDate;
                    startDate = moment(startDate).format("L");
                    let endDate = response.earlyVoteSites[i].endDate;
                    endDate = moment(endDate).format("L");

                    $(".locationInfo").append(`<tr>
                     <td class="vote-site-name">${response.earlyVoteSites[i].address.locationName}<br>${response.earlyVoteSites[i].address.line1}, ${response.earlyVoteSites[i].address.city}, ${response.earlyVoteSites[i].address.state} ${response.earlyVoteSites[i].address.zip}
                     <br>Polling Location Notes: ${response.earlyVoteSites[i].notes}
                     <br>Date from ${startDate} to ${endDate}
                     </td>`
                    );
                }//end populate

                //put markers on map
                locations.forEach(address => {
                    let parsedAddress = urlAddress(address);
                    let llUrl = "https://maps.googleapis.com/maps/api/geocode/json?address=" + parsedAddress + "&key=AIzaSyCYQHKMzQBNqWcLUvLKJNrSdXqZ90wOA88";
                    $.getJSON(llUrl).then(function (data) {
                        let longLat = {
                            longitude: data.results[0].geometry.location.lng,
                            latitude: data.results[0].geometry.location.lat
                        };

                        //define marker to put on map
                        var marker = new google.maps.Marker({
                            position: new google.maps.LatLng(longLat.latitude, longLat.longitude),
                            map: map
                        });

                        //extend the bounds to include each marker's position
                        bounds.extend(marker.position);

                        //put cool info for the user if they click the markers
                        google.maps.event.addListener(marker, 'click', (function (marker, address) {
                            return function () {
                                infowindow.setContent()
                                infowindow.open(map, marker);
                            };
                        })(marker, address));


                        //now fit the map to the newly inclusive bounds
                        map.fitBounds(bounds);

                    });

                });



            });
        };

        //create empty LatLngBounds object
        var bounds = new google.maps.LatLngBounds();
        var infowindow = new google.maps.InfoWindow();

        searchPoll();
    });

    function urlAddress(address) {
        return address.replace(/\s+/g, '+');
    }

    function fullDayOfWeek(day) {
        let dayDict = {
            "Mon": "Monday",
            "Tue": "Tuesday",
            "Wed": "Wednesday",
            "Thu": "Thursday",
            "Fri": "Friday",
            "Sat": "Saturday",
            "Sun": "Sunday"
        };
        return dayDict[day];
    }

    function encodeKey(s) { return encodeURIComponent(s).replace('.', '%2E'); }
});