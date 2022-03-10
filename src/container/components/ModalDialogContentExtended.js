/**
 * The intent of this file is to group newer modals in a more logical manner (modals are components,
 * so they should have their own individual js files
 */

import React from 'react';

import GenericDeleteWarning from './modal/GenericDeleteWarning';
import OversightMetricGroupModal from './modal/OversightMetricGroupModal';
import DataReviewImportValidationModal from './modal/DataReviewImportValidationModal';
import DataReviewSetHistoryModal from'./modal/DataReviewSetHistoryModal';


export default {
  DeleteOversightMetricGroup: GenericDeleteWarning,
  DeleteOversightScorecardConfig: GenericDeleteWarning,
  OversightMetricGroupModal: OversightMetricGroupModal,
  DataReviewImportValidationModal: DataReviewImportValidationModal,
  DataReviewSetHistoryModal: DataReviewSetHistoryModal
};
