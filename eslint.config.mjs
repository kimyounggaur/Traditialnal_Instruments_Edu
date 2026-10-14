import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default [...nextVitals,...nextTs,{ignores:['.next/**','node_modules/**','next-env.d.ts']},{rules:{'react-hooks/set-state-in-effect':'off','react-hooks/immutability':'off','@next/next/no-img-element':'off','react-hooks/purity':'off'}}];
