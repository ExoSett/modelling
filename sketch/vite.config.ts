import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const embeddedBuild = mode === 'embed';

  return {
    base: './',
    build: embeddedBuild
      ? {
          target: 'es2022',
          outDir: 'dist-embed',
          chunkSizeWarningLimit: 600,
          lib: {
            entry: 'src/main.ts',
            formats: ['es'],
            fileName: 'sketch',
            cssFileName: 'sketch',
          },
        }
      : {
          target: 'es2022',
          chunkSizeWarningLimit: 600,
        },
    test: {
      environment: 'jsdom',
      exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', 'dist-embed/**'],
      coverage: {
        reporter: ['text', 'html'],
      },
    },
  };
});
