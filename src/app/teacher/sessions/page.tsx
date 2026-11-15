import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, MessageSquare, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const mockSessions = [
  { id: "1", student: "Sarah Johnson", class: "Algebra I - Period 3", status: "active", started: "2 hours ago", messages: 12 },
  { id: "2", student: "Marcus Chen", class: "Algebra I - Period 3", status: "completed", started: "4 hours ago", messages: 8 },
  { id: "3", student: "Emily Rodriguez", class: "English Literature", status: "active", started: "30 min ago", messages: 5 },
  { id: "4", student: "James Wilson", class: "World History", status: "completed", started: "1 day ago", messages: 15 },
];

export default function TeacherSessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-6">Student Sessions</h1>
          <p className="text-muted-foreground">Monitor active and past tutoring sessions</p>
        </div>
        <Link href="/teacher/sessions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Start New Session
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            All Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search sessions..." className="pl-10 w-64" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.student}</TableCell>
                  <TableCell>{session.class}</TableCell>
                  <TableCell>
                    <Badge variant={session.status === "active" ? "success" : "secondary"}>
                      {session.status === "active" && <CheckCircle className="mr-1 h-3 w-3" />}
                      {session.status === "completed" && <Clock className="mr-1 h-3 w-3" />}
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{session.started}</TableCell>
                  <TableCell>{session.messages}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/teacher/sessions/${session.id}`}>
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">View session</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}