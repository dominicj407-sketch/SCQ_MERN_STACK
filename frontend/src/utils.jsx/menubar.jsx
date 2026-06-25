import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { authUrl } from '../api';
import Styles from './util.module.css';

function Menubar({ menus, color }) {
  const [open, setOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await axios.get(authUrl('/logout'), { withCredentials: true });
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className={`${Styles.menucontainer} ${color} ${open ? '' : Styles.collapsed}`}>
      <div className={Styles.menuHeader}>
        <h3 className={Styles.header}>Menus</h3>
        <button
          type="button"
          className={Styles.menuButton}
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Hide menu' : 'Show menu'}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {open && (
        <div className={Styles.menubar}>
          {menus.map((menu, index) => (
            <Link to={menu.path} key={index} className={Styles.menuitem}>
              {menu.name}
            </Link>
          ))}
          <button 
            onClick={handleLogout} 
            className={Styles.menuitem} 
            style={{ 
              background: 'none', 
              border: 'none', 
              textAlign: 'left', 
              cursor: 'pointer', 
              color: 'inherit',
              font: 'inherit',
              padding: '12px 16px',
              width: '100%',
              display: 'block'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default Menubar;
