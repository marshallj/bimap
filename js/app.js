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
    "esri/dijit/LayerList",
    "dojo/query",
    "dijit/TitlePane",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dojo/fx",
    "dijit/form/Button",
    "dijit/layout/AccordionContainer",
    "dijit/layout/AccordionPane",
    "dojo/domReady!"
  ], function (connect, dom, Color, Map, Extent, TOC, ArcGISDynamicMapServiceLayer, ImageParameters, Navigation, parser, registry, on, Geocoder, Locator, Search, FeatureLayer, InfoTemplate, SimpleFillSymbol,
        SimpleLineSymbol, SimpleMarkerSymbol, IdentifyTask, IdentifyParameters, Popup, arrayUtils, domConstruct, LayerList, query) {

      var map, toc, navToolbar, geocoder, identifyTask, identifyParams, hydrantID;

      parser.parse();

      var popup = new Popup({
        fillSymbol: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25])),
        lineSymbol: new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID, new Color([255,0,0]), 3),
        markerSymbol: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SQUARE, 10,
          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
            new Color([255,0,0]), 1), new Color([0,255,0,0.25]))
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

function mapReady () {
    map.on("click", executeIdentifyTask);
    //create identify tasks and setup parameters
    identifyTask = new IdentifyTask(fireExplorerURL);

    identifyParams = new IdentifyParameters();
    identifyParams.tolerance = 5;
    identifyParams.returnGeometry = true;
    identifyParams.layerIds = [1, 3, 10, 12];
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
          console.log("Result: " + JSON.stringify(result));
          var feature = result.feature;
          var layerName = result.layerName;
          var attributes = feature.attributes;

          if (layerName === 'Hydrants') {
            hydrantID = attributes["Hydrant ID"];
            //console.log(hydrantID);

            getHydrantFlowData(function(result) {
              console.log("AJAX Result: " + result);
              var hydrantFlowContent = JSON.parse(result);
              console.log("HydrantFlowJSON: " + JSON.stringify(hydrantFlowContent));
              var table, tableData;
              table = "<table id='hydFlowTable'>";
              table += "<tr><th>Date</th><th>Static</th><th>Residual</th><th>Pitot</th><th>GPM</th><th>@20</th><th>@10</th><th>@0</th></tr>";
              for (var i = 0; i < hydrantFlowContent.features.length; i++) {
                  var date = new Date(hydrantFlowContent.features[i].attributes.date);
                  tableData = '<tr>';
                  // tableData += "<td>" + hydrantFlowContent.features[i].attributes.date + "</td>";
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
              var infoTemplateContent = "<strong>Hydrant ID:</strong> ${Hydrant ID} <br/> <strong>Main Size:</strong> ${Main Size} <br/> <strong>Hydrant Flow Data:</strong> <br/>" + table;
              console.log("Table: " + table);
              var hydrantTemplate = new InfoTemplate("Hydrants", infoTemplateContent);

              console.log("InfoTemplate: " + JSON.stringify(hydrantTemplate));
              feature.setInfoTemplate(hydrantTemplate);

              map.infoWindow.resize(450, 200);
              map.infoWindow.setFeatures([deferred]);
              map.infoWindow.show(event.mapPoint);
            });
          }
          else if (layerName === 'Streets') {

            var streetsTemplate = new InfoTemplate("Street", "Street: ${STREET}");
            feature.setInfoTemplate(streetsTemplate);

            map.infoWindow.setFeatures([deferred]);
            map.infoWindow.show(event.mapPoint);
          }
          return feature;
        });
      });
    }

      var imageParameters = new ImageParameters();
      imageParameters.format = "jpeg"; //set the image type to PNG24, note default is PNG8.

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
                //collapsed: false, // whether this root layer should be collapsed initially, default false.
                //slider: true // whether to display a transparency slider.
              }]
            }, 'tocDiv');
            toc.startup();
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

       registry.byId("zoomin").on("click", function () {
         navToolbar.activate(Navigation.ZOOM_IN);
         $("#zoomin").css("background-image", "url('images/ZoomInSelect.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
         $("#pan").css("background-image", "url('images/Pan.png')");
       });

       registry.byId("zoomout").on("click", function () {
         navToolbar.activate(Navigation.ZOOM_OUT);
         $("#zoomout").css("background-image", "url('images/ZoomOutSelect.png')");
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#pan").css("background-image", "url('images/Pan.png')");
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
         $("#pan").css("background-image", "url('images/PanSelect.png')");
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
       });

       registry.byId("deactivate").on("click", function () {
         $("#zoomin").css("background-image", "url('images/ZoomIn.png')");
         $("#zoomout").css("background-image", "url('images/ZoomOut.png')");
         $("#pan").css("background-image", "url('images/Pan.png')");
         navToolbar.deactivate();
       });

       function extentHistoryChangeHandler () {
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
        enableHighlight: false,
        allPlaceholder: "Search All",
        zoomScale: 5000,
        showInfoWindowOnSelect: false
        //enableButtonMode: true
      },"featureSearch");
      searchItem.startup();

      searchItem.on("search-results", function(e) {
        if (searchItem.activeSource.name == "Hydrant ID Query") {
          console.log(searchItem.activeSource);
          //var x = dynamicMapServiceLayer.layerInfos
          //console.log(x);
          if (dynamicMapServiceLayer.layerInfos[3].visible == false) {
            var inputs = query(".agsjsTOCNode input[type='checkbox']");
            console.log(inputs);
            var visible = [3];
            for (var i = 1; i < inputs.length; i++) {
              if (inputs[i].checked) {
                visible.push(i - 1);
              }
            }
            console.log(visible);
            dynamicMapServiceLayer.setVisibleLayers(visible);
          }
        }
        else if (searchItem.activeSource.name == "City Grid Query") {
          console.log(searchItem.activeSource);
          //var x = dynamicMapServiceLayer.layerInfos
          //console.log(x);
          if (dynamicMapServiceLayer.layerInfos[12].visible == false) {
            var inputs = query(".agsjsTOCNode input[type='checkbox']");
            console.log(inputs);
            var visible = [12];
            for (var i = 1; i < inputs.length; i++) {
              if (inputs[i].checked) {
                visible.push(i - 1);
              }
            }
            console.log(visible);
            dynamicMapServiceLayer.setVisibleLayers(visible);
          }
        }
        else if (searchItem.activeSource.name == "FZD Query") {
          console.log(searchItem.activeSource);
          //var x = dynamicMapServiceLayer.layerInfos
          //console.log(x);
          if (dynamicMapServiceLayer.layerInfos[13].visible == false) {
            var inputs = query(".agsjsTOCNode input[type='checkbox']");
            console.log(inputs);
            var visible = [13];
            for (var i = 1; i < inputs.length; i++) {
              if (inputs[i].checked) {
                visible.push(i - 1);
              }
            }
            console.log(visible);
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
        url: "https://gisimages.greensboro-nc.gov/prod/rest/services/Geocoding/AllPoints/GeocodeServer",
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
          console.log(result);
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
       $(".drillStationResults").html("");
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
      url: "http://helen2:6080/arcgis/rest/services/Fire/FireExplorer_MS/MapServer/33/query?where=hydr_gpm>0 and hydr_id='" + hydrantID + "'&outFields=*&f=json",
      success: callback
    });
  }
});
