describe('significantNumber', function() {

    let _ = require('underscore');
    let Util = require('../util.js');

    it('checks how the conversion happens', function() {
        let testElements =         [
            [ null, 2, ''],
            [ undefined, 2, ''],
            [0.01235, null, 0.0124],
            [0.01235, undefined, 0.0124],
            [0, 2, 0],
            [7.1e-05, 2, 0.000071],
            [0.001, 0, 0],
            [.56 * 100, 2, 56],
            [.56, 2, 0.56],
            [-1.01, 2, -1.01],
            [-1.001, 2, -1],
            [1.01, 2, 1.01],
            [1.001, 2, 1],
            [1.999, 2, 2],
            [-1.999, 2, -2],
            [0.999, 2, 1],
            [-0.999, 2, -1],
            [1.15, 2, 1.15],
            [1.156, 2, 1.16],
            [.00056, 2, 0.00056],
            [-.00056, 2, -0.00056],
            [-.000567, 2, -0.00057],
            [.00056, 4, 0.00056],
            [.000567, 2, 0.00057],
            [.000567, 2, 0.00057],
            [-.000567, 2, -0.00057],
            [20, 2, 20],
            [.56 * 100, 1, 56]
        ];
        _.each(testElements, function(testEl) {
            expect(Util.numberSignificant(testEl[0], testEl[1])).toBe(testEl[2]);
        });
    });

});
