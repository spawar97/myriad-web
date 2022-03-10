// Session Storage Utility

export const setString = (name, value) => {
  sessionStorage.setItem(name, value);
};

export const setObject = (name, value) => {
  try {
    sessionStorage.setItem(name, JSON.stringify(value));
    return true;
  } catch (err) {
    return false;
  }
};

export const getString = name => {
  return sessionStorage.getItem(name);
};

export const getSessionIntegar = name => {
  return parseInt(sessionStorage.getItem(name));
};

export const getObject = name => {
  try {
    return JSON.parse(sessionStorage.getItem(name));
  } catch (err) {
    return null;
  }
};

export const hasStringInArray = (arrayName, name) => {
  try {
    const arr = JSON.parse(sessionStorage.getItem(arrayName));
    return arr.indexOf(name) !== -1;
  } catch (err) {
    return false;
  }
};

export const delItem = name => {
  sessionStorage.removeItem(name);
};

export const clearAll = name => {
  sessionStorage.clear();
};
