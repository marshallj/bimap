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

      // map.on("load", createToolbar);
      //
      // // loop through all dijits, connect onClick event listeners for buttons to activate navigation tools
      // registry.forEach(function(d) {
      //   // d is a reference to a dijit, could be a layout container or a button
      //   if (d.declaredClass === "dijit.form.Button") {
      //     d.on("click", activateTool);
      //   }
      // });
      //
      // // activate tools
      // function activateTool() {
      //   var tool = this.label.toUpperCase().replace(/ /g, "_");
      //   switch(tool) {
      //     case "ZOOM_IN":
      //     case "ZOOM_OUT":
      //     case "PAN":
      //       navToolbar.activate(Navigation[tool]);
      //       break;
      //     case "FULL_EXTENT":
      //       navToolbar.zoomToFullExtent();
      //       break;
      //     case "PREV_EXTENT":
      //       navToolbar.zoomToPrevExtent();
      //       break;
      //     case "NEXT_EXTENT":
      //       navToolbar.zoomToNextExtent();
      //       break;
      //     case "DEACTIVATE":
      //       navToolbar.deactivate();
      //       break;
      //     default:
      //       break;
      //   }
      //   console.log(Navigation[tool]);
      // }
      //
      // // create the Navigation toolbar
      // function createToolbar(themap) {
      //   navToolbar = new Navigation(map);
      // }

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
          featureLayer: new FeatureLayer("http://apollo/ArcGIS/rest/services/FireExplorer/MapServer/13"),
          searchFields: ["Tag"],
          //suggestionTemplate: "Grid: ${Tag}",
          exactMatch: true,
          outFields: ["*"],
          name: "City Grid",
          //labelSymbol: textSymbol,
          placeholder: "City Grid",
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
        zoomScale: 10000,
        showInfoWindowOnSelect: false,
        enableButtonMode: true
      },"gridSearch");
      s.startup();

       var geocoders = [{
        //url: "http://xanthus:6080/prod/rest/services/Geocoding/AllPoints/GeocodeServer",
        //url: "http://apollo/ArcGIS/rest/services/Geocoding/AllPoints/GeocodeServer",
        url: "http://xanthus:6080/arcgis/rest/services/Geocoding/AddressPoints/GeocodeServer",
        name: "All Points",
         placeholder: "Address Search",
        // singleLineFieldName: "Single Line Input",
        // categories: ["airports"]
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

    //    geocoder.on("find-results", function(response) {
    //      console.log(response);
    //      $.ajax({
    //       url: "http://helen/GsoGeoService/api/PointInPoly?x=" + response.results.results[0].feature.geometry.x + "&y=" + response.results.results[0].feature.geometry.y + "&l=5",
    //       success: function(result) {
    //         console.log(result);
    //         $("#agencyResult").html("AGENCY:   " + result[0].value);
    //         $("#districtResult").html("DISTRICT:  " + result[1].value);
    //         $("#reportResult").html("REPORT:   " + result[2].value);
    //         $("#responseResult").html("RESPONSE: " + result[3].value);
    //       }
     //
    //    });
    //  });

     geocoder.on("select", function(response) {
       console.log(response);
       $.ajax({
        url: "http://helen/GsoGeoService/api/PointInPoly?x=" + response.result.feature.geometry.x + "&y=" + response.result.feature.geometry.y + "&l=5",
        success: function(result) {
          console.log(result);
          $("#agencyResult").html("AGENCY:   " + result[0].value);
          $("#districtResult").html("DISTRICT:  " + result[1].value);
          $("#reportResult").html("REPORT:   " + result[2].value);
          $("#responseResult").html("RESPONSE: " + result[3].value);
        }

     });
   });

     geocoder.on("clear", function(response) {
       $(".drillDownResults").html("");
     });
});
