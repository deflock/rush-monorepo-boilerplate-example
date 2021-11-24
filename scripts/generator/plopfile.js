const nodefs = require('fs');
const nodepath = require('path');
const execaSync = require('execa').sync;
const jju = require('jju');
const { RushConfiguration } = require('@microsoft/rush-lib');

const configCache = {};
let repoRootDir;

function getRushConfigPath(basedir) {
  if (!basedir) {
    throw new Error('Rush config base dir must be a non-empty string');
  }

  const path = RushConfiguration.tryFindRushJsonLocation({
    startingFolder: basedir,
  });

  if (!path) {
    throw new Error(`Rush configuration find cannot be found in: ${basedir}`);
  }

  return path;
}

/**
 * @param {string} basedir
 * @returns RushConfiguration
 */
function getRushConfig(basedir) {
  if (!basedir) {
    throw new Error('Rush config base dir must be a non-empty string');
  }
  if (!configCache[basedir]) {
    const path = getRushConfigPath(basedir);
    try {
      configCache[basedir] = RushConfiguration.loadFromConfigurationFile(path);
    } catch (e) {
      throw new Error(`Rush configuration at "${path}" cannot be loaded: ${e.message}`);
    }
  }
  return configCache[basedir];
}

/**
 * @returns string
 */
function getRepoRushConfigPath() {
  if (!repoRootDir) {
    throw new Error('Mono-repository root directory is not specified');
  }
  return getRushConfigPath(repoRootDir);
}

/**
 * @returns RushConfiguration
 */
function getRepoRushConfig() {
  if (!repoRootDir) {
    throw new Error('Mono-repository root directory is not specified');
  }
  return getRushConfig(repoRootDir);
}

/**
 * @param {RushConfiguration} config
 * @returns {RushConfigurationProject[]}
 */
function getRushProjects(config) {
  if (!config || !Array.isArray(config.projects)) {
    throw new Error(`Rush projects must be an array: malformed configuration: ${typeof config}`);
  }
  return [...config.projects];
}

/**
 * @param {RushConfiguration} config
 * @returns {string[]}
 */
function getRushProjectCategories(config) {
  if (
    !config ||
    !config.approvedPackagesPolicy ||
    !config.approvedPackagesPolicy.reviewCategories
  ) {
    throw new Error(
      `Rush project categories could not be found: malformed configuration: ${typeof config}`,
    );
  }
  return [...config.approvedPackagesPolicy.reviewCategories];
}

/**
 * @param {RushConfiguration} config
 * @returns string[]
 */
function getRushProjectsPackageNames(config) {
  return getRushProjects(config).map((project) => project.packageName);
}

/**
 * @param {RushConfiguration} config
 * @returns string[]
 */
function getRushProjectsPackageScopes(config) {
  const scopes = new Set();

  for (const pkgname of getRushProjectsPackageNames(config)) {
    const slashPos = pkgname.indexOf('/');

    if (slashPos > 1 && pkgname.indexOf('@') === 0) {
      scopes.add(pkgname.substr(0, slashPos));
    }
  }

  return [...scopes];
}

/**
 * @param {string} packageName
 * @returns boolean
 */
function rushProjectExists(packageName) {
  return getRushProjectsPackageNames(getRepoRushConfig()).indexOf(packageName) > -1;
}

/**
 * @param {{name: string, scope?: string}} parts
 * @returns string
 */
function makePackageName(parts) {
  if (typeof parts !== 'object' || typeof parts.name !== 'string' || parts.name.trim() === '') {
    throw new Error('Package name cannot be empty');
  }
  return typeof parts.scope === 'string' && parts.scope.trim() !== ''
    ? `${parts.scope.trim()}/${parts.name.trim()}`
    : parts.name.trim();
}

/**
 * @param {{name: string, scope?: string, newscope?: string}} answers
 * @returns string
 */
