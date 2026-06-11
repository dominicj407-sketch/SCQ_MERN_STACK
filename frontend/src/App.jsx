import { useRef } from "react";
import { useEffect } from "react";
import { useState } from "react"

function Delay(){
    let [code,setcode]=useState("");
    let currentcode=useRef("");
    useEffect(()=>{
        currentcode.current="hello";
    },[])
    useEffect(()=>{
        
    },[currentcode.current])
    useEffect(()=>{
        setTimeout(() => {
            currentcode.current=code;    
        }, 2000);
    },[code]);
    return (
        <>
            <input type="text" onChange={(e)=>{
                setcode(e.target.value);
            }} />
            value={currentcode.current}
        </>
    )
}
export default Delay;