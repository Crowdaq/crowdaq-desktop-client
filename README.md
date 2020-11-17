# Crowdaq Client

## Install

```bash
yarn
```

## Starting Development

Start the app in the `dev` environment. This starts the renderer process in [**hot-module-replacement**](https://webpack.js.org/guides/hmr-react/) mode and starts a webpack dev server that sends hot updates to the renderer process:

```bash
yarn dev
```

## Packaging for Production

To package apps for the local platform:

```bash
yarn package
# or yarn package-mac
# or yarn package-win
# or yarn package-linux
```

Once `yarn package` is successful, you can go into the `./release/` folder and double-click on the `dmg` file (on Mac) to install this software.

## License
MIT
