/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-routes-to-prisma',
      comment: 'Routes must access data through services, not Prisma directly',
      severity: 'error',
      from: { path: 'packages/relay/src/routes' },
      to: { path: '@prisma/client' },
    },
    {
      name: 'no-services-to-routes',
      comment: 'Services must not import from routes (inversion of dependency)',
      severity: 'error',
      from: { path: 'packages/relay/src/services' },
      to: { path: 'packages/relay/src/routes' },
    },
    {
      name: 'not-to-test',
      comment: 'Source code must not import from test files',
      severity: 'error',
      from: { path: 'packages/.*/src' },
      to: { path: 'packages/.*/test' },
    },
    {
      name: 'no-circular',
      comment: 'No circular dependencies',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: ['node_modules', 'dist', 'build', 'artifacts', '.next', 'generated'],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+' },
    },
  },
}
