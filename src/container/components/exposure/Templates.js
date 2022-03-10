var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
var Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
var MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
var MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
var MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var BaseListViewMixin = require('./BaseListViewMixin');
var Checkbox = React.createFactory(require('../Checkbox'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var AccountUtil = require('../../util/AccountUtil');

var Table = React.createFactory(FixedDataTable.Table);

var div = DOM.div;
var span = DOM.span;

var Templates = createReactClass({
  displayName: 'Templates',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [BaseListViewMixin],

  componentDidMount: function() {
    ExposureActions.templatesFetch();
  },

  createHeaderContentHandler: function(colName) {
    return this.columnNameMap[colName];
  },

  getColumnWidths: function() {
    return BaseListViewMixin._getColumnWidths(
      this.props.immExposureStore.getIn(['templatesView', 'displayedColumns']),
      this.props.immExposureStore.get('templates', Imm.Map()),
      this.props.immExposureStore
    );
  },

  getHandleOpenAction: function(id) {
    return [RouteNameConstants.EXPOSURE_TEMPLATES_EDIT, {templateId: id}];
  },

  getHeader: function() {
    var immTemplates = this.props.immExposureStore.get('templates');
    return div({className: 'list-view-path'}, 'Template List (' + immTemplates.size + ')');
  },

  itemAccessor: function(immData, rowIndex) {
    return immData.get(immData.keySeq().get(rowIndex));
  },

  specialCellRenderer: function(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immExposureStore,
      this.props.immExposureStore.getIn(['templatesView', 'templateIds']),
      this.props.immExposureStore.getIn(['templatesView', 'checkedTemplateIds']),
      this.props.immExposureStore.get('templates', Imm.Map()),
      this.itemAccessor,
      ExposureActions.templatesViewSetCheckedTemplateIds,
      _.noop,
      this.getHandleOpenAction,
      _.noop,
      cellDataKey,
      rowIndex
    );
  },

  deleteTemplatesHandler: function() {
    var immCheckedTemplateIds = this.props.immExposureStore.getIn(['templatesView', 'checkedTemplateIds']);
    if (!immCheckedTemplateIds.isEmpty()) {
      ExposureActions.templatesDelete(immCheckedTemplateIds.toJS());
    } else {
      ExposureActions.displayActionCouldNotBeCompletedModal(FrontendConstants.PLEASE_SELECT_AT_LEAST_ONE_TEMPLATE_TO_DELETE);
    }
  },

  render: function() {
    var immExposureStore = this.props.immExposureStore;
    var immTemplates = immExposureStore.get('templates');
    var immTemplatesView = immExposureStore.get('templatesView');
    var isEmpty = immTemplates.isEmpty();

    if (immExposureStore.get('isLoadingTemplate')) {
      return div({className: 'spinner-container', key: 'loading'}, div({className: 'spinner'}));
    }

    var immColNames = immTemplatesView.get('displayedColumns').filter(function(isDisplayed) {
      return isDisplayed;
    }).keySeq();

    var immSortOrdering = this.createSortOrdering(immColNames, this.props.query);

    var tableArgs = this.constructTableArgs(
      immTemplates.size,
      immTemplatesView.get('displayedColumns'),
      Imm.Set([]),
      this.setColumnSort.bind(null, null, RouteNameConstants.EXPOSURE_TEMPLATES, null),
      immSortOrdering,
      this.specialCellRenderer,
      this.getColumnWidths,
      false,  // skipCheckBoxes.
      false  // skipOpen.
    );

    var header = this.getHeader();

    var listViewBar = div({className: 'list-view-bar'},
      isEmpty ? null : this.getCogColumnSelectDropdown(immTemplatesView.get('displayedColumns'), immColNames, ExposureActions.templatesViewSetColumnOption)
    );

    var content = isEmpty ?
      EmptyContentNotice({noticeText: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.TEMPLATES)}) :
      div({className: 'list-view-table templates-view-table'}, Table.apply(null, tableArgs));
    var showCreateTemplate = AccountUtil.hasPrivilege(immExposureStore, 'isCreateReportTemplate');

    var moreMenu = Menu({className: 'more-menu'},
      MenuTrigger({className: 'more-menu-trigger'}, div({className: 'react-menu-icon icon-menu2'}, 'More')),
      MenuOptions({className: 'more-menu-options'},
        MenuOption({className: 'more-menu-create-template',
            disabled: !showCreateTemplate,
            onSelect: () => this.context.router.push(RouteNameConstants.EXPOSURE_TEMPLATES_NEW)},
          div({className: 'react-menu-icon icon-plus-circle2 menu-item-create-template'}, 'Template')),
        MenuOption({className: 'more-menu-create-advanced-report',
            disabled: !showCreateTemplate,
            onSelect: () => this.context.router.push(RouteNameConstants.EXPOSURE_TEMPLATES_NEW_ADVANCED_REPORT)},
          div({className: 'react-menu-icon icon-plus-circle2 menu-item-create-advanced-report'}, FrontendConstants.ADVANCED_REPORT)),
        MenuOption({className: 'more-menu-delete',
            onSelect: this.deleteTemplatesHandler},
          div({className: 'react-menu-icon icon-remove menu-item-delete'}, FrontendConstants.DELETE))
      )
    );

    return div({className: 'list-view'},
      div({className: 'page-header'},
        header,
        div({className: 'header-buttons'}, moreMenu)
      ),
      listViewBar,
      content
    );
  }
});

module.exports = Templates;
