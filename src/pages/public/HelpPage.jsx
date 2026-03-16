import PublicLayout from '../../components/site/PublicLayout.jsx';

const HelpPage = () => {
  return (
    <PublicLayout>
      <section className="simple-card">
        <h2>Help</h2>
        <ul>
          <li>Students can register and login.</li>
          <li>Faculty must register first, then wait for admin approval.</li>
          <li>Admin login is available at /auth/admin.</li>
        </ul>
      </section>
    </PublicLayout>
  );
};

export default HelpPage;
