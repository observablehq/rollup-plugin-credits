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

function arrayToSentence(arr) {
  const separator = ", ";
  const lastSeparator = " and ";

  if (arr.length === 0) {
    return "";
  }

  if (arr.length === 1) {
    return arr[0];
  }

  return arr.slice(0, -1).join(separator) + lastSeparator + arr[arr.length - 1];
}

// [modules...] => { Tom Selleck => [], John Walsh => [] }
// Priority:
//
// - author field
// - first maintainer
// - ?
function groupByAuthor(modules) {
  let groups = {};
  for (let module of modules) {
    let authors = [];

    if (module.author) {
      authors = [parseAuthor(module.author)];
    } else if (module.authors) {
      authors = module.authors.map(parseAuthor);
    } else if (module.maintainers) {
      authors = module.maintainers.map(parseAuthor);
    } else if (module.licenseText) {
      let match = module.licenseText.match(
        /Copyright \(c\)\s*(?:[\-\d]*(?:present)?,?)?\s*(.*)/i
      );
      if (match) {
        authors = [parseAuthor(match[1])];
      }
    }

    let authorString = arrayToSentence(
      authors.map(a => a.name).filter(Boolean)
    );

    if (!groups[authorString]) groups[authorString] = [];
    groups[authorString].push(module.name);
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

          for (let licenseVariation of [
            "LICENSE",
            "license",
            "LICENSE.md",
            "LICENSE.txt",
            "license.md"
          ]) {
            const licensePath = path.join(dir, licenseVariation);
            if (fs.existsSync(licensePath)) {
              pkg.licenseText = fs.readFileSync(licensePath, "utf8");
              break;
            }
          }

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
      return "export default " + JSON.stringify(output, null, 2);
    }
  };
};
