const program = require('commander');
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const documentation = require('documentation');
const { name, version, description } = require('./package.json');

const isFunction = function (functionToCheck) {
  const getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

const buildFileHeader = function (file, project) {

  const padEndLength = Symbol('padEndLength');
  const padEnd = Symbol('padEnd');
  const commands = {
    file() { return path.basename(file) },
    version() { return project.version },
    project() { return project.name },
    author() { return project.author.name },
    email() { return project.author.email },
    date() {
      const options = { year: 'numeric', month: 'short', day: '2-digit' };
      return new Intl.DateTimeFormat('en-US', options).format(new Date());
    },
    license() { return 'MIT' },
    [padEndLength]: 0,
    [padEnd]() {
      return this[padEndLength];
    }
  };

  const handler = {
    has: function (object, property) {
      // Reflect has
      return Reflect.has(target, property);
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
    apply: function(target, thisArg, argumentsList) {
      // Reflect apply
      return Reflect.apply(object, thisArg, argumentsList);
    }
  };

  const handlers = new Proxy(commands, handler);
  const place = function (command, result = '') {
    // const maxCommand = Object.keys(handlers).reduce((a, b) => (Math.max(a, b.length)), 0);
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

  const buildHeader = function (file) {
    return fs.readFileSync(file, 'utf8')
    .toString()
    .split(/\r?\n/)
    .reduce(function (options, line, index) {
      const { copy, indexes, headers } = options;
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
            return { ...options, headers: [ ...headers, command ] };
          } else {
            // return the original untouched header line
            return { ...options, headers: [ ...headers, line ] };
          }
        }
      }
      return options;
    }, { copy: false, indexes: [], headers: [] })
    .headers.reduce(function (headers, command) {
      // console.log('command: ', command, handlers.hasOwnProperty(command));
      if (handlers.hasOwnProperty(command)) {
        return [ ...headers, execute(command) ];
      }
      return [ ...headers, command ];
    }, []);
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

// const header = buildFileHeader('/Users/bmaggi/tickler/client/scripts/components/Player/Controls/Playback.jsx', require('./package.json'));
// console.log('///////////////////////////////////////////////////////////////////////////////')
// console.log(header.join('\n'));
// console.log('///////////////////////////////////////////////////////////////////////////////')



// options is optional
// glob('/Users/bmaggi/tickler/client/**/*.*{js,jsx}', null, function (error, files) {
//   // files is an array of filenames.
//   // If the `nonull` option is set, and nothing
//   // was found, then files is ["**/*.js"]
//   // er is an error object or null.
//   console.log('file:', files.map(file => (path.basename(file))) );
// });


const getPkg = function (file) {
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
}

const scanSourceTree = function (tree, scanOptions, globOptions) {
  const { recursive, extension, license, template } = scanOptions;
  const pkg = getPkg(scanOptions.package);
  const simpleGit = require('simple-git')(path.resolve('/Users/bmaggi/tickler'));
  const location = path.parse(tree);
  glob(tree, null, function (error, files) {
    // console.log('file:', files.map(file => (path.basename(file))) );
    // return process.exit();
    files.forEach(file => {
      const log = simpleGit.log({
        file,
      }, (error, result) => {
        console.log('log', file, result);
      })
      return;
      const header = buildFileHeader(file, pkg);
      console.log('///////////////////////////////////////////////////////////////////////////////')
      console.log(header.join('\n'));
      console.log('///////////////////////////////////////////////////////////////////////////////')
      console.log('\n\n\n');
    });
  });
};


program
  .version(version)
  .option('-v, --version', 'Add peppers')
  .option('-v, --version', 'Add peppers')

program
  .command('scan')
  .description('Scan source tree')
  .arguments('<tree>')
  .option('-r, --recursive', 'Scan directories recursively', true)
  .option('-l, --license [path]', 'Append license file')
  .option('-p, --package [path]', 'Use a specific package.json to compute commands')
  .option('-t, --template [path]', 'Use a header template')
  .option('-e, --extension [extension]', 'Scan for specific file types and file formats (separated by commas)')
  .action(function(tree, scanOptions) {
    const globOptions = {
      cwd: process.cwd()
    };
    // console.log('recursive', scanOptions.recursive, 'license', scanOptions.license, 'package', scanOptions.package, 'template', scanOptions.template, 'extension', scanOptions.extension)
    return scanSourceTree(tree, scanOptions, globOptions);
  });

program.parse(process.argv);

// node index.js scan -r '/Users/bmaggi/tickler/client/**/*.*{js,jsx}' -p '/Users/bmaggi/tickler/package.json'
// node index.js scan -r '/Users/bmaggi/tickler/client/scripts/components/**/*.*{js,jsx}' -p '/Users/bmaggi/tickler/package.json'

// git log --pretty=format:"%s;%an;%ae;%ad;%cn" client/scripts/components/Editor/Editor.jsx
// const comment = Array(80).fill('/').join('');
// const regExp = new RegExp("(?:"+comment+")(.*?)(?:"+comment+")", 'ig'); //set ig flag for global search and case insensitive
// const source = fs.readFileSync('client/scripts/components/Player/Controls/Playback.jsx', 'utf8');
// const header = regExp.exec(source);
// console.log(comment, regExp, header)
// if (header && header.length > 1) //RegEx has found something and has more than one entry.
// {
//   console.log(header[1]); //is the matched group if found
// }

/*
const regExp = new RegExp(/^\/\*?\*\/|\/\/.*$/gm);
const source = fs.readFileSync('client/scripts/components/Player/Controls/Playback.jsx', 'utf8');
const header = regExp.exec(source);
*/

// const commands = ['file', 'summary', 'version', 'project', 'description', 'author', 'email', 'date', 'license']


// console.log('commands', JSON.stringify(commands, 0, 2));
// console.log('header', JSON.stringify(header.headers, 0, 2));

// var regExString = new RegExp("(?:"+firstvariable+")(.*?)(?:"+secondvariable+")", "ig"); //set ig flag for global search and case insensitive

// var testRE = regExString.exec("My cow always gives milk.");
// if (testRE && testRE.length > 1) //RegEx has found something and has more than one entry.
// {
//   console.log(testRE[1]); //is the matched group if found
// }
