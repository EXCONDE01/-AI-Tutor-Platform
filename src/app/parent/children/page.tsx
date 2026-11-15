export default async function ParentChildrenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Children</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">E</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Emily Rodriguez</h3>
                <p className="text-muted-foreground">10th Grade</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm"><strong>Algebra I:</strong> 78% complete</p>
              <p className="text-sm"><strong>English:</strong> 45% complete</p>
              <p className="text-sm"><strong>History:</strong> 62% complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}