function makePackageNameUsingAnswers(answers) {
  return makePackageName({
    name: answers.name,
    scope: typeof answers.scope === 'string' ? answers.scope : answers.newscope,
  });
}

/**
 * @param {Object} answers
 * @returns Object
 */
function makeRushProjectEntryUsingAnswers(answers) {
  return {
    packageName: answers.packageName,
    projectFolder: answers.dir,
    reviewCategory: answers.category,
    shouldPublish: answers.publishable,
  };
}

/**
 * @param {string} filepath
 * @param {function} modifier
 */
function modifyJsonFile(filepath, modifier) {
  if (!filepath || !nodefs.existsSync(filepath)) {
    throw new Error(`File "${filepath}" does not exist`);
  }

  const content = nodefs.readFileSync(filepath, 'utf-8');

  const parsed = jju.parse(content, { mode: 'cjson' });
  const analyzed = jju.analyze(content, { mode: 'cjson' });

  const modified = jju.update(content, modifier(parsed), {
    mode: 'cjson',
    indent: analyzed.indent,
    quote: analyzed.quote,
    quote_keys: analyzed.quote_keys,
    no_trailing_comma: true,
  });

  if (content !== modified) {
    nodefs.writeFileSync(filepath, modified);
  }
}

/**
 * @param {object} parameters
 * @param {string} sort
 * @returns void
 */
