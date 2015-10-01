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
    "dijit/TitlePane",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/layout/AccordionContainer",
    "dijit/layout/AccordionPane",
    "dojo/domReady!"
  ], function (Map, ArcGISDynamicMapServiceLayer, ImageParameters, Navigation, parser, registry, on, Geocoder) {

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

         var geocoders = [{
          //url: " https://xanthus.greensboronc.org:6443/arcgis/rest/services/Geocoding/AllPoints/GeocodeServer",
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
          //  arcgisGeocoder: {
          //  name: "Esri World Geocoder",
          //  suffix: " Greensboro, NC"
          //  }
         },"search");
         geocoder.startup();

  });
