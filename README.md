# expression-parser
Parses and evaluates math expresssions

## Usage
### parse(expression)
Parse takes an expression in the form of a string, and returns an abstract syntax tree

### evaluate(tree, [variables, customFunctions])
Evaluate takes a tree, and optionally, objects defining custom functions and variables. customFunctions, if provided must be of the form `{ fn :: Function, length :: int }`, where fn is the function to be run, and length is the number of arguments it takes. Length may be null to allow a variable number of arguments.

## Examples
``` js
const tree = parse('floor( 15 / 2 )');
evaluate(tree); // 7
```

With variables
``` js
const tree = parse('a * b');
evaluate(tree, { a: 3, b: 5 }); // 15

evaluate(tree, { a: 4, b: 4 }); // 16
```

With custom functions
``` js
const factorial = n => n <= 1 ? n : n * factorial(n - 1);
const fns = {
    fact: {
	 fn: factorial,
	 length: 1,
    }
};

const tree = parse('fact(5)');

evaluate(tree, null, fns); // 120
```
