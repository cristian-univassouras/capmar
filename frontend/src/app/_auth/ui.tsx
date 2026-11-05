"use client";
import { forwardRef, useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
type FieldProps=React.InputHTMLAttributes<HTMLInputElement>&{label:string;hint?:string};
export const Field=forwardRef<HTMLInputElement,FieldProps>(function Field({label,id,hint,type,...props},ref){
 const[visible,setVisible]=useState(false);const password=type==="password";
 return <label htmlFor={id} className="block"><span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span><span className="relative block"><input id={id} ref={ref} {...props} type={password&&visible?"text":type} aria-describedby={hint?id+"-hint":props["aria-describedby"]} className={"w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 "+(password?"pr-12":"")}/>{password&&<button type="button" aria-label={(visible?"Ocultar ":"Mostrar ")+label.toLowerCase()} onClick={()=>setVisible(v=>!v)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:text-primary">{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button>}</span>{hint&&<span id={id+"-hint"} className="mt-2 block text-xs leading-relaxed text-gray-500">{hint}</span>}</label>;
});
type SubmitButtonProps={children:string;loadingLabel:string;loading?:boolean};
export function SubmitButton({children,loadingLabel,loading}:SubmitButtonProps){return <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white transition hover:bg-secondary disabled:opacity-60">{loading?<><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"/>{loadingLabel}</>:<>{children}<ArrowRight size={17}/></>}</button>;}
