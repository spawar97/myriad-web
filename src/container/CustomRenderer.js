import React from 'react';
import { render } from 'react-dom';
import { ReactGrid, WidgetContextFilter , ReactDataGrid, InfoWidgets, CMInfoCards, AdverseEventInfoWidgets, HierarchyTable, LabSummary, LabFilters } from './NavigationMapping';

const components = {
  ReactGrid,
  WidgetContextFilter,
  ReactDataGrid,
  InfoWidgets,
  AdverseEventInfoWidgets,
  CMInfoCards,
  HierarchyTable,
  LabSummary,
  LabFilters
};

let exposureStore = {};

export const getExposureStore = (store) =>{
  if(store)
  exposureStore = store;
  else 
  return exposureStore;
}

const CustomRenderer = (props) => {

  let { id, componentName } = props;
  
  // Correct! JSX type can be a capitalized variable.
  const SelectedComponent = components[componentName];
  
  if (document.getElementById(id)) {
    return render(
      <SelectedComponent {...props} exposureStore = {exposureStore} />,
      document.getElementById(id));
  }

}
export default CustomRenderer;
