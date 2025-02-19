import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import Fieldset from '../../atomic/Fieldset';
import { Autocomplete } from '../../atomic';
import { searchLeadOrg } from '../../../store/actions';
import { matchItemToTerm, sortItems } from '../../../utilities';

const LeadOrganization = ({ handleUpdate }) => {
  const dispatch = useDispatch();
  const { leadOrg } = useSelector(store => store.form);
  const { leadorgs = [] } = useSelector(store => store.cache);
  
  const [orgName, setOrgName] = useState({ value: leadOrg.term });

  useEffect(() => {
    if (orgName.value.length > 2) {
      dispatch(searchLeadOrg({ searchText: orgName.value }));
    }
  }, [orgName, dispatch]);


  return (
    <Fieldset
      id="lead_organization"
      legend="Lead Organization"
      helpUrl="/about-cancer/treatment/clinical-trials/search/help#leadorganization"
    >
      <Autocomplete
        label="Lead organization"
        labelHidden
        inputHelpText="Search by lead organization."
        value={orgName.value}
        inputProps={{ id: 'lo', placeholder: 'Organization name' }}
        wrapperStyle={{ position: 'relative', display: 'inline-block' }}
        items={leadorgs}
        getItemValue={item => item.term}
        shouldItemRender={matchItemToTerm}
        sortItems={sortItems}
        onChange={(event, value) => setOrgName({ value })}
        onSelect={(value, item) => { 
          handleUpdate('leadOrg', item);
          setOrgName({value: item.term});
         }}
        renderMenu={children => (
          <div className="cts-autocomplete__menu --leadOrg">
            {(orgName.value.length > 2 )
                ? (leadorgs.length)
                    ? (children)
                    : <div className="cts-autocomplete__menu-item">No results found</div>
                : <div className="cts-autocomplete__menu-item">Please enter 3 or more characters</div>
            }
          </div>
        )}
        renderItem={(item, isHighlighted) => (
          <div
            className={`cts-autocomplete__menu-item ${
              isHighlighted ? 'highlighted' : ''
            }`}
            key={item.termKey}
          >
            {item.term}
          </div>
        )}
      />
    </Fieldset>
  );
};

LeadOrganization.propTypes = {
  handleUpdate: PropTypes.func,
};

export default LeadOrganization;
