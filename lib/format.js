'use strict'

module.exports = format

var deparse = require('./deparse')

function format(getctx, items, struct_info, definition_info, path, output) {
  output = output || []

  path = path || []

  for(var i = 0, len = items.length; i < len; ++i) {
    format_item_into(
        getctx
      , items[i]
      , struct_info
      , definition_info
      , path
      , output
    )
  }

  return output
}

function format_item_into(getctx, decl_node, struct_info, defs, path, output) {
  var children = decl_node.children

  var is_invariant = children[0].token.data === 'invariant'
    , parameter = children[2].token.data
    , type = children[4].token.data
    , names = []

  names = children[5].children.reduce(roll_quantifiers_into_names, [])

  if(children[4].type === 'keyword') {
    for(var i = 0, len = names.length; i < len; ++i) {
      if(!names[i].quantifier) {
        output[output.length] = {
            name: path.concat([names[i].data]).join('.')
          , type: type
        }

        continue
      }

      var quant = +deparse(names[i].quantifier, defs, getctx)

      if(isNaN(quant)) {
        throw new Error('could not quantify ' + names[i].data)
      }

      for(var j = 0; j < quant; ++j) {
        output[output.length] = {
            name: path.concat([names[i].data + '[' + j + ']']).join('.')
          , type: type
        }
      }
    }

    return
  }

  var struct = type === 'struct' ? children[4] : struct_info[type]
    , children

  if(!struct) {
    throw new Error('unrecognized user type ' + type)
  }

  children = struct.children.filter(function(x) {
    return x.type === 'decl'
  })

  for(var i = 0, len = names.length; i < len; ++i) {
    if(!names[i].quantifier) {
      path.push(names[i].data)

      format(
          getctx
        , children
        , struct_info
        , defs
        , path
        , output
      )
      path.pop()

      continue
    }

    var quant = +deparse(names[i].quantifier, defs, getctx)

    if(isNaN(quant)) {
      throw new Error('could not quantify ' + names[i].data)
    }

    var out = []

    format(
        getctx
      , children
      , struct_info
      , defs
      , []
      , out
    )

    for(var x = 0; x < out.length; ++x) {
      for(var j = 0; j < quant; ++j) {
        output[output.length] = {
            name: path.concat([
                names[i].data + '[' + j + ']'
              , out[x].name
            ]).join('.')
          , type: out[x].type
        }
      }
    }
  }
}

function roll_quantifiers_into_names(lhs, rhs) {
  if(rhs.token.data === '[') {
    lhs[lhs.length - 1].quantifier = rhs.children[0]
  } else {
    lhs[lhs.length] = rhs
  }

  return lhs
}
