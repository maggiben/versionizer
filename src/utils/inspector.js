const path = require('path');
const fs = require('fs');
const { gitLog, gitStatus } = require('./git');
const { getCommandHandler, padEndLength, padEnd } = require('./commands');
const { MapEx: CommandMap } = require('./MapEx');
const { indexOfRegex, lastIndexOfRegex } = require('./String');


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
  const commandMap = new CommandMap(file, project);

  const place = function (command, result = '') {
    const offset = commandMap.padEndLength;
    const name = command
      .padStart(command.length + 4, '// @')
      .padEnd(offset + 5)
      .padEnd(offset + 7, ': ');

    const value = result
      .padEnd(80 - (offset + 10))
      .padEnd(80 - (offset + 8), '//');

    return `${name + value}`;
  };

  const execute = function (command, ...args) {
    const result = commandMap.invoke(command, ...args);
    return place(command, result || '');
  }

  const wrapHeader = function (array) {
    const tail = head = Array(80).join('/');
    return [ head, ...array, tail ];
  };

  const extractHeader = function (file) {
    const headRegExp = new RegExp(/^[\/\/]{79,80}/gm);
    const tailRegExp = new RegExp(/^[\/\/]{79,80}/gm);
    const source = fs.readFileSync(file, 'utf8');

    const indexes = source
      .toString()
      .rangeWithin(/^[\/\/]{79,80}/gm, /^[\/\/]{79,80}/gm)
      .map((index, i, arr) => {
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        return source.substring(i, index).split(/\r?\n/).length - 1
      });

    const header = source
      .toString()
      .extractWithin(/^[\/\/]{79,80}/gm, /^[\/\/]{79,80}/gm)
      .split(/\r?\n/);

    const body = source
      .toString()
      .substring(header.length, source.length);

    console.log('indexes: %s', path.basename(file), indexes)
    console.log(header);
    // console.log(body);

    // fs.readFileSync(file, 'utf8')
    //   .toString()
    //   .split(/\r?\n/)
    //   .reduce(function (options, line, index) {
    //     const { copy, indexes, header } = options;
    //     if (line.match(/^\/\*?\*\/|\/\/.*$/g) && indexes.length < 3) {
    //       if (line.match(/^[\/\/]{79,80}/)) {
    //         console.log('INDEX', index)
    //       }
    //     }
    //     return options;
    //   }, { copy: false, indexes: [], header: [] })

    // const { indexes, header } = fs.readFileSync(file, 'utf8')
    //   .toString()
    //   .split(/\r?\n/)
    //   .reduce(function (options, line, index) {
    //     const { copy, indexes, header } = options;
    //     if (line.match(/^\/\*?\*\/|\/\/.*$/g) && indexes.length < 3) {
    //       if (line.match(/^[\/\/]{79,80}/)) {
    //         return { ...options, copy: !copy, indexes: [ ...indexes, index ] };
    //       }
    //       if (copy) {
    //         const { command, predicate } = commandMap.parseLine(line);
    //         if (command) {
    //           return { ...options, header: [ ...header, command ] };
    //         } else {
    //           return { ...options, header: [ ...header, predicate ] };
    //         }
    //       }
    //     }
    //     return options;
    //   }, { copy: false, indexes: [], header: [] });

    return {
      indexes,
      // source: buildHeaderLessCopy(file, indexes),
      // source: body,
      header: wrapHeader(header.reduce((header, command) => {
        return [ ...header, ( commandMap.has(command) ? execute(command) : command )];
      }, []))
    };
  };

  const insetHeader = function (source, header, index) {
    return source.slice(0, index).concat(header, source.slice(index));
  };

  const buildHeader = function (file) {
    // const headRegExp = new RegExp(/^[\/\/]{79,80}/gm);
    // const tailRegExp = new RegExp(/^[\/\/]{79,80}/gm);
    // const src = fs.readFileSync(file, 'utf8').toString();
    // const hx = src.extractWithin(headRegExp, tailRegExp);
    // console.log(hx, '\n-');

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
