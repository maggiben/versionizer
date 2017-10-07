
/* Private Methods */
const toRegExp = function(regexp) {
  return (regexp instanceof RegExp) ? new RegExp(regexp) : new RegExp(regexp);
};

const helpers = {
  regexIndexOf: {
    value(regex, startpos) {
      let indexOf = this.substring(startpos || 0).search(regex);
      return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
    },
    enumerable: false,
    writable: false
  },
  regexIndexes: {
    value(regex, startpos = (startpos < 0 ? 0 : startpos || this.length)) {
      regex = (regex instanceof RegExp) ? regex : new RegExp(regex);
      const stringToWorkWith = this.substring(0, startpos + 1);
      let lastIndexOf = -1;
      let nextStop = 0;
      while ((result = regex.exec(stringToWorkWith)) != null) {
        lastIndexOf = result.index;
        regex.lastIndex = ++nextStop;
      }
      return lastIndexOf;
    },
    enumerable: false,
    writable: false
  },
  extractWithin: {
    value(headRegExp, tailRegExp, startpos = ((arguments.length > 2 && (arguments[2] < 0)) ? 0 : arguments[2] || this.length)) {
      headRegExp = toRegExp(headRegExp);
      tailRegExp = toRegExp(tailRegExp);

      const findIndex = (regExp, string) => ((function(...args) {
        const [ match ] = args;
        const { index = 0, input = '' } = match || {};
        const { lastIndex } = regExp;
        console.log('lastIndex: %s, index: %s, match: %s', lastIndex, index, match);
        return { lastIndex, index, match };
      }( regExp.exec(string) )));

      const headIndex = findIndex(headRegExp, this.substring(0, (startpos + 1)));
      const tailIndex = findIndex(tailRegExp, this.substring(headIndex.lastIndex, (startpos + 1)));

      return this.substring(headIndex.index, tailIndex.lastIndex + headIndex.lastIndex);

      // const headIndex = (function(...args) {
      //   const [ match ] = args;
      //   const { index = 0, input = '' } = match || {};
      //   const { lastIndex } = headRegExp;
      //   console.log('headRegExp', lastIndex, index);
      //   return Object.assign({}, { input, index, lastIndex });
      // })( headRegExp.exec(this.substring(0, (startpos + 1))) );


      // const tailIndex = (function(...args) {
      //   const [ match ] = args;
      //   const { index = 0, input = '' } = match || {};
      //   const { lastIndex } = tailRegExp;
      //   console.log('tailRegExp', lastIndex, index);
      //   return Object.assign({}, { input, index, lastIndex });
      // })( tailRegExp.exec(this.substring(headIndex.lastIndex, (startpos + 1))));

      // console.log('headIndex: ', headIndex.lastIndex, 'tailIndex: ', tailIndex.lastIndex)
    },
    enumerable: false,
    writable: false
  },
  regexLastIndexOf: {
    value(regex, startpos = ((arguments.length > 1 && (arguments[1] < 0)) ? 0 : arguments[1] || this.length)) {
      regex = (regex instanceof RegExp) ? regex : new RegExp(regex);
      const stringToWorkWith = this.substring(0, startpos + 1);
      let lastIndexOf = -1;
      let nextStop = 0;
      while ((result = regex.exec(stringToWorkWith)) != null) {
        lastIndexOf = result.index;
        regex.lastIndex = ++nextStop;
      }
      return lastIndexOf;
    },
    enumerable: false,
    writable: false
  }
};

const SuperString = function () {
  const names = Object.getOwnPropertyNames(String.prototype);
  return Object
  .entries(helpers)
  .filter(function([ property, descriptor ]) {
    return !names.includes(property);
  })
  .map(function([ property, descriptor ]) {
    return Object.defineProperty(String.prototype, property, descriptor);
  });
};

/* Public exports */
module.exports = {
  superString: SuperString(),
  indexOfRegex (str, regex, startpos) {
    const indexOf = str.substring(startpos || 0).search(regex)
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf
  },
  lastIndexOfRegex (str, regex, startpos) {
    regex = (regex.global) ? regex : new RegExp(regex.source, 'g' + (regex.ignoreCase ? 'i' : '') + (regex.multiLine ? 'm' : ''))
    if (typeof (startpos) === 'undefined') {
      startpos = str.length
    } else if (startpos < 0) {
      startpos = 0
    }
    const stringToWorkWith = str.substring(0, startpos + 1)
    let lastIndexOf = -1
    let nextStop = 0
    let result
    while ((result = regex.exec(stringToWorkWith)) != null) {
      lastIndexOf = result.index
      regex.lastIndex = ++nextStop
    }
    return lastIndexOf
  }
};
