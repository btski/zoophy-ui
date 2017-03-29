'use strict';

angular.module('ZooPhy').controller('searchController', function ($scope, $http, RecordData) {

  $scope.allowed_values = null;

  $scope.virus = 197911;
  $scope.host = 1;
  $scope.avianHost = 8782;

  $scope.reset = function() {
    $scope.virus = $scope.allowed_values.viruses[0].tax_id;
    $scope.host = $scope.allowed_values.hosts[0].tax_id;
    $scope.avianHost = $scope.allowed_values.avian_hosts[0].tax_id;
    $scope.genes = $scope.allowed_values.viruses[0].genes;

    $scope.from = 0;
    $scope.to = Number(new Date().getFullYear());
    $scope.minimumSequenceLength = 0;

    setTimeout(resetSelects, 10);
  };

  function resetSelects() {
    console.log('resetting')
    $('.selectpicker').selectpicker('render');
  }

  $scope.genes = [];
  const allGenes = "All";
  const completeGenes = "Complete";
  $scope.countries = [];
  $scope.regions = [];

  $scope.selectedGenes = [];
  $scope.selectedCountries = [];
  $scope.selectedRegions = [];

  $scope.from = 0;
  $scope.to = Number(new Date().getFullYear());
  $scope.minimumSequenceLength = 0;

  $scope.countryHasRegions = false;

  $scope.showDetails = false;
  $scope.selectedRecord = null;
  $scope.searchError = null;

  $scope.updateGenes = function() {
    let virusIndex = $('#virus')[0].selectedIndex;
    $scope.genes = $scope.allowed_values.viruses[virusIndex].genes;
  };

  function setCountries(countryList) {
    countryList.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    let allCountry = {
      name: 'All',
      geoname_id: Number($('#continent').val())
    };
    countryList.splice(0, 0, allCountry);
    $scope.countries = countryList.slice();
    $scope.selectedCountries = [$scope.countries[0]];
  };

  function setRegions(countryList) {
    $scope.regions = [];
    let tempRegions = [];
    for (let i = 0; i < countryList.length; i++) {
      tempRegions = [];
      if (countryList[i].regions) {
        tempRegions = countryList[i].regions.slice();
        tempRegions.sort(function(a, b) {
          return a.name.localeCompare(b.name);
        });
        let allRegion = {
          name: 'All '+countryList[i].name,
          geoname_id: Number(countryList[i].geoname_id)
        };
        tempRegions.splice(0, 0, allRegion);
        $scope.regions = $scope.regions.concat(tempRegions);
      }
    }
    if ($scope.regions.length > 0) {
      $scope.selectedRegions = [$scope.regions[0]];
      $scope.countryHasRegions = true;
    }
    else {
      $scope.selectedRegions = [];
      $scope.countryHasRegions = false;
    }
  }

  $scope.$watch('selectedCountries', function (newVal, oldVal) {
    let wasChanged = false;
    if (newVal.length === oldVal.length) {
      let tempNew = newVal.slice();
      tempNew.sort(function(a, b) {
        return a.name.localeCompare(b.name);
      });
      let tempOld = oldVal.slice();
      tempOld.sort(function(a, b) {
        return a.name.localeCompare(b.name);
      });
      for (let i = 0; i < newVal.length; i++) {
        if (Number(newVal[i].geoname_id) != Number(oldVal[i].geoname_id)) {
          wasChanged = true;
          i = newVal.length;
        }
      }
    }
    else {
      wasChanged = true;
    }
    if (wasChanged) {
      setRegions(newVal);
    }
  });

  $http.get(SERVER_URI+'/allowed').then(function(response) {
    if (response.status === 200) {
      $scope.allowed_values = response.data;
      $("#host").removeClass('hidden');
      $('#avian-host-container').removeClass('hidden');
      $('#regions-container').removeClass('hidden');
      $scope.virus = $scope.allowed_values.viruses[0].tax_id;
      $scope.genes = $scope.allowed_values.viruses[0].genes;
      let tempCountries = [];
      for (let i = 0; i < $scope.allowed_values.continents.length; i++) {
        tempCountries = tempCountries.concat($scope.allowed_values.continents[i].countries);
      }
      setCountries(tempCountries.slice());
    }
    else {
      console.log('Could not load necessary values: ', response.data.error);
    }
  });

  $scope.search = function() {
    let virus = Number($scope.virus);
    let host = Number($scope.host);
    if (host === 8782) {
      host = Number($scope.avianHost);
    }
    let query = 'TaxonID:'+virus+' AND HostID:'+host;
    let genes = $scope.selectedGenes;
    console.log(genes);
    if (genes.length > 0) {
      let geneString = ' AND Gene:('+genes[0];
      for (let i = 1; i < genes.length; i++) {
        geneString += ' OR '+genes[i];
      }
      if (genes.indexOf(completeGenes) === -1) {
        geneString += ' NOT Complete';
      }
      geneString += ')';
      query += geneString;
    }

    let continent = Number($("#continent").val());

    if ($scope.minimumSequenceLength > 0) {
      let minLength = $scope.minimumSequenceLength+'';
      while (minLength.length < 5) {
        minLength = '0'+minLength;
      }
      query += ' AND SegmentLength:['+minLength+' TO 99999]';
    }
    if ($scope.from > 0) {
      let fromYear = $scope.from+'';
      let toYear = '';
      while (fromYear.length < 4) {
        fromYear = '0'+fromYear;
      }
      if ($scope.to > $scope.from) {
        toYear = $scope.to + '';
        while (toYear.length < 4) {
          toYear = '0'+toYear;
        }
      }
      else {
        $scope.to = Number(new Date().getFullYear());
        toYear = $scope.to + '';
      }
      query += ' AND Date:['+fromYear+' TO '+toYear+'1231]';
    }
    else if ($scope.to > 0) {
      let toYear = $scope.to + '';
      while (toYear.length < 4) {
        toYear = '0'+toYear;
      }
      query += ' AND Date:[0000 TO '+toYear+'1231]';
    }
    console.log(query);
    query = encodeURIComponent(query.trim());
    $http.get(SERVER_URI+'/search?query='+query).then(function(response) {
      if (response.status === 200) {
        let searchResults = response.data.records;
        console.log('search call finished with '+searchResults.length+' results.')
        if (searchResults.length > 0) {
          RecordData.setRecords(searchResults);
          $scope.$parent.switchTabs('results');
        }
        else {
          $scope.searchError = 'Search returned 0 results';
        }
      }
      else {
        console.log('Could not load necessary values: ', response.data.error);
        $scope.searchError = 'Search Failed on Server. Please refresh and try again.';
      }
    });
    $(window).scroll(function() {
      $("#detail-panel").stop().animate({"marginTop": ($(window).scrollTop()) + "px"}, "fast", "swing");
    });
    RecordData.setNumSelected(0);
    RecordData.incrementSearchCount();
  };

});

/*
Copyright 2017 ASU Biodesign Center for Environmental Security's ZooPhy Lab

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
