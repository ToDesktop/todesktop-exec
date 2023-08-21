var fs = require("fs");

fs.readFile("./dist/generated/preload.d.ts", "utf8", function (err, data) {
  if (err) {
    return;
  }
  var result = data.replace(/declare class/g, "export declare class");

  fs.writeFile("./dist/generated/preload.d.ts", result, "utf8", function (err) {
    if (err) return;
  });
});
