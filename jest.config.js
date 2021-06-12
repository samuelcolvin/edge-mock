module.exports = {
  testRegex: '/tests/.*\\.test\\.tsx?$',
  collectCoverageFrom: ['src/**/*.ts'],
  preset: 'ts-jest',
  moduleDirectories: ['.', 'node_modules'],
}
