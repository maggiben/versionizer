const path = require('path');
const fs = require('fs');
const { gitLog, gitStatus } = require('./git');
const { getCommandHandler, padEndLength, padEnd } = require('./commands');

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
        }
      }
      return options;
    }, { copy: false, indexes: [], header: [] });

    return {
      indexes,
      header: wrapHeader(header.reduce((header, command) => [ ...header, ( command in handlers ? execute(command) : command )], []))
    };
  };

  const insetHeader = function (source, header, index) {
    return source.slice(0, index).concat(header, source.slice(index));
  }
  const buildHeader = function (file) {
    // const { indexes, headers } = fs.readFileSync(file, 'utf8')
    // .toString()
    // .split(/\r?\n/)
    // .reduce(function (options, line, index) {
    //   const { copy, indexes, headers } = options;
    //   if (line.match(/^\/\*?\*\/|\/\/.*$/g) && indexes.length < 3) {
    //     if (line.match(/^[\/\/]{79,80}/)) {
    //       return { ...options, copy: !copy, indexes: [ ...indexes, index ] };
    //     }
    //     if (copy) {
    //       // extract and sanitize commands
    //       const comment = line.replace(/\/(.\s+)(.*)(\s+\/.*)/, '$2').replace(/^\s+|\s+$/g, '');
    //       // test for command prefix
    //       if (comment.match(/^@.*:.*$/)) {
    //         // extract command
    //         const command = comment.replace(/(.*@)(.*\s)(:.*)/, '$2').replace(/^\s+|\s+$/g, '');
    //         // extract default predicate
    //         const predicate = comment.match(/^@.*:/).reduce((acc, b, i, o) => (o.input.split(':').pop().trim()), '');
    //         // Short-circuit prop evaluation
    //         handlers[command] = handlers[command] || predicate;
    //         // return clean command
    //         return { ...options, headers: [ ...headers, command ] };
    //       } else {
    //         // return the original untouched header line
    //         return { ...options, headers: [ ...headers, line ] };
    //       }
    //     }
    //   }
    //   return options;
    // }, { copy: false, indexes: [], headers: [] });

    // const header = wrapHeader(headers.reduce((headers, command) => [ ...headers, ( command in handlers ? execute(command) : command )], []));
    const { indexes, header } = extractHeader(file);
    const source = buildHeaderLessCopy(file, indexes);
    // const src = source.slice(0, Math.min.apply(null, indexes)).concat(header, source.slice(Math.min.apply(null, indexes)));
    const src = insetHeader(source, header, Math.min.apply(null, indexes));
    console.log(src.join('\n'));
  };

  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    if (stats.isFile()) {
      try {
        const headers = buildHeader(file);
        return headers;
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
