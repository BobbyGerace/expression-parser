const binaryOperators = {
    '-': 2,
    '+': 1,
    '*': 3,
    '/': 4,
    '^': 5,
};

const unaryOperators = {
    '-': 6
};

const variableChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
const d = '1234567890.';

/*
  The following classes define an Abstract Syntax Tree, returned by the parse function
*/
class Node {
    constructor(v) {
        this.value = v;
    }

    getPrecedence() {
        error('Invalid syntax')
    }
}

//Unary operator
class UnOp extends Node {
    constructor(v, left) {
        super(v);
        this.left = left;
    }

    getPrecedence() {
        return unaryOperators[this.value];
    }

    setOperands(left) {
        this.left = left;
    }
}

//Binary operator
class BinOp extends UnOp {
    constructor(v, left, right) {
        super(v, left);
        this.right = right;
    }

    getPrecedence() {
        return binaryOperators[this.value];
    }

    setOperands(left, right) {
        this.left = left;
        this.right = right;
    }
}

class Var extends Node { }
class Num extends Node { }

class Func extends Node {
    constructor(v, length) {
        super(v);
        this.length = length;
        this.args = [];
    }

    pushArg(a) {
        //Unshift instead of push because we get
        //the args in reverse order
        this.args.unshift(a);
    }

    getPrecedence() {
        //Functions should always have higher precedence than any other operator
        return Infinity;
    }
}

// The sentinel acts as the left parenthesis in the Shunting Yard algorithm
// Therefore, it needs to have lower precedence than any other operator
class Sentinel extends Node {
    getPrecedence() {
        return -Infinity;
    }
}

// Sentinel holds no information, so we can just use the same object every
// time. We instantiate that here for convenience
const sentinel = new Sentinel('s');

/*
  The parse function uses a recursive descent algorithm, along with the Shunting Yard algorithm,
  to produce an Abstract Syntax Tree. In the function below,
  the function names correspond to different parts of the grammer:

    E --> P {B P}
    P --> v | "(" E ")" | U P | F
    F --> f "(" {E ","} ")"
    B --> "+" | "-" | "*" | "/" | "^"
    U --> "-"
    
    in which v is either a variable name and a constant,
    and f is a function name
*/
class Parser {
    constructor(inp) {
        this.rest = inp;
        this.next = '';
        this.consume();
        this.operands = [];
        this.operators = [];
    }

    parse() {
        this.operators.push(sentinel);

        //Parse an expression and expect no more input
        this.E();
        this.expect('');
        return this.operands.pop();
    }

    // E --> P {B P}
    // First parse one P, then 0 or more binary operators followed
    // by another P
    E() {
        this.P();

        while (binaryOperators[this.next]) {
            this.pushOperator(binary(this.next));
            this.consume();
            this.P();
        }
        while (!(top(this.operators) instanceof Sentinel)) {
            this.popOperator();
        }
    }

    // P --> v | "(" E ")" | U P | F
    /*
      Parse any of the following
        - a value (variable or number)
        - an E inside parentheses
        - a unary operator followed by another P
        - a function call
    */
    P() {
        if (isNumber(this.next)) {
            this.operands.push(new Num(this.next));
            this.consume();
        }
        else if (this.next === '(') {
            this.consume();
            this.operators.push(sentinel);
            this.E();
            this.expect(')');
            this.operators.pop();
        }
        else if (unaryOperators[this.next]) {
            this.pushOperator(unary(this.next));
            this.consume();
            this.P();
        }
        else if (isVariable(this.next)) {
            const name = this.next;
            this.consume();

            if (this.next === '(') {
                const fn = new Func(name, 0)
                this.pushOperator(fn);
                this.consume();
                this.operators.push(sentinel);
                this.F(fn);
                this.expect(')');
                this.operators.pop();
            }
            else {
                this.operands.push(new Var(name));
            }
        }
        else error('Invalid syntax at "' + this.next + '"');
    }

    // F --> f "(" E {"," E} ")"
    // We already got the fn name and the left paren in the previous step
    // Here we just parse an E, and then 0 or more pairs of Es and commas
    F(fn) {
        this.E();
        fn.length++;

        while (this.next === ',') {
            fn.length++;
            this.consume();
            this.E();
        }
    }

    //Pops an operator off the stack,
    // then pops it's arguments off the operand stack
    // then appends the operands to the node, and
    // pops the operator onto the operand stack
    popOperator() {
        if (top(this.operators) instanceof BinOp) {
            const t1 = this.operands.pop();
            const t0 = this.operands.pop();
            const operator = this.operators.pop()
            operator.setOperands(t0, t1);
            this.operands.push(operator);
        }
        else if (top(this.operators) instanceof UnOp) {
            const operator = this.operators.pop();
            operator.setOperands(this.operands.pop());
            this.operands.push(operator);
        }
        else if (top(this.operators) instanceof Func) {
            const operator = this.operators.pop();
            while (operator.args.length < operator.length) {
                operator.pushArg(this.operands.pop());
            }
            this.operands.push(operator);
        }
    }

    // Pops any operators off the stack that have a higher precedence
    // then pushes onto the stack
    pushOperator(op) {
        while (this.operators.length && op.getPrecedence() < top(this.operators).getPrecedence()) {
            this.popOperator();
        }
        this.operators.push(op);
    }


    consume() {
        const [n, r] = _consume(this.rest);
        this.next = n;
        this.rest = r;
    }

    expect(tok) {
        if (this.next === tok) this.consume();
        else if (this.next === '') error('Unexpected end of input');
        else error('Unexpected "' + this.next + '"');
    }
}

//Determines whether a character is an element in a set of characters
function elem(ch, set) {
    return ch.length > 0 && set.indexOf(ch[0]) > -1
}

