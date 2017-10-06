const path = require('path');
const fs = require('fs');

/* Private Methods */
const gitLog = function (directory, options) {
  const git = require('simple-git')(path.resolve(directory));
  return new Promise((resolve, reject) => {
    return git.log(options, (error, { latest }) => {
      return error ? reject(error) : resolve(
        ({
          hash,
          date,
          message,
          author_name: authorName,
          author_email: authorEmail
        } = latest)
      );
    });
  });
};

const gitStatus = function (directory, options) {
  const git = require('simple-git')(path.resolve(directory));
  return new Promise((resolve, reject) => git.log(options, (error, { latest }) => (error ? reject(error) : resolve(({
    hash,
    date,
    message,
    author_name: authorName,
    author_email: authorEmail
  } = latest)))));
};

/* Public exports */
module.exports = {
  gitLog,
  gitStatus
};
