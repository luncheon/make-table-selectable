import fs from "node:fs/promises";
import zlib from "node:zlib";

import dtsBundleGenerator from "dts-bundle-generator";
import esbuild from "esbuild";

if (process.cwd() !== import.meta.dirname) {
  console.error("incorrect working directory");
  process.exit(1);
}

await Promise.all([fs.rm("index.js", { force: true }), fs.rm("index.d.ts", { force: true })]);

/** @type esbuild.BuildOptions */
const esbuildOptions = {
  entryPoints: ["src/index.ts"],
  outfile: "index.js",
  format: "esm",
  bundle: true,
};

if (process.argv.includes("serve")) {
  const context = await esbuild.context({ ...esbuildOptions, write: false });
  const { port } = await context.serve({ host: "127.0.0.1", port: 8000, servedir: "." });
  console.log(`  http://localhost:${port}/demo.html`);
} else {
  esbuild.build(esbuildOptions).then(async () => {
    const built = await esbuild.build({ entryPoints: ["index.js"], minify: true, write: false });
    const content = built.outputFiles[0].contents;
    console.log(`  index.js: ${zlib.gzipSync(content, { level: 9 }).byteLength} bytes (min + gzip)`);
  });

  const dtsBundles = dtsBundleGenerator.generateDtsBundle([
    {
      filePath: "src/index.ts",
      output: {
        noBanner: true,
        exportReferencedTypes: false,
      },
    },
  ]);
  fs.writeFile("index.d.ts", dtsBundles[0], "utf8");
}
