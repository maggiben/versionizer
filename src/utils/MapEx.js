const path = require('path');
const fs = require('fs');
const { formatDate } = require('./helpers');
const { indexOfRegex, lastIndexOfRegex } = require('./String');

/* Private variables */
const MapProxy = new Proxy(Map, {
  construct: function(object, argumentsList, newTarget) {
    return Reflect.construct(object, argumentsList, newTarget);
  },
  has: function (taget, property) {
    return Reflect.has(object, property);
  },
  get: function (object, property, receiver) {
    return Reflect.get(object, property, receiver);
  },
  apply: function(object, thisArg, argumentsList) {
    return Reflect.apply(object, thisArg, argumentsList);
  }
});

/* Private Methods */
class MapEx extends MapProxy {

  static commands(file, repository) {
    const stats = fs.statSync(file);
    return Object.entries({
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      file() {return file && path.basename(file) },
      version() { return repository.version; },
      project() { return repository.name; },
      author() { return repository.author.name; },
      email() { return repository.author.email; },
      date() { return formatDate(repository.date || stats.mtime); },
      license() { return repository.license || '';}
    });
  };

  static get types() {
    return ['function', 'string', 'object'];
  };

  static isValid(command, predicate) {
    const ascii = new RegExp(/^[\x00-\x7F]*$/);
    return (command && command.length) ? ascii.test(command) : false;
  };

  constructor(file, repository) {
    const commands = MapEx.commands(file,  repository);
    super(commands);
    this.handlers = new Set(commands.map(([ key ]) => key));
  }

  invoke(name, ...args) {
    const command = this.get(name);
    switch(typeof(command)) {
      case 'function':
        return command(...args);
      case 'string':
        return command.toString();
      case 'object':
        return this.toObject();
      default:
        return name;
    }
  }

  set(command, predicate) {
    if (MapEx.isValid(command)) {
      return super.set(command, predicate);
    }
  }

  addCommand({ command, predicate }) {
    return this.set(command, predicate);
  }

  get padEndLength() {
    return Array.from(this.keys()).reduce((maxLength, { length }) => Math.max(maxLength, length), 0);
  }

  toArray () {
    return Array.from(this.values());
  }

  fromArray(array) {
    return new MapEx(array.map((value, index) => ([value,[]])));
  }

  toObject() {
    return Array
      .from(this.entries())
      .reduce((object, [key, value]) =>
        ({ ...object, [key]: value }), Object);
  }

  parseLine(string) {
    // unwrap expression from comment and remove all spaces
    // string = string.replace(/[/\/(.\s+)]/g,'');
    // test for a command prefix and expression
    if (string.unwrap().match(/^@.*:.*$/)) {
      // extract command name and predicate
      // from expression then convert to map
      const expression = string
        .unwrap()
        .replace(/(^@)(.*)(:)(.*)/, 'command:$2,predicate:$4')
        .split(',')
        .map(command => command.split(':'))
        .reduce((hash, [key, value]) => ({ ...hash, [key]:value }), {});
      this.addCommand(expression);
      return expression;
    } else {
      // return untouched input string as predicate with no command
      return { command: null, predicate: string };
    }
  }

}

/* Public exports */
module.exports = {
  MapEx
}
