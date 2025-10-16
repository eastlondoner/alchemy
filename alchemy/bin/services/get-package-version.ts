import fs from "fs-extra";
import path from "node:path";
import { PKG_ROOT } from "../constants.ts";

export const getPackageVersion = async () => {
  const packageJsonPath = path.join(PKG_ROOT, "package.json");

  const packageJsonContent = await fs.readJSON(packageJsonPath);

  return packageJsonContent.version ?? "1.0.0";
};
