const path = require('path');
const fs = require('fs');
const { formatDate } = require('./helpers');

/* Private variables */
const padEndLength = Symbol('padEndLength');
const padEnd = Symbol('padEnd');

/* Private Methods */
const getCommandHandler = function (file, pkg, log) {
  const stats = fs.statSync(file);
  const commands = {
    file() { return path.basename(file) },
    version() { return pkg.version },
    project() { return pkg.name },
    author() { return pkg.author.name || log.authorName },
    email() { return pkg.author.email || log.authorEmail },
    date() { return formatDate(log.date || stats.mtime); },
    license() { return pkg.license || '' },
    [padEndLength]: 0,
    [padEnd]() {
      return this[padEndLength];
    }
  };
  const handler = {
    has: function (object, property) {
      // Reflect has
      return Reflect.has(object, property);
    },
    get: function(object, property, receiver) {
      // Reflect getters
      if (Reflect.has(object, property)) {
        return Reflect.get(object, property);
      } else {
        return Reflect.get(object, property, receiver);
      }
    },
    set: function(object, property, value, receiver) {
      // Find paddLengt
      object[padEndLength] = Math.max(object[padEndLength], property.length);
      // Reflect setter
      return Reflect.set(object, property, value, receiver);
    },
    apply: function(object, thisArg, argumentsList) {
      // Reflect apply
      return Reflect.apply(object, thisArg, argumentsList);
    }
  };
  return new Proxy(commands, handler);
};

/* Public exports */
module.exports = {
  getCommandHandler,
  padEndLength,
  padEnd
};
