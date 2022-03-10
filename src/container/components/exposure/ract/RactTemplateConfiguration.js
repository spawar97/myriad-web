import React, {useEffect, useState} from "react";
import 'datatables/media/js/jquery.dataTables.min';
import 'datatables/media/css/jquery.dataTables.css';
import cx from "classnames";
import FrontendConstants from "../../../constants/FrontendConstants";
import {TouchDiv} from "../../TouchComponents";
import RouteNameConstants from "../../../constants/RouteNameConstants";
import RactScorecardStore from "../../../stores/RactScorecardStore";
import DeleteRactConfirmationDialog from "./DeleteRactConfirmationDialog";
import ExposureActions from "../../../actions/ExposureActions";
import Util from "../../../util/util";
import {RactStoreKeys} from "../../../constants/RactConstant";
import StatusMessageTypeConstants from "../../../constants/StatusMessageTypeConstants";

const RactTemplateConfiguration = (props) => {
  const [templates, setTemplates] = useState([]);
  const [displayConfirmationBox, setDisplayConfirmationBox] = useState(false);
  const [selectedTemplateID, setSelectedTemplateID] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  useEffect(() => {
    getData();
    const ractConsoleRequestBody = {"studyIds": []};
    RactScorecardStore.fetchRactConsoleData(ractConsoleRequestBody);
  }, []);

  const getData = async () => {
    await RactScorecardStore.fetchRactTemplates().then(async (data) => {
      setTemplates(data);
      $('#ractTemplateTable').DataTable({
        paging: false,
        bFilter: true,
        bInfo: false,
        "processing": true,
        "columnDefs": [
          {"targets": [0, 1, 4]},
          {"targets": [2, 3, 5], "searchable": false, "sortable": false},
        ]
      })
    }).catch(error => {
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  }

  const viewRactTemplate = (id) => {
    props.router.push({
      name: RouteNameConstants.EXPOSURE_VIEW_RACT_TEMPLATE,
      params: {ractTemplateId: id},
      state: {
        ractTemplateId: id,
        isView: true,
      },
    });
  };
  const duplicateRactTemplate = (id) => {
    props.router.push({
      name: RouteNameConstants.EXPOSURE_DUPLICATE_RACT_TEMPLATE,
      params: {ractTemplateId: id},
      state: {
        ractTemplateId: id,
      },
    });
  };
  const editRactTemplate = (id) => {
    props.router.push({
      name: RouteNameConstants.EXPOSURE_EDIT_RACT_TEMPLATE,
      params: {ractTemplateId: id},
      state: {
        ractTemplateId: id,
      },
    });
  };
  const deleteRactTemplateConfirmation = (id, templateName) => {
    var studiesAssignMap = new Map();
    const immRactStore = RactScorecardStore.getStore();
    const consoleData = immRactStore.get(RactStoreKeys.RACT_CONSOLE_DATA).toJS();
    if (consoleData) {
      const studies = Object.keys(consoleData)
      for (var study of studies) {
        let ractTemplateId = consoleData[study].ractInfo.ractTemplateId;
        setValue(studiesAssignMap, ractTemplateId, study);
      }
    }
    var deleteTextMsg = FrontendConstants.RACT_TEMPLATES_DELETE_MSG(templateName, studiesAssignMap.get(id));
    setDeleteMsg(deleteTextMsg);
    setSelectedTemplateID(id);
    setDisplayConfirmationBox(true);
  };

  function setValue(map, key, value) {
    if (!map.has(key)) {
      map.set(key, new Array(value));
      return;
    }
    map.get(key).push(value);
  }

  const deleteRactTemplate = async () => {
    await RactScorecardStore.deleteRactTemplates(selectedTemplateID).then(async (data) => {
      setDisplayConfirmationBox(false);
      let tempId = '#temp' + selectedTemplateID;
      $('#ractTemplateTable').DataTable().row($(tempId)).remove().draw();
      $('#ractTemplateTable').DataTable().row($(tempId)).remove().draw();
      ExposureActions.createStatusMessage(
        FrontendConstants.RACT_TEMPLATE_DELETED,
        StatusMessageTypeConstants.TOAST_SUCCESS
      );
    }).catch(error => {
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });

  };
  const closeDialog = () => {
    setDisplayConfirmationBox(false);
  };
  const renderHeader = () => {
    let headerElement = ['Ract Template', 'Status', 'Created On', 'Updated On', 'Author', 'Action'];
    return headerElement.map((key, index) => {
      return <th key={index}>{key.toUpperCase()}</th>;
    });
  };

  const renderBody = () => {
    return templates && templates.map(({id, name, status, createdOn, updatedOn, createdBy}) => {
      const addDisabledClass = "fieldDisabled";
      const currentUser = props.immExposureStore.getIn(['userInfo', 'id']);
      const isSuperAdmin = comprehend.globals.immAppConfig.get('isSuperAdmin');
      const user = Util.getUserFullName(props.immExposureStore.get('users'), createdBy);
      let isEditable;
      let isDelete;
      if (isSuperAdmin || currentUser === createdBy) {
        if (name === FrontendConstants.RACT_OOB || name === FrontendConstants.RACT_OOB_1) {
          isEditable = false;
          isDelete = false;
        } else {
          if (status === FrontendConstants.RACT_TEMPLATE_FINAL_STATUS) {
            if (isSuperAdmin) {
              isDelete = true;
            }
            isEditable = false;
          } else if (status === FrontendConstants.RACT_TEMPLATE_DRAFT_STATUS) {
            isEditable = true;
            isDelete = true;
          }
        }
      } else {
        isEditable = false;
        isDelete = false;
      }
      return (
        <tr key={id} id={"temp" + id}>
          <td>{name}</td>
          <td>{status}</td>
          <td>{Util.dateFormatter(createdOn)}</td>
          <td>{Util.dateFormatter(updatedOn)}</td>
          <td>{user}</td>
          <td className='operation'>
            <a onClick={() => viewRactTemplate(id)}>View</a>
            <a onClick={() => duplicateRactTemplate(id)}>Duplicate</a>
            <a className={!isEditable ? addDisabledClass : ''} onClick={() => editRactTemplate(id)}>Edit</a>
            <a className={!isDelete ? addDisabledClass : ''}
               onClick={() => deleteRactTemplateConfirmation(id, name)}>Delete</a>
          </td>
        </tr>
      );
    });
  };
  const openCreateRactTemplate = () => {
    props.router.push(RouteNameConstants.EXPOSURE_CREATE_RACT_TEMPLATE);
  };
  return (
    <div className={'ractTemplateConfiguration'}>
      <div className='page-header'>
        <div className={cx('breadcrumbs', 'oversight-title')}>
          {FrontendConstants.RBQM_MODULE}
          <TouchDiv
            className={cx('breadcrumb-separator', 'icon', 'icon-arrow-right', 'oversight-breadcrumb-margin')}/>
          {FrontendConstants.RACT_MODULE}
          <TouchDiv
            className={cx('breadcrumb-separator', 'icon', 'icon-arrow-right', 'oversight-breadcrumb-margin')}/>
          {'CONFIGURATION'}
        </div>
      </div>
      <div className={'createRactTemplateContainer'}>
        <div className={'ractTemplateTitle'}>
          Ract Templates
        </div>
        <div className={'createNewTemplateButton ribbon-buttons'}>
          <div className={cx('btn btn-primary')} onClick={openCreateRactTemplate}>
            <i className={'icon-user-plus'}></i>
            Create New
          </div>
        </div>
      </div>
      <hr/>
      <div className={'ractTemplateTableContainer'}>
        <table className={'ractTemplateTable'} id={'ractTemplateTable'}>
          <thead>
          <tr>{renderHeader()}</tr>
          </thead>
          <tbody>
          {renderBody()}
          </tbody>
        </table>
        {
          displayConfirmationBox ?
            <DeleteRactConfirmationDialog
              deleteRactTemplate={deleteRactTemplate}
              close={closeDialog}
              message={deleteMsg} yesOrNo={true}/>
            : null
        }
      </div>
    </div>
  );
};
export default RactTemplateConfiguration;

