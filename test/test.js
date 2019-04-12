const test = require("tape");
const path = require("path");
const rollup = require("rollup");
const commonjs = require("rollup-plugin-commonjs");
const nodeResolve = require("rollup-plugin-node-resolve");
const credits = require("../");

test("flattenLicense", t => {
  t.deepEqual(
    credits.flattenLicense({
      left: { license: "LGPL-2.1" },
      conjunction: "or",
      right: {
        left: { license: "BSD-3-Clause" },
        conjunction: "and",
        right: { license: "MIT" }
      }
    }),
    ["LGPL-2.1", "BSD-3-Clause", "MIT"]
  );
  t.deepEqual(
    credits.flattenLicense({
      left: { license: "BSD-3-Clause" },
      conjunction: "and",
      right: { license: "MIT" }
    }),
    ["BSD-3-Clause", "MIT"]
  );
  t.deepEqual(credits.flattenLicense({ license: "LGPL-2.1" }), ["LGPL-2.1"]);
  t.end();
});

test("rollup-plugin-credits", t => {
  t.ok("required");

  const rollupConfig = {
    input: path.join(__dirname, "example.js"),

    output: {
      format: "es"
    },

    plugins: [nodeResolve(), commonjs(), credits({ debug: true })]
  };

  rollup.rollup(rollupConfig).then(async bundle => {
    const {
      output: [{ code, map }]
    } = await bundle.generate({ format: "es" });
    const output = JSON.parse(code.replace(/^export default/, ""));
    t.deepEqual(output, [
      {
        license: { license: "ISC" },
        modules: [{ author: "Isaac Z. Schlueter", modules: ["inherits"] }]
      },
      {
        license: { license: "MIT" },
        modules: [
          { author: "Blake Embrey", modules: ["path-to-regexp"] },
          { author: "Dominic Tarr", modules: ["through"] },
          {
            author: "James Halliday",
            modules: [
              "deep-equal",
              "defined",
              "object-inspect",
              "resumer",
              "tape"
            ]
          },
          {
            author: "Jordan Harband",
            modules: [
              "define-properties",
              "es-abstract",
              "es-to-primitive",
              "is-callable",
              "object-keys",
              "string.prototype.trim"
            ]
          },
          {
            author: "Marijn Haverbeke, Ingvar Stepanyan and Adrian Heine",
            modules: ["acorn"]
          },
          { author: "Raynos", modules: ["for-each", "function-bind"] },
          { author: "Thiago de Arruda", modules: ["has"] }
        ]
      }
    ]);
    t.end();
  });
});

test("rollup-plugin-credits whitelist", t => {
  const rollupConfig = {
    input: path.join(__dirname, "example.js"),
    output: {
      format: "es"
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      credits({ debug: true, whitelist: ["MIT"] })
    ]
  };

  rollup.rollup(rollupConfig).then(async bundle => {
    try {
      const {
        output: [{ code, map }]
      } = await bundle.generate({
        format: "es"
      });
      t.fail();
    } catch (e) {
      t.ok(
        e.message.includes("Non-whitelisted license detected in inherits: ISC"),
        "Got infringment"
      );
    }

    t.end();
  });
});
