import axios from 'axios'
import { authUrl } from '../api';
const services={
    login:async (credentials)=>{
        try{
            let res=await axios.post(authUrl(credentials.url),credentials,{
                withCredentials:true
            })
            return res;
        }
        catch(error){

        }
    }
}
export default services;
