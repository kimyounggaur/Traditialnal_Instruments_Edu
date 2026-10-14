'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createRepository, type GugakRepository } from '@/repositories';
import type { Database } from '@/domain/types';
type LibraryContextType = { db:Database; repo:GugakRepository; ready:boolean; role:string; setRole:(role:string)=>void; notice:string; notify:(message:string)=>void; run:<T>(operation:()=>Promise<T>,success?:string)=>Promise<T|undefined>; warning:string|null; storageMode:string };
const Context=createContext<LibraryContextType|null>(null);
export function LibraryProvider({children}:{children:ReactNode}) {
 const [repo]=useState(()=>createRepository()); const [state,setState]=useState(()=>repo.snapshot()); const [role,setRole]=useState('teacher'); const [notice,notify]=useState('');
 useEffect(()=>{const unsub=repo.subscribe(()=>setState(repo.snapshot())); void repo.init().then(()=>setState(repo.snapshot())).catch(e=>notify(String(e))); return unsub;},[repo]);
 async function run<T,>(operation:()=>Promise<T>,success?:string):Promise<T|undefined>{try{const result=await operation(); if(success)notify(success); return result;}catch(e){notify(e instanceof Error?e.message:'작업을 완료하지 못했습니다. 다시 시도해주세요.');return undefined;}}
 return <Context.Provider value={{db:state.data,repo,ready:state.ready,role,setRole,notice,notify,run,warning:state.warning,storageMode:state.storageMode}}>{children}</Context.Provider>;
}
export function useLibrary(){const ctx=useContext(Context);if(!ctx)throw new Error('LibraryProvider가 필요합니다.');return ctx;}
