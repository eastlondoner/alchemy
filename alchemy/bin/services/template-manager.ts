import { log, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as fs from "fs-extra";
import { globby } from "globby";
import * as path from "node:path";
import { join } from "node:path";

import { PKG_ROOT } from "../constants.ts";
import { throwWithContext } from "../errors.ts";
import type { ProjectContext } from "../types.ts";
import { addPackageDependencies } from "./dependencies.ts";
import { installDependencies, PackageManager } from "./package-manager.ts";

export async function copyTemplate(
  templateName: string,
  context: ProjectContext,
): Promise<void> {
  // Handle merge mode for bun-spa template
  if (context.mergeMode && templateName === "bun-spa") {
    await mergeBunSpaTemplate(context);
    return;
  }

  const templatePath = path.join(PKG_ROOT, "templates", templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template '${templateName}' not found at ${templatePath}`);
  }

  const filesToRename = [
    "_gitignore",
    "_npmrc",
    "_env",
    "_env.example",
    "_prettierignore",
  ];

  try {
    const s = spinner();
    s.start("Setting up project files...");

    const files = await globby("**/*", {
      cwd: templatePath,
      dot: true,
      followSymbolicLinks: false,
      gitignore: true,
    });

    for (const file of files) {
      const srcPath = join(templatePath, file);
      let destFile = file;

      const basename = path.basename(file);
      if (filesToRename.includes(basename)) {
        const newBasename = `.${basename.slice(1)}`;
        destFile = path.join(path.dirname(file), newBasename);
      }

      const destPath = join(context.path, destFile);

      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(srcPath, destPath);
    }

    await substituteProjectName(context);

    await updateTemplatePackageJson(context);

    await addPackageDependencies({
      devDependencies: ["alchemy"],
      projectDir: context.path,
    });

    s.stop("Project files ready");

    if (context.options.install !== false) {
      const installSpinner = spinner();
      installSpinner.start("Installing dependencies...");
      try {
        await installDependencies(context);
        installSpinner.stop("Dependencies installed");
      } catch (error) {
        installSpinner.stop("Failed to install dependencies");
        throw error;
      }
    }

    if (templateName === "rwsdk") {
      await handleRwsdkPostInstall(context);
    }
  } catch (error) {
    throwWithContext(error, `Failed to copy template '${templateName}'`);
  }
}

async function substituteProjectName(context: ProjectContext): Promise<void> {
  const alchemyFile = join(context.path, "alchemy.run.ts");
  const code = await fs.readFile(alchemyFile, "utf8");
  const newCode = code.replace("{projectName}", context.name);
  await fs.writeFile(alchemyFile, newCode);
}

async function updateTemplatePackageJson(
  context: ProjectContext,
): Promise<void> {
  const packageJsonPath = join(context.path, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = await fs.readJson(packageJsonPath);

  packageJson.name = context.name;

  if (packageJson.scripts) {
    packageJson.scripts.deploy = "alchemy deploy";
    packageJson.scripts.destroy = "alchemy destroy";
    packageJson.scripts.dev = "alchemy dev";
  }

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}

async function mergeBunSpaTemplate(context: ProjectContext): Promise<void> {
  const s = spinner();
  s.start("Adding Alchemy to existing Bun project...");

  try {
    // 1. Validate bunfig.toml exists or create it
    const bunfigPath = join(context.path, "bunfig.toml");
    if (!fs.existsSync(bunfigPath)) {
      // Create bunfig.toml with required config
      await fs.writeFile(bunfigPath, `[serve.static]\nenv='BUN_PUBLIC_*'\n`);
    } else {
      // Validate bunfig.toml has required config
      const bunfigContent = await fs.readFile(bunfigPath, "utf8");
      const hasBunPublicEnv =
        bunfigContent.includes("env") &&
        (bunfigContent.includes("BUN_PUBLIC_*") ||
          bunfigContent.includes("PUBLIC_*"));

      if (!hasBunPublicEnv) {
        throw new Error(
          "bunfig.toml must contain the following configuration:\n\n" +
            "[serve.static]\n" +
            "env='BUN_PUBLIC_*'\n\n" +
            "This is required for Alchemy to work with Bun SPA.",
        );
      }
    }

    // 2. Create alchemy.run.ts
    const templatePath = path.join(PKG_ROOT, "templates", "bun-spa");
    const alchemyRunSrc = join(templatePath, "alchemy.run.ts");
    const alchemyRunDest = join(context.path, "alchemy.run.ts");

    if (fs.existsSync(alchemyRunSrc)) {
      let content = await fs.readFile(alchemyRunSrc, "utf8");
      content = content.replace("{projectName}", context.name);
      await fs.writeFile(alchemyRunDest, content);
    }

    // 3. Copy types/env.d.ts for Cloudflare bindings
    const envDtsSrc = join(templatePath, "types", "env.d.ts");
    const envDtsDest = join(context.path, "types", "env.d.ts");

    if (fs.existsSync(envDtsSrc)) {
      await fs.ensureDir(path.dirname(envDtsDest));
      await fs.copy(envDtsSrc, envDtsDest);
    }

    // 5. Update package.json scripts
    const packageJsonPath = join(context.path, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);

      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      // Add/overwrite alchemy scripts
      packageJson.scripts.deploy = "alchemy deploy";
      packageJson.scripts.destroy = "alchemy destroy";
      packageJson.scripts.dev = "alchemy dev"; // Overwrite existing dev script

      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }

    // 6. Add alchemy to devDependencies
    await addPackageDependencies({
      devDependencies: ["alchemy"],
      projectDir: context.path,
    });

    s.stop("Alchemy added to existing Bun project");

    // 7. Install dependencies if requested
    if (context.options.install !== false) {
      const installSpinner = spinner();
      installSpinner.start("Installing dependencies...");
      try {
        await installDependencies(context);
        installSpinner.stop("Dependencies installed");
      } catch (error) {
        installSpinner.stop("Failed to install dependencies");
        throw error;
      }
    }
  } catch (error) {
    s.stop("Failed to add Alchemy to project");
    throwWithContext(
      error,
      "Failed to merge Alchemy into existing Bun project",
    );
  }
}

async function handleRwsdkPostInstall(context: ProjectContext): Promise<void> {
  try {
    const migrationsDir = join(context.path, "migrations");
    await fs.ensureDir(migrationsDir);

    const commands = PackageManager[context.packageManager];
    const devInitCommand = `${commands.run} dev:init`;

    if (context.options.install !== false) {
      await execa(devInitCommand, {
        cwd: context.path,
        shell: true,
      });
    } else {
      log.info(
        `To complete rwsdk setup, run: cd ${context.name} && ${devInitCommand}`,
      );
    }
  } catch (_error) {
    log.warn(
      "Failed to complete rwsdk setup. You may need to run 'dev:init' manually.",
    );
  }
}
