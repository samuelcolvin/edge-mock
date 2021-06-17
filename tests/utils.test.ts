import each from 'jest-each'
import {EdgeBlob} from '../src'
import {getType} from '../src/utils'

interface TestType {
  input: any
  expected: string
}
const types: TestType[] = [
  {input: [1, 2, 3], expected: 'Array'},
  {input: new EdgeBlob(['a']), expected: 'EdgeBlob'},
  {input: null, expected: 'Null'},
  {input: undefined, expected: 'Undefined'},
]

describe('getType', () => {
  each(types).test('types %O', async ({input, expected}: TestType) => {
    expect(getType(input)).toEqual(expected)
  })
})
