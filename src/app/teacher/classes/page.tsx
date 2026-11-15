export default function TeacherClassesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Classes</h1>
        <p className="text-muted-foreground">Manage your classes and students</p>
      </div>
      <div className="card">
        <div className="card-content py-12 text-center text-muted-foreground">
          <p>No classes yet. Create your first class to get started.</p>
        </div>
      </div>
    </div>
  );
}