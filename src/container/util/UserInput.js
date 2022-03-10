var UserInput = {
  // This function checks for illegal characters and formatting of
  // proposed longname edits.
  sanitizeName: function(input) {
    var trimmedAndCollapsed = this.trimAndCollapse(input);
    if (trimmedAndCollapsed.length < 1 ||
        trimmedAndCollapsed.length > 75 ||
        trimmedAndCollapsed.match(/[^A-Za-z0-9!.,*$%@&\^;:" '+=\-_()#]/)){
      return null;
    }
    return trimmedAndCollapsed;
  },

  // This trims preceding and trailing whitespace,
  // and collapses intermediate whitespace to one space.
  // Example: "  a b        c       " -> "a b c"
  // See ClinicalDbActor.scala for implementation when loading schemas in the backend.
  trimAndCollapse: function(input) {
    return input.trim().replace(/\s{2,}/g, ' ');
  }
};

module.exports = UserInput;
