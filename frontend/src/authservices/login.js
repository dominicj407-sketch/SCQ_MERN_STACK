import axios from 'axios'
const services={
    login:async (credentials)=>{
        try{
            let res=await axios.post(`http://localhost:3000/auth${credentials.url}`,credentials,{
                withCredentials:true
            })
            return res;
        }
        catch(error){

        }
    }
}
export default services;