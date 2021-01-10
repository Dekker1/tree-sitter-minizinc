const PREC = {
  call: 15,
  annotation: 14,
  unary: 13,
  exponent: 12,
  multiplicative: 11,
  additive: 10,
  intersect: 9,
  dotdot: 8,
  symdiff: 7,
  diff: 6,
  union: 5,
  comparative: 4,
  and: 3,
  xor: 2,
  or: 1,
  implication: 2,
  equivalence: 1,
}

module.exports = grammar({
  name: 'minizinc',

  extras: $ => [/\s/, $.line_comment, $.block_comment],

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(sepBy(';', $._items)),

    _items: $ => choice(
      $.assignment_item,
      // TODO: Other statements types
    ),

    assignment_item: $ => seq(
      field('name', $.identifier),
      '=',
      field('expr', $._expression)
    ),

    _expression: $ => choice(
      $.identifier,
      $._literal,

      $.binary_operation,
      $.call,
      $.if_then_else,
      $.index_expression,
      $.unary_operation,
      // TODO: Other expression types
      seq('(', $._expression, ')'),
    ),

    binary_operation: $ => {
      const table = [
        [prec.left, PREC.equivalence, '<->'],
        [prec.left, PREC.implication, choice('->', '<-')],
        [prec.left, PREC.or, '\\/'],
        [prec.left, PREC.xor, 'xor'],
        [prec.left, PREC.and, '/\\'],
        // TODO: Should really be nonassoc
        [prec.left, PREC.comparative, choice('=', '==', '!=', '<', '<=', '>', '>=', 'in', 'subset', 'superset')],
        [prec.left, PREC.union, 'union'],
        [prec.left, PREC.diff, 'diff'],
        [prec.left, PREC.symdiff, 'symdiff'],
        [prec.left, PREC.intersect, 'intersect'],
        // TODO: Could be nonassoc, will always give type error
        [prec.left, PREC.dotdot, '..'],
        [prec.left, PREC.additive, choice('+', '-', '++')],
        [prec.left, PREC.multiplicative, choice('*', '/', 'div', 'mod')],
        [prec.left, PREC.exponent, '^'],
        [prec.left, PREC.annotation, '::'],
      ];

      return choice(...table.map(([assoc, precedence, operator]) => assoc(precedence, seq(
        field('left', $._expression),
        field('operator', operator),
        field('right', $._expression),
      ))));
    },

    call: $ => prec(PREC.call, seq(
      field('name', $.identifier),
      '(',
      field('arguments', sepBy(',', $._expression)),
      ')',
    )),

    if_then_else: $ => seq(
      "if", $._expression,
      "then", $._expression,
      repeat(seq("elseif", $._expression, "then", $._expression)),
      optional(seq("else", $._expression)),
      "endif",
    ),

    index_expression: $ => prec(PREC.call, seq(
      field('collection', $._expression),
      '[',
      field('indices', seq($._expression, repeat(seq(',', $._expression)))),
      ']',
    )),

    unary_operation: $ => prec(PREC.unary, seq(
      field('operator', choice('-', 'not', '¬')),
      $._expression
    )),

    _literal: $ => choice(
      $.absent,
      $.array_literal,
      $.boolean_literal,
      $.float_literal,
      $.integer_literal,
      $.set_literal,
      $.string_literal,
    ),

    absent: $ => '<>',
    array_literal: $ => seq('[', sepBy(',', $._expression), ']'),
    boolean_literal: $ => choice('true', 'false'),
    float_literal: $ => token(choice(
      /\d+\.\d+/,
      /\d+(\.\d+)?[Ee][+-]?\d+/,
      // TODO: Hexadecimal floating point numbers
    )),
    integer_literal: $ => token(choice(
      /[0-9]+/,
      /0x[0-9a-fA-F]+/,
      /0b[01]+/,
      /0o[0-7]+/
    )),
    set_literal: $ => seq('{', sepBy(',', $._expression), '}'),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        token.immediate(prec(1, /[^"\n\\]+/)),
        $.escape_sequence
      )),
      '"'
    ),
    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[^xuU]/,
        /\d{2,3}/,
        /x[0-9a-fA-F]{2,}/,
        /u[0-9a-fA-F]{4}/,
        /U[0-9a-fA-F]{8}/
      )
    )),

    identifier: $ => /[A-Za-z][A-Za-z0-9_]*/,

    line_comment: $ => token(seq('%', /.*/)),
    block_comment: $ => token(seq('/*', /([^*]|\*[^\/]|\n)*?\*?/, '*/')),

  }
});

function sepBy(sep, rule) {
  return seq(repeat(seq(rule, sep)), optional(rule))
}
