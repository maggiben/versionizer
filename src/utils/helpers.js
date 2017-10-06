const path = require('path');
const fs = require('fs');

/* Private Methods */
const isFunction = function (fn) {
  const getType = {};
  return fn && getType.toString.call(fn) === '[object Function]';
}

const isString = function (value) {
  return typeof value === 'string';
}

const getPackage = function (file) {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    if (stats.isFile()) {
      try {
        return require(file);
      } catch (error) {
        throw error;
      }
    } else if (stats.isDirectory()) {
      try {
        return require(path.resolve(file, 'package.json'));
      } catch (error) {
        throw error;
      }
    } else {
      throw new Error('Invalid file type');
    }
  } else {
    throw new Error(`package.json not found in ${file}`);
  }
};

const formatDate = function (date) {
  const options = { year: 'numeric', month: 'short', day: '2-digit' };
  if (isString(date)) {
    date = new Date(date);
  }
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

module.exports = {
  isFunction,
  getPackage,
  formatDate
};
