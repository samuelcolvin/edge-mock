import each from 'jest-each'
import {EdgeBlob, EdgeRequest} from 'edge-mock'
import {getType} from 'edge-mock/utils'

interface TestType {
  input: any
  expected: string
}
const types: TestType[] = [
  {input: null, expected: 'Null'},
  {input: undefined, expected: 'Undefined'},
  {input: false, expected: 'Boolean'},
  {input: 123, expected: 'Number'},
  {input: '123', expected: 'String'},
  {input: [1, 2, 3], expected: 'Array'},
  {input: new EdgeBlob(['a']), expected: 'EdgeBlob'},
  {input: new EdgeRequest(''), expected: 'EdgeRequest'},
]

describe('getType', () => {
  each(types).test('types %p', async ({input, expected}: TestType) => {
    expect(getType(input)).toEqual(expected)
  })
})
