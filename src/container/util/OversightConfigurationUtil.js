import React from 'react';
class OversightConfigurationUtil {

    static sortMetrics(immMetrics) {
        return immMetrics.sort((a, b) => {
            let result = 0;

            const aId = a.get('id');
            const bId = b.get('id');

            //Configurations for both metrics exist
            if (aId && bId) {

                const aMetricSequence = a.get('metricSequence');
                const bMetricSequence = b.get('metricSequence');

                //Compare metricSequence if defined for both values
                if (aMetricSequence && bMetricSequence) {
                    return aMetricSequence - bMetricSequence;
                } else {
                    //If 'metricSequence' isn't defined for one of values
                    //value with 'metricSequence' is located above
                    if (aMetricSequence && !bMetricSequence) {
                        result = -1;
                    } else if (!aMetricSequence && bMetricSequence) {
                        result = 1;
                    } else {//If 'metricSequence' isn't defined for both of values compare titles

                        const aTitle = a.getIn(['displayAttributes', 'title'], '');
                        const bTitle = b.getIn(['displayAttributes', 'title'], '');

                        result = aTitle.localeCompare(bTitle);
                    }
                }

            } else {

                //If configuration isn't defined for one of values
                //value with configuration is located above
                if (aId && !bId) {
                    return -1;
                } else if (!aId && bId) {
                    return 1;
                } else {//If configuraton isn't defined for both of values compare by 'metricId'
                    const aMetricId = a.get('metricId');
                    const bMetricId = b.get('metricId');
                    if (aMetricId > bMetricId) {
                        result = 1;
                    } else if (aMetricId < bMetricId) {
                        result = -1;
                    }
                }

            }
            return result;
        });
    }
}

export default OversightConfigurationUtil;