"use client";
import {useEffect,useRef} from 'react';
/** A late response may not update or redirect a view that has been replaced. */
export function useRequestGuard(){
  const version=useRef(0);
  useEffect(()=>()=>{version.current+=1;},[]);
  return ()=>{const started=version.current;return ()=>started===version.current;};
}
