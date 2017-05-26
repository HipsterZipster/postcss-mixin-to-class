# PostCSS Mixins To Classes [![Build Status][ci-img]][ci]

[PostCSS] plugin that converts postcss-mixins to atomic CSS classes. Useful when generating a reusable CSS library.

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/HipsterZipster/postcss-mixin-to-class.svg
[ci]:      https://travis-ci.org/HipsterZipster/postcss-mixin-to-class

```css
.foo {
    /* Input example */
}
```

```css
.foo {
  /* Output example */
}
```

## Usage

```js
postcss([ require('postcss-mixin-to-class') ])
```

See [PostCSS] docs for examples for your environment.
