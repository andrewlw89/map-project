function mapViewModel() {

  "use strict";

  var self = this;
  var map, service, lat='', lng='', jax=new google.maps.LatLng(30.311657, -81.691094),infowindow,markerObjects=[];
  // ko observable array to hold all places
  self.allLocations = ko.observableArray(); // KO observable array to hold place data for different locations

  self.foursquareInfo = ''; // Holds fourSquareInfo as a string

/*###################################################################################################################################################*/

  // Load the map and add the event handlers needed. Calls clearPlaces on search then repopulates markerObjects.
  function init() {
  	"use strict";
    map = new google.maps.Map(document.getElementById('map-canvas'), {
    center: jax,
    mapTypeId: google.maps.MapTypeId.HYBRID,
    });
    getPlaces(); // Initiate getPlaces to populate
    computeCenter();

    var list = (document.getElementById('list'));
    map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(list);
    google.maps.event.addListener(map, 'bounds_changed', function(){
      var bounds = map.getBounds();
    });
    // Borrowed this handler from a different project. This waits 5 seconds for the map to load. If it hasn't loaded by then, it displays an error.
    var timer = window.setTimeout(loadError, 5000);
    google.maps.event.addListener(map, 'tilesloaded', function() {
      window.clearTimeout(timer);
    });
  }

/*###################################################################################################################################################*/

  // The following block of code is used to search the list of places and filter them using what is typed into the textbox.
  $("#filter").keyup(function(){
  // Retrieve the input field text
    var filter = $(this).val();
    // Loop through the comment list
    $(".nav li").each(function(){
      // If the list item does not contain the text phrase fade it out
      if ($(this).text().search(new RegExp(filter, "i")) < 0) {
        $(this).fadeOut();
        // Show the list item if the phrase matches
      } else {
        $(this).show();
      }
    });
  });

/*###################################################################################################################################################*/

  // Uses the Google Places API to find local places within a radius of 800 meters of the maps center
  function getPlaces() {
  	"use strict";
    var request = {
      location: jax,
      radius: 1200,
      types: ['restaurant', 'bar', 'cafe', 'food']
    };

    infowindow = new google.maps.InfoWindow();
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, function (results, status){ //Anonymous callback function to be executed on return of data
      if (status == google.maps.places.PlacesServiceStatus.OK){
        var bounds = new google.maps.LatLngBounds();
        results.forEach(function (place){
          place.marker = generateMarker(place);
          bounds.extend(new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng()));
        });
      map.fitBounds(bounds);
      results.forEach(getAllPlaces);
      }
    });
  }

/*###################################################################################################################################################*/

  // Pan to the clicked marker and open an infowindow
  self.clickMarker = function(place) {
  	"use strict";
    var marker;

    // This for loop compares the place_id of what was clicked vs that of the places in the markerObjects array. Once found, sets marker to that marker object and breaks the loop
    for(var e = 0; e < markerObjects.length; e++) {
      if(place.place_id === markerObjects[e].place_id) {
        marker = markerObjects[e];
        break;
      }
    }
    self.getFoursquareInfo(place); // Calls the Foursquare function to get Foursquare info
    map.panTo(marker.position); // Center on the clicked marker

    // force a delay because the Foursquare call is async. Otherwise if you click the list first then a marker next, the previous clicks Foursquare info will still be present.
    setTimeout(function() {
      var contentString = '<div style="font-weight: bold">' + place.name + '</div><div>' + place.address + '</div>' + self.foursquareInfo;
      infowindow.setContent(contentString);
      infowindow.open(map, marker);
    }, 300);
  };

/*###################################################################################################################################################*/

  // Gets info from places that are searched and pushes to allLocations
  function getAllPlaces(place){
  	"use strict";
    var address;
    var currPlace = {};
    currPlace.place_id = place.place_id;
    currPlace.position = place.geometry.location.toString(); // Stringify the location data
    currPlace.name = place.name;

    if (place.vicinity !== undefined) {
      address = place.vicinity;
    } else if (place.formatted_address !== undefined) {
      address = place.formatted_address;
    }
    currPlace.address = address; // Set the address for the place

    self.allLocations.push(currPlace);
  }

