// Taken from: https://github.com/rollup/rollup/issues/2822#issuecomment-486676465
import type { Plugin } from 'rollup';
import MagicString from 'magic-string';
import { walk } from 'estree-walker';
import jsx from 'acorn-jsx';

let nextId = 0;

function getJsxName(node: any): string {
  if (node.type === 'JSXMemberExpression') {
    return `${getJsxName(node.object)}.${getJsxName(node.property)}`;
  }
  return node.name;
}

export function preserveJSX(): Plugin {
  return {
    name: 'preserve-jsx',

    options(inputOptions) {
      const acornPlugins = (inputOptions.acornInjectPlugins ||
        (inputOptions.acornInjectPlugins = [])) as any[];
      acornPlugins.push(jsx());
    },

    transform(code) {
      const magicString = new MagicString(code);
      const idsByName = new Map();
      const ast: any = this.parse(code);
      walk(ast, {
        enter(node: any) {
          if (
            node.type === 'JSXOpeningElement' ||
            node.type === 'JSXClosingElement'
          ) {
            const name = getJsxName(node.name);
            const tagId = idsByName.get(name) || `JSX_PLUGIN_ID_${nextId++}`;

            // overwrite all JSX tags with artificial tag ids so that we can find them again later
            magicString.overwrite(node.name.start, node.name.end, tagId);
            idsByName.set(name, tagId);
          }
          // do not treat the children as separate identifiers
          else if (node.type === 'JSXMemberExpression') {
            this.skip();
          }
        },
      });

      if (idsByName.size > 0) {
        const usedNamesAndIds = Array.from(idsByName).map(
          ([name, tagId]) => `/*${tagId}*/${name}`,
        );
        magicString.append(
          `;USED_JSX_NAMES(React,${usedNamesAndIds.join(',')});`,
        );
        return magicString.toString();
      }
    },

    renderChunk(code) {
      const replacements = new Map();

      // this finds all injected artificial usages from the transform hook, removes them
      // and collects the new variable names as a side-effect
      code = code.replace(/USED_JSX_NAMES\(([^)]*)\);/g, (_, args) => {
        // this extracts the artificial tag id from the comment and the possibly renamed variable
        // name from the variable via two capture groups
        const usedNames = args
          .split(',')
          .map((arg: string) => arg.match(/^\/\*([^*]*)\*\/(.*)$/));

        usedNames.slice(1).forEach(([_, tagId, updatedName]: any) => {
          replacements.set(tagId, updatedName);
        });

        return '';
      });

      // this replaces the artificial tag ids in the actual JSX tags
      return code.replace(/JSX_PLUGIN_ID_\d+/g, (tagId) =>
        replacements.get(tagId),
      );
    },
  };
}