function readVar(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (elem(ch, variableChars)) result += ch;
        else break;
    }

    return [result.toLowerCase(), str.substr(result.length)];
}

function readNumber(str) {
    let result = '';

    let periodCount = 0;

    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '.') periodCount++;

        if (elem(ch, d)) result += ch;
        else break;

    }

    if (periodCount > 1) error('Invalid Number: ' + result);

    return [result, str.substr(result.length)];
}

function isNumber(str) {
    return elem(str, d);
}

function isVariable(str) {
    return elem(str, variableChars);
}

function top(stack) {
    return stack[stack.length - 1];
}

function _consume(str) {
    if (str.length === 0) return ['', ''];

    let i;
    for (i = 0; /\s/.test(str[i]) && i < str.length; i++);

    str = str.substr(i);

    if (str.length === 0) return ['', ''];

    const ch = str[0];

    if (
        binaryOperators[ch]
        || unaryOperators[ch]
        || ch === '('
        || ch === ')'
        || ch === ','
    ) return [ch, str.substr(1)];
    else if (elem(ch, d)) return readNumber(str);
    else if (elem(ch, variableChars)) return readVar(str, variableChars);
    else error('Invalid syntax at "' + ch + '"');
}

//Recursively evaluates the AST
function evaluate(tree, vars, fns) {
    if (tree instanceof BinOp) {
        switch (tree.value) {
            case '^':
                return Math.pow(evaluate(tree.left, vars, fns), evaluate(tree.right, vars, fns));
            case '*':
                return evaluate(tree.left, vars, fns) * evaluate(tree.right, vars, fns);
            case '+':
                return evaluate(tree.left, vars, fns) + evaluate(tree.right, vars, fns);
            case '-':
                return evaluate(tree.left, vars, fns) - evaluate(tree.right, vars, fns);
            case '/':
                const l = evaluate(tree.left, vars, fns);
                const r = evaluate(tree.right, vars, fns);
                if (r === 0) error('Division by zero');
                return l / r;
            default:
                error('Unknown operator: ' + tree.value);
        }
    }
    else if (tree instanceof Func) {
        const func = functionList[tree.value] 
            || (fns ? fns[tree.value] : undefined);
        if (!func) error('Unknown function: "' + tree.value + '"');

        if (func.length !== null && func.length !== tree.args.length) {
            error(`Function "${tree.value}" expected ${func.length} arguments, but got ${tree.args.length}`)
        }

        return func.fn.apply(
            null,
            tree.args.map(a => evaluate(a, vars, fns))
        );
    }
    else if (tree instanceof UnOp) {
        switch (tree.value) {
            case '-':
                return -evaluate(tree.left, vars, fns);
            default:
                error('Unknown function: ' + tree.value);
        }
    }
    else if (tree instanceof Num) {
        const num = parseFloat(tree.value);
        if (isNaN(num)) error('Invalid Number: ' + tree.value);
        else return num;
    }
    else if (tree instanceof Var) {
        if (!vars || !vars.hasOwnProperty(tree.value))
            return error('Unknown variable: "' + tree.value + '"');

        const num = parseFloat(vars[tree.value]);
        if (isNaN(num)) error('Invalid Number: ' + tree.value);
        else return num;
    }
}

//Convenience function to inspect structure of AST
function _print(tree, depth) {
    let n = depth;
    let padding = '';

    while (n--) {
        padding += '    ';
    }

    if (tree instanceof BinOp) {
        return padding + tree.value
            + '\n' + print(tree.left, depth + 1)
            + print(tree.right, depth + 1);
    }
    else if (tree instanceof UnOp) {
        return padding + tree.value
            + '\n' + print(tree.left, depth + 1);
    }
    else if (tree instanceof Func) {
        return padding + tree.value
            + '\n' + tree.args.map(v => print(v, depth + 1)).join('');
    }
    else {
        return padding + tree.value + '\n';
    }
}

function binary(t) {
    return new BinOp(t);
}

function unary(t) {
    return new UnOp(t);
}

function error(msg) {
    throw new Error(msg);
}

const functionList = {
    'floor': {
        length: 1,
        fn: (a) => Math.floor(a),
    },
    'ceil': {
        length: 1,
        fn: (a) => Math.ceil(a),
    },
    'round': {
        length: 1,
        fn: (a) => Math.round(a),
    },
    'sin': {
        length: 1,
        fn: (a) => Math.sin(a),
    },
    'cos': {
        length: 1,
        fn: (a) => Math.cos(a),
    },
    'tan': {
        length: 1,
        fn: (a) => Math.tan(a),
    },
    'asin': {
        length: 1,
        fn: (a) => Math.asin(a),
    },
    'acos': {
        length: 1,
        fn: (a) => Math.acos(a),
    },
    'atan': {
        length: 1,
        fn: (a) => Math.atan(a),
    },
    'log': {
        length: 1,
        fn: (a) => Math.log(a),
    },
    'log10': {
        length: 1,
        fn: (a) => Math.log10(a),
    },
    'exp': {
        length: 1,
        fn: (a) => Math.exp(a),
    },
    'pow': {
        length: 2,
        fn: (a, b) => Math.pow(a, b),
    },
    'sinh': {
        length: 1,
        fn: (a) => Math.sinh(a),
    },
    'cosh': {
        length: 1,
        fn: (a) => Math.cosh(a),
    },
    'tanh': {
        length: 1,
        fn: (a) => Math.tanh(a),
    },
    'max': {
        length: null,
        fn: (...args) => Math.max(...args),
    },
    'min': {
        length: null,
        fn: (...args) => Math.min(...args),
    },
};

function parse (str) {
    return new Parser(str).parse();
}

module.exports = {
    parse: parse,
    evaluate: evaluate,
    _print: _print,
};