/*###################################################################################################################################################*/

  // This function pretty much does what it says it does. On page load or after a search, it creates the markers from the list of places.
  function generateMarker(place) {
  	"use strict";
    var marker = new google.maps.Marker({
      map: map,
      name: place.name.toLowerCase(), // Standardize the names to ensure no crazy cases such as 'cOoL guY'
      position: place.geometry.location,
      place_id: place.place_id,
      animation: google.maps.Animation.DROP
    });

    var address;

    if (place.vicinity !== undefined) { // Vicinity returns the address with no state or city info
      address = place.vicinity;
    } else if (place.formatted_address !== undefined) {
      address = place.formatted_address;
    }

    var contentString = '<div style="font-weight: bold">' + place.name + '</div><div>' + address + '</div>' + self.foursquareInfo ;

    // Event listener for setting info window content on click
    google.maps.event.addListener(marker, 'click', function() {
      infowindow.setContent(contentString);
      infowindow.open(map, this);
      map.panTo(marker.position);
    });

    markerObjects.push(marker);
    return marker;
  }

/*###################################################################################################################################################*/

  // Required credentials to use the Foursquare API
  var clientID = 'I3ZHKHFUGCENSSNLNCK0UWXKUXQO4RXSVLC1DE30TBRLKASN';
  var clientSecret = 'GZO1LJTHX23YFLIMFGOLTX1M0GWM21FMH513U2U5N44KC1SZ';

  this.getFoursquareInfo = function(place) {
  	"use strict";
    // generate the foursquare URL that will be sent in our JSON request
    var foursquareURL = 'https://api.foursquare.com/v2/venues/search?client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20150321' + '&ll=' +lat+ ',' +lng+ '&query=\'' + place.name + '\'&limit=1';

    $.getJSON(foursquareURL)
      .done(function(response) {
        self.foursquareInfo = '<p>Foursquare:<br>';
        var venue = response.response.venues[0];
        // Name of the venue
        var venueName = venue.name;
            if (venueName !== null && venueName !== undefined) {
                self.foursquareInfo += 'Name: ' +
                  venueName + '<br>';
            } else {
              self.foursquareInfo += 'Name: Not Found';
            }
        // Phone Number if available
        var phoneNum = venue.contact.formattedPhone;
            if (phoneNum !== null && phoneNum !== undefined) {
                self.foursquareInfo += 'Phone: ' +
                  phoneNum + '<br>';
            } else {
              self.foursquareInfo += 'Phone: Not Found';
            }
        // Twitter handle if available
        var twitterId = venue.contact.twitter;
            if (twitterId !== null && twitterId !== undefined) {
              self.foursquareInfo += 'twitter: @' +
                  twitterId + '<br>';
            }
      });
  };

/*###################################################################################################################################################*/

  // This function clears out the markers array so that it can be re-populated after a search
  function clearPlaces() {
  	"use strict";
    for (var i = 0; i < markerObjects.length; i++ ) {
      markerObjects[i].setMap(null);
    }
    markerObjects.length = 0;
  }

/*###################################################################################################################################################*/

  function loadError() {
  	"use strict";
    $('#map-canvas').html("Whoops, there was an error and it looks like Google Maps didn't load!");
  }

/*###################################################################################################################################################*/

  // Used to determine the center of the map and assign that as lng and lat
  function computeCenter() {
  	"use strict";
    var latAndLng = map.getCenter();
      lat = latAndLng.lat();
      lng = latAndLng.lng();
  }

/*###################################################################################################################################################*/



  google.maps.event.addDomListener(window, 'load', init);
}

ko.applyBindings(new mapViewModel());
