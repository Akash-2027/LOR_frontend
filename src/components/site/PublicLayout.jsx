import { NavLink } from 'react-router-dom';
import collegeLogo from '../../../assets/Clg_logo.png';

const getLinkClass = ({ isActive }) => (isActive ? 'top-link active' : 'top-link');

const PublicLayout = ({ children }) => {
  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="header-left">
          <img src={collegeLogo} alt="College logo" className="college-logo" />
          <div>
            <h1 className="college-title">Government Engineering College, Modasa</h1>
          </div>
        </div>

        <nav className="header-nav">
          <NavLink to="/" className={getLinkClass}>Home</NavLink>
          <NavLink to="/about" className={getLinkClass}>About</NavLink>
          <NavLink to="/contact" className={getLinkClass}>Contact</NavLink>
          <NavLink to="/help" className={getLinkClass}>Help</NavLink>
        </nav>
      </header>

      <main className="main-content">{children}</main>

      <footer className="site-footer">LOR Management Project | Government Engineering College, Modasa</footer>
    </div>
  );
};

export default PublicLayout;
