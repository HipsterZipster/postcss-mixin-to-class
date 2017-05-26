const jsToCss  = require('postcss-js/parser');
const postcss = require('postcss');
// import postcss, { root as Root, rule as Rule } from 'postcss';
const globby = require('globby');
const vars = require('postcss-simple-vars');
const path = require('path');
const fs = require('fs');
const isWindows = require('os').platform().indexOf('win32') !== -1;

function insideDefine(rule) {
  var parent = rule.parent;
  if (!parent) {
    return false;
  } else if (parent.name === 'define-mixin') {
    return true;
  } else {
    return insideDefine(parent);
  }
}

function insertObject(rule, obj, processMixins) {
  console.log('insertObject obj %s', obj);

  var root = jsToCss(obj);
  console.log('insertObject root %s', root);

  root.each(function (node) {
    node.source = rule.source;
  });
  processMixins(root);
  rule.parent.insertBefore(rule, root);
}


function insertClass(result, mixins, rule, processMixins, opts) {
  console.log('insertClass params: %s', JSON.stringify(rule.params, false, '\t'));

  var name = rule.params.split(/\s/, 1)[0];
  var other = rule.params.slice(name.length).trim();

  console.log('insertClass name: %s params: %s', name, JSON.stringify(rule.params, false, '\t'));
  var copiedNode = rule.clone();
  copiedNode.name = '.' + name;
  copiedNode.params = '';
  rule.parent.insertBefore(rule, copiedNode);
  console.log('insertclass copiedNode: ' + JSON.stringify(copiedNode, false, '\t'));
  // rule.parent.insertAfter();
  // rule.parent.insertAfter();
  // console.log('insertClass obj %s', result);

  // var root = jsToCss(obj);
  // console.log('insertClass root %s', root);

  // root.each(function (node) {
  //   node.source = rule.source;
  // });
  // processMixins(root);
  // rule.parent.insertBefore(rule, root);
}

function defineMixin(result, mixins, rule) {
  var name = rule.params.split(/\s/, 1)[0];
  var other = rule.params.slice(name.length).trim();

  var args = [];
  if (other.length) {
    args = postcss.list.comma(other).map(function (str) {
      var arg = str.split(':', 1)[0];
      var defaults = str.slice(arg.length + 1);
      return [arg.slice(1).trim(), defaults.trim()];
    });
  }

  var content = false;
  rule.walkAtRules('mixin-content', function () {
    content = true;
    return false;
  });

  mixins[name] = { mixin: rule, args: args, content: content };

  insertClass(result, mixins, rule);

  rule.remove();
}


function insertMixin(result, mixins, rule, processMixins, opts) {
  var name = rule.params.split(/\s/, 1)[0];
  var rest = rule.params.slice(name.length).trim();

  var params;
  if (rest.trim() === '') {
    params = [];
  } else {
    params = postcss.list.comma(rest);
  }

  var meta = mixins[name];
  var mixin = meta && meta.mixin;

  if (!meta) {
    if (!opts.silent) {
      throw rule.error('Undefined mixin ' + name);
    }

  } else if (mixin.name === 'define-mixin') {
    var i;
    var values = {};
    for (i = 0; i < meta.args.length; i++) {
      values[meta.args[i][0]] = params[i] || meta.args[i][1];
    }

    var proxy = postcss.root();
    for (i = 0; i < mixin.nodes.length; i++) {
      var node = mixin.nodes[i].clone();
      delete node.raws.before;
      proxy.append(node);
    }

    if (meta.args.length) {
      vars({ only: values })(proxy);
    }
    if (meta.content) {
      proxy.walkAtRules('mixin-content', function (content) {
        if (rule.nodes && rule.nodes.length > 0) {
          content.replaceWith(rule.nodes);
        } else {
          content.remove();
        }
      });
    }
    processMixins(proxy);

    rule.parent.insertBefore(rule, proxy);

  } else if (typeof mixin === 'object') {
    insertObject(rule, mixin, processMixins);

  } else if (typeof mixin === 'function') {
    var args = [rule].concat(params);
    rule.walkAtRules(function (atRule) {
      insertMixin(result, mixins, atRule, processMixins, opts);
    });
    var nodes = mixin.apply(this, args);
    if (typeof nodes === 'object') {
      insertObject(rule, nodes, processMixins);
    }
  }

  if (rule.parent) {
    rule.remove();
  }
}

const p = postcss.plugin('postcss-mixin-to-class', function (opts) {
  opts = opts || {};

  // Work with options here
  let cwd = process.cwd();
  let globs = [];
  let mixins = {};

  return function (css, result) {

    // Transform CSS AST here
    var processMixins = function (root) {
      root.walkAtRules(function (i) {
        if (i.name === 'mixin' || i.name === 'add-mixin') {
          if (!insideDefine(i)) {
            insertMixin(result, mixins, i, processMixins, opts);
          }
        } else if (i.name === 'define-mixin') {
          defineMixin(result, mixins, i);
        }
      });
    };

    var process = function () {
      if (typeof opts.mixins === 'object') {
        for (var i in opts.mixins) {
          mixins[i] = { mixin: opts.mixins[i] };
        }
      }
      processMixins(css);
    };

    if (globs.length === 0) {
      process();
      return;
    }

    // Windows bug with { nocase: true } due to node-glob issue
    // https://github.com/isaacs/node-glob/issues/123
    return globby(globs, { nocase: !isWindows }).then(
      function (files) {
        return Promise.all(files.map(function (file) {
          var ext = path.extname(file).toLowerCase();
          var name = path.basename(file, path.extname(file));
          var relative = path.join(cwd, path.relative(cwd, file));
          return new Promise(function (resolve, reject) {
            if (ext === '.css' || ext === '.pcss' || ext === '.sss') {
              fs.readFile(relative, function (err, contents) {
                /* istanbul ignore if */
                if (err) {
                  reject(err);
                  return;
                }
                var root;
                // if (ext === '.sss') {
                //   root = sugarss.parse(contents);
                // } else {
                root = postcss.parse(contents);
                // }
                root.walkAtRules('define-mixin', function (atrule) {
                  defineMixin(result, mixins, atrule);
                });
                resolve();
              });
            } else {
              mixins[name] = {mixin: require(relative)};
              resolve();
            }
          });
        }));
      }).then(process);
  };
});

module.exports = p;
