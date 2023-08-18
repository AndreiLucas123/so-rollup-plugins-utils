import type { Plugin } from 'rollup';

/**
 * Remove os imports que começam com import '
 */
export function removeImportLines(): Plugin {
  return {
    name: 'remove-imports',

    renderChunk(code, chunk, outputOptions) {
      // Divida o código em linhas
      const lines = code.split('\n');

      // Filtra as linhas removendo aquelas que começam com "import '"
      const filteredLines = lines.filter(
        (line) => !line.trim().startsWith("import '"),
      );

      // Junte as linhas novamente para obter o novo código
      const newCode = filteredLines.join('\n');

      // Retorna o novo código
      return {
        code: newCode,
        map: null, // Neste exemplo, não estamos tratando sourcemaps
      };
    },
  };
}
