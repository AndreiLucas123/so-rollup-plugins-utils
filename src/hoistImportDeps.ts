import type { Plugin, OutputBundle, AcornNode, OutputChunk } from 'rollup';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';

//
//

export const VIRTUAL_ID_IMPORT = 'preloaddeps:import';
export const MARKER = '"__IMPORT_DEPS__"';

//
//

function canonicalize(path: string) {
  // Remove leading and trailing '/' from basePath.
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  if (path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }
  return path;
}

//
//

export type HoistImportDepsOptions = {
  baseUrl?: string;
  sourceMap?: boolean;
};

/**
 * Copied and changed from [rollup-plugin-hoist-import-deps](https://github.com/vikerman/rollup-plugin-hoist-import-deps)
 *
 * Differences:
 * - Removed the `amd` option.
 * - Only supports import() and will not use preload or modulepreload.
 */
export function hoistImportDeps(options?: HoistImportDepsOptions): Plugin {
  options = options || {};
  options.baseUrl =
    typeof options.baseUrl === 'string' ? canonicalize(options.baseUrl) : '';

  // Get the static deps of a chunk and return them as list of strings
  // that can be passed as arguments to module preload method(__loadeDeps).
  function getDeps(
    importBase: string,
    chunkCaller: OutputChunk,
    bundle: OutputBundle,
  ) {
    let name = importBase.startsWith('./')
      ? importBase.substring(2)
      : importBase;

    const calleImports = chunkCaller.imports;

    const chunk = bundle[name];
    if (chunk && 'imports' in chunk && chunk.imports.length > 0) {
      const ret = chunk.imports
        .filter((s) => s !== chunkCaller.name && !calleImports.includes(s))
        .map((s) => {
          if (/^https?:\/\//.test(s) || s.startsWith('/')) {
            return `"${s}"`;
          }
          return `"./${s}"`;
        })
        .join(',');
      return ret;
    } else {
      return '';
    }
  }

  return {
    name: 'hoist-import-deps',

    resolveId(id) {
      if (id === VIRTUAL_ID_IMPORT) {
        return id;
      }
      return null;
    },

    /**
     * Add a virtual module for preloading dependencies.
     */
    load(id: string): string | null {
      if (id === VIRTUAL_ID_IMPORT) {
        // Use link preload for deps and dynamic import for baseImport.
        // When window.HOIST_PREFETCH is true, use link prfetch for deps and baseImport.
        // If the browser doesn't support the requested method(preload or prefetch)
        // provide fallback (using fetch).
        return `
const seen = new Map();

export function __loadDeps(baseImport, ...deps) {
  let result;
  if (seen.has(baseImport)) {
    result = seen.get(baseImport);
  } else {
    result = import(baseImport);
    seen.set(baseImport, result);
  }

  for (let dep of deps) {
    if (!seen.has(dep)) {
      seen.set(dep, import(dep));
    }
  }

  return result;
}`;
      }
      return null;
    },

    // Hook into `transform` to convert dynamic import
    // ```
    // import("my-module")
    // ```
    // to
    // ```
    // import {__loadDeps} from 'preloaddeps:import';
    // ...
    // _loadDeps(import("my-module"), "__IMPORT_DEPS__")
    // ```
    //
    // This lets us identify the dynamic import site later using
    // the marker string even when the output type is not ESM and
    // the dynamic import expression has been transformed.
    transform(code, id) {
      if (id === VIRTUAL_ID_IMPORT) {
        return null;
      }

      const firstpass = /import\s*\([^\)]+\)/;
      if (!code.match(firstpass)) {
        return null;
      }

      let ast: AcornNode | null = null;
      try {
        ast = this.parse(code);
      } catch (err: any) {
        err.message += ` in ${id}`;
        throw err;
      }

      if (!ast) {
        return null;
      }

      const magicString = new MagicString(code);
      let hasDynamicImport = false;
      walk(ast as any, {
        enter(node: any) {
          if (node.type === 'ImportExpression') {
            hasDynamicImport = true;
            magicString.prependLeft(node.start, '__loadDeps(');
            magicString.appendRight(node.end, `, ${MARKER})`);
          }
        },
      });
      if (!hasDynamicImport) {
        return null;
      } else {
        magicString.prepend(
          `import {__loadDeps} from '${VIRTUAL_ID_IMPORT}';\n`,
        );

        return {
          code: magicString.toString(),
          map: options!.sourceMap
            ? magicString.generateMap({ hires: true })
            : null,
        };
      }
    },

    // Transform
    // ```
    // _loadDeps(import("my-chunk"), "__IMPORT_DEPS__")
    // ```
    // from the `transform` step to
    // ```
    // _loadDeps(import("my-chunk"),"chunkA","chunkB")
    // where `chunkA` and `chunkB` are the static imports of `my-chunk`.
    // It is done in `generateBundle` instead of `renderChunk` because the full
    // chunk graph is available only at this point including the cases where the output
    // is not ESM and there are circular dependencies in the dynamic imports.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    generateBundle(_, bundle) {
      for (const chunkName of Object.keys(bundle)) {
        const chunk = bundle[chunkName];
        if (chunk.type !== 'chunk' || chunk.dynamicImports.length === 0) {
          continue;
        }

        const code = chunk.code;

        let ast: any = null;
        try {
          ast = this.parse(code);
        } catch (err) {
          this.warn({
            code: 'PARSE_ERROR',
            message: `rollup-plugin-hoist-import-deps: failed to parse ${chunk.fileName}.\n${err}`,
          });
        }
        if (!ast) {
          continue;
        }

        const magicString = new MagicString(code);

        walk(ast, {
          enter(node: any, parent) {
            let importChunkName: any = null;
            if (node.type === 'Literal' && node.raw === MARKER) {
              const importExpr = (parent as any).arguments[0];
              if (!importExpr) {
                return;
              }

              if (importExpr.type === 'ImportExpression') {
                // ESM output
                importChunkName = importExpr.source
                  ? importExpr.source.value
                  : null;
              } else {
                // non-ESM creates crazy Promise wrapper. Just walk it again to find the chunk name in it.
                walk(importExpr, {
                  enter(node) {
                    if (node.type === 'Literal') {
                      importChunkName = node.value;
                    }
                  },
                });
              }
              if (importChunkName) {
                magicString.overwrite(
                  importExpr.start,
                  importExpr.end,
                  `"${importChunkName}"`,
                );
                magicString.overwrite(
                  node.start,
                  node.end,
                  getDeps(importChunkName, chunk, bundle),
                );
              }
            }
          },
        });

        chunk.code = magicString.toString();
        // TODO: Combine existing sourcemap with generated sourcemap.
        // Doesn't seem to adversely affect the sourcemap quality without it though.
      }
    },
  };
}
