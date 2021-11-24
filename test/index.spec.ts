import { helloWorld } from './../src'
import { expect } from 'chai'

describe('helloWorld', () => {
    it('Should return greetings', () => {
        expect(helloWorld()).equals("Hello from pakage!");
    })
})