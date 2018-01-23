const test = require("tape");
const path = require("path");
const rollup = require("rollup");
const commonjs = require("rollup-plugin-commonjs");
const nodeResolve = require("rollup-plugin-node-resolve");
const credits = require("../");

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
    t.deepEqual(JSON.parse(code), [
      {
        license: { license: "MIT" },
        modules: {
          "James Halliday": [
            "tape",
            "defined",
            "deep-equal",
            "resumer",
            "object-inspect"
          ],
          "Jordan Harband": [
            "string.prototype.trim",
            "object-keys",
            "es-abstract",
            "is-callable"
          ]
        }
      },
      { license: { license: "ISC" }, modules: {} }
    ]);
    t.end();
  });
});
