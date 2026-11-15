export default function StudentArtifactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Artifacts</h1>
        <p className="text-muted-foreground">Generated learning materials and resources</p>
      </div>
      <div className="card">
        <div className="card-content py-12 text-center text-muted-foreground">
          <p>No artifacts yet. Generated content will appear here.</p>
        </div>
      </div>
    </div>
  );
}