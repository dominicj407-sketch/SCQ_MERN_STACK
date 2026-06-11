import Styles from './util.module.css'
function Menubutton({togglemenu,button}){
    return(
        <button className={`${Styles.menubutton} ${button}`}  onClick={togglemenu}>=</button>
    )
    
}
export default Menubutton;