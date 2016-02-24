  require([
    "dojo/_base/connect",
    "dojo/dom",
    "dojo/_base/Color",
    "esri/map",
    "esri/geometry/Extent",
    "esri/geometry/Point",
    "agsjs/dijit/TOC",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ImageServiceParameters",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/RasterLayer",
    "esri/layers/ImageParameters",
    "esri/toolbars/navigation",
    "dojo/parser",
    "dijit/registry",
    "dojo/on",
    "esri/dijit/Geocoder",
    "esri/tasks/locator",
    "esri/dijit/Search",
    "esri/layers/FeatureLayer",
    "esri/InfoTemplate",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/tasks/IdentifyTask",
    "esri/tasks/IdentifyParameters",
    "esri/dijit/Popup",
    "esri/graphic",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/_base/connect",
    "dijit/TitlePane",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dijit/form/Button",
    "dijit/layout/AccordionContainer",
    "dijit/layout/AccordionPane",
    "dojo/domReady!"
  ], function (connect, dom, Color, Map, Extent, Point, TOC, ArcGISDynamicMapServiceLayer, ArcGISImageServiceLayer, ImageServiceParameters, ArcGISTiledMapServiceLayer, RasterLayer, ImageParameters, Navigation, parser, registry, on, Geocoder, Locator, Search, FeatureLayer, InfoTemplate, SimpleFillSymbol,
        SimpleLineSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, IdentifyTask, IdentifyParameters, Popup, Graphic, arrayUtils, domConstruct, query, connect) {

      /******* Update with "arcgis" for production and update with "test" for test ********/
      var prodOrTest = "test"
      /************************************************************************************/
      var map, toc, tocOrtho, navToolbar, geocoder, identifyTask, identifyParams, hydrantID, pointGraphic;
      // var markerSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
      //   new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
      //   new Color([255,0,0]), 1),
      //   new Color([0,255,0]));
      var pictureSymbol = new PictureMarkerSymbol('images/PointHighlight.png', 32, 32);
      var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,255,255, 0.8]), 3);
      var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 255, 255, 0.8]), 2), new Color([0, 255, 255, 0.1]));

      var startExtent = new Extent(1659734.28936683, 791324.824158028, 1867556.626367224, 915192.442237733, new esri.SpatialReference({wkid:2264}) );
      parser.parse();

      var popup = new Popup({
        markerSymbol: pictureSymbol,
        lineSymbol: lineSymbol,
        fillSymbol: fillSymbol,
      }, domConstruct.create("div"));

      map = new Map("mapDiv", {
        sliderOrientation : "vertical",
        extent: startExtent,
        infoWindow: popup
      });

      var imageParameters = new ImageParameters();
      imageParameters.format = "jpeg"; //set the image type to PNG24, note default is PNG8.

      var imageServiceParams = new ImageServiceParameters();

      var fireExplorerURL = "https://gis.greensboro-nc.gov/" + prodOrTest + "/rest/services/Fire/FireExplorer_MS/MapServer";
      //var fireExplorerURL = "https://gis.greensboro-nc.gov/arcgis/rest/services/Fire/FireExplorer_MS/MapServer";
      //var orthoURL = "http://helen2:6080/arcgis/rest/services/GISDivision/Guilford2014Ortho_IS/ImageServer"
      var orthoURL = "http://gis.co.guilford.nc.us/arcgis/rest/services/Basemaps/Guilford_2014_Orthos4Web_NAD83/MapServer"

      var dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer(fireExplorerURL, {
        "opacity" : 1.0,
        "imageParameters" : imageParameters
      });

      // var dynamicImageServiceLayer = new ArcGISImageServiceLayer(orthoURL, {
      //   imageServiceParameters: imageServiceParams,
      //   visible: false,
      //   useMapImage: true
      // });

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
    identifyTask = new IdentifyTask(fireExplorerURL);
    identifyParams = new IdentifyParameters();
    identifyParams.tolerance = 5;
    identifyParams.returnGeometry = true;
    identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
    identifyParams.layerIds = [0, 1, 2, 9, 10, 13, 14, 15, 17, 18, 20, 24, 25, 29, 33, 34, 35, 36, 37, 38];

    identifyParams.width = map.width;
    identifyParams.height = map.height;
  }

  function executeIdentifyTask (event) {
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

          if (layerName === 'Hydrants') {
            hydrantID = attributes["Hydrant_ID"];

            //console.log(hydrantID);
            //test
            getHydrantFlowData(function(result) {
              //console.log(result);
              var hydrantFlowContent = JSON.parse(result);
              //console.log("HydrantFlowJSON: " + JSON.stringify(hydrantFlowContent));
              var table, tableData;
              table = "<table id='hydFlowTable'>";
              table += "<tr><th>Date</th><th>Static</th><th>Residual</th><th>Pitot</th><th>GPM</th><th>@20</th><th>@10</th><th>@0</th></tr>";
              for (var i = 0; i < hydrantFlowContent.features.length; i++) {
                  var date = new Date(hydrantFlowContent.features[i].attributes.date);
                  tableData = '<tr>';
                  tableData += "<td>" + date.toLocaleDateString() + "</td>";
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.static + "</td>";
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.residual + "</td>";
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.pitot + "</td>";
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.hydr_gpm + "</td>";
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.gpm_20 + "</td>";
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.gpm_10 + "</td>";
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.gpm_0 + "</td>";
                  table += tableData + "</tr>";
              }
              table += "</table>";
              //var infoTemplateContent = "<strong>Hydrant ID:</strong> ${Hydrant_ID} <br/> <strong>Main Size:</strong> ${Main Size} <br/> <strong>Hydrant Flow Data:</strong> <br/>" + table;
              var infoTemplateContent = "<strong>Hydrant ID:</strong> ${Hydrant_ID} <br/> <strong>Hydrant Flow Data:</strong> <br/>" + table;
              //console.log("Table: " + table);
              var hydrantTemplate = new InfoTemplate("Hydrants", infoTemplateContent);

              //console.log("InfoTemplate: " + JSON.stringify(hydrantTemplate));
              feature.setInfoTemplate(hydrantTemplate);

              map.infoWindow.resize(450, 200);
              map.infoWindow.setFeatures([deferred]);
              map.infoWindow.show(event.mapPoint);
            });
          }
          else {
            var basicTemplate = new InfoTemplate(layerName, "${*}");
            feature.setInfoTemplate(basicTemplate);

            map.infoWindow.resize(350, 200);
            map.infoWindow.setFeatures([deferred]);
            map.infoWindow.show(event.mapPoint);
          }
          //Hardcode select graphic for points due to API bug.
          if (feature.geometry.type == "point") {
            var point = new Point(feature.geometry.x, feature.geometry.y, map.spatialReference);
            pointGraphic = new Graphic(point, pictureSymbol);
            map.graphics.add(pointGraphic);
          }
          return feature;
        });
      });
    }
    connect.connect(popup, "onHide", function() {
        map.graphics.clear();
    });

    //connect.connect(popup,"onSelectionChange",function() {
      // if (popup._highlighted.geometry.type != "point" && popup._highlighted._graphicsLayer.graphics.length > 1) {
      //   map.graphics.remove(pointGraphic);
      // }
      // else if (popup._highlighted.geometry.type == "point") {
      //   map.graphics.add(pointGraphic);
      // }
      //console.log(popup);
    //});

      /*******************************************************************/
      /*************************** TOC Widget ****************************/
      /*******************************************************************/
      map.on('layers-add-result', function(evt) {
          // overwrite the default visibility of service.
          // TOC will honor the overwritten value
          //dynamicMapServiceLayer.setVisibleLayers([2, 5, 8, 11]);
          try {
              toc = new TOC({
              map: map,
              layerInfos: [{
                layer: dynamicMapServiceLayer,
                title: "Fire Explorer Layers"
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
       on(navToolbar, "onExtentHistoryChange", extentHistoryChangeHandler);

       registry.byId("zoomin").on("click", function() {
         navToolbar.activate(Navigation.ZOOM_IN);
         $("#zoomin").css("background-image", "url('images/ZoomInSelect.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
         $("#select").css("background-image", "url('images/Cursor.png')");
         map.setMapCursor("url('images/ZoomInCursor.png'), auto");
       });

       registry.byId("zoomout").on("click", function() {
         navToolbar.activate(Navigation.ZOOM_OUT);
         $("#zoomout").css("background-image", "url('images/ZoomOutSelect.png')");
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#select").css("background-image", "url('images/Cursor.png')");
         map.setMapCursor("url('images/ZoomOutCursor.png'), auto");
       });

       registry.byId("zoomfullext").on("click", function() {
         //navToolbar.zoomToFullExtent();
         map.setExtent(startExtent);
       });

       registry.byId("zoomprev").on("click", function() {
         navToolbar.zoomToPrevExtent();
       });

       registry.byId("zoomnext").on("click", function() {
         navToolbar.zoomToNextExtent();
       });

       registry.byId("select").on("click", function() {
         navToolbar.activate(Navigation.PAN);
         $("#select").css("background-image", "url('images/CursorSelect.png')");
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
         map.setMapCursor("default");
       });

       function extentHistoryChangeHandler() {
         registry.byId("zoomprev").disabled = navToolbar.isFirstExtent();
         registry.byId("zoomnext").disabled = navToolbar.isLastExtent();
       }
       /*******************************************************************/
       /******************* END - NAVIGATION TOOLBAR **********************/
       /*******************************************************************/

       /*******************************************************************/
       /******* SEARCH Widget - For Hydrant ID, City Grid, and FZD ********/
       /*******************************************************************/
      var itemSources = [
          {
            featureLayer: new FeatureLayer("https://gis.greensboro-nc.gov/" + prodOrTest + "/rest/services/Fire/FireExplorer_MS/MapServer/10"),
            searchFields: ["Hydrant_ID"],
            exactMatch: true,
            outFields: ["*"],
            name: "Hydrant ID Query",
            highlightSymbol: pictureSymbol,
            //labelSymbol: textSymbol,
            placeholder: "Hydrant ID - Ex: 009-093",
            prefix: "HY",
            //maxResults: 6,
            //maxSuggestions: 6,
            //enableSuggestions: true,
            //minCharacters: 0
          },
          {
          featureLayer: new FeatureLayer("https://gis.greensboro-nc.gov/" + prodOrTest + "/rest/services/Fire/FireExplorer_MS/MapServer/19"),
          searchFields: ["Tag"],
          //suggestionTemplate: "Grid: ${Tag}",
          exactMatch: true,
          outFields: ["*"],
          name: "City Grid Query",
          highlightSymbol: fillSymbol,
          //labelSymbol:  textSymbol,
          placeholder: "City Grid",
          //maxResults: 6,
          //maxSuggestions: 6,
          //enableSuggestions: true,
          //minCharacters: 0
        },
        {
          featureLayer: new FeatureLayer("https://gis.greensboro-nc.gov/" + prodOrTest + "/rest/services/Fire/FireExplorer_MS/MapServer/20"),
          searchFields: ["REPORT"],
          exactMatch: true,
          outFields: ["*"],
          name: "FDZ Query",
          highlightSymbol: fillSymbol,
          //labelSymbol: textSymbol,
          placeholder: "FDZ",
          //maxResults: 6,
          //maxSuggestions: 6,
          enableSuggestions: true,
          //minCharacters: 0
        }
      ];

      var searchItem = new Search({
        map: map,
        sources: itemSources,
        //enableSuggestions: true,
        enableHighlight: true,
        allPlaceholder: "Search All",
        zoomScale: 5000,
        showInfoWindowOnSelect: false
        //enableButtonMode: true
      },"featureSearch");
      searchItem.startup();

      searchItem.on("search-results", function(e) {
        if (searchItem.activeSource.name == "Hydrant ID Query") {
          //console.log(searchItem.activeSource);
          if (dynamicMapServiceLayer.layerInfos[10].visible == false) {
            var inputs = query(".agsjsTOCNode input[type='checkbox']");
            //console.log(inputs);
            var visible = [10];
            for (var i = 1; i < inputs.length; i++) {
              if (inputs[i].checked) {
                visible.push(i - 1);
              }
            }
            //console.log(visible);
            dynamicMapServiceLayer.setVisibleLayers(visible);
          }
        }
        else if (searchItem.activeSource.name == "City Grid Query") {
          //console.log(searchItem.activeSource);
          if (dynamicMapServiceLayer.layerInfos[19].visible == false) {
            var inputs = query(".agsjsTOCNode input[type='checkbox']");
            //console.log(inputs);
            var visible = [19];
            for (var i = 1; i < inputs.length; i++) {
              if (inputs[i].checked) {
                visible.push(i - 1);
              }
            }
            //console.log(visible);
            dynamicMapServiceLayer.setVisibleLayers(visible);
          }
        }
        else if (searchItem.activeSource.name == "FZD Query") {
          //console.log(searchItem.activeSource);
          if (dynamicMapServiceLayer.layerInfos[20].visible == false) {
            var inputs = query(".agsjsTOCNode input[type='checkbox']");
            //console.log(inputs);
            var visible = [20];
            for (var i = 1; i < inputs.length; i++) {
              if (inputs[i].checked) {
                visible.push(i - 1);
              }
            }
            //console.log(visible);
            dynamicMapServiceLayer.setVisibleLayers(visible);
          }
        }
      });

      /*******************************************************************/
      /**** END - SEARCH Widget - For Hydrant ID, City Grid, and FZD *****/
      /*******************************************************************/

      /*******************************************************************/
      /**** SEARCH Widget - For Address Search after 10.3.1 Upgrade* *****/
      /*******************************************************************/
      // var addressSources = [
      //     {
      //       locator: new Locator("http://helen2:6080/arcgis/rest/services/Geocoding/AllPoints_GS/GeocodeServer"),
      //       singleLineFieldName: ["ADDRESS"],
      //       autoNavigate: "true",
      //       //exactMatch: true,
      //       outFields: ["*"],
      //       name: "Address Geocoder",
      //       //labelSymbol: textSymbol,
      //       placeholder: "Address",
      //       //maxResults: 6,
      //       maxSuggestions: 6,
      //       enableSuggestions: false,
      //       minCharacters: 0
      //     }
      // ];
      //
      // var searchAddress = new Search({
      //   map: map,
      //   sources: addressSources,
      //   enableSuggestions: true,
      //   enableHighlight: true,
      //   zoomScale: 5000,
      //   showInfoWindowOnSelect: false
      //   //enableButtonMode: true
      // },"search");
      // searchAddress.startup();
      /*******************************************************************/
      /** END - SEARCH Widget - For Address Search after 10.3.1 Upgrade **/
      /*******************************************************************/

      /*******************************************************************/
      /* GEOCODER Widget - UPGRADE to SEARCH Widget after 10.3.1 Upgrade */
      /*******************************************************************/
      /* TODO - UPGRADE to SEARCH Widget after 10.3.1 Upgrade */
       var geocoders = [{
        url: "https://gis.greensboro-nc.gov/" + prodOrTest + "/rest/services/Geocoding/AllPoints_GCS/GeocodeServer",
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
       //console.log(response.result.name);
       $.ajax({
        url: "http://gisapps.greensboronc.org/GsoGeoService/api/PointInPoly?x=" + response.result.feature.geometry.x + "&y=" + response.result.feature.geometry.y + "&l=5",
        jsonp: "callback",
        dataType: "jsonp",
        success: function(result) {
          //console.log(result);
          $(".drillStationResults").hide();

          $("#searchPrompt").html("<strong>" + response.result.name + ":</strong>");

          $("#drillDownResult").css("display", "inline");

          $("#agencyLabel").html("<strong>AGENCY:</strong>");
          $("#districtLabel").html("<strong>BATTALION:</strong>");
          $("#reportLabel").html("<strong>FIRE DEMAND ZONE:</strong>");
          $("#responseLabel").html("<strong>RESPONSE PLAN:</strong>");

          $("#agencyResult").html(result[0].value);
          $("#districtResult").html(result[1].value);
          $("#reportResult").html(result[2].value);
          $("#responseResult").html(result[3].value);

          $("#stationsToggle").html("Toggle Stations")
          $("#st1Label").html("<strong>ST1:</strong> ");
          $("#st2Label").html("<strong>ST2:</strong> ");
          $("#st3Label").html("<strong>ST3:</strong> ");
          $("#st4Label").html("<strong>ST4:</strong> ");
          $("#st5Label").html("<strong>ST5:</strong> ");
          $("#st6Label").html("<strong>ST6:</strong> ");
          $("#st7Label").html("<strong>ST7:</strong> ");
          $("#st8Label").html("<strong>ST8:</strong> ");
          $("#st9Label").html("<strong>ST9:</strong> ");
          $("#st10Label").html("<strong>ST10:</strong> ");

          $("#st1Result").html(result[4].value);
          $("#st2Result").html(result[5].value);
          $("#st3Result").html(result[6].value);
          $("#st4Result").html(result[7].value);
          $("#st5Result").html(result[8].value);
          $("#st6Result").html(result[9].value);
          $("#st7Result").html(result[10].value);
          $("#st8Result").html(result[11].value);
          $("#st9Result").html(result[12].value);
          $("#st10Result").html(result[13].value);
        }
      });
    });

    geocoder.on("clear", function(response) {
      $("#drillDownResult").css("display", "none");
      $("#searchPrompt").html("<strong>Search for an Address</strong>");
    });
    /*******************************************************************/
    /******************** END - GEOCODER Widget ************************/
    /*******************************************************************/

    //Toggles the closest station data in the Fire Drill Down info.
    $("#stationsToggle").click(function(){
      $(".drillStationResults").toggle();
    });

  function getHydrantFlowData(callback) {
   return $.ajax({
      type: "GET",
      url: "https://gis.greensboro-nc.gov/" + prodOrTest + "/rest/services/Fire/FireExplorer_MS/MapServer/40/query?where=hydr_gpm>0 and hydr_id='" + hydrantID + "'&outFields=*&f=json",
      success: callback
    });
  }
});
