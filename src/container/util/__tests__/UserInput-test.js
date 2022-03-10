describe('UserInput', function() {

  var _ = require('underscore');
  var UserInput = require('../UserInput.js');

  // id:4812
  it('trims and collapses whitespace', function() {
    var testLongNames = [
      ['                  a ', 'a'],
      ['a       ', 'a'],
      ['a b c', 'a b c'],
      ['a         b', 'a b'],
      ['  abc       ', 'abc'],
      ['ab         c', 'ab c'],
      ['01 2  3   4    5     6', '01 2 3 4 5 6']
    ];
    _.each(testLongNames, function(longName) {
      expect(UserInput.trimAndCollapse(longName[0])).toBe(longName[1]);
    });
  });

  // id:5232
  // Acceptance Criteria:
  // Longnames should be able to support alphanumeric characters as well as
  // basic punctuation and mathematical characters (!.,*$%@&^;:" '+=-_()#).
  // Character limit should support 75 characters long (min number of characters = 1).
  it('catches illegal characters and formatting', function() {
    var testLongNames = [
      ['', null],
      ['   ', null],
      ['{', null],
      ['}', null],
      ['`', null],
      ['~', null],
      ['<', null],
      ['>', null],
      ['?', null],
      ['/', null],
      ['\\', null],
      ['|', null],
      ['[', null],
      [']', null],
      ['this long name is precisely 76 characters long and so should not be accepted', null],
      ['this long name is precisely 75 characters long and so should be accepted =)', 'this long name is precisely 75 characters long and so should be accepted =)'],
      ['this long name is precisely 74 characters long and so should be accepted =', 'this long name is precisely 74 characters long and so should be accepted ='],
      ['   this should be      accepted as it is under 75 characters with  spaces removed  ', 'this should be accepted as it is under 75 characters with spaces removed'],
      ['0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'],
      ['!.,*$%@&^;:" \'+=-_()#', '!.,*$%@&^;:" \'+=-_()#']
    ];
    _.each(testLongNames, function(longName) {
      expect(UserInput.sanitizeName(longName[0])).toBe(longName[1]);
    });
  });
});
