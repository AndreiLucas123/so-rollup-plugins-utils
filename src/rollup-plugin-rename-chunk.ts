export type RenameChunkOptions = {
  oldName: string;
  newName: string;
}

/**
 * Cria um plugin Rollup que renomeia um chunk após a build.
 *
 * @example
 * import renameChunkPlugin from './path/to/rename-chunk-plugin';
 *
 * export default {
 *   // ... outras configurações ...
 *   plugins: [
 *     // ... outros plugins ...
 *     renameChunkPlugin({
 *       oldName: 'nome_do_chunk_antigo',
 *       newName: 'nome_do_chunk_novo',
 *     }),
 *   ],
 * };
 */
export function renameChunkPlugin(options: RenameChunkOptions) {
  return {
    /**
     * Função chamada após a geração dos bundles.
     *
     * @param {Object} _ - Informações do bundle.
     * @param {Object} bundle - Um objeto contendo informações sobre os chunks gerados.
     */
    generateBundle(_, bundle) {
      const { oldName, newName } = options;
      if (oldName && newName) {
        if (bundle[oldName]) {
          bundle[newName] = bundle[oldName];
          delete bundle[oldName];
          bundle[newName].fileName = newName;
        }
      }
    },
  };
}
