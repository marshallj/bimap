  require([
    "dojo/dom",
    "dojo/_base/Color",
    "esri/map",
    "esri/geometry/Extent",
    "esri/geometry/Point",
    "esri/geometry/Polygon",
    "agsjs/dijit/TOC",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/ImageParameters",
    "esri/toolbars/navigation",
    "dojo/parser",
    "dijit/registry",
    "dojo/on",
    "esri/InfoTemplate",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/tasks/IdentifyTask",
    "esri/tasks/IdentifyParameters",
    "esri/dijit/Popup",
    "esri/graphic",
    "esri/dijit/Measurement",
    "esri/config",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/_base/connect",
    "dojo/fx",
    "dijit/form/Button",
    "bootstrap/Tooltip",
    "dojo/domReady!"
  ], function (dom, Color, Map, Extent, Point, Polygon, TOC, ArcGISDynamicMapServiceLayer, ArcGISTiledMapServiceLayer, ImageParameters, Navigation, parser, registry, onDojo, InfoTemplate, SimpleFillSymbol,
        SimpleLineSymbol, SimpleMarkerSymbol, IdentifyTask, IdentifyParameters, Popup, Graphic, Measurement, esriConfig, arrayUtils, domConstruct, connect) {

      parser.parse();

      /******* Update with "arcgis" for production and update with "test" for test ********/
      var webAdaptor = "arcgis";
      /************************************************************************************/
      var map, extent, coords, addrCoords, address, toc, tocOrtho, navToolbar, identifyTask, identifyParams, hydrantID, pointGraphic, polygonGraphic, polygonFeature;

      // Flag for disabling popups when the measuremnt tool is active.
      var isMeasureEnabled = false;

      // Geometry Service
      esriConfig.defaults.geometryService = new esri.tasks.GeometryService("https://gisapps.greensboronc.org/" + webAdaptor + "/rest/services/Utilities/Geometry/GeometryServer");

      var markerSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 12,
        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 0.8]), 1),
        new Color([0, 255, 255, 1]));
      var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,255,255, 0.8]), 3);
      var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 0.8]), 2), new Color([0, 255, 255, 0.1]));

      /*******************************************************************/
      /*************************** QueryParams ***************************/
      /*******************************************************************/
      jQuery.extend({
        getQueryParameters : function(str) {
      	  return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
        }
      });

      if (document.location.search) {
        var queryParams = $.getQueryParameters();

        var addressSakey = Number(queryParams.AddrID),
            inCity = queryParams.City,
            fldPlain = queryParams.FldPln,
            locHistDist = queryParams.LocHistDist,
            natHistResult = queryParams.NatHistDist,
            overlayDist = queryParams.OvlDist,
            landmarkProp = queryParams.LndMrkProp,
            zoning = queryParams.Zoning,
            cityBlock = queryParams.Grid,
            censusTrct = queryParams.CenTract,
            dateAnnex = decodeURIComponent(queryParams.AnnexDate);

          $('#inCityResult').html(inCity);
          $('#floodResult').html(fldPlain);
          $('#locHistResult').html(locHistDist);
          $('#natHistResult').html(natHistResult);
          $('#overalyResult').html(overlayDist);
          $('#landmarkResult').html(landmarkProp);
          $('#zoningResult').html(zoning);
          $('#blockResult').html(cityBlock);
          $('#censusResult').html(censusTrct);
          $('#annexResult').html(dateAnnex);

          /*******************************************************************/
          /*************************** AJAX Promise **************************/
          /*******************************************************************/
        if (addressSakey) {

          var deferred = $.Deferred();

          var gettingAddressCoords = deferred.then(function() {
            return $.ajax('http://gisapps.greensboronc.org/arcgis/rest/services/EngineeringInspections/BImap_MS/MapServer/0/query?where=AD_SAKEY=' + addressSakey + ' &f=json');
          }).done(function(result) {
            var resultObj = $.parseJSON(result);
            // console.log(resultObj);
            var x = resultObj.features[0].geometry.x,
                y = resultObj.features[0].geometry.y;
            coords = [ x, y ];
            console.log(coords);
            addrCoords = new Point( coords, new esri.SpatialReference({wkid:2264}) );
            console.log("1 - get address coords");
            console.log(addrCoords);
          });

          var gettingParcelFeature = gettingAddressCoords.then(function() {
            return $.ajax('http://gisapps.greensboronc.org/arcgis/rest/services/EngineeringInspections/BImap_MS/MapServer/10/query?geometryType=esriGeometryPoint&geometry=' + coords[0] + ',' + coords[1] + '&f=json');
          }).done(function(result) {
            var resultObj = $.parseJSON(result);
            console.log(resultObj.features[0].geometry.rings[0]);
            polygonFeature = new Polygon( resultObj.features[0].geometry.rings[0] );
            console.log("2 - get parcel feature");
            pointGraphic = new Graphic(addrCoords, markerSymbol);
            polygonGraphic = new Graphic(polygonFeature, fillSymbol);
            map.centerAndZoom(addrCoords, 11);
            map.graphics.add(pointGraphic);
            map.graphics.add(polygonGraphic);
            console.log("3 - done");
          });

          deferred.resolve();

          /*******************************************************************/
          /*************************** AJAX Promise **************************/
          /*******************************************************************/
        }
      }
      /*******************************************************************/
      /*************************** QueryParams ***************************/
      /*******************************************************************/


      var extent = new Extent(1659734.28936683, 791324.824158028, 1867556.626367224, 915192.442237733, new esri.SpatialReference({wkid:2264}) );

      var popup = new Popup({
        markerSymbol: markerSymbol,
        lineSymbol: lineSymbol,
        fillSymbol: fillSymbol,
      }, domConstruct.create("div"));

      map = new Map("map", {
        sliderOrientation : "vertical",
        extent: extent,
        infoWindow: popup
      });

      var measurement = new Measurement({
        map: map
      }, dom.byId("measurementDiv"));
      measurement.startup();

      var imageParameters = new ImageParameters();
      imageParameters.format = "jpeg"; //set the image type to PNG24, note default is PNG8.

      var bimapURL = "https://gisapps.greensboronc.org/" + webAdaptor + "/rest/services/EngineeringInspections/BImap_MS/MapServer";
      var orthoURL = "http://gis.co.guilford.nc.us/arcgis/rest/services/Basemaps/Guilford_2014_Orthos4Web_NAD83/MapServer"

      var dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer(bimapURL, {
        "opacity" : 1.0,
        "imageParameters" : imageParameters
      });

      var tiledMapServiceLayer = new ArcGISTiledMapServiceLayer(orthoURL, {
        visible: false,
        displayLevels: [3,4,5,6,7,8,9]
      });

      map.addLayers([tiledMapServiceLayer, dynamicMapServiceLayer]);
      map.on("load", mapReady);

  function mapReady () {
    $("#select").css("background-image", "url('images/CursorSelect.png')");

    map.on("click", executeIdentifyTask);

    //create identify tasks and setup parameters
    identifyTask = new IdentifyTask(bimapURL);
    identifyParams = new IdentifyParameters();
    identifyParams.tolerance = 5;
    identifyParams.returnGeometry = true;
    identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
    identifyParams.layerIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

    identifyParams.width = map.width;
    identifyParams.height = map.height;
  }

  function executeIdentifyTask (event) {
    if (isMeasureEnabled == false) {
      map.graphics.clear();
      identifyParams.geometry = event.mapPoint;
      identifyParams.mapExtent = map.extent;

      var deferred = identifyTask
        .execute(identifyParams)
        .addCallback(function (response) {
        //console.log(response);
        // response is an array of identify result objects
        // visibleResponse is an array of visible identify result objects
        var visibleResponse = [];
        for (var i = 0; i < response.length; i++) {
          if (dynamicMapServiceLayer.layerInfos[response[i].layerId].visible == true) {
            visibleResponse.push(response[i]);
          }
        }
        // Let's return an array of features from identifiable visible layers.
        return arrayUtils.map(visibleResponse, function (result) {
          //console.log(result);
          var feature = result.feature;
          var layerName = result.layerName;
          var attributes = feature.attributes;

          var basicTemplate = new InfoTemplate(layerName, "${*}");
          feature.setInfoTemplate(basicTemplate);

          // map.infoWindow.resize(350, 200);
          map.infoWindow.setFeatures([deferred]);
          map.infoWindow.show(event.mapPoint);
          //Hardcode select graphic for points due to API bug.
          // if (feature.geometry.type == "point") {
          //   var point = new Point(feature.geometry.x, feature.geometry.y, map.spatialReference);
          //   pointGraphic = new Graphic(point, markerSymbol);
          //   map.graphics.add(pointGraphic);
          // }
          return feature;
        });
      });
    }
    else if (isMeasureEnabled == true) {
      map.setInfoWindowOnClick(false);
    }
  }
  connect.connect(popup, "onHide", function() {
      map.graphics.clear();
  });

      /*******************************************************************/
      /*************************** TOC Widget ****************************/
      /*******************************************************************/
      map.on('layers-add-result', function(evt) {
          // overwrite the default visibility of service.
          // TOC will honor the overwritten value
          try {
              toc = new TOC({
              map: map,
              layerInfos: [{
                layer: dynamicMapServiceLayer,
                title: "Building Inspections Layers"
              }]
            }, 'tocDiv');
            toc.startup();

            tocOrtho = new TOC({
            map: map,
            layerInfos: [{
              layer: tiledMapServiceLayer,
              noLegend: true,
              title: "2014 Guilford Ortho",
              slider: true // whether to display a transparency slider.
            }]
          }, 'tocDivOrtho');
          tocOrtho.startup();
          }
          catch(err) {
             console.error(err.message);
          }
      });
      /*******************************************************************/
      /*********************** END - TOC Widget **************************/
      /*******************************************************************/

      /*******************************************************************/
      /********************** NAVIGATION TOOLBAR *************************/
      /*******************************************************************/
      navToolbar = new Navigation(map);
       onDojo(navToolbar, "onExtentHistoryChange", extentHistoryChangeHandler);

       registry.byId("zoomin").on("click", function() {
         navToolbar.activate(Navigation.ZOOM_IN);
         $("#zoomin").css("background-image", "url('images/ZoomInSelect.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
         $("#select").css("background-image", "url('images/Cursor.png')");
         map.setMapCursor("url('images/ZoomInCursor.png'), auto");
         cleanMeasurementTool();
       });

       registry.byId("zoomout").on("click", function() {
         navToolbar.activate(Navigation.ZOOM_OUT);
         $("#zoomout").css("background-image", "url('images/ZoomOutSelect.png')");
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#select").css("background-image", "url('images/Cursor.png')");
         map.setMapCursor("url('images/ZoomOutCursor.png'), auto");
         cleanMeasurementTool();
       });

       registry.byId("zoomfullext").on("click", function() {
         //navToolbar.zoomToFullExtent();
         map.setExtent(extent);
         cleanMeasurementTool();
       });

       registry.byId("zoomprev").on("click", function() {
         navToolbar.zoomToPrevExtent();
         cleanMeasurementTool();
       });

       registry.byId("zoomnext").on("click", function() {
         navToolbar.zoomToNextExtent();
         cleanMeasurementTool();
       });

       registry.byId("select").on("click", function() {
         navToolbar.activate(Navigation.PAN);
         $("#select").css("background-image", "url('images/CursorSelect.png')");
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
         map.setMapCursor("default");
         cleanMeasurementTool();
       });

       registry.byId("measurement").on("click", function() {
         navToolbar.activate(Navigation.PAN);
         $("#select").css("background-image", "url('images/Cursor.png')");
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
         $("#measurement").css("background-image", "url('images/MeasureHighlight.png')");
         map.setMapCursor("default");
         measurement.setTool("distance", true);
         $("#measurementDiv").show();
         isMeasureEnabled = true;
       });

       function extentHistoryChangeHandler() {
         registry.byId("zoomprev").disabled = navToolbar.isFirstExtent();
         registry.byId("zoomnext").disabled = navToolbar.isLastExtent();
       }

       function cleanMeasurementTool() {
         $("#measurementDiv").hide();
         $("#measurement").css("background-image", "url('images/Measure.png')");
         measurement.clearResult();
         measurement.setTool("area", false);
         measurement.setTool("distance", false);
         isMeasureEnabled = false;
       }
       /*******************************************************************/
       /******************* END - NAVIGATION TOOLBAR **********************/
       /*******************************************************************/
});
