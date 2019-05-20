### rollup-plugin-credits

[![CircleCI](https://circleci.com/gh/observablehq/rollup-plugin-credits/tree/master.svg?style=svg)](https://circleci.com/gh/observablehq/rollup-plugin-credits/tree/master) [![Greenkeeper badge](https://badges.greenkeeper.io/observablehq/rollup-plugin-credits.svg)](https://greenkeeper.io/)

Generate 'credits' for included code: parses SPDX licenses, groups dependencies
by license, groups licensed dependencies by author. In the interest of creating
concise credits pages.

- Detects license **type** from the `license` specification in `package.json`, which
  is parsed as [SPDX](https://spdx.org/)
- Detects authorship from, in order of preference:
  1. `author` field in package.json
  1. `authors` field in package.json
  1. `maintainers` field in package.json
  1. Parsing a license file, one of
    - LICENSE
    - LICENSE.md
    - LICENSE.txt
    - license
    - license.md
    - license.txt

Instead of a code bundle, this produces a bundle of credits output. Typically
you'll run this to create a source file that powers your 'credits' page. The
format of this output is as an ES module with a default export. The export is
a list of licenses with `{ license, modules }` keys, which contain a list
of authors with `{ author, modules }` keys.

### Example output

```js
export default [
  {
    license: { license: "MIT" },
    modules: [
      {
        author: "James Halliday",
        modules: [
          "resumer",
          "object-inspect"
        ]
      },
      { author: "Dominic Tarr", modules: ["through"] },
      {
        author: "Marijn Haverbeke and Ingvar Stepanyan",
        modules: ["acorn"]
      }
    ]
  },
  {
    license: { license: "ISC" },
    modules: [{ author: "Isaac Z. Schlueter", modules: ["inherits"] }]
  }
];
```

#### Options

- whitelist: an array or Set of SPDX license identifiers that are allowed in the
  list. If provided and a non-whitelisted dependency is encountered, the transform
  will reject.
