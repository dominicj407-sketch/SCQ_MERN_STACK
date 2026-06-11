import axios from 'axios';
let API=axios.create({
    baseURL:"http://localhost:3000/api",
    withCredentials:true
})
API.interceptors.request.use((config)=>{
    let accessToken=localStorage.getItem("accessToken");
    if(accessToken){
        config.headers.Authorization=`Bearer ${accessToken}`;
        console.log(config);
    }
    return config;
}
,(err)=>{
    return Promise.reject(err);
})
API.interceptors.response.use((response)=>{
    return response;
},async (error)=>{
    
    const originalRequest = error.config;
    
    if(error.response?.status==401&&!originalRequest._retry){
        originalRequest._retry = true;
        
        try{
            const role = localStorage.getItem("role") || "";
            console.log("🔄 Refreshing token for role:", role);
            
            let refreshRes;
            if(role === "Doctor"){
                console.log("Using POST for Doctor");
                refreshRes = await axios.post(`http://localhost:3000/auth/refresh/Doctor`, {}, { withCredentials: true });
            } else if(role === "Patient"){
                console.log("Using POST for Patient");
                refreshRes = await axios.post(`http://localhost:3000/auth/refresh/Patient`, {}, { withCredentials: true });
            } else if(role === "Staff"){
                console.log("Using POST for Staff");
                refreshRes = await axios.post(`http://localhost:3000/auth/refresh/Staff`, {}, { withCredentials: true });
            } else if(role === "Admin"){
                console.log("Using POST for Admin");
                refreshRes = await axios.post(`http://localhost:3000/auth/refresh/Admin`, {}, { withCredentials: true });
            } else {
                throw new Error("Unknown role: " + role);
            }

            console.log("✅ New access token received");
            localStorage.setItem("accessToken", refreshRes.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${refreshRes.data.accessToken}`;
            return API(originalRequest);
        }catch(refreshErr){
            console.log("❌ Refresh failed:", refreshErr.response?.data || refreshErr.message);
            alert("Session expired. Please login again.")
            localStorage.clear();
            window.location.href = "/"; 
            return Promise.reject(refreshErr);
        }
    }
    return Promise.reject(error);
})
export default API;

