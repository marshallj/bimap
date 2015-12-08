var map, navToolbar, geocoder;


  require([
    "esri/map",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/ImageParameters",
    "esri/toolbars/navigation",
    "dojo/parser",
    "dijit/registry",
    "dojo/on",
    "esri/dijit/Geocoder",
    "esri/tasks/locator",
    "esri/dijit/Search",
    "esri/layers/FeatureLayer",
    "dijit/TitlePane",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/layout/AccordionContainer",
    "dijit/layout/AccordionPane",
    "dojo/domReady!"
  ], function (Map, ArcGISDynamicMapServiceLayer, ImageParameters, Navigation, parser, registry, on, Geocoder, Locator, Search, FeatureLayer) {

      parser.parse();

      map = new Map("mapDiv", {
        sliderOrientation : "vertical"
      });

      var imageParameters = new ImageParameters();
      imageParameters.format = "jpeg"; //set the image type to PNG24, note default is PNG8.

      //Takes a URL to a non cached map service.
      var dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer("http://apollo/ArcGIS/rest/services/FireExplorer/MapServer", {
        "opacity" : 1.0,
        "imageParameters" : imageParameters
      });

      map.addLayer(dynamicMapServiceLayer);

      navToolbar = new Navigation(map);
       on(navToolbar, "onExtentHistoryChange", extentHistoryChangeHandler);

       registry.byId("zoomin").on("click", function () {
         navToolbar.activate(Navigation.ZOOM_IN);
       });

       registry.byId("zoomout").on("click", function () {
         navToolbar.activate(Navigation.ZOOM_OUT);
       });

       registry.byId("zoomfullext").on("click", function () {
         navToolbar.zoomToFullExtent();
       });

       registry.byId("zoomprev").on("click", function () {
         navToolbar.zoomToPrevExtent();
       });

       registry.byId("zoomnext").on("click", function () {
         navToolbar.zoomToNextExtent();
       });

       registry.byId("pan").on("click", function () {
         navToolbar.activate(Navigation.PAN);
       });

       registry.byId("deactivate").on("click", function () {
         navToolbar.deactivate();
       });

       function extentHistoryChangeHandler () {
         registry.byId("zoomprev").disabled = navToolbar.isFirstExtent();
         registry.byId("zoomnext").disabled = navToolbar.isLastExtent();
       }

      var sources = [
          {
            featureLayer: new FeatureLayer("http://apollo/ArcGIS/rest/services/FireExplorer/MapServer/3"),
            searchFields: ["AssetID"],
            exactMatch: true,
            outFields: ["*"],
            name: "Hydrant ID Query",
            //labelSymbol: textSymbol,
            placeholder: "Hydrant ID",
            //prefix: "HY",
            //maxResults: 6,
            //maxSuggestions: 6,
            //enableSuggestions: true,
            //minCharacters: 0
          },
          {
          featureLayer: new FeatureLayer("http://apollo/ArcGIS/rest/services/FireExplorer/MapServer/13"),
          searchFields: ["Tag"],
          //suggestionTemplate: "Grid: ${Tag}",
          exactMatch: true,
          outFields: ["*"],
          name: "City Grid Query",
          //labelSymbol:  textSymbol,
          placeholder: "City Grid",
          //maxResults: 6,
          //maxSuggestions: 6,
          //enableSuggestions: true,
          //minCharacters: 0
        },
        {
          featureLayer: new FeatureLayer("https://gisimages.greensboro-nc.gov/prod/rest/services/GISDivision/GsoGeoService/MapServer/5"),
          searchFields: ["REPORT"],
          exactMatch: true,
          outFields: ["*"],
          name: "FZD Query",
          //labelSymbol: textSymbol,
          placeholder: "FZD",
          //prefix: "HY",
          //maxResults: 6,
          //maxSuggestions: 6,
          //enableSuggestions: true,
          //minCharacters: 0
        }
      ];

      var s = new Search({
        map: map,
        sources: sources,
        //enableSuggestions: true,
        enableHighlight: false,
        zoomScale: 10000,
        showInfoWindowOnSelect: false
        //enableButtonMode: true
      },"featureSearch");
      s.startup();

       var geocoders = [{
        url: "https://gisimages.greensboro-nc.gov/prod/rest/services/Geocoding/AllPoints/GeocodeServer",
        //url: "http://apollo/ArcGIS/rest/services/Geocoding/AllPoints/GeocodeServer",
        //url: "https://gisimages.greensboro-nc.gov/prod/rest/services/Geocoding/AddressPoints/GeocodeServer",
        name: "All Points",
         placeholder: "Address Search"
      }];

       var geocoder = new Geocoder( {
         map: map,
         autoComplete: true,
         arcgisGeocoder: false,
         highlightLocation: true,
         zoomScale: 1000,
         geocoders: geocoders
       },"search");
       geocoder.startup();

     geocoder.on("select", function(response) {
       console.log(response);
       $.ajax({
        url: "http://helen/GsoGeoService/api/PointInPoly?x=" + response.result.feature.geometry.x + "&y=" + response.result.feature.geometry.y + "&l=5",
        success: function(result) {
          //console.log(result);
          $(".drillStationResults").hide();
          $("#agencyResult").html("AGENCY:   " + result[0].value);
          $("#districtResult").html("DISTRICT:  " + result[1].value);
          $("#reportResult").html("REPORT:   " + result[2].value);
          $("#responseResult").html("RESPONSE: " + result[3].value);
          $("#stationsToggle").html("Toggle Stations")
          $("#st1").html("ST1: " + result[4].value);
          $("#st2").html("ST2: " + result[5].value);
          $("#st3").html("ST3: " + result[6].value);
          $("#st4").html("ST4: " + result[7].value);
          $("#st5").html("ST5: " + result[8].value);
          $("#st6").html("ST6: " + result[9].value);
          $("#st7").html("ST7: " + result[10].value);
          $("#st8").html("ST8: " + result[11].value);
          $("#st9").html("ST9: " + result[12].value);
          $("#st10").html("ST10: " + result[13].value);
        }
     });
   });

     geocoder.on("clear", function(response) {
       $(".drillDownResults").html("");
     });

     //Toggles the closest station data in the Fire Drill Down info.
     $("#stationsToggle").click(function(){
         $(".drillStationResults").toggle();
     });


});
