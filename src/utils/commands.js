const path = require('path');
const fs = require('fs');
const { formatDate } = require('./helpers');

const handler = {
  construct: function(object, [ file, repository, commands ], newTarget) {
    console.log('constructor', object, newTarget)
    // console.log('constructor', file, repository, commands)
    // if (validator.validate('playlist#/definitions/Track', dictionary)) {
    //   return Reflect.construct(object, [ dictionary ], newTarget);
    // } else {
    //   console.error(validator.errorsText(), validator.errors);
    //   throw new Error(validator.errorsText());
    // }
    // console.log('object', file, newTarget);
    return Reflect.construct(object, [ commands ], newTarget);
  },
  has: function (object, property) {
    console.log('has', property, value)
    return Reflect.has(object, property);
  },
  set: function(object, property, value, receiver) {
    console.log('set', property, value)
    return Reflect.set(object, property, value, receiver);
  },
  get: function (object, property, receiver) {
    // console.log('get', object, property, typeof object[property]);
    if (typeof object[property] === 'functxion') {
      console.log('get is FX', object, property);
      const method = Reflect.get(object, property).bind(object);
      return (...args) => {
        return Reflect.apply(method, object, args);
      };
      // return Reflect.get(object, property, receiver).bind(object);

      // const apply = (...args) => {
      //   return Reflect.apply(object[property], object, args);
      // };
      // return apply.bind(object);
    }
    if (Reflect.has(object, property)) {
      return Reflect.get(object, property);
    } else {
      return Reflect.get(object, property, receiver);
    }
  },
  apply: function(object, thisArg, argumentsList) {
    // console.log('apply', argumentsList);
    return Reflect.apply(object, thisArg, argumentsList);
  }
};

class MapEx extends Map  {

  static commands(file, repository) {
    return Object.entries({
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      file() { return file ? path.basename(file) : null },
      version() { /*return pkg.version */ },
      project() { /*return pkg.name */ },
      author() { /*return pkg.author.name || log.authorName */ },
      email() { /*return pkg.author.email || log.authorEmail */ },
      date() { /*return formatDate(log.date || stats.mtime); */ },
      license() { /*return pkg.license || ''*/  }
    });
  };

  constructor (file, repository) {
    console.log('file %s repository: %s', file, repository)
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.isFile()) {
        try {
          const commands = MapEx.commands(file, repository);
          // super(file, repository, commands);
          super(commands);
        } catch (error) {
          throw new Error(`Cannot subclass ${error}`);
        }
      } else {
        throw new Error(`${file} invalid file type`);
      }
    } else {
      throw new Error(`file ${file} not found`);
    }
  }

  // set(key, value) {
  //   return super.set(key, value);
  // }

  toObject() {
    const object = Array.from(this.entries()).reduce((acc, [key, value]) => {
      return { ...acc, [key]: value };
    }, { });
    console.log('toObject', JSON.stringify(object));
    return object;
  }
}

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
  padEnd,
  MapEx,
  MapEx2: (...args) => { return Reflect.constructor(Proxy, [[new MapEx(...args), handler]])}
};
