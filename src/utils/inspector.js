const path = require('path');
const fs = require('fs');
const { gitLog, gitStatus } = require('./git');
const { MapEx2, MapEx, getCommandHandler, padEndLength, padEnd } = require('./commands');

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

  const place = function (command, result = '') {
    const maxCommand = handlers[padEndLength];
    return `${command.padStart(command.length + 4, '// @').padEnd(maxCommand + 5).padEnd(maxCommand + 7, ': ')}` + `${result.padEnd(80 - (maxCommand + 10)).padEnd(80 - (maxCommand + 8), '//')}`
  }

  const execute = function (command, ...args) {
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
      return comment
        .replace(/(^@)(.*)(:)(.*)/, 'command:$2,predicate:$4')
        .split(',')
        .map(command => command.split(':'))
        .reduce((hash, [key, value]) => ({ ...hash, [key]:value }), {});
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
          if (command) {
            return { ...options, header: [ ...header, command ] };
          } else {
            return { ...options, header: [ ...header, predicate ] };
          }
          // console.log('{ command, predicate }', JSON.stringify({ command, predicate },0,2))
          /*
          // extract and sanitize commands
          const comment = line.replace(/\/(.\s+)(.*)(\s+\/.*)/, '$2').replace(/^\s+|\s+$/g, '');
          // test for command prefix
          if (comment.match(/^@.*:.*$/)) {
            // extract command
            const command = comment.replace(/(.*@)(.*\s)(:.*)/, '$2').replace(/^\s+|\s+$/g, '');
            // extract default predicate
            const predicate = comment.match(/^@.*:/).reduce((acc, b, i, o) => (o.input.split(':').pop().trim()), '');
            // Short-circuit prop evaluation
            handlers[command] = handlers[command] || predicate;
            // return clean command
            return { ...options, header: [ ...header, command ] };
          } else {
            // return the original untouched header line
            return { ...options, header: [ ...header, line ] };
          }
          */
        }
      }
      return options;
    }, { copy: false, indexes: [], header: [] });

    return {
      indexes,
      source: buildHeaderLessCopy(file, indexes),
      header: wrapHeader(header.reduce((header, command) => [ ...header, ( command in handlers ? execute(command) : command )], []))
    };
  };

  const insetHeader = function (source, header, index) {
    return source.slice(0, index).concat(header, source.slice(index));
  };

  const buildHeader = function (file) {
    const { indexes, source, header } = extractHeader(file);
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
