import assert from 'assert';
import * as analyzer from '../src/js/code-analyzer';
import {generate} from 'escodegen';

describe('The javascript parser', () => {
    let dict = {};

    it('test 1: is removing a let statement correctly', () => {
        let fun = analyzer.parseCode('function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '}');
        let args = analyzer.parseCode('');
        assert.deepEqual(
            analyzer.eval_func(fun, args, {}),
            analyzer.parseCode('function foo(x, y, z) {\n' +
                '}')
        );
    });

    it('test 2: adding a let statement correctly to dictionary', () => {
        let fun = analyzer.parseCode('function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '}');
        analyzer.extract_symbols(fun, dict, {});
        assert.deepEqual(
            dict,
            {a: 'x + 1'}
        );
    });

    it('test 3: testing substitute of one variable', () => {
        let fun = analyzer.parseCode('function foo(){\n' +
            '    return a;\n' +
            '}');
        let args_dict = {};
        let dict = {a: '7'};
        analyzer.substitute_symbols(fun, dict, args_dict);
        assert.deepEqual(
            generate(fun),
            generate(analyzer.parseCode('function foo() {\n' +
                '    return 7;\n' +
                '}'))
        );
    });

    it('test 4: testing function with if statement', () => {
        let fun = analyzer.parseCode('function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '    if(a > 0)\n' +
            '        return a + z;\n' +
            '}');
        let args = analyzer.parseCode('(x=1, y=2, z=3)');
        assert.deepEqual(
            generate(analyzer.eval_func(fun, args, {})),
            generate(analyzer.parseCode('function foo(x, y, z) {\n' +
                '    if (x + 1 > 0)\n' +
                '        return x + 1 + z;\n' +
                '}'))
        );
    });

    it('test 5: testing function with while statement', () => {
        let fun = analyzer.parseCode('function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +
            '    let c = 0;\n' +
            '    \n' +
            '    while (a < z) {\n' +
            '        c = a + b;\n' +
            '        z = c * 2;\n' +
            '    }\n' +
            '    \n' +
            '    return z;\n' +
            '}');
        let args = analyzer.parseCode('(x=1, y=2, z=3)');
        assert.deepEqual(
            generate(analyzer.eval_func(fun, args, {})),
            generate(analyzer.parseCode('function foo(x, y, z) {\n' +
                '    while (x + 1 < z) {\n' +
                '        z = x + 1 + x + 1 + y * 2;\n' +
                '    }\n' +
                '    return z;\n' +
                '}'))
        );
    });

    it('test 6: testing function with multiple conditions - without arguments', () => {
        let fun = analyzer.parseCode('function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +
            '    let c = 0;\n' +
            '    \n' +
            '    if (b < z) {\n' +
            '        c = c + 5;\n' +
            '        return x + y + z + c;\n' +
            '    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n' +
            '        return x + y + z + c;\n' +
            '    } else {\n' +
            '        c = c + z + 5;\n' +
            '        return x + y + z + c;\n' +
            '    }\n' +
            '}');
        let args = analyzer.parseCode('');
        assert.deepEqual(
            generate(analyzer.eval_func(fun, args, {})),
            generate(analyzer.parseCode('function foo(x, y, z) {\n' +
                '    if (x + 1 + y < z) {\n' +
                '        return x + y + z + 5;\n' +
                '    } else if (x + 1 + y < z * 2) {\n' +
                '        return x + y + z + 0 + x + 5;\n' +
                '    } else {\n' +
                '        return x + y + z + 0 + z + 5;\n' +
                '    }\n' +
                '}'))
        );
    });

    it('test 7: testing function with multiple conditions - with arguments', () => {
        let fun = analyzer.parseCode('function foo(x, y, z){\n' +
            '    let a = x + 1;\n' +
            '    let b = a + y;\n' +
            '    let c = 0;\n' +
            '    \n' +
            '    if (b < z) {\n' +
            '        c = c + 5;\n' +
            '        return x + y + z + c;\n' +
            '    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n' +
            '        return x + y + z + c;\n' +
            '    } else {\n' +
            '        c = c + z + 5;\n' +
            '        return x + y + z + c;\n' +
            '    }\n' +
            '}');
        let args = analyzer.parseCode('x=1, y=2, z=3');
        assert.deepEqual(
            generate(analyzer.eval_func(fun, args, {})),
            generate(analyzer.parseCode('function foo(x, y, z) {\n' +
                '    if (x + 1 + y < z) {\n' +
                '        return x + y + z + 5;\n' +
                '    } else if (x + 1 + y < z * 2) {\n' +
                '        return x + y + z + 0 + x + 5;\n' +
                '    } else {\n' +
                '        return x + y + z + 0 + z + 5;\n' +
                '    }\n' +
                '}'))
        );
    });

    it('test 8: testing evaluation of conditions', () => {
        let cond = analyzer.parseCode('(2 + 1 > 1)');
        assert.deepEqual(
            analyzer.eval_cond(cond, {}),
            true
        );
    });

    it('test 9: testing evaluation of conditions', () => {
        let cond = analyzer.parseCode('(2 + 1 < 1)');
        assert.deepEqual(
            analyzer.eval_cond(cond, {}),
            false
        );
    });

    it('test 10: testing evaluation of conditions with arguments', () => {
        let cond = analyzer.parseCode('(x + 1 < y)');
        let args_dict = {x: 1, y: 6};
        assert.deepEqual(
            analyzer.eval_cond(cond, args_dict),
            true
        );
    });
});
