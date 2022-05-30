# mlcl

Command line tools to help with managing full-stack, cross-platform apps assembled with [Molecule.dev](https://www.molecule.dev).


## Usage

You will need SSH, [Git](https://git-scm.com/), and [Node.js 16](https://nodejs.org/) installed on your machine.

The recommended way to use `mlcl` is via [`npx`](https://nodejs.dev/learn/the-npx-nodejs-package-runner) by passing `mlcl` commands to `npx`.

Example:

```sh
npx mlcl --help
```

You can also install it globally if you'd rather not use `npx`:

```sh
npm install mlcl --global
mlcl --help
```


## User commands

- **`mlcl login`**

    Opens your default web browser where you'll be asked for permission to log into your Molecule.dev account within your terminal.


- **`mlcl logout`**

    Logs you out of your Molecule.dev account by deleting the authorization headers, usually stored within `.mlclrc.json` within your home directory.


- **`mlcl add-ssh-key [path]`**

    For licensed users only. Looks for your current device's public SSH key, defaulting to a path of `~/.ssh/id_*.pub`, and sends it to our servers to allow you to access premium (private) repositories. If a key cannot be found, it will attempt to generate a new one using `ssh-keygen`.


- **`mlcl remove-ssh-key`**

    For licensed users only. Removes your current device's public SSH key from our servers.


## Molecule commands

These commands (with the exception of `clone`) must be run within a directory containing a Molecule repository, determined by the presence of a valid `.mlclrc.json` file.


- **`mlcl info`**

    Opens your Molecule's information page in your default web browser.


- **`mlcl clone <moleculeId> [projectName]`**

    Clones your Molecule's relevant repositories into `project-name-api` and/or `project-name-app` directories. Adds the necessary `.mlclrc.json` file to each directory.

    If you are not logged in, it will attempt to log you in.

    If you are a licensed user, it will attempt to add your SSH key if not already added, and your repositories will be cloned using Molecule.dev's premium (private) repositories.

    If you are a free or subscribed user, your repositories will be cloned using Molecule.dev's public repositories [available on GitHub](https://github.com/molecule-dev).


- **`mlcl subscribe`**

    Enables a monthly subscription for your Molecule.

    If you have previously subscribed, it will attempt to reactivate your Stripe subscription. Otherwise, a Stripe checkout page will be opened in your default web browser.


- **`mlcl unsubscribe`**

    Disables your Molecule's monthly subscription. You will be able to continue using subscribers' features until the monthly period ends.


- **`mlcl buy single`**

    Opens a Stripe checkout page in your default web browser where you can purchase a single license for your current Molecule.


- **`mlcl buy unlimited`**

    Opens a Stripe checkout page in your default web browser where you can purchase an unlimited license for your current Molecule.


- **`mlcl buy business <number>`**

    Requires at least 10. Opens a Stripe checkout page in your default web browser where you can purchase a business license, allowing you to assemble any Molecule as needed.


## Other commands

- **`mlcl x-merge-json`**

    A [custom git merge driver](https://git-scm.com/docs/gitattributes#_defining_a_custom_merge_driver) used for automatically resolving merge conflicts for JSON files when assembling Molecules.

