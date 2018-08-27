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
    const { code, map } = await bundle.generate({ format: "es" });
    t.deepEqual(JSON.parse(code.replace(/^export default/, "")), [
      {
        license: { license: "MIT" },
        modules: [
          {
            author: "James Halliday",
            modules: [
              "tape",
              "defined",
              "deep-equal",
              "resumer",
              "object-inspect"
            ]
          },
          { author: "Dominic Tarr", modules: ["through"] },
          { author: "Raynos", modules: ["function-bind"] },
          {
            author: "Jordan Harband",
            modules: [
              "string.prototype.trim",
              "define-properties",
              "object-keys",
              "es-abstract",
              "is-callable",
              "es-to-primitive"
            ]
          },
          { author: "Manuel Stofer", modules: ["foreach"] },
          { author: "Stephen Sugden", modules: ["is-function"] },
          {
            author: "Marijn Haverbeke and Ingvar Stepanyan",
            modules: ["acorn"]
          },
          { author: "Blake Embrey", modules: ["path-to-regexp"] }
        ]
      },
      {
        license: { license: "ISC" },
        modules: [{ author: "Isaac Z. Schlueter", modules: ["inherits"] }]
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
      const { code, map } = await bundle.generate({ format: "es" });
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
