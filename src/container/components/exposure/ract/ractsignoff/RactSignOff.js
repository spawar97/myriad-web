import React, {useEffect, useState} from "react";
import './RactSignOff.scss';
import Select from "react-select";
import RactScorecardStore from '../../../../stores/RactScorecardStore';
import ExposureActions from '../../../../actions/ExposureActions';
import StatusMessageTypeConstants from '../../../../constants/StatusMessageTypeConstants';
import FrontendConstants from '../../../../constants/FrontendConstants';
import RouteNameConstants from '../../../../constants/RouteNameConstants';
import ContentPlaceholder from '../../../../components/ContentPlaceholder';

const RactSignOff = (props) => {

  const [inputList, setInputList] = useState([{UserName: "", Role: "", Id: ""}]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    let response = await RactScorecardStore.fetchUsers();
    if (response.length){
      let array = [];
      for(let i = 0; i < response.length; i++){
        let user = {};
        user["value"] = response[i].userName;
        user["label"] = response[i].userName;
        user["role"] = response[i].orgRole;
        user["id"] = response[i].id;
        array.push(user);
      }
      setUsers(array);
      setIsLoading(false);
    }
    else {
      setIsLoading(false);
      ExposureActions.createStatusMessage(
        FrontendConstants.FAILED_TO_FETCH_USERS,
        StatusMessageTypeConstants.TOAST_ERROR
      );
    }
  }

  const assignUsers = async() => {
    setIsLoading(true);
    let ractId = props.location.state ? props.location.state.ractId : null;
    let assignUserData = {
      "ractId": ractId,
      "userIds": inputList.map(val => { return val.Id }),
      "urgent": true,
      "reAssign": false
    }
    if (ractId){
      if (assignUserData.userIds && assignUserData.userIds[0]){
        let response = await RactScorecardStore.assignUsersToRactTemplate(assignUserData);
        if (response instanceof Error) {
          setIsLoading(false);
          ExposureActions.createStatusMessage(
            response.message,
            StatusMessageTypeConstants.TOAST_ERROR
          );
          throw new Error(`${FrontendConstants.RACT_API_ERROR}`)
        } 
        else if (response && response.ractId){
          setIsLoading(false);
          ExposureActions.createStatusMessage(
            FrontendConstants.USER_ASSIGNED,
            StatusMessageTypeConstants.TOAST_SUCCESS
          );
          redirectToRactHome();
        } else {
          setIsLoading(false);
        }
      }
      else {
        setIsLoading(false);
        ExposureActions.createStatusMessage(
          FrontendConstants.ASSIGN_USER_ERROR,
          StatusMessageTypeConstants.TOAST_ERROR
        );
      }
    }
    else {
      setIsLoading(false);
      ExposureActions.createStatusMessage(
        FrontendConstants.RACT_ID_NOT_PRESENT,
        StatusMessageTypeConstants.TOAST_ERROR
      );
    }
  }

  // handle select change
  const handleSelectChange = (obj, index) => {
    const {value, role, id} = obj;
    const list = [...inputList];
    list[index]['UserName'] = value;
    list[index]['Role'] = role;
    list[index]['Id'] = id;
    setInputList(list);
  };

  // handle click event of the Remove button
  const handleRemoveClick = index => {
    const list = [...inputList];
    list.splice(index, 1);
    setInputList(list);
  };

  // handle click event of the Add button
  const handleAddClick = () => {
    setInputList([...inputList, {UserName: "", Role: ""}]);
  };

  const redirectToRactHome = () => {
    props.router.push(RouteNameConstants.EXPOSURE_RACT);
  }

  return (
    <React.Fragment>
      {isLoading ? <ContentPlaceholder containerClassName={"ract-loader"}/> : null}
      <div className={"ractSignOffContainer"}>
        <div className={"signOffHeader"}>
          <span className={"signOffHeaderText"}>
            {FrontendConstants.RACT_ASSIGN_SIGNING_AUTHORITY}
          </span>
        </div>
        {inputList.map((Obj, index) => {
          return (
            <div className={"signOffContent"}>
              <div className={"UserNameSelectGrid"}>
                <label htmlFor="username" id={"UserNameLabel"}>
                  User Name
                </label>
                <Select
                  className={"UserNameSelect"}
                  value={Obj.UserName ? {'value': Obj.UserName, 'label': Obj.UserName} : ''}
                  options={users}
                  placeholder={'UserName'}
                  onChange={e => handleSelectChange(e, index)}
                  clearable={false}
                />
              </div>
              <div className={"RoleInputGrid"}>
                <label htmlFor="role" id={"RoleLabel"}>
                  Role
                </label>
                <input
                  className={"RoleInput"}
                  name={`Role`}
                  placeholder="Stakeholder Role"
                  value={Obj.Role}
                  disabled={true}
                />
              </div>
              <div className={"addRemoveBtnBox"}>
                <div className={"RemoveButtonGrid"}>
                  {inputList.length !== 1 &&
                  <button id={"RemoveButton"} onClick={() => handleRemoveClick(index)}>x
                  </button>}
                </div>

                <div className={"AddButtonGrid"}>
                  {inputList.length - 1 === index &&
                  <button id={"AddButton"} onClick={handleAddClick}>+
                  </button>}
                </div>
              </div>
            </div>
          );
        })}
        <div className={"assignButtonGrid"}>
          <button className={"assignButton"} onClick={() => assignUsers()}>
            Assign
          </button>
        </div>
      </div>
    </React.Fragment>
  );
};

export default RactSignOff;
