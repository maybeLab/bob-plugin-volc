const AdmZip = require("adm-zip");
const { version } = require("./package.json");
const createZip = () => {
  const zip = new AdmZip();
  zip.addLocalFile(`./dist/main.js`);
  ["icon.png", "info.json"].forEach((file) => {
    zip.addLocalFile(`./static/${file}`);
  });
  zip.writeZip(`./dist/bob-plugin-volc_v${version}.bobplugin`);
  console.log(new Date(), "Zip created");
};

require("esbuild")
  .build({
    entryPoints: ["./src/entry.ts"],
    bundle: true,
    platform: "node",
    treeShaking: false,
    outfile: "./dist/main.js",
    watch: {
      onRebuild(error, result) {
        if (error) {
          console.error("watch build failed:", error);
        } else {
          console.log("watch build succeeded:", result);
          createZip();
        }
      },
    },
  })
  .then(() => {
    createZip();
  })
  .catch(() => process.exit(1));
