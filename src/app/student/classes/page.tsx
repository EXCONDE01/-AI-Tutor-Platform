export default async function StudentClassesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Classes</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-2">Algebra I - Period 3</h3>
            <p className="text-muted-foreground mb-4">Ms. Johnson</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[78%]" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">78% Complete</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-2">English Literature</h3>
            <p className="text-muted-foreground mb-4">Mr. Smith</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[45%]" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">45% Complete</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-xl font-semibold mb-2">World History</h3>
            <p className="text-muted-foreground mb-4">Dr. Williams</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[62%]" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">62% Complete</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}