export default function StudentNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">Notifications</h1>
        <p className="text-muted-foreground">Your alerts and updates</p>
      </div>
      <div className="card">
        <div className="card-content py-12 text-center text-muted-foreground">
          <p>No notifications yet.</p>
        </div>
      </div>
    </div>
  );
}