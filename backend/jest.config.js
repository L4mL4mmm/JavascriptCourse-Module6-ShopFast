module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.(t|j)s',
    '!src/main.(t|j)s',
    '!src/database/**',
    '!src/config/**',
    '!src/**/*.dto.(t|j)s',
    '!src/**/dto/**',
    '!src/**/entities/**',
    '!src/**/enums/**',
    '!src/**/*.constants.(t|j)s',
    '!src/**/redis-io.adapter.(t|j)s',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
};
