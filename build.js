const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { version } = require("./package.json");

const MAIN_JS_PATH = path.resolve(__dirname, "./dist/main.js");
const PLUGIN_NAME = `bob-plugin-volc_v${version}.bobplugin`;
const ARTIFACT_PATH = path.resolve(__dirname, `./release/${PLUGIN_NAME}`);

const INFO_JSON = {
  identifier: "com.maybelab.volc",
  version: version,
  category: "translate",
  name: "火山引擎机器翻译",
  author: "shoyuf",
  homepage: "https://github.com/maybeLab/bob-plugin-volc",
  minBobVersion: "0.8.0",
  options: [
    {
      identifier: "id",
      type: "text",
      title: "Access Key ID",
      defaultValue: "",
    },
    {
      identifier: "key",
      type: "text",
      title: "Secret Access Key",
      defaultValue: "",
    },
  ],
  appcast: "https://cdn.jsdelivr.net/gh/maybeLab/bob-plugin-volc@main/appcast.json",
};

const isRelease = process.argv.includes("--release");

const initAppcast = () => {
  const fileBuffer = fs.readFileSync(ARTIFACT_PATH);
  const sum = crypto.createHash("sha256");
  sum.update(fileBuffer);
  const hex = sum.digest("hex");
  const currentVersionInfo = {
    version,
    desc: `更新内容见: https://github.com/maybeLab/bob-plugin-volc/releases`,
    sha256: hex,
    url: `https://cdn.jsdelivr.net/gh/maybeLab/bob-plugin-volc@main/release/${PLUGIN_NAME}`,
    minBobVersion: INFO_JSON.minBobVersion,
  };
  let appcastPath = path.resolve(__dirname, "./appcast.json");
  const appcast = JSON.parse(fs.readFileSync(appcastPath, "utf-8"));
  if (!appcast.version.find((item) => item.version === currentVersionInfo.version)) {
    appcast.version.push(currentVersionInfo);
    fs.writeFileSync(appcastPath, JSON.stringify(appcast, null, 2), { encoding: "utf-8" });
  }
};

const createZip = () => {
  const zip = new AdmZip();
  zip.addLocalFile(MAIN_JS_PATH);
  ["icon.png"].forEach((file) => {
    zip.addLocalFile(`./static/${file}`);
  });
  zip.addFile("info.json", JSON.stringify(INFO_JSON));
  zip.writeZip(isRelease ? ARTIFACT_PATH : path.relative(__dirname, `./dist/${PLUGIN_NAME}`));
  console.log(new Date(), "Zip created");
  isRelease && initAppcast();
};

require("esbuild")
  .build({
    entryPoints: ["./src/entry.ts"],
    bundle: true,
    platform: "node",
    treeShaking: false,
    outfile: MAIN_JS_PATH,
    watch: isRelease
      ? false
      : {
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
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