function addRepoRushProject(parameters, sort) {
  const alphabeticalSorter = (str1, str2) => {
    const s1 = str1.toUpperCase();
    const s2 = str2.toUpperCase();

    if (s1 == s2) {
      return 0;
    }

    return s1 < s2 ? -1 : 1;
  };

  const path = getRepoRushConfigPath();

  if (!path) {
    throw new Error(`Rush configuration cannot be found`);
  }

  modifyJsonFile(path, (parsed) => {
    if (!Array.isArray(parsed.projects)) {
      parsed.projects = [];
    }

    const index = parsed.projects.findIndex((p) => p.packageName === parameters.packageName);

    if (index > -1) {
      parsed.projects[index] = parameters;
    } else {
      parsed.projects.push(parameters);
    }

    if (sort === 'category-order') {
      parsed.projects = getRushProjectCategories(getRepoRushConfig()).reduce(
        (result, category) => [
          ...result,
          ...parsed.projects
            .filter((p) => p.reviewCategory === category)
            .sort((p1, p2) => alphabeticalSorter(p1.packageName, p2.packageName)),
        ],
        [],
      );
    } else if (sort === 'alphabetically') {
      parsed.projects.sort((p1, p2) => alphabeticalSorter(p1.packageName, p2.packageName));
    }

    return parsed;
  });
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 */
function runSyncInRepoRoot(command, args = [], options = {}) {
  return execaSync(command, args, {
    cwd: nodepath.dirname(getRepoRushConfigPath()),
    ...options,
  });
}

/**
 * @param {string} rushCommand
 * @param {string[]} extraArgs
 * @param {object} options
 */
function runRushCommand(rushCommand, extraArgs = [], options = {}) {
  return runSyncInRepoRoot('rush', [rushCommand, ...extraArgs], {
    stdio: 'inherit',
    ...options,
  });
}

/**
 * @param {import('plop').NodePlopAPI} plop
 * @param {import('plop').PlopCfg} cfg
 */
module.exports = function (plop, cfg) {
  repoRootDir = plop.getDestBasePath();

  plop.setGenerator('new', {
    description: 'Create new monorepo project',
    prompts: [
      {
        name: 'category',
        type: 'list',
        message: 'Enter project category',
        choices: () => getRushProjectCategories(getRepoRushConfig()),
        bypass: (value) => value,
      },
      {
        name: 'scope',
        type: 'list',
        message: 'Select package scope',
        choices: () => {
          return [
            ...getRushProjectsPackageScopes(getRepoRushConfig()),
            { name: 'No scope', value: '' },
            { name: 'I will enter another one', value: null },
          ];
        },
        bypass: (value) => value,
      },
      {
        name: 'newscope',
        type: 'input',
        message: 'Enter package scope',
        when: (answers) => answers.scope == null,
        filter: (value) => `${value.trim().substr(0, 1) === '@' ? '' : '@'}${value.trim()}`,
        validate: (value) => value.length > 1 || 'Please enter correct scope',
      },
      {
        name: 'name',
        type: 'input',
        message: 'Enter name',
        filter: (value) => value.trim(),
        validate: (value, answers) => {
          if (value === '') {
            return 'Enter non-empty value';
          }

          const packageName = makePackageNameUsingAnswers({ ...answers, name: value });

          if (rushProjectExists(packageName) && !cfg.force) {
            return `Project "${packageName}" already exists`;
          }

          return true;
        },
      },
      {
        name: 'overwrite',
        type: 'confirm',
        message: 'Project already exists and will be overwritten. Continue?',
        default: false,
        when: (answers) => rushProjectExists(makePackageNameUsingAnswers(answers)),
      },
      {
        name: '_abort',
        type: 'input',
        message: 'Project already exists and will be overwritten. Continue?',
        default: () => {
          console.warn(`Aborted.`);
          process.exit(0);
        },
        when: (answers) => answers.overwrite === false,
      },
      {
        name: 'dir',
        type: 'input',
        message: 'Enter project sub-directory',
        default: (answers) =>
          [answers.category, answers.name]
            .filter((item) => typeof item === 'string' && item !== '')
            .join('/'),
        filter: (value) => value.trim(),
        validate: (value) => value !== '',
      },
      {
        name: 'typescript',
        type: 'confirm',
        message: 'Add TypeScript configuration?',
        default: true,
      },
      {
        name: 'publishable',
        type: 'confirm',
        message: 'Will this project be published?',
        default: false,
      },
      {
        name: 'projectPosition',
        type: 'list',
        message: 'Should we add new project to Rush configuration?',
        choices: [
          {
            value: 'category-order',
            name: 'Yes, and sort all projects using order from category list',
          },
          {
            value: 'alphabetically',
            name: 'Yes, and sort all projects alphabetically by package name',
          },
          {
            value: 'append',
            name: 'Yes, just append',
          },
          {
            value: 'skip',
            name: 'No, do nothing',
          },
        ],
        default: 'category-order',
      },
      {
        name: 'rushUpdate',
        type: 'confirm',
        message: 'Run rush update?',
        default: (answers) => answers.projectPosition !== 'skip',
      },
    ],
    actions: (answers) => {
      answers.packageName = makePackageNameUsingAnswers(answers);

      const addProjectFileAction = (filename) => ({
        type: 'add',
        templateFile: `templates/project/${filename}.hbs`,
        path: `${answers.dir}/${filename}`,
      });

      const actions = [];

      actions.push(addProjectFileAction('.editorconfig'));
      actions.push(addProjectFileAction('.gitignore'));

      actions.push(addProjectFileAction('.eslintignore'));
      actions.push(addProjectFileAction('.eslintrc.cjs'));

      actions.push(addProjectFileAction('.prettierignore'));
      actions.push(addProjectFileAction('.prettierrc.cjs'));

      if (answers.typescript) {
        actions.push(addProjectFileAction('tsconfig.json'));
      }

      actions.push(addProjectFileAction('package.json'));

      if (answers.projectPosition !== 'skip') {
        actions.push((answers) => {
          addRepoRushProject(makeRushProjectEntryUsingAnswers(answers), answers.projectPosition);
          return `New project "${answers.packageName}" added to Rush configuration`;
        });
      }

      if (answers.rushUpdate) {
        actions.push(() => {
          const result = runRushCommand('update');
          return `Command "${result.command}" finished successfully`;
        });
      }

      return actions;
    },
  });
};
