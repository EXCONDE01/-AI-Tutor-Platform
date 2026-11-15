import { TutorChat } from "@/components/student/TutorChat";

export default function StudentSessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Sessions</h1>
        <p className="text-muted-foreground">Your tutoring session history</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TutorChat />
        </div>
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Session History</h3>
            </div>
            <div className="card-content py-12 text-center text-muted-foreground">
              <p>No past sessions yet. Your tutoring history will appear here.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Help</h3>
            </div>
            <div className="card-content space-y-3 text-sm text-muted-foreground">
              <p>• Ask for explanations on any topic</p>
              <p>• Practice problems with guided hints</p>
              <p>• Get study strategies and tips</p>
              <p>• Review previous session topics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}