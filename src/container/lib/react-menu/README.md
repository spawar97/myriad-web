# react-menu

An accessible menu component built for React.JS

See example at [http://instructure-react.github.io/react-menu/](http://instructure-react.github.io/react-menu/)

## Basic Usage

```html
/** @jsx React.DOM */

var react = require('react');

var Menu = require('react-menu');
var MenuTrigger = Menu.MenuTrigger;
var MenuOptions = Menu.MenuOptions;
var MenuOption = Menu.MenuOption;

var App = React.createClass({

  render: function() {
    return (
      <Menu className='myMenu'>
        <MenuTrigger>
          ⚙
        </MenuTrigger>
        <MenuOptions>

          <MenuOption>
            1st Option
          </MenuOption>

          <MenuOption onSelect={this.someHandler}>
            2nd Option
          </MenuOption>

          <div className='a-non-interactive-menu-item'>
            non-selectable item
          </div>

          <MenuOption disabled={true} onDisabledSelect={this.otherHanlder}>
            diabled option
          </MenuOption>

        </MenuOptions>
      </Menu>
    );
  }
});

React.renderComponent(<App />, document.body);

```

For a working example see the `examples/basic` example

## Styles

Bring in default styles by calling `injectCSS` on the `Menu` component.

```javascript
var Menu = require('react-menu');

Menu.injectCSS();
```

Default styles will be added to the top of the head, and thus any styles you
write will override any of the defaults.

The following class names are used / available for modification in your own stylsheets:

```
.Menu
.Menu__MenuTrigger
.Menu__MenuOptions
.Menu__MenuOption
.Menu__MenuOptions--vertical-bottom
.Menu__MenuOptions--vertical-top
.Menu__MenuOptions--horizontal-right
.Menu__MenuOptions--horizontal-left
```

The last four class names control the placement of menu options when the menu
would otherwise bleed off the screen. See `/lib/helpers/injectCSS.js` for
defaults. The `.Menu__MenuOptions` element will always have a vertical and
horizontal modifier.

## Notes

* Version:
 * 0.0.7
 * https://github.com/instructure-react/react-menu/commit/82ea154ff2bee3a44316b913239e1dabb1185814
* Custom changes:
 * We ignore `index.js` and `helpers/injectCSS.js`.
 * Diff of the applied changes is below:
 
```javascript
diff --git a/cbt/darkroom/assets/javascripts/lib/react-menu/components/Menu.js b/cbt/darkroom/assets/javascripts/lib/react-menu/components/Menu.js
index ee29c59..6cff7e2 100755
--- a/cbt/darkroom/assets/javascripts/lib/react-menu/components/Menu.js
+++ b/cbt/darkroom/assets/javascripts/lib/react-menu/components/Menu.js
@@ -2,22 +2,17 @@
 
 var React = require('react');
 
-var cloneWithProps = require('react/lib/cloneWithProps');
+var cloneWithProps = React.addons.cloneWithProps;
 var MenuTrigger = require('./MenuTrigger');
 var MenuOptions = require('./MenuOptions');
 var MenuOption = require('./MenuOption');
 var uuid = require('../helpers/uuid');
-var injectCSS = require('../helpers/injectCSS');
 var buildClassName = require('../mixins/buildClassName');
 
 var Menu = module.exports = React.createClass({
 
   displayName: 'Menu',
 
-  statics: {
-    injectCSS: injectCSS
-  },
-
   mixins: [buildClassName],
 
   childContextTypes: {
@@ -105,7 +100,7 @@ var Menu = module.exports = React.createClass({
     var trigger;
     if(this.verifyTwoChildren()) {
       React.Children.forEach(this.props.children, function(child){
-        if (child.type === MenuTrigger.type) {
+        if (child.type === MenuTrigger) {
           trigger = cloneWithProps(child, {
             ref: 'trigger',
             onToggleActive: this.handleTriggerToggle
@@ -120,7 +115,7 @@ var Menu = module.exports = React.createClass({
     var options;
     if(this.verifyTwoChildren()) {
       React.Children.forEach(this.props.children, function(child){
-        if (child.type === MenuOptions.type) {
+        if (child.type === MenuOptions) {
           options = cloneWithProps(child, {
             ref: 'options',
             horizontalPlacement: this.state.horizontalPlacement,
diff --git a/cbt/darkroom/assets/javascripts/lib/react-menu/components/MenuOptions.js b/cbt/darkroom/assets/javascripts/lib/react-menu/components/MenuOptions.js
index e440b56..048159f 100755
--- a/cbt/darkroom/assets/javascripts/lib/react-menu/components/MenuOptions.js
+++ b/cbt/darkroom/assets/javascripts/lib/react-menu/components/MenuOptions.js
@@ -2,7 +2,7 @@
 
 var React = require('react');
 var MenuOption = require('./MenuOption');
-var cloneWithProps = require('react/lib/cloneWithProps')
+var cloneWithProps = React.addons.cloneWithProps;
 var buildClassName = require('../mixins/buildClassName');
 
 var MenuOptions = module.exports = React.createClass({
@@ -68,7 +68,7 @@ var MenuOptions = module.exports = React.createClass({
     var index = 0;
     return React.Children.map(this.props.children, function(c){
       var clonedOption = c;
-      if (c.type === MenuOption.type) {
+      if (c.type === MenuOption) {
         var active = this.state.activeIndex === index;
         clonedOption = cloneWithProps(c, {
           active: active,
diff --git a/cbt/darkroom/assets/javascripts/lib/react-menu/helpers/injectCSS.js b/cbt/darkroom/assets/javascripts/lib/react-menu/helpers/injectCSS.js
deleted file mode 100755
index 9a50be2..0000000
--- a/cbt/darkroom/assets/javascripts/lib/react-menu/helpers/injectCSS.js
+++ /dev/null
@@ -1,47 +0,0 @@
-var jss = require('js-stylesheet');
-
-module.exports = function() {
-  jss({
-    '.Menu': {
-      position: 'relative'
-    },
-    '.Menu__MenuOptions': {
-      border: '1px solid #ccc',
-      'border-radius': '3px',
-      background: '#FFF',
-      position: 'absolute'
-    },
-    '.Menu__MenuOption': {
-      padding: '5px',
-      'border-radius': '2px',
-      outline: 'none',
-      cursor: 'pointer'
-    },
-    '.Menu__MenuOption--disabled': {
-      'background-color': '#eee',
-    },
-    '.Menu__MenuOption--active': {
-      'background-color': '#0aafff',
-    },
-    '.Menu__MenuOption--active.Menu__MenuOption--disabled': {
-      'background-color': '#ccc'
-    },
-    '.Menu__MenuTrigger': {
-      border: '1px solid #ccc',
-      'border-radius': '3px',
-      padding: '5px',
-      background: '#FFF'
-    },
-    '.Menu__MenuOptions--horizontal-left': {
-      right: '0px'
-    },
-    '.Menu__MenuOptions--horizontal-right': {
-      left: '0px'
-    },
-    '.Menu__MenuOptions--vertical-top': {
-      bottom: '45px'
-    },
-    '.Menu__MenuOptions--vertical-bottom': {
-    }
-  });
-};
diff --git a/cbt/darkroom/assets/javascripts/lib/react-menu/index.js b/cbt/darkroom/assets/javascripts/lib/react-menu/index.js
deleted file mode 100755
index 090e3ea..0000000
--- a/cbt/darkroom/assets/javascripts/lib/react-menu/index.js
+++ /dev/null
@@ -1,6 +0,0 @@
-var Menu = require('./components/Menu');
-Menu.MenuTrigger = require('./components/MenuTrigger');
-Menu.MenuOptions = require('./components/MenuOptions');
-Menu.MenuOption = require('./components/MenuOption');
-
-module.exports = Menu;
diff --git a/cbt/darkroom/assets/javascripts/lib/react-menu/mixins/buildClassName.js b/cbt/darkroom/assets/javascripts/lib/react-menu/mixins/buildClassName.js
index f117033..1067ff5 100755
--- a/cbt/darkroom/assets/javascripts/lib/react-menu/mixins/buildClassName.js
+++ b/cbt/darkroom/assets/javascripts/lib/react-menu/mixins/buildClassName.js
@@ -6,5 +6,5 @@ module.exports = {
       name += ' ' + this.props.className;
     }
     return name;
-  },
+  }
 };
```
