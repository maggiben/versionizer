const program = require('commander');
const path = require('path');
const { name, version, description } = require('../package.json');
const { buildFileHeader, gitLog, glob } = require('./utils/inspector');
const { getPackage, formatDate } = require('./utils/helpers');


const defaultScanOptions = {

};

const scanSourceTree = async function (tree, scanOptions, globOptions) {
  const { recursive, extension, license, template } = scanOptions;
  const pkg = getPackage(scanOptions.package);
  const files = await glob(tree, null);
  const padLength = files.reduce((length, file) => Math.max(length, path.basename(file).length), 0);
  files.forEach(async (file) => {
    const header = await buildFileHeader(file, pkg);
    // console.log('///////////////////////////////////////////////////////////////////////////////')
    // console.log(header.join('\n'));
    // console.log('///////////////////////////////////////////////////////////////////////////////')
    // console.log('\n\n\n');
  });
};

program
  .version(version)
  .option('-v, --version', 'Add peppers')
  .option('-v, --version', 'Add peppers')

program
  .command('scan')
  .description(description)
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
    return scanSourceTree(tree, scanOptions, globOptions);
  });

program.parse(process.argv);

// node index.js scan -r '/Users/bmaggi/tickler/client/**/*.*{js,jsx}' -p '/Users/bmaggi/tickler/package.json'
// node src/index.js scan -r '/Users/bmaggi/tickler/client/scripts/components/**/*.*{js,jsx}' -p '/Users/bmaggi/tickler/package.json'

/* SINGLE */
// node src/index.js scan -r '/Users/bmaggi/tickler/client/scripts/components/Toolbar/*.*{js,jsx}' -p '/Users/bmaggi/tickler/package.json'


// git log --pretty=format:"%s;%an;%ae;%ad;%cn" client/scripts/components/Editor/Editor.jsx
