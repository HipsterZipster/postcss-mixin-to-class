var postcss = require('postcss');

var plugin = require('./');

function run(input, output, opts) {
  return postcss([plugin(opts)]).process(input)
                                .then(result => {
                                  expect(result.css).toEqual(output);
                                  expect(result.warnings().length).toBe(0);
                                });
}

// it('does something', () => {
//   return run('a{ }', 'a{ }', {});
// });

const IN =
`
@define-mixin myMixin {
  color: white;
}

.somethingElse {
  @mixin myMixin;
}
`;

const OUT =
`
.myMixin {
  color: white;
}
.somethingElse {
  color: white;
}
`;

it('add class after @define-mixin', () => {
  return run(IN, OUT, {});
});