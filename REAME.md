# rollup-plugins-utils

Antes fazia parte do `helios-router`, mas foi movido para um projeto separado, pois os plugins serão utilizados em mais locais

## hoistImportDeps

Usado para fazer o mesmo que o `__viteImport` faz, ele gera os `__loadDeps` que são mais performáticos, usam menos código, porém tem péssimo suporte para navegadores antigos

## preserveJSX

Usado para manter o `jsx`, útil para fazer library para o `solid-js`

## renameChunkPlugin

Usado para renomear um dos chunks para um novo nome, usado para criar arquivos `.jsx` para fazer library para o `solid-js`
