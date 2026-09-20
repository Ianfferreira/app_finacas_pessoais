export default function DashboardLoading() {
  return (
    <main className="centered-page" aria-busy="true" aria-live="polite">
      <section className="card profile-card">
        <p className="eyebrow">Carregando</p>
        <div className="skeleton title-skeleton" />
        <div className="skeleton line-skeleton" />
        <span className="sr-only">Carregando seu perfil.</span>
      </section>
    </main>
  );
}
