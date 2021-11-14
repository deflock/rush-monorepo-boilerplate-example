Rush monorepo example
=====================

[Rush](https://rushjs.io/) — a professional solution for consolidating *all* your Javascript/TypeScript projects in *one* repository. It can install, link, and build projects, generate changelogs, publish, and bump versions. It comes from Microsoft. It's free and open source.

[pnpm](https://pnpm.io/) — fast, disk space efficient package manager for Node.js. It's strict, deterministic, has built-in support for workspaces. It works great for monorepositories. And it works everywhere: Windows, Linux, macOS.

Features
--------

* Customizable ESLint configs
* Customizable Prettier configs
* Optional TypeScript configs
* Some base scripts to make monorepo work

Usage
-----

The only thing you need to start is [Node.js](https://nodejs.org/) 12 or higher.

1. Clone or download (recommended) this repository.
2. Find and replace all `myscope` occurrences to your scope (e.g. organization name). Of course you can also remove `myscope` for any project.
3. Just run `./scripts/setup.sh`.
4. That's it.

Now you have a monorepository you can start to work with.

Base scripts to use
-------------------

* `./scripts/monorepo/rush` - uses locally-installed version of Rush. This way all developers will use the same version. It's highly recommended to use this one instead of globally-installed Rush.
* `./scripts/monorepo/pnpm` - Rush-aware runner for pnpm. Some pnpm commands are not compatible with Rush, some of them require Rush's `update` command.

To make these scripts handy you can use a tool like [direnv](https://direnv.net/). By adding `./scripts/monorepo/` directory to `$PATH` it will be possible to use more convenient short `rush` and `pnpm` commands.

Repository structure
--------------------

This structure is a default one. You are able to modify it as you wish.

```
<repo-root>/
|
╰- apps/
|  ╰- <app-name>/
|     |- src/
|     |- ...
|     ╰- package.json
|
╰- common/
|  |- config/
|  |  ╰- rush/
|  ╰- git-hooks/
|
╰- libs/
|  ╰- <lib-name>/
|     |- src/
|     |- ...
|     ╰- package.json
|
╰- scripts/
|  ╰- monorepo/
|  |  |- ...
|  |  ╰- package.json
|  ╰- shared/
|     |- ...
|     ╰- package.json
|
╰- tools/
|
╰- rush.json
```

Adding new project to monorepo
------------------------------

For now there is no automated way for doing this. 

Instead you can:

1. Copy-paste `scripts-shared` project into `apps/` or `libs/`.
2. Change its package name in `package.json`.
3. Optionally add dependencies.
4. Add this new project to `projects` in `./rush.json`.
5. Run `./scripts/monorepo/rush update`.

License
-------

MIT
