  require([
    "dojo/_base/connect",
    "dojo/dom",
    "dojo/_base/Color",
    "esri/map",
    "esri/geometry/Extent",
    "agsjs/dijit/TOC",
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
    "esri/InfoTemplate",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/tasks/IdentifyTask",
    "esri/tasks/IdentifyParameters",
    "esri/dijit/Popup",
    "dojo/_base/array",
    "dojo/dom-construct",
    "dijit/TitlePane",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dijit/form/Button",
    "dijit/layout/AccordionContainer",
    "dijit/layout/AccordionPane",
    "dojo/domReady!"
  ], function (connect, dom, Color, Map, Extent, TOC, ArcGISDynamicMapServiceLayer, ImageParameters, Navigation, parser, registry, on, Geocoder, Locator, Search, FeatureLayer, InfoTemplate, SimpleFillSymbol,
        SimpleLineSymbol, SimpleMarkerSymbol, IdentifyTask, IdentifyParameters, Popup, arrayUtils, domConstruct) {

      var map, toc, navToolbar, geocoder, identifyTask, identifyParams, hydrantID;

      parser.parse();

      var popup = new Popup({
        fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
          //   , markerSymbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 10,
          // new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
          //     new Color([255,0,0]), 1),new Color([0,255,0,0.25]))
      }, domConstruct.create("div"));

      map = new Map("mapDiv", {
        sliderOrientation : "vertical",
        infoWindow: popup
      });

      var fireExplorerURL = "http://helen2:6080/arcgis/rest/services/Fire/FireExplorer_MS/MapServer";
      var dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer(fireExplorerURL, {
        "opacity" : 1.0,
        "imageParameters" : imageParameters
      });
      map.addLayers([dynamicMapServiceLayer]);

      map.on("load", mapReady);

      // map.addLayer(new ArcGISDynamicMapServiceLayer(fireExplorerURL,
      //   { opacity: 0.55 }));

function mapReady () {
    map.on("click", executeIdentifyTask);
    //create identify tasks and setup parameters
    identifyTask = new IdentifyTask(fireExplorerURL);

    identifyParams = new IdentifyParameters();
    identifyParams.tolerance = 5;
    identifyParams.returnGeometry = true;
    identifyParams.layerIds = [3, 10];
    identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_VISIBLE;
    identifyParams.width = map.width;
    identifyParams.height = map.height;
  }

  function executeIdentifyTask (event) {
    identifyParams.geometry = event.mapPoint;
    identifyParams.mapExtent = map.extent;

    var deferred = identifyTask
      .execute(identifyParams)
      .addCallback(function (response) {
        //console.log(response);
        // response is an array of identify result objects
        // Let's return an array of features.
        return arrayUtils.map(response, function (result) {
          //console.log(result);
          var feature = result.feature;
          var layerName = result.layerName;
          var attributes = feature.attributes;

          //feature.attributes.layerName = layerName;
          if (layerName === 'Hydrants') {
            hydrantID = attributes["Hydrant ID"];
            //console.log(hydrantID);
            //var hydrantFlowData = getHydrantFlowData(hydrantID);

            getHydrantFlowData(function(result) {
              console.log(result);
              var hydrantFlowContent = JSON.parse(result);
              console.log(hydrantFlowContent);
              var table, tableData;
              table = "<table>";
              table += "<tr><th>Date</th><th>Static</th><th>Residual</th><th>Pitot</th><th>GPM</th><th>@20</th><th>@10</th><th>@0</th></tr>";
              for (var i = 0; i < hydrantFlowContent.features.length; i++) {
                  tableData = '<tr>';
                  tableData += "<td>" + hydrantFlowContent.features[i].attributes.date + "</td>";
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
              //var infoTemplateContent = "Hydrant ID: ${Hydrant ID} <br/> Main Size: ${Main Size} <br/>" + table;
              console.log(infoTemplateContent);
              var hydrantTemplate = new InfoTemplate();
              hydrantTemplate.setTitle("Hydrants");
              hydrantTemplate.setContent(infoTemplateContent);
              console.log(hydrantTemplate);
              feature.setInfoTemplate(hydrantTemplate);
            });
          }
          else if (layerName === 'Streets') {
            //console.log(feature.attributes.PARCELID);
            var streetsTemplate = new InfoTemplate("Street", "Street: ${STREET}");
            feature.setInfoTemplate(streetsTemplate);
          }
          return feature;
        });
      });

      // InfoWindow expects an array of features from each deferred
      // object that you pass. If the response from the task execution
      // above is not an array of features, then you need to add a callback
      // like the one above to post-process the response and return an
      // array of features.
      map.infoWindow.setFeatures([deferred]);
      map.infoWindow.show(event.mapPoint);
    }

      var imageParameters = new ImageParameters();
      imageParameters.format = "jpeg"; //set the image type to PNG24, note default is PNG8.

      //Takes a URL to a non cached map service.
      // var dynamicMapServiceLayer = new ArcGISDynamicMapServiceLayer("http://helen2:6080/arcgis/rest/services/Fire/FireExplorer_MS/MapServer", {
      //   "opacity" : 1.0,
      //   "imageParameters" : imageParameters
      // });
      //
      // map.addLayers([dynamicMapServiceLayer]);

      //Table of Contents Wigit.
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
                //collapsed: false, // whether this root layer should be collapsed initially, default false.
                //slider: false // whether to display a transparency slider.
              }]
            }, 'tocDiv');
            toc.startup();
          }
          catch(err) {
             console.error(err.message);
          }
      });

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

      var itemSources = [
          {
            featureLayer: new FeatureLayer("http://helen2:6080/arcgis/rest/services/Fire/FireExplorer_MS/MapServer/3"),
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
          featureLayer: new FeatureLayer("http://helen2:6080/arcgis/rest/services/Fire/FireExplorer_MS/MapServer/12"),
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
          enableSuggestions: true,
          //minCharacters: 0
        }
      ];

      var searchItem = new Search({
        map: map,
        sources: itemSources,
        //enableSuggestions: true,
        enableHighlight: true,
        zoomScale: 5000,
        showInfoWindowOnSelect: false
        //enableButtonMode: true
      },"featureSearch");
      searchItem.startup();

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
        url: "http://gisimages.greensboro-nc.gov/GsoGeoService/api/PointInPoly?x=" + response.result.feature.geometry.x + "&y=" + response.result.feature.geometry.y + "&l=5",
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
http://helen2:6080/arcgis/rest/services/Fire/FireExplorer_MS/MapServer/33/query?where=hydr_gpm%3E0+and+hydr_id%3D%27hy009-093%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=html
  function getHydrantFlowData(callback) {
    //var table;
   return $.ajax({
      type: "GET",
      url: "http://helen2:6080/arcgis/rest/services/Fire/FireExplorer_MS/MapServer/33/query?where=hydr_gpm>0 and hydr_id='" + hydrantID + "'&outFields=*&f=json",

      success: callback// function(result) {
      //   var hydrantFlowTests = JSON.parse(result);
      //   //console.log(hydrantFlowTests);
      //
      //   var tableData;
      //   // var table = $("<table/>")
      //   // table.append("<tr><th>Date</th><th>Static</th><th>Residual</th><th>Pitot</th><th>GPM</th><th>@20</th><th>@10</th><th>@0</th></tr>");
      //   // for (var i = 0; i < hydrantFlowTests.features.length; i++) {
      //   //     tableData = $('<tr/>');
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.date + "</td>");
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.static + "</td>");
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.residual + "</td>");
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.pitot + "</td>");
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.hydr_gpm + "</td>");
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.gpm_20 + "</td>");
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.gpm_10 + "</td>");
      //   //     tableData.append("<td>" + hydrantFlowTests.features[i].attributes.gpm0 + "</td>");
      //   //     table.append(tableData);
      //   // }
      //
      //   table = "<table>";
      //   table += "<tr><th>Date</th><th>Static</th><th>Residual</th><th>Pitot</th><th>GPM</th><th>@20</th><th>@10</th><th>@0</th></tr>";
      //   for (var i = 0; i < hydrantFlowTests.features.length; i++) {
      //       tableData = '<tr>';
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.date + "</td>";
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.static + "</td>";
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.residual + "</td>";
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.pitot + "</td>";
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.hydr_gpm + "</td>";
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.gpm_20 + "</td>";
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.gpm_10 + "</td>";
      //       tableData += "<td>" + hydrantFlowTests.features[i].attributes.gpm_0 + "</td>";
      //       table += tableData + "</tr>";
      //   }
      //   table += "</table>";
      //   console.log(table);
      //   return table;
      // }
    });
    //console.log(table);

  }
});
