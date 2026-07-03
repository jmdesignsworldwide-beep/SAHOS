export default function InventarioLoading() {
  return (
    <>
      <div className="phead phead--skel" />
      <main className="pwrap pwrap--wide">
        <div className="sk sk-title" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="sk sk-card sk-card--row" />
        ))}
      </main>
    </>
  );
}
