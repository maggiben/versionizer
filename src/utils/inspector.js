const path = require('path');
const fs = require('fs');
const { gitLog, gitStatus } = require('./git');
const { getCommandHandler, padEndLength, padEnd } = require('./commands');
const { MapEx: CommandMap } = require('./MapEx');
const { indexOfRegex, lastIndexOfRegex } = require('./String');


// console.log('SuperString', Object.getOwnPropertyNames(String.prototype))
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

/* Private Methods */
const glob = function (pattern, options) {
  return new Promise((resolve, reject) => {
    return require('glob')(pattern, options, (error, matches) => {
      return error ? reject(error) : resolve(matches);
    });
  });
};

const buildHeaderLessCopy = function (file, indexes) {
  const max = Math.max.apply(null, indexes);
  const min = Math.min.apply(null, indexes);
  const basename = path.basename(file);
  const source = fs.readFileSync(file, 'utf8')
    .toString()
    .split(/\r?\n/)
    .filter((line, index) => (index < min || index > max));
    // return fs.writeFileSync(path.resolve(`${basename}.headless`), source.join('\n'))
    return source;
};

const buildFileHeader = async function (file, project) {

  const log = await gitLog('/Users/bmaggi/tickler', { file });
  const status = await gitStatus('/Users/bmaggi/tickler');
  const handlers = getCommandHandler(file, project, log);
  // const commands = new MapEx(file, project);
  const commandMap = new CommandMap(file, project);

  const place = function (command, result = '') {
    const maxCommand = handlers[padEndLength];
    const offset = commandMap.padEndLength;
    return `${command.padStart(command.length + 4, '// @').padEnd(maxCommand + 5).padEnd(maxCommand + 7, ': ')}` + `${result.padEnd(80 - (maxCommand + 10)).padEnd(80 - (maxCommand + 8), '//')}`
  }

  const execute = function (command, ...args) {
    if (commandMap.has(command)) {
      const result = commandMap.invoke(command, ...args);
      // console.log('result', result);
    }

    if (handlers.hasOwnProperty(command) && typeof(handlers[command]) === 'function') {
      const result = handlers[command].apply(this, ...args);
      return place(command, result);
    } else {
      return place(command, handlers[command] || '');
    }
  }

  const wrapHeader = function (array) {
    const tail = head = Array(80).join('/');
    return [ head, ...array, tail ];
  };

  const parseLine = function (line) {
    // unwrap comment and remove all spaces
    const comment = line.replace(/[/\/(.\s+)]/g,'');
    // test for command prefix and predicate
    if (comment.match(/^@.*:.*$/)) {
      // extract command name and predicate and convert to object
      const expression = comment
        .replace(/(^@)(.*)(:)(.*)/, 'command:$2,predicate:$4')
        .split(',')
        .map(command => command.split(':'))
        .reduce((hash, [key, value]) => ({ ...hash, [key]:value }), {});
      handlers[expression.command] = handlers[expression.command] || expression.predicate;
      return expression;
    } else {
      // return untouched line as predicate with no command
      return { command: null, predicate: line };
    }
  };

  const extractHeader = function (file) {
    const { indexes, header } = fs.readFileSync(file, 'utf8')
    .toString()
    .split(/\r?\n/)
    .reduce(function (options, line, index) {
      const { copy, indexes, header } = options;
      if (line.match(/^\/\*?\*\/|\/\/.*$/g) && indexes.length < 3) {
        if (line.match(/^[\/\/]{79,80}/)) {
          return { ...options, copy: !copy, indexes: [ ...indexes, index ] };
        }
        if (copy) {
          const { command, predicate } = parseLine(line);
          commandMap.parseLine(line);
          if (command) {
            // handlers[command] = handlers[command] || predicate;
            // console.log('handlers:', Object.keys(handlers))
            return { ...options, header: [ ...header, command ] };
          } else {
            return { ...options, header: [ ...header, predicate ] };
          }
        }
      }
      return options;
    }, { copy: false, indexes: [], header: [] });

    return {
      indexes,
      source: buildHeaderLessCopy(file, indexes),
      header: wrapHeader(header.reduce((header, command) => {
        return [ ...header, ( command in handlers ? execute(command) : command )];
      }, []))
    };
  };

  const insetHeader = function (source, header, index) {
    return source.slice(0, index).concat(header, source.slice(index));
  };

  const buildHeader = function (file) {
    const headRegExp = new RegExp(/^[\/\/]{79,80}/gm);
    const tailRegExp = new RegExp(/^[\/\/]{79,80}/gm);
    const src = fs.readFileSync(file, 'utf8').toString();
    // console.log(src.length);
    // const first = src.regexIndexOf(new RegExp(/^[\/\/]{79,80}/gm));
    // console.log('first', first);
    // const last = src.regexIndexOf(new RegExp(/^[\/\/]{79,80}/gm), (first + );
    // console.log('last', last);

    const hx = src.extractWithin(headRegExp, tailRegExp);

    console.log(hx, '\n-');


    const { indexes, source, header } = extractHeader(file);
    // console.log('indexes', [first, last], indexes);
    // console.log(src.substring(first, last + 80),'-')
    return insetHeader(source, header, Math.min.apply(null, indexes));
  };

  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    if (stats.isFile()) {
      try {
        return buildHeader(file);
      } catch (error) {
        throw error;
      }
    } else {
      throw new Error(`${file} invalid file type`);
    }
  } else {
    throw new Error(`file ${file} not found`);
  }
};

/* Public exports */
module.exports = {
  getCommandHandler,
  buildFileHeader,
  glob
};
