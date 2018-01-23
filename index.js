const fs = require("fs");
const path = require("path");
const parseSPDX = require("spdx-expression-parse");

/**
 * https://github.com/jonschlinkert/parse-author and
 * https://github.com/jonschlinkert/author-regex
 * MIT © Jon Schlinkert
 */
function parseAuthor(str) {
  if (typeof str === "object") return str;
  if (!str || !/\w/.test(str)) return {};

  const authorRegex = /^([^<(]+?)?[ \t]*(?:<([^>(]+?)>)?[ \t]*(?:\(([^)]+?)\)|$)/gm;
  const match = [].concat.apply([], authorRegex.exec(str));
  const author = {};

  if (match[1]) {
    author.name = match[1];
  }

  for (var i = 2; i < match.length; i++) {
    var val = match[i];

    if (i % 2 === 0 && val && match[i + 1]) {
      if (val.charAt(0) === "<") {
        author.email = match[i + 1];
        i++;
      } else if (val.charAt(0) === "(") {
        author.url = match[i + 1];
        i++;
      }
    }
  }

  return author;
}

function equalityMap() {
  const m = new Map();
  return function(val) {
    const str = JSON.stringify(val);
    if (m.has(str)) {
      return m.get(str);
    }
    m.set(str, val);
    return val;
  };
}

// [modules...] => { Tom Selleck => [], John Walsh => [] }
function groupByAuthor(modules) {
  let groups = {};
  for (let { name, homepage, author } of modules) {
    author = parseAuthor(author);
    author.name = author.name || "?";
    if (!groups[author.name]) groups[author.name] = [];
    groups[author.name].push(name);
  }
  return groups;
}

module.exports = (options = {}) => {
  const cache = new Map();
  const dependencies = new Map();
  const cwd = process.cwd();

  return {
    name: "rollup-plugin-credits",
    load(id) {
      let dir = path.parse(id).dir;
      let pkg = null;
      const scannedDirs = [];
      while (dir && dir !== cwd) {
        if (cache.has(dir)) {
          return;
        }
        scannedDirs.push(dir);
        const pkgPath = path.join(dir, "package.json");
        if (fs.existsSync(pkgPath)) {
          pkg = require(pkgPath);
          dependencies.set(pkg.name, pkg);
          break;
        }
        dir = path.normalize(path.join(dir, ".."));
      }
      scannedDirs.forEach(scannedDir => {
        cache.set(scannedDir, pkg);
      });
    },
    transformBundle() {
      // Step 1: transform flat list of dependency into {license} => [{package}...]
      // Map
      const licenseGroups = new Map();
      // I'm being a little fancy here, and I want a map of license objects
      // to packages. So I keep a secondary map of stringified JSON
      // to single object instances.
      let licenseObjects = equalityMap();
      for (let [name, dependency] of dependencies) {
        if (!dependency.license) {
          continue;
        }
        let parsedLicense = licenseObjects(parseSPDX(dependency.license));

        let existing = licenseGroups.get(parsedLicense);
        licenseGroups.set(
          parsedLicense,
          existing ? existing.concat(dependency) : [dependency]
        );
      }

      const output = [];
      for (let [license, modules] of licenseGroups) {
        output.push({
          license,
          modules: groupByAuthor(modules)
        });
      }
      return JSON.stringify(output, null, 2);
    }
  };
};
