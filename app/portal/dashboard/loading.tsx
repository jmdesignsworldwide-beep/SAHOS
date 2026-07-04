export default function DashboardLoading() {
  return (
    <>
      <div className="phead phead--skel" />
      <main className="pwrap pwrap--wide">
        <div className="sk sk-title" />
        <div className="dash__urgent">
          <div className="sk sk-card sk-card--tall" />
          <div className="sk sk-card sk-card--tall" />
        </div>
        <div className="dash__metrics">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sk sk-card" />
          ))}
        </div>
        <div className="dash__mid">
          <div className="sk sk-card sk-card--chart" />
          <div className="sk sk-card sk-card--chart" />
        </div>
      </main>
    </>
  );
}
