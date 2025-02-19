import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Dropdown } from '../../components/atomic';
import { getStateNameFromAbbr } from '../../utilities/';
import { isWithinRadius } from '../../utilities';
import { NIH_ZIPCODE } from '../../constants';

const SitesList = sites => {
  const [locArray, setLocArray] = useState([]);
  const [countries, setCountries] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [filteredLocArray, setFilteredLocArray] = useState([]);
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [statesItems, setStatesItems] = useState([]);
  const [nearbySites, setNearbySites] = useState([]);
  const [filteredNearbySites, setFilteredNearbySites] = useState([]);
  const [showNearbySites, setShowNearbySites] = useState(false);

  const {
    location,
    zip,
    zipCoords,
    zipRadius,
    country,
    states,
    city,
    vaOnly,
  } = useSelector(store => store.form);

  const buildCountriesList = sitesArr => {
    if (sitesArr.length > 0) {
      let countriesList = [...new Set(sitesArr.map(item => item.country))];
      countriesList.sort((a, b) => (a > b ? 1 : -1));
      setCountries(countriesList);
    }
  };

  const buildUSStatesList = sitesArr => {
    if (sitesArr.length > 0) {
      // Get all the US sites
      const stateside = sitesArr.filter(item => item.country === 'United States');

      // Get a UNIQUE list of all the US state abbreviations in use.
      const statesAbbrs = [
        ...new Set(stateside.map(item => item.stateOrProvinceAbbreviation)),
      ];

      // Get the abbr/name combo for the states.
      // NOTE: getStateNameFromAbbr is called later in order to draw the states
      // dropdown. It may be beneficial to refactor this to always have the
      // abbr/name pair sorted in statesList.
      const stateNameAbbrObjs = statesAbbrs.map(s => ({
        abbr: s,
        name: getStateNameFromAbbr(s)
      }));

      // Get the sorted list of state abbreviations. NOTE: you
      // need the names in order to sort.
      const sortedStatesList = stateNameAbbrObjs
        .sort((a,b) => (a.name > b.name ? 1 : -1))
        .map(s => s.abbr);
      
      // Update the statesList state.
      setStatesList(sortedStatesList);
    }
  };

  // build list per city
  const buildCitiesArray = parentArray => {
    let ca = []; //cities array
    let citiesList = [...new Set(parentArray.map(item => item.city))];
    citiesList.sort((a, b) => (a > b ? 1 : -1));
    citiesList.forEach(cityName => {
      let citySites = parentArray.filter(item => item.city === cityName);
      let cityObj = {
        city: cityName,
        sites: citySites,
      };
      ca.push(cityObj);
    });
    return ca;
  };

  useEffect(() => {
    if (sites.sites.length > 0) {
      if (countries.length === 0) {
        buildCountriesList(sites.sites);
        buildUSStatesList(sites.sites);
      }
    }
  }, []);

  useEffect(() => {
    if (countries.length > 0) {
      constructFilterableArray(sites.sites, setLocArray, countries, true);
      buildNearbySites(sites.sites);
    }
  }, [countries]);

  useEffect(() => {
    setFilteredLocArray(locArray);
    handleFilterByCountry({target: {value: 'United States'}});
  }, [locArray]);

  useEffect(() => {
    if (nearbySites.length > 0) {
      let nearbyCountries = [...new Set(nearbySites.map(item => item.country))];
      nearbyCountries.sort((a, b) => (a > b ? 1 : -1));
      constructFilterableArray(
        nearbySites,
        setFilteredNearbySites,
        nearbyCountries
      );
      setShowNearbySites(true);
    }
  }, [nearbySites]);

  const handleToggleNearbySites = () => {
    setShowNearbySites(!showNearbySites);
  };

  //output location
  const constructFilterableArray = (
    parentArray,
    stateMethod,
    representedCountries = [],
    isAllSites = false
  ) => {
    let masterArray = [];
    representedCountries.forEach(countryName => {
      let c = { country: countryName };
      if (countryName === 'United States') {
        let usaSites = parentArray.filter(
          item => item.country === 'United States'
        );
        c.states = [];

        statesList.forEach(stateName => {
          let sitesByState = usaSites.filter(
            item => item.stateOrProvinceAbbreviation === stateName
          );
          let stateSitesList = buildCitiesArray(sitesByState);
          let s = {
            state: stateName,
            cities: stateSitesList,
          };
          c.states.push(s);
        });
        if (isAllSites) {
          setStatesItems(c.states);
        }
        masterArray.unshift(c);
      } else if (countryName === 'Canada') {
        //divvy up Canada into provinces
        let canadaSites = parentArray.filter(item => item.country === 'Canada');
        let pl = [
          ...new Set(canadaSites.map(item => item.stateOrProvinceAbbreviation)),
        ];
        pl.sort((a, b) => (a > b ? 1 : -1));
        c.provinces = [];

        pl.forEach(provinceName => {
          let sitesByProvince = canadaSites.filter(
            item => item.stateOrProvinceAbbreviation === provinceName
          );
          let provinceSitesList = buildCitiesArray(sitesByProvince);
          let s = {
            province: provinceName,
            cities: provinceSitesList,
          };
          c.provinces.push(s);
        });
        masterArray.push(c);
      } else {
        c.cities = buildCitiesArray(
          parentArray.filter(item => item.country === countryName)
        );
        masterArray.push(c);
      }
      stateMethod(masterArray);
    });
  };

  const buildNearbySites = siteArr => {

    // We only build nearby sites IF there
    // was a location search we can filter on.
    if (
      (location === 'search-location-hospital') ||
      (location === 'search-location-all' && !vaOnly)
    ) {
      return;
    }

    // Pre-filter sites when vaOnly is set.
    const preFilteredSites = vaOnly ?
      siteArr.filter(site => site.isVA) :
      siteArr;

    if (location === 'search-location-zip') {
      // Assume that zip is valid if location is set to zip.
      // Otherwise you should be looking at an error message instead.
      setNearbySites(
        preFilteredSites.filter(site =>
          isWithinRadius(zipCoords, site.coordinates, zipRadius)
        )
      );
    } else if (location === 'search-location-country') {
      if (country === 'United States') {
        if (states.length > 0) {
          let nearbyStates = [...new Set(states.map(item => item.abbr))];

          if (city !== '') {
            setNearbySites(
              preFilteredSites.filter(
                site =>
                  nearbyStates.includes(site.stateOrProvinceAbbreviation) &&
                  site.city === city
              )
            );
          } else {
            setNearbySites(
              preFilteredSites.filter(site =>
                nearbyStates.includes(site.stateOrProvinceAbbreviation)
              )
            );
          }
        } else {
          if (city !== '') {
            setNearbySites(
              preFilteredSites.filter(
                site => site.country === country && site.city === city
              )
            );
          } else {
            // just looking for US sites
            setNearbySites(preFilteredSites.filter(site => site.country === country));
          }
        }
      } else {
        if (city !== '') {
          setNearbySites(
            preFilteredSites.filter(
              site => site.country === country && site.city === city
            )
          );
        } else {
          setNearbySites(preFilteredSites.filter(site => site.country === country));
        }
      }
    } else if (location === 'search-location-nih') {
      setNearbySites(
        preFilteredSites.filter(site => site.postalCode === NIH_ZIPCODE)
      );
    } else {
      // All search + vaOnly
      setNearbySites(
        preFilteredSites
      );
    }
  };

  const renderContactInfoBlock = (locationObj) => {
    return (
      <>
        <div>Contact: {locationObj.contactName}</div>
        {locationObj.contactPhone && (
          <div>Phone: {locationObj.contactPhone}</div>
        )}
        {locationObj.contactEmail && (
          <div>
            Email:{' '}
            <a href={`mailto:${locationObj.contactEmail}`}>
              {locationObj.contactEmail}
            </a>
          </div>
        )}
      </>
    );
  }

  const renderLocationBlock = (locationObj, index) => {
    return (
      <div key={'loc-' + locationObj.name} className="location">
        <strong className="location-name">{locationObj.name}</strong>
        <div>
          Status: {getTrialStatusForDisplay(locationObj.recruitmentStatus)}
        </div>
        {/* Contact only displays if there is a name */}
        {locationObj.contactName ?
          renderContactInfoBlock(locationObj) : 
          (<>Name Not Available</>) 
        }   
      </div>
    );
  };

  const handleFilterByCountry = e => {
    let filtered = [];
    if (e.target.value === 'other') {
      filtered = locArray.filter(
        item => item.country !== 'United States' && item.country !== 'Canada'
      );
    } else {
      filtered = locArray.filter(item => item.country === e.target.value);
    }
    setSelectedCountry(e.target.value);
    if (e.target.value !== 'United States') {
      setSelectedState('all');
    }
    setFilteredLocArray(filtered);
  };

  const handleFilterByState = e => {
    // the filtered array is already USA only
    let filtered = [];
    const targetVal = e.target.value;
    if (targetVal !== '' && targetVal !== 'all') {
      filtered = statesItems.filter(item => item.state === targetVal);
    } else {
      filtered = locArray;
    }
    setSelectedState(targetVal);
    setFilteredLocArray(filtered);
  };

  const renderFilterDropdowns = () => {
    const otherCountries = countries.filter(
      country => country !== 'United States' && country !== 'Canada'
    );

    const mapStateOptions = () =>
      statesList.map((stateAbbr, idx) => (
        <option key={'state-' + idx} value={stateAbbr}>
          {getStateNameFromAbbr(stateAbbr)}
        </option>
      ));

    return countries.length > 1 || statesList.length > 1 ? (
      <>
        {!showNearbySites && (
          <>
            {countries.length > 1 && (
              <Dropdown
                label="Country:"
                action={handleFilterByCountry}
                value={selectedCountry}
              >
                {countries.includes('United States') && (
                  <option value="United States">U.S.A.</option>
                )}
                {countries.includes('Canada') && (
                  <option value="Canada">Canada</option>
                )}
                {otherCountries.length > 0 && (
                  <option value="other">Other</option>
                )}
              </Dropdown>
            )}
            {statesList.length > 1 && selectedCountry === 'United States' && (
              <Dropdown
                label="State:"
                action={handleFilterByState}
                value={selectedState}
              >
                <option value="all">All</option>
                {mapStateOptions()}
              </Dropdown>
            )}
          </>
        )}
        {nearbySites.length > 0 && (
          <button className="btnAsLink" onClick={handleToggleNearbySites}>
            {showNearbySites ? 'Show all locations' : 'Show locations near me'}
          </button>
        )}
      </>
    ) : (
      <></>
    );
  };

  const renderSitesByCity = citiesArray => {
    return citiesArray.map((city, idx) => {
      return (
        <div className="location-city" key={'city' + idx}>
          <h5>{city.city}</h5>
          {city.sites.map(site => {
            return renderLocationBlock(site, idx);
          })}
        </div>
      );
    });
  };

  const renderStateSites = stateArr => {
    return (
      <>
        {stateArr.cities.length > 0 && (
          <div className="location-state">
            <h4>{getStateNameFromAbbr(stateArr.state)}</h4>
            {renderSitesByCity(stateArr.cities)}
          </div>
        )}
      </>
    );
  };

  //render North American Sites
  const renderNASites = sitesArr => {
    return (
      <>
        <h3>{sitesArr.country}</h3>
        {sitesArr.country === 'United States'
          ? sitesArr.states.map((siteState, idx) => {
              return (
                <React.Fragment key={'state-' + idx}>
                  {renderStateSites(siteState)}
                </React.Fragment>
              );
            })
          : sitesArr.provinces.map((site, idx) => (
              <div className="location-province" key={'province-' + idx}>
                <h4>{site.province}</h4>
                {renderSitesByCity(site.cities)}
              </div>
            ))}
      </>
    );
  };

  const getTrialStatusForDisplay = statusKey => {
    const statuses = {
      ACTIVE: 'Active',
      CLOSED_TO_ACCRUAL: 'Closed to accrual',
      TEMPORARILY_CLOSED_TO_ACCRUAL: 'Temporarily closed to accrual',
    };
    return statuses[statusKey];
  };

  const generateListDisplay = displayList => {
    return displayList.map((c, idx) => {
      return c.country === 'United States' || c.country === 'Canada' ? (
        <React.Fragment key={'country' + idx}>
          {renderNASites(c)}
        </React.Fragment>
      ) : c.state ? (
        renderStateSites(c)
      ) : (
        <div className="location-country" key={'country' + idx}>
          <h3>{c.country}</h3>
          {renderSitesByCity(c.cities)}
        </div>
      );
    });
  };

  const renderSites = () => {
    return (
      <div
        className="sites-all"
        style={{ display: showNearbySites ? 'none' : 'block' }}
      >
        {generateListDisplay(filteredLocArray)}
      </div>
    );
  };

  const renderNearbySites = () => {
    return (
      <div
        className="sites-nearby"
        style={{ display: showNearbySites ? 'block' : 'none' }}
      >
        <p>Locations matching your search criteria</p>
        {generateListDisplay(filteredNearbySites)}
      </div>
    );
  };

  return (
    <>
      {renderFilterDropdowns()}
      {renderNearbySites()}
      {renderSites()}
    </>
  );
};

export default SitesList;
