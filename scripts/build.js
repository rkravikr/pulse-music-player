const esbuild = require('esbuild');
const path = require('path');

const watchMode = process.argv.includes('--watch');

async function build() {
  const commonConfig = {
    bundle: true,
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    external: ['electron', 'better-sqlite3'],
    logLevel: 'info',
  };

  try {
    // Main process build
    const mainCtx = await esbuild.context({
      ...commonConfig,
      entryPoints: [path.join(__dirname, '../src/main/main.ts')],
      outfile: path.join(__dirname, '../dist/main/main.js'),
    });

    // Preload process build
    const preloadCtx = await esbuild.context({
      ...commonConfig,
      entryPoints: [path.join(__dirname, '../src/preload/preload.ts')],
      outfile: path.join(__dirname, '../dist/preload/preload.js'),
    });

    if (watchMode) {
      console.log('Watching for changes...');
      await mainCtx.watch();
      await preloadCtx.watch();
    } else {
      console.log('Building main and preload...');
      await mainCtx.rebuild();
      await preloadCtx.rebuild();
      
      await mainCtx.dispose();
      await preloadCtx.dispose();
      console.log('Build completed successfully.');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
