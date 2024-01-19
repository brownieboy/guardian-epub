const archiver = require("archiver");
const fs = require("fs");
const archive = archiver("zip");
const output = fs.createWriteStream("guardian-epub.zip");

archive.file("get-guardian.exe", { name: "bin/get-guardian.exe" });
archive.file("src/guardian-toc-html.ejs", {
  name: "bin/guardian-toc-html.ejs",
});
archive.file("src/guardian-toc-ncx.ejs", { name: "bin/guardian-toc-ncx.ejs" });
// Include the templates folder
archive.directory("node_modules/epub-gen/templates", "templates");

archive.finalize();

archive.pipe(output);

output.on("close", () => {
  console.log("Archive created successfully!");
});
