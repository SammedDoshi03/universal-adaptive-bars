---
description: How to publish the smart-bar-chart package to npm
---

# Publish to npm

 Follow these steps to publish your library to the npm registry.

## 1. Prerequisites
- You must have an [npm account](https://www.npmjs.com/signup).
- You must check if the package name `smart-bar-chart` is available.
  - *Tip*: If it is taken, rename it in `package.json` to something unique (e.g., `@your-username/smart-bar-chart`).

## 2. Login to npm
Authenticates your local machine with the registry.
```bash
npm login
```

## 3. Build the Project
Ensure the `dist/` folder is fresh and operational.
```bash
// turbo
npm run build
```

## 4. Run Tests
Never ship broken code!
```bash
// turbo
npm test -- --run
```

## 5. Version Bump
Update the version number in `package.json` (e.g., 0.0.1 -> 0.0.2).
```bash
# Options: patch (0.0.2), minor (0.1.0), major (1.0.0)
npm version patch
```

## 6. Publish
Uploads the package to npm.
```bash
# If using a scoped package (e.g. @user/pkg), add --access public
npm publish --access public
```
