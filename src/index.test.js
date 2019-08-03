const { parse, evaluate } = require('./index');

parseEval = exp => evaluate(parse(exp));

test('Happy path', () => {
    expect(parseEval('1 + 2')).toBe(3);
});

test('Handles variables', () => {
    const vars = {
        a: 3,
        pi: Math.PI,
    };

    const AST = parse('a * pi^2');
    const answer = vars.a * Math.pow(Math.PI, 2);

    expect(evaluate(AST, vars)).toBe(answer);
});

test('Handles functions', () => {
    expect(parseEval('max(1, 3, sin(1))')).toBe(3);
});

test('Order of operations', () => {
    const exp = '5+3.12*2^4/1+3*(19-3)';

    expect(parseEval(exp)).toBe(102.92);
});

test('With custom functions', () => {
    let AST = parse('add5(3)');

    const factorial = n => n <= 1 ? n : n * factorial(n - 1);

    const customFunctions = {
        fact: {
            fn: factorial,
            length: 1,
        },
        add5: {
            fn: a => a + 5,
            length: 1,
        },
    };

    let answer = evaluate(AST, null, customFunctions);
    expect(answer).toBe(8);

    AST = parse('fact(5)');
    answer = evaluate(AST, null, customFunctions);
    expect(answer).toBe(120);
});

test('Error on unknown var', () => {
    expect(() => parseEval('a'))
        .toThrow('Unknown variable: "a"');
});

test('Error on unknown function', () => {
    expect(() => parseEval('a(2)'))
        .toThrow('Unknown function: "a"');
});

test('Error on div by zero', () => {
    expect(() => parseEval('1 / 0'))
        .toThrow('Division by zero');
});

test('Error on mismatched parens', () => {
    expect(() => parseEval('(1+2))'))
        .toThrow('Unexpected ")"');

    expect(() => parseEval('((1+2)'))
        .toThrow('Unexpected end of input');
});

test('Error on wrong number of arguments', () => {

    const customFunctions = {
        multiply3: {
            fn: (a, b, c) => a * b * c,
            length: 3,
        },
    };

    let AST = parse('multiply3(3, 4)');
    const run = () => evaluate(AST, null, customFunctions);

    expect(run).toThrow('Function "multiply3" expected 3 arguments, but got 2');

    AST = parse('multiply3(3, 4, 5, 6, 7)');

    expect(run).toThrow('Function "multiply3" expected 3 arguments, but got 5');

    AST = parse('multiply3(3, 4, 5)');

    expect(run()).toBe(60);
});
