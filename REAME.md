# rollup-plugins-utils

Plugins que antes faziam parte do `helios-router` e da `api-local`, mas foram movidos para um projeto separado, pois os plugins serão utilizados em mais locais

## hoistImportDeps

> Usado pelo `doc-app`

Usado para fazer o mesmo que o `__viteImport` faz, ele gera os `__loadDeps` que são mais performáticos, usam menos código, porém tem péssimo suporte para navegadores antigos

## preserveJSX

Usado para manter o `jsx`, útil para fazer library para o `solid-js`

## renameChunkPlugin

Usado para renomear um dos chunks para um novo nome, usado para criar arquivos `.jsx` para fazer library para o `solid-js`

## removeImportLines

> Usado pela `api-local`

Remove os imports que começam com import '

Usado com `manualChunks` para remover os imports desnessários que o `rollup` acaba criando

Exemplo:

```ts
import './algo'; // Vai ser removido
```
