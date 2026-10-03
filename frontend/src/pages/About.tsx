import { Header } from "../components/Header";

export default function About() {
  return (
    <div className="home-page">
      <Header />
      <main className="dashboard" style={{ padding: '60px 5%', textAlign: 'center' }}>
        <h1>About Watch Together</h1>
        <p style={{ color: '#a1a1aa', marginTop: '10px' }}>Coming soon in Phase 3!</p>
      </main>
    </div>
  );
}
