/**
 * Util module for Highcharts.
 * Contains color palette definitions.
 *
 * Note: This is ported from `cqs-reports/src/constants/ReportConstants.js`.
 */
const HighchartsUtil = {
// Sequential chart color scheme.
  sequentialSchemeColors: {
    s1: '#00517d',
    s2: '#0073ae',
    s3: '#0089cf',
    s4: '#009edb',
    s5: '#6bb0e1',
    s6: '#a1c1e6',
    s7: '#ccd4ec',
    s8: '#e8e7f4',
    s9: '#fff7fb'
  },

  // Diverging chart color scheme.
  divergingSchemeColors: {
    d1: '#3c5daa',
    d2: '#3989c9',
    d3: '#69b3e3',
    d4: '#a4d7f4',
    d5: '#dcf2fd',
    d6: '#fffbcc',
    d7: '#ffdfa4',
    d8: '#fbb87d',
    d9: '#ed8863',
    d10: '#d3584a',
    d11: '#c00719'
  },

  // Qualitative chart color scheme.
  qualitativeSchemeColors: {
    q1: '#c5e099',
    q2: '#34996a',
    q3: '#8fd6d8',
    q4: '#3da3cc',
    q5: '#2c5fa7',
    q6: '#501c75',
    q7: '#840e70',
    q8: '#e56427',
    q9: '#faa930',
    q10: '#bc9f7d',
    q11: '#959b68',
    q12: '#1f543a',
    q13: '#577f7f',
    q14: '#20446b',
    q15: '#28687c',
    q16: '#160a23',
    q17: '#440b43',
    q18: '#a54721',
    q19: '#a36d24',
    q20: '#6d5b4a'
  },

  // Returns { category -> color }.
  getColorMapByCategories: (categories) => {
    const [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20] =
      [qualitativeSchemeColors.q1, qualitativeSchemeColors.q2, qualitativeSchemeColors.q3, qualitativeSchemeColors.q4,
       qualitativeSchemeColors.q5, qualitativeSchemeColors.q6, qualitativeSchemeColors.q7, qualitativeSchemeColors.q8,
       qualitativeSchemeColors.q9, qualitativeSchemeColors.q10, qualitativeSchemeColors.q11, qualitativeSchemeColors.q12,
       qualitativeSchemeColors.q13, qualitativeSchemeColors.q14, qualitativeSchemeColors.q15, qualitativeSchemeColors.q16,
      qualitativeSchemeColors.q17, qualitativeSchemeColors.q18, qualitativeSchemeColors.q19, qualitativeSchemeColors.q20];
    const qualitativeSchemeOrder = [
      [q5],
      [q5, q3],
      [q6, q3, q5],
      [q6, q3, q5, q1],
      [q6, q3, q5, q1, q9],
      [q6, q3, q5, q1, q4, q9],
      [q6, q3, q5, q1, q4, q7, q9],
      [q6, q3, q5, q1, q4, q9, q7, q8],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q15],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q15, q13],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15, q11],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15, q11, q19],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15, q11, q14, q19],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15, q11, q15, q17, q19],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15, q11, q14, q19, q17, q18],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15, q11, q12, q14, q19, q17, q18],
      [q6, q3, q5, q1, q2, q4, q9, q7, q8, q10, q16, q13, q15, q11, q12, q14, q19, q17, q18, q20]
    ];

    // If there are more than 20 categories/series, we are re-using the colors again.
    let colorScheme = qualitativeSchemeOrder[Math.min(_.size(categories), _.size(qualitativeSchemeOrder)) - 1];
    while (_.size(colorScheme) < _.size(categories)) {
      colorScheme = colorScheme.concat(colorScheme);
    }
    const colors = _.first(colorScheme, _.size(categories));

    return _.chain(categories)
      .zip(colors)
      .object()
      .value();
  }
};

module.exports = HighchartsUtil;
