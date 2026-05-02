const fs = require("fs");
const path = require("path");

describe("scan.sh payload contract", () => {
  test("includes required JSON fields", () => {
    const scriptPath = path.resolve(__dirname, "../../detection/scan.sh");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain('"clients"');
    expect(content).toContain('"bt_devices"');
    expect(content).toContain('"density"');
    expect(content).toContain('"timestamp"');
  });
});